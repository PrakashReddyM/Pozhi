import { S3Client } from '@aws-sdk/client-s3';
import { env } from './env';

// 1. Get the variables YOU defined
const accessKeyId =  env.R2_ACCESS_KEY_ID;
const secretAccessKey =  env.R2_SECRET_ACCESS_KEY;
const endpoint =  env.R2_ENDPOINT; // Uses your exact variable name
const bucketName =  env.R2_BUCKET_NAME;

// 2. Check if they exist (Prevent crash)
if (!accessKeyId || !secretAccessKey || !endpoint || !bucketName) {
  throw new Error('Missing Cloudflare R2 credentials. Check R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME in .env');
}

// 3. Connect to R2
export const r2Client = new S3Client({
  region: 'auto',
  endpoint: endpoint, // Direct connection using your URL
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

export const R2_BUCKET_NAME = bucketName;