// js/auth.js
if (!window.supabaseClient) console.error("Supabase client not initialized.");
const supabaseClient = window.supabaseClient;

let isAuthenticated = false;
let currentUser = null;
let userProfileData = null;

// --- Auth Initialization ---
async function initializeAuth() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            isAuthenticated = true;
            currentUser = session.user;
            await fetchUserProfile(); // Fetch DB role
        }
        updateAuthUI();
    } catch (err) {
        console.error("Auth Init Error:", err);
    }
}

// --- Fetch Profile (The Critical Part) ---
async function fetchUserProfile() {
    if (!currentUser) return null;
    try {
        const { data, error } = await supabaseClient
            .from('user_profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
        
        if (data) {
            if (data.is_banned) {
                await supabaseClient.auth.signOut();
                alert("Account Banned.");
                window.location.href = '/';
                return null;
            }
            userProfileData = data;
            return data;
        }
        // Fallback if DB row is missing but Auth exists
        return { role: 'user', username: currentUser.user_metadata.username || 'User' };
    } catch (e) {
        return null;
    }
}

// --- Update UI ---
function updateAuthUI() {
    const authButtons = document.getElementById('auth-buttons');
    const userProfile = document.getElementById('user-profile');
    const userAvatar = document.getElementById('user-avatar');
    
    if (isAuthenticated && currentUser) {
        if(authButtons) authButtons.style.display = 'none';
        if(userProfile) userProfile.style.display = 'flex';
        
        // Use DB data or Fallback
        const name = userProfileData?.first_name || currentUser.email[0].toUpperCase();
        if(userAvatar) userAvatar.textContent = name;
    } else {
        if(authButtons) authButtons.style.display = 'flex';
        if(userProfile) userProfile.style.display = 'none';
    }
}

// --- Login/Signup Handlers ---
async function handleLogin(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true, user: data.user };
}

async function handleSignup(userData) {
    const { data, error } = await supabaseClient.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
            data: {
                username: userData.username,
                first_name: userData.firstName,
                last_name: userData.lastName
            }
        }
    });
    if (error) return { success: false, error: error.message };
    return { success: true, user: data.user };
}

async function handleLogout() {
    await supabaseClient.auth.signOut();
    window.location.href = '/';
}

// --- Listen for Changes ---
supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
        isAuthenticated = true;
        currentUser = session.user;
        fetchUserProfile().then(updateAuthUI);
    } else if (event === 'SIGNED_OUT') {
        isAuthenticated = false;
        currentUser = null;
        userProfileData = null;
        updateAuthUI();
    }
});

// --- Inactivity Timer ---
let inactivityTimer;
function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    if(isAuthenticated) inactivityTimer = setTimeout(handleLogout, 30 * 60 * 1000); // 30 mins
}
document.addEventListener('mousemove', resetInactivityTimer);
document.addEventListener('keypress', resetInactivityTimer);

// Export functions
window.authFunctions = {
    handleLogin, handleSignup, logout: handleLogout,
    checkAuthStatus: initializeAuth, fetchUserProfile, resetInactivityTimer,
    getCurrentUser: () => currentUser
};

// Start
document.addEventListener('DOMContentLoaded', initializeAuth);
