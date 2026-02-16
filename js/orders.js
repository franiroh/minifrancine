
import { loadComponents, updateNavbarAuth, updateNavbarCartCount } from './components.js';
import { getUser, onAuthStateChange, fetchMyOrders, downloadProductFile, fetchAllUserReviews, fetchUserReview, addReview, updateReview, deleteReview } from './api.js';
import { state, loadCart, getCartCount } from './state.js';
import { escapeHtml, sanitizeCssValue, showToast } from './utils.js';

// ... (rest of imports)

let currentUser = null;

async function init() {
    await loadComponents();

    currentUser = await getUser();
    updateNavbarAuth(currentUser);

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
                    <p>Aún no has realizado ninguna compra.</p>
                    <a href="index.html" class="btn btn--primary" style="margin-top: 8px;">Explorar Catálogo</a>
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
                <p>Hubo un error al cargar tus compras.</p>
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
    const statusText = isPaid ? 'Pagado' : 'Pendiente';

    let itemsHtml = '';
    if (order.order_items && order.order_items.length > 0) {
        itemsHtml = order.order_items.map(item => {
            const product = item.products || {};
            const title = product.title || 'Producto';
            const mainImage = product.main_image || '';
            const imageColor = product.image_color || '#F3F4F6';
            const productId = parseInt(item.product_id);

            const thumbContent = mainImage
                ? `<img src="${escapeHtml(mainImage)}" alt="${escapeHtml(title)}" loading="lazy">`
                : `<i data-lucide="image" style="width:24px; height:24px; color:#D1D5DB;"></i>`;

            const downloadBtn = isPaid
                ? `<button class="order-item__download btn btn--sm btn--outline" data-id="${productId}" data-title="${escapeHtml(title)}" style="margin-right: 8px;">
                     <i data-lucide="download"></i> Descargar
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
                    <div class="order-item__qty">Cant: ${parseInt(item.quantity)}</div>
                </div>
                
                <div class="order-item__col-download">
                    ${downloadBtn}
                </div>
                
                <div class="order-item__col-rating">
                    ${rateUi}
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
                    <span class="order-card__date">
                        <i data-lucide="calendar"></i> ${date}
                    </span>
                </div>
                <span class="order-card__status ${statusClass}">${statusText}</span>
            </div>

            <div class="order-card__items">
                ${itemsHtml}
            </div>

            <div class="order-card__footer">
                <span class="order-card__total-label">Total</span>
                <span class="order-card__total">USD ${parseFloat(order.total).toFixed(2)}</span>
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
            btn.innerHTML = '<i data-lucide="loader"></i> ...';
            btn.disabled = true;
            if (window.lucide) window.lucide.createIcons();

            try {
                const result = await downloadProductFile(productId);
                if (result && result.url) {
                    const link = document.createElement('a');
                    link.href = result.url;
                    link.download = result.filename || productTitle + '.zip';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    btn.innerHTML = '<i data-lucide="check"></i> Listo';
                    showToast('Descarga iniciada correctamente.', 'success');
                    if (window.lucide) window.lucide.createIcons();
                    setTimeout(() => {
                        btn.innerHTML = originalHTML;
                        btn.disabled = false;
                        if (window.lucide) window.lucide.createIcons();
                    }, 2000);
                } else {
                    showToast('El archivo digital para este producto no está disponible todavía.', 'error');
                    btn.innerHTML = originalHTML;
                    btn.disabled = false;
                    if (window.lucide) window.lucide.createIcons();
                }
            } catch (err) {
                console.error('Download error:', err);
                showToast('Error al generar el enlace de descarga.', 'error');
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
            showToast('Por favor selecciona una puntuación válida (1-5).', 'error');
            return;
        }

        // 2. Validation: Comment Length
        if (comment.length > 1000) {
            showToast('El comentario no puede exceder los 1000 caracteres.', 'error');
            return;
        }

        if (!rating) {
            showToast('Por favor selecciona una puntuación.', 'error');
            return;
        }

        const submitBtn = ratingForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando...';

        let result;
        if (reviewId) {
            result = await updateReview(reviewId, rating, comment);
        } else {
            result = await addReview(currentUser.id, productId, rating, comment);
        }

        if (result.error) {
            showToast('Error al guardar la calificación.', 'error');
            console.error(result.error);
        } else {
            modal.style.display = 'none';
            showToast('Calificación guardada correctamente.', 'success');
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
        submitBtn.textContent = 'Eliminando...';

        const result = await deleteReview(reviewId);

        if (result.error) {
            showToast('Error al eliminar la reseña.', 'error');
            console.error(result.error);
        } else {
            modal.style.display = 'none';
            showToast('Reseña eliminada.', 'success');
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
