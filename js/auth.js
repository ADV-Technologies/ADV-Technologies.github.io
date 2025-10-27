// js/auth.js

// Ensure Supabase client is available from config.js or HTML
if (!window.supabaseClient) {
    console.error("Supabase client not initialized. Ensure config.js is loaded or credentials are in HTML.");
}
const supabaseClient = window.supabaseClient;

// --- Authentication State ---
let isAuthenticated = false;
let currentUser = null;
let userProfileData = null; // To store profile details including role

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
    // Only set timer if user is authenticated
    if (isAuthenticated) {
        inactivityTimer = setTimeout(() => {
            handleInactivityLogout();
        }, INACTIVITY_TIMEOUT);
        // console.log("Inactivity timer reset."); // For debugging
    }
}

async function handleInactivityLogout() {
    if (isAuthenticated) {
        console.log("Logging out due to inactivity.");
        await supabaseClient.auth.signOut();
        // State will be updated by onAuthStateChange listener
        alert('You have been logged out due to inactivity. Please log in again to continue.');
        // Optionally redirect to login page or index
        window.location.href = 'index.html'; // Redirect home after inactivity logout
    }
}

function initializeActivityTracking() {
    activityEvents.forEach(event => {
        document.addEventListener(event, resetInactivityTimer, true);
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            localStorage.setItem('lastActiveTime', Date.now().toString());
             // console.log("Tab hidden, storing last active time."); // Debug
        } else {
            const lastActiveTime = localStorage.getItem('lastActiveTime');
            if (lastActiveTime && isAuthenticated) {
                const timeAway = Date.now() - parseInt(lastActiveTime);
                 // console.log(`Tab visible again. Time away: ${timeAway / 1000}s`); // Debug
                if (timeAway > INACTIVITY_TIMEOUT) {
                    handleInactivityLogout();
                    return; // Don't reset timer if already logged out
                }
            }
            resetInactivityTimer(); // Reset timer when tab becomes visible
        }
    });

    // Check on initial load
     const lastActiveTime = localStorage.getItem('lastActiveTime');
     if (lastActiveTime && isAuthenticated) { // Check if authenticated state might already be known
        const timeAway = Date.now() - parseInt(lastActiveTime);
        if (timeAway > INACTIVITY_TIMEOUT) {
            console.log("Logging out on load due to inactivity while away.");
            handleInactivityLogout(); // Perform logout if timeout occurred while away
            return; // Stop further initialization if logged out
        }
     }

    // Start timer immediately if already authenticated on load (after initial check)
    if (isAuthenticated) {
        resetInactivityTimer();
    }

     // Store time before unload
     window.addEventListener('beforeunload', () => {
         if (isAuthenticated) { // Only store if logged in
             localStorage.setItem('lastActiveTime', Date.now().toString());
         }
     });
    console.log("Activity tracking initialized.");
}


// --- Core Authentication Functions ---

async function handleLogin(email, password) {
    // Uses bubble validation from common.js
    window.commonFunctions.clearAllValidationBubbles('login-form'); // Clear previous bubbles

    if (!email) {
        window.commonFunctions.showInputValidation('login-email', 'Please enter your email address');
        return { success: false, error: 'Email required' };
    }
    if (!password) {
        window.commonFunctions.showInputValidation('login-password', 'Please enter your password');
        return { success: false, error: 'Password required' };
    }

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            if (error.message.includes('Invalid login credentials')) {
                window.commonFunctions.showInputValidation('login-password', 'Invalid email or password.');
            } else if (error.message.includes('Email not confirmed')) {
                window.commonFunctions.showInputValidation('login-email', 'Please verify your email before logging in.');
                // Optionally trigger OTP resend or redirect?
            } else {
                 window.commonFunctions.showInputValidation('login-email', `Login failed: ${error.message}`); // Show generic error on email field
            }
            throw error; // Let the caller know it failed
        }

        // Login successful - state updated via onAuthStateChange
        // Redirect handled by onAuthStateChange or caller
        return { success: true, user: data.user };

    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: error.message };
    }
}


// Signup function - collects all data
async function handleSignup(userData) {
    // userData = { firstName, lastName, username, email, dateOfBirth, profession, password, confirmPassword }
    window.commonFunctions.clearAllValidationBubbles('signup-form'); // Clear previous bubbles

    // --- Form Validation (with bubble messages) ---
    let isValid = true;

    if (!userData.firstName || userData.firstName.length < 2) {
        window.commonFunctions.showInputValidation('signup-first-name', 'First name must be at least 2 characters');
        isValid = false;
    }
    // lastName is optional

    if (!userData.email || !/\S+@\S+\.\S+/.test(userData.email)) { // Basic email format check
        window.commonFunctions.showInputValidation('signup-email', 'Please enter a valid email');
        isValid = false;
    }

     if (!userData.dateOfBirth) {
         window.commonFunctions.showInputValidation('signup-dob', 'Please select your date of birth');
         isValid = false;
     }

    // Username format/length validation
    const usernameFormatValidationResult = validateUsername(userData.username);
    if (!usernameFormatValidationResult.valid) {
        window.commonFunctions.showInputValidation('signup-username', usernameFormatValidationResult.message);
        isValid = false;
    }

     if (!userData.profession || userData.profession.trim() === '') {
         // This validation might be better handled directly via the dropdown logic in HTML
         window.commonFunctions.showMessage('signup', 'error', 'Please select or specify your profession.'); // Use general message area for dropdown
         isValid = false;
     }

    // Password validation
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

    // --- Username Uniqueness Check (using RPC) ---
    const isUsernameAvailable = await checkUsernameAvailability(userData.username);
    if (!isUsernameAvailable) {
        window.commonFunctions.showInputValidation('signup-username', 'This username is already taken');
        // Update the suggestion status dynamically if needed
        const validationEl = document.getElementById('username-validation');
        if (validationEl) {
             validationEl.textContent = 'Username is already taken';
             validationEl.className = 'username-validation error';
        }
        return { success: false, error: 'Username taken' };
    }


    // --- Attempt Supabase Signup ---
    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email: userData.email,
            password: userData.password,
            options: {
                data: { // This data goes into auth.users.raw_user_meta_data
                    first_name: userData.firstName,
                    last_name: userData.lastName || null, // Handle optional field
                    username: userData.username, // Username is crucial here
                    date_of_birth: userData.dateOfBirth,
                    profession: userData.profession
                }
            }
        });

        if (error) {
            if (error.message.includes('already registered')) {
                window.commonFunctions.showInputValidation('signup-email', 'Email already registered. Try logging in.');
            } else if (error.message.includes('duplicate key value violates unique constraint') && error.message.includes('username')) {
                 // This error comes from the DB trigger if username check failed somehow
                 window.commonFunctions.showInputValidation('signup-username', 'This username is already taken.');
            } else {
                window.commonFunctions.showMessage('signup', 'error', `Signup failed: ${error.message}`); // Show general error
            }
            throw error;
        }

        // Signup successful, waiting for OTP
        // Store user temporarily for OTP step (needed for resend)
        currentUser = data.user; // Store the user object from signup response
        pendingVerification = true; // Set OTP pending flag

        // No need to close signup modal here, handled by caller in signup.html
        // No need to open OTP modal here, handled by caller in signup.html
        // No need to show OTP message here, handled by caller in signup.html

        return { success: true, user: data.user, needsVerification: data.session === null }; // Check if session is null (email verification needed)

    } catch (error) {
        console.error('Signup error:', error);
        return { success: false, error: error.message };
    }
}


async function handleOTPVerification(email, otpCode) { // Pass email explicitly
    window.commonFunctions.clearMessages('otp'); // Clear previous OTP messages

    if (!email) {
         window.commonFunctions.showMessage('otp', 'error', 'Email context lost. Please try signing up again.');
         // Maybe guide user back?
         return { success: false, error: 'Email context lost' };
    }
     if (!otpCode || otpCode.length !== 6 || !/^\d{6}$/.test(otpCode)) {
        window.commonFunctions.showMessage('otp', 'error', 'Please enter a valid 6-digit code.');
        return { success: false, error: 'Invalid OTP format' };
    }


    try {
        const { data, error } = await supabaseClient.auth.verifyOtp({
            email: email, // Use the passed email
            token: otpCode,
            type: 'signup' // Must match the type used in signUp
        });

        if (error) {
            if (error.message.includes('Token has expired')) {
                window.commonFunctions.showMessage('otp', 'error', 'Verification code has expired. Please resend.');
            } else if (error.message.includes('already verified')) {
                // This can happen if user clicks link AND enters code
                window.commonFunctions.showMessage('otp', 'info', 'Your email is already verified. Redirecting to login...');
                // Update state as if successful
                 isAuthenticated = true; // Assume verification implies logged in state initially? Check Supabase behavior.
                 pendingVerification = false;
                 // Fetch session to confirm state and get full user data might be needed
                 // await checkAuthStatus(); // Might trigger redirection
                // Redirect to login is safer
                setTimeout(() => { window.location.href = 'login.html?verified=true'; }, 1500);
                return { success: true, user: null }; // Indicate success but let login handle auth state
            }
            else {
                window.commonFunctions.showMessage('otp', 'error', `Verification failed: ${error.message}`);
            }
            throw error;
        }

        // OTP Verification successful
        // The onAuthStateChange listener should handle the SIGNED_IN event
        isAuthenticated = true;
        currentUser = data.user || currentUser; // Update user object if returned
        pendingVerification = false;

        // No need to close OTP modal, handled by caller
        // No need to show success message, handled by caller

        // Fetch profile data including role after verification
        await fetchUserProfile();

        // Reset inactivity timer now that user is fully authenticated
        resetInactivityTimer();

        return { success: true, user: currentUser };

    } catch (error) {
        console.error('OTP verification error:', error);
        // Error message is shown above
        return { success: false, error: error.message };
    }
}


async function resendOTP(email) { // Pass email explicitly
     window.commonFunctions.clearMessages('otp'); // Clear previous messages
    if (!email) {
        window.commonFunctions.showMessage('otp', 'error', 'Cannot resend code. Email context lost.');
        return { success: false, error: 'Email context lost' };
    }

    try {
        // Use the appropriate resend method
        const { error } = await supabaseClient.auth.resend({
            type: 'signup', // Must match the type used for signup
            email: email
        });

        if (error) {
            // Handle rate limiting errors specifically
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
     console.log("Handling manual logout.");
     try {
        await supabaseClient.auth.signOut();
        // State updates (isAuthenticated=false, currentUser=null) handled by onAuthStateChange
        // Clear inactivity timer
        if (inactivityTimer) {
            clearTimeout(inactivityTimer);
            inactivityTimer = null;
        }
        localStorage.removeItem('lastActiveTime'); // Clear stored activity time
        userProfileData = null; // Clear profile data
        console.log("Logout successful.");
        // Redirect to home page after logout
        if (!window.location.pathname.includes('index.html') && window.location.pathname !== '/') {
            window.location.href = 'index.html';
        } else {
            // If already on index, just update UI (handled by auth state change)
        }
     } catch (error) {
        console.error('Logout error:', error);
        alert(`Logout failed: ${error.message}`);
     }
}


// --- User Profile & Role ---
async function fetchUserProfile() {
    // This function now relies on currentUser being set correctly by getSession or onAuthStateChange
    if (!currentUser) { // Check currentUser instead of isAuthenticated
        userProfileData = null;
        console.log("fetchUserProfile: No current user, skipping fetch.");
        return null;
    }

    try {
        console.log("fetchUserProfile: Fetching profile for user:", currentUser.id);
        const { data, error, status } = await supabaseClient
            .from('user_profiles')
            .select('*') // Select all columns, including 'role'
            .eq('id', currentUser.id)
            .single(); // Expect only one row

        if (error && status !== 406) { // 406 means no rows found
            console.error('Supabase error fetching profile:', error);
            throw error;
        }

        if (data) {
            userProfileData = data;
            console.log("fetchUserProfile: User profile fetched successfully:", userProfileData);
            // Optionally update UI elements that depend on role immediately
             // updateRoleSpecificUI(userProfileData.role); // Call this where needed, e.g., in dashboard.js
            return userProfileData;
        } else {
             // Profile might not exist yet if trigger hasn't run or failed after signup/verification
             console.warn("fetchUserProfile: User profile not found in database for ID:", currentUser.id);
             // Trigger might be slightly delayed. Consider a retry mechanism or handle this state in UI.
             userProfileData = null; // Set to null if not found
             // Don't assume 'user' role, let UI handle missing profile state
             return null;
        }
    } catch (error) {
        console.error('Exception during fetchUserProfile:', error);
        userProfileData = null; // Set to null on error
        // Don't assume 'user' role on error
        return null;
    }
}

// Function to update UI elements based on role (example placeholder)
function updateRoleSpecificUI(role) {
    // This is a placeholder. Actual implementation should be in dashboard.js or admin-panel.js
    console.log(`UI update requested for role: ${role}. Implementation needed in specific page script.`);
    const adminPanelLink = document.getElementById('admin-panel-link'); // Example ID
    if (adminPanelLink) {
        adminPanelLink.style.display = (role === 'admin') ? 'block' : 'none';
    }
    const memberContent = document.querySelectorAll('.member-only'); // Example class
    memberContent.forEach(el => {
        el.style.display = (role === 'admin' || role === 'member') ? 'block' : 'none';
    });
}

// --- Username Validation & Suggestions ---

// Validate format (lowercase, numbers, _, -) and length
function validateUsername(username) {
    const regex = /^[a-z0-9_-]+$/; // Only lowercase letters, numbers, underscore, hyphen
    if (!username) {
        return { valid: false, message: 'Username is required' };
    }
    if (!regex.test(username)) {
        return { valid: false, message: 'Use only lowercase letters, numbers, _, -' };
    }
    if (username.length < 3) {
        return { valid: false, message: 'Username must be at least 3 characters' };
    }
    if (username.length > 20) {
        return { valid: false, message: 'Username must be 20 characters or less' };
    }
    return { valid: true, message: 'Username format is valid!' }; // Success message for format
}


// Check availability against the database using RPC
async function checkUsernameAvailability(username) {
    if (!username) return false;
    const formatValidation = validateUsername(username);
    if (!formatValidation.valid) return false;

    try {
        console.log(`Checking username availability via RPC for: ${username}`);
        // Call the PostgreSQL function 'is_username_available'
        const { data, error } = await supabaseClient.rpc('is_username_available', {
            check_username: username
        });

        if (error) {
            console.error('RPC Error checking username availability:', error);
            // Handle specific errors? For now, assume taken on error for safety.
            return false;
        }

        console.log(`RPC result for ${username}: ${data}`);
        // The function returns true if available, false if taken.
        return data;

    } catch (error) {
        console.error('Exception calling RPC checkUsernameAvailability:', error);
        return false; // Assume taken on exception
    }
}


// Generate suggestions (ensure lowercase)
function generateUsernameSuggestions(firstName, lastName, dob) {
    const suggestions = new Set(); // Use a Set to avoid duplicates
    const fn = firstName.toLowerCase().replace(/[^a-z0-9]/g, ''); // Keep numbers if present
    const ln = lastName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const year = dob ? new Date(dob).getFullYear() : new Date().getFullYear();
    const shortYear = String(year).slice(-2);
    const fnInitial = fn.charAt(0);
    const lnInitial = ln.charAt(0);

    if (fn) {
        if (fn.length >= 3) suggestions.add(fn); // Only add if >= 3 chars
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
        // Add some random numbers, ensuring length >= 3
         let randomUser1 = `${fn}${Math.floor(Math.random() * 99)}`;
         if (randomUser1.length < 3) randomUser1 += '0'; // Pad if needed
         suggestions.add(randomUser1);

         let randomUser2 = `${fn}_${Math.floor(Math.random() * 999)}`;
         if (randomUser2.length < 3) randomUser2 += '0';
         suggestions.add(randomUser2);

    } else if (ln) {
        if (ln.length >= 3) suggestions.add(ln);
        if (`${ln}${year}`.length >= 3) suggestions.add(`${ln}${year}`);
        if (`${ln}_${shortYear}`.length >= 3) suggestions.add(`${ln}_${shortYear}`);
        let randomUser3 = `${ln}${Math.floor(Math.random() * 99)}`;
        if (randomUser3.length < 3) randomUser3 += '0';
        suggestions.add(randomUser3);
    }

    // Filter suggestions based on validation rules (format is handled by generation, check length again)
    const validSuggestions = [...suggestions]
        .filter(s => s.length >= 3 && s.length <= 20 && /^[a-z0-9_-]+$/.test(s));

    // Return top 3, or fewer
    return validSuggestions.slice(0, 3);
}

// Function to display suggestions and check their availability (used in signup.html)
async function displayUsernameSuggestions(suggestions) {
    const container = document.getElementById('username-suggestions');
    if (!container) return; // Only run on signup page

    const suggestionItems = container.querySelectorAll('.suggestion-item');

    // Clear previous states and hide all
    suggestionItems.forEach(item => {
        item.style.display = 'none';
        item.onclick = null;
        const statusEl = item.querySelector('.suggestion-status');
        if(statusEl) statusEl.textContent = '';
        item.style.cursor = 'pointer'; // Reset cursor
        item.style.opacity = '1';      // Reset opacity
    });

    if (suggestions.length > 0) {
        container.classList.add('show');
        // Check availability for each suggestion concurrently
        const availabilityChecks = suggestions.map(suggestion => checkUsernameAvailability(suggestion));
        const availabilityResults = await Promise.all(availabilityChecks);

        suggestions.forEach((suggestion, index) => {
            if (suggestionItems[index]) {
                const item = suggestionItems[index];
                const textEl = item.querySelector('.suggestion-text');
                const statusEl = item.querySelector('.suggestion-status');

                textEl.textContent = suggestion;
                item.dataset.suggestion = suggestion; // Store suggestion
                item.style.display = 'flex'; // Show item

                const isAvailable = availabilityResults[index];
                statusEl.textContent = isAvailable ? 'Available' : 'Taken';
                statusEl.className = `suggestion-status ${isAvailable ? 'available' : 'taken'}`;

                if (isAvailable) {
                    item.onclick = () => {
                        const usernameInput = document.getElementById('signup-username');
                        usernameInput.value = suggestion;
                        usernameInput.dispatchEvent(new Event('input')); // Trigger validation/check
                        container.classList.remove('show'); // Hide suggestions after selection
                    };
                } else {
                    item.onclick = null; // Not clickable
                    item.style.cursor = 'not-allowed';
                    item.style.opacity = '0.7';
                }
            }
        });
    } else {
        container.classList.remove('show');
    }
}


// --- Auth UI Update ---
// Central function to update UI based on authentication state
async function updateAuthUI() { // Made async to await profile fetch
    const authButtons = document.getElementById('auth-buttons');
    const userProfile = document.getElementById('user-profile');
    const userAvatar = document.getElementById('user-avatar');
    const profileUsernameNav = document.getElementById('profile-username'); // In dashboard/admin nav

    // Ensure elements exist before manipulating
    if (!authButtons || !userProfile || !userAvatar) {
        // console.warn("Auth UI elements not found on this page.");
        // If elements aren't present (e.g., on login/signup page), just return
        return;
    }


    if (isAuthenticated && currentUser) {
        authButtons.style.display = 'none';
        userProfile.style.display = 'flex'; // Show profile avatar/link

        // Attempt to fetch profile if not already loaded
        if (!userProfileData || userProfileData.id !== currentUser.id) {
            await fetchUserProfile(); // Fetch profile if needed
        }

        // Use profile data if available, otherwise fallback to metadata/email
        const firstName = userProfileData?.first_name || currentUser.user_metadata?.first_name || '';
        const lastName = userProfileData?.last_name || currentUser.user_metadata?.last_name || '';
        const username = userProfileData?.username || currentUser.user_metadata?.username || 'User';

        if (profileUsernameNav) { // Update username in dashboard/admin navbars
            profileUsernameNav.textContent = username;
        }

        let avatarText = 'U'; // Default
        if (firstName && lastName) {
            avatarText = firstName.charAt(0).toUpperCase() + lastName.charAt(0).toUpperCase();
        } else if (firstName) {
            avatarText = firstName.charAt(0).toUpperCase();
        } else if (currentUser.email) {
            avatarText = currentUser.email.charAt(0).toUpperCase();
        }
        userAvatar.textContent = avatarText;

    } else {
        // Not authenticated
        authButtons.style.display = 'flex'; // Show Login/Signup
        userProfile.style.display = 'none'; // Hide profile avatar/link

        // Clear inactivity timer when logged out
        if (inactivityTimer) {
            clearTimeout(inactivityTimer);
            inactivityTimer = null;
        }
        userProfileData = null; // Clear profile data
    }
}

// Redirect placeholder for profile/dashboard click (now redirects correctly)
function redirectToProfile() {
     window.location.href = 'dashboard.html';
}

// --- Initialization and Event Listeners ---

// Check initial auth status on page load (now calls the async version)
async function initializeAuth() {
    console.log("Initializing Auth...");
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error) {
            console.error("Error getting session:", error);
            isAuthenticated = false;
            currentUser = null;
        } else if (session) {
            console.log("Session found on load:", session);
            isAuthenticated = true;
            currentUser = session.user;
            await fetchUserProfile(); // Fetch profile immediately if session exists
        } else {
             console.log("No active session found on load.");
             isAuthenticated = false;
             currentUser = null;
        }
    } catch (err) {
        console.error("Exception during initial auth check:", err);
        isAuthenticated = false;
        currentUser = null;
    } finally {
        updateAuthUI(); // Update UI based on initial status
        initializeActivityTracking(); // Start inactivity timer system AFTER checking auth
        console.log("Auth initialized. isAuthenticated:", isAuthenticated);
    }
}


// Listen for Supabase auth state changes
supabaseClient.auth.onAuthStateChange(async (event, session) => {
    console.log("Auth State Change Event:", event, session); // Log events

    let needsRedirect = false;
    let redirectUrl = 'index.html'; // Default redirect

    if (event === 'SIGNED_IN' && session) {
        isAuthenticated = true;
        currentUser = session.user;
        await fetchUserProfile(); // Fetch profile on sign in
        resetInactivityTimer(); // Start inactivity timer
        updateAuthUI();
        // Determine redirect after sign in
        // If user signed in on login/signup page, redirect to index
        if (window.location.pathname.includes('login.html') || window.location.pathname.includes('signup.html')) {
            needsRedirect = true;
            redirectUrl = 'index.html'; // Go to index after login/signup success
        }


    } else if (event === 'SIGNED_OUT') {
        const wasLoggedIn = isAuthenticated; // Check if they were previously logged in
        isAuthenticated = false;
        currentUser = null;
        userProfileData = null;
        if (inactivityTimer) {
            clearTimeout(inactivityTimer);
            inactivityTimer = null;
        }
        localStorage.removeItem('lastActiveTime');
        updateAuthUI();
        // Redirect to index if logged out from a protected page
         if (wasLoggedIn && (window.location.pathname.includes('dashboard.html') || window.location.pathname.includes('admin-panel.html'))) {
             needsRedirect = true;
             redirectUrl = 'index.html';
         }

    } else if (event === 'USER_UPDATED') {
        // Handle user updates if necessary (e.g., email change)
        currentUser = session?.user || null;
        if(currentUser) await fetchUserProfile(); // Re-fetch profile on update
        updateAuthUI();
    } else if (event === 'PASSWORD_RECOVERY') {
         // Handle password recovery state if needed
         console.log("Password recovery event");
    } else if (event === 'TOKEN_REFRESHED') {
        // Session token refreshed, update state if necessary
        console.log("Token refreshed");
        if (session) {
             currentUser = session.user;
             isAuthenticated = true; // Ensure state is correct
             resetInactivityTimer(); // Reset timer on token refresh as activity indicator
         } else {
             // If refresh fails, it might lead to SIGNED_OUT
             isAuthenticated = false;
             currentUser = null;
         }
         updateAuthUI();
    } else if (event === 'INITIAL_SESSION') {
         // Handled by the initial checkAuthStatus call, but good to log
         console.log("Initial session event processed.");
         // Update state based on session
         isAuthenticated = !!session;
         currentUser = session?.user || null;
         if (isAuthenticated) {
             await fetchUserProfile();
             resetInactivityTimer();
         }
         updateAuthUI();
    }

     // Perform redirection outside the event handling logic if needed
     if (needsRedirect && window.location.pathname !== redirectUrl.split('/').pop()) {
         console.log(`Redirecting to ${redirectUrl}...`);
         window.location.href = redirectUrl;
     }
});

// Global logout function accessible from buttons/links
// Defined earlier: async function logout() { ... }


// --- Export functions for use in HTML pages ---
// Use window.authFunctions.functionName() to call these
window.authFunctions = {
    handleLogin,
    handleSignup,
    handleOTPVerification,
    resendOTP,
    logout, // Make logout globally accessible
    checkAuthStatus, // For initial load check (async version)
    updateAuthUI, // To manually trigger UI update if needed
    redirectToProfile, // Function to navigate to dashboard
    validateUsername, // For format validation
    checkUsernameAvailability, // For uniqueness check (async)
    displayUsernameSuggestions, // To show suggestions on signup page (async)
    resetInactivityTimer, // Allow manual reset if needed
    fetchUserProfile, // To get profile data on dashboard etc. (async)
    getUserRole: () => userProfileData?.role || 'user', // Function to get current user's role safely
    getCurrentUser: () => currentUser, // Get the Supabase auth user object
    getUserProfileData: () => userProfileData, // Get the fetched profile data
    isAuthenticated: () => isAuthenticated // Check current auth state
};

// Perform initial check when script loads
document.addEventListener('DOMContentLoaded', () => {
    initializeAuth(); // Use the async initializer
});
