// ==========================================
// PASSKEY CONTROLLER - WebAuthn Endpoints
// ==========================================

import { Request, Response, NextFunction } from 'express';
import * as PasskeyService from '../../services/passkey.service';
import * as securityLogger from '../../utils/securityLogger';
import { ApiError } from '../../utils/ApiError';
import { logger } from '../../utils/logger';

// ==========================================
// REGISTRATION: Generate Options
// POST /api/v1/auth/passkey/register/options
// ==========================================

export const registerOptions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const email = req.user?.email;

    if (!userId || !email) {
      throw new ApiError(401, 'Not authenticated');
    }

    const { friendly_name } = req.body;

    logger.info('Passkey registration options requested', { userId });

    await securityLogger.logSecurityEvent({
      type: 'passkey_register_start',
      user_id: userId,
      ip: req.ip || 'unknown',
      user_agent: req.get('user-agent') || 'unknown',
      details: { email },
    });

    const options = await PasskeyService.getRegistrationOptions(
      userId,
      email,
      friendly_name
    );

    res.status(200).json({
      status: 'success',
      data: { options },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// REGISTRATION: Verify Response
// POST /api/v1/auth/passkey/register/verify
// ==========================================

export const registerVerify = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const email = req.user?.email;

    if (!userId || !email) {
      throw new ApiError(401, 'Not authenticated');
    }

    const { credential } = req.body;

    logger.info('Passkey registration verification', { userId });

    const result = await PasskeyService.verifyRegistration(userId, credential);

    await securityLogger.logSecurityEvent({
      type: 'passkey_register_success',
      user_id: userId,
      ip: req.ip || 'unknown',
      user_agent: req.get('user-agent') || 'unknown',
      details: {
        email,
        deviceType: result.deviceType,
        backedUp: result.backedUp,
      },
    });

    logger.info('Passkey registered successfully', { userId });

    res.status(201).json({
      status: 'success',
      message: 'Passkey registered successfully',
      data: result,
    });
  } catch (error: any) {
    // Log failed registration
    if (req.user?.id) {
      await securityLogger.logSecurityEvent({
        type: 'passkey_register_failed',
        user_id: req.user.id,
        ip: req.ip || 'unknown',
        user_agent: req.get('user-agent') || 'unknown',
        details: { reason: error.message },
        severity: 'medium',
      });
    }
    next(error);
  }
};

// ==========================================
// LOGIN: Generate Options
// POST /api/v1/auth/passkey/login/options
// ==========================================

export const loginOptions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;

    logger.info('Passkey login options requested', { email: email || 'discoverable' });

    await securityLogger.logSecurityEvent({
      type: 'passkey_login_start',
      ip: req.ip || 'unknown',
      user_agent: req.get('user-agent') || 'unknown',
      details: { email: email || 'discoverable' },
    });

    const { options, challengeId } = await PasskeyService.getAuthenticationOptions(email);

    res.status(200).json({
      status: 'success',
      data: { options, challengeId },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// LOGIN: Verify Response
// POST /api/v1/auth/passkey/login/verify
// ==========================================

export const loginVerify = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { challengeId, credential } = req.body;

    logger.info('Passkey login verification', { challengeId });

    const result = await PasskeyService.verifyAuthentication(challengeId, credential);

    await securityLogger.logSecurityEvent({
      type: 'passkey_login_success',
      user_id: result.user.id,
      ip: req.ip || 'unknown',
      user_agent: req.get('user-agent') || 'unknown',
      details: { email: result.user.email },
    });

    logger.info('Passkey login successful', { userId: result.user.id });

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: result,
    });
  } catch (error: any) {
    await securityLogger.logSecurityEvent({
      type: 'passkey_login_failed',
      ip: req.ip || 'unknown',
      user_agent: req.get('user-agent') || 'unknown',
      details: { reason: error.message },
      severity: 'medium',
    });
    next(error);
  }
};

// ==========================================
// LIST: Get User's Passkeys
// GET /api/v1/auth/passkey
// ==========================================

export const listPasskeys = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(401, 'Not authenticated');
    }

    const passkeys = await PasskeyService.getUserPasskeys(userId);

    res.status(200).json({
      status: 'success',
      data: { passkeys },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// DELETE: Remove a Passkey
// DELETE /api/v1/auth/passkey/:id
// ==========================================

export const deletePasskey = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const passkeyId = req.params.id;

    if (!userId) {
      throw new ApiError(401, 'Not authenticated');
    }

    logger.info('Passkey deletion requested', { userId, passkeyId });

    await PasskeyService.deletePasskey(userId, passkeyId);

    await securityLogger.logSecurityEvent({
      type: 'passkey_deleted',
      user_id: userId,
      ip: req.ip || 'unknown',
      user_agent: req.get('user-agent') || 'unknown',
      details: { passkeyId },
    });

    logger.info('Passkey deleted', { userId, passkeyId });

    res.status(200).json({
      status: 'success',
      message: 'Passkey removed successfully',
    });
  } catch (error) {
    next(error);
  }
};
