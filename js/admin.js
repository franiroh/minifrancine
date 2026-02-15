
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
import { getUser, signOut, fetchProducts, updateProduct } from './api.js';
import { fetchAllOrders, fetchAdminStats, deleteProduct, fetchCategories, createCategory, updateCategory, deleteCategory } from './api.js';
import { escapeHtml, sanitizeCssValue } from './utils.js';

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

    // 3. Load Initial View (Hash Routing)
    const hash = window.location.hash.replace('#', '');
    if (hash && ['dashboard', 'products', 'orders', 'categories'].includes(hash)) {
        const navItem = document.querySelector(`.nav-item[data-tab="${hash}"]`);
        if (navItem) navItem.click();
    } else {
        loadDashboard();
    }

    // 4. Icons
    if (window.lucide) window.lucide.createIcons();

    // 5. Date Filter Logic
    const dateStartEl = document.getElementById('date-start');
    const dateEndEl = document.getElementById('date-end');
    const btnFilter = document.getElementById('btn-filter-date');

    // Set defaults (First day of current month to Today)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    if (dateStartEl && dateEndEl) {
        dateStartEl.valueAsDate = firstDay;
        dateEndEl.valueAsDate = today;

        btnFilter.onclick = () => {
            loadDashboard();
        };
    }

    // Exit Admin
    document.getElementById('exit-admin-btn').onclick = () => {
        window.location.href = 'index.html';
    };

    fadeOutPreloader();
}

// Preloader Logic
function fadeOutPreloader() {
    const preloader = document.getElementById('preloader');
    if (preloader) {
        preloader.classList.add('hidden');
        setTimeout(() => preloader.remove(), 300);
    }
}

// Navigation Logic
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
            if (viewId === 'categories') loadCategories();
        };
    });
}

async function loadDashboard() {
    const dateStart = document.getElementById('date-start')?.value;
    const dateEnd = document.getElementById('date-end')?.value;

    const stats = await fetchAdminStats(dateStart, dateEnd);

    document.getElementById('stat-total-sales').textContent = `$${stats.totalSales.toFixed(2)}`;
    document.getElementById('stat-total-orders').textContent = stats.totalOrders;
    document.getElementById('stat-paid-orders').textContent = stats.paidOrders;
    document.getElementById('stat-pending-orders').textContent = stats.pendingOrders;
    document.getElementById('stat-total-products').textContent = stats.totalProducts;
}

async function loadProducts() {
    const products = await fetchProducts();
    const container = document.getElementById('products-by-category');

    // Group by category
    const grouped = {};
    products.forEach(p => {
        const cat = p.category || 'Sin categoría';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(p);
    });

    const categoryNames = Object.keys(grouped).sort();

    container.innerHTML = categoryNames.map(cat => {
        const rows = grouped[cat].map(p => `
            <tr class="${p.published === false ? 'product-row--unpublished' : ''}">
                <td>
                    ${(p.mainImage)
                ? `<img src="${escapeHtml(p.mainImage)}" alt="${escapeHtml(p.title)}" class="img-preview" style="object-fit: cover;">`
                : (p.imageColor && p.imageColor.includes('gradient'))
                    ? `<div class="img-preview" style="background: ${sanitizeCssValue(p.imageColor)}; width: 48px; height: 48px; border-radius: 12px;"></div>`
                    : `<img src="${escapeHtml(p.imageColor || 'https://placehold.co/48')}" alt="${escapeHtml(p.title)}" class="img-preview" style="object-fit: cover;">`
            }
                </td>
                <td><strong>${escapeHtml(p.title)}</strong></td>
                <td>$${parseFloat(p.price).toFixed(2)}</td>
                <td>
                    <label class="toggle-switch">
                        <input type="checkbox" ${p.published !== false ? 'checked' : ''} onchange="togglePublishHandler(${parseInt(p.id)}, this.checked)">
                        <span class="slider"></span>
                    </label>
                </td>
                <td>
                    <button class="btn-icon" onclick="window.location.href='admin-product.html?id=${parseInt(p.id)}'"><i data-lucide="edit-3"></i></button>
                    <button class="btn-icon" onclick="deleteProductHandler('${parseInt(p.id)}')"><i data-lucide="trash-2"></i></button>
                </td>
            </tr>
        `).join('');

        return `
            <div class="category-group">
                <h3 class="category-group__title">${escapeHtml(cat)} <span class="category-group__count">${grouped[cat].length}</span></h3>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Imagen</th>
                                <th>Título</th>
                                <th>Precio</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
}

async function loadOrders() {
    const orders = await fetchAllOrders();
    console.log('Orders fetched:', orders);
    const tbody = document.querySelector('#orders-table tbody');

    tbody.innerHTML = orders.map(o => `
        <tr>
            <td><strong>#${escapeHtml(String(o.id).slice(0, 8).toUpperCase())}</strong></td>
            <td>
                <div style="font-weight: 600; color: var(--admin-text);">${escapeHtml(o.email || 'N/A')}</div>
                <div style="font-size: 11px; color: var(--admin-text-light);">${escapeHtml(o.user_id)}</div>
                <small class="text-gray">${o.created_at ? new Date(o.created_at).toLocaleDateString() : '-'}</small>
            </td>
            <td>${o.created_at ? new Date(o.created_at).toLocaleTimeString() : '-'}</td>
            <td><strong>$${parseFloat(o.total).toFixed(2)}</strong></td>
            <td>
                <span class="status-badge status-${escapeHtml(o.status)}">${escapeHtml(o.status)}</span>
                <button class="btn-icon" style="margin-left:8px;" onclick="window.location.href='admin-order-detail.html?id=${escapeHtml(o.id)}'">
                    <i data-lucide="eye"></i>
                </button>
            </td>
        </tr>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
}

async function loadCategories() {
    const categories = await fetchCategories();
    const tbody = document.querySelector('#categories-table tbody');

    tbody.innerHTML = categories.map(c => `
        <tr>
            <td><strong>${escapeHtml(c.name)}</strong></td>
            <td>
                <button class="btn-icon" onclick="editCategoryHandler(${parseInt(c.id)}, '${escapeHtml(c.name).replace(/'/g, "\\'")}')"><i data-lucide="edit-3"></i></button>
                <button class="btn-icon" onclick="deleteCategoryHandler(${parseInt(c.id)})"><i data-lucide="trash-2"></i></button>
            </td>
        </tr>
    `).join('');

    if (window.lucide) window.lucide.createIcons();

    // Wire up "Nueva Categoría" button
    document.getElementById('btn-add-category').onclick = async () => {
        const name = prompt('Nombre de la nueva categoría:');
        if (!name || !name.trim()) return;
        const { error } = await createCategory({ name: name.trim() });
        if (error) {
            alert('Error al crear categoría: ' + error.message);
        } else {
            loadCategories();
        }
    };
}

window.editCategoryHandler = async (id, currentName) => {
    const name = prompt('Editar nombre de categoría:', currentName);
    if (!name || !name.trim() || name.trim() === currentName) return;
    const { error } = await updateCategory(id, { name: name.trim() });
    if (error) {
        alert('Error al actualizar categoría: ' + error.message);
    } else {
        loadCategories();
    }
};

window.deleteCategoryHandler = async (id) => {
    if (confirm('¿Seguro que quieres eliminar esta categoría?')) {
        const { error } = await deleteCategory(id);
        if (error) {
            alert('Error al eliminar: ' + error.message);
        } else {
            loadCategories();
        }
    }
};

window.togglePublishHandler = async (id, published) => {
    const { error } = await updateProduct(id, { published });
    if (error) {
        alert('Error al cambiar estado: ' + error.message);
        loadProducts(); // Revert UI
    } else {
        loadProducts();
    }
};

window.deleteProductHandler = async (id) => {
    if (confirm('¿Seguro que quieres eliminar este producto?')) {
        await deleteProduct(id);
        loadProducts();
    }
};

import { supabase } from './api.js';

document.addEventListener('DOMContentLoaded', init);
