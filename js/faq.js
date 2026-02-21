
import { loadComponents, updateNavbarAuth, updateNavbarCartCount } from './components.js';
import { loadCart, getCartCount } from './state.js';
import { getUser } from './api.js';
import { i18n } from './i18n.js';

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

    setupAccordion();

    if (window.lucide) window.lucide.createIcons();
}

function setupAccordion() {
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-item__question');

        question.addEventListener('click', () => {
            // Toggle current item
            const isActive = item.classList.contains('active');

            // Close all items
            faqItems.forEach(i => i.classList.remove('active'));

            // Open clicked item if it wasn't active
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });

    // Support URL hash navigation (e.g., #downloading)
    const hash = window.location.hash;
    if (hash) {
        const targetItem = document.querySelector(hash);
        if (targetItem && targetItem.classList.contains('faq-item')) {
            targetItem.classList.add('active');
            setTimeout(() => {
                targetItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    }
}

document.addEventListener('DOMContentLoaded', init);
