import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from parent directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase credentials in .env file');
    process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function seedAdmin() {
    const email = 'admin@pozhi.com';
    const password = 'AdminPassword123!';
    const fullName = 'System Admin';

    console.log(`🚀 Seeding admin user: ${email}...`);

    // 1. Create User in Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
            full_name: fullName,
            phone: '+919876543210'
        }
    });

    if (authError) {
        if (authError.message.includes('already registered')) {
            console.log('⚠️ Admin user already exists in Auth. Ensuring profile...');
            // Need to get user ID if already exists
            const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
            const existingUser = users.find(u => u.email === email);
            if (existingUser) {
                await upsertProfile(existingUser.id, email, fullName);
                return;
            }
        }
        console.error('❌ Failed to create admin user:', authError.message);
        return;
    }

    if (authData.user) {
        console.log(`✅ Auth user created: ${authData.user.id}`);
        await upsertProfile(authData.user.id, email, fullName);
    }
}

async function upsertProfile(userId: string, email: string, fullName: string) {
    // 2. Create/Update Profile with Admin Role
    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
            id: userId,
            email,
            full_name: fullName,
            role: 'admin', // 👈 THE CRITICAL PART
            is_active: true,
            is_banned: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .select()
        .single();

    if (profileError) {
        console.error('❌ Failed to create admin profile:', profileError.message);
    } else {
        console.log('✅ Admin profile created successfully with ROLE=admin');
    }
}

seedAdmin();
