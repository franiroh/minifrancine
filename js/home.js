
import { loadComponents, updateNavbarAuth, updateNavbarCartCount } from './components.js';
import { fetchProducts, getUser, onAuthStateChange } from './api.js';
import { state, loadCart, getCartCount, addToCart, loadFavorites, isFavorite, toggleFavorite } from './state.js';
import { renderBreadcrumbs } from './utils.js';

let products = [];

async function init() {
    // 1. Load Navbar/Footer
    await loadComponents();

    // 2. Load State (User, Cart, Favorites)
    const user = await getUser();
    updateNavbarAuth(user);

    await loadCart(user);
    updateNavbarCartCount(getCartCount());

    await loadFavorites(user);

    // Check URL for category filter immediately to prevent flash
    const urlParams = new URLSearchParams(window.location.search);
    const initialCategory = urlParams.get('category');

    if (initialCategory) {
        showCategoryView(initialCategory); // Show header immediately
    } else {
        showHomeView(); // Default view
    }

    // 3. Fetch & Render Products
    products = await fetchProducts();

    if (initialCategory) {
        // Just filter, view is already correctly set
        const filtered = products.filter(p => p.category === initialCategory);
        filterProducts(initialCategory); // This also sets active chip
    } else {
        renderCatalog(products); // Render all
    }

    // 4. Setup Listeners
    setupAuthListener();
    setupFilterListeners();

    // Listen for state updates from other components
    window.addEventListener('cart-updated', () => {
        updateNavbarCartCount(getCartCount());
    });

    window.addEventListener('favorites-updated', () => {
        const activeChip = document.querySelector('.filter-chip--active');
        const activeCategory = activeChip ? activeChip.textContent : 'Todos';

        // Re-render keeping current filter
        if (activeCategory === 'Todos') {
            renderCatalog(products);
        } else {
            const filtered = products.filter(p => p.category === activeCategory);
            renderCatalog(filtered);
        }
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
    // Update UI active state if function called manually (e.g. from URL)
    const chips = document.querySelectorAll('.filter-chip');
    chips.forEach(c => {
        if (c.textContent === category) {
            c.classList.add('filter-chip--active');
        } else {
            c.classList.remove('filter-chip--active');
        }
    });

    // Special case for "Todos"
    if (category === 'Todos' || !category) {
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

    showCategoryView(category);
    const filtered = products.filter(p => p.category === category);
    renderCatalog(filtered);
}

function setupAuthListener() {
    onAuthStateChange(async (event, session) => {
        const user = session ? session.user : null;
        updateNavbarAuth(user);
        await loadFavorites(user);

        // Re-render with current filter
        const activeChip = document.querySelector('.filter-chip--active');
        const currentCategory = activeChip ? activeChip.textContent : 'Todos';
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

    grid.innerHTML = items.map(product => `
    <div class="product-card" data-id="${product.id}">
      <div class="product-card__image" style="background: ${product.imageColor};">
        ${product.badge ? `<span class="product-card__badge ${product.badgeColor === 'green' ? 'product-card__badge--green' : ''}">${product.badge}</span>` : ''}
        <div class="product-card__heart ${isFavorite(product.id) ? 'product-card__heart--active' : ''}" data-id="${product.id}">
            <i data-lucide="heart"></i>
        </div>
      </div>
      <div class="product-card__info">
        <span class="product-card__category">${product.category}</span>
        <h3 class="product-card__title">${product.title}</h3>
        <div class="product-card__tags">
          ${product.tags ? product.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : ''}
        </div>
        <div class="product-card__price-row">
          <span class="product-card__price">$${product.price}</span>
          <button class="btn btn--sm btn--primary btn-add-cart" data-id="${product.id}">
             Agregar
          </button>
        </div>
      </div>
    </div>
  `).join('');

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
                // Optional: Show toast
                const originalText = btn.textContent;
                btn.textContent = '¡Agregado!';
                btn.classList.add('text-green');
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.classList.remove('text-green');
                }, 1000);
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
            if (!e.target.closest('.btn-add-cart') && !e.target.closest('.product-card__heart')) {
                const id = card.dataset.id;
                window.location.href = `product.html?id=${id}`;
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', init);
