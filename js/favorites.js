
import { loadComponents, updateNavbarAuth, updateNavbarCartCount, createProductCard } from './components.js';
import { fetchFavoriteProducts, getUser, onAuthStateChange } from './api.js';
import { state, loadCart, getCartCount, loadFavorites } from './state.js';

async function init() {
    await loadComponents();

    // Auth Check
    const user = await getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    updateNavbarAuth(user);
    await loadCart(user);
    updateNavbarCartCount(getCartCount());
    await loadFavorites(user);

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

async function renderFavorites(user) {
    const grid = document.getElementById('favorites-grid');
    const loading = document.getElementById('loading');
    const emptyState = document.getElementById('empty-state');

    if (!grid) return;

    // Show loading
    grid.style.display = 'none';
    if (loading) loading.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';

    try {
        const products = await fetchFavoriteProducts(user.id);

        if (loading) loading.style.display = 'none';

        if (products.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        grid.style.display = 'flex';
        grid.innerHTML = products.map(product => createProductCard(product)).join('');

        // Re-init lucide icons for new cards
        if (window.lucide) window.lucide.createIcons();

        // Add Event Listeners
        // Add to Cart
        grid.querySelectorAll('.btn-add-cart').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(btn.dataset.id);
                // We need the full product object here. 
                // Since we don't have a global 'products' array like home.js easily accessible in this scope without re-fetching or passing it,
                // let's rely on the fact that we just rendered 'products' variable.
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
                const { toggleFavorite } = await import('./state.js');
                await toggleFavorite(id);
                // logic in init() listens for 'favorites-updated' and re-renders
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

    } catch (error) {
        console.error('Error rendering favorites:', error);
        if (loading) loading.style.display = 'none';
        grid.innerHTML = '<p>Error al cargar favoritos.</p>';
        grid.style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', init);
