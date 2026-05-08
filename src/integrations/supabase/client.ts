import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cgsitxdbikpbevlzulci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnc2l0eGRiaWtwYmV2bHp1bGNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MTM2OTAsImV4cCI6MjA5MTA4OTY5MH0.UQWNnjSk69QogwV7yE83nTdPO4a6grgGDr8YGwk-HH4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    storageKey: 'cmms-pro-auth',
    storage: window.localStorage,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});