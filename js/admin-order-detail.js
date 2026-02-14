import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
import { getUser, fetchOrderById, fetchOrderItems } from './api.js';
import { supabase } from './api.js';

async function init() {
    // Auth Check
    const user = await getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || profile.role !== 'admin') {
        alert('Access Denied');
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('admin-email').textContent = user.email;

    // Get Order ID
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('id');

    if (!orderId) {
        alert('No se especificó un ID de pedido');
        window.location.href = 'admin.html';
        return;
    }

    try {
        await loadOrderDetails(orderId);
    } catch (error) {
        console.error(error);
        alert('Error cargando detalles del pedido');
    }

    if (window.lucide) window.lucide.createIcons();
    fadeOutPreloader();
}

async function loadOrderDetails(orderId) {
    // Fetch Order
    const order = await fetchOrderById(orderId);
    if (!order) throw new Error('Order not found');

    // Render Order Info
    document.getElementById('order-id-display').textContent = `Pedido #${order.id.slice(0, 8).toUpperCase()}`;
    document.getElementById('order-date-display').textContent = new Date(order.created_at).toLocaleString();
    document.getElementById('order-user').textContent = order.user_id;
    document.getElementById('order-total').textContent = `$${order.total}`;

    // Status Badge
    const statusEl = document.getElementById('order-status');
    statusEl.innerHTML = `<span class="status-badge status-${order.status}">${order.status}</span>`;

    // Fetch Items
    const items = await fetchOrderItems(orderId);
    const tbody = document.querySelector('#order-items-table tbody');

    tbody.innerHTML = items.map(item => {
        const p = item.products;
        let img = 'https://placehold.co/48';
        if (p) {
            if (p.main_image) img = p.main_image;
            else if (p.image_color && !p.image_color.includes('gradient')) img = p.image_color;
            else if (p.image_color) img = null; // Gradient case
        }

        const imgHtml = img
            ? `<img src="${img}" class="img-preview" style="width:40px;height:40px;">`
            : `<div class="img-preview" style="background:${p?.image_color};width:40px;height:40px;"></div>`;

        return `
            <tr>
                <td style="display:flex;align-items:center;gap:12px;">
                    ${imgHtml}
                    <div>
                        <strong>${p ? p.title : 'Producto Eliminado'}</strong>
                    </div>
                </td>
                <td>$${item.price}</td>
                <td>${item.quantity}</td>
                <td><strong>$${(item.price * item.quantity).toFixed(2)}</strong></td>
            </tr>
        `;
    }).join('');
}

function fadeOutPreloader() {
    const preloader = document.getElementById('preloader');
    if (preloader) {
        preloader.classList.add('hidden');
        setTimeout(() => preloader.remove(), 300);
    }
}

document.addEventListener('DOMContentLoaded', init);
