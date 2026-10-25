// ==========================================
// ORDERS CONTROLLER - POZHI SCHEMA
// ==========================================

import { Request, Response, NextFunction } from 'express';
import { supabase, supabaseAdmin } from '../../config/supabase';
import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';
import { logger } from '../../utils/logger';
import { emailService } from '../../services/email.service';
import { whatsappService } from '../../services/whatsapp.service';

// ==========================================
// CHARGES (server-authoritative)
// The checkout summary in frontend/src/pages/Checkout.tsx mirrors these
// values for display only — keep the two in sync.
// ==========================================
const GIFT_WRAP_CHARGE = 30.00;
const DELIVERY_CHARGE = 30.00;
const FREE_DELIVERY_THRESHOLD = 199;

/**
 * Concatenate the structured address fields into the single string that the
 * admin portal and the WhatsApp templates still read from delivery_address.
 */
const composeDeliveryAddress = (parts: {
  house?: string | null;
  street?: string | null;
  landmark?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
}): string => {
  const { house, street, landmark, city, state, pincode } = parts;
  const statePin = [state, pincode].filter(Boolean).join(' - ');
  return [house, street, landmark, city, statePin]
    .map((v) => (v ? String(v).trim() : ''))
    .filter(Boolean)
    .join(', ');
};

/**
 * Supabase doesn't reliably order embedded resources via the select string,
 * so sort each order_item's linked uploads by position after the fetch.
 */
function sortItemUploads<T>(ordersOrOrder: T): T {
  const list: any[] = Array.isArray(ordersOrOrder) ? ordersOrOrder : [ordersOrOrder];
  list.forEach((o: any) => o?.order_items?.forEach((oi: any) => {
    if (Array.isArray(oi.order_item_uploads)) {
      oi.order_item_uploads.sort((a: any, b: any) => a.position - b.position);
    }
  }));
  return ordersOrOrder;
}

/**
 * Create new order
 * @route POST /api/v1/orders
 * @access Private
 */
export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    let {
      service_type,
      items,
      customer_name,
      customer_phone,
      delivery_address,
      address_house,
      address_street,
      address_landmark,
      address_city,
      address_state,
      address_pincode,
      event_date,
      gift_wrap
    } = req.body;

    // Validation
    if (!service_type || !items || items.length === 0) {
      throw new ApiError(400, 'Service type and items are required');
    }

    if (!customer_name || !customer_phone) {
      throw new ApiError(400, 'Customer name and phone are required');
    }

    // Resolve User ID (Required for DB constraint)
    const finalUserId = userId;

    if (!finalUserId) {
      throw new ApiError(401, 'Authentication required for placing orders');
    }

    // Standardize phone for WhatsApp (ensure 91 prefix for India if not present)
    let cleanPhone = customer_phone.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    }
    customer_phone = cleanPhone;

    // The structured fields are the source of truth when present; delivery_address
    // is derived from them so the two can never disagree. Orders posted by an
    // older client that only sends the free-text address still go through.
    const hasStructuredAddress = !!(
      address_house && address_street && address_city && address_state && address_pincode
    );

    if (hasStructuredAddress) {
      delivery_address = composeDeliveryAddress({
        house: address_house,
        street: address_street,
        landmark: address_landmark,
        city: address_city,
        state: address_state,
        pincode: address_pincode
      });
    }

    if (!delivery_address) {
      throw new ApiError(400, 'Delivery address is required');
    }

    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';

    logger.info('Creating order', {
      userId: finalUserId,
      service_type,
      itemCount: items.length
    });

    // ==========================================
    // SECURE PRICE VERIFICATION (NEVER TRUST FRONTEND)
    // ==========================================
    let subtotal = 0;
    const processedOrderItems: any[] = [];

    for (const item of items) {
      let unitPrice = 0;
      let itemDetails = { ...item.details };

      // The client identifies catalogue rows by their public slug ("alb-100"), but
      // order_items stores UUID foreign keys. Resolve one to the other here — never
      // write a client-supplied value straight into these columns.
      const fk: Record<string, string | null> = {
        passphoto_pack_id: null,
        photocopies_single_id: null,
        photocopies_set_id: null,
        frame_size_id: null,
        album_capacity_id: null,
        snapnprint_package_id: null
      };

      // A cart can mix services, so price each line by its own service_type and
      // fall back to the order-level one for single-service orders.
      const itemServiceType = item.service_type || service_type;

      // 1. Resolve pricing based on service type
      switch (itemServiceType) {
        case 'PassPhoto':
          if (item.passphoto_pack_id) {
            const { data: pack } = await supabaseAdmin
              .from('passphoto_packs')
              .select('id, price, label')
              .eq('pack_id', item.passphoto_pack_id)
              .single();
            if (pack) {
              unitPrice = parseFloat(pack.price);
              itemDetails.label = pack.label;
              fk.passphoto_pack_id = pack.id;
            }
          }
          break;

        case 'PhotoCopies':
          if (item.photocopies_single_id) {
            const { data: single } = await supabaseAdmin
              .from('photocopies_single')
              .select('id, price, size_label')
              .eq('option_id', item.photocopies_single_id)
              .single();
            if (single) {
              unitPrice = parseFloat(single.price);
              itemDetails.size = single.size_label;
              fk.photocopies_single_id = single.id;
            }
          } else if (item.photocopies_set_id) {
            const { data: set } = await supabaseAdmin
              .from('photocopies_set')
              .select('id, price_per_piece, size_label, copies_per_unit')
              .eq('set_id', item.photocopies_set_id)
              .single();
            if (set) {
              // copies_per_unit is how many prints a unit yields, not a price multiplier.
              unitPrice = parseFloat(set.price_per_piece);
              itemDetails.size = set.size_label;
              fk.photocopies_set_id = set.id;
            }
          }
          break;

        case 'Frames':
          if (item.frame_size_id) {
            const { data: size } = await supabaseAdmin
              .from('frame_sizes')
              .select('id, price, size_label')
              .eq('size_id', item.frame_size_id)
              .single();
            if (size) {
              unitPrice = parseFloat(size.price);
              itemDetails.size = size.size_label;
              fk.frame_size_id = size.id;
            }
          }
          break;

        case 'Album':
          if (item.album_capacity_id) {
            const { data: album } = await supabaseAdmin
              .from('album_capacities')
              .select('id, price, label')
              .eq('capacity_id', item.album_capacity_id)
              .single();
            if (album) {
              unitPrice = parseFloat(album.price);
              itemDetails.capacity = album.label;
              fk.album_capacity_id = album.id;
            }
          }
          break;

        case 'SnapnPrint':
          if (item.snapnprint_package_id) {
            const { data: pkg } = await supabaseAdmin
              .from('snapnprint_packages')
              .select('id, price, label')
              .eq('package_id', item.snapnprint_package_id)
              .single();
            if (pkg) {
              unitPrice = parseFloat(pkg.price);
              itemDetails.package = pkg.label;
              fk.snapnprint_package_id = pkg.id;
            }
          }
          break;
      }

      // The price MUST come from the database. Falling back to a client-supplied
      // price would let a caller name their own total.
      if (unitPrice <= 0) {
        logger.warn('Rejected order: price could not be resolved from catalogue', {
          service_type: itemServiceType,
          userId: finalUserId,
          submittedPrice: item.unit_price
        });
        throw new ApiError(400, 'Unable to verify the price for this item. Please reselect your options and try again.');
      }

      const quantity = Number(item.quantity ?? 1);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
        throw new ApiError(400, 'Invalid quantity. Please choose between 1 and 100.');
      }

      const itemTotal = unitPrice * quantity;
      subtotal += itemTotal;

      processedOrderItems.push({
        ...fk,
        user_upload_id: item.user_upload_id || null,
        upload_ids: Array.isArray(item.upload_ids) ? item.upload_ids : [],
        quantity,
        unit_price: unitPrice,
        total_price: itemTotal,
        details: itemDetails
      });
    }

    const giftWrapCharge = gift_wrap ? GIFT_WRAP_CHARGE : 0;

    // Delivery is free above the threshold. The threshold deliberately looks at
    // the item subtotal only — gift wrap is an add-on and must not buy free
    // delivery for an otherwise sub-threshold order.
    const deliveryCharge = subtotal > FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_CHARGE;

    // Round once, at the end, so the stored total matches the displayed total exactly.
    const totalAmount = Math.round((subtotal + giftWrapCharge + deliveryCharge) * 100) / 100;

    // Generate Order Number manually (LOS-YYYYMMDD-XXXX)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `LOS-${dateStr}-${randomSuffix}`;

    // Create order using ADMIN client
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: finalUserId,
        order_number: orderNumber,
        service_type,
        total_amount: totalAmount,
        gift_wrap: gift_wrap || false,
        gift_wrap_charge: giftWrapCharge,
        delivery_charge: deliveryCharge,
        customer_name,
        customer_phone,
        delivery_address,
        address_house: address_house || null,
        address_street: address_street || null,
        address_landmark: address_landmark || null,
        address_city: address_city || null,
        address_state: address_state || null,
        address_pincode: address_pincode || null,
        event_date,
        payment_status: 'pending',
        order_status: 'pending'
      })
      .select()
      .single();

    if (orderError) {
      logger.error('Failed to create order', { error: orderError.message });
      throw new ApiError(500, `Failed to create order: ${orderError.message}`);
    }

    // Create order items
    const orderItems = processedOrderItems.map((item: any) => ({
      order_id: order.id,
      passphoto_pack_id: item.passphoto_pack_id || null,
      photocopies_single_id: item.photocopies_single_id || null,
      photocopies_set_id: item.photocopies_set_id || null,
      frame_size_id: item.frame_size_id || null,
      frame_material: item.frame_material || null,
      album_capacity_id: item.album_capacity_id || null,
      snapnprint_package_id: item.snapnprint_package_id || null,
      // Legacy single-upload FK — kept pointing at the first image for
      // backward compatibility with any code still reading it directly.
      user_upload_id: (item.upload_ids && item.upload_ids[0]) || item.user_upload_id || null,
      quantity: item.quantity || 1,
      unit_price: item.unit_price || 0,
      total_price: item.total_price || 0,
      item_details: item.details || {}
    }));

    const { data: insertedItems, error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems)
      .select('id');

    if (itemsError || !insertedItems) {
      logger.error('Failed to create order items', { error: itemsError?.message });
      await supabaseAdmin.from('orders').delete().eq('id', order.id);
      throw new ApiError(500, `Failed to create order items: ${itemsError?.message}`);
    }

    // Fan out every image into order_item_uploads, position-indexed per item.
    // A single multi-row INSERT...RETURNING preserves input order, so the
    // inserted rows line up with processedOrderItems by index.
    const joinRows: { order_item_id: string; user_upload_id: string; position: number }[] = [];
    processedOrderItems.forEach((item: any, idx: number) => {
      const ids: string[] = item.upload_ids?.length ? item.upload_ids : (item.user_upload_id ? [item.user_upload_id] : []);
      ids.forEach((uploadId: string, position: number) => {
        joinRows.push({ order_item_id: insertedItems[idx].id, user_upload_id: uploadId, position });
      });
    });

    if (joinRows.length > 0) {
      const { error: joinError } = await supabaseAdmin.from('order_item_uploads').insert(joinRows);
      if (joinError) {
        logger.error('Failed to link order item uploads', { error: joinError.message });
        // order_items (ON DELETE CASCADE on order_id) and order_item_uploads
        // (ON DELETE CASCADE on order_item_id) both clean up via this delete.
        await supabaseAdmin.from('orders').delete().eq('id', order.id);
        throw new ApiError(500, `Failed to link uploaded images: ${joinError.message}`);
      }
    }

    logger.info('Order created successfully', {
      orderId: order.id,
      orderNumber: order.order_number,
      totalAmount
    });

    // Notifications
    const emailToNotify = req.user?.email;
    if (emailToNotify) {
      emailService.sendOrderConfirmation(emailToNotify, order.order_number, totalAmount)
        .catch(err => logger.error('Failed to send email', { err }));
    }

    whatsappService.sendOrderConfirmation(customer_phone, order.order_number, customer_name)
      .catch(err => logger.error('Failed to send customer WhatsApp', { err }));

    whatsappService.notifyAdmin(order.order_number, customer_name, totalAmount)
      .catch(err => logger.error('Failed to notify admin via WhatsApp', { err }));

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        order_id: order.id,
        order_number: order.order_number,
        subtotal,
        gift_wrap_charge: giftWrapCharge,
        delivery_charge: deliveryCharge,
        total_amount: totalAmount,
        payment_status: 'pending',
        order_status: 'pending'
      }
    });

  } catch (error) {
    logger.error('Order creation failed', { error, userId: req.user?.id });
    next(error);
  }
};

/**
 * Get user's orders
 * @route GET /api/v1/orders
 * @access Private
 */
export const getUserOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, 'Authentication required');
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const status = req.query.status as string;

    let query = supabaseAdmin
      .from('orders')
      .select('*, order_items(*, user_uploads(*), order_item_uploads(position, user_uploads(*)))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('order_status', status);
    }

    const { data: orders, error } = await query;

    if (error) {
      logger.error('Failed to fetch orders', { error: error.message });
      throw new ApiError(500, 'Failed to fetch orders');
    }

    res.status(200).json({
      success: true,
      count: orders?.length || 0,
      data: sortItemUploads(orders)
    });

  } catch (error) {
    logger.error('Failed to get orders', { error, userId: req.user?.id });
    next(error);
  }
};

/**
 * Get ALL orders (Admin Only)
 * @route GET /api/v1/orders/admin/all
 * @access Admin
 */
export const getAllOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.user?.role !== 'admin') {
      throw new ApiError(403, 'Admin access required');
    }

    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*, user_uploads(*), order_item_uploads(position, user_uploads(*)))')
      .order('created_at', { ascending: false });

    if (error) throw new ApiError(500, 'Failed to fetch orders');

    res.status(200).json({
      success: true,
      data: sortItemUploads(orders)
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get single order by ID
 * @route GET /api/v1/orders/:id
 * @access Private
 */
export const getOrderById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*, user_uploads(*), order_item_uploads(position, user_uploads(*)))')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !order) throw new ApiError(404, 'Order not found');

    res.status(200).json({
      success: true,
      data: sortItemUploads(order)
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get order by order_number (for tracking page)
 * @route GET /api/v1/orders/track/:orderNumber
 * @access Private
 */
export const getOrderByNumber = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { orderNumber } = req.params;

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*, user_uploads(*), order_item_uploads(position, user_uploads(*)))')
      .eq('order_number', orderNumber)
      .eq('user_id', userId)
      .single();

    if (error || !order) throw new ApiError(404, 'Order not found');

    res.status(200).json({ success: true, data: sortItemUploads(order) });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel order
 * @route PATCH /api/v1/orders/:id/cancel
 * @access Private
 */
export const cancelOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('order_status')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!order) throw new ApiError(404, 'Order not found');
    if (order.order_status !== 'pending') throw new ApiError(400, 'Only pending orders can be cancelled');

    await supabaseAdmin
      .from('orders')
      .update({ order_status: 'cancelled' })
      .eq('id', id);

    res.status(200).json({
      success: true,
      message: 'Order cancelled'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Update order status (Admin only)
 * @route PATCH /api/v1/orders/:id/status
 * @access Admin
 */
export const updateOrderStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.user?.role !== 'admin') throw new ApiError(403, 'Admin access required');

    const { id } = req.params;
    const { order_status, payment_status } = req.body;

    await supabaseAdmin
      .from('orders')
      .update({ 
        order_status, 
        payment_status,
        updated_at: new Date().toISOString() 
      })
      .eq('id', id);

    res.status(200).json({
      success: true,
      message: 'Status updated'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get Income Statistics (Admin Only)
 * @route GET /api/v1/orders/admin/stats
 * @access Admin
 */
export const getAdminStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.user?.role !== 'admin') throw new ApiError(403, 'Admin access required');

    const { startDate, endDate } = req.query;

    // Only count 'delivered' orders for income
    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('id, service_type, total_amount, delivery_charge, gift_wrap_charge, created_at')
      .eq('order_status', 'delivered');

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    let today = 0, yesterday = 0, thisWeek = 0, thisMonth = 0, thisYear = 0, lifetime = 0;
    let customTotal = 0, customCount = 0;

    const startCustom = startDate ? new Date(startDate as string) : null;
    let endCustom = endDate ? new Date(endDate as string) : null;
    if (endCustom && !isNaN(endCustom.getTime())) {
      endCustom.setHours(23, 59, 59, 999);
    }

    (orders || []).forEach((o: any) => {
      const amount = Number(o.total_amount) || 0;
      const d = new Date(o.created_at);

      lifetime += amount;
      if (d >= startOfToday) today += amount;
      if (d >= startOfYesterday && d < startOfToday) yesterday += amount;
      if (d >= startOfWeek) thisWeek += amount;
      if (d >= startOfMonth) thisMonth += amount;
      if (d >= startOfYear) thisYear += amount;

      if (startCustom && endCustom && d >= startCustom && d <= endCustom) {
        customTotal += amount;
        customCount++;
      }
    });

    const sorted = [...(orders || [])].sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const recent = sorted.slice(0, 10).map((o: any) => ({
      id: o.id,
      service: o.service_type,
      amount: Number(o.total_amount) || 0,
      deliveryCharge: Number(o.delivery_charge) || 0,
      giftWrapCharge: Number(o.gift_wrap_charge) || 0,
      createdAt: o.created_at
    }));

    res.status(200).json({
      success: true,
      data: {
        today,
        yesterday,
        thisWeek,
        thisMonth,
        thisYear,
        lifetime,
        customRange: {
          total: customTotal,
          orderCount: customCount,
          active: !!(startDate && endDate)
        },
        recentOrders: recent
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get Booked Slots for Snap n' Print
 */
export const getBookedSlots = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('event_date, order_items(item_details)')
      .eq('service_type', 'Snap n\' Print')
      .neq('order_status', 'cancelled')
      .not('event_date', 'is', null);

    const bookedSlots: Record<string, string[]> = {};
    orders?.forEach((o: any) => {
      const date = o.event_date;
      if (!bookedSlots[date]) bookedSlots[date] = [];
      o.order_items?.forEach((i: any) => {
        const window = i.item_details?.['Arrival Window'];
        if (window) bookedSlots[date].push(window);
      });
    });

    res.status(200).json({ success: true, data: bookedSlots });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit Feedback
 * @route POST /api/v1/orders/:id/feedback
 * @access Private
 */
export const submitFeedback = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const orderNumber = req.params.id;
    const { rating, comment } = req.body;

    if (!userId) {
      throw new ApiError(401, 'Authentication required');
    }

    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      throw new ApiError(400, 'Valid rating between 1 and 5 is required');
    }

    logger.info('Submitting feedback for order', { orderNumber, userId, rating });

    // Validate that order belongs to user
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, user_id')
      .eq('order_number', orderNumber)
      .eq('user_id', userId)
      .single();

    if (orderError || !order) {
      throw new ApiError(404, 'Order not found or unauthorized');
    }

    // Update feedback directly into the orders table
    // (Requires feedback_rating and feedback_comment columns)
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        feedback_rating: rating,
        feedback_comment: comment || null
      })
      .eq('order_number', orderNumber)
      .eq('user_id', userId);

    if (updateError) {
      logger.error('Failed to save feedback to DB', { error: updateError });
      throw new ApiError(500, 'Failed to save feedback');
    }

    res.status(200).json({
      success: true,
      message: 'Feedback submitted successfully'
    });
  } catch (error) {
    next(error);
  }
};
