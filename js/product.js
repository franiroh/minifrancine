
import { loadComponents, updateNavbarAuth, updateNavbarCartCount } from './components.js';
import { fetchProductById, fetchProductImages, getUser, onAuthStateChange, downloadProductFile } from './api.js';
import { state, loadCart, getCartCount, addToCart, loadFavorites, isFavorite, toggleFavorite, loadPurchases, isPurchased } from './state.js';
import { getUrlParam, renderBreadcrumbs } from './utils.js';

let currentProduct = null;

async function init() {
    await loadComponents();

    const user = await getUser();
    updateNavbarAuth(user);

    await loadCart(user);
    updateNavbarCartCount(getCartCount());

    await loadFavorites(user);
    await loadPurchases(user);

    const productId = getUrlParam('id');
    if (!productId) {
        window.location.href = 'index.html';
        return;
    }

    currentProduct = await fetchProductById(productId);

    if (!currentProduct) {
        document.querySelector('.detail').innerHTML = '<h1>Producto no encontrado</h1>';
        return;
    }

    await renderProduct();
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
        await loadPurchases(user);
        updateFavoriteButton();
    });
}

async function renderProduct() {
    const p = currentProduct;

    // Images — fetch gallery from product_images table
    const img = document.getElementById('detail-img');
    const thumbsContainer = document.getElementById('detail-thumbs');
    const galleryImages = await fetchProductImages(p.id);

    // Build image list: use gallery if available, fall back to mainImage
    const images = galleryImages.length > 0
        ? galleryImages.map(gi => gi.public_url)
        : (p.mainImage ? [p.mainImage] : []);

    if (img) {
        img.style.background = p.imageColor;
        if (images.length > 0) {
            img.innerHTML = `<img src="${images[0]}" alt="${p.title}" class="detail__main-img-el">`;
        }
    }

    if (thumbsContainer && images.length > 1) {
        thumbsContainer.innerHTML = images.map((url, i) =>
            `<div class="detail__thumb ${i === 0 ? 'detail__thumb--active' : ''}" data-index="${i}">
                <img src="${url}" alt="${p.title}" class="detail__thumb-img-el">
            </div>`
        ).join('');

        thumbsContainer.addEventListener('click', (e) => {
            const thumb = e.target.closest('.detail__thumb');
            if (!thumb) return;
            const index = Number(thumb.dataset.index);
            img.innerHTML = `<img src="${images[index]}" alt="${p.title}" class="detail__main-img-el">`;
            thumbsContainer.querySelectorAll('.detail__thumb').forEach(t => t.classList.remove('detail__thumb--active'));
            thumb.classList.add('detail__thumb--active');
        });
    }

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

    // Buttons — conditional rendering based on purchased state
    const purchased = isPurchased(p.id);
    const addBtn = document.getElementById('detail-add-btn');
    const buyBtn = document.getElementById('detail-buy-btn');

    if (purchased) {
        if (addBtn) {
            addBtn.innerHTML = `<i data-lucide="download"></i> Descargar Archivos`;
            addBtn.className = 'btn btn--purchased-download btn--block btn--lg';
            addBtn.id = 'detail-download-btn';
        }
        if (buyBtn) {
            buyBtn.innerHTML = `<i data-lucide="check-circle"></i> Ya Comprado`;
            buyBtn.disabled = true;
            buyBtn.className = 'btn btn--purchased-indicator btn--block btn--lg';
        }
    } else {
        if (addBtn) {
            addBtn.innerHTML = `<i class="icon lucide-shopping-cart"></i> Agregar al Carrito`;
        }
        if (buyBtn) {
            buyBtn.innerHTML = `<i class="icon lucide-zap"></i> Comprar Ahora — $${p.price}`;
        }
    }

    if (window.lucide) window.lucide.createIcons();
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
    const purchased = isPurchased(currentProduct?.id);

    if (purchased) {
        // Download button (replaced add-to-cart)
        const downloadBtn = document.getElementById('detail-download-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', async () => {
                const originalHTML = downloadBtn.innerHTML;
                downloadBtn.innerHTML = `<i data-lucide="loader"></i> Preparando descarga...`;
                downloadBtn.disabled = true;
                if (window.lucide) window.lucide.createIcons();
                try {
                    const result = await downloadProductFile(currentProduct.id);
                    if (result && result.url) {
                        const link = document.createElement('a');
                        link.href = result.url;
                        link.download = result.filename || currentProduct.title + '.zip';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    } else {
                        alert('El archivo digital para este producto no está disponible todavía.');
                    }
                } catch (err) {
                    console.error('Download error:', err);
                    alert('Error al generar el enlace de descarga.');
                } finally {
                    downloadBtn.innerHTML = originalHTML;
                    downloadBtn.disabled = false;
                    if (window.lucide) window.lucide.createIcons();
                }
            });
        }
    } else {
        // Add to Cart
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

        // Buy Now
        const buyBtn = document.getElementById('detail-buy-btn');
        if (buyBtn) {
            buyBtn.addEventListener('click', async () => {
                if (currentProduct) {
                    await addToCart(currentProduct);
                    window.location.href = 'checkout.html';
                }
            });
        }
    }

    // Favorite button (always active)
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
