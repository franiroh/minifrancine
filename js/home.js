
import { loadComponents, updateNavbarAuth, updateNavbarCartCount } from './components.js';
import { fetchProducts, fetchCategories, getUser, onAuthStateChange } from './api.js';
import { state, loadCart, getCartCount, addToCart, loadFavorites, isFavorite, toggleFavorite, loadPurchases, isPurchased } from './state.js';
import { renderBreadcrumbs, escapeHtml, sanitizeCssValue } from './utils.js';

let products = [];
let currentCategory = 'Todos';

async function init() {
    // 1. Load Navbar/Footer
    await loadComponents();

    // 2. Load State (User, Cart, Favorites)
    const user = await getUser();
    updateNavbarAuth(user);

    await loadCart(user);
    updateNavbarCartCount(getCartCount());

    await loadFavorites(user);
    await loadPurchases(user);

    // Check URL for category filter immediately to prevent flash
    const urlParams = new URLSearchParams(window.location.search);
    const initialCategory = urlParams.get('category');

    if (initialCategory) {
        showCategoryView(initialCategory); // Show header immediately
    } else {
        showHomeView(); // Default view
    }

    // 3. Fetch categories & render filter chips
    const categories = await fetchCategories();
    const filtersContainer = document.getElementById('catalog-filters');
    if (filtersContainer && categories.length > 0) {
        const chipsHTML = categories.map(c =>
            `<button class="filter-chip">${escapeHtml(c.name)}</button>`
        ).join('');
        filtersContainer.innerHTML = `<button class="filter-chip filter-chip--active">Todos</button>${chipsHTML}`;
    }

    // 4. Fetch & Render Products (only published)
    products = await fetchProducts({ publishedOnly: true });

    if (initialCategory) {
        // Just filter, view is already correctly set
        const filtered = products.filter(p => p.category === initialCategory);
        filterProducts(initialCategory); // This also sets active chip
    } else {
        renderCatalog(products); // Render all
    }

    // 5. Setup Listeners
    setupAuthListener();
    setupFilterListeners();

    // Listen for state updates from other components
    window.addEventListener('cart-updated', () => {
        updateNavbarCartCount(getCartCount());
    });

    window.addEventListener('favorites-updated', () => {
        filterProducts(currentCategory);
    });

    window.addEventListener('purchases-updated', () => {
        filterProducts(currentCategory);
    });
}

function showCategoryView(category) {
    // Hide Home Elements
    const hero = document.getElementById('home-hero');
    const trustBar = document.querySelector('.trust-bar');
    if (hero) hero.style.display = 'none';
    if (trustBar) trustBar.style.display = 'none';

    // Show Category Header
    const catHeader = document.getElementById('category-header');
    const catTitle = document.getElementById('category-title');
    if (catHeader) {
        catHeader.style.display = 'block';
        catTitle.textContent = category;
    }

    // Render Breadcrumbs
    const breadcrumbsContainer = document.getElementById('breadcrumbs-placeholder');
    if (breadcrumbsContainer) {
        breadcrumbsContainer.innerHTML = renderBreadcrumbs([
            { label: 'Inicio', href: 'index.html' },
            { label: 'Categorías', href: 'categories.html' },
            { label: category, href: null } // Current page
        ]);
    }
}

function showHomeView() {
    // Show Home Elements
    const hero = document.getElementById('home-hero');
    const trustBar = document.querySelector('.trust-bar');
    if (hero) hero.style.display = 'flex';
    if (trustBar) trustBar.style.display = 'flex';

    // Hide Category Header
    const catHeader = document.getElementById('category-header');
    if (catHeader) catHeader.style.display = 'none';

    // Clear Breadcrumbs
    const breadcrumbsContainer = document.getElementById('breadcrumbs-placeholder');
    if (breadcrumbsContainer) breadcrumbsContainer.innerHTML = '';
}

function setupFilterListeners() {
    const chips = document.querySelectorAll('.filter-chip');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            // Update UI
            chips.forEach(c => c.classList.remove('filter-chip--active'));
            chip.classList.add('filter-chip--active');

            // Filter Data
            const category = chip.textContent;

            // Should clicking a chip switch view? check with user intent.
            // "Si entras a una categoría... El Banner desaparece"
            // Let's assume manual filtering also triggers this view change for consistency.
            filterProducts(category);
        });
    });
}

function filterProducts(category) {
    currentCategory = category || 'Todos';

    // Update UI active state if function called manually (e.g. from URL)
    const chips = document.querySelectorAll('.filter-chip');
    chips.forEach(c => {
        if (c.textContent === currentCategory) {
            c.classList.add('filter-chip--active');
        } else {
            c.classList.remove('filter-chip--active');
        }
    });

    // Special case for "Todos"
    if (currentCategory === 'Todos') {
        // Reset UI to 'Todos' if necessary
        const allChip = Array.from(chips).find(c => c.textContent === 'Todos');
        if (allChip) {
            chips.forEach(c => c.classList.remove('filter-chip--active'));
            allChip.classList.add('filter-chip--active');
        }
        showHomeView();
        renderCatalog(products);
        return;
    }

    showCategoryView(currentCategory);
    const filtered = products.filter(p => p.category === currentCategory);
    renderCatalog(filtered);
}

function setupAuthListener() {
    onAuthStateChange(async (event, session) => {
        const user = session ? session.user : null;
        updateNavbarAuth(user);
        await loadFavorites(user);
        await loadPurchases(user);

        // Re-render with current filter
        filterProducts(currentCategory);
    });
}

function renderCatalog(items) {
    const grid = document.getElementById('catalog-grid');
    if (!grid) return;

    if (!items || items.length === 0) {
        grid.innerHTML = '<p class="col-span-full text-center py-12 text-gray-500">No se encontraron productos en esta categoría.</p>';
        return;
    }

    grid.innerHTML = items.map(product => {
        const purchased = isPurchased(product.id);
        return `
    <div class="product-card ${purchased ? 'product-card--purchased' : ''}" data-id="${parseInt(product.id)}">
      <div class="product-card__image" style="background: ${sanitizeCssValue(product.imageColor)};">
        ${product.mainImage ? `<img src="${escapeHtml(product.mainImage)}" alt="${escapeHtml(product.title)}" class="product-card__img" loading="lazy">` : ''}
        ${purchased
            ? `<span class="product-card__badge product-card__badge--purchased"><i data-lucide="check-circle"></i> Comprado</span>`
            : (product.badge ? `<span class="product-card__badge ${product.badgeColor === 'green' ? 'product-card__badge--green' : ''}">${escapeHtml(product.badge)}</span>` : '')}
        <div class="product-card__heart ${isFavorite(product.id) ? 'product-card__heart--active' : ''}" data-id="${parseInt(product.id)}">
            <i data-lucide="heart"></i>
        </div>
      </div>
      <div class="product-card__info">
        <span class="product-card__category">${escapeHtml(product.category)}</span>
        <h3 class="product-card__title">${escapeHtml(product.title)}</h3>
        <div class="product-card__tags">
          ${product.tags ? product.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('') : ''}
        </div>
        <div class="product-card__price-row">
          <span class="product-card__price">$${parseFloat(product.price).toFixed(2)}</span>
          <div class="product-card__btns">
            ${purchased
              ? `<a href="mis-disenos.html#product-${parseInt(product.id)}" class="btn btn--sm btn--purchased">
                   <i data-lucide="download"></i> Mis diseños
                 </a>`
              : `<button class="btn btn--sm btn--outline btn-add-cart" data-id="${parseInt(product.id)}">
                   <i data-lucide="shopping-cart"></i>
                 </button>
                 <button class="btn btn--sm btn--primary btn-buy-now" data-id="${parseInt(product.id)}">
                    Comprar
                 </button>`}
          </div>
        </div>
      </div>
    </div>
  `;
    }).join('');

    // Re-init icons
    if (window.lucide) window.lucide.createIcons();

    // Add Event Listeners

    // Add to Cart
    grid.querySelectorAll('.btn-add-cart').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            const product = products.find(p => p.id === id);
            if (product) {
                addToCart(product);
                const originalHTML = btn.innerHTML;
                btn.innerHTML = '<i data-lucide="check"></i>';
                btn.classList.add('text-green');
                if (window.lucide) window.lucide.createIcons();
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.classList.remove('text-green');
                    if (window.lucide) window.lucide.createIcons();
                }, 1000);
            }
        });
    });

    // Buy Now
    grid.querySelectorAll('.btn-buy-now').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            const product = products.find(p => p.id === id);
            if (product) {
                await addToCart(product);
                window.location.href = 'checkout.html';
            }
        });
    });

    // Toggle Favorite
    grid.querySelectorAll('.product-card__heart').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            toggleFavorite(id);
        });
    });

    // Navigate to Detail
    grid.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.btn-add-cart') && !e.target.closest('.btn-buy-now') && !e.target.closest('.btn--purchased') && !e.target.closest('.product-card__heart')) {
                const id = card.dataset.id;
                window.location.href = `product.html?id=${id}`;
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', init);
