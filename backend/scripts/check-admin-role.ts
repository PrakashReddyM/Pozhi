
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkUserRole() {
    const email = process.argv[2];

    if (!email) {
        console.log('Usage: npx ts-node scripts/check-admin-role.ts <email>');
        process.exit(1);
    }

    console.log(`Checking role for user: ${email}`);

    // 1. Get User ID from Auth
    const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
        console.error('Auth Error:', authError);
        process.exit(1);
    }

    const user = users.find(u => u.email === email);

    if (!user) {
        console.error('User not found in Auth system');
        process.exit(1);
    }

    console.log('User ID:', user.id);

    // 2. Get Profile from Database
    const { data: profile, error: dbError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (dbError) {
        console.error('Database Error:', dbError);
    } else {
        console.log('Current Profile:', profile);
        console.log('Is Admin?', profile.role === 'admin');
    }

    // 3. Fix if needed (Optional flag --fix)
    if (process.argv.includes('--fix')) {
        console.log('Attempting to promote user to admin...');
        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', user.id);

        if (updateError) {
            console.error('Failed to update role:', updateError);
        } else {
            console.log('Successfully updated user role to ADMIN');
        }
    }
}

checkUserRole();
