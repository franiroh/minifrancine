
import { loadComponents, updateNavbarAuth, updateNavbarCartCount } from './components.js';
import { loadCart, getCartCount } from './state.js';
import { getUser } from './api.js';

async function init() {
    await loadComponents();

    const user = await getUser();
    updateNavbarAuth(user);

    // Listen for state updates
    window.addEventListener('cart-updated', () => {
        updateNavbarCartCount(getCartCount());
    });

    await loadCart(user);
    updateNavbarCartCount(getCartCount());

    if (window.lucide) window.lucide.createIcons();
}

document.addEventListener('DOMContentLoaded', init);
