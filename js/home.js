import { loadComponents, updateNavbarAuth, updateNavbarCartCount, createProductCard, createSkeletonCard } from './components.js';
import { fetchProducts, fetchCategories, getUser, onAuthStateChange, addToFavorites, removeFromFavorites, fetchFavoriteProducts } from './api.js';
import { state, loadCart, getCartCount, addToCart, loadFavorites, isFavorite, toggleFavorite, loadPurchases, isPurchased } from './state.js';
import { renderBreadcrumbs, escapeHtml, sanitizeCssValue, InfiniteScrollManager } from './utils.js';
import { supabase } from './api.js';
import i18n from './i18n.js';

let products = [];
let currentCategory = 'Todos';

async function init() {
    // 1. Load Navbar/Footer
    await loadComponents();

    const grid = document.getElementById('catalog-grid'); // Changed from product-grid to catalog-grid
    // Show Skeletons
    if (grid) {
        grid.innerHTML = Array(8).fill(0).map(() => createSkeletonCard()).join('');
    }

    // 2. Check Auth & Init Navbar
    let user = null;
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        user = session.user;
        updateNavbarAuth(user);
    } else {
        updateNavbarAuth(null);
    }

    // 3. Init Cart Count
    updateNavbarCartCount(getCartCount());

    // 4. Load State (Cart, Favorites, Purchases)
    await loadCart(user);
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
            `<button class="filter-chip" data-category="${escapeHtml(c.name)}" data-i18n="category.${c.id}">${i18n.t(`category.${c.id}`) || escapeHtml(c.name)}</button>`
        ).join('');
        filtersContainer.innerHTML = `<button class="filter-chip filter-chip--active" data-category="Todos" data-i18n="category.all">${i18n.t('category.all') || 'Todos'}</button>${chipsHTML}`;
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

    // Filter Chips Listener
    if (filtersContainer) {
        filtersContainer.addEventListener('click', (e) => {
            if (e.target.closest('.filter-chip')) {
                const btn = e.target.closest('.filter-chip');
                // Use data-category (original name) for filtering
                const selectedCategory = btn.dataset.category || btn.textContent;

                // Update UI
                filtersContainer.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('filter-chip--active'));
                btn.classList.add('filter-chip--active');

                // Filter
                if (selectedCategory === 'Todos') {
                    currentCategory = 'Todos';
                    showHomeView();
                    renderCatalog(products);
                } else {
                    currentCategory = selectedCategory;
                    // showCategoryView(selectedCategory); // Keeping simple view
                    const filtered = products.filter(p => p.category === selectedCategory);
                    renderCatalog(filtered);
                }
            }
        });
    }


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

    loadContentConfig();
}

async function loadContentConfig() {
    try {
        const { data, error } = await supabase
            .from('site_config')
            .select('*')
            .limit(1)
            .single();

        if (data) {
            // Load Hero Image
            if (data.hero_image_url) {
                const heroImg = document.querySelector('.hero__image');
                if (heroImg) {
                    heroImg.style.backgroundImage = `url('${data.hero_image_url}')`;
                    heroImg.style.backgroundSize = 'cover';
                    heroImg.style.backgroundPosition = 'center';
                }
            }

            // Ensure Lucide icons are rendered (especially if badge translation contains one)
            if (window.lucide) window.lucide.createIcons();
        }
    } catch (err) {
        console.error('Error loading content config:', err);
    }
}

function filterProducts(category) {
    currentCategory = category || 'Todos';

    // Update UI active state if function called manually (e.g. from URL)
    const chips = document.querySelectorAll('.filter-chip');
    chips.forEach(c => {
        if (c.dataset.category === currentCategory) {
            c.classList.add('filter-chip--active');
        } else {
            c.classList.remove('filter-chip--active');
        }
    });

    // Special case for "Todos"
    if (currentCategory === 'Todos') {
        // Reset UI to 'Todos' if necessary
        const allChip = Array.from(chips).find(c => c.dataset.category === 'Todos');
        if (allChip) {
            chips.forEach(c => c.classList.remove('filter-chip--active'));
            allChip.classList.add('filter-chip--active');
        }
        showHomeView();
        renderCatalog(products);
        return;
    }

    // We want to KEEP the home view (Hero, Trust Bar) even when filtering
    // showCategoryView(currentCategory); <--- REMOVED
    showHomeView();

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

let catalogScrollManager = null;

function renderCatalog(items) {
    const grid = document.getElementById('catalog-grid');
    if (!grid) return;

    if (!items || items.length === 0) {
        grid.innerHTML = `<p class="col-span-full text-center py-12 text-gray-500" data-i18n="msg.no_products_category">${i18n.t('msg.no_products_category')}</p>`;
        return;
    }

    // Initialize scroll manager
    if (catalogScrollManager) {
        catalogScrollManager.disconnect();
    }
    catalogScrollManager = new InfiniteScrollManager(items, 24);

    // Clear grid and load first page
    grid.innerHTML = '';
    const firstBatch = catalogScrollManager.loadMore();
    grid.innerHTML = firstBatch.map(product => createProductCard(product)).join('');

    // Create or get sentinel and loading indicator
    let sentinel = document.getElementById('catalog-scroll-sentinel');
    let loadingIndicator = document.getElementById('catalog-loading-more');

    if (!sentinel) {
        sentinel = document.createElement('div');
        sentinel.id = 'catalog-scroll-sentinel';
        sentinel.style.height = '1px';
        grid.parentElement.appendChild(sentinel);
    }

    if (!loadingIndicator) {
        loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'catalog-loading-more';
        loadingIndicator.style.cssText = 'display: none; text-align: center; padding: 20px;';
        loadingIndicator.innerHTML = Array(4).fill(0).map(() => createSkeletonCard()).join('');
        grid.parentElement.appendChild(loadingIndicator);
    }

    // Setup infinite scroll
    catalogScrollManager.setupObserver(sentinel, () => {
        if (!catalogScrollManager.hasMore()) return;

        // Show loading indicator
        loadingIndicator.style.display = 'grid';
        loadingIndicator.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
        loadingIndicator.style.gap = '24px';

        // Simulate slight delay for better UX
        setTimeout(() => {
            const newBatch = catalogScrollManager.loadMore();
            const newCards = newBatch.map(product => createProductCard(product)).join('');
            grid.insertAdjacentHTML('beforeend', newCards);

            // Hide loading indicator
            loadingIndicator.style.display = 'none';

            // Re-init icons
            if (window.lucide) window.lucide.createIcons();

            // Attach listeners to new cards
            attachCatalogListeners(grid);
        }, 300);
    });

    // Re-init icons
    if (window.lucide) window.lucide.createIcons();

    // Add Event Listeners
    attachCatalogListeners(grid);
}

function attachCatalogListeners(grid) {
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
