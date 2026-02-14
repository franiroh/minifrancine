
import { loadComponents, updateNavbarAuth, updateNavbarCartCount } from './components.js';
import { getUser, onAuthStateChange, fetchMyOrders, downloadProductFile } from './api.js';
import { state, loadCart, getCartCount } from './state.js';

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

    if (window.lucide) window.lucide.createIcons();

    loadOrders(user.id);
}

async function loadOrders(userId) {
    const listContainer = document.getElementById('orders-list');

    try {
        const orders = await fetchMyOrders(userId);

        if (!orders || orders.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="shopping-bag" style="font-size: 3rem; opacity: 0.5;"></i>
                    <p style="margin-top: 16px;">Aún no has realizado ninguna compra.</p>
                    <a href="index.html" class="btn btn--primary" style="margin-top: 16px; display: inline-block;">Ir al Catálogo</a>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        listContainer.innerHTML = orders.map(order => renderOrderCard(order)).join('');
        if (window.lucide) window.lucide.createIcons();

    } catch (error) {
        console.error("Error loading orders:", error);
        listContainer.innerHTML = `
            <div class="empty-state">
                <p>Hubo un error al cargar tus compras.</p>
            </div>
        `;
    }
}

function renderOrderCard(order) {
    const date = new Date(order.created_at).toLocaleDateString('es-ES', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const statusClass = order.status === 'paid' ? 'status-paid' : 'status-pending';
    const statusText = order.status === 'paid' ? 'Pagado' : 'Pendiente';

    let itemsHtml = '';
    if (order.order_items && order.order_items.length > 0) {
        itemsHtml = order.order_items.map(item => {
            const productTitle = item.products ? item.products.title : 'Producto';
            // Simple escape for single quotes in title
            const safeTitle = productTitle.replace(/'/g, "\\'");

            const downloadBtn = order.status === 'paid'
                ? `<button onclick="handleDownload(${item.product_id}, '${safeTitle}')" class="btn-download" style="margin-left: auto; font-size: 0.8rem; padding: 4px 12px; border: 1px solid var(--color-border); border-radius: 4px; background: white; cursor: pointer;">
                     <i data-lucide="download" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"></i> Descargar
                   </button>`
                // Note: item.product_id might be missing in some join scenarios, but fetchMyOrders selects it via order_items(product_id). Wait, fetchMyOrders selects products(title) nested. 
                // We need to make sure we have product_id. The order_items table has product_id.
                // fetchMyOrders select: order_items (quantity, price, products(title)) -> we need product_id here too!
                : '';

            return `
            <div class="order-item" style="align-items: center;">
                <span>${item.quantity}x ${productTitle}</span>
                ${downloadBtn}
                <span style="font-weight: 600; margin-left: 12px;">$${item.price}</span>
            </div>
            `;
        }).join('');
    } else {
        itemsHtml = '<p class="text-gray" style="font-size: 0.9rem;">Detalles del pedido...</p>';
    }

    return `
        <div class="order-card">
            <div class="order-header">
                <div>
                    <div class="order-id">Pedido #${order.id.slice(0, 8).toUpperCase()}</div>
                    <div class="order-date">${date}</div>
                </div>
                <div class="order-status ${statusClass}">${statusText}</div>
            </div>
            
            <div class="order-items">
                ${itemsHtml}
            </div>

            <div class="order-total">
                Total: $${order.total}
            </div>
        </div>
    `;
}

window.handleDownload = async (productId, productName) => {
    if (!productId) {
        console.error("No product ID for download");
        return;
    }
    try {
        const result = await downloadProductFile(productId);
        if (result && result.url) {
            const link = document.createElement('a');
            link.href = result.url;
            link.download = result.filename || productName + '.zip';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            alert('El archivo digital para este producto no está disponible todavía.');
        }
    } catch (err) {
        console.error('Download error:', err);
        alert('Error al generar el enlace de descarga.');
    }
};

document.addEventListener('DOMContentLoaded', init);
