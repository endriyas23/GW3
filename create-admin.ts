import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdmin() {
  console.log('Checking if user exists by trying to log in...');
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: 'admin@example.com',
    password: 'Admin123!',
  });

  if (loginError) {
    console.log('Login failed:', loginError.message);
    console.log('Attempting to create user...');
    const { data, error } = await supabase.auth.signUp({
      email: 'admin@example.com',
      password: 'Admin123!',
      options: {
        data: {
          full_name: 'System Admin',
        }
      }
    });

    if (error) {
      console.error('Error creating user:', error.message);
      process.exit(1);
    }
    console.log('User created successfully:', data.user?.id);
    await new Promise(resolve => setTimeout(resolve, 2000));
  } else {
    console.log('User already exists and logged in successfully.');
  }

  // Update role
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;

  if (userId) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating role:', updateError.message);
      process.exit(1);
    }
    console.log('Admin user successfully created and role updated!');
  }
}

createAdmin();
