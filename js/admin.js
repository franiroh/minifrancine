
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
import { getUser, signOut, fetchProducts } from './api.js';

import { fetchAllOrders, fetchAdminStats, deleteProduct } from './api.js';

let currentView = 'dashboard';

async function init() {
    // 1. Check Auth & Role
    const user = await getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Check role (requires profile fetch)
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || profile.role !== 'admin') {
        alert('Access Denied: Admins only.');
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('admin-email').textContent = user.email;

    // 2. Setup Navigation
    setupNavigation();

    // 3. Load Initial View
    loadDashboard();

    // 4. Icons
    if (window.lucide) window.lucide.createIcons();

    // Exit Admin
    document.getElementById('exit-admin-btn').onclick = () => {
        window.location.href = 'index.html';
    };
}

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-tab]');
    navItems.forEach(item => {
        item.onclick = () => {
            // UI Update
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            // View Update
            const viewId = item.dataset.tab;
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            document.getElementById(`view-${viewId}`).classList.add('active');

            // Load Data
            if (viewId === 'dashboard') loadDashboard();
            if (viewId === 'products') loadProducts();
            if (viewId === 'orders') loadOrders();
        };
    });
}

async function loadDashboard() {
    const stats = await fetchAdminStats();
    document.getElementById('stat-total-sales').textContent = `$${stats.totalSales.toFixed(2)}`;
    document.getElementById('stat-total-orders').textContent = stats.totalOrders;
    document.getElementById('stat-total-products').textContent = stats.totalProducts;
}

async function loadProducts() {
    const products = await fetchProducts();
    const tbody = document.querySelector('#products-table tbody');

    tbody.innerHTML = products.map(p => `
        <tr>
            <td><img src="${p.mainImage || p.imageColor}" alt="${p.title}" class="img-preview" style="object-fit: cover;"></td>
            <td><strong>${p.title}</strong></td>
            <td>$${p.price}</td>
            <td><span class="tag">${p.category}</span></td>
            <td>
                <button class="btn-icon" onclick="window.location.href='admin-product.html?id=${p.id}'"><i data-lucide="edit-3"></i></button>
                <button class="btn-icon" onclick="deleteProductHandler('${p.id}')"><i data-lucide="trash-2"></i></button>
            </td>
        </tr>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
}

async function loadOrders() {
    const orders = await fetchAllOrders();
    const tbody = document.querySelector('#orders-table tbody');

    tbody.innerHTML = orders.map(o => `
        <tr>
            <td><strong>#${o.id.slice(0, 8).toUpperCase()}</strong></td>
            <td>${o.user_id} <br> <small class="text-gray">${new Date(o.created_at).toLocaleDateString()}</small></td>
            <td>${new Date(o.created_at).toLocaleTimeString()}</td>
            <td><strong>$${o.total}</strong></td>
            <td><span class="status-badge status-${o.status}">${o.status}</span></td>
        </tr>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
}

window.deleteProductHandler = async (id) => {
    if (confirm('¿Seguro que quieres eliminar este producto?')) {
        await deleteProduct(id);
        loadProducts();
    }
};

import { supabase } from './api.js';

document.addEventListener('DOMContentLoaded', init);
