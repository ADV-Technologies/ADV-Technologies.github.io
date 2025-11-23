// js/auth.js - Updated for Username/Email Login

// Ensure Supabase client is available from config.js or HTML
if (!window.supabaseClient) {
    console.error("Supabase client not initialized. Ensure config.js is loaded or credentials are in HTML.");
}
const supabaseClient = window.supabaseClient;

// --- Authentication State ---
let isAuthenticated = false;
let currentUser = null;
let userProfileData = null;

// --- Inactivity Tracking ---
let inactivityTimer = null;
let lastActivityTime = Date.now();
const INACTIVITY_TIMEOUT = 20 * 60 * 1000; // 20 minutes
const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

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
        console.log("Logging out due to inactivity.");
        await supabaseClient.auth.signOut();
        alert('You have been logged out due to inactivity. Please log in again to continue.');
        window.location.href = '/';
    }
}

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

     const lastActiveTime = localStorage.getItem('lastActiveTime');
     if (lastActiveTime && isAuthenticated) {
        const timeAway = Date.now() - parseInt(lastActiveTime);
        if (timeAway > INACTIVITY_TIMEOUT) {
            console.log("Logging out on load due to inactivity while away.");
            handleInactivityLogout();
            return;
        }
     }

    if (isAuthenticated) {
        resetInactivityTimer();
    }

     window.addEventListener('beforeunload', () => {
         if (isAuthenticated) {
             localStorage.setItem('lastActiveTime', Date.now().toString());
         }
     });
    console.log("Activity tracking initialized.");
}


// --- Core Authentication Functions ---

async function handleLogin(identifier, password) {
    window.commonFunctions.clearAllValidationBubbles('login-form');

    if (!identifier) {
        window.commonFunctions.showInputValidation('login-identifier', 'Please enter your email or username');
        return { success: false, error: 'Identifier required' };
    }
    if (!password) {
        window.commonFunctions.showInputValidation('login-password', 'Please enter your password');
        return { success: false, error: 'Password required' };
    }

    let loginEmail = identifier;

    // Check if input is NOT an email (assume it's a username)
    // Simple regex check for email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(identifier)) {
        // It looks like a username, fetch the email via RPC
        try {
            const { data: emailFromDb, error } = await supabaseClient.rpc('get_email_by_username', {
                username_input: identifier
            });

            if (error) {
                console.error("Error finding username:", error);
                // Don't fail yet, try passing it as email just in case
            } else if (emailFromDb) {
                loginEmail = emailFromDb; // Found the email!
            } else {
                // Username not found in DB
                window.commonFunctions.showInputValidation('login-identifier', 'Username not found.');
                return { success: false, error: 'Username not found' };
            }
        } catch (err) {
            console.error("RPC Exception:", err);
        }
    }

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: loginEmail,
            password: password,
        });

        if (error) {
            if (error.message.includes('Invalid login credentials')) {
                window.commonFunctions.showInputValidation('login-password', 'Invalid credentials.');
            } else if (error.message.includes('Email not confirmed')) {
                window.commonFunctions.showInputValidation('login-identifier', 'Please verify your email before logging in.');
            } else {
                 window.commonFunctions.showInputValidation('login-identifier', `Login failed: ${error.message}`);
            }
            throw error;
        }

        return { success: true, user: data.user };

    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: error.message };
    }
}


async function handleSignup(userData) {
    window.commonFunctions.clearAllValidationBubbles('signup-form');

    let isValid = true;
    const finalUsername = userData.username.toLowerCase();

    if (!userData.firstName || userData.firstName.length < 2) {
        window.commonFunctions.showInputValidation('signup-first-name', 'First name must be at least 2 characters');
        isValid = false;
    }

    if (!userData.email || !/\S+@\S+\.\S+/.test(userData.email)) {
        window.commonFunctions.showInputValidation('signup-email', 'Please enter a valid email');
        isValid = false;
    }

     if (!userData.dateOfBirth) {
         window.commonFunctions.showInputValidation('signup-dob', 'Please select your date of birth');
         isValid = false;
     }

    const usernameValidationResult = validateUsername(finalUsername);
    if (!usernameValidationResult.valid) {
        window.commonFunctions.showInputValidation('signup-username', usernameValidationResult.message);
        isValid = false;
    }

     if (!userData.profession || userData.profession.trim() === '') {
         window.commonFunctions.showMessage('signup', 'error', 'Please select or specify your profession.');
         isValid = false;
     }

    if (!userData.password || userData.password.length < 8) {
        window.commonFunctions.showInputValidation('signup-password', 'Password must be at least 8 characters');
        isValid = false;
    } else {
        const hasUpper = /[A-Z]/.test(userData.password);
        const hasLower = /[a-z]/.test(userData.password);
        const hasNumber = /\d/.test(userData.password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(userData.password);
        if (!(hasUpper && hasLower && hasNumber && hasSpecial)) {
            window.commonFunctions.showInputValidation('signup-password', 'Include uppercase, lowercase, number, and special character');
            isValid = false;
        }
    }
    if (userData.password !== userData.confirmPassword) {
        window.commonFunctions.showInputValidation('signup-confirm-password', 'Passwords do not match');
        isValid = false;
    }

    if (!isValid) return { success: false, error: 'Validation failed' };

    const isUsernameAvailable = await checkUsernameAvailability(finalUsername);
    if (!isUsernameAvailable) {
        window.commonFunctions.showInputValidation('signup-username', 'This username is already taken');
        return { success: false, error: 'Username taken' };
    }

    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email: userData.email,
            password: userData.password,
            options: {
                data: {
                    first_name: userData.firstName,
                    last_name: userData.lastName || null,
                    username: finalUsername,
                    date_of_birth: userData.dateOfBirth,
                    profession: userData.profession
                }
            }
        });

        if (error) {
            if (error.message.includes('already registered')) {
                window.commonFunctions.showInputValidation('signup-email', 'Email already registered. Try logging in.');
            } else if (error.message.includes('username')) {
                 window.commonFunctions.showInputValidation('signup-username', 'This username is already taken.');
            } else {
                window.commonFunctions.showMessage('signup', 'error', `Signup failed: ${error.message}`);
            }
            throw error;
        }

        currentUser = data.user;
        return { success: true, user: data.user, needsVerification: data.session === null };

    } catch (error) {
        console.error('Signup error:', error);
        return { success: false, error: error.message };
    }
}


async function handleOTPVerification(email, otpCode) {
    window.commonFunctions.clearMessages('otp');

    if (!email) {
         window.commonFunctions.showMessage('otp', 'error', 'Email context lost. Please try signing up again.');
         return { success: false, error: 'Email context lost' };
    }
     if (!otpCode || otpCode.length !== 6 || !/^\d{6}$/.test(otpCode)) {
        window.commonFunctions.showMessage('otp', 'error', 'Please enter a valid 6-digit code.');
        return { success: false, error: 'Invalid OTP format' };
    }

    try {
        const { data, error } = await supabaseClient.auth.verifyOtp({
            email: email,
            token: otpCode,
            type: 'signup'
        });

        if (error) {
            if (error.message.includes('Token has expired')) {
                window.commonFunctions.showMessage('otp', 'error', 'Verification code has expired. Please resend.');
            } else if (error.message.includes('already verified')) {
                window.commonFunctions.showMessage('otp', 'info', 'Your email is already verified. Redirecting...');
                 isAuthenticated = true; 
                setTimeout(() => { window.location.href = '/login/'; }, 1500);
                return { success: true, user: null };
            }
            else {
                window.commonFunctions.showMessage('otp', 'error', `Verification failed: ${error.message}`);
            }
            throw error;
        }

        isAuthenticated = true;
        currentUser = data.user || currentUser;
        await fetchUserProfile();
        resetInactivityTimer();

        return { success: true, user: currentUser };

    } catch (error) {
        console.error('OTP verification error:', error);
        return { success: false, error: error.message };
    }
}


async function resendOTP(email) {
     window.commonFunctions.clearMessages('otp');
    if (!email) {
        window.commonFunctions.showMessage('otp', 'error', 'Cannot resend code. Email context lost.');
        return { success: false, error: 'Email context lost' };
    }

    try {
        const { error } = await supabaseClient.auth.resend({
            type: 'signup',
            email: email
        });

        if (error) {
             if (error.message.includes('rate limit')) {
                 window.commonFunctions.showMessage('otp', 'error', 'Too many attempts. Please wait a minute before trying again.');
             } else {
                window.commonFunctions.showMessage('otp', 'error', `Failed to resend code: ${error.message}`);
             }
            throw error;
        }

        window.commonFunctions.showMessage('otp', 'success', 'Verification code resent! Please check your email.');
        return { success: true };

    } catch (error) {
        console.error('Resend OTP error:', error);
        return { success: false, error: error.message };
    }
}

async function handleLogout() {
     try {
        await supabaseClient.auth.signOut();
        if (inactivityTimer) {
            clearTimeout(inactivityTimer);
            inactivityTimer = null;
        }
        localStorage.removeItem('lastActiveTime'); 
        userProfileData = null; 
        
        if (window.location.pathname !== '/') {
            window.location.href = '/';
        }
     } catch (error) {
        console.error('Logout error:', error);
     }
}

async function fetchUserProfile() {
    if (!currentUser) {
        userProfileData = null;
        return null;
    }

    try {
        const { data, error, status } = await supabaseClient
            .from('user_profiles')
            .select('*') 
            .eq('id', currentUser.id)
            .single(); 

        if (error && status !== 406) { 
            console.error('Supabase error fetching profile:', error);
            throw error;
        }

        if (data) {
            if (data.is_banned) {
                console.warn("User is banned. Logging out.");
                await supabaseClient.auth.signOut();
                alert(`Your account has been banned.\nReason: ${data.ban_reason || 'Violation of terms.'}`);
                window.location.href = '/';
                return null;
            }
            userProfileData = data;
            return userProfileData;
        } else {
             console.warn("fetchUserProfile: User profile not found in database.");
             userProfileData = null; 
             return null;
        }
    } catch (error) {
        console.error('Exception during fetchUserProfile:', error);
        userProfileData = null; 
        return null;
    }
}

function validateUsername(username) {
    const regex = /^[a-z0-9_-]+$/; 
    if (!username) return { valid: false, message: 'Username is required' };
    if (!regex.test(username)) return { valid: false, message: 'Use only lowercase letters, numbers, _, -' };
    if (username.length < 3) return { valid: false, message: 'Username must be at least 3 characters' };
    if (username.length > 20) return { valid: false, message: 'Username must be 20 characters or less' };
    return { valid: true, message: 'Username format is valid!' }; 
}

async function checkUsernameAvailability(username) {
    if (!username) return false;
    const formatValidation = validateUsername(username);
    if (!formatValidation.valid) return false;

    try {
        const { data, error } = await supabaseClient.rpc('is_username_available', {
            check_username: username
        });
        if (error) return false;
        return data; 
    } catch (error) {
        return false;
    }
}

function generateUsernameSuggestions(firstName, lastName, dob) {
    const suggestions = new Set(); 
    const fn = firstName.toLowerCase().replace(/[^a-z0-9]/g, ''); 
    const ln = lastName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const year = dob ? new Date(dob).getFullYear() : new Date().getFullYear();
    const shortYear = String(year).slice(-2);
    const fnInitial = fn.charAt(0);
    const lnInitial = ln.charAt(0);

    if (fn) {
        if (fn.length >= 3) suggestions.add(fn); 
        if (ln) {
            if (`${fn}${ln}`.length >= 3) suggestions.add(`${fn}${ln}`);
            if (`${fn}_${ln}`.length >= 3) suggestions.add(`${fn}_${ln}`);
            if (`${fnInitial}${ln}`.length >= 3) suggestions.add(`${fnInitial}${ln}`);
            if (`${fn}${lnInitial}`.length >= 3) suggestions.add(`${fn}${lnInitial}`);
            if (`${fn}${shortYear}`.length >= 3) suggestions.add(`${fn}${shortYear}`);
            if (`${fnInitial}${ln}${shortYear}`.length >= 3) suggestions.add(`${fnInitial}${ln}${shortYear}`);
        } else {
             if (`${fn}${year}`.length >= 3) suggestions.add(`${fn}${year}`);
             if (`${fn}_${shortYear}`.length >= 3) suggestions.add(`${fn}_${shortYear}`);
        }
         let randomUser1 = `${fn}${Math.floor(Math.random() * 99)}`;
         if (randomUser1.length < 3) randomUser1 = `${randomUser1}0`; 
         suggestions.add(randomUser1);

         let randomUser2 = `${fn}_${Math.floor(Math.random() * 999)}`;
         if (randomUser2.length < 3) randomUser2 = `${randomUser2}0`;
         suggestions.add(randomUser2);

    } else if (ln) {
        if (ln.length >= 3) suggestions.add(ln);
        if (`${ln}${year}`.length >= 3) suggestions.add(`${ln}${year}`);
        if (`${ln}_${shortYear}`.length >= 3) suggestions.add(`${ln}_${shortYear}`);
        let randomUser3 = `${ln}${Math.floor(Math.random() * 99)}`;
        if (randomUser3.length < 3) randomUser3 = `${randomUser3}0`;
        suggestions.add(randomUser3);
    }

    const validSuggestions = [...suggestions]
        .filter(s => s.length >= 3 && s.length <= 20 && /^[a-z0-9_-]+$/.test(s));

    return validSuggestions.slice(0, 3);
}

async function displayUsernameSuggestions() { 
    const container = document.getElementById('username-suggestions');
    if (!container) return; 
    
    const firstName = document.getElementById('signup-first-name').value.trim();
    const lastName = document.getElementById('signup-last-name').value.trim();
    const dob = document.getElementById('signup-dob').value;
    const suggestions = generateUsernameSuggestions(firstName, lastName, dob);

    const suggestionItems = container.querySelectorAll('.suggestion-item');

    suggestionItems.forEach(item => {
        item.style.display = 'none';
        item.onclick = null;
        const statusEl = item.querySelector('.suggestion-status');
        if(statusEl) statusEl.textContent = '';
        item.style.cursor = 'pointer';
        item.style.opacity = '1';
    });

    if (suggestions.length > 0) {
        container.classList.add('show');
        const availabilityChecks = suggestions.map(suggestion => checkUsernameAvailability(suggestion));
        const availabilityResults = await Promise.all(availabilityChecks);

        suggestions.forEach((suggestion, index) => {
            if (suggestionItems[index]) {
                const item = suggestionItems[index];
                const textEl = item.querySelector('.suggestion-text');
                const statusEl = item.querySelector('.suggestion-status');

                textEl.textContent = suggestion;
                item.dataset.suggestion = suggestion; 
                item.style.display = 'flex'; 

                const isAvailable = availabilityResults[index];
                statusEl.textContent = isAvailable ? 'Available' : 'Taken';
                statusEl.className = `suggestion-status ${isAvailable ? 'available' : 'taken'}`;

                if (isAvailable) {
                    item.onclick = () => {
                        const usernameInput = document.getElementById('signup-username');
                        usernameInput.value = suggestion;
                        usernameInput.dispatchEvent(new Event('input'));
                        container.classList.remove('show'); 
                    };
                } else {
                    item.onclick = null;
                    item.style.cursor = 'not-allowed';
                    item.style.opacity = '0.7';
                }
            }
        });
    } else {
        container.classList.remove('show');
    }
}

async function updateAuthUI() { 
    const authButtons = document.getElementById('auth-buttons');
    const userProfile = document.getElementById('user-profile');
    const userAvatar = document.getElementById('user-avatar');
    const profileUsernameNav = document.getElementById('profile-username'); 

    if (!authButtons || !userProfile || !userAvatar) return;

    if (isAuthenticated && currentUser) {
        authButtons.style.display = 'none';
        userProfile.style.display = 'flex'; 

        if (!userProfileData || userProfileData.id !== currentUser.id) {
            await fetchUserProfile(); 
        }

        const firstName = userProfileData?.first_name || currentUser.user_metadata?.first_name || '';
        const lastName = userProfileData?.last_name || currentUser.user_metadata?.last_name || '';
        const username = userProfileData?.username || currentUser.user_metadata?.username || 'User';

        if (profileUsernameNav) profileUsernameNav.textContent = username;

        let avatarText = 'U'; 
        if (firstName && lastName) {
            avatarText = firstName.charAt(0).toUpperCase() + lastName.charAt(0).toUpperCase();
        } else if (firstName) {
            avatarText = firstName.charAt(0).toUpperCase();
        } else if (currentUser.email) {
            avatarText = currentUser.email.charAt(0).toUpperCase();
        }
        userAvatar.textContent = avatarText;

    } else {
        authButtons.style.display = 'flex'; 
        userProfile.style.display = 'none'; 
        if (inactivityTimer) {
            clearTimeout(inactivityTimer);
            inactivityTimer = null;
        }
        userProfileData = null; 
    }
}

function redirectToProfile() {
     window.location.href = '/dashboard/';
}

async function initializeAuth() {
    console.log("Initializing Auth...");
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error) {
            console.error("Error getting session:", error);
            isAuthenticated = false;
            currentUser = null;
        } else if (session) {
            isAuthenticated = true;
            currentUser = session.user;
            await fetchUserProfile(); 
        } else {
             isAuthenticated = false;
             currentUser = null;
        }
    } catch (err) {
        console.error("Exception during initial auth check:", err);
        isAuthenticated = false;
        currentUser = null;
    } finally {
        updateAuthUI(); 
        initializeActivityTracking(); 
        if (window.commonFunctions && window.commonFunctions.applyWebsiteSettings) {
            window.commonFunctions.applyWebsiteSettings();
        }
    }
}

supabaseClient.auth.onAuthStateChange(async (event, session) => {
    console.log("Auth State Change Event:", event, session); 

    let needsRedirect = false;
    let redirectUrl = '/'; 

    if (event === 'SIGNED_IN' && session) {
        isAuthenticated = true;
        currentUser = session.user;
        await fetchUserProfile(); 
        resetInactivityTimer(); 
        updateAuthUI();
        
        if (window.location.pathname.includes('/login/') || window.location.pathname.includes('/signup/')) {
            needsRedirect = true;
            redirectUrl = '/'; 
        }

    } else if (event === 'SIGNED_OUT') {
        const wasLoggedIn = isAuthenticated; 
        isAuthenticated = false;
        currentUser = null;
        userProfileData = null;
        if (inactivityTimer) {
            clearTimeout(inactivityTimer);
            inactivityTimer = null;
        }
        localStorage.removeItem('lastActiveTime');
        updateAuthUI();
        
         if (wasLoggedIn && (window.location.pathname.includes('/dashboard/') || window.location.pathname.includes('/admin-panel/'))) {
             needsRedirect = true;
             redirectUrl = '/';
         }

    } else if (event === 'USER_UPDATED') {
        currentUser = session?.user || null;
        if(currentUser) await fetchUserProfile(); 
        updateAuthUI();
    } else if (event === 'TOKEN_REFRESHED') {
        if (session) {
             currentUser = session.user;
             isAuthenticated = true; 
             resetInactivityTimer(); 
         } else {
             isAuthenticated = false;
             currentUser = null;
         }
         updateAuthUI();
    } else if (event === 'INITIAL_SESSION') {
         isAuthenticated = !!session;
         currentUser = session?.user || null;
         if (isAuthenticated) {
             await fetchUserProfile();
             resetInactivityTimer();
         }
         updateAuthUI();
    }

     if (needsRedirect && window.location.pathname !== redirectUrl) {
         window.location.href = redirectUrl;
     }
});

async function logout() {
    await handleLogout();
}

window.authFunctions = {
    handleLogin,
    handleSignup,
    handleOTPVerification,
    resendOTP,
    logout, 
    checkAuthStatus: initializeAuth, 
    updateAuthUI, 
    redirectToProfile, 
    validateUsername, 
    checkUsernameAvailability, 
    displayUsernameSuggestions, 
    generateUsernameSuggestions, 
    resetInactivityTimer, 
    fetchUserProfile, 
    getUserRole: () => userProfileData?.role || 'user', 
    getCurrentUser: () => currentUser, 
    getUserProfileData: () => userProfileData, 
    isAuthenticated: () => isAuthenticated 
};

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('/login/') || window.location.pathname.includes('/signup/')) {
         initializeActivityTracking();
    } else {
        initializeAuth();
    }
});
