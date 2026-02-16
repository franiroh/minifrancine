
import { loadComponents, updateNavbarAuth, updateNavbarCartCount } from './components.js';
import { fetchProductById, fetchProductImages, getUser, onAuthStateChange, downloadProductFile, fetchProductReviews, fetchUserReview } from './api.js';
import { state, loadCart, getCartCount, addToCart, loadFavorites, isFavorite, toggleFavorite, loadPurchases, isPurchased } from './state.js';
import { getUrlParam, renderBreadcrumbs, escapeHtml, showToast } from './utils.js';

let currentProduct = null;
let currentUser = null;

async function init() {
    await loadComponents();

    currentUser = await getUser();
    updateNavbarAuth(currentUser);

    await loadCart(currentUser);
    updateNavbarCartCount(getCartCount());

    await loadFavorites(currentUser);
    await loadPurchases(currentUser);

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
    loadAndRenderReviews(currentProduct.id); // Load reviews separately

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
            { label: currentProduct.category, href: `catalog.html?category=${encodeURIComponent(currentProduct.category)}` },
            { label: currentProduct.title, href: null }
        ]);
    }
}

function setupAuthListener() {
    onAuthStateChange(async (event, session) => {
        const user = session ? session.user : null;
        currentUser = user; // Update local user ref
        updateNavbarAuth(user);
        await loadFavorites(user);
        await loadPurchases(user);
        updateFavoriteButton();
        // Refresh buttons and reviews mainly to check 'purchased' state
        if (currentProduct) {
            renderProduct(); // re-render buttons
            loadAndRenderReviews(currentProduct.id); // re-render reviews (maybe user added one)
        }
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
    document.title = `${p.title} — MiniFrancine`;

    // Make category clickable
    const catEl = document.getElementById('detail-category');
    if (catEl) {
        catEl.innerHTML = `<a href="catalog.html?category=${encodeURIComponent(p.category)}" style="color:inherit; text-decoration:none; transition:opacity 0.2s;">${p.category}</a>`;
        catEl.querySelector('a').onmouseover = e => e.target.style.opacity = '0.7';
        catEl.querySelector('a').onmouseout = e => e.target.style.opacity = '1';
    }

    setText('detail-category-crumb', p.category);
    setText('detail-title', p.title);
    setText('detail-title-crumb', p.title);

    // Badge logic
    const titleEl = document.getElementById('detail-title');
    if (titleEl) {
        // Remove existing badge if any (for re-renders)
        const existingBadge = titleEl.nextElementSibling;
        if (existingBadge && existingBadge.classList.contains('detail__badge')) {
            existingBadge.remove();
        }

        if (p.badge) {
            const badgeEl = document.createElement('div');
            badgeEl.className = 'detail__badge';
            badgeEl.textContent = p.badge;
            badgeEl.style.backgroundColor = p.badgeColor || '#000';
            titleEl.insertAdjacentElement('afterend', badgeEl);
        }
    }

    setText('detail-desc', p.description || 'Sin descripción.');

    // Tags
    const tagsContainer = document.getElementById('detail-tags');
    if (tagsContainer) {
        tagsContainer.innerHTML = '';
        if (p.tags && p.tags.length > 0) {
            p.tags.forEach(tag => {
                const tagEl = document.createElement('a'); // Changed to <a>
                tagEl.href = `catalog.html?tag=${encodeURIComponent(tag)}`; // Link to catalog
                tagEl.className = 'detail__tag';
                tagEl.textContent = tag;
                tagsContainer.appendChild(tagEl);
            });
        }
    }

    setText('detail-price', `USD ${p.price}`);

    // Specs
    setText('detail-size', p.size);
    setText('detail-color-count', p.colorCount || '-');
    setText('detail-color-change-count', p.colorChangeCount || '-');
    setText('detail-stitches', p.stitches ? Number(p.stitches).toLocaleString('en-US') : '');
    setText('detail-formats', p.formats);

    // Rating Header
    const ratingContainer = document.querySelector('.detail__rating');
    const rating = parseFloat(p.rating) || 0;
    const reviewCount = parseInt(p.reviews) || 0;

    if (ratingContainer) {
        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= Math.round(rating)) {
                starsHtml += `<i data-lucide="star" class="detail__star detail__star--filled" style="fill: #F59E0B; color: #F59E0B;"></i>`;
            } else {
                starsHtml += `<i data-lucide="star" class="detail__star" style="color: #D1D5DB;"></i>`;
            }
        }
        ratingContainer.innerHTML = `
            ${starsHtml}
            <span class="detail__rating-text">${rating.toFixed(1)} (${reviewCount} ${reviewCount === 1 ? 'reseña' : 'reseñas'})</span>
        `;
    }

    // Buttons — conditional rendering based on purchased state
    const purchased = isPurchased(p.id);
    const addBtn = document.getElementById('detail-add-btn');
    const buyBtn = document.getElementById('detail-buy-btn');

    if (purchased) {
        if (addBtn) {
            addBtn.innerHTML = `<i data-lucide="download"></i> Descargar Archivos`;
            addBtn.className = 'btn btn--purchased-download btn--block btn--lg';
            addBtn.id = 'detail-download-btn';

            // Re-attach download listener if replaced
            addBtn.replaceWith(addBtn.cloneNode(true)); // Clear old listeners
            const newDlBtn = document.getElementById('detail-download-btn');
            newDlBtn.addEventListener('click', handleDownload);
        }
        if (buyBtn) {
            buyBtn.innerHTML = `<i data-lucide="check-circle"></i> Ya Comprado`;
            buyBtn.disabled = true;
            buyBtn.className = 'btn btn--purchased-indicator btn--block btn--lg';
        }
    } else {
        if (addBtn) {
            // Reset class if it was changed
            addBtn.className = 'btn btn--outline btn--block btn--lg';
            addBtn.id = 'detail-add-btn'; // restore ID
            addBtn.innerHTML = `<i data-lucide="shopping-cart"></i> Agregar al Carrito`;
        }
        if (buyBtn) {
            buyBtn.className = 'btn btn--primary btn--block btn--lg';
            buyBtn.disabled = false;
            buyBtn.innerHTML = `<i data-lucide="zap"></i> Comprar Ahora`;
        }
    }

    if (window.lucide) window.lucide.createIcons();
    updateFavoriteButton();
}

async function handleDownload() {
    const btn = document.getElementById('detail-download-btn');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="loader"></i> Preparando descarga...`;
    btn.disabled = true;
    showToast('Preparando descarga...', 'info');
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
            showToast('Descarga iniciada.', 'success');
        } else {
            showToast('El archivo digital para este producto no está disponible todavía.', 'error');
        }
    } catch (err) {
        console.error('Download error:', err);
        showToast('Error al generar el enlace de descarga.', 'error');
    } finally {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
        if (window.lucide) window.lucide.createIcons();
    }
}


function updateFavoriteButton() {
    const btn = document.getElementById('detail-fav-btn');
    if (!btn || !currentProduct) return;

    const icon = btn.querySelector('svg') || btn.querySelector('i');

    if (isFavorite(currentProduct.id)) {
        btn.classList.add('detail__heart--active');
        if (icon) {
            icon.setAttribute('fill', '#FF6B6B');
            icon.style.fill = '#FF6B6B';
            icon.style.color = '#FF6B6B';
        }
    } else {
        btn.classList.remove('detail__heart--active');
        if (icon) {
            icon.setAttribute('fill', 'none');
            icon.style.fill = 'none';
            icon.style.color = '#FF6B6B'; // Keep outline red
        }
    }
}

function setupListeners() {
    // Only setup static listeners here (like fav). 
    // Dynamic buttons (buy/download) are handled in renderProduct due to state changes.

    // Favorite button (always active)
    const favBtn = document.getElementById('detail-fav-btn');
    if (favBtn) {
        favBtn.addEventListener('click', async (e) => {
            e.stopPropagation(); // prevent bubbling if needed
            if (currentProduct) {
                await toggleFavorite(currentProduct.id);
                updateFavoriteButton();
            }
        });
    }

    // Add to Cart / Buy Now listeners (delegation or check existence)
    document.body.addEventListener('click', async (e) => {
        const addBtn = e.target.closest('#detail-add-btn');
        const buyBtn = e.target.closest('#detail-buy-btn');

        if (addBtn) {
            if (currentProduct) {
                addToCart(currentProduct);
                const originalText = addBtn.innerHTML;
                addBtn.textContent = '¡Agregado!';
                addBtn.classList.add('text-green');
                setTimeout(() => {
                    addBtn.innerHTML = originalText;
                    addBtn.classList.remove('text-green');
                    if (window.lucide) window.lucide.createIcons();
                }, 1000);
            }
        }

        if (buyBtn) {
            if (currentProduct) {
                await addToCart(currentProduct);
                window.location.href = 'checkout.html';
            }
        }
    });

}

async function loadAndRenderReviews(productId) {
    const container = document.getElementById('reviews-container');
    if (!container) return;

    try {
        const reviews = await fetchProductReviews(productId);
        const purchased = isPurchased(productId);

        let ctaHtml = '';
        if (purchased) {
            // Check if already reviewed
            const myReview = currentUser ? await fetchUserReview(currentUser.id, productId) : null;
            if (!myReview) {
                ctaHtml = `
                    <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
                        <p style="margin-bottom: 12px; font-weight: 500;">¿Compraste este producto?</p>
                        <a href="orders.html" class="btn btn--white btn--sm">
                           <i data-lucide="star"></i> Escribir una reseña
                        </a>
                    </div>
                 `;
            } else {
                ctaHtml = `
                    <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
                        <p style="margin-bottom: 12px; font-weight: 500;">Ya calificaste este producto.</p>
                        <a href="orders.html" class="btn btn--white btn--sm">
                           Ver mi reseña en Mis Compras
                        </a>
                    </div>
                 `;
            }
        }

        if (reviews.length === 0) {
            container.innerHTML = `
                ${ctaHtml}
                <p style="color: #6B7280; font-style: italic;">No hay reseñas todavía. ¡Sé el primero en opinar!</p>
            `;
        } else {
            const reviewsList = reviews.map(review => {
                const date = new Date(review.created_at).toLocaleDateString('es-ES');
                const author = review.profiles?.full_name || 'Usuario';
                let startHtml = '';
                for (let i = 1; i <= 5; i++) {
                    if (i <= review.rating) {
                        startHtml += `<i data-lucide="star" style="width: 16px; height: 16px; fill: #F59E0B; color: #F59E0B;"></i>`;
                    } else {
                        startHtml += `<i data-lucide="star" style="width: 16px; height: 16px; color: #E5E7EB;"></i>`;
                    }
                }

                return `
                    <div class="review-item" style="border-bottom: 1px solid #E5E7EB; padding: 16px 0;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                            <span style="font-weight: 600; font-size: 14px;">${escapeHtml(author)}</span>
                            <span style="color: #9CA3AF; font-size: 12px;">${date}</span>
                        </div>
                        <div style="display: flex; margin-bottom: 8px;">${startHtml}</div>
                        <p style="color: #4B5563; line-height: 1.5;">${escapeHtml(review.comment || '')}</p>
                    </div>
                `;
            }).join('');

            container.innerHTML = ctaHtml + reviewsList;
        }

        if (window.lucide) window.lucide.createIcons();

    } catch (error) {
        console.error('Error loading reviews:', error);
        container.innerHTML = '<p>Error al cargar las reseñas.</p>';
    }
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

document.addEventListener('DOMContentLoaded', init);
