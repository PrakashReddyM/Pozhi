import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Never hardcode the service_role key — it bypasses row level security.
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env first.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabase
    .from('user_uploads')
    .insert({
      user_id: 'test-user-id',
      storage_provider: 'supabase',
      storage_url: 'https://test',
      storage_path: 'test',
      original_filename: 'test.jpg',
      sanitized_filename: 'test.jpg',
      mime_type: 'image/jpeg',
      file_size_bytes: 100,
      width: 100,
      height: 100,
      processing_status: 'completed'
    })
    .select();

  console.log('Error:', error);
  console.log('Data:', data);
}

test();
