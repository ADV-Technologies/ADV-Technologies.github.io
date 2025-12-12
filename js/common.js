// js/common.js

// --- Scroll & Animations ---
function initializeScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('visible');
        });
    }, { threshold: 0.1 });
    document.querySelectorAll('.section').forEach(s => observer.observe(s));
}

function smoothScrollTo(target) {
    const el = document.querySelector(target);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function initializeNavbarEffect() {
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) navbar?.classList.add('scrolled');
        else navbar?.classList.remove('scrolled');
    });
}

// --- Website Settings (Theme) ---
async function applyWebsiteSettings() {
    if (!window.supabaseClient) return;
    try {
        const { data: settings } = await window.supabaseClient
            .from('website_settings')
            .select('setting_key, setting_value');
            
        if (settings) {
            const root = document.documentElement;
            settings.forEach(s => {
                if (s.setting_key === 'primary_color') {
                    root.style.setProperty('--gold', s.setting_value);
                }
                if (s.setting_key === 'glassmorphism_opacity') {
                    // Update glass background with new opacity
                    // Assuming glass-bg is usually an rgba or similar variable
                    // This is a simplified approach; you might need to reconstruct the rgba string
                    // For now, we set a CSS variable that can be used
                    root.style.setProperty('--glass-opacity', s.setting_value);
                }
            });
        }
    } catch (e) {
        console.warn("Could not load settings:", e);
    }
}

// --- Modals ---
function openModal(id) {
    const m = document.getElementById(`${id}-modal`);
    if(m) m.classList.add('active');
}
function closeModal(id) {
    const m = document.getElementById(`${id}-modal`);
    if(m) m.classList.remove('active');
}

// Export
window.commonFunctions = {
    initializeScrollAnimations, smoothScrollTo, initializeNavbarEffect,
    applyWebsiteSettings, openModal, closeModal
};

// Auto-run basic visuals
document.addEventListener('DOMContentLoaded', () => {
    initializeScrollAnimations();
    initializeNavbarEffect();
    applyWebsiteSettings();
});
