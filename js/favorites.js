
import { loadComponents, updateNavbarAuth, updateNavbarCartCount, createProductCard, createSkeletonCard } from './components.js';
import { fetchFavoriteProducts, getUser, onAuthStateChange } from './api.js';
import { state, loadCart, getCartCount, loadFavorites, loadPurchases } from './state.js';
import { InfiniteScrollManager } from './utils.js';

async function init() {
    // 1. Init User State early to prevent flickering
    const user = await getUser();

    // 2. Load Navbar/Footer
    await loadComponents(user);

    // Show skeletons immediately
    const grid = document.getElementById('favorites-grid');
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
    if (grid) {
        grid.style.display = 'grid'; // Ensure grid is visible
        grid.innerHTML = Array(4).fill(0).map(() => createSkeletonCard()).join('');
    }

    // Auth Check
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    await loadCart(user);
    updateNavbarCartCount(getCartCount());
    await loadFavorites(user);
    await loadPurchases(user); // Load purchases to update button states (e.g. "Comprado")

    await renderFavorites(user);
    setupAuthListener();

    window.addEventListener('cart-updated', () => {
        updateNavbarCartCount(getCartCount());
    });

    window.addEventListener('favorites-updated', async () => {
        // Re-render if favorites change (e.g. removed from card)
        const currentUser = await getUser();
        if (currentUser) await renderFavorites(currentUser);
    });
}

function setupAuthListener() {
    onAuthStateChange(async (event, session) => {
        if (!session) {
            window.location.href = 'index.html';
        }
    });
}

let favoritesScrollManager = null;

async function renderFavorites(user) {
    const grid = document.getElementById('favorites-grid');
    const emptyState = document.getElementById('empty-state');

    if (!grid) return;

    if (emptyState) emptyState.style.display = 'none';

    try {
        // Use local state IDs for immediate consistency (optimistic updates)
        const currentFavIds = Array.from(state.favorites);
        const products = await fetchFavoriteProducts(user.id, currentFavIds);

        if (products.length === 0) {
            grid.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        // Initialize scroll manager
        if (favoritesScrollManager) {
            favoritesScrollManager.disconnect();
        }
        favoritesScrollManager = new InfiniteScrollManager(products, 24);

        // Clear grid and load first page
        grid.style.display = 'grid';
        grid.innerHTML = '';
        const firstBatch = favoritesScrollManager.loadMore();
        grid.innerHTML = firstBatch.map(product => createProductCard(product)).join('');

        // Create or get sentinel and loading indicator
        let sentinel = document.getElementById('favorites-scroll-sentinel');
        let loadingIndicator = document.getElementById('favorites-loading-more');

        if (!sentinel) {
            sentinel = document.createElement('div');
            sentinel.id = 'favorites-scroll-sentinel';
            sentinel.style.height = '1px';
            grid.parentElement.appendChild(sentinel);
        }

        if (!loadingIndicator) {
            loadingIndicator = document.createElement('div');
            loadingIndicator.id = 'favorites-loading-more';
            loadingIndicator.style.cssText = 'display: none; text-align: center; padding: 20px;';
            loadingIndicator.innerHTML = Array(4).fill(0).map(() => createSkeletonCard()).join('');
            grid.parentElement.appendChild(loadingIndicator);
        }

        // Setup infinite scroll
        favoritesScrollManager.setupObserver(sentinel, () => {
            if (!favoritesScrollManager.hasMore()) return;

            // Show loading indicator
            loadingIndicator.style.display = 'grid';
            loadingIndicator.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
            loadingIndicator.style.gap = '24px';

            // Simulate slight delay for better UX
            setTimeout(() => {
                const newBatch = favoritesScrollManager.loadMore();
                const newCards = newBatch.map(product => createProductCard(product)).join('');
                grid.insertAdjacentHTML('beforeend', newCards);

                // Hide loading indicator
                loadingIndicator.style.display = 'none';

                // Re-init icons
                if (window.lucide) window.lucide.createIcons();

                // Attach listeners to new cards
                attachFavoriteListeners(grid, products);
            }, 300);
        });

        // Re-init lucide icons for new cards
        if (window.lucide) window.lucide.createIcons();

        // Add Event Listeners
        attachFavoriteListeners(grid, products);

    } catch (error) {
        console.error('Error rendering favorites:', error);
        grid.innerHTML = '<p>Error al cargar favoritos.</p>';
        grid.style.display = 'block';
    }
}

function attachFavoriteListeners(grid, products) {
    // Add to Cart
    grid.querySelectorAll('.btn-add-cart').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            const product = products.find(p => p.id === id);
            if (product) {
                import('./state.js').then(({ addToCart }) => {
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
                });
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
                const { addToCart } = await import('./state.js');
                await addToCart(product);
                window.location.href = 'checkout.html';
            }
        });
    });

    // Toggle Favorite (Remove from list)
    grid.querySelectorAll('.product-card__heart').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);

            // Optimistic UI Removal
            const card = btn.closest('.product-card');
            if (card) {
                card.style.transition = 'opacity 0.2s, transform 0.2s';
                card.style.opacity = '0';
                card.style.transform = 'scale(0.9)';
                setTimeout(() => card.remove(), 200);
            }

            const { toggleFavorite } = await import('./state.js');
            await toggleFavorite(id);
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
