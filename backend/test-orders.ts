import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select('*, order_items(*, user_uploads(*))')
    .order('created_at', { ascending: false })
    .limit(3);
    
  console.log(JSON.stringify(orders, null, 2));
}

check();
