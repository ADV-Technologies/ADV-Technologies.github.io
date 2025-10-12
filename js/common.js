// Shared utilities for ADV Technologies

// Smooth scroll function
function smoothScrollTo(target) {
    const element = document.querySelector(target);
    if (element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Show input validation bubble
function showInputValidation(inputId, message) {
    const validationElement = document.getElementById(`${inputId}-validation`);
    if (validationElement) {
        validationElement.textContent = message;
        validationElement.classList.add('show');
        
        setTimeout(() => {
            validationElement.classList.remove('show');
        }, 4000);
    }
}

// Hide input validation bubble
function hideInputValidation(inputId) {
    const validationElement = document.getElementById(`${inputId}-validation`);
    if (validationElement) {
        validationElement.classList.remove('show');
    }
}

// Show message in element
function showMessage(elementId, message, type = 'info') {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.className = type === 'error' ? 'error-message' : 'success-message';
        element.style.display = 'block';
        
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }
}

// Password visibility toggle
function togglePassword(inputId, button) {
    const passwordInput = document.getElementById(inputId);
    const icon = button.querySelector('i');
    
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

// Custom calendar functions
let currentCalendarDate = new Date();
let selectedDate = null;
let activeCalendar = null;

function toggleCalendar(inputId) {
    const calendarModal = document.getElementById(`${inputId}-calendar`);
    const isVisible = calendarModal.classList.contains('show');

    // Close all calendars first
    document.querySelectorAll('.calendar-modal').forEach(modal => {
        modal.classList.remove('show');
    });

    if (!isVisible) {
        activeCalendar = inputId;
        const input = document.getElementById(inputId);
        
        if (input.value) {
            currentCalendarDate = new Date(input.value);
            selectedDate = new Date(input.value);
        } else {
            currentCalendarDate = new Date();
            selectedDate = null;
        }
        
        initializeCalendar(inputId);
        calendarModal.classList.add('show');
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
        if (year === currentCalendarDate.getFullYear()) {
            option.selected = true;
        }
        yearSelect.appendChild(option);
    }

    monthSelect.value = currentCalendarDate.getMonth();

    yearSelect.onchange = () => {
        currentCalendarDate.setFullYear(parseInt(yearSelect.value));
        renderCalendar(inputId);
    };

    monthSelect.onchange = () => {
        currentCalendarDate.setMonth(parseInt(monthSelect.value));
        renderCalendar(inputId);
    };

    renderCalendar(inputId);
}

function renderCalendar(inputId) {
    const grid = document.getElementById(`${inputId}-grid`);
    const title = document.getElementById(`${inputId}-title`);
    
    const monthNames = ["January", "February", "March", "April", "May", "June",
                       "July", "August", "September", "October", "November", "December"];
    
    title.textContent = `${monthNames[currentCalendarDate.getMonth()]} ${currentCalendarDate.getFullYear()}`;

    const existingDays = grid.querySelectorAll('.calendar-day');
    existingDays.forEach(day => day.remove());

    const firstDay = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 1);
    const lastDay = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const today = new Date();

    for (let i = 0; i < 42; i++) {
        const cellDate = new Date(startDate);
        cellDate.setDate(startDate.getDate() + i);

        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = cellDate.getDate();

        if (cellDate.getMonth() !== currentCalendarDate.getMonth()) {
            dayElement.classList.add('other-month');
        }

        if (cellDate.toDateString() === today.toDateString()) {
            dayElement.classList.add('today');
        }

        if (selectedDate && cellDate.toDateString() === selectedDate.toDateString()) {
            dayElement.classList.add('selected');
        }

        dayElement.onclick = () => selectDate(inputId, cellDate);
        grid.appendChild(dayElement);
    }
}

function selectDate(inputId, date) {
    selectedDate = new Date(date);
    const input = document.getElementById(inputId);
    
    const formattedDate = date.getFullYear() + '-' +
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0');
    
    input.value = formattedDate;
    renderCalendar(inputId);
    
    setTimeout(() => {
        document.getElementById(`${inputId}-calendar`).classList.remove('show');
    }, 200);
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

// Custom profession dropdown
let selectedProfession = '';

function toggleProfessionDropdown() {
    const modal = document.getElementById('profession-modal');
    const dropdown = document.getElementById('signup-profession');
    const isVisible = modal.classList.contains('show');

    if (isVisible) {
        modal.classList.remove('show');
        dropdown.classList.remove('open');
    } else {
        document.querySelectorAll('.calendar-modal').forEach(cal => cal.classList.remove('show'));
        modal.classList.add('show');
        dropdown.classList.add('open');
    }
}

function selectProfession(value, text) {
    selectedProfession = value;
    document.getElementById('profession-display').textContent = text;
    document.getElementById('profession-modal').classList.remove('show');
    document.getElementById('signup-profession').classList.remove('open');

    const customField = document.getElementById('profession-custom');
    if (value === 'Other') {
        customField.classList.add('show');
        document.getElementById('signup-profession-custom').required = true;
    } else {
        customField.classList.remove('show');
        document.getElementById('signup-profession-custom').required = false;
        document.getElementById('signup-profession-custom').value = '';
    }

    document.querySelectorAll('.profession-option').forEach(option => {
        option.classList.remove('selected');
    });
    document.querySelector(`[data-value="${value}"]`).classList.add('selected');
}

function getProfessionValue() {
    if (selectedProfession === 'Other') {
        return document.getElementById('signup-profession-custom').value || '';
    }
    return selectedProfession;
}

// Close modals when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('.date-container') && !e.target.closest('.calendar-modal')) {
        document.querySelectorAll('.calendar-modal').forEach(modal => {
            modal.classList.remove('show');
        });
    }
    
    if (!e.target.closest('.profession-container') && !e.target.closest('.profession-modal')) {
        const modal = document.getElementById('profession-modal');
        const dropdown = document.getElementById('signup-profession');
        if (modal) modal.classList.remove('show');
        if (dropdown) dropdown.classList.remove('open');
    }
});

// Typing animation
function typeWriter(element, text, speed = 50, callback) {
    let i = 0;
    element.innerHTML = '';
    element.classList.add('glow');
    
    function type() {
        if (i < text.length) {
            element.innerHTML = text.substring(0, i + 1) + '<span class="typing-cursor">|</span>';
            i++;
            setTimeout(type, speed);
        } else {
            setTimeout(() => {
                element.innerHTML = text;
                if (callback) callback();
            }, 600);
        }
    }
    type();
}

// Scroll observer for animations
function initScrollAnimations() {
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

// Navbar scroll effect
function initNavbarScroll() {
    window.addEventListener('scroll', () => {
        const navbar = document.getElementById('navbar');
        const backToTop = document.getElementById('back-to-top');
        
        if (window.scrollY > 100) {
            if (navbar) navbar.classList.add('scrolled');
            if (backToTop) backToTop.classList.add('visible');
        } else {
            if (navbar) navbar.classList.remove('scrolled');
            if (backToTop) backToTop.classList.remove('visible');
        }
    });
}

// Export functions to window
window.commonFunctions = {
    smoothScrollTo,
    showInputValidation,
    hideInputValidation,
    showMessage,
    togglePassword,
    toggleCalendar,
    previousMonth,
    nextMonth,
    toggleProfessionDropdown,
    selectProfession,
    getProfessionValue,
    typeWriter,
    initScrollAnimations,
    initNavbarScroll
};
