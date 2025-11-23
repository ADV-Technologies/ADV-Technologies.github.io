// js/common.js - Complete Version

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

function smoothScrollTo(target) {
    const element = document.querySelector(target);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function initializeScrollAnimations() {
    const observerOptions = { threshold: 0.15, rootMargin: '0px 0px -100px 0px' };
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

function initializeNavbarEffect() {
    const navbar = document.getElementById('navbar');
    const backToTop = document.getElementById('back-to-top');
    if (!navbar || !backToTop) return;

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
    handleScroll(); 
}

// --- Website Settings Application ---
async function applyWebsiteSettings() {
    if (!window.supabaseClient) return;
    
    try {
        const { data: settings, error } = await window.supabaseClient
            .from('website_settings')
            .select('setting_key, setting_value')
            .eq('is_public', true);
            
        if (error || !settings) return;

        const root = document.documentElement;

        settings.forEach(setting => {
            const key = setting.setting_key;
            const value = setting.setting_value;

            if (key === 'primary_color') {
                root.style.setProperty('--gold', value);
            }
            if (key === 'glassmorphism_opacity') {
                root.style.setProperty('--glass-bg', `rgba(255, 215, 0, ${value})`);
            }
            // Content Updates can be handled by finding elements with data attributes
            // e.g., data-setting="hero_text_1"
        });
        console.log("Website settings applied.");

    } catch (error) {
        console.error("Error applying settings:", error);
    }
}

// --- Modal Functions ---
function openModal(modalId) {
    const modalElement = document.getElementById(`${modalId}-modal`) || document.getElementById(modalId);
    if (modalElement) {
        modalElement.classList.add('active');
        clearMessages(modalId);
        document.body.style.overflow = 'hidden';
        const firstInput = modalElement.querySelector('input, button, select');
        if(firstInput) firstInput.focus();
    } else {
        console.error(`Modal element not found: ${modalId}`);
    }
}

function closeModal(modalId) {
    const modalElement = document.getElementById(`${modalId}-modal`) || document.getElementById(modalId);
    if (modalElement) {
        modalElement.classList.remove('active');
        clearMessages(modalId);
        document.body.style.overflow = 'auto'; 
    }
}

function switchModal(from, to) {
    closeModal(from);
    setTimeout(() => openModal(to), 300);
}

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

function showMessage(modalType, type, message) {
    const element = document.getElementById(`${modalType}-${type}`);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
        setTimeout(() => {
            if (element.style.display === 'block') { 
               element.style.display = 'none';
            }
        }, 5000);
    }
}


// --- Bubble Validation ---
function showInputValidation(inputId, message) {
    const validationElement = document.getElementById(`${inputId}-validation`);
    const inputElement = document.getElementById(inputId);
    if (validationElement && inputElement) {
        validationElement.textContent = message;
        validationElement.classList.add('show');
        inputElement.setAttribute('aria-invalid', 'true');
        setTimeout(() => {
            if(validationElement.classList.contains('show')) { 
                hideInputValidation(inputId);
            }
        }, 4000);
    }
}

function hideInputValidation(inputId) {
    const validationElement = document.getElementById(`${inputId}-validation`);
     const inputElement = document.getElementById(inputId);
    if (validationElement) {
        validationElement.classList.remove('show');
    }
    if(inputElement) {
        inputElement.removeAttribute('aria-invalid');
    }
}

function clearAllValidationBubbles(formId) {
    const form = document.getElementById(formId);
    if (form) {
        form.querySelectorAll('.input-validation').forEach(el => {
            el.classList.remove('show');
        });
        const modalType = formId.split('-')[0];
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
        } else {
            passwordInput.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }
}

// --- Custom Calendar ---
let currentCalendarDate = new Date();
let selectedDate = null;
let activeCalendarInputId = null; 

function toggleCalendar(inputId) {
    const calendarModal = document.getElementById(`${inputId}-calendar`);
    const isVisible = calendarModal.classList.contains('show');

    document.querySelectorAll('.calendar-modal, .profession-modal').forEach(modal => {
        if (modal.id !== `${inputId}-calendar`) {
            modal.classList.remove('show');
        }
    });
    document.querySelectorAll('.profession-dropdown').forEach(dd => dd.classList.remove('open'));

    if (!isVisible) {
        activeCalendarInputId = inputId;
        const input = document.getElementById(inputId);
        const currentDateValue = input.value ? new Date(input.value + 'T00:00:00') : new Date(); 
        
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
    yearSelect.innerHTML = '';
    const startYear = currentYear - 100;
    for (let year = startYear; year <= currentYear; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }
    yearSelect.value = currentCalendarDate.getFullYear();
    monthSelect.value = currentCalendarDate.getMonth();

    yearSelect.onchange = null;
    monthSelect.onchange = null;
    yearSelect.onchange = () => {
        currentCalendarDate.setFullYear(parseInt(yearSelect.value));
        renderCalendar(inputId);
    };
    monthSelect.onchange = () => {
        const targetMonth = parseInt(monthSelect.value);
        const currentDay = currentCalendarDate.getDate();
        const daysInTargetMonth = new Date(currentCalendarDate.getFullYear(), targetMonth + 1, 0).getDate();
        currentCalendarDate.setMonth(targetMonth);
        if(currentDay > daysInTargetMonth) {
            currentCalendarDate.setDate(daysInTargetMonth);
        } else {
            currentCalendarDate.setDate(currentDay);
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
    const existingDays = grid.querySelectorAll('.calendar-day');
    existingDays.forEach(day => day.remove());

    const firstDayOfMonth = new Date(year, month, 1);
    const firstDayWeekday = firstDayOfMonth.getDay(); 
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - firstDayWeekday);

    for (let i = 0; i < 42; i++) {
        const cellDate = new Date(startDate);
        cellDate.setDate(startDate.getDate() + i);
        cellDate.setHours(0,0,0,0); 

        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = cellDate.getDate();
        if (cellDate.getMonth() !== month) {
            dayElement.classList.add('other-month');
        } else {
             dayElement.onclick = () => selectDate(inputId, cellDate);
        }

        if (cellDate.getTime() === today.getTime()) {
            dayElement.classList.add('today');
        }

        if (selectedDate && cellDate.getTime() === selectedDate.getTime()) {
            dayElement.classList.add('selected');
        }
        grid.appendChild(dayElement);
    }
}

function selectDate(inputId, date) {
    selectedDate = new Date(date);
    selectedDate.setHours(0,0,0,0);
    const input = document.getElementById(inputId);
    const formattedDate = selectedDate.getFullYear() + '-' +
                         String(selectedDate.getMonth() + 1).padStart(2, '0') + '-' +
                         String(selectedDate.getDate()).padStart(2, '0');
    input.value = formattedDate;
    input.dispatchEvent(new Event('change'));
    renderCalendar(inputId);

    setTimeout(() => {
        document.getElementById(`${inputId}-calendar`).classList.remove('show');
        activeCalendarInputId = null;
    }, 150);
}

function previousMonth(inputId) { 
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    document.getElementById(`${inputId}-year`).value = currentCalendarDate.getFullYear();
    document.getElementById(`${inputId}-month`).value = currentCalendarDate.getMonth();
    renderCalendar(inputId);
}
function nextMonth(inputId) { 
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    document.getElementById(`${inputId}-year`).value = currentCalendarDate.getFullYear();
    document.getElementById(`${inputId}-month`).value = currentCalendarDate.getMonth();
    renderCalendar(inputId);
}

document.addEventListener('click', function(e) {
    if (activeCalendarInputId && !e.target.closest('.date-container') && !e.target.closest('.calendar-modal')) {
        const calendarModal = document.getElementById(`${activeCalendarInputId}-calendar`);
        if (calendarModal) calendarModal.classList.remove('show');
        activeCalendarInputId = null;
    }
});

// --- Custom Profession Dropdown ---
let selectedProfession = ''; 
let activeProfessionDropdown = false;

function toggleProfessionDropdown() {
    const modal = document.getElementById('profession-modal');
    const dropdown = document.getElementById('signup-profession');
    const isOpen = modal.classList.contains('show');
    
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
        const selectedEl = modal.querySelector('.selected');
        if(selectedEl) selectedEl.scrollIntoView({ block: 'nearest' });
    }
}

function selectProfession(value, text) {
    selectedProfession = value;
    document.getElementById('profession-display').textContent = text || 'Select your profession'; 

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

    document.querySelectorAll('#profession-modal .profession-option').forEach(option => {
        option.classList.remove('selected');
        if (option.getAttribute('data-value') === value) {
            option.classList.add('selected');
        }
    });

    setTimeout(() => { 
        document.getElementById('profession-modal').classList.remove('show');
        document.getElementById('signup-profession').classList.remove('open');
        activeProfessionDropdown = false;
    }, 150);
}

function getProfessionValue() {
    if (selectedProfession === 'Other') {
        return document.getElementById('signup-profession-custom').value.trim() || 'Other'; 
    }
    return selectedProfession;
}

function initializeProfessionDropdown() {
    document.querySelectorAll('#profession-modal .profession-option').forEach(option => {
        option.onclick = null;
        option.onclick = function() {
            const value = this.getAttribute('data-value');
            const text = this.textContent;
            selectProfession(value, text);
        };
    });
}

document.addEventListener('click', function(e) {
    if (activeProfessionDropdown && !e.target.closest('.profession-container') && !e.target.closest('.profession-modal')) {
        const modal = document.getElementById('profession-modal');
        if (modal) {
            modal.classList.remove('show');
            document.getElementById('signup-profession').classList.remove('open');
            activeProfessionDropdown = false;
        }
    }
});

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
    selectDate, 
    toggleProfessionDropdown,
    selectProfession, 
    getProfessionValue,
    initializeProfessionDropdown,
    debounce,
    applyWebsiteSettings 
};

document.addEventListener('DOMContentLoaded', () => {
    window.commonFunctions.initializeScrollAnimations();
    window.commonFunctions.initializeNavbarEffect();
    window.commonFunctions.initializeProfessionDropdown(); 
});
