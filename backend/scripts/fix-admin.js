
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function promoteAll() {
    console.log('Promoting ALL users in profiles table to ADMIN...');

    const { data, error } = await supabaseAdmin
        .from('profiles')
        .update({ role: 'admin' })
        .neq('role', 'admin') // Only update if not already admin
        .select();

    if (error) {
        console.error('DB Error:', error.message);
    } else {
        // If data is null (which can happen with .update() sometimes if no rows match), handle gracefully
        const count = data ? data.length : 0;
        console.log(`SUCCESS: Promoted ${count} users to admin.`);
        if (data) {
            data.forEach(u => console.log(`- Updated Profile ID: ${u.id}`));
        }
    }
}

promoteAll();
