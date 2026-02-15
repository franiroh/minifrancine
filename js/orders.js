
import { loadComponents, updateNavbarAuth, updateNavbarCartCount } from './components.js';
import { getUser, onAuthStateChange, fetchMyOrders, downloadProductFile } from './api.js';
import { state, loadCart, getCartCount } from './state.js';
import { escapeHtml, sanitizeCssValue } from './utils.js';

async function init() {
    await loadComponents();

    const user = await getUser();
    updateNavbarAuth(user);

    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    await loadCart(user);
    updateNavbarCartCount(getCartCount());

    onAuthStateChange((event, session) => {
        updateNavbarAuth(session ? session.user : null);
        if (!session) {
            window.location.href = 'login.html';
        }
    });

    window.addEventListener('cart-updated', () => {
        updateNavbarCartCount(getCartCount());
    });

    if (window.lucide) window.lucide.createIcons();

    loadOrders(user.id);
}

async function loadOrders(userId) {
    const listContainer = document.getElementById('orders-list');

    try {
        const orders = await fetchMyOrders(userId);

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

        listContainer.innerHTML = orders.map(order => renderOrderCard(order)).join('');
        if (window.lucide) window.lucide.createIcons();
        attachDownloadListeners();

    } catch (error) {
        console.error("Error loading orders:", error);
        listContainer.innerHTML = `
            <div class="orders-empty">
                <p>Hubo un error al cargar tus compras.</p>
            </div>
        `;
    }
}

function renderOrderCard(order) {
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

            const thumbContent = mainImage
                ? `<img src="${escapeHtml(mainImage)}" alt="${escapeHtml(title)}" loading="lazy">`
                : `<i data-lucide="image" style="width:24px; height:24px; color:#D1D5DB;"></i>`;

            const downloadBtn = isPaid
                ? `<button class="order-item__download" data-id="${parseInt(item.product_id)}" data-title="${escapeHtml(title)}">
                     <i data-lucide="download"></i> Descargar
                   </button>`
                : '';

            return `
            <div class="order-item">
                <div class="order-item__thumb" style="background: ${sanitizeCssValue(imageColor)};">
                    ${thumbContent}
                </div>
                <div class="order-item__info">
                    <div class="order-item__title">${escapeHtml(title)}</div>
                    <div class="order-item__qty">Cant: ${parseInt(item.quantity)}</div>
                </div>
                ${downloadBtn}
                <span class="order-item__price">$${parseFloat(item.price).toFixed(2)}</span>
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
                <span class="order-card__total">$${parseFloat(order.total).toFixed(2)}</span>
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
            btn.innerHTML = '<i data-lucide="loader"></i> Descargando...';
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

                    btn.innerHTML = '<i data-lucide="check"></i> Descargado';
                    if (window.lucide) window.lucide.createIcons();
                    setTimeout(() => {
                        btn.innerHTML = originalHTML;
                        btn.disabled = false;
                        if (window.lucide) window.lucide.createIcons();
                    }, 2000);
                } else {
                    alert('El archivo digital para este producto no está disponible todavía.');
                    btn.innerHTML = originalHTML;
                    btn.disabled = false;
                    if (window.lucide) window.lucide.createIcons();
                }
            } catch (err) {
                console.error('Download error:', err);
                alert('Error al generar el enlace de descarga.');
                btn.innerHTML = originalHTML;
                btn.disabled = false;
                if (window.lucide) window.lucide.createIcons();
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', init);
