
import { loadComponents, updateNavbarAuth, updateNavbarCartCount } from './components.js';
import { getUser, onAuthStateChange } from './api.js';
import { state, loadCart, getCartCount, getCartTotal } from './state.js';
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
            <div class="checkout-summary__row"><span>${item.title}</span><span>$${item.price}</span></div>
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
                        alert('Debes iniciar sesión');
                        return Promise.reject(new Error('User not logged in'));
                    }

                    try {
                        // 1. Create Order on Server (Secure)
                        const { data: orderData, error } = await import('./api.js').then(m => m.createOrder());

                        if (error) {
                            throw new Error(error.message);
                        }

                        console.log('Order created on DB:', orderData);

                        // 2. Tell PayPal to create a transaction
                        return actions.order.create({
                            purchase_units: [{
                                description: `Order #${orderData.order_id}`,
                                amount: {
                                    value: orderData.total
                                },
                                custom_id: orderData.order_id
                            }]
                        });
                    } catch (err) {
                        alert('Error al crear la orden: ' + err.message);
                        return Promise.reject(err);
                    }
                },
                onApprove: async (data, actions) => {
                    try {
                        // 3. Capture Payment
                        const details = await actions.order.capture();
                        console.log('PayPal Transaction completed:', details);

                        const dbOrderId = details.purchase_units[0].custom_id;
                        const paymentId = details.id;

                        // 4. Confirm Payment via Secure Edge Function
                        const { data: result, error } = await import('./api.js').then(m => m.verifyPayment(dbOrderId, paymentId));

                        if (error) {
                            console.error('Edge Function Error:', error);

                            // Log to server for debugging
                            await import('./api.js').then(m => m.logError({ error, paymentId, dbOrderId }));

                            let errMsg = error.message || JSON.stringify(error);
                            if (error && error.context && error.context.json && error.context.json.error) {
                                errMsg = error.context.json.error;
                            }

                            alert(`Error de verificación: ${errMsg}\nID: ${paymentId}`);
                        } else {
                            alert(`¡Pago verificado exitosamente! ID: ${paymentId}`);
                            state.cart = [];
                            window.location.href = 'index.html';
                        }
                    } catch (err) {
                        console.error('Capture/Verify error:', err);
                        alert('Hubo un error al procesar el pago.');
                    }
                },
                onError: (err) => {
                    console.error('PayPal Error:', err);
                    alert('Hubo un error con el pago de PayPal.');
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
