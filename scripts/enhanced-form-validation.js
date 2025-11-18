// Enhanced Form Validation System
class EnhancedFormValidation {
    constructor() {
        this.validationRules = {};
        this.customValidators = {};
        this.validationMessages = {};
        this.realTimeValidation = true;
        this.init();
    }

    init() {
        this.setupDefaultValidators();
        this.setupDefaultMessages();
        this.initializeFormValidation();
        this.setupGlobalValidation();
    }

    setupDefaultValidators() {
        this.customValidators = {
            // South African ID Number validation
            saIdNumber: (value) => {
                if (!value) return true; // Allow empty if not required
                const idRegex = /^(((\d{2}((0[13578]|1[02])(0[1-9]|[12]\d|3[01])|(0[13456789]|1[012])(0[1-9]|[12]\d|30)|02(0[1-9]|1\d|2[0-8])))|([02468][048]|[13579][26])0229))(( |-)(\d{4})( |-)(\d{3})|(\d{7}))/;
                return idRegex.test(value.replace(/\s/g, ''));
            },

            // South African phone number validation
            saPhoneNumber: (value) => {
                if (!value) return true;
                const phoneRegex = /^(\+27|0)[6-8][0-9]{8}$/;
                return phoneRegex.test(value.replace(/\s/g, ''));
            },

            // Strong password validation
            strongPassword: (value) => {
                if (!value) return true;
                const minLength = 8;
                const hasUpperCase = /[A-Z]/.test(value);
                const hasLowerCase = /[a-z]/.test(value);
                const hasNumbers = /\d/.test(value);
                const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);
                
                return value.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
            },

            // Age validation (minimum 16 years old)
            minimumAge: (value) => {
                if (!value) return true;
                const birthDate = new Date(value);
                const today = new Date();
                const age = today.getFullYear() - birthDate.getFullYear();
                const monthDiff = today.getMonth() - birthDate.getMonth();
                
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                }
                
                return age >= 16;
            },

            // File size validation (max 5MB)
            maxFileSize: (files) => {
                if (!files || files.length === 0) return true;
                const maxSize = 5 * 1024 * 1024; // 5MB
                return Array.from(files).every(file => file.size <= maxSize);
            },

            // File type validation
            allowedFileTypes: (files, allowedTypes = ['pdf', 'doc', 'docx']) => {
                if (!files || files.length === 0) return true;
                return Array.from(files).every(file => {
                    const extension = file.name.split('.').pop().toLowerCase();
                    return allowedTypes.includes(extension);
                });
            },

            // Salary range validation
            salaryRange: (value) => {
                if (!value) return true;
                const salary = parseFloat(value.replace(/[^0-9.]/g, ''));
                return salary >= 1000 && salary <= 1000000; // R1,000 to R1,000,000
            },

            // URL validation
            validUrl: (value) => {
                if (!value) return true;
                try {
                    new URL(value);
                    return true;
                } catch {
                    return false;
                }
            }
        };
    }

    setupDefaultMessages() {
        this.validationMessages = {
            required: 'This field is required',
            email: 'Please enter a valid email address',
            minLength: 'Minimum {min} characters required',
            maxLength: 'Maximum {max} characters allowed',
            pattern: 'Please enter a valid format',
            saIdNumber: 'Please enter a valid South African ID number',
            saPhoneNumber: 'Please enter a valid South African phone number (e.g., 0821234567)',
            strongPassword: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
            minimumAge: 'You must be at least 16 years old',
            maxFileSize: 'File size must not exceed 5MB',
            allowedFileTypes: 'Only PDF, DOC, and DOCX files are allowed',
            salaryRange: 'Salary must be between R1,000 and R1,000,000',
            validUrl: 'Please enter a valid URL',
            match: 'Fields do not match',
            min: 'Value must be at least {min}',
            max: 'Value must not exceed {max}'
        };
    }

    initializeFormValidation() {
        // Find all forms with validation
        const forms = document.querySelectorAll('form[data-validate], .form-validate');
        forms.forEach(form => this.enhanceForm(form));

        // Handle dynamic form additions
        this.observeFormAdditions();
    }

    enhanceForm(form) {
        const inputs = form.querySelectorAll('input, textarea, select');
        
        inputs.forEach(input => {
            this.enhanceInput(input);
        });

        // Add form submission validation
        form.addEventListener('submit', (e) => {
            if (!this.validateForm(form)) {
                e.preventDefault();
                this.focusFirstError(form);
            }
        });

        // Add form validation indicator
        this.addFormValidationIndicator(form);
    }

    enhanceInput(input) {
        // Skip if already enhanced
        if (input.hasAttribute('data-validation-enhanced')) return;
        
        input.setAttribute('data-validation-enhanced', 'true');

        // Create validation container
        const validationContainer = this.createValidationContainer(input);

        // Add real-time validation
        if (this.realTimeValidation) {
            input.addEventListener('blur', () => this.validateInput(input));
            input.addEventListener('input', () => this.debounceValidation(input, 500));
        }

        // Add input enhancements
        this.addInputEnhancements(input);
    }

    createValidationContainer(input) {
        const container = document.createElement('div');
        container.className = 'validation-feedback';
        container.setAttribute('data-for', input.name || input.id);
        
        // Insert after input or its parent wrapper
        const wrapper = input.closest('.form-group') || input.closest('.input-wrapper') || input.parentElement;
        wrapper.appendChild(container);
        
        return container;
    }

    addInputEnhancements(input) {
        const type = input.type || input.tagName.toLowerCase();
        
        switch (type) {
            case 'password':
                this.addPasswordStrengthIndicator(input);
                this.addPasswordToggle(input);
                break;
            case 'email':
                this.addEmailValidationIndicator(input);
                break;
            case 'tel':
                this.addPhoneFormatting(input);
                break;
            case 'file':
                this.addFileValidationInfo(input);
                break;
            case 'text':
                if (input.hasAttribute('data-sa-id')) {
                    this.addIdNumberFormatting(input);
                }
                break;
        }
    }

    addPasswordStrengthIndicator(input) {
        const strengthIndicator = document.createElement('div');
        strengthIndicator.className = 'password-strength-indicator';
        strengthIndicator.innerHTML = `
            <div class="strength-bars">
                <div class="strength-bar"></div>
                <div class="strength-bar"></div>
                <div class="strength-bar"></div>
                <div class="strength-bar"></div>
            </div>
            <div class="strength-text">Password strength: <span class="strength-level">Weak</span></div>
            <div class="strength-requirements">
                <small>
                    <span class="req-length">✗ At least 8 characters</span>
                    <span class="req-upper">✗ One uppercase letter</span>
                    <span class="req-lower">✗ One lowercase letter</span>
                    <span class="req-number">✗ One number</span>
                    <span class="req-special">✗ One special character</span>
                </small>
            </div>
        `;

        input.parentElement.appendChild(strengthIndicator);

        input.addEventListener('input', () => {
            this.updatePasswordStrength(input, strengthIndicator);
        });
    }

    updatePasswordStrength(input, indicator) {
        const password = input.value;
        const requirements = {
            length: password.length >= 8,
            upper: /[A-Z]/.test(password),
            lower: /[a-z]/.test(password),
            number: /\d/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };

        // Update requirement indicators
        Object.keys(requirements).forEach(req => {
            const element = indicator.querySelector(`.req-${req}`);
            if (element) {
                element.innerHTML = requirements[req] ? `✓ ${element.textContent.substr(2)}` : `✗ ${element.textContent.substr(2)}`;
                element.className = `req-${req} ${requirements[req] ? 'met' : 'unmet'}`;
            }
        });

        // Calculate strength
        const score = Object.values(requirements).filter(Boolean).length;
        const strengthLevels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
        const strengthLevel = strengthLevels[Math.min(score, 4)];

        // Update strength bars
        const bars = indicator.querySelectorAll('.strength-bar');
        bars.forEach((bar, index) => {
            bar.className = `strength-bar ${index < score ? 'active' : ''}`;
            if (index < score) {
                if (score <= 1) bar.classList.add('very-weak');
                else if (score <= 2) bar.classList.add('weak');
                else if (score <= 3) bar.classList.add('fair');
                else if (score <= 4) bar.classList.add('good');
                else bar.classList.add('strong');
            }
        });

        // Update strength text
        indicator.querySelector('.strength-level').textContent = strengthLevel;
    }

    addPasswordToggle(input) {
        const toggleButton = document.createElement('button');
        toggleButton.type = 'button';
        toggleButton.className = 'password-toggle';
        toggleButton.innerHTML = '👁️';
        toggleButton.setAttribute('aria-label', 'Toggle password visibility');

        // Position toggle button
        input.style.paddingRight = '40px';
        const wrapper = input.parentElement;
        wrapper.style.position = 'relative';
        wrapper.appendChild(toggleButton);

        toggleButton.addEventListener('click', () => {
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            toggleButton.innerHTML = isPassword ? '🙈' : '👁️';
            toggleButton.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
        });
    }

    addEmailValidationIndicator(input) {
        const indicator = document.createElement('span');
        indicator.className = 'email-validation-indicator';
        input.parentElement.appendChild(indicator);

        input.addEventListener('input', () => {
            const email = input.value;
            if (email) {
                const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
                indicator.textContent = isValid ? '✓' : '✗';
                indicator.className = `email-validation-indicator ${isValid ? 'valid' : 'invalid'}`;
            } else {
                indicator.textContent = '';
                indicator.className = 'email-validation-indicator';
            }
        });
    }

    addPhoneFormatting(input) {
        input.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            
            // Format as South African number
            if (value.length > 0) {
                if (value.startsWith('27')) {
                    value = '+' + value;
                } else if (value.startsWith('0')) {
                    value = value.replace(/^0/, '+27');
                } else if (!value.startsWith('+')) {
                    value = '+27' + value;
                }
            }
            
            e.target.value = value;
        });
    }

    addIdNumberFormatting(input) {
        input.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            
            // Format as YYYYMMDD XXXX XXX
            if (value.length > 8) {
                value = value.substring(0, 8) + ' ' + value.substring(8, 12) + ' ' + value.substring(12, 15);
            } else if (value.length > 4) {
                value = value.substring(0, 8) + ' ' + value.substring(8);
            }
            
            e.target.value = value;
        });
    }

    addFileValidationInfo(input) {
        const info = document.createElement('div');
        info.className = 'file-validation-info';
        info.innerHTML = `
            <small>
                📎 Max file size: 5MB<br>
                📄 Allowed types: PDF, DOC, DOCX
            </small>
        `;
        input.parentElement.appendChild(info);

        input.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files.length > 0) {
                this.validateFileInput(input, files);
            }
        });
    }

    validateInput(input) {
        const errors = [];
        const value = input.value;
        const rules = this.getValidationRules(input);

        // Required validation
        if (rules.required && (!value || value.trim() === '')) {
            errors.push(this.validationMessages.required);
        }

        // Skip other validations if empty and not required
        if (!value && !rules.required) {
            this.showValidationResult(input, true, []);
            return true;
        }

        // Built-in validations
        if (value) {
            // Email validation
            if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                errors.push(this.validationMessages.email);
            }

            // Length validations
            if (rules.minLength && value.length < rules.minLength) {
                errors.push(this.validationMessages.minLength.replace('{min}', rules.minLength));
            }
            if (rules.maxLength && value.length > rules.maxLength) {
                errors.push(this.validationMessages.maxLength.replace('{max}', rules.maxLength));
            }

            // Pattern validation
            if (rules.pattern && !rules.pattern.test(value)) {
                errors.push(this.validationMessages.pattern);
            }

            // Custom validations
            Object.keys(rules).forEach(rule => {
                if (this.customValidators[rule] && !this.customValidators[rule](value)) {
                    errors.push(this.validationMessages[rule] || `Invalid ${rule}`);
                }
            });
        }

        // File-specific validations
        if (input.type === 'file' && input.files.length > 0) {
            if (!this.customValidators.maxFileSize(input.files)) {
                errors.push(this.validationMessages.maxFileSize);
            }
            if (!this.customValidators.allowedFileTypes(input.files)) {
                errors.push(this.validationMessages.allowedFileTypes);
            }
        }

        // Confirmation field validation
        if (rules.confirmationFor) {
            const originalField = document.getElementById(rules.confirmationFor);
            if (originalField && value !== originalField.value) {
                errors.push(this.validationMessages.match);
            }
        }

        const isValid = errors.length === 0;
        this.showValidationResult(input, isValid, errors);
        return isValid;
    }

    getValidationRules(input) {
        const rules = {};

        // Get rules from data attributes
        if (input.hasAttribute('required')) rules.required = true;
        if (input.hasAttribute('data-min-length')) rules.minLength = parseInt(input.getAttribute('data-min-length'));
        if (input.hasAttribute('data-max-length')) rules.maxLength = parseInt(input.getAttribute('data-max-length'));
        if (input.hasAttribute('pattern')) rules.pattern = new RegExp(input.getAttribute('pattern'));
        if (input.hasAttribute('data-sa-id')) rules.saIdNumber = true;
        if (input.hasAttribute('data-sa-phone')) rules.saPhoneNumber = true;
        if (input.hasAttribute('data-strong-password')) rules.strongPassword = true;
        if (input.hasAttribute('data-min-age')) rules.minimumAge = true;
        if (input.hasAttribute('data-salary-range')) rules.salaryRange = true;
        if (input.hasAttribute('data-url')) rules.validUrl = true;
        if (input.hasAttribute('data-confirm')) rules.confirmationFor = input.getAttribute('data-confirm');

        return rules;
    }

    showValidationResult(input, isValid, errors) {
        const feedback = input.parentElement.querySelector('.validation-feedback');
        if (!feedback) return;

        // Update input styling
        input.classList.remove('valid', 'invalid');
        input.classList.add(isValid ? 'valid' : 'invalid');

        // Update feedback content
        if (isValid) {
            feedback.className = 'validation-feedback valid';
            feedback.innerHTML = '<span class="validation-success">✓</span>';
        } else {
            feedback.className = 'validation-feedback invalid';
            feedback.innerHTML = errors.map(error => 
                `<span class="validation-error">⚠️ ${error}</span>`
            ).join('');
        }

        // Update form validation indicator
        this.updateFormValidationIndicator(input.closest('form'));
    }

    validateForm(form) {
        const inputs = form.querySelectorAll('input, textarea, select');
        let isFormValid = true;

        inputs.forEach(input => {
            if (!this.validateInput(input)) {
                isFormValid = false;
            }
        });

        return isFormValid;
    }

    addFormValidationIndicator(form) {
        const indicator = document.createElement('div');
        indicator.className = 'form-validation-indicator';
        indicator.innerHTML = `
            <div class="validation-summary">
                <span class="validation-icon">📋</span>
                <span class="validation-text">Form validation status</span>
                <span class="validation-status">Pending</span>
            </div>
        `;

        // Insert at top of form
        form.insertBefore(indicator, form.firstChild);
    }

    updateFormValidationIndicator(form) {
        if (!form) return;

        const indicator = form.querySelector('.form-validation-indicator');
        if (!indicator) return;

        const inputs = form.querySelectorAll('input, textarea, select');
        const validInputs = form.querySelectorAll('input.valid, textarea.valid, select.valid');
        const invalidInputs = form.querySelectorAll('input.invalid, textarea.invalid, select.invalid');

        const statusElement = indicator.querySelector('.validation-status');
        const iconElement = indicator.querySelector('.validation-icon');

        if (invalidInputs.length > 0) {
            statusElement.textContent = `${invalidInputs.length} error(s)`;
            statusElement.className = 'validation-status invalid';
            iconElement.textContent = '❌';
        } else if (validInputs.length === inputs.length && inputs.length > 0) {
            statusElement.textContent = 'All fields valid';
            statusElement.className = 'validation-status valid';
            iconElement.textContent = '✅';
        } else {
            statusElement.textContent = 'Pending validation';
            statusElement.className = 'validation-status pending';
            iconElement.textContent = '📋';
        }
    }

    focusFirstError(form) {
        const firstInvalidInput = form.querySelector('.invalid');
        if (firstInvalidInput) {
            firstInvalidInput.focus();
            firstInvalidInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    debounceValidation(input, delay) {
        clearTimeout(input.validationTimeout);
        input.validationTimeout = setTimeout(() => {
            this.validateInput(input);
        }, delay);
    }

    observeFormAdditions() {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element node
                        // Check if the added node is a form
                        if (node.matches && node.matches('form[data-validate], .form-validate')) {
                            this.enhanceForm(node);
                        }
                        
                        // Check for forms within the added node
                        const forms = node.querySelectorAll && node.querySelectorAll('form[data-validate], .form-validate');
                        if (forms) {
                            forms.forEach(form => this.enhanceForm(form));
                        }
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    setupGlobalValidation() {
        // Add global form validation styles
        this.addValidationStyles();
        
        // Prevent form submission on Enter in invalid forms
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.form) {
                const form = e.target.form;
                if (form.hasAttribute('data-validate') && !this.validateForm(form)) {
                    e.preventDefault();
                }
            }
        });
    }

    addValidationStyles() {
        if (document.getElementById('enhanced-validation-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'enhanced-validation-styles';
        styles.textContent = `
            /* Enhanced validation will inject styles here if CSS file is not available */
        `;
        
        document.head.appendChild(styles);
    }
}

// Initialize enhanced form validation
const enhancedValidation = new EnhancedFormValidation();