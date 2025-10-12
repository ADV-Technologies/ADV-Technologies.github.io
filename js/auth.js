// Authentication state
let currentUser = null;
let isAuthenticated = false;

// Inactivity tracking
let inactivityTimer = null;
let lastActivityTime = Date.now();
const INACTIVITY_TIMEOUT = 20 * 60 * 1000; // 20 minutes

// Activity events to track
const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

// Initialize activity tracking
function initializeActivityTracking() {
    activityEvents.forEach(event => {
        document.addEventListener(event, resetInactivityTimer, true);
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            localStorage.setItem('lastActiveTime', Date.now().toString());
        } else {
            const lastActiveTime = localStorage.getItem('lastActiveTime');
            if (lastActiveTime && isAuthenticated) {
                const timeAway = Date.now() - parseInt(lastActiveTime);
                if (timeAway > INACTIVITY_TIMEOUT) {
                    handleInactivityLogout();
                    return;
                }
            }
            resetInactivityTimer();
        }
    });

    window.addEventListener('beforeunload', () => {
        localStorage.setItem('lastActiveTime', Date.now().toString());
    });
}

function resetInactivityTimer() {
    lastActivityTime = Date.now();
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
    }
    if (isAuthenticated) {
        inactivityTimer = setTimeout(() => {
            handleInactivityLogout();
        }, INACTIVITY_TIMEOUT);
    }
}

async function handleInactivityLogout() {
    if (isAuthenticated) {
        await window.supabaseClient.auth.signOut();
        currentUser = null;
        isAuthenticated = false;
        alert('You have been logged out due to inactivity. Please log in again to continue.');
        window.location.href = 'login.html';
    }
}

// Check authentication status
async function checkAuthStatus() {
    try {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (session) {
            currentUser = session.user;
            isAuthenticated = true;
            
            // Get user profile with role
            const { data: profile, error } = await window.supabaseClient
                .from('user_profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (profile) {
                currentUser.profile = profile;
            }
            
            resetInactivityTimer();
            return { authenticated: true, user: currentUser };
        }
        return { authenticated: false, user: null };
    } catch (error) {
        console.error('Error checking auth status:', error);
        return { authenticated: false, user: null };
    }
}

// Protect page (redirect to login if not authenticated)
async function protectPage(requiredRole = null) {
    const { authenticated, user } = await checkAuthStatus();
    
    if (!authenticated) {
        window.location.href = 'login.html';
        return null;
    }

    // Check role if required
    if (requiredRole && user.profile.role !== requiredRole) {
        if (requiredRole === 'admin' && user.profile.role !== 'admin') {
            alert('Access denied. Admin privileges required.');
            window.location.href = 'dashboard.html';
            return null;
        }
    }

    return user;
}

// Login function
async function handleLogin(email, password) {
    try {
        const { data, error } = await window.supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) throw error;

        currentUser = data.user;
        isAuthenticated = true;
        resetInactivityTimer();
        
        return { success: true, user: data.user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Signup function
async function handleSignup(userData) {
    try {
        const { data, error } = await window.supabaseClient.auth.signUp({
            email: userData.email,
            password: userData.password,
            options: {
                data: {
                    first_name: userData.firstName,
                    last_name: userData.lastName,
                    username: userData.username,
                    date_of_birth: userData.dateOfBirth,
                    profession: userData.profession
                }
            }
        });

        if (error) throw error;

        currentUser = data.user;
        return { success: true, user: data.user, needsVerification: !data.user.email_confirmed_at };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// OTP Verification
async function verifyOTP(email, token) {
    try {
        const { data, error } = await window.supabaseClient.auth.verifyOtp({
            email: email,
            token: token,
            type: 'signup'
        });

        if (error) throw error;
        
        return { success: true, user: data.user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Resend OTP
async function resendOTP(email) {
    try {
        const { error } = await window.supabaseClient.auth.resend({
            type: 'signup',
            email: email
        });

        if (error) throw error;
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Check username availability
async function checkUsernameAvailability(username) {
    try {
        const { data, error } = await window.supabaseClient
            .from('user_profiles')
            .select('username')
            .eq('username', username.toLowerCase())
            .limit(1);

        if (error) {
            console.error('Error checking username:', error);
            return true;
        }

        return data.length === 0;
    } catch (error) {
        console.error('Error checking username availability:', error);
        return true;
    }
}

// Validate username format
function validateUsername(username) {
    const regex = /^[a-z0-9_-]+$/;
    if (!regex.test(username)) {
        return { valid: false, message: 'Username can only contain lowercase letters, numbers, underscore (_), and hyphen (-)' };
    }
    if (username.length < 3) {
        return { valid: false, message: 'Username must be at least 3 characters long' };
    }
    if (username.length > 20) {
        return { valid: false, message: 'Username must be 20 characters or less' };
    }
    return { valid: true, message: 'Username looks good!' };
}

// Generate username suggestions
function generateUsernameSuggestions(firstName, lastName, dob) {
    const suggestions = [];
    const currentYear = new Date().getFullYear();
    const birthYear = dob ? new Date(dob).getFullYear() : currentYear;

    if (firstName && lastName) {
        const firstInitial = firstName.charAt(0).toLowerCase();
        const lastInitial = lastName.charAt(0).toLowerCase();
        const firstLower = firstName.toLowerCase().replace(/[^a-z]/g, '');
        const lastLower = lastName.toLowerCase().replace(/[^a-z]/g, '');

        suggestions.push(`${firstLower}${lastLower}${birthYear}`);
        
        const randomNum1 = Math.floor(Math.random() * 999) + 1;
        suggestions.push(`${firstLower}${lastInitial}${randomNum1}`);
        
        const randomNum2 = Math.floor(Math.random() * 99) + 1;
        suggestions.push(`${firstInitial}${lastInitial}${birthYear}${randomNum2}`);
        
        suggestions.push(`${firstLower}_${lastLower}`);
        suggestions.push(`${firstLower}-${lastInitial}${String(birthYear).slice(-2)}`);
        suggestions.push(`${firstInitial}${lastLower}${Math.floor(Math.random() * 999)}`);
    }

    return [...new Set(suggestions)].slice(0, 3);
}

// Logout
async function logout() {
    try {
        await window.supabaseClient.auth.signOut();
        currentUser = null;
        isAuthenticated = false;
        
        if (inactivityTimer) {
            clearTimeout(inactivityTimer);
            inactivityTimer = null;
        }
        
        localStorage.removeItem('lastActiveTime');
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Export functions
window.authFunctions = {
    checkAuthStatus,
    protectPage,
    handleLogin,
    handleSignup,
    verifyOTP,
    resendOTP,
    checkUsernameAvailability,
    validateUsername,
    generateUsernameSuggestions,
    logout,
    initializeActivityTracking
};
