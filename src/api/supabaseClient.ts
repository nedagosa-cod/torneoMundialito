import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://erprrczznadutgkbbybf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVycHJyY3p6bmFkdXRna2JieWJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3Njk5OTMsImV4cCI6MjA5NjM0NTk5M30.42PqoRn2gZihNrHWO6M-Icf0ixC8uTDGUoduVhtPV8Q';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
