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
        // window.location.href = 'index.html';
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
     if (lastActiveTime && isAuthenticated) {
        const timeAway = Date.now() - parseInt(lastActiveTime);
        if (timeAway > INACTIVITY_TIMEOUT) {
            console.log("Logging out on load due to inactivity while away.");
            handleInactivityLogout();
            return;
        }
     }

    // Start timer immediately if already authenticated on load
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
    clearAllValidationBubbles('login-form'); // Clear previous bubbles

    if (!email) {
        showInputValidation('login-email', 'Please enter your email address');
        return { success: false, error: 'Email required' };
    }
    if (!password) {
        showInputValidation('login-password', 'Please enter your password');
        return { success: false, error: 'Password required' };
    }

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            if (error.message.includes('Invalid login credentials')) {
                showInputValidation('login-password', 'Invalid email or password.');
            } else if (error.message.includes('Email not confirmed')) {
                showInputValidation('login-email', 'Please verify your email before logging in.');
                // Optionally trigger OTP resend or redirect?
            } else {
                 showInputValidation('login-email', `Login failed: ${error.message}`);
            }
            throw error; // Let the caller know it failed
        }

        // Login successful - state updated via onAuthStateChange
        closeModal('login');
        // showMessage at top can be used for general success
        // showMessage('login', 'success', 'Login successful! Redirecting...');
        // Redirect handled by onAuthStateChange usually, or you can do it here:
        window.location.href = 'index.html'; // Redirect to index after login
        return { success: true, user: data.user };

    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: error.message };
    }
}


// Signup function - collects all data
async function handleSignup(userData) {
    // userData = { firstName, lastName, username, email, dateOfBirth, profession, password, confirmPassword }
    clearAllValidationBubbles('signup-form'); // Clear previous bubbles

    // --- Form Validation (with bubble messages) ---
    let isValid = true;
    if (!userData.firstName || userData.firstName.length < 2) {
        showInputValidation('signup-first-name', 'First name must be at least 2 characters'); isValid = false;
    }
    // lastName is optional
    if (!userData.email || !/\S+@\S+\.\S+/.test(userData.email)) {
        showInputValidation('signup-email', 'Please enter a valid email'); isValid = false;
    }
     if (!userData.dateOfBirth) {
         showInputValidation('signup-dob', 'Please select your date of birth'); isValid = false;
     }

    // Username format/length validation
    const usernameValidationResult = validateUsername(userData.username);
    if (!usernameValidationResult.valid) {
        showInputValidation('signup-username', usernameValidationResult.message); isValid = false;
    }

     if (!userData.profession || userData.profession.trim() === '') {
         // This validation might be better handled directly via the dropdown logic
         showMessage('signup', 'error', 'Please select or specify your profession.'); isValid = false;
         // Optionally add bubble to dropdown itself if possible
     }

    // Password validation
    if (!userData.password || userData.password.length < 8) {
        showInputValidation('signup-password', 'Password must be at least 8 characters'); isValid = false;
    } else {
        const hasUpper = /[A-Z]/.test(userData.password);
        const hasLower = /[a-z]/.test(userData.password);
        const hasNumber = /\d/.test(userData.password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(userData.password);
        if (!(hasUpper && hasLower && hasNumber && hasSpecial)) {
            showInputValidation('signup-password', 'Include uppercase, lowercase, number, and special character'); isValid = false;
        }
    }
    if (userData.password !== userData.confirmPassword) {
        showInputValidation('signup-confirm-password', 'Passwords do not match'); isValid = false;
    }

    if (!isValid) return { success: false, error: 'Validation failed' };

    // --- Username Uniqueness Check ---
    const isUsernameAvailable = await checkUsernameAvailability(userData.username);
    if (!isUsernameAvailable) {
        showInputValidation('signup-username', 'This username is already taken');
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
                    username: userData.username,
                    date_of_birth: userData.dateOfBirth,
                    profession: userData.profession
                }
            }
        });

        if (error) {
            if (error.message.includes('already registered')) {
                showInputValidation('signup-email', 'Email already registered. Try logging in.');
            } else if (error.message.includes('duplicate key value violates unique constraint') && error.message.includes('username')) {
                 showInputValidation('signup-username', 'This username is already taken.'); // Fallback check
            } else {
                showMessage('signup', 'error', `Signup failed: ${error.message}`);
            }
            throw error;
        }

        // Signup successful, waiting for OTP
        // Store user temporarily for OTP step (needed for resend)
        currentUser = data.user; // Store the user object from signup response
        pendingVerification = true; // Set OTP pending flag

        closeModal('signup');
        openModal('otp');
        showMessage('otp', 'success', `Verification email sent to ${userData.email}. Check your inbox/spam for the 6-digit code.`);

        return { success: true, user: data.user, needsVerification: !data.user.email_confirmed_at };

    } catch (error) {
        console.error('Signup error:', error);
        return { success: false, error: error.message };
    }
}


async function handleOTPVerification(otpCode) {
    clearMessages('otp'); // Clear previous OTP messages

    if (!currentUser || !currentUser.email) {
         showMessage('otp', 'error', 'User context lost. Please try signing up again.');
         closeModal('otp');
         openModal('signup');
         return { success: false, error: 'User context lost' };
    }
     if (!otpCode || otpCode.length !== 6 || !/^\d{6}$/.test(otpCode)) {
        showMessage('otp', 'error', 'Please enter a valid 6-digit code.');
        return { success: false, error: 'Invalid OTP format' };
    }


    try {
        const { data, error } = await supabaseClient.auth.verifyOtp({
            email: currentUser.email, // Use stored email
            token: otpCode,
            type: 'signup' // Must match the type used in signUp
        });

        if (error) {
            if (error.message.includes('Token has expired')) {
                showMessage('otp', 'error', 'Verification code has expired. Please resend.');
            } else if (error.message.includes('already verified')) {
                // This can happen if user clicks link AND enters code
                showMessage('otp', 'info', 'Your email is already verified. You can now log in.');
                 closeModal('otp');
                 openModal('login'); // Guide to login
                 // Update state as if successful
                 isAuthenticated = true; // Assume verification implies logged in state initially
                 pendingVerification = false;
                 // Fetch session to confirm state and get full user data
                 await checkAuthStatus();
                 return { success: true, user: currentUser };
            }
            else {
                showMessage('otp', 'error', `Verification failed: ${error.message}`);
            }
            throw error;
        }

        // OTP Verification successful
        // The onAuthStateChange listener should handle the SIGNED_IN event
        // but we can update state here too for immediate feedback
        isAuthenticated = true;
        currentUser = data.user || currentUser; // Update user object if returned
        pendingVerification = false;

        closeModal('otp');
        showMessage('signup', 'success', 'Email verified successfully! You are now logged in.'); // Show success on main page potentially
        // Redirect to index, which will update UI based on auth state
         window.location.href = 'index.html';

        // Fetch profile data including role after verification
        await fetchUserProfile();

        // Reset inactivity timer now that user is fully authenticated
        resetInactivityTimer();

        return { success: true, user: currentUser };

    } catch (error) {
        console.error('OTP verification error:', error);
         // Don't return false here, let the message show in OTP modal
        return { success: false, error: error.message };
    }
}


async function resendOTP() {
     clearMessages('otp');
    if (!currentUser || !currentUser.email) {
        showMessage('otp', 'error', 'Cannot resend code. User context lost. Please sign up again.');
        return { success: false, error: 'User context lost' };
    }

    try {
        // Use the appropriate resend method
        const { error } = await supabaseClient.auth.resend({
            type: 'signup', // Must match the type used for signup
            email: currentUser.email
        });

        if (error) {
            // Handle rate limiting errors specifically
             if (error.message.includes('rate limit')) {
                 showMessage('otp', 'error', 'Too many attempts. Please wait a minute before trying again.');
             } else {
                showMessage('otp', 'error', `Failed to resend code: ${error.message}`);
             }
            throw error;
        }

        showMessage('otp', 'success', 'Verification code resent! Please check your email.');
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
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
        alert(`Logout failed: ${error.message}`);
    }
}


// --- User Profile & Role ---
async function fetchUserProfile() {
    if (!currentUser || !isAuthenticated) {
        userProfileData = null;
        return null;
    }

    try {
        const { data, error, status } = await supabaseClient
            .from('user_profiles')
            .select('*') // Select all columns, including 'role'
            .eq('id', currentUser.id)
            .single(); // Expect only one row

        if (error && status !== 406) { // 406 means no rows found, which is okay if profile creation is pending
            throw error;
        }

        if (data) {
            userProfileData = data;
             // console.log("User profile fetched:", userProfileData); // Debug
            // Optionally update UI elements that depend on role immediately
             updateRoleSpecificUI(userProfileData.role);
            return userProfileData;
        } else {
             // Profile might not exist yet if trigger hasn't run or failed
             console.warn("User profile not found in database yet for ID:", currentUser.id);
             userProfileData = { id: currentUser.id, role: 'user' }; // Assume 'user' role if profile missing
             updateRoleSpecificUI('user'); // Update UI with default role
             return userProfileData;
        }
    } catch (error) {
        console.error('Error fetching user profile:', error);
        userProfileData = { id: currentUser.id, role: 'user' }; // Fallback to default role on error
        updateRoleSpecificUI('user'); // Update UI with default role
        return null;
    }
}

// Function to update UI elements based on role (example)
function updateRoleSpecificUI(role) {
    // This function will be called AFTER the profile is fetched
    // It should handle showing/hiding elements specific to roles
    // Example (to be implemented in dashboard.js or relevant page scripts):
    const adminPanelLink = document.getElementById('admin-panel-link'); // Example ID
    if (adminPanelLink) {
        adminPanelLink.style.display = (role === 'admin') ? 'block' : 'none';
    }
    const memberContent = document.querySelectorAll('.member-only'); // Example class
    memberContent.forEach(el => {
        el.style.display = (role === 'admin' || role === 'member') ? 'block' : 'none';
    });
     // console.log(`UI updated for role: ${role}`);
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


// Check availability against the database
async function checkUsernameAvailability(username) {
    if (!username) return false; // Cannot be available if empty
    const formatValidation = validateUsername(username);
    if (!formatValidation.valid) return false; // Invalid format cannot be available

    try {
        const { data, error } = await supabaseClient
            .from('user_profiles') // Check the profiles table
            .select('username')
            .eq('username', username) // Case-insensitive check handled by DB collation or ensure lowercase
            .limit(1);

        if (error) {
            console.error('Error checking username availability:', error);
            // Decide how to handle DB errors - assume taken? Or allow signup?
            // Returning false (taken) might be safer to prevent duplicates if DB fails
            return false;
        }

        // Return true (available) if data array is empty, false (taken) otherwise
        return data.length === 0;

    } catch (error) {
        console.error('Exception checking username availability:', error);
        return false; // Assume taken on exception
    }
}


// Generate suggestions (ensure lowercase)
function generateUsernameSuggestions(firstName, lastName, dob) {
    const suggestions = new Set(); // Use a Set to avoid duplicates
    const fn = firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const ln = lastName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const year = dob ? new Date(dob).getFullYear() : new Date().getFullYear();
    const shortYear = String(year).slice(-2);
    const fnInitial = fn.charAt(0);
    const lnInitial = ln.charAt(0);

    if (fn) {
        suggestions.add(fn); // Just first name
        if (ln) {
            suggestions.add(`${fn}${ln}`);
            suggestions.add(`${fn}_${ln}`);
            suggestions.add(`${fnInitial}${ln}`);
            suggestions.add(`${fn}${lnInitial}`);
             suggestions.add(`${fn}${shortYear}`);
             suggestions.add(`${fn}_${year}`);
             suggestions.add(`${fnInitial}${ln}${shortYear}`);
        } else {
             suggestions.add(`${fn}${year}`);
             suggestions.add(`${fn}_${shortYear}`);
        }
        // Add some random numbers
         suggestions.add(`${fn}${Math.floor(Math.random() * 99)}`);
         suggestions.add(`${fn}_${Math.floor(Math.random() * 999)}`);
    } else if (ln) {
        suggestions.add(ln);
        suggestions.add(`${ln}${year}`);
        suggestions.add(`${ln}_${shortYear}`);
        suggestions.add(`${ln}${Math.floor(Math.random() * 99)}`);
    }

    // Filter suggestions based on validation rules (length, format)
    const validSuggestions = [...suggestions].filter(s => validateUsername(s).valid);

    // Return top 3, or fewer if not enough valid ones generated
    return validSuggestions.slice(0, 3);
}

// Function to display suggestions and check their availability
async function showUsernameSuggestions() {
    const firstName = document.getElementById('signup-first-name').value.trim();
    const lastName = document.getElementById('signup-last-name').value.trim();
    const dob = document.getElementById('signup-dob').value;
    const suggestionsContainer = document.getElementById('username-suggestions');
    const suggestionItems = suggestionsContainer.querySelectorAll('.suggestion-item');

    if (firstName || lastName) {
        const suggestions = generateUsernameSuggestions(firstName, lastName, dob);

        // Clear previous states
        suggestionItems.forEach(item => {
            item.style.display = 'none';
            item.onclick = null; // Remove previous click listener
             const statusEl = item.querySelector('.suggestion-status');
             if(statusEl) statusEl.textContent = '';
        });

        if (suggestions.length > 0) {
            suggestionsContainer.classList.add('show');

            // Check availability for each suggestion
            suggestions.forEach(async (suggestion, index) => {
                if (suggestionItems[index]) {
                    const item = suggestionItems[index];
                    const textEl = item.querySelector('.suggestion-text');
                    const statusEl = item.querySelector('.suggestion-status');

                    textEl.textContent = suggestion;
                    item.dataset.suggestion = suggestion;
                    statusEl.textContent = 'Checking...';
                    statusEl.className = 'suggestion-status checking';
                    item.style.display = 'flex'; // Show the item

                    const isAvailable = await checkUsernameAvailability(suggestion);

                    // Update status based on availability check
                     // Check if suggestion is still the same (user might have changed name/dob)
                     if(item.dataset.suggestion === suggestion) {
                        statusEl.textContent = isAvailable ? 'Available' : 'Taken';
                        statusEl.className = `suggestion-status ${isAvailable ? 'available' : 'taken'}`;
                        if (isAvailable) {
                            // Make available suggestions clickable
                            item.onclick = () => {
                                const usernameInput = document.getElementById('signup-username');
                                usernameInput.value = suggestion;
                                usernameInput.dispatchEvent(new Event('input')); // Trigger input event for validation
                                suggestionsContainer.classList.remove('show');
                            };
                        } else {
                            item.onclick = null; // Not clickable if taken
                            item.style.cursor = 'not-allowed';
                             item.style.opacity = '0.7';
                        }
                     }
                }
            });
        } else {
            suggestionsContainer.classList.remove('show'); // Hide if no suggestions
        }

    } else {
        suggestionsContainer.classList.remove('show'); // Hide if no name entered
    }
}

// --- Auth UI Update ---
// Central function to update UI based on authentication state
function updateAuthUI() {
    const authButtons = document.getElementById('auth-buttons');
    const userProfile = document.getElementById('user-profile');
    const userAvatar = document.getElementById('user-avatar');

    if (isAuthenticated && currentUser) {
        if (authButtons) authButtons.style.display = 'none';
        if (userProfile) userProfile.style.display = 'flex'; // Show profile avatar

        if (userAvatar) {
            const firstName = userProfileData?.first_name || currentUser.user_metadata?.first_name || '';
            const lastName = userProfileData?.last_name || currentUser.user_metadata?.last_name || '';

            let avatarText = 'U'; // Default
            if (firstName && lastName) {
                avatarText = firstName.charAt(0).toUpperCase() + lastName.charAt(0).toUpperCase();
            } else if (firstName) {
                avatarText = firstName.charAt(0).toUpperCase();
            } else if (currentUser.email) {
                avatarText = currentUser.email.charAt(0).toUpperCase();
            }
            userAvatar.textContent = avatarText;
        }

    } else {
        // Not authenticated
        if (authButtons) authButtons.style.display = 'flex'; // Show Login/Signup
        if (userProfile) userProfile.style.display = 'none';

        // Clear inactivity timer when logged out
        if (inactivityTimer) {
            clearTimeout(inactivityTimer);
            inactivityTimer = null;
        }
        userProfileData = null; // Clear profile data
    }
}

// Redirect placeholder for profile/dashboard click
function redirectToProfile() {
    // In a multi-page setup, this should redirect
     window.location.href = 'dashboard.html';
    // alert(`Dashboard/Profile page coming soon!`);
}

// --- Initialization and Event Listeners ---

// Check initial auth status on page load
async function checkAuthStatus() {
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
    }
}


// Listen for Supabase auth state changes
supabaseClient.auth.onAuthStateChange(async (event, session) => {
    console.log("Auth event:", event, session); // Log events

    if (event === 'SIGNED_IN' && session) {
        isAuthenticated = true;
        currentUser = session.user;
        await fetchUserProfile(); // Fetch profile on sign in
        resetInactivityTimer(); // Start inactivity timer
        updateAuthUI();

         // Handle redirection if needed, e.g., after OTP verify direct to dashboard
         // if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
             // Optional: Redirect to dashboard immediately after SIGNED_IN on index page
             // window.location.href = 'dashboard.html';
         // }


    } else if (event === 'SIGNED_OUT') {
        isAuthenticated = false;
        currentUser = null;
        userProfileData = null;
        if (inactivityTimer) {
            clearTimeout(inactivityTimer);
            inactivityTimer = null;
        }
        localStorage.removeItem('lastActiveTime');
        updateAuthUI();

         // Redirect to index if logged out from a protected page like dashboard
         // if (window.location.pathname.includes('dashboard.html') || window.location.pathname.includes('admin-panel.html')) {
         //     window.location.href = 'index.html';
         // }

    } else if (event === 'USER_UPDATED') {
        // Handle user updates if necessary (e.g., email change)
        currentUser = session?.user || null;
        await fetchUserProfile(); // Re-fetch profile on update
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
    }
});


// Global logout function accessible from buttons/links
async function logout() {
    await handleLogout();
}


// --- Export functions for use in HTML pages ---
window.authFunctions = {
    handleLogin,
    handleSignup,
    handleOTPVerification,
    resendOTP,
    logout, // Make logout globally accessible
    checkAuthStatus, // For initial load check
    updateAuthUI,
    redirectToProfile,
    validateUsername,
    checkUsernameAvailability, // Make available for real-time checks
    showUsernameSuggestions,
    resetInactivityTimer, // Allow manual reset if needed
    fetchUserProfile, // To get profile data on dashboard etc.
    getUserRole: () => userProfileData?.role || 'user' // Function to get current user's role
};

// Perform initial check when script loads
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus(); // Check auth status after DOM is ready
});
