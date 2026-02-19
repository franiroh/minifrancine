import { loadComponents, updateNavbarAuth, updateNavbarCartCount } from './components.js';
import { fetchProducts, getUser, onAuthStateChange } from './api.js';
import { getCartCount, loadCart } from './state.js';
import { escapeHtml, sanitizeCssValue, renderBreadcrumbs } from './utils.js';
import i18n from './i18n.js';

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
    const products = await fetchProducts({ publishedOnly: true });

    // Render Breadcrumbs
    const breadcrumbs = document.getElementById('breadcrumbs-placeholder');
    if (breadcrumbs) {
        breadcrumbs.innerHTML = renderBreadcrumbs([
            { label: i18n.t('nav.home'), href: 'index.html' },
            { label: i18n.t('nav.catalog'), href: null }
        ]);
    }

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
                id: p.categoryId, // Capture ID for translation
                count: 0,
                image: null,
                bg: p.imageColor
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
        grid.innerHTML = `<p>${i18n.t('common.no_categories') || 'No hay categorías disponibles.'}</p>`;
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

        const translatedName = cat.id ? i18n.t(`category.${cat.id}`) : cat.name;
        // Check if translation exists, fallback to name if it equals the key
        const displayName = translatedName === `category.${cat.id}` ? cat.name : translatedName;

        const countLabel = cat.count === 1
            ? (i18n.lang === 'es' ? 'diseño' : 'design')
            : (i18n.lang === 'es' ? 'diseños' : 'designs');

        return `
            <a href="catalog.html?category=${encodeURIComponent(cat.name)}" class="category-card">
                <div class="category-card__image-wrapper">
                    ${bgContent}
                </div>
                <div class="category-card__info">
                    <h3 class="category-card__name">${escapeHtml(displayName)}</h3>
                    <span class="category-card__count">${parseInt(cat.count)} ${countLabel}</span>
                </div>
            </a>
        `;
    }).join('');
}

document.addEventListener('DOMContentLoaded', init);
