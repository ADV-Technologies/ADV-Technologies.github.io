// js/config.js
window.SUPABASE_CONFIG = {
    url: 'https://xblihylcpepkuriatqtg.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhibGloeWxjcGVwa3VyaWF0cXRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMDEwNDIsImV4cCI6MjA3NzY3NzA0Mn0.Ka_dkjTcPmzfhTBmCrUNrfxU_G8UncebUwM5h-Wlhns'
};

if (window.supabase) {
    window.supabaseClient = window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);
    console.log("Supabase Client Initialized in Config");
}
