
import { loadComponents, updateNavbarAuth, updateNavbarCartCount } from './components.js';
import { getUser, onAuthStateChange } from './api.js';
import { state, loadCart, getCartCount, getCartTotal, removeFromCart, loadPurchases, isPurchased, loadCoupons, applyCoupon, removeCoupon } from './state.js';
import { validateCoupon } from './api.js';
import { escapeHtml, showToast } from './utils.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
import i18n from './i18n.js';

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
        script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&disable-funding=card`;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load PayPal SDK'));
        document.head.appendChild(script);
    });
}

async function init() {
    // 1. Init User State early to prevent flickering
    const user = await getUser();

    // 2. Load Navbar/Footer
    await loadComponents(user);

    await loadCart(user);
    updateNavbarCartCount(getCartCount());
    await loadCoupons(user);

    // Remove any already-purchased products from cart (safety net)
    await loadPurchases(user);
    const purchasedInCart = state.cart.filter(item => isPurchased(item.id));
    if (purchasedInCart.length > 0) {
        showToast(`${purchasedInCart.length} ${i18n.t('msg.purchased_removed')}`, 'info');
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

    // Listeners for coupons
    window.addEventListener('coupons-updated', renderCheckout);
    window.addEventListener('coupon-applied', renderCheckout);

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
    const subtotal = parseFloat(getCartTotal());
    let total = subtotal;
    let discount = 0;

    if (state.appliedCoupon) {
        if (state.appliedCoupon.type === 'welcome_20') {
            discount = subtotal * 0.20;
        } else if (state.appliedCoupon.type === 'bulk_50') {
            // Sort items by price ascending to apply discount to cheapest items (as per rule)
            const sortedItems = [...cart].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
            // Apply 50% discount to up to 10 items
            for (let i = 0; i < Math.min(sortedItems.length, state.appliedCoupon.max_items || 10); i++) {
                discount += parseFloat(sortedItems[i].price) * 0.50;
            }
        }
        total = subtotal - discount;
    }

    if (itemsContainer) {
        itemsContainer.innerHTML = cart.map(item => `
            <div class="checkout-summary__row">
                <div class="checkout-summary__item-info">
                    <span class="badge-digital">${i18n.t('msg.digital_download')}</span>
                    <span class="checkout-summary__item-name">${escapeHtml(item.title)}</span>
                </div>
                <div class="checkout-summary__price-container">
                    ${item.oldPrice ? `<span class="checkout-summary__item-price checkout-summary__item-price--old">USD ${parseFloat(item.oldPrice).toFixed(2)}</span>` : ''}
                    <span class="checkout-summary__item-price">USD ${parseFloat(item.price).toFixed(2)}</span>
                </div>
            </div>
        `).join('');
    }

    // Render Discount Row
    const discountRow = document.getElementById('checkout-discount-row');
    if (state.appliedCoupon) {
        if (!discountRow) {
            const row = document.createElement('div');
            row.id = 'checkout-discount-row';
            row.className = 'checkout-summary__row checkout-summary__row--discount';
            row.style.color = 'var(--color-success)';
            row.style.fontWeight = '600';
            row.innerHTML = `
                <span>${i18n.t('checkout.coupon_saved')}</span>
                <span id="checkout-discount-val">-USD ${discount.toFixed(2)}</span>
            `;
            totalEl.parentElement.before(row);
        } else {
            document.getElementById('checkout-discount-val').textContent = `-USD ${discount.toFixed(2)}`;
            discountRow.style.display = 'flex';
        }
    } else if (discountRow) {
        discountRow.style.display = 'none';
    }

    if (subtotalEl) subtotalEl.textContent = `USD ${subtotal.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `USD ${total.toFixed(2)}`;

    renderCouponUI();

    // PayPal Buttons
    if (window.paypal) {
        const container = document.getElementById('paypal-button-container');
        if (container) {
            container.innerHTML = ''; // Clear previous if any

            // NOTE: For production, ensure the Client ID in checkout.html matches the Secret on the server.
            window.paypal.Buttons({
                createOrder: async (data, actions) => {
                    if (!state.user) {
                        showToast(i18n.t('msg.login_required'), 'error');
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
                        const couponCode = state.appliedCoupon ? state.appliedCoupon.code : null;
                        const result = await import('./api.js').then(m => m.createOrderSecure(rpcItems, couponCode));

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
                        showToast(i18n.t('error.order_create') + err.message, 'error');
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

                            // 4. Reset coupon state (it's marked as used on the server)
                            if (state.appliedCoupon) {
                                removeCoupon();
                                // Refresh coupons list
                                await loadCoupons(state.user);
                            }

                            // Send order confirmation email (wait for it to ensure it sends before redirecting)
                            try {
                                const m = await import('./api.js');
                                const emailResult = await m.sendOrderConfirmationEmail(window.currentDbOrderId);
                                if (emailResult && emailResult.error) {
                                    console.warn('Email confirmation failed:', emailResult.error);
                                } else {
                                    console.log('Order confirmation email sent');
                                }
                            } catch (err) {
                                console.warn('Email send error:', err);
                            }

                            state.cart = [];
                            window.location.href = 'orders.html';
                        } else if (result && result.error) {
                            throw new Error(result.error);
                        } else {
                            // If we get here, the server might have processed OK but response shape is unexpected
                            // Check if result exists at all
                            console.warn('Unexpected capture result shape:', result);
                            showToast(i18n.t('msg.payment_processed'), 'info');

                            // Mark coupon as used anyway if we reached here
                            if (state.appliedCoupon) {
                                await import('./api.js').then(m => m.markCouponAsUsed(state.appliedCoupon.id));
                                removeCoupon();
                                // Refresh coupons list
                                await loadCoupons(state.user);
                            }

                            // Try to send email anyway (wait for it to ensure it sends before redirecting)
                            try {
                                const m = await import('./api.js');
                                await m.sendOrderConfirmationEmail(window.currentDbOrderId);
                            } catch (err) {
                                console.warn('Email send error:', err);
                            }

                            state.cart = [];
                            window.location.href = 'orders.html';
                        }

                    } catch (err) {
                        console.error('Capture error:', err);
                        showToast(i18n.t('error.payment_process') + err.message, 'error');
                    }
                },
                onError: (err) => {
                    console.error('PayPal Error:', err);
                    showToast(i18n.t('error.paypal_error'), 'error');
                }
            }).render('#paypal-button-container');

            // Hide/Enable container based on checkbox
            const checkbox = document.getElementById('digital-agreement');
            const btnContainer = document.getElementById('paypal-button-container');
            if (checkbox && btnContainer) {
                // Initialize state based on current checkbox value
                const isChecked = checkbox.checked;
                btnContainer.style.opacity = isChecked ? '1' : '0.5';
                btnContainer.style.pointerEvents = isChecked ? 'auto' : 'none';

                checkbox.onchange = () => {
                    if (checkbox.checked) {
                        btnContainer.style.opacity = '1';
                        btnContainer.style.pointerEvents = 'auto';
                    } else {
                        btnContainer.style.opacity = '0.5';
                        btnContainer.style.pointerEvents = 'none';
                    }
                };
            }
        }
    }

    if (payBtn) {
        if (window.paypal) payBtn.style.display = 'none';
        payBtn.textContent = `${i18n.t('checkout.payment_confirm')} — USD ${total.toFixed(2)}`;
    }
}

function renderCouponUI() {
    const listContainer = document.getElementById('available-coupons');
    const appliedInfo = document.getElementById('applied-coupon-info');
    const appliedText = document.getElementById('applied-coupon-text');
    const applyBtn = document.getElementById('apply-coupon-btn');
    const couponInput = document.getElementById('coupon-code');
    const removeBtn = document.getElementById('remove-coupon-btn');

    if (!listContainer) return;

    // Available coupons
    const otherCoupons = state.coupons.filter(c => state.appliedCoupon?.code !== c.code);

    if (otherCoupons.length > 0) {
        const availableTitle = `<p class="coupon-section__subtitle">${i18n.t('checkout.coupon_available')}:</p>`;
        listContainer.innerHTML = availableTitle + otherCoupons.map(c => `
            <div class="coupon-tag" onclick="window.applySelectedCoupon('${c.code}')">
                <i data-lucide="ticket" size="14"></i>
                <span>${c.code} (${c.discount_percent}%)</span>
            </div>
        `).join('');
        if (window.lucide) window.lucide.createIcons();
    } else {
        listContainer.innerHTML = '';
    }

    // Applied info
    if (state.appliedCoupon) {
        appliedInfo.style.display = 'flex';
        const title = state.appliedCoupon.type === 'welcome_20' ? i18n.t('checkout.coupon_welcome_title') : i18n.t('checkout.coupon_bulk_title');
        appliedText.innerHTML = `<strong>${i18n.t('checkout.coupon_applied')}</strong> ${state.appliedCoupon.code} (${title})`;
    } else {
        appliedInfo.style.display = 'none';
    }

    // Handlers
    applyBtn.onclick = async () => {
        const code = couponInput.value.trim().toUpperCase();
        if (!code) return;
        const { data, error } = await validateCoupon(code);
        if (error || !data) {
            showToast(i18n.t('checkout.coupon_invalid'), 'error');
        } else {
            applyCoupon(data);
            couponInput.value = '';
        }
    };

    removeBtn.onclick = () => {
        removeCoupon();
    };

    window.applySelectedCoupon = async (code) => {
        const { data } = await validateCoupon(code);
        if (data) applyCoupon(data);
    };
}

document.addEventListener('DOMContentLoaded', init);
