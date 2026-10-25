// ==========================================
// APP.TS - MAIN APPLICATION (CORRECTED)
// APP.TS - MAIN APPLICATION (CORRECTED)
// ==========================================
// ✅ All duplicates removed
// ✅ CORS properly configured
// ✅ Body parser fixed
// ✅ Security headers active

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import orderRoutes from './api/orders/orders.routes';
import paymentRoutes from './api/payments/payment.routes';
import uploadRoutes from './api/upload/upload.routes';
import { errorHandler } from './middleware/errorHandler.middleware';
import { logger } from './utils/logger';
import userRoutes from './api/users/users.routes';
import authRoutes from './api/auth/auth.routes';
import pricingRoutes from './api/pricing/pricing.routes';
import newsletterRoutes from './api/newsletter/newsletter.routes';
import geoRoutes from './api/geo/geo.routes';
import { getCsrfToken, csrfErrorHandler, conditionalCsrf } from './middleware/csrf.middleware';

// Initialize Express
const app = express();
console.log('✅ Express initialized');

// ==========================================
// 🛡️ SECURITY MIDDLEWARE
// ==========================================
app.set('trust proxy', 1);
// Helmet - Sets secure HTTP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "http://localhost:*"],
      upgradeInsecureRequests: null,
    },
  },
  crossOriginResourcePolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },
}));

// HPP - Prevents HTTP Parameter Pollution attacks
app.use(hpp());

// ==========================================
// 🌐 CORS CONFIGURATION (FIXED!)
// ==========================================

const baseAllowedOrigins = [
  'https://pozhi.in',
  'https://www.pozhi.in',
  'https://admin.pozhi.in',
  'https://www.admin.pozhi.in',
  'https://pozhi-admin.netlify.app',
  'https://luminia.com',
  'https://www.luminia.com'
];

const allowedOrigins = env.NODE_ENV === 'production'
  ? [
    ...baseAllowedOrigins,
    env.FRONTEND_URL,
  ].filter(Boolean) as string[]
  : [
    ...baseAllowedOrigins,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:8080',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5176'
  ];

app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, Postman, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('Blocked by CORS:', { origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400 // 24 hours
}));

// ==========================================
// 📝 LOGGING & COMPRESSION
// ==========================================

// Morgan - Request logging
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev')); // Detailed logs in development
} else {
  app.use(morgan('combined')); // Standard Apache format in production
}

// Compression - Compress responses for faster transfer
app.use(compression({
  filter: (req: Request, res: Response) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6 // Balance between speed and compression
}));

// ==========================================
// 📦 BODY PARSING (FIXED - Single Instance!)
// ==========================================

// Parse cookies (required for CSRF protection)
app.use(cookieParser());

// Parse JSON bodies with size limit to prevent DoS
app.use(express.json({
  limit: '10kb',
  strict: true // Only accept arrays and objects
}));

// Parse URL-encoded bodies
app.use(express.urlencoded({
  extended: true,
  limit: '10kb'
}));

// ==========================================
// 🛡️ CSRF PROTECTION
// ==========================================

// Apply conditional CSRF protection (exempt safe methods and public endpoints)
app.use(conditionalCsrf);

// CSRF token endpoint (must be before routes)
app.get('/api/v1/csrf-token', getCsrfToken);

// ==========================================
// 🏥 HEALTH CHECK ROUTES
// ==========================================

// Basic health check
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Luminia & Oak Studio Backend is Running 🚀',
    env: env.NODE_ENV,
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Detailed health check
app.get('/health', async (req: Request, res: Response) => {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
    version: '1.0.0',
    services: {
      api: 'operational',
      // Add database, redis, stripe checks if needed
    }
  };

  res.status(200).json(healthStatus);
});

// ==========================================
// 🛤️ API ROUTES (FIXED - No Duplicates!)
// ==========================================

app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/pricing', pricingRoutes); // Public pricing endpoints
app.use('/api/v1/newsletter', newsletterRoutes);
app.use('/api/v1/geo', geoRoutes); // Reverse geocoding proxy for checkout autofill
// ==========================================
// ❌ 404 HANDLER
// ==========================================

app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: [
      '/api/v1/auth',
      '/api/v1/orders',
      '/api/v1/payments',
      '/api/v1/upload',
      '/api/v1/users',
      '/api/v1/pricing',
      '/api/v1/geo'
    ]
  });
});

// ==========================================
// 🚨 GLOBAL ERROR HANDLER
// ==========================================

// CSRF error handler (must be before general error handler)
app.use(csrfErrorHandler);

// General error handler
app.use(errorHandler);

// ==========================================
// EXPORT
// ==========================================

export default app;