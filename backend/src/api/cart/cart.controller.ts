import { Request, Response, NextFunction } from 'express';
import { cartService } from '../../services/cart.service';
import { ApiError } from '../../utils/ApiError';

export const getCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cart = await cartService.getCart(req.user!.id);
    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
};

export const addToCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validation handled by middleware route
    const item = await cartService.addToCart(req.user!.id, req.body);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

// ✅ Added Update Function
export const updateCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cart_item_id, quantity } = req.body;
    
    // Fallback: If cart_item_id not in body, check if it was passed as param (optional design)
    // But since schema expects it, we assume body.
    
    const updatedItem = await cartService.updateCartItem(req.user!.id, cart_item_id, quantity);
    res.status(200).json({ success: true, data: updatedItem });
  } catch (error) {
    next(error);
  }
};

export const removeFromCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await cartService.removeFromCart(req.user!.id, req.params.id);
    res.status(200).json({ success: true, message: 'Item removed' });
  } catch (error) {
    next(error);
  }
};

// ✅ Added Clear Function
export const clearCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await cartService.clearCart(req.user!.id);
    res.status(200).json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    next(error);
  }
};