
import { loadComponents, updateNavbarAuth, updateNavbarCartCount } from './components.js';
import { getUser, onAuthStateChange } from './api.js';
import { state, loadCart, getCartCount, removeFromCart, clearCart, getCartTotal } from './state.js';
import { formatPrice, escapeHtml, sanitizeCssValue } from './utils.js';
import i18n from './i18n.js';

async function init() {
    await loadComponents();

    // Auth & State
    const user = await getUser();
    updateNavbarAuth(user);

    await loadCart(user);
    updateNavbarCartCount(getCartCount());

    renderCart();

    // Auth Listener
    onAuthStateChange((event, session) => {
        updateNavbarAuth(session ? session.user : null);
    });

    // Cart Listener (in case updated from another tab or component?)
    // In MPA, main update is page reload, but let's be safe
    window.addEventListener('cart-updated', () => {
        renderCart();
        updateNavbarCartCount(getCartCount());
    });
}

function renderCart() {
    const container = document.getElementById('cart-items-container');
    const countEl = document.getElementById('cart-count');
    const subtotalEl = document.getElementById('cart-subtotal');
    const totalEl = document.getElementById('cart-total');

    if (!container) return;

    const cart = state.cart;
    countEl.textContent = cart.length;

    if (cart.length === 0) {
        container.innerHTML = `<p style="text-align:center; padding: 20px; color: #9CA3AF;">${i18n.t('cart.empty')}</p>`;
        subtotalEl.textContent = 'USD 0.00';
        totalEl.textContent = 'USD 0.00';
    } else {
        container.innerHTML = cart.map((item, index) => {
            const imgHtml = item.mainImage
                ? `<img src="${escapeHtml(item.mainImage)}" class="cart-item__img" alt="${escapeHtml(item.title)}" style="object-fit: cover;">`
                : `<div class="cart-item__img" style="background: ${sanitizeCssValue(item.imageColor || '#F3F4F6')};"></div>`;

            return `
                <div class="cart-item">
                  ${imgHtml}
                  <div class="cart-item__info">
                    <span class="badge-digital">${i18n.t('msg.digital_download')}</span>
                    <span class="cart-item__name">${escapeHtml(item.title)}</span>
                    <span class="cart-item__meta">${escapeHtml(item.category)} · ${escapeHtml(item.size || 'Standard')}</span>
                    <div class="cart-item__price-container">
                        ${item.oldPrice ? `<span class="cart-item__price cart-item__price--old">USD ${parseFloat(item.oldPrice).toFixed(2)}</span>` : ''}
                        <span class="cart-item__price">USD ${parseFloat(item.price).toFixed(2)}</span>
                    </div>
                  </div>
                  <button class="cart-item__delete" data-index="${index}"><i data-lucide="trash-2"></i></button>
                </div>
            `;
        }).join('');

        // Listeners for delete
        container.querySelectorAll('.cart-item__delete').forEach(btn => {
            btn.addEventListener('click', () => {
                removeFromCart(parseInt(btn.dataset.index));
            });
        });

        const total = getCartTotal();
        subtotalEl.textContent = `USD ${total}`;
        totalEl.textContent = `USD ${total}`;
    }

    // Clear cart listener
    const clearBtn = document.getElementById('clear-cart-btn');
    if (clearBtn) {
        // Clone to remove old listeners
        const newBtn = clearBtn.cloneNode(true);
        clearBtn.parentNode.replaceChild(newBtn, clearBtn);

        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm(i18n.t('cart.confirm_clear'))) {
                clearCart();
            }
        });
    }

    if (window.lucide) window.lucide.createIcons();
}

document.addEventListener('DOMContentLoaded', init);
