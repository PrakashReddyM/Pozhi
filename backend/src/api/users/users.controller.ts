import { Request, Response, NextFunction } from 'express';
import { userService } from '../../services/users.service';
import { updateProfileSchema, addAddressSchema, updateAddressSchema } from './users.validation';
import { ApiError } from '../../utils/ApiError';

// Profile
export const getMyProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await userService.getProfile(req.user!.id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = updateProfileSchema.safeParse(req.body);
    if (!validation.success) throw new ApiError(400, validation.error.errors[0].message);

    const data = await userService.updateProfile(req.user!.id, validation.data);
    res.status(200).json({ success: true, message: 'Profile updated', data });
  } catch (error) {
    next(error);
  }
};

// Addresses
export const getAddresses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await userService.getAddresses(req.user!.id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const addAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = addAddressSchema.safeParse(req.body);
    if (!validation.success) throw new ApiError(400, validation.error.errors[0].message);

    const data = await userService.addAddress(req.user!.id, validation.data);
    res.status(201).json({ success: true, message: 'Address added', data });
  } catch (error) {
    next(error);
  }
};

export const updateAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = updateAddressSchema.safeParse(req.body);
    if (!validation.success) throw new ApiError(400, validation.error.errors[0].message);

    const data = await userService.updateAddress(req.user!.id, req.params.id, validation.data);
    res.status(200).json({ success: true, message: 'Address updated', data });
  } catch (error) {
    next(error);
  }
};

export const deleteAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await userService.deleteAddress(req.user!.id, req.params.id);
    res.status(200).json({ success: true, message: 'Address removed' });
  } catch (error) {
    next(error);
  }
};

// Orders
export const getOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await userService.getOrders(req.user!.id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};