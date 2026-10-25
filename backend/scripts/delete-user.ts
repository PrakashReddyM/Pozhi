
import { supabaseAdmin } from '../src/config/supabase';

const email = process.argv[2];

if (!email) {
    console.error('Please provide an email address');
    process.exit(1);
}

async function deleteUser() {
    console.log(`Searching for user: ${email}`);

    // 1. Find User ID in Auth
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
        console.error('Error listing users:', listError);
        return;
    }

    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
        console.log('User not found in Auth system.');
        return;
    }

    console.log(`Found user ${user.id} in Auth. Deleting...`);

    // 2. Delete from Auth (Cascades to profile usually, but we check)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
        console.error('Error deleting user:', deleteError);
    } else {
        console.log('✅ User deleted successfully from Auth system.');
    }
}

deleteUser();
