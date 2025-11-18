/**
 * Yoco Payment Gateway Integration
 * Handles payment processing via Yoco API with Enhanced Checkout Redirect Flow
 */

class YocoPaymentGateway {
    constructor() {
        // Dynamic API base URL - works with www, non-www, and localhost
        const apiUrl = (window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1')
            ? 'http://localhost:3000/api'
            : `${window.location.protocol}//${window.location.hostname}/api`;
        this.apiBase = `${apiUrl}/payments`;
        this.isProcessing = false;
        console.log('💳 Payment API Base:', this.apiBase);
    }

    /**
     * Initialize payment checkout (redirects to Yoco)
     * @param {Object} config - Payment configuration
     * @param {number} config.amount - Amount in cents (ZAR)
     * @param {string} config.currency - Currency code (default: ZAR)
     * @param {string} config.description - Payment description
     * @param {Object} config.metadata - Additional metadata
     * @param {Function} config.onSuccess - Success callback (for pre-redirect actions)
     * @param {Function} config.onError - Error callback
     */
    async openPaymentModal(config) {
        const {
            amount,
            currency = 'ZAR',
            description = 'Payment',
            metadata = {},
            onSuccess,
            onError
        } = config;

        // Validate amount
        if (!amount || amount < 100) {
            this.showError('Minimum payment amount is R1.00');
            return;
        }

        if (this.isProcessing) {
            this.showError('Payment already in progress');
            return;
        }

        try {
            this.isProcessing = true;
            this.showLoading('Creating secure checkout...');

            // Create checkout on backend
            const result = await this.createCheckout({
                amount,
                currency,
                description,
                metadata
            });

            if (!result.checkout || !result.checkout.redirectUrl) {
                throw new Error('Failed to create checkout session');
            }

            console.log('✅ Checkout created, redirecting to Yoco...', result.checkout.id);
            
            // Call success callback if provided (for pre-redirect actions)
            if (onSuccess) {
                onSuccess({
                    checkoutId: result.checkout.id,
                    paymentId: result.payment.id,
                    redirectUrl: result.checkout.redirectUrl
                });
            }

            // Redirect to Yoco checkout page immediately
            window.location.href = result.checkout.redirectUrl;

        } catch (error) {
            console.error('❌ Payment initialization error:', error);
            this.hideLoading();
            this.showError(error.message || 'Failed to initialize payment');
            this.isProcessing = false;
            if (onError) onError(error);
        }
    }

    /**
     * Create checkout session on backend
     */
    async createCheckout(paymentData) {
        try {
            const response = await fetch(`${this.apiBase}/create-checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(paymentData)
            });

            let data;
            const contentType = response.headers.get('content-type');
            
            try {
                // Try to parse as JSON
                if (contentType && contentType.includes('application/json')) {
                    data = await response.json();
                } else {
                    // If not JSON, get as text
                    const textResponse = await response.text();
                    console.error('❌ Non-JSON response received:', textResponse);
                    throw new Error('Server returned invalid response format');
                }
            } catch (parseError) {
                console.error('❌ Failed to parse response:', parseError);
                console.error('❌ Response headers:', Object.fromEntries(response.headers.entries()));
                throw new Error('Invalid response from payment gateway');
            }

            if (!response.ok) {
                const errorMessage = data?.message || data?.error || `Payment failed: ${response.status} ${response.statusText}`;
                console.error('❌ Payment API error:', errorMessage);
                throw new Error(errorMessage);
            }

            return data; // Returns { success: true, checkout, payment }
        } catch (error) {
            console.error('❌ Create checkout error:', error);
            
            // If it's our own error, throw it as is
            if (error.message.includes('Invalid response') || error.message.includes('Payment failed')) {
                throw error;
            }
            
            // For network/other errors, provide a user-friendly message
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Unable to connect to payment server. Please check your connection and try again.');
            }
            
            throw new Error(error.message || 'Payment initialization failed. Please try again.');
        }
    }

    /**
     * Verify payment status
     */
    async verifyPayment(paymentId) {
        try {
            const response = await fetch(`${this.apiBase}/verify-payment/${paymentId}`, {
                method: 'GET',
                credentials: 'include'
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Payment verification failed');
            }

            return data.payment;
        } catch (error) {
            console.error('❌ Payment verification error:', error);
            throw error;
        }
    }

    /**
     * UI Helper Methods
     */
    showLoading(message = 'Processing...') {
        const existingLoader = document.getElementById('yoco-payment-loader');
        if (existingLoader) existingLoader.remove();

        const loader = document.createElement('div');
        loader.id = 'yoco-payment-loader';
        loader.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        loader.innerHTML = `
            <div style="background: white; padding: 40px; border-radius: 12px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                <div style="width: 50px; height: 50px; border: 4px solid #f3f3f3; border-top: 4px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
                <p style="margin: 0; font-size: 16px; color: #333; font-weight: 500;">${message}</p>
            </div>
        `;
        document.body.appendChild(loader);
    }

    hideLoading() {
        const loader = document.getElementById('yoco-payment-loader');
        if (loader) loader.remove();
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type = 'info') {
        const existingToast = document.getElementById('yoco-payment-toast');
        if (existingToast) existingToast.remove();

        const colors = {
            success: { bg: '#10b981', icon: '✓' },
            error: { bg: '#ef4444', icon: '✕' },
            info: { bg: '#3b82f6', icon: 'i' }
        };

        const color = colors[type] || colors.info;

        const toast = document.createElement('div');
        toast.id = 'yoco-payment-toast';
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${color.bg};
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10001;
            font-size: 15px;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 12px;
            animation: slideIn 0.3s ease-out;
        `;
        toast.innerHTML = `
            <style>
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            </style>
            <span style="font-size: 20px;">${color.icon}</span>
            <span>${message}</span>
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.animation = 'slideIn 0.3s ease-out reverse';
                setTimeout(() => toast.remove(), 300);
            }
        }, 4000);
    }
}

// Create global instance
window.yocoPayment = new YocoPaymentGateway();

// Convenience function for quick payments (redirects to Yoco)
window.openYocoPayment = function(amount, description, metadata = {}, onSuccess, onError) {
    window.yocoPayment.openPaymentModal({
        amount,
        description,
        metadata,
        onSuccess,
        onError
    });
};

// Backward compatibility function
window.openPaymentModal = function(amount, description, metadata = {}) {
    window.yocoPayment.openPaymentModal({
        amount: amount || window.cartTotal * 100 || 1000, // Convert to cents
        description: description || 'Service Payment',
        metadata: {
            ...metadata,
            paymentType: 'service_payment',
            timestamp: new Date().toISOString()
        },
        onSuccess: function(result) {
            console.log('✅ Redirecting to Yoco checkout...');
        },
        onError: function(error) {
            console.error('❌ Payment failed:', error);
            alert('Payment failed: ' + error.message);
        }
    });
};

console.log('✅ Yoco Payment Gateway initialized with checkout redirect flow');
