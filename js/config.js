// Supabase Configuration
const SUPABASE_CONFIG = {
    url: 'https://izoraalaceastrtcncel.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6b3JhYWxhY2Vhc3RydGNuY2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDU4MjksImV4cCI6MjA3NTQyMTgyOX0.P2OpUpckOHvdrqhYP7OjvhOj6LDdsdjncg31akGJNxU'
};

// Initialize Supabase client
const supabaseClient = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// Export for use in other files
window.supabaseClient = supabaseClient;
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
