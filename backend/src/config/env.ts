import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env file
dotenv.config();

// Define the schema for environment variables
const envSchema = z.object({
  // Server Settings
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PAYMENT_MODE: z.enum(['mock', 'stripe', 'razorpay']).default('mock'),

  // PostgreSQL (replaces Supabase)
  DATABASE_URL: z.string().url('Invalid DATABASE_URL (postgresql://user:pass@host:port/db)'),
  DATABASE_SSL: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),

  // Self-issued sessions (replaces Supabase Auth)
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),

  // Google OAuth - these used to live in the Supabase dashboard.
  // Sign-in with Google is disabled while they are unset.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Supabase - still required while the migration is in progress.
  // TODO(migration): drop these once no module imports config/supabase.
  SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  SUPABASE_ANON_KEY: z.string().min(20, 'Supabase anon key required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20, 'Supabase service role key required'),
  SUPABASE_BUCKET: z.string().default('user-uploads'),

  // Stripe (optional — only required when PAYMENT_MODE=stripe)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Razorpay (optional — only required when PAYMENT_MODE=razorpay)
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  // Cloudflare R2
  R2_ENDPOINT: z.string().url('Invalid R2 endpoint'),
  R2_ACCESS_KEY_ID: z.string().min(1, 'R2 access key required'),
  R2_SECRET_ACCESS_KEY: z.string().min(1, 'R2 secret key required'),
  R2_BUCKET_NAME: z.string().default('luminia-masters'),

  // Redis
  REDIS_URL: z.string().url('Invalid Redis URL').optional(),
  REDIS_PASSWORD: z.string().optional(),

  // Frontend
  FRONTEND_URL: z.string().url().optional(),
  GOOGLE_AUTH_REDIRECT_URL: z.string().url().optional(),

  // WebAuthn / Passkey
  WEBAUTHN_RP_NAME: z.string().default('Pozhi Photography Studio'),
  WEBAUTHN_RP_ID: z.string().default('localhost'),
  WEBAUTHN_ORIGIN: z.string().default('http://localhost:5173'),

  // Email (Resend or SMTP)
  EMAIL_PROVIDER: z.enum(['resend', 'smtp', 'mock']).default('smtp'),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('onboarding@resend.dev'),
  
  // SMTP Configuration (Gmail, etc.)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  // WhatsApp (Twilio or similar)
  WHATSAPP_PROVIDER: z.enum(['mock', 'twilio', 'interakt']).default('mock'),
  WHATSAPP_API_KEY: z.string().optional(),
  WHATSAPP_API_SECRET: z.string().optional(),
  WHATSAPP_FROM_NUMBER: z.string().optional(),
  ADMIN_WHATSAPP_NUMBER: z.string().optional(),

  // Reverse geocoding (OpenStreetMap / Nominatim — no API key, no billing).
  // Their usage policy requires an identifying User-Agent; set this to
  // something that names the deployment and a contact address.
  NOMINATIM_USER_AGENT: z.string().default('PozhiStudio/1.0 (+https://pozhi.in)'),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info')
});
// Validate the environment variables
const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('ERROR Invalid environment variables:', JSON.stringify(_env.error.format(), null, 2));
  // Exit process to prevent server from starting in an unstable state
  process.exit(1);
}
export const isGoogleOAuthConfigured = (): boolean =>
  !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

export const isStripeLiveMode = (): boolean => {
  return env.STRIPE_SECRET_KEY?.startsWith('sk_live_') ?? false;
};

console.log('SUCCESS Environment variables validated successfully');
console.log('EMAIL_PROVIDER_CHECK: ' + _env.data.EMAIL_PROVIDER);

export const env = _env.data;
