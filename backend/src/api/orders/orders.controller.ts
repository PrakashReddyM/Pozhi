// ==========================================
// ORDERS CONTROLLER - POZHI SCHEMA
// ==========================================

import { Request, Response, NextFunction } from 'express';
import { and, desc, eq, inArray, isNotNull, ne, sql } from 'drizzle-orm';
import { db, schema } from '../../db';
import { findOrder, findOrders } from './orders.queries';
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

// Uploads used to be re-sorted in JavaScript after the fetch, because
// Supabase would not reliably order embedded resources. The replacement
// queries in orders.queries.ts sort by `position` in SQL, so that helper
// is gone.

/**
 * Catalogue lookup for a single order line: resolve the client's public slug
 * to the row's UUID and its authoritative price. Returns null when the slug
 * matches nothing, which the caller turns into a rejected order.
 */
async function priceFromCatalogue<T extends Record<string, any>>(
  table: any,
  slugColumn: any,
  slug: string,
  columns: T
): Promise<any | null> {
  const [row] = await db
    .select({ id: table.id, ...columns })
    .from(table)
    .where(eq(slugColumn, slug))
    .limit(1);
  return row ?? null;
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
            const pack = await priceFromCatalogue(
              schema.passphotoPacks,
              schema.passphotoPacks.packId,
              item.passphoto_pack_id,
              { price: schema.passphotoPacks.price, label: schema.passphotoPacks.label }
            );
            if (pack) {
              unitPrice = parseFloat(pack.price);
              itemDetails.label = pack.label;
              fk.passphoto_pack_id = pack.id;
            }
          }
          break;

        case 'PhotoCopies':
          if (item.photocopies_single_id) {
            const single = await priceFromCatalogue(
              schema.photocopiesSingle,
              schema.photocopiesSingle.optionId,
              item.photocopies_single_id,
              {
                price: schema.photocopiesSingle.price,
                sizeLabel: schema.photocopiesSingle.sizeLabel
              }
            );
            if (single) {
              unitPrice = parseFloat(single.price);
              itemDetails.size = single.sizeLabel;
              fk.photocopies_single_id = single.id;
            }
          } else if (item.photocopies_set_id) {
            const set = await priceFromCatalogue(
              schema.photocopiesSet,
              schema.photocopiesSet.setId,
              item.photocopies_set_id,
              {
                pricePerPiece: schema.photocopiesSet.pricePerPiece,
                sizeLabel: schema.photocopiesSet.sizeLabel,
                copiesPerUnit: schema.photocopiesSet.copiesPerUnit
              }
            );
            if (set) {
              // copies_per_unit is how many prints a unit yields, not a price multiplier.
              unitPrice = parseFloat(set.pricePerPiece);
              itemDetails.size = set.sizeLabel;
              fk.photocopies_set_id = set.id;
            }
          }
          break;

        case 'Frames':
          if (item.frame_size_id) {
            const size = await priceFromCatalogue(
              schema.frameSizes,
              schema.frameSizes.sizeId,
              item.frame_size_id,
              { price: schema.frameSizes.price, sizeLabel: schema.frameSizes.sizeLabel }
            );
            if (size) {
              unitPrice = parseFloat(size.price);
              itemDetails.size = size.sizeLabel;
              fk.frame_size_id = size.id;
            }
          }
          break;

        case 'Album':
          if (item.album_capacity_id) {
            const album = await priceFromCatalogue(
              schema.albumCapacities,
              schema.albumCapacities.capacityId,
              item.album_capacity_id,
              { price: schema.albumCapacities.price, label: schema.albumCapacities.label }
            );
            if (album) {
              unitPrice = parseFloat(album.price);
              itemDetails.capacity = album.label;
              fk.album_capacity_id = album.id;
            }
          }
          break;

        case 'SnapnPrint':
          if (item.snapnprint_package_id) {
            const pkg = await priceFromCatalogue(
              schema.snapnprintPackages,
              schema.snapnprintPackages.packageId,
              item.snapnprint_package_id,
              { price: schema.snapnprintPackages.price, label: schema.snapnprintPackages.label }
            );
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

    // One transaction for the order, its items and the upload links. Supabase
    // had no transactions over HTTP, so the old code inserted in three steps
    // and hand-rolled compensating deletes when a later step failed. A real
    // connection can just roll back, so a half-written order is impossible.
    const order = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(schema.orders)
        .values({
          userId: finalUserId,
          orderNumber,
          serviceType: service_type,
          // numeric columns take strings so no binary float ever touches money.
          totalAmount: totalAmount.toFixed(2),
          giftWrap: gift_wrap || false,
          giftWrapCharge: giftWrapCharge.toFixed(2),
          deliveryCharge: deliveryCharge.toFixed(2),
          customerName: customer_name,
          customerPhone: customer_phone,
          deliveryAddress: delivery_address,
          addressHouse: address_house || null,
          addressStreet: address_street || null,
          addressLandmark: address_landmark || null,
          addressCity: address_city || null,
          addressState: address_state || null,
          addressPincode: address_pincode || null,
          eventDate: event_date || null,
          ipAddress,
          paymentStatus: 'pending',
          orderStatus: 'pending'
        })
        .returning();

      // Create order items
      const orderItemRows = processedOrderItems.map((item: any) => ({
        orderId: created.id,
        passphotoPackId: item.passphoto_pack_id || null,
        photocopiesSingleId: item.photocopies_single_id || null,
        photocopiesSetId: item.photocopies_set_id || null,
        frameSizeId: item.frame_size_id || null,
        frameMaterial: item.frame_material || null,
        albumCapacityId: item.album_capacity_id || null,
        snapnprintPackageId: item.snapnprint_package_id || null,
        // Legacy single-upload FK - kept pointing at the first image for
        // backward compatibility with any code still reading it directly.
        userUploadId: (item.upload_ids && item.upload_ids[0]) || item.user_upload_id || null,
        quantity: item.quantity || 1,
        unitPrice: (item.unit_price || 0).toFixed(2),
        totalPrice: (item.total_price || 0).toFixed(2),
        itemDetails: item.details || {}
      }));

      // A single multi-row INSERT...RETURNING preserves input order, so the
      // inserted rows line up with processedOrderItems by index.
      const insertedItems = await tx
        .insert(schema.orderItems)
        .values(orderItemRows)
        .returning({ id: schema.orderItems.id });

      // Fan out every image into order_item_uploads, position-indexed per item.
      const joinRows: {
        orderItemId: string;
        userUploadId: string;
        position: number;
      }[] = [];

      processedOrderItems.forEach((item: any, idx: number) => {
        const ids: string[] = item.upload_ids?.length
          ? item.upload_ids
          : (item.user_upload_id ? [item.user_upload_id] : []);
        ids.forEach((uploadId: string, position: number) => {
          joinRows.push({
            orderItemId: insertedItems[idx].id,
            userUploadId: uploadId,
            position
          });
        });
      });

      if (joinRows.length > 0) {
        await tx.insert(schema.orderItemUploads).values(joinRows);
      }

      return created;
    });

    logger.info('Order created successfully', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalAmount
    });

    // Notifications
    const emailToNotify = req.user?.email;
    if (emailToNotify) {
      emailService.sendOrderConfirmation(emailToNotify, order.orderNumber, totalAmount)
        .catch(err => logger.error('Failed to send email', { err }));
    }

    whatsappService.sendOrderConfirmation(customer_phone, order.orderNumber, customer_name)
      .catch(err => logger.error('Failed to send customer WhatsApp', { err }));

    whatsappService.notifyAdmin(order.orderNumber, customer_name, totalAmount)
      .catch(err => logger.error('Failed to notify admin via WhatsApp', { err }));

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        order_id: order.id,
        order_number: order.orderNumber,
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

    const orders = await findOrders({
      where: status
        ? sql`o.user_id = ${userId} AND o.order_status = ${status}`
        : sql`o.user_id = ${userId}`,
      limit,
      offset
    });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
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

    const orders = await findOrders({ where: sql`TRUE` });

    res.status(200).json({
      success: true,
      data: orders
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

    // Scoped to the caller. There is no row-level security behind this any
    // more, so the user_id predicate is the only thing preventing one
    // customer reading another's order.
    const order = await findOrder(sql`o.id = ${id} AND o.user_id = ${userId}`);

    if (!order) throw new ApiError(404, 'Order not found');

    res.status(200).json({
      success: true,
      data: order
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

    const order = await findOrder(
      sql`o.order_number = ${orderNumber} AND o.user_id = ${userId}`
    );

    if (!order) throw new ApiError(404, 'Order not found');

    res.status(200).json({ success: true, data: order });
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

    if (!userId) throw new ApiError(401, 'Authentication required');

    // Cancel only if it is still pending AND still owned by the caller, in one
    // statement: a check-then-update could race a payment landing in between.
    const cancelled = await db
      .update(schema.orders)
      .set({ orderStatus: 'cancelled' })
      .where(and(
        eq(schema.orders.id, id),
        eq(schema.orders.userId, userId),
        eq(schema.orders.orderStatus, 'pending')
      ))
      .returning({ id: schema.orders.id });

    if (cancelled.length === 0) {
      // Distinguish "not yours / no such order" from "no longer cancellable".
      const [existing] = await db
        .select({ orderStatus: schema.orders.orderStatus })
        .from(schema.orders)
        .where(and(eq(schema.orders.id, id), eq(schema.orders.userId, userId)))
        .limit(1);

      if (!existing) throw new ApiError(404, 'Order not found');
      throw new ApiError(400, 'Only pending orders can be cancelled');
    }

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

    // Only write the fields actually supplied. The previous version always set
    // both, so sending just order_status would null out payment_status.
    const changes: Record<string, unknown> = {};
    if (order_status !== undefined) changes.orderStatus = order_status;
    if (payment_status !== undefined) changes.paymentStatus = payment_status;

    if (Object.keys(changes).length === 0) {
      throw new ApiError(400, 'Nothing to update');
    }

    const updated = await db
      .update(schema.orders)
      .set(changes)
      .where(eq(schema.orders.id, id))
      .returning({ id: schema.orders.id });

    if (updated.length === 0) {
      throw new ApiError(404, 'Order not found');
    }

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
    const orders = await db
      .select({
        id: schema.orders.id,
        service_type: schema.orders.serviceType,
        total_amount: schema.orders.totalAmount,
        delivery_charge: schema.orders.deliveryCharge,
        gift_wrap_charge: schema.orders.giftWrapCharge,
        created_at: schema.orders.createdAt
      })
      .from(schema.orders)
      .where(eq(schema.orders.orderStatus, 'delivered'));

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
    // service_type is 'SnapnPrint'. The previous query filtered on
    // "Snap n' Print", which the valid_service CHECK constraint does not
    // permit, so this endpoint could only ever return an empty object.
    const rows = await db
      .select({
        eventDate: schema.orders.eventDate,
        itemDetails: schema.orderItems.itemDetails
      })
      .from(schema.orders)
      .leftJoin(schema.orderItems, eq(schema.orderItems.orderId, schema.orders.id))
      .where(and(
        eq(schema.orders.serviceType, 'SnapnPrint'),
        ne(schema.orders.orderStatus, 'cancelled'),
        isNotNull(schema.orders.eventDate)
      ));

    const bookedSlots: Record<string, string[]> = {};
    rows.forEach((row) => {
      const date = row.eventDate as string;
      if (!date) return;
      if (!bookedSlots[date]) bookedSlots[date] = [];
      const window = (row.itemDetails as any)?.['Arrival Window'];
      if (window) bookedSlots[date].push(window);
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

    // Ownership is enforced in the UPDATE's predicate, so there is no
    // separate lookup and no window between the check and the write.
    const updated = await db
      .update(schema.orders)
      .set({
        feedbackRating: rating,
        feedbackComment: comment || null
      })
      .where(and(
        eq(schema.orders.orderNumber, orderNumber),
        eq(schema.orders.userId, userId)
      ))
      .returning({ id: schema.orders.id });

    if (updated.length === 0) {
      throw new ApiError(404, 'Order not found or unauthorized');
    }

    res.status(200).json({
      success: true,
      message: 'Feedback submitted successfully'
    });
  } catch (error) {
    next(error);
  }
};
