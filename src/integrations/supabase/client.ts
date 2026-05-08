import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://txrcqjifezhdmianqkif.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4cmNxamlmZXpoZG1pYW5xa2lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNDI5ODgsImV4cCI6MjA5MzgxODk4OH0.ZIcu-8ngfSdJm7t-6Ws2e_u0j4C7SSkkZqsu4SSFQb4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    storageKey: 'cmms-pro-auth',
    storage: window.localStorage,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
