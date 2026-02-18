
import { loadComponents, updateNavbarAuth, updateNavbarCartCount } from './components.js';
import { loadCart, getCartCount } from './state.js';
import { getUser } from './api.js';

async function init() {
    await loadComponents();

    loadCart();
    updateNavbarCartCount(getCartCount());

    const user = await getUser();
    updateNavbarAuth(user);

    if (window.lucide) window.lucide.createIcons();
}

document.addEventListener('DOMContentLoaded', init);
