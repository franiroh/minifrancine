
import { loadComponents, updateNavbarAuth, updateNavbarCartCount } from './components.js';
import { fetchProducts, getUser, onAuthStateChange } from './api.js';
import { state, loadCart, getCartCount, addToCart, loadFavorites, isFavorite, toggleFavorite } from './state.js';
import { getUrlParam, renderBreadcrumbs } from './utils.js';

let currentProduct = null;

async function init() {
    await loadComponents();

    const user = await getUser();
    updateNavbarAuth(user);

    await loadCart(user);
    updateNavbarCartCount(getCartCount());

    await loadFavorites(user);

    const productId = getUrlParam('id');
    if (!productId) {
        window.location.href = 'index.html';
        return;
    }

    const products = await fetchProducts();
    currentProduct = products.find(p => p.id == productId);

    if (!currentProduct) {
        document.querySelector('.detail').innerHTML = '<h1>Producto no encontrado</h1>';
        return;
    }

    renderProduct();
    renderProductBreadcrumbs();
    setupListeners();
    setupAuthListener();

    window.addEventListener('cart-updated', () => {
        updateNavbarCartCount(getCartCount());
    });
}

function renderProductBreadcrumbs() {
    const placeholder = document.getElementById('breadcrumbs-placeholder');
    if (placeholder && currentProduct) {
        placeholder.innerHTML = renderBreadcrumbs([
            { label: 'Inicio', href: 'index.html' },
            { label: 'Categorías', href: 'categories.html' },
            { label: currentProduct.category, href: `index.html?category=${encodeURIComponent(currentProduct.category)}` },
            { label: currentProduct.title, href: null }
        ]);
    }
}

function setupAuthListener() {
    onAuthStateChange(async (event, session) => {
        const user = session ? session.user : null;
        updateNavbarAuth(user);
        await loadFavorites(user);
        updateFavoriteButton();
    });
}

function renderProduct() {
    const p = currentProduct;

    // Images
    const img = document.getElementById('detail-img');
    const thumb = document.getElementById('detail-thumb');

    if (img) img.style.background = p.imageColor; // Using color as placeholder for now
    if (thumb) thumb.style.background = p.imageColor;

    // Info
    document.title = `${p.title} — PatchFiles`;
    setText('detail-category', p.category);
    setText('detail-category-crumb', p.category);
    setText('detail-title', p.title);
    setText('detail-title-crumb', p.title);
    setText('detail-desc', p.description || 'Sin descripción.');
    setText('detail-price', `$${p.price}`);

    setText('detail-size', p.size);
    setText('detail-stitches', p.stitches);
    setText('detail-formats', p.formats);

    // Button
    const btn = document.getElementById('detail-add-btn');
    if (btn) {
        btn.innerHTML = `<i class="icon lucide-shopping-cart"></i> Agregar al Carrito — $${p.price}`;
    }

    updateFavoriteButton();
}

function updateFavoriteButton() {
    const btn = document.getElementById('detail-fav-btn');
    if (!btn || !currentProduct) return;

    if (isFavorite(currentProduct.id)) {
        btn.innerHTML = `<i class="icon lucide-heart" style="fill: #FF6B6B; color: #FF6B6B;"></i> Quitar de Favoritos`;
    } else {
        btn.innerHTML = `<i class="icon lucide-heart"></i> Agregar a Favoritos`;
    }

    if (window.lucide) window.lucide.createIcons();
}

function setupListeners() {
    const addBtn = document.getElementById('detail-add-btn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            if (currentProduct) {
                addToCart(currentProduct);
                const originalText = addBtn.innerHTML;
                addBtn.textContent = '¡Agregado!';
                addBtn.classList.add('text-green');
                setTimeout(() => {
                    addBtn.innerHTML = originalText;
                    addBtn.classList.remove('text-green');
                }, 1000);
            }
        });
    }

    const favBtn = document.getElementById('detail-fav-btn');
    if (favBtn) {
        favBtn.addEventListener('click', async () => {
            if (currentProduct) {
                await toggleFavorite(currentProduct.id);
                updateFavoriteButton();
            }
        });
    }
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

document.addEventListener('DOMContentLoaded', init);
