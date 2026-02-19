
import { loadComponents, updateNavbarAuth, updateNavbarCartCount } from './components.js';
import { fetchProductById, fetchProductImages, getUser, onAuthStateChange, downloadProductFile, fetchProductReviews, fetchUserReview } from './api.js';
import { state, loadCart, getCartCount, addToCart, loadFavorites, isFavorite, toggleFavorite, loadPurchases, isPurchased } from './state.js';
import { getUrlParam, renderBreadcrumbs, escapeHtml, showToast, getBadgeKey } from './utils.js';
import i18n from './i18n.js';

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
        document.querySelector('.detail').innerHTML = `<h1>${i18n.t('product.not_found')}</h1>`;
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

    window.addEventListener('language-changed', () => {
        if (currentProduct) {
            renderProduct();
            renderProductBreadcrumbs();
            // Also re-render reviews?
            // loadAndRenderReviews(currentProduct.id); // Maybe not strictly needed if reviews are just text, but dates might need formatting. 
            // Let's leave reviews for now as they might be user content (except for "Anonymous" etc).
        }
    });
}

function renderProductBreadcrumbs() {
    const placeholder = document.getElementById('breadcrumbs-placeholder');
    if (placeholder && currentProduct) {
        // Resolve translated category name
        const transKey = `category.${currentProduct.categoryId}`;
        const translatedCat = i18n.t(transKey);
        const categoryLabel = translatedCat === transKey ? currentProduct.category : translatedCat;

        placeholder.innerHTML = renderBreadcrumbs([
            { label: i18n.t('nav.home'), href: 'index.html' },
            { label: i18n.t('nav.catalog'), href: 'categories.html' },
            { label: categoryLabel, href: `catalog.html?category=${encodeURIComponent(currentProduct.category)}` },
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
            await renderProduct(); // re-render buttons
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

    const dotsContainer = document.getElementById('detail-slider-dots');
    if (img) {
        img.style.background = p.imageColor;
        if (images.length > 0) {
            img.innerHTML = images.map((url, i) =>
                `<img src="${url}" alt="${p.title}" class="detail__main-img-el ${i === 0 ? 'detail__main-img-el--active' : ''}" data-index="${i}">`
            ).join('');
        }

        // Setup dots for mobile/tablet slider
        if (dotsContainer) {
            if (images.length > 1) {
                dotsContainer.innerHTML = images.map((_, i) =>
                    `<div class="detail__slider-dot ${i === 0 ? 'detail__slider-dot--active' : ''}" data-index="${i}"></div>`
                ).join('');

                // Sync scroll with dots
                img.onscroll = () => {
                    const scrollPos = img.scrollLeft;
                    const width = img.offsetWidth;
                    const index = Math.round(scrollPos / width);
                    const dots = dotsContainer.querySelectorAll('.detail__slider-dot');
                    dots.forEach((dot, i) => {
                        dot.classList.toggle('detail__slider-dot--active', i === index);
                    });
                };

                // Click to scroll
                dotsContainer.onclick = (e) => {
                    const dot = e.target.closest('.detail__slider-dot');
                    if (dot) {
                        const index = parseInt(dot.dataset.index);
                        const width = img.offsetWidth;
                        img.scrollTo({ left: index * width, behavior: 'smooth' });
                    }
                };
            } else {
                dotsContainer.innerHTML = '';
            }
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

            // Update Main Image (Desktop logic: hide/show)
            const mainImages = img.querySelectorAll('.detail__main-img-el');
            mainImages.forEach(mi => mi.classList.remove('detail__main-img-el--active'));
            if (mainImages[index]) mainImages[index].classList.add('detail__main-img-el--active');

            // Update Thumbs
            thumbsContainer.querySelectorAll('.detail__thumb').forEach(t => t.classList.remove('detail__thumb--active'));
            thumb.classList.add('detail__thumb--active');
        });
    }

    // Info
    document.title = `${p.title} — MiniFrancine`;

    // Make category clickable
    const catEl = document.getElementById('detail-category');
    if (catEl) {
        const transKey = `category.${p.categoryId}`;
        const translatedCat = i18n.t(transKey);
        const categoryLabel = translatedCat === transKey ? p.category : translatedCat;

        catEl.innerHTML = `<a href="catalog.html?category=${encodeURIComponent(p.category)}" style="color:inherit; text-decoration:none; transition:opacity 0.2s;">${escapeHtml(categoryLabel)}</a>`;
        catEl.querySelector('a').onmouseover = e => e.target.style.opacity = '0.7';
        catEl.querySelector('a').onmouseout = e => e.target.style.opacity = '1';
    }

    // setText('detail-category-crumb', p.category); // Removed as we use Breadcrumb component
    // setText('detail-title-crumb', p.title); // Removed as we use Breadcrumb component

    // Set text logic for simple IDs
    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    setText('detail-title', p.title);

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
            const bKey = 'badge.' + getBadgeKey(p.badge);
            const bTrans = i18n.t(bKey);
            badgeEl.textContent = bTrans;
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

    // Discount Logic
    const price = parseFloat(p.price);
    const oldPrice = parseFloat(p.oldPrice || p.old_price);
    const hasDiscount = oldPrice > price;
    const discountPerc = hasDiscount ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;

    const priceHtml = hasDiscount
        ? `<div class="detail__price-column">
             <span class="detail__price-current">USD ${price.toFixed(2)}</span>
             <div class="detail__discount-row">
                <span class="detail__price-old" style="text-decoration: line-through; color: #9CA3AF; margin-right: 8px;">USD ${oldPrice.toFixed(2)}</span>
                <span class="detail__discount-badge" style="background: #FEE2E2; color: #EF4444; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 14px;">-${discountPerc}%</span>
             </div>
           </div>`
        : `<span id="detail-price" class="detail__price-current">USD ${price.toFixed(2)}</span>`;

    const priceContainer = document.querySelector('.detail__price');
    if (priceContainer) {
        priceContainer.innerHTML = priceHtml;
    }
    // setText('detail-price', `USD ${p.price}`); // Removed as we handle HTML manually above

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
        const reviewText = reviewCount === 1 ? i18n.t('product.review') : i18n.t('product.reviews');
        ratingContainer.innerHTML = `
            ${starsHtml}
            <span class="detail__rating-text">${rating.toFixed(1)} (${reviewCount} ${reviewText})</span>
        `;
    }

    // Buttons — conditional rendering based on purchased state
    const purchased = isPurchased(p.id);
    const addBtn = document.getElementById('detail-add-btn');
    const buyBtn = document.getElementById('detail-buy-btn');

    if (purchased) {
        if (addBtn) {
            addBtn.innerHTML = `<i data-lucide="download"></i> ${i18n.t('product.download')}`;
            addBtn.className = 'btn btn--purchased-download btn--block btn--lg';
            addBtn.id = 'detail-download-btn';
            addBtn.removeAttribute('data-i18n'); // Remove static i18n if present

            // Re-attach download listener if replaced
            addBtn.replaceWith(addBtn.cloneNode(true)); // Clear old listeners
            const newDlBtn = document.getElementById('detail-download-btn');
            newDlBtn.addEventListener('click', handleDownload);
        }
        if (buyBtn) {
            buyBtn.innerHTML = `<i data-lucide="check-circle"></i> ${i18n.t('btn.purchased')}`;
            buyBtn.disabled = true;
            buyBtn.className = 'btn btn--purchased-indicator btn--block btn--lg';
            buyBtn.removeAttribute('data-i18n');
        }
    } else {
        if (addBtn) {
            // Reset class if it was changed
            addBtn.className = 'btn btn--outline btn--block btn--lg';
            addBtn.id = 'detail-add-btn'; // restore ID
            addBtn.innerHTML = `<i data-lucide="shopping-cart"></i> ${i18n.t('btn.add_cart')}`;
            addBtn.setAttribute('data-i18n', 'btn.add_cart');
        }
        if (buyBtn) {
            buyBtn.className = 'btn btn--primary btn--block btn--lg';
            buyBtn.disabled = false;
            buyBtn.innerHTML = `<i data-lucide="zap"></i> ${i18n.t('btn.buy_now')}`;
            buyBtn.setAttribute('data-i18n', 'btn.buy_now');
        }
    }

    if (window.lucide) window.lucide.createIcons();
    updateFavoriteButton();
}

async function handleDownload() {
    const btn = document.getElementById('detail-download-btn');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="loader"></i> ${i18n.t('product.preparing_download')}`;
    btn.disabled = true;
    showToast(i18n.t('product.preparing_download'), 'info');
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
            showToast(i18n.t('product.download_started'), 'success');
        } else {
            showToast(i18n.t('product.download_unavailable'), 'error');
        }
    } catch (err) {
        console.error('Download error:', err);
        showToast(i18n.t('product.download_error'), 'error');
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
                        <p style="margin-bottom: 12px; font-weight: 500;">${i18n.t('product.reviews.purchased_question') || '¿Compraste este producto?'}</p>
                        <a href="orders.html" class="btn btn--white btn--sm">
                           <i data-lucide="star"></i> ${i18n.t('product.reviews.write')}
                        </a>
                    </div>
                 `;
            } else {
                ctaHtml = `
                    <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
                        <p style="margin-bottom: 12px; font-weight: 500;">${i18n.t('product.reviews.already_rated') || 'Ya calificaste este producto.'}</p>
                        <a href="orders.html" class="btn btn--white btn--sm">
                           ${i18n.t('product.reviews.view_my_review') || 'Ver mi reseña en Mis Compras'}
                        </a>
                    </div>
                 `;
            }
        }

        if (reviews.length === 0) {
            container.innerHTML = `
                ${ctaHtml}
                <p style="color: #6B7280; font-style: italic;">${i18n.t('product.reviews.empty')}</p>
            `;
        } else {
            const reviewsList = reviews.map(review => {
                const date = new Date(review.created_at).toLocaleDateString(i18n.currentLang === 'es' ? 'es-ES' : 'en-US');
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
