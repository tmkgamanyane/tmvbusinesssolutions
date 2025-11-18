// Mobile Navigation and Responsive Menu JavaScript
// This handles hamburger menu functionality and responsive behavior

class MobileNavigation {
    constructor() {
        this.hamburger = null;
        this.nav = null;
        this.overlay = null;
        this.isMenuOpen = false;
        
        this.init();
    }
    
    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupElements());
        } else {
            this.setupElements();
        }
    }
    
    setupElements() {
        // Get DOM elements
        this.hamburger = document.getElementById('hamburgerMenu');
        this.nav = document.getElementById('navigationMenu') || document.querySelector('nav');
        this.overlay = document.getElementById('mobileOverlay');
        
        // Create overlay if it doesn't exist
        if (!this.overlay) {
            this.overlay = document.createElement('div');
            this.overlay.className = 'mobile-overlay';
            this.overlay.id = 'mobileOverlay';
            document.body.appendChild(this.overlay);
        }
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Handle initial screen size
        this.handleResize();
    }
    
    setupEventListeners() {
        // Hamburger menu click
        if (this.hamburger) {
            this.hamburger.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleMenu();
            });
        }
        
        // Overlay click to close menu
        if (this.overlay) {
            this.overlay.addEventListener('click', () => {
                this.closeMenu();
            });
        }
        
        // Close menu when clicking nav links (mobile)
        if (this.nav) {
            const navLinks = this.nav.querySelectorAll('a');
            navLinks.forEach(link => {
                link.addEventListener('click', () => {
                    if (window.innerWidth <= 768) {
                        this.closeMenu();
                    }
                });
            });
        }
        
        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());
        
        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isMenuOpen) {
                this.closeMenu();
            }
        });
        
        // Prevent body scroll when menu is open
        document.addEventListener('touchmove', (e) => {
            if (this.isMenuOpen && !this.nav.contains(e.target)) {
                e.preventDefault();
            }
        }, { passive: false });
    }
    
    toggleMenu() {
        if (this.isMenuOpen) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }
    
    openMenu() {
        if (!this.hamburger || !this.nav || !this.overlay) return;
        
        this.isMenuOpen = true;
        this.hamburger.classList.add('active');
        this.nav.classList.add('active');
        this.overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Focus management for accessibility
        this.nav.setAttribute('aria-hidden', 'false');
        const firstLink = this.nav.querySelector('a');
        if (firstLink) {
            firstLink.focus();
        }
    }
    
    closeMenu() {
        if (!this.hamburger || !this.nav || !this.overlay) return;
        
        this.isMenuOpen = false;
        this.hamburger.classList.remove('active');
        this.nav.classList.remove('active');
        this.overlay.classList.remove('active');
        document.body.style.overflow = '';
        
        // Focus management for accessibility
        this.nav.setAttribute('aria-hidden', 'true');
        this.hamburger.focus();
    }
    
    handleResize() {
        // Close mobile menu if window becomes large
        if (window.innerWidth > 768 && this.isMenuOpen) {
            this.closeMenu();
        }
        
        // Set appropriate aria attributes
        if (this.nav) {
            if (window.innerWidth <= 768) {
                this.nav.setAttribute('aria-hidden', this.isMenuOpen ? 'false' : 'true');
            } else {
                this.nav.removeAttribute('aria-hidden');
            }
        }
    }
}

// Enhanced Touch Gestures for Mobile
class TouchGestures {
    constructor() {
        this.startX = 0;
        this.startY = 0;
        this.nav = null;
        this.isEnabled = false;
        
        this.init();
    }
    
    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupGestures());
        } else {
            this.setupGestures();
        }
    }
    
    setupGestures() {
        this.nav = document.getElementById('navigationMenu');
        
        if (!this.nav) return;
        
        // Enable touch gestures only on mobile
        this.checkMobile();
        window.addEventListener('resize', () => this.checkMobile());
        
        // Touch events
        document.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        document.addEventListener('touchend', (e) => this.handleTouchEnd(e));
    }
    
    checkMobile() {
        this.isEnabled = window.innerWidth <= 768;
    }
    
    handleTouchStart(e) {
        if (!this.isEnabled) return;
        
        this.startX = e.touches[0].clientX;
        this.startY = e.touches[0].clientY;
    }
    
    handleTouchEnd(e) {
        if (!this.isEnabled || !this.startX || !this.startY) return;
        
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        
        const deltaX = endX - this.startX;
        const deltaY = endY - this.startY;
        
        // Check if it's a horizontal swipe (more horizontal than vertical)
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
            if (deltaX > 0 && this.startX < 50) {
                // Swipe right from left edge - open menu
                if (window.mobileNav && !window.mobileNav.isMenuOpen) {
                    window.mobileNav.openMenu();
                }
            } else if (deltaX < 0 && window.mobileNav && window.mobileNav.isMenuOpen) {
                // Swipe left - close menu
                window.mobileNav.closeMenu();
            }
        }
        
        // Reset
        this.startX = 0;
        this.startY = 0;
    }
}

// Responsive Image Loading
class ResponsiveImages {
    constructor() {
        this.init();
    }
    
    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupImages());
        } else {
            this.setupImages();
        }
    }
    
    setupImages() {
        const images = document.querySelectorAll('img');
        
        images.forEach(img => {
            // Add responsive class if not present
            if (!img.classList.contains('responsive-img')) {
                img.classList.add('responsive-img');
            }
            
            // Handle loading states
            img.addEventListener('load', () => {
                img.classList.add('loaded');
            });
            
            img.addEventListener('error', () => {
                img.classList.add('error');
                console.warn('Failed to load image:', img.src);
            });
        });
    }
}

// Form Enhancement for Mobile
class MobileFormEnhancement {
    constructor() {
        this.init();
    }
    
    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.enhanceForms());
        } else {
            this.enhanceForms();
        }
    }
    
    enhanceForms() {
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            this.enhanceFormInputs(form);
            this.addFormValidation(form);
        });
    }
    
    enhanceFormInputs(form) {
        const inputs = form.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            // Add mobile-friendly attributes
            if (input.type === 'email') {
                input.setAttribute('autocomplete', 'email');
                input.setAttribute('inputmode', 'email');
            } else if (input.type === 'tel') {
                input.setAttribute('autocomplete', 'tel');
                input.setAttribute('inputmode', 'tel');
            } else if (input.type === 'number') {
                input.setAttribute('inputmode', 'numeric');
            }
            
            // Prevent zoom on iOS
            if (window.innerWidth <= 768) {
                input.addEventListener('focus', () => {
                    input.style.fontSize = '16px';
                });
            }
        });
    }
    
    addFormValidation(form) {
        form.addEventListener('submit', (e) => {
            if (!this.validateForm(form)) {
                e.preventDefault();
                this.showValidationErrors(form);
            }
        });
    }
    
    validateForm(form) {
        const requiredInputs = form.querySelectorAll('[required]');
        let isValid = true;
        
        requiredInputs.forEach(input => {
            if (!input.value.trim()) {
                input.classList.add('error');
                isValid = false;
            } else {
                input.classList.remove('error');
            }
        });
        
        return isValid;
    }
    
    showValidationErrors(form) {
        const firstError = form.querySelector('.error');
        if (firstError) {
            firstError.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
            firstError.focus();
        }
    }
}

// Initialize all mobile features
function initializeMobileFeatures() {
    // Create global instances
    window.mobileNav = new MobileNavigation();
    window.touchGestures = new TouchGestures();
    window.responsiveImages = new ResponsiveImages();
    window.mobileFormEnhancement = new MobileFormEnhancement();
    
    console.log('✅ Mobile responsive features initialized');
}

// Auto-initialize when script loads
initializeMobileFeatures();

// Export for manual initialization if needed
window.MobileNavigation = MobileNavigation;
window.TouchGestures = TouchGestures;
window.ResponsiveImages = ResponsiveImages;
window.MobileFormEnhancement = MobileFormEnhancement;