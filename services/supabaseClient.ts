
import { createClient } from '@supabase/supabase-js';

// Check for environment variables
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase keys are missing in environment variables. Please check your .env file. App will run in disconnected mode.'
  );
}

// Use fallbacks to prevent the "supabaseUrl is required" crash during initialization
// This allows the app to render even if backend connection fails later.
const url = supabaseUrl || 'https://placeholder-project.supabase.co';
const key = supabaseAnonKey || 'placeholder-key';

export const supabase = createClient(url, key);
