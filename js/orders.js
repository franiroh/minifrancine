
import { loadComponents, updateNavbarAuth, updateNavbarCartCount } from './components.js';
import { getUser, onAuthStateChange, fetchMyOrders, downloadProductFile, fetchAllUserReviews, fetchUserReview, addReview, updateReview, deleteReview, fetchProductById, fetchProductImages, fetchPDFSettings, getSignedBundleUrl } from './api.js';
import { state, loadCart, getCartCount } from './state.js';
import { escapeHtml, sanitizeCssValue, showToast, showLoadingOverlay, hideLoadingOverlay } from './utils.js';
import i18n from './i18n.js';
import { generateProductBundle } from './pdf-export.js';

// ... (rest of imports)

let currentUser = null;

async function init() {
    // 1. Init User State early to prevent flickering
    currentUser = await getUser();

    // 2. Load Navbar/Footer
    await loadComponents(currentUser);

    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    await loadCart(currentUser);
    updateNavbarCartCount(getCartCount());

    onAuthStateChange((event, session) => {
        updateNavbarAuth(session ? session.user : null);
        if (!session) {
            window.location.href = 'login.html';
        } else {
            currentUser = session.user;
        }
    });

    window.addEventListener('cart-updated', () => {
        updateNavbarCartCount(getCartCount());
    });

    if (window.lucide) window.lucide.createIcons();

    loadOrders(currentUser.id);
    setupRatingModal();
}

async function loadOrders(userId) {
    const listContainer = document.getElementById('orders-list');

    try {
        const [orders, reviews] = await Promise.all([
            fetchMyOrders(userId),
            fetchAllUserReviews(userId)
        ]);

        const reviewsMap = {};
        if (reviews) {
            reviews.forEach(r => {
                reviewsMap[r.product_id] = r;
            });
        }

        if (!orders || orders.length === 0) {
            listContainer.innerHTML = `
                <div class="orders-empty">
                    <i data-lucide="shopping-bag"></i>
                    <p>${i18n.t('orders.empty')}</p>
                    <a href="index.html" class="btn btn--primary" style="margin-top: 8px;">${i18n.t('favorites.action')}</a>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        listContainer.innerHTML = orders.map(order => renderOrderCard(order, reviewsMap)).join('');
        if (window.lucide) window.lucide.createIcons();
        attachDownloadListeners();
        attachRatingListeners();

    } catch (error) {
        console.error("Error loading orders:", error);
        listContainer.innerHTML = `
            <div class="orders-empty">
                <p>${i18n.t('error.orders_load')}</p>
            </div>
        `;
    }
}

function renderOrderCard(order, reviewsMap = {}) {
    const date = new Date(order.created_at).toLocaleDateString('es-ES', {
        year: 'numeric', month: 'short', day: 'numeric'
    });

    const isPaid = order.status === 'paid';
    const statusClass = isPaid ? 'order-card__status--paid' : 'order-card__status--pending';
    const statusText = isPaid ? i18n.t('status.paid') : i18n.t('status.pending');

    let itemsHtml = '';
    if (order.order_items && order.order_items.length > 0) {
        itemsHtml = order.order_items.map(item => {
            const product = item.products || {};
            const title = product.title || i18n.t('orders.product_default');
            const mainImage = product.main_image || '';
            const imageColor = product.image_color || '#F3F4F6';
            const productId = parseInt(item.product_id);

            const thumbContent = mainImage
                ? `<img src="${escapeHtml(mainImage)}" alt="${escapeHtml(title)}" loading="lazy">`
                : `<i data-lucide="image" style="width:24px; height:24px; color:#D1D5DB;"></i>`;

            const downloadBtn = isPaid
                ? `<button class="order-item__download btn btn--sm btn--outline" data-id="${productId}" data-title="${escapeHtml(title)}" data-bundle="${product.bundled_zip_url || ''}" style="margin-right: 8px;">
                     <i data-lucide="download"></i> ${i18n.t('btn.download')}
                   </button>`
                : '';

            const userReview = reviewsMap[productId];
            let rateUi = '';

            if (isPaid) {
                if (userReview) {
                    // Show stars + Edit button
                    let starsHtml = '';
                    for (let i = 1; i <= 5; i++) {
                        if (i <= userReview.rating) {
                            starsHtml += `<i data-lucide="star" style="width: 14px; height: 14px; fill: #F59E0B; color: #F59E0B;"></i>`;
                        } else {
                            starsHtml += `<i data-lucide="star" style="width: 14px; height: 14px; color: #D1D5DB;"></i>`;
                        }
                    }
                    rateUi = `
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="display: flex; gap: 2px;">${starsHtml}</div>
                            <button class="order-item__rate btn btn--sm btn--link" data-id="${productId}" data-title="${escapeHtml(title)}">
                                Editar
                            </button>
                        </div>
                    `;
                } else {
                    // Show Rate button
                    rateUi = `
                        <button class="order-item__rate btn btn--sm btn--ghost" data-id="${productId}" data-title="${escapeHtml(title)}">
                             <i data-lucide="star"></i> Calificar
                        </button>
                    `;
                }
            }

            return `
            <div class="order-item">
                <div class="order-item__thumb" style="background: ${sanitizeCssValue(imageColor)};">
                    <a href="product.html?id=${productId}" style="display:block; height:100%;">
                        ${thumbContent}
                    </a>
                </div>
                <div class="order-item__info">
                    <div class="order-item__title">${escapeHtml(title)}</div>
                </div>
                
                <div class="order-item__actions-row">
                    <div class="order-item__col-rating">
                        ${rateUi}
                    </div>

                    <div class="order-item__col-download">
                        ${downloadBtn}
                    </div>
                </div>
                
                <div class="order-item__col-price">
                    USD ${parseFloat(item.price).toFixed(2)}
                </div>
            </div>
            `;
        }).join('');
    }

    return `
        <div class="order-card">
            <div class="order-card__header">
                <div class="order-card__meta">
                    <span class="order-card__id">#${order.id.slice(0, 8).toUpperCase()}</span>
                    <span class="order-card__status ${statusClass}">${statusText}</span>
                </div>
                <span class="order-card__date">
                    <i data-lucide="calendar"></i> ${date}
                </span>
            </div>

            <div class="order-card__items">
                ${itemsHtml}
            </div>

            <div class="order-card__footer">
                <div class="order-summary-row">
                    <span class="order-summary-label">${i18n.t('cart.subtotal')}</span>
                    <span class="order-summary-value">USD ${(parseFloat(order.total) + parseFloat(order.discount_amount || 0)).toFixed(2)}</span>
                </div>

                ${order.applied_coupon_code ? `
                <div class="order-summary-row order-summary-discount">
                    <span class="order-summary-label order-summary-discount">
                        <i data-lucide="tag" style="width: 12px; height: 12px; vertical-align: middle; margin-right: 4px;"></i>
                        ${i18n.t('cart.coupon_label')} <strong>${escapeHtml(order.applied_coupon_code)}</strong>
                    </span>
                    <span class="order-summary-value order-summary-discount">-USD ${parseFloat(order.discount_amount).toFixed(2)}</span>
                </div>
                ` : ''}

                <div class="order-summary-row order-summary-total">
                    <span class="order-summary-label">${i18n.t('cart.total')}</span>
                    <span class="order-summary-value">USD ${parseFloat(order.total).toFixed(2)}</span>
                </div>
            </div>
        </div>
    `;
}

function attachDownloadListeners() {
    document.querySelectorAll('.order-item__download').forEach(btn => {
        btn.addEventListener('click', async () => {
            const productId = parseInt(btn.dataset.id);
            const productTitle = btn.dataset.title;

            const originalHTML = btn.innerHTML;
            btn.innerHTML = `<i data-lucide="loader"></i> ${i18n.t('btn.downloading')}`;
            btn.disabled = true;
            if (window.lucide) window.lucide.createIcons();

            // Show persistent loading overlay
            showLoadingOverlay(i18n.t('btn.downloading'), i18n.t('msg.download_preparing'));
            const bundledPath = btn.dataset.bundle;

            try {
                if (bundledPath) {
                    // FAST PATH: Download pre-generated ZIP
                    const downloadName = `${productTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.zip`;
                    const signedUrl = await getSignedBundleUrl(bundledPath, downloadName);
                    if (signedUrl) {
                        const link = document.createElement('a');
                        link.href = signedUrl;
                        link.download = `${productTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.zip`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);

                        // Success!
                        hideLoadingOverlay();
                        btn.innerHTML = `<i data-lucide="check"></i> ${i18n.t('btn.downloaded')}`;
                        if (window.lucide) window.lucide.createIcons();
                        setTimeout(() => {
                            btn.innerHTML = originalHTML;
                            btn.disabled = false;
                            if (window.lucide) window.lucide.createIcons();
                        }, 2000);
                        return; // Exit fast path
                    }
                }

                // SLOW PATH: Generate on the fly
                // 1. Get Signed URLs for all files
                const signedFiles = await downloadProductFile(productId);

                // 2. Fetch full product data and images for PDF generation
                const product = await fetchProductById(productId);
                if (!product) {
                    throw new Error(i18n.t('error.product_not_found') || 'Producto no encontrado');
                }

                const images = await fetchProductImages(productId);
                const imageData = images ? images.map(img => img.public_url) : [];

                // 3. Prepare structured product record for PDF generator
                const productForPDF = {
                    ...product,
                    images: imageData,
                    meta: {
                        size: product.size || '-',
                        stitches: String(product.stitches || 0),
                        color_changes: String(product.colorChangeCount || 0),
                        colors_used: String(product.colorCount || 0)
                    }
                };

                // 4. Fetch Global PDF Settings
                const pdfSettings = await fetchPDFSettings();
                const settings = {
                    logo: pdfSettings.logo || 'MiniFrancine',
                    promo: pdfSettings.promo || '',
                    footer: pdfSettings.footer || 'MiniFrancine - Embroidery Designs'
                };

                await generateProductBundle(productForPDF, signedFiles, settings);

                // Success!
                hideLoadingOverlay();
                btn.innerHTML = `<i data-lucide="check"></i> ${i18n.t('btn.downloaded')}`;
                if (window.lucide) window.lucide.createIcons();
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.disabled = false;
                    if (window.lucide) window.lucide.createIcons();
                }, 2000);

            } catch (err) {
                console.error('Download error:', err);
                hideLoadingOverlay();
                const errMsg = err.message || i18n.t('error.download_link');
                showToast(errMsg, 'error');
                btn.innerHTML = originalHTML;
                btn.disabled = false;
                if (window.lucide) window.lucide.createIcons();
            }
        });
    });
}

// --- Rating Logic ---

function attachRatingListeners() {
    document.querySelectorAll('.order-item__rate').forEach(btn => {
        btn.addEventListener('click', async () => {
            const productId = parseInt(btn.dataset.id);
            const productTitle = btn.dataset.title;
            openRatingModal(productId, productTitle);
        });
    });
}

const modal = document.getElementById('rating-modal');
const closeModal = document.querySelector('.close-modal');
const ratingForm = document.getElementById('rating-form');
const ratingContainer = document.querySelector('.star-rating');
const ratingValueInput = document.getElementById('rating-value');
const deleteBtn = document.getElementById('delete-review-btn');
const charCount = document.getElementById('char-count');
const commentInput = document.getElementById('rating-comment');

function setupRatingModal() {
    // Character Count Listener
    if (commentInput && charCount) {
        commentInput.addEventListener('input', () => {
            charCount.textContent = commentInput.value.length;
        });
    }

    // Close modal
    closeModal.onclick = () => {
        modal.style.display = 'none';
    };
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };

    // Star clicking & Hover via Delegation
    ratingContainer.addEventListener('click', (e) => {
        const star = e.target.closest('[data-value]');
        if (star) {
            const value = parseInt(star.dataset.value);
            setRating(value);
        }
    });

    ratingContainer.addEventListener('mouseover', (e) => {
        const star = e.target.closest('[data-value]');
        if (star) {
            const value = parseInt(star.dataset.value);
            highlightStars(value);
        }
    });

    ratingContainer.addEventListener('mouseout', () => {
        const value = parseInt(ratingValueInput.value) || 0;
        highlightStars(value);
    });

    // Submit
    ratingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const productId = parseInt(document.getElementById('rating-product-id').value);
        const reviewId = document.getElementById('rating-review-id').value;
        const rating = parseInt(ratingValueInput.value);
        let comment = document.getElementById('rating-comment').value.trim();

        // 1. Validation: Rating Range
        if (!rating || rating < 1 || rating > 5) {
            showToast(i18n.t('msg.invalid_score'), 'error');
            return;
        }

        // 2. Validation: Comment Length
        if (comment.length > 1000) {
            showToast(i18n.t('msg.comment_limit'), 'error');
            return;
        }

        if (!rating) {
            showToast(i18n.t('msg.score_required'), 'error');
            return;
        }

        const submitBtn = ratingForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = i18n.t('btn.saving');

        let result;
        if (reviewId) {
            result = await updateReview(reviewId, rating, comment);
        } else {
            result = await addReview(currentUser.id, productId, rating, comment);
        }

        if (result.error) {
            showToast(i18n.t('error.rating_save'), 'error');
            console.error(result.error);
        } else {
            modal.style.display = 'none';
            showToast(i18n.t('msg.rating_saved'), 'success');
            // Reload orders to update buttons potentially (though state is ok)
            loadOrders(currentUser.id);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Guardar Calificación';
    });

    // Delete
    deleteBtn.addEventListener('click', async () => {
        if (!confirm('¿Estás seguro de que quieres eliminar tu reseña?')) return;

        const reviewId = document.getElementById('rating-review-id').value;
        const submitBtn = deleteBtn;
        submitBtn.disabled = true;
        submitBtn.textContent = i18n.t('btn.deleting');

        const result = await deleteReview(reviewId);

        if (result.error) {
            showToast(i18n.t('error.review_delete'), 'error');
            console.error(result.error);
        } else {
            modal.style.display = 'none';
            showToast(i18n.t('msg.review_deleted'), 'success');
            loadOrders(currentUser.id);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Eliminar';
        submitBtn.style.display = 'none'; // Hide again
    });
}

function setRating(value) {
    ratingValueInput.value = value;
    highlightStars(value);
}

function highlightStars(value) {
    // Re-query stars every time because Lucide replaces DOM elements
    const stars = ratingContainer.querySelectorAll('[data-value]');
    stars.forEach(star => {
        const starValue = parseInt(star.dataset.value);
        if (starValue <= value) {
            star.style.color = '#F59E0B'; // Gold/Yellow
            star.style.fill = '#F59E0B';
            star.setAttribute('fill', '#F59E0B'); // For SVG
        } else {
            star.style.color = '#ddd';
            star.style.fill = 'none';
            star.setAttribute('fill', 'none'); // For SVG
        }
    });
}

async function openRatingModal(productId, productTitle) {
    document.getElementById('rating-modal-title').textContent = `Calificar: ${productTitle}`;
    document.getElementById('rating-product-id').value = productId;
    document.getElementById('rating-review-id').value = '';
    document.getElementById('rating-comment').value = '';

    // Ensure icons are rendered if modal was hidden initially
    if (window.lucide) window.lucide.createIcons();

    setRating(0);
    deleteBtn.style.display = 'none';

    // Fetch existing review
    const review = await fetchUserReview(currentUser.id, productId);

    if (review) {
        document.getElementById('rating-review-id').value = review.id;
        document.getElementById('rating-comment').value = review.comment || '';
        if (charCount) charCount.textContent = (review.comment || '').length;
        setRating(review.rating);
        deleteBtn.style.display = 'inline-block';
    } else {
        if (charCount) charCount.textContent = '0';
    }

    modal.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', init);
