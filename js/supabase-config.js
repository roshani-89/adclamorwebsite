// AdClamor Digital — Supabase Architecture
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Production API Credentials
const SUPABASE_URL = 'https://gxfexzsxlxnodnnxxavl.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4ZmV4enN4bHhub2Rubnh4YXZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NjMwNjgsImV4cCI6MjA5MjQzOTA2OH0.k7unQKSNYovyV8J3ToRJZP05ebtGZmJvRa1OuNCrc8c'; 

// Initialize the Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export { supabase };
