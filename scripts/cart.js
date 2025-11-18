// Cart page functionality
document.addEventListener('DOMContentLoaded', async function() {
    const cartItemsList = document.getElementById('cartItems');
    const totalAmount = document.getElementById('totalAmount');
    const checkoutButton = document.getElementById('checkoutButton');
    const clearCartButton = document.getElementById('clearCartButton');

    // Load cart items when page loads
    await loadCartItems();

    async function loadCartItems() {
        try {
            const cartData = await cart.getCart();
            displayCartItems(cartData.items);
            updateTotalAmount(cartData.totalAmount);
        } catch (error) {
            showMessage('Failed to load cart items', 'error');
        }
    }

    function displayCartItems(items) {
        if (!cartItemsList) return;

        cartItemsList.innerHTML = '';
        
        if (items.length === 0) {
            cartItemsList.innerHTML = '<tr><td colspan="7" class="empty-cart">Your cart is empty</td></tr>';
            if (checkoutButton) checkoutButton.disabled = true;
            if (clearCartButton) clearCartButton.disabled = true;
            return;
        }

        let totalSubtotal = 0;
        let totalVat = 0;
        let totalAmount = 0;

        items.forEach(item => {
            const subtotal = item.price * item.quantity;
            const vat = subtotal * 0.15; // 15% VAT
            const total = subtotal + vat;

            totalSubtotal += subtotal;
            totalVat += vat;
            totalAmount += total;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <strong>${item.name}</strong><br>
                    <small>${item.productType}</small>
                </td>
                <td>R${item.price.toFixed(2)}</td>
                <td>${item.quantity}</td>
                <td>R${subtotal.toFixed(2)}</td>
                <td>R${vat.toFixed(2)}</td>
                <td>R${total.toFixed(2)}</td>
                <td>
                    <button class="remove-item" data-id="${item.productId}">×</button>
                </td>
            `;
            cartItemsList.appendChild(tr);
        });

        // Update footer totals
        document.getElementById('cart-subtotal').textContent = `R${totalSubtotal.toFixed(2)}`;
        document.getElementById('cart-vat').textContent = `R${totalVat.toFixed(2)}`;
        document.getElementById('cart-total').textContent = `R${totalAmount.toFixed(2)}`;

        if (checkoutButton) checkoutButton.disabled = false;
        if (clearCartButton) clearCartButton.disabled = false;
    }

    function updateTotalAmount(amount) {
        if (totalAmount) {
            totalAmount.textContent = `R${amount.toFixed(2)}`;
        }
    }

    // Event delegation for remove buttons
    if (cartItemsList) {
        cartItemsList.addEventListener('click', async (e) => {
            if (e.target.classList.contains('remove-item')) {
                const productId = e.target.dataset.id;
                try {
                    await cart.removeItem(productId);
                    await loadCartItems();
                    showMessage('Item removed from cart', 'success');
                } catch (error) {
                    showMessage('Failed to remove item', 'error');
                }
            }
        });
    }

    // Clear cart handler
    if (clearCartButton) {
        clearCartButton.addEventListener('click', async () => {
            try {
                await cart.clearCart();
                await loadCartItems();
                showMessage('Cart cleared successfully', 'success');
            } catch (error) {
                showMessage('Failed to clear cart', 'error');
            }
        });
    }

    // Checkout handler
    if (checkoutButton) {
        checkoutButton.addEventListener('click', async () => {
            try {
                const cartData = await cart.getCart();
                const { checkoutUrl } = await payment.initializePayment(
                    cartData.totalAmount,
                    cartData.items
                );
                
                // Redirect to Yoco checkout
                window.location.href = checkoutUrl;
            } catch (error) {
                showMessage('Failed to initialize checkout', 'error');
            }
        });
    }
});

function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    const container = document.querySelector('.cart-container');
    if (container) {
        container.insertBefore(messageDiv, container.firstChild);
        
        setTimeout(() => messageDiv.remove(), 5000);
    }
}