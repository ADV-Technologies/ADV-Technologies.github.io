if (typeof supabase !== 'undefined' && window.SUPABASE_CONFIG) {
    const supabaseClient = supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);
    window.supabaseClient = supabaseClient;
} else {
    console.error('Supabase configuration or library not found. Make sure SUPABASE_CONFIG is defined in HTML and Supabase JS is loaded.');
}
