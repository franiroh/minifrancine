
import { loadComponents, updateNavbarAuth, updateNavbarCartCount } from './components.js';
import { fetchProducts, getUser, onAuthStateChange } from './api.js';
import { state, loadCart, getCartCount, addToCart, loadFavorites, isFavorite, toggleFavorite } from './state.js';

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

    // 3. Fetch & Render Products
    products = await fetchProducts();
    renderCatalog();

    // 4. Setup Listeners
    setupAuthListener();

    // Listen for state updates from other components
    window.addEventListener('cart-updated', () => {
        updateNavbarCartCount(getCartCount());
    });

    window.addEventListener('favorites-updated', () => {
        renderCatalog(); // Re-render to update hearts
    });
}

function setupAuthListener() {
    onAuthStateChange(async (event, session) => {
        const user = session ? session.user : null;
        updateNavbarAuth(user);
        await loadFavorites(user);
        renderCatalog();
    });
}

function renderCatalog() {
    const grid = document.getElementById('catalog-grid');
    if (!grid) return;

    if (products.length === 0) {
        grid.innerHTML = '<p>No se encontraron productos.</p>';
        return;
    }

    grid.innerHTML = products.map(product => `
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
