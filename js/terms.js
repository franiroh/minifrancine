
import { loadComponents, updateNavbarAuth, updateNavbarCartCount } from './components.js';
import { loadCart, getCartCount } from './state.js';
import { getUser } from './api.js';

async function init() {
    // 1. Init User State early to prevent flickering
    const user = await getUser();

    // 2. Load Navbar/Footer
    await loadComponents(user);

    // Listen for state updates
    window.addEventListener('cart-updated', () => {
        updateNavbarCartCount(getCartCount());
    });

    await loadCart(user);
    updateNavbarCartCount(getCartCount());

    if (window.lucide) window.lucide.createIcons();
}

document.addEventListener('DOMContentLoaded', init);
