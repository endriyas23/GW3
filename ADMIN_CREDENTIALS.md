# Admin Panel Access

To access the admin panel at `/admin`, you need a user account with `role` set to `'admin'` in the `profiles` table.

## Default Admin Account

The following account is pre-configured in the code to have admin access:

- **Email**: `admin@example.com`
- **Default Password**: `Admin123!` (Note: You must create this user in Supabase first)

## Setup Instructions

### 1. Create the User in Supabase

Since I cannot directly create users in your Supabase Auth, please follow these steps:

1. Go to your **Supabase Dashboard**.
2. Navigate to **Authentication** > **Users**.
3. Click **Add User** > **Create new user**.
4. Enter `admin@example.com` and a password (e.g., `Admin123!`).
5. Uncheck "Send invitation email" if you want to create it immediately.

### 2. Grant Admin Privileges (SQL)

Run the following query in the **Supabase SQL Editor** to ensure the profile is correctly flagged:

```sql
-- First, ensure the profile exists (it should be created by a trigger on sign up)
-- Then update it
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'admin@example.com';
```

## Your Account

Your email (`endriyaszewdu@gmail.com`) is also hardcoded for admin access.

## Admin Features

- **Dashboard**: View platform metrics and recent activity.
- **Campaigns**: Review and approve/reject pending campaigns.
- **Users**: Manage platform users.
- **Reports**: Handle reports on campaigns and comments.
