    
    //Start of Other Cart Scripts//
    // Variables to store state
    let selectedServices = [];
    let cartItems = [];
    let totalAmount = 0;
    let selectedPaymentMethod = null;
    
    // DOM Elements
    const serviceCheckboxes = document.querySelectorAll('.service-checkbox');
    const totalAmountElement = document.getElementById('totalAmount');
    const addToCartBtn = document.getElementById('addToCartBtn');
    const payBtn = document.getElementById('payBtn');
    const cartSummary = document.getElementById('cartSummary');
    const cartItemsContainer = document.getElementById('cartItems');
    const cartTotalElement = document.getElementById('cartTotal');
    const notification = document.getElementById('notification');
    const paymentModal = document.getElementById('paymentModal');
    const paymentTotalElement = document.getElementById('paymentTotal');
    const paymentOptions = document.querySelectorAll('.other-services-payment-option');
    const cancelPaymentBtn = document.getElementById('cancelPayment');
    const confirmPaymentBtn = document.getElementById('confirmPayment');
    
    // Initialize cart count
    updateCartCount();
    
    // Add event listeners to all service checkboxes
    serviceCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            updateTotal();
        });
    });
    
    // Add to cart button
    addToCartBtn.addEventListener('click', () => {
        addToCart();
    });
    
    // Pay button
    payBtn.addEventListener('click', () => {
        // Check if we have items in the cart or selected services
        if (cartItems.length > 0) {
            // Pay for cart items
            showPaymentModal(cartItems);
        } else if (selectedServices.length > 0) {
            // Pay for selected services directly
            showPaymentModal(selectedServices);
        }
    });
    
    // Payment option selection
    paymentOptions.forEach(option => {
        option.addEventListener('click', () => {
            paymentOptions.forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            selectedPaymentMethod = option.getAttribute('data-method');
        });
    });
    
    // Cancel payment button
    cancelPaymentBtn.addEventListener('click', () => {
        hidePaymentModal();
    });
    
    // Confirm payment button
    confirmPaymentBtn.addEventListener('click', () => {
        processPayment();
    });
    
    // Update total based on selected services
    function updateTotal() {
        selectedServices = [];
        totalAmount = 0;
        
        // Get all checked services
        serviceCheckboxes.forEach(checkbox => {
            if (checkbox.checked) {
                const serviceItem = checkbox.closest('.other-services-item');
                const service = serviceItem.getAttribute('data-service');
                const price = parseInt(serviceItem.getAttribute('data-price'));
                const name = serviceItem.querySelector('.service-name').textContent;
                const description = serviceItem.querySelector('.service-description').textContent;
                
                selectedServices.push({ service, name, price, description });
                totalAmount += price;
            }
        });
        
        // Update display
        totalAmountElement.textContent = `R${totalAmount}`;
        
        // Enable/disable buttons based on selection
        const hasSelectedItems = selectedServices.length > 0;
        addToCartBtn.disabled = !hasSelectedItems;
        payBtn.disabled = !hasSelectedItems && cartItems.length === 0;
    }
    
    // Add selected services to cart
    function addToCart() {
        if (selectedServices.length === 0) {
            showNotification('Please select at least one service', 'error');
            return;
        }
        
        // Get existing cart items from localStorage
        let existingCartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
        
        // Add new items to existing cart
        selectedServices.forEach(service => {
            existingCartItems.push(service);
        });
        
        // Save back to localStorage
        localStorage.setItem('cartItems', JSON.stringify(existingCartItems));
        
        // Update cart count
        updateCartCount();
        
        // Update cart display
        updateCartDisplay();
        
        // Show cart summary
        cartSummary.classList.add('show');
        
        // Enable pay button for cart items
        payBtn.disabled = false;
        
        // Uncheck all checkboxes
        serviceCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        
        // Reset selection
        selectedServices = [];
        totalAmount = 0;
        totalAmountElement.textContent = 'R0';
        addToCartBtn.disabled = true;
        
        showNotification('Services added to cart successfully!', 'success');
    }
    
    // Update cart display
    function updateCartDisplay() {
        // Get cart items from localStorage
        cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
        
        // Clear current cart items
        cartItemsContainer.innerHTML = '';
        
        let cartTotal = 0;
        
        // Add items to cart
        cartItems.forEach(item => {
            const cartItemElement = document.createElement('div');
            cartItemElement.classList.add('cart-item');
            cartItemElement.innerHTML = `
                <div>${item.name}</div>
                <div>R${item.price}</div>
            `;
            
            cartItemsContainer.appendChild(cartItemElement);
            cartTotal += item.price;
        });
        
        // Update cart total
        cartTotalElement.textContent = `R${cartTotal}`;
    }
    
    // Update cart count in header
    function updateCartCount() {
        const cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
        const cartCountElement = document.getElementById('cartCount');
        cartCountElement.textContent = cartItems.length;
    }
    
    // Show payment modal
    function showPaymentModal(items) {
        if (items.length === 0) {
            showNotification('No items to pay for', 'error');
            return;
        }
        
        // Calculate total
        const total = items.reduce((sum, item) => sum + item.price, 0);
        paymentTotalElement.textContent = `R${total}`;
        
        // Reset payment method selection
        paymentOptions.forEach(o => o.classList.remove('selected'));
        selectedPaymentMethod = null;
        
        // Show modal
        paymentModal.classList.add('show');
    }
    
    // Hide payment modal
    function hidePaymentModal() {
        paymentModal.classList.remove('show');
    }
    
    // Process payment
    function processPayment() {
        if (!selectedPaymentMethod) {
            showNotification('Please select a payment method', 'error');
            return;
        }
        
        // Determine what we're paying for (cart items or selected services)
        const itemsToPayFor = cartItems.length > 0 ? cartItems : selectedServices;
        const total = itemsToPayFor.reduce((sum, item) => sum + item.price, 0);
        
        // In a real implementation, this would connect to a payment gateway
        // For this example, we'll just simulate a successful payment
        
        // Hide modal
        hidePaymentModal();
        
        // Show success message
        showNotification(`Payment of R${total} processed successfully via ${selectedPaymentMethod.toUpperCase()}!`, 'success');
        
        // Clear items that were paid for
        if (cartItems.length > 0) {
            // Clear cart from localStorage
            localStorage.removeItem('cartItems');
            cartItems = [];
            cartSummary.classList.remove('show');
            updateCartDisplay();
            updateCartCount();
        } else {
            // Clear selected services
            selectedServices = [];
            serviceCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
            totalAmount = 0;
            totalAmountElement.textContent = 'R0';
        }
        
        // Disable buttons if no items left
        payBtn.disabled = cartItems.length === 0 && selectedServices.length === 0;
        addToCartBtn.disabled = selectedServices.length === 0;
    }
    
    // Show notification
    function showNotification(message, type) {
        notification.textContent = message;
        notification.className = 'other-notification show';
        
        if (type === 'error') {
            notification.classList.add('error');
        } else {
            notification.classList.remove('error');
        }
        
        // Hide notification after 3 seconds
        setTimeout(() => {
            notification.className = 'other-notification';
        }, 3000);
    }
    //End of Other Cart Scripts//

    

     // User authentication and cart management
        document.addEventListener('DOMContentLoaded', function() {
            // Check if user is logged in
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            const cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
            
            // Update UI based on login status
            updateUI(currentUser);
            
            // Update cart count
            updateCartCount(cartItems);
            
            // Login form handler
            document.getElementById('login-form').addEventListener('submit', function(e) {
                e.preventDefault();
                
                const email = document.getElementById('login-email').value;
                const password = document.getElementById('login-password').value;
                
                // Get users from localStorage
                const users = JSON.parse(localStorage.getItem('users')) || [];
                
                // Check if user exists
                const user = users.find(u => u.email === email && u.password === password);
                
                if (user) {
                    // Set current user in localStorage
                    localStorage.setItem('currentUser', JSON.stringify(user));
                    
                    // Update UI
                    updateUI(user);
                    
                    // Show success message
                    alert('Login successful! Welcome back, ' + user.name);
                } else {
                    alert('Invalid email or password. Please try again.');
                }
            });
            
            // Register form handler
            document.getElementById('register-form').addEventListener('submit', function(e) {
                e.preventDefault();
                
                const name = document.getElementById('register-name').value;
                const email = document.getElementById('register-email').value;
                const password = document.getElementById('register-password').value;
                const confirmPassword = document.getElementById('register-confirm').value;
                
                // Validate passwords match
                if (password !== confirmPassword) {
                    alert('Passwords do not match. Please try again.');
                    return;
                }
                
                // Get users from localStorage
                const users = JSON.parse(localStorage.getItem('users')) || [];
                
                // Check if user already exists
                if (users.some(user => user.email === email)) {
                    alert('User with this email already exists. Please login.');
                    return;
                }
                
                // Create new user
                const newUser = { name, email, password };
                users.push(newUser);
                
                // Save users to localStorage
                localStorage.setItem('users', JSON.stringify(users));
                
                // Set current user
                localStorage.setItem('currentUser', JSON.stringify(newUser));
                
                // Update UI
                updateUI(newUser);
                
                // Show success message
                alert('Registration successful! Welcome, ' + name);
            });
            
            // Logout handler
            document.querySelector('.logout-btn').addEventListener('click', function() {
                localStorage.removeItem('currentUser');
                updateUI(null);
                alert('You have been logged out successfully.');
            });
            
            // Function to update UI based on login status
            function updateUI(user) {
                const guestNameElement = document.querySelector('.guestname');
                
                if (user) {
                    guestNameElement.textContent = `Welcome, ${user.name}`;
                    document.querySelector('.user-actions').classList.remove('hidden');
                } else {
                    guestNameElement.textContent = 'Welcome, Guest';
                    document.querySelector('.user-actions').classList.add('hidden');
                }
            }
            
            // Function to update cart count
            function updateCartCount(cartItems) {
                const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
                document.querySelector('.cart-count').textContent = cartCount;
            }
            
            // Add some demo users if none exist (for demonstration)
            if (!localStorage.getItem('users')) {
                const demoUsers = [
                    { name: 'John Doe', email: 'john@example.com', password: 'password123' },
                    { name: 'Jane Smith', email: 'jane@example.com', password: 'password123' }
                ];
                localStorage.setItem('users', JSON.stringify(demoUsers));
            }
        });

            document.addEventListener('DOMContentLoaded', function() {
            // Add subtle mouse move 3D effect
            const boxes = document.querySelectorAll('.index-box');
            
            document.addEventListener('mousemove', function(e) {
                const x = e.clientX / window.innerWidth;
                const y = e.clientY / window.innerHeight;
                
                boxes.forEach(box => {
                    const boxRect = box.getBoundingClientRect();
                    const boxCenterX = boxRect.left + boxRect.width / 2;
                    const boxCenterY = boxRect.top + boxRect.height / 2;
                    
                    const distanceX = (e.clientX - boxCenterX) / window.innerWidth;
                    const distanceY = (e.clientY - boxCenterY) / window.innerHeight;
                    
                    // Only apply effect if mouse is near the box
                    if (Math.abs(distanceX) < 0.3 && Math.abs(distanceY) < 0.3) {
                        const rotateY = distanceX * 5;
                        const rotateX = -distanceY * 5;
                        
                        box.style.transform = `translateY(-15px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
                    }
                });
            });
            
            // Reset boxes when mouse leaves document
            document.addEventListener('mouseleave', function() {
                boxes.forEach(box => {
                    box.style.transform = 'translateY(-15px) rotateX(5deg) rotateY(-2deg)';
                });
            });
        });
        //End of index Scripts//