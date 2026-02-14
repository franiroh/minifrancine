
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
import { getUser, signOut, fetchProducts } from './api.js';

// Re-init Supabase locally here or expose from API if easier, 
// using API is better but need to export supabase instance or add Admin methods there.
// For expediency, we'll use the API methods we are about to add.
import { fetchAllOrders, fetchAdminStats, createProduct, updateProduct, deleteProduct, uploadProductImage, fetchProductById } from './api.js';

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

    // Modal Close
    window.closeModal = () => document.getElementById('product-modal').classList.add('hidden');

    // Add Product Btn
    document.getElementById('btn-add-product').onclick = () => openProductModal();

    // Form Submit
    document.getElementById('product-form').onsubmit = handleProductSubmit;
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
            <td><img src="${p.imageColor}" alt="${p.title}" class="img-preview"></td>
            <td><strong>${p.title}</strong></td>
            <td>$${p.price}</td>
            <td><span class="tag">${p.category}</span></td>
            <td>
                <button class="btn-icon" onclick="openProductModal('${p.id}')"><i data-lucide="edit-3"></i></button>
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

// Product Management
window.openProductModal = async (productId = null) => {
    const modal = document.getElementById('product-modal');
    const form = document.getElementById('product-form');

    if (productId) {
        document.getElementById('modal-title').textContent = 'Editar Producto';
        document.getElementById('prod-id').value = productId;

        // Fetch full product data
        const p = await fetchProductById(productId);
        if (p) {
            document.getElementById('prod-title').value = p.title || '';
            document.getElementById('prod-description').value = p.description || '';
            document.getElementById('prod-price').value = p.price || 0;
            document.getElementById('prod-old-price').value = p.oldPrice || '';
            document.getElementById('prod-category').value = p.category || 'Anime';
            document.getElementById('prod-badge').value = p.badge || '';
            document.getElementById('prod-badge-color').value = p.badgeColor || 'red';
            document.getElementById('prod-image-color').value = p.imageColor || '#f3f4f6';
            document.getElementById('prod-size').value = p.size || '';
            document.getElementById('prod-stitches').value = p.stitches || '';
            document.getElementById('prod-formats').value = p.formats || '';
            document.getElementById('prod-image').value = p.imageColor || ''; // imageColor is often used for the URL in this mockup
        }
    } else {
        document.getElementById('modal-title').textContent = 'Nuevo Producto';
        form.reset();
        document.getElementById('prod-id').value = '';
    }

    modal.classList.remove('hidden');
};

async function handleProductSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('prod-id').value;
    const title = document.getElementById('prod-title').value;
    const description = document.getElementById('prod-description').value;
    const price = parseFloat(document.getElementById('prod-price').value);
    const old_price = parseFloat(document.getElementById('prod-old-price').value) || null;
    const category = document.getElementById('prod-category').value;
    const badge = document.getElementById('prod-badge').value;
    const badge_color = document.getElementById('prod-badge-color').value;
    const image_color = document.getElementById('prod-image-color').value;
    const size = document.getElementById('prod-size').value;
    const stitches = parseInt(document.getElementById('prod-stitches').value) || null;
    const formats = document.getElementById('prod-formats').value;

    let image = document.getElementById('prod-image').value;
    const imageFile = document.getElementById('prod-image-file').files[0];

    // Upload Image if present
    if (imageFile) {
        const uploadRes = await uploadProductImage(imageFile);
        if (uploadRes) image = uploadRes;
    }

    const data = {
        title,
        description,
        price,
        old_price,
        category,
        badge,
        badge_color,
        image_color: image || image_color, // Use uploaded image URL or the color/url field
        size,
        stitches,
        formats
    };

    if (id) {
        await updateProduct(id, data);
    } else {
        await createProduct(data);
    }

    window.closeModal();
    loadProducts();
    loadDashboard();
}

window.deleteProductHandler = async (id) => {
    if (confirm('¿Seguro que quieres eliminar este producto?')) {
        await deleteProduct(id);
        loadProducts();
    }
};

// Temp Supabase instance needed for auth check inside init, 
// but we can import from API if we export it.
// Let's rely on api.js functions for everything to be clean.
// Hack for the role check inside init:
import { supabase } from './api.js'; // Need to export supabase from api.js

document.addEventListener('DOMContentLoaded', init);
