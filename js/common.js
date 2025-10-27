// js/common.js

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}


// Smooth scrolling
function smoothScrollTo(target) {
    const element = document.querySelector(target);
    if (element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    } else {
        console.warn(`Smooth scroll target "${target}" not found.`);
    }
}

// Scroll animations for sections
function initializeScrollAnimations() {
    const observerOptions = {
        threshold: 0.15,
        rootMargin: '0px 0px -100px 0px'
    };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.section').forEach(section => {
        observer.observe(section);
    });
}

// Navbar scroll effect and Back-to-Top visibility
function initializeNavbarEffect() {
    const navbar = document.getElementById('navbar');
    const backToTop = document.getElementById('back-to-top');

    if (!navbar || !backToTop) return; // Exit if elements not found

    const handleScroll = () => {
        if (window.scrollY > 100) {
            navbar.classList.add('scrolled');
            backToTop.classList.add('visible');
        } else {
            navbar.classList.remove('scrolled');
            backToTop.classList.remove('visible');
        }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check
}


// --- Modal Functions ---
let pendingVerification = false; // Global flag for OTP state

function openModal(modalType) {
    const modalElement = document.getElementById(`${modalType}-modal`);
    if (modalElement) {
        modalElement.classList.add('active');
        clearMessages(modalType); // Clear previous messages
        document.body.style.overflow = 'hidden'; // Prevent background scroll
        // Optional: Add focus trap initialization here if needed
        const firstInput = modalElement.querySelector('input, button, select');
        if(firstInput) firstInput.focus();
    } else {
        console.error(`Modal element not found for type: ${modalType}`);
    }
}

function closeModal(modalType) {
    // Prevent closing OTP modal if verification is pending
    if (modalType === 'otp' && pendingVerification) {
        showMessage('otp', 'error', 'Please verify your email before closing.');
        return;
    }

    const modalElement = document.getElementById(`${modalType}-modal`);
    if (modalElement) {
        modalElement.classList.remove('active');
        clearMessages(modalType);
        document.body.style.overflow = 'auto'; // Restore background scroll

        // Reset OTP pending state if closing login/signup
        if (modalType === 'login' || modalType === 'signup') {
            pendingVerification = false;
        }
    } else {
        console.error(`Modal element not found for type: ${modalType}`);
    }
}

function switchModal(from, to) {
    closeModal(from);
    // Short delay to allow closing animation
    setTimeout(() => openModal(to), 300);
}

// Clear general error/success messages at top of modal
function clearMessages(modalType) {
    const errorElement = document.getElementById(`${modalType}-error`);
    const successElement = document.getElementById(`${modalType}-success`);
    if (errorElement) {
        errorElement.style.display = 'none';
        errorElement.textContent = '';
    }
    if (successElement) {
        successElement.style.display = 'none';
        successElement.textContent = '';
    }
}

// Show general error/success messages at top of modal
function showMessage(modalType, type, message) {
    const element = document.getElementById(`${modalType}-${type}`); // type is 'error' or 'success'
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (element.style.display === 'block') { // Check if still visible
               element.style.display = 'none';
            }
        }, 5000);
    } else {
         console.warn(`Message element not found for ${modalType}-${type}`);
    }
}


// --- Bubble Validation ---
// Show bubble validation message below an input
function showInputValidation(inputId, message) {
    const validationElement = document.getElementById(`${inputId}-validation`);
    const inputElement = document.getElementById(inputId);
    if (validationElement && inputElement) {
        validationElement.textContent = message;
        validationElement.classList.add('show');
        inputElement.setAttribute('aria-invalid', 'true');
        inputElement.setAttribute('aria-describedby', `${inputId}-validation`);

        // Auto-hide after 4 seconds
        setTimeout(() => {
            if(validationElement.classList.contains('show')) { // Check if still shown
                hideInputValidation(inputId);
            }
        }, 4000);
    } else {
         console.warn(`Validation element or input not found for ID: ${inputId}`);
    }
}

// Hide bubble validation message
function hideInputValidation(inputId) {
    const validationElement = document.getElementById(`${inputId}-validation`);
     const inputElement = document.getElementById(inputId);
    if (validationElement) {
        validationElement.classList.remove('show');
    }
    if(inputElement) {
        inputElement.removeAttribute('aria-invalid');
        inputElement.removeAttribute('aria-describedby');
    }
}

// Clear all bubble validations within a form
function clearAllValidationBubbles(formId) {
    const form = document.getElementById(formId);
    if (form) {
        form.querySelectorAll('.input-validation').forEach(el => {
            el.classList.remove('show');
            const inputId = el.id.replace('-validation', '');
            const inputElement = document.getElementById(inputId);
             if(inputElement) {
                inputElement.removeAttribute('aria-invalid');
                inputElement.removeAttribute('aria-describedby');
            }
        });
        // Also clear general messages
        const modalType = formId.split('-')[0]; // login or signup or otp
        clearMessages(modalType);
    }
}


// --- Password Toggle ---
function togglePassword(inputId, button) {
    const passwordInput = document.getElementById(inputId);
    const icon = button.querySelector('i');
    if (passwordInput && icon) {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
            button.setAttribute('aria-label', 'Hide password');
        } else {
            passwordInput.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
             button.setAttribute('aria-label', 'Show password');
        }
    }
}

// --- Custom Calendar ---
let currentCalendarDate = new Date();
let selectedDate = null;
let activeCalendarInputId = null; // Track which input's calendar is open

function toggleCalendar(inputId) {
    const calendarModal = document.getElementById(`${inputId}-calendar`);
    const isVisible = calendarModal.classList.contains('show');

    // Close all other calendars/dropdowns first
    document.querySelectorAll('.calendar-modal, .profession-modal').forEach(modal => {
        if (modal.id !== `${inputId}-calendar`) {
            modal.classList.remove('show');
        }
    });
     document.querySelectorAll('.profession-dropdown').forEach(dd => dd.classList.remove('open'));


    if (!isVisible) {
        activeCalendarInputId = inputId;
        const input = document.getElementById(inputId);
        // Try parsing current value, default to today if invalid or empty
        const currentDateValue = input.value ? new Date(input.value + 'T00:00:00') : new Date(); // Add time to avoid timezone issues
        if (!isNaN(currentDateValue)) {
            currentCalendarDate = currentDateValue;
            selectedDate = currentDateValue;
        } else {
            currentCalendarDate = new Date();
            selectedDate = null;
        }

        initializeCalendar(inputId);
        calendarModal.classList.add('show');
    } else {
        calendarModal.classList.remove('show');
        activeCalendarInputId = null;
    }
}

function initializeCalendar(inputId) {
    const currentYear = new Date().getFullYear();
    const yearSelect = document.getElementById(`${inputId}-year`);
    const monthSelect = document.getElementById(`${inputId}-month`);

    // Populate year selector (Current Year - 100 to Current Year)
    yearSelect.innerHTML = '';
    const startYear = currentYear - 100;
    for (let year = startYear; year <= currentYear; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }
    // Set selected year/month
    yearSelect.value = currentCalendarDate.getFullYear();
    monthSelect.value = currentCalendarDate.getMonth();

    // Remove previous listeners before adding new ones
    yearSelect.onchange = null;
    monthSelect.onchange = null;

    yearSelect.onchange = () => {
        currentCalendarDate.setFullYear(parseInt(yearSelect.value));
        renderCalendar(inputId);
    };
    monthSelect.onchange = () => {
        // Handle month change carefully, considering day differences
        const targetMonth = parseInt(monthSelect.value);
        const currentDay = currentCalendarDate.getDate();
        // Check days in target month
        const daysInTargetMonth = new Date(currentCalendarDate.getFullYear(), targetMonth + 1, 0).getDate();

        currentCalendarDate.setMonth(targetMonth);
        // Adjust day if it exceeds the new month's length
        if(currentDay > daysInTargetMonth) {
            currentCalendarDate.setDate(daysInTargetMonth);
        } else {
            currentCalendarDate.setDate(currentDay); // Keep original day if possible
        }

        renderCalendar(inputId);
    };

    renderCalendar(inputId);
}


function renderCalendar(inputId) {
    const grid = document.getElementById(`${inputId}-grid`);
    const title = document.getElementById(`${inputId}-title`);
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    title.textContent = `${monthNames[month]} ${year}`;

    // Clear existing days (keep headers)
    const existingDays = grid.querySelectorAll('.calendar-day');
    existingDays.forEach(day => day.remove());

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const firstDayWeekday = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today's date

    // Calculate start date for the grid (previous month's days)
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - firstDayWeekday);

    // Generate 42 cells (6 weeks)
    for (let i = 0; i < 42; i++) {
        const cellDate = new Date(startDate);
        cellDate.setDate(startDate.getDate() + i);
        cellDate.setHours(0,0,0,0); // Normalize cell date

        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = cellDate.getDate();
        dayElement.setAttribute('role', 'button');
        dayElement.setAttribute('tabindex', '-1');
        dayElement.setAttribute('aria-label', cellDate.toDateString());


        if (cellDate.getMonth() !== month) {
            dayElement.classList.add('other-month');
            dayElement.setAttribute('aria-disabled', 'true');
        } else {
            // Only add click listener for days in the current month
             dayElement.onclick = () => selectDate(inputId, cellDate);
             dayElement.setAttribute('tabindex', '0');
        }

        if (cellDate.getTime() === today.getTime()) {
            dayElement.classList.add('today');
             dayElement.setAttribute('aria-current', 'date');
        }

        if (selectedDate && cellDate.getTime() === selectedDate.getTime()) {
            dayElement.classList.add('selected');
             dayElement.setAttribute('aria-selected', 'true');
        }
        grid.appendChild(dayElement);
    }
}

function selectDate(inputId, date) {
    selectedDate = new Date(date);
    selectedDate.setHours(0,0,0,0); // Normalize selected date
    const input = document.getElementById(inputId);

    // Format YYYY-MM-DD
    const formattedDate = selectedDate.getFullYear() + '-' +
                         String(selectedDate.getMonth() + 1).padStart(2, '0') + '-' +
                         String(selectedDate.getDate()).padStart(2, '0');

    input.value = formattedDate;
    // Trigger change event for validation or other listeners
    input.dispatchEvent(new Event('change'));

    // Re-render to show selection
    renderCalendar(inputId);

    // Close calendar after selection
    setTimeout(() => {
        document.getElementById(`${inputId}-calendar`).classList.remove('show');
        activeCalendarInputId = null;
    }, 150); // Shorter delay
}

function navigateMonth(inputId, direction) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + direction);
    // Update selects to match the new date
    document.getElementById(`${inputId}-year`).value = currentCalendarDate.getFullYear();
    document.getElementById(`${inputId}-month`).value = currentCalendarDate.getMonth();
    renderCalendar(inputId);
}

function previousMonth(inputId) { navigateMonth(inputId, -1); }
function nextMonth(inputId) { navigateMonth(inputId, 1); }

// Close calendar when clicking outside
document.addEventListener('click', function(e) {
    if (activeCalendarInputId && !e.target.closest('.date-container') && !e.target.closest('.calendar-modal')) {
        const calendarModal = document.getElementById(`${activeCalendarInputId}-calendar`);
        if (calendarModal) calendarModal.classList.remove('show');
        activeCalendarInputId = null;
    }
});


// --- Custom Profession Dropdown ---
let selectedProfession = ''; // Store the value
let activeProfessionDropdown = false;

function toggleProfessionDropdown() {
    const modal = document.getElementById('profession-modal');
    const dropdown = document.getElementById('signup-profession'); // This is the styled div
    const isOpen = modal.classList.contains('show');

     // Close all other dropdowns/calendars first
    document.querySelectorAll('.calendar-modal, .profession-modal').forEach(m => {
        if (m.id !== 'profession-modal') m.classList.remove('show');
    });

    if (isOpen) {
        modal.classList.remove('show');
        dropdown.classList.remove('open');
        activeProfessionDropdown = false;
    } else {
        modal.classList.add('show');
        dropdown.classList.add('open');
        activeProfessionDropdown = true;
        // Scroll to selected option if exists
        const selectedEl = modal.querySelector('.selected');
        if(selectedEl) selectedEl.scrollIntoView({ block: 'nearest' });
    }
}

function selectProfession(value, text) {
    selectedProfession = value;
    document.getElementById('profession-display').textContent = text || 'Select your profession'; // Display text

    // Handle "Other" option visibility
    const customFieldContainer = document.getElementById('profession-custom');
    const customInput = document.getElementById('signup-profession-custom');
    if (value === 'Other') {
        customFieldContainer.classList.add('show');
        customInput.required = true;
        customInput.focus();
    } else {
        customFieldContainer.classList.remove('show');
        customInput.required = false;
        customInput.value = '';
    }

    // Update visual selection state
    document.querySelectorAll('#profession-modal .profession-option').forEach(option => {
        option.classList.remove('selected');
        if (option.getAttribute('data-value') === value) {
            option.classList.add('selected');
        }
    });

    // Close dropdown
    setTimeout(() => { // Short delay allows visual feedback
        document.getElementById('profession-modal').classList.remove('show');
        document.getElementById('signup-profession').classList.remove('open');
        activeProfessionDropdown = false;
    }, 150);
}

// Get the actual profession value (handles 'Other')
function getProfessionValue() {
    if (selectedProfession === 'Other') {
        return document.getElementById('signup-profession-custom').value.trim() || 'Other'; // Return 'Other' if custom is empty
    }
    return selectedProfession;
}

// Initialize profession options listeners
function initializeProfessionDropdown() {
    document.querySelectorAll('#profession-modal .profession-option').forEach(option => {
        // Remove previous listener if any
        option.onclick = null;
        option.onclick = function() {
            const value = this.getAttribute('data-value');
            const text = this.textContent;
            selectProfession(value, text);
        };
    });
}

// Close profession dropdown when clicking outside
document.addEventListener('click', function(e) {
    if (activeProfessionDropdown && !e.target.closest('.profession-container') && !e.target.closest('.profession-modal')) {
        document.getElementById('profession-modal').classList.remove('show');
        document.getElementById('signup-profession').classList.remove('open');
        activeProfessionDropdown = false;
    }
});


// Export functions to global scope or use modules if preferred
window.commonFunctions = {
    smoothScrollTo,
    initializeScrollAnimations,
    initializeNavbarEffect,
    openModal,
    closeModal,
    switchModal,
    showMessage,
    clearMessages,
    showInputValidation,
    hideInputValidation,
    clearAllValidationBubbles,
    togglePassword,
    toggleCalendar,
    previousMonth,
    nextMonth,
    selectDate, // Exposed for direct calls if needed, but usually internal
    toggleProfessionDropdown,
    selectProfession, // Exposed for direct calls if needed
    getProfessionValue,
    initializeProfessionDropdown,
    debounce
};

// Initialize common features on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    window.commonFunctions.initializeScrollAnimations();
    window.commonFunctions.initializeNavbarEffect();
    window.commonFunctions.initializeProfessionDropdown(); // Initialize options
    // Add any other initializations needed across pages
});
