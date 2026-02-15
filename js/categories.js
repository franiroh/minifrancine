import { loadComponents, updateNavbarAuth, updateNavbarCartCount } from './components.js';
import { fetchProducts, getUser, onAuthStateChange } from './api.js';
import { getCartCount, loadCart } from './state.js';
import { escapeHtml, sanitizeCssValue } from './utils.js';

async function init() {
    await loadComponents();

    // Auth & Cart
    const user = await getUser();
    updateNavbarAuth(user);
    await loadCart(user);
    updateNavbarCartCount(getCartCount());

    onAuthStateChange((event, session) => {
        updateNavbarAuth(session?.user);
    });

    // Load Data
    const products = await fetchProducts();
    renderCategories(products);
}

function renderCategories(products) {
    const grid = document.getElementById('categories-grid');
    if (!grid) return;

    // Group products by category
    const categories = {};

    products.forEach(p => {
        if (!categories[p.category]) {
            categories[p.category] = {
                name: p.category,
                count: 0,
                image: null,
                bg: p.imageColor // Use first product's color/image as fallback
            };
        }
        categories[p.category].count++;
        // Try to find a real image if available
        if (!categories[p.category].image && p.mainImage) {
            categories[p.category].image = p.mainImage;
        }
    });

    const sortedCategories = Object.values(categories).sort((a, b) => b.count - a.count);

    if (sortedCategories.length === 0) {
        grid.innerHTML = '<p>No hay categorías disponibles.</p>';
        return;
    }

    grid.innerHTML = sortedCategories.map((cat, index) => {
        // Determine background (Image or Gradient)
        let bgContent = '';
        if (cat.image) {
            bgContent = `<img src="${escapeHtml(cat.image)}" alt="${escapeHtml(cat.name)}" class="category-card__bg">`;
        } else {
            // Fallback gradients based on index
            const gradients = [
                'linear-gradient(135deg, #FF9A9E 0%, #FECFEF 100%)',
                'linear-gradient(120deg, #a1c4fd 0%, #c2e9fb 100%)',
                'linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)',
                'linear-gradient(120deg, #fccb90 0%, #d57eeb 100%)',
                'linear-gradient(120deg, #e0c3fc 0%, #8ec5fc 100%)'
            ];
            const gradient = cat.bg && cat.bg.includes('gradient') ? cat.bg : gradients[index % gradients.length];
            bgContent = `<div class="category-card__bg" style="background: ${sanitizeCssValue(gradient)};"></div>`;
        }

        return `
            <a href="index.html?category=${encodeURIComponent(cat.name)}" class="category-card">
                ${bgContent}
                <div class="category-card__overlay">
                    <h3 class="category-card__name">${escapeHtml(cat.name)}</h3>
                    <span class="category-card__count">${parseInt(cat.count)} diseño${cat.count !== 1 ? 's' : ''}</span>
                </div>
            </a>
        `;
    }).join('');
}

document.addEventListener('DOMContentLoaded', init);
