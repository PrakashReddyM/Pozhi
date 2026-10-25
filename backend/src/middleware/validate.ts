import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod'; // 👈 CHANGED from AnyZodObject to ZodSchema
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';

export const validate = (schema: ZodSchema) => // 👈 CHANGED to generic ZodSchema
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        ...req.params,
        ...req.query,
        ...req.body,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessage = error.errors.map((e) => {
          // Handle custom errors from .refine() cleanly
          return e.message;
        }).join(', ');

        logger.warn('Validation Error', { path: req.path, error: errorMessage });
        return next(new ApiError(400, errorMessage));
      }
      next(error);
    }
  };