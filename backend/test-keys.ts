import { Redis } from "ioredis";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

async function testKeys() {
  console.log("Starting Key Verification...\n");

  // 1. Redis Check
  try {
    const redis = new Redis(process.env.REDIS_URL as string, { maxRetriesPerRequest: 1 });
    const ping = await redis.ping();
    console.log("✅ REDIS: Connected successfully. Ping response:", ping);
    redis.disconnect();
  } catch (error: any) {
    console.log("❌ REDIS: Failed to connect.", error.message);
  }

  // 2. Cloudflare R2 Check
  try {
    const s3Client = new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
      },
    });
    
    const command = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
      MaxKeys: 1,
    });
    
    await s3Client.send(command);
    console.log("✅ CLOUDFLARE R2: Connected successfully. Bucket access granted.");
  } catch (error: any) {
    console.log("❌ CLOUDFLARE R2: Failed to connect.", error.message);
  }

  // 3. Supabase Check
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    );
    
    // Test database connection by checking order_items table existence/accessibility
    const { data, error } = await supabase.from('order_items').select('id').limit(1);
    
    if (error) {
      console.log("❌ SUPABASE: Connected but query failed.", error.message);
    } else {
      console.log("✅ SUPABASE: Connected successfully. Database queried.");
    }
  } catch (error: any) {
    console.log("❌ SUPABASE: Failed to connect.", error.message);
  }
}

testKeys();
