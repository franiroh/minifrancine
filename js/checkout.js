
import { loadComponents, updateNavbarAuth, updateNavbarCartCount } from './components.js';
import { getUser, onAuthStateChange } from './api.js';
import { state, loadCart, getCartCount, getCartTotal, removeFromCart, loadPurchases, isPurchased } from './state.js';
import { escapeHtml, showToast } from './utils.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// Initialize Supabase Client for direct function invocation if needed, 
// though we usually go through api.js. 
// Let's use api.js to keep it clean, but for this debugging step we need direct access or a new api method.
// We will add logError to api.js instead.

// Helper to load PayPal script dynamically
function loadPayPalScript(clientId) {
    return new Promise((resolve, reject) => {
        if (window.paypal) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load PayPal SDK'));
        document.head.appendChild(script);
    });
}

async function init() {
    await loadComponents();

    const user = await getUser();
    updateNavbarAuth(user);

    await loadCart(user);
    updateNavbarCartCount(getCartCount());

    // Remove any already-purchased products from cart (safety net)
    await loadPurchases(user);
    const purchasedInCart = state.cart.filter(item => isPurchased(item.id));
    if (purchasedInCart.length > 0) {
        showToast(`${purchasedInCart.length} producto(s) en tu carrito ya fueron comprados. Se han removido.`, 'info');
        for (let i = state.cart.length - 1; i >= 0; i--) {
            if (isPurchased(state.cart[i].id)) {
                await removeFromCart(i);
            }
        }
        updateNavbarCartCount(getCartCount());
    }

    try {
        // Fetch Client ID from server
        const { data: config, error } = await import('./api.js').then(m => m.getPayPalClientId());
        if (error || !config || !config.clientId) {
            console.error('Failed to load PayPal config', error);
        } else {
            await loadPayPalScript(config.clientId);
        }
    } catch (e) {
        console.error('Error initializing PayPal:', e);
    }

    renderCheckout();

    onAuthStateChange((event, session) => {
        updateNavbarAuth(session ? session.user : null);
    });

    if (window.lucide) window.lucide.createIcons();
}


function renderCheckout() {
    const itemsContainer = document.getElementById('checkout-items');
    const subtotalEl = document.getElementById('checkout-subtotal');
    const totalEl = document.getElementById('checkout-total');
    const payBtn = document.getElementById('pay-btn');

    const cart = state.cart;
    const total = getCartTotal();

    if (itemsContainer) {
        itemsContainer.innerHTML = cart.map(item => `
            <div class="checkout-summary__row"><span>${escapeHtml(item.title)}</span><span>$${parseFloat(item.price).toFixed(2)}</span></div>
        `).join('');
    }

    if (subtotalEl) subtotalEl.textContent = `$${total}`;
    if (totalEl) totalEl.textContent = `$${total}`;

    // PayPal Buttons
    if (window.paypal) {
        const container = document.getElementById('paypal-button-container');
        if (container) {
            container.innerHTML = ''; // Clear previous if any

            // NOTE: For production, ensure the Client ID in checkout.html matches the Secret on the server.
            window.paypal.Buttons({
                createOrder: async (data, actions) => {
                    if (!state.user) {
                        showToast('Debes iniciar sesión', 'error');
                        return Promise.reject(new Error('User not logged in'));
                    }

                    try {
                        // 1. Prepare items
                        const cartItemsMap = {};
                        state.cart.forEach(p => {
                            if (cartItemsMap[p.id]) {
                                cartItemsMap[p.id]++;
                            } else {
                                cartItemsMap[p.id] = 1;
                            }
                        });

                        const rpcItems = Object.keys(cartItemsMap).map(id => ({
                            id: parseInt(id),
                            quantity: cartItemsMap[id]
                        }));

                        // 2. Call Edge Function to Create Order
                        // Returns { orderID: 'PAYPAL-ID', dbOrderId: 'UUID' }
                        const result = await import('./api.js').then(m => m.createOrderSecure(rpcItems));

                        // Store dbOrderId needed for capture later
                        // We can store it in a variable accessible to onApprove, 
                        // or better, encoding it in custom_id if we were creating it client side, 
                        // but here we just return the ID.
                        // We can use a global or closure variable? 
                        // Actually, 'actions.resolved' is deprecated or specific.
                        // Standard flow: return orderID string.

                        window.currentDbOrderId = result.dbOrderId; // Hacky but works for SPA context

                        console.log('Server created PayPal Order:', result.orderID);
                        return result.orderID;

                    } catch (err) {
                        showToast('Error al crear la orden: ' + err.message, 'error');
                        return Promise.reject(err);
                    }
                },
                onApprove: async (data, actions) => {
                    try {
                        console.log('PayPal Approved, capturing...', data);

                        // 3. Call Edge Function to Capture
                        const result = await import('./api.js').then(m => m.captureOrderSecure(data.orderID, window.currentDbOrderId));

                        console.log('Capture result:', result);

                        // Edge Function returns { status: 'success', data: {...} }
                        // Handle both possible response shapes
                        if (result && (result.status === 'success' || result.status === 'COMPLETED')) {
                            const paymentId = result.data?.id || data.orderID;
                            showToast(`¡Pago exitoso! ID: ${paymentId}`, 'success');
                            state.cart = [];
                            setTimeout(() => window.location.href = 'orders.html', 2000);
                        } else if (result && result.error) {
                            throw new Error(result.error);
                        } else {
                            // If we get here, the server might have processed OK but response shape is unexpected
                            // Check if result exists at all
                            console.warn('Unexpected capture result shape:', result);
                            showToast('Pago procesado. Verificá en "Mis Compras".', 'info');
                            state.cart = [];
                            setTimeout(() => window.location.href = 'orders.html', 2000);
                        }

                    } catch (err) {
                        console.error('Capture error:', err);
                        showToast('Hubo un error al procesar el pago: ' + err.message, 'error');
                    }
                },
                onError: (err) => {
                    console.error('PayPal Error:', err);
                    showToast('Hubo un error con el pago de PayPal.', 'error');
                }
            }).render('#paypal-button-container');
        }
    }

    if (payBtn) {
        if (window.paypal) payBtn.style.display = 'none';
        payBtn.textContent = `Pagar con PayPal — $${total}`;
    }
}

document.addEventListener('DOMContentLoaded', init);
