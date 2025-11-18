document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registrationForm');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Reset messages
            errorMessage.style.display = 'none';
            successMessage.style.display = 'none';
            
            // Get form data
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            // Validate passwords match
            if (password !== confirmPassword) {
                errorMessage.textContent = 'Passwords do not match';
                errorMessage.style.display = 'block';
                return;
            }
            
            // Prepare registration data
            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                company_name: document.getElementById('company').value || null,
                password: password
            };
            
            try {
                // Disable submit button
                const submitButton = e.target.querySelector('button[type="submit"]');
                submitButton.disabled = true;
                
                // Call the registration API
                await window.api.auth.clientRegister(formData);
                
                // Show success message
                successMessage.textContent = 'Registration successful! Redirecting to login...';
                successMessage.style.display = 'block';
                
                // Redirect to login page after 2 seconds
                setTimeout(() => {
                    window.location.href = 'client_login.html';
                }, 2000);
                
            } catch (error) {
                errorMessage.textContent = error.message || 'Registration failed. Please try again.';
                errorMessage.style.display = 'block';
                submitButton.disabled = false;
            }
        });
    }
});