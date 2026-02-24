
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
import { getUser, signOut, fetchProducts, fetchProductById, fetchProductImages, fetchPDFSettings, downloadProductFile, fetchAllOrders, fetchAdminStats, deleteProduct, archiveProduct, unarchiveProduct, fetchCategories, createCategory, updateCategory, deleteCategory, upsertCategoryTranslations, fetchCategoryTranslations, supabase } from './api.js';
import { loadAdminMessages } from './admin-messages.js';
import { initContent } from './admin-content.js';
import { initI18nEditor } from './admin-i18n.js';
import { initAdminCoupons } from './admin-coupons.js';
import i18n from './i18n.js';
import { escapeHtml, sanitizeCssValue, getBadgeKey } from './utils.js';
import { generateProductPDF, generateProductBundle } from './pdf-export.js';

let currentView = 'dashboard';
let currentProductPage = 1;
const itemsPerProductPage = 25;

async function init() {
    // 0. Init i18n
    await i18n.init();

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
    if (hash && ['dashboard', 'products', 'orders', 'categories', 'messages', 'translations', 'content', 'coupons'].includes(hash)) {
        const navItem = document.querySelector(`.nav-item[data-tab="${hash}"]`);
        if (navItem) navItem.click();
    } else {
        loadDashboard();
    }

    // 4. Icons
    if (window.lucide) window.lucide.createIcons();

    // 5. Setup Modal Handlers
    document.getElementById('category-form').onsubmit = handleCategorySave;

    // 5. Date Filter Logic
    const dateStartEl = document.getElementById('date-start');
    const dateEndEl = document.getElementById('date-end');
    const datePresetsEl = document.getElementById('date-presets');
    const btnFilter = document.getElementById('btn-filter-date');

    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const updateFromPreset = (preset) => {
        const today = new Date();
        let start, end = today;

        switch (preset) {
            case 'today':
                start = today;
                break;
            case 'yesterday':
                const yesterday = new Date();
                yesterday.setDate(today.getDate() - 1);
                start = yesterday;
                end = yesterday;
                break;
            case 'this-month':
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                break;
            case 'last-month':
                start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                end = new Date(today.getFullYear(), today.getMonth(), 0);
                break;
            case 'this-year':
                start = new Date(today.getFullYear(), 0, 1);
                break;
            case 'all-time':
                start = null;
                end = null;
                break;
            default:
                return;
        }

        dateStartEl.value = start ? formatDate(start) : '';
        dateEndEl.value = end ? formatDate(end) : '';

        // Trigger filter
        if (currentView === 'dashboard') loadDashboard();
        if (currentView === 'orders') loadOrders();
    };

    // Set defaults (This month)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    if (datePresetsEl) {
        datePresetsEl.value = 'this-month';

        datePresetsEl.onchange = (e) => {
            updateFromPreset(e.target.value);
        };

        [dateStartEl, dateEndEl].forEach(el => {
            if (el) {
                el.onchange = () => {
                    datePresetsEl.value = 'custom';
                };
            }
        });
    }

    if (dateStartEl && dateEndEl) {
        dateStartEl.value = formatDate(firstDay);
        dateEndEl.value = formatDate(today);

        btnFilter.onclick = () => {
            if (currentView === 'dashboard') loadDashboard();
            if (currentView === 'orders') loadOrders();
        };
    }



    // 6. Listen for Language Changes (for Badges/Status)
    window.addEventListener('language-changed', () => {
        if (currentView === 'products') loadProducts();
        if (currentView === 'orders') loadOrders();
    });

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
    const pageTitle = document.getElementById('page-title');
    const controls = document.querySelector('.dashboard-controls');

    // Helper to update UI state
    const updateUIState = (viewId, title) => {
        currentView = viewId;

        // 1. Update Title
        if (pageTitle) pageTitle.textContent = title;

        // 2. Toggle Controls (Only show for Orders and Dashboard)
        if (controls) {
            controls.style.display = (viewId === 'orders' || viewId === 'dashboard') ? 'flex' : 'none';
        }

        // 3. Nav Active State
        navItems.forEach(n => n.classList.remove('active'));
        const activeNav = document.querySelector(`.nav-item[data-tab="${viewId}"]`);
        if (activeNav) activeNav.classList.add('active');

        // 4. View Active State
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(`view-${viewId}`).classList.add('active');
    };

    navItems.forEach(item => {
        item.onclick = () => {
            const viewId = item.dataset.tab;
            const title = item.innerText.trim();

            updateUIState(viewId, title);

            // Load Data
            if (viewId === 'dashboard') loadDashboard();
            if (viewId === 'products') loadProducts();
            if (viewId === 'orders') loadOrders();
            if (viewId === 'categories') loadCategories();
            if (viewId === 'messages') loadAdminMessages();
            if (viewId === 'content') initContent();
            if (viewId === 'translations') initI18nEditor();
            if (viewId === 'coupons') initAdminCoupons();
        };
    });

    // Handle Initial State (for hash loading)
    const hash = window.location.hash.replace('#', '');
    if (hash && ['dashboard', 'products', 'orders', 'categories', 'messages', 'translations', 'content', 'coupons'].includes(hash)) {
        const navItem = document.querySelector(`.nav-item[data-tab="${hash}"]`);
        if (navItem) navItem.click(); // This triggers onclick logic
    } else {
        // Default Dashboard state
        updateUIState('dashboard', 'Dashboard');
        loadDashboard();
    }
}

async function loadDashboard() {
    // Dashboard loads with default dates (or current input values hidden)
    const dateStart = document.getElementById('date-start')?.value;
    const dateEnd = document.getElementById('date-end')?.value;

    const stats = await fetchAdminStats(dateStart, dateEnd);

    document.getElementById('stat-total-sales').textContent = `USD ${stats.totalSales.toFixed(2)}`;
    document.getElementById('stat-total-orders').textContent = stats.totalOrders;
    document.getElementById('stat-paid-orders').textContent = stats.paidOrders;
    document.getElementById('stat-pending-orders').textContent = stats.pendingOrders;
    document.getElementById('stat-total-products').textContent = stats.totalProducts;
    document.getElementById('stat-published-products').textContent = stats.publishedProducts;
    document.getElementById('stat-private-products').textContent = stats.privateProducts;
    document.getElementById('stat-indexed-products').textContent = stats.indexedProducts;
    document.getElementById('stat-noindexed-products').textContent = stats.noIndexedProducts;
    document.getElementById('stat-total-coupons').textContent = stats.totalCoupons;
    document.getElementById('stat-available-coupons').textContent = stats.availableCoupons;
    document.getElementById('stat-used-coupons').textContent = stats.usedCoupons;
    document.getElementById('stat-coupon-sales').textContent = `USD ${stats.couponSales.toFixed(2)}`;
}

async function loadProducts() {
    const products = await fetchProducts({ includeArchived: true }); // Get all products including archived
    const categories = await fetchCategories();
    const tbody = document.querySelector('#products-table tbody');
    const categoryFilter = document.getElementById('category-filter');
    const archiveFilter = document.getElementById('archive-filter');
    const searchInput = document.getElementById('product-search');

    const getFilters = () => ({
        categoryId: categoryFilter?.value || '',
        archiveStatus: archiveFilter?.value || 'active',
        searchTerm: searchInput?.value.trim().toLowerCase() || ''
    });

    // Populate category filter dropdown
    if (categoryFilter) {
        const currentValue = categoryFilter.value;
        categoryFilter.innerHTML = `
            <option value="">Todas las categorías (${products.length})</option>
            ${categories.map(cat => {
            const count = products.filter(p => p.categoryIds && p.categoryIds.includes(cat.id)).length;
            return `<option value="${cat.id}">${escapeHtml(cat.name)} (${count})</option>`;
        }).join('')}
        `;
        categoryFilter.value = currentValue; // Preserve selection

        // Add filter event listener
        categoryFilter.onchange = () => {
            currentProductPage = 1;
            const { categoryId, archiveStatus, searchTerm } = getFilters();
            renderProductsTable(products, categoryId, archiveStatus, searchTerm);
        };
    }

    // Populate archive filter dropdown
    if (archiveFilter) {
        const currentArchiveValue = archiveFilter.value || 'active';
        archiveFilter.innerHTML = `
            <option value="active">Activos (${products.filter(p => !p.archived).length})</option>
            <option value="archived">Archivados (${products.filter(p => p.archived).length})</option>
            <option value="all">Todos (${products.length})</option>
        `;
        archiveFilter.value = currentArchiveValue;

        // Add filter event listener
        archiveFilter.onchange = () => {
            currentProductPage = 1;
            const { categoryId, archiveStatus, searchTerm } = getFilters();
            renderProductsTable(products, categoryId, archiveStatus, searchTerm);
        };
    }

    if (searchInput) {
        searchInput.oninput = () => {
            currentProductPage = 1;
            const { categoryId, archiveStatus, searchTerm } = getFilters();
            renderProductsTable(products, categoryId, archiveStatus, searchTerm);
        };
    }

    // Initial render
    const { categoryId, archiveStatus, searchTerm } = getFilters();
    renderProductsTable(products, categoryId, archiveStatus, searchTerm);
}

function renderProductsTable(allProducts, selectedCategoryId, archiveStatus = 'active', searchTerm = '') {
    const tbody = document.querySelector('#products-table tbody');
    const pageInfo = document.getElementById('products-page-info');
    const btnPrev = document.getElementById('btn-prev-page');
    const btnNext = document.getElementById('btn-next-page');
    const pageNumbersEl = document.getElementById('page-numbers');

    // Filter products by category
    let filteredProducts = selectedCategoryId
        ? allProducts.filter(p => p.categoryIds && p.categoryIds.includes(parseInt(selectedCategoryId)))
        : allProducts;

    // Filter by archive status
    if (archiveStatus === 'active') {
        filteredProducts = filteredProducts.filter(p => !p.archived);
    } else if (archiveStatus === 'archived') {
        filteredProducts = filteredProducts.filter(p => p.archived);
    }

    // Filter by search term
    if (searchTerm) {
        filteredProducts = filteredProducts.filter(p =>
            p.title.toLowerCase().includes(searchTerm)
        );
    }

    // Pagination Calculation
    const totalItems = filteredProducts.length;
    const totalPages = Math.ceil(totalItems / itemsPerProductPage);

    const paginationContainer = document.getElementById('products-pagination');
    if (paginationContainer) {
        paginationContainer.style.display = totalPages > 1 ? 'flex' : 'none';
    }

    // Ensure current page is valid
    if (currentProductPage > totalPages && totalPages > 0) currentProductPage = totalPages;
    if (currentProductPage < 1) currentProductPage = 1;

    const startIdx = (currentProductPage - 1) * itemsPerProductPage;
    const endIdx = Math.min(startIdx + itemsPerProductPage, totalItems);
    const paginatedProducts = filteredProducts.slice(startIdx, endIdx);

    // Update Pagination UI
    if (pageInfo) {
        pageInfo.innerHTML = totalItems > 0
            ? `Mostrando <strong>${startIdx + 1}-${endIdx}</strong> de <strong>${totalItems}</strong> productos`
            : 'No hay productos que mostrar';
    }

    if (btnPrev) btnPrev.disabled = currentProductPage === 1;
    if (btnNext) btnNext.disabled = currentProductPage === totalPages || totalPages === 0;

    // Render Page Numbers
    if (pageNumbersEl) {
        let pagesHtml = '';
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentProductPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pagesHtml += `
                <button class="btn ${i === currentProductPage ? 'btn--primary' : 'btn--secondary'}" 
                    style="padding: 4px 10px; min-width: 32px;"
                    onclick="changeProductPage(${i})">${i}</button>
            `;
        }
        pageNumbersEl.innerHTML = pagesHtml;
    }

    // Attach button listeners (one-time or check if already attached)
    if (btnPrev) {
        btnPrev.onclick = () => {
            if (currentProductPage > 1) {
                currentProductPage--;
                renderProductsTable(allProducts, selectedCategoryId, archiveStatus, searchTerm);
            }
        };
    }
    if (btnNext) {
        btnNext.onclick = () => {
            if (currentProductPage < totalPages) {
                currentProductPage++;
                renderProductsTable(allProducts, selectedCategoryId, archiveStatus, searchTerm);
            }
        };
    }

    // Expose jump function to window for onclick handlers
    window.changeProductPage = (page) => {
        currentProductPage = page;
        renderProductsTable(allProducts, selectedCategoryId, archiveStatus, searchTerm);
    };

    if (paginatedProducts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">No hay productos que mostrar.</td></tr>';
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    tbody.innerHTML = paginatedProducts.map(p => `
        <tr class="${p.published === false ? 'product-row--unpublished' : ''} ${p.archived ? 'product-row--archived' : ''}">
            <td>
                ${(p.mainImage)
            ? `<img src="${escapeHtml(p.mainImage)}" alt="${escapeHtml(p.title)}" class="img-preview" style="object-fit: cover;">`
            : (p.imageColor && p.imageColor.includes('gradient'))
                ? `<div class="img-preview" style="background: ${sanitizeCssValue(p.imageColor)}; width: 48px; height: 48px; border-radius: 12px;"></div>`
                : `<img src="${escapeHtml(p.imageColor || 'https://placehold.co/48')}" alt="${escapeHtml(p.title)}" class="img-preview" style="object-fit: cover;">`
        }
            </td>
            <td>
                <strong>${escapeHtml(p.title)}</strong>
                ${p.archived ? '<br><span style="font-size: 11px; color: #9CA3AF;">📦 Archivado</span>' : ''}
            </td>
            <td>${p.categories && p.categories.length > 0 ? escapeHtml(p.categories.join(', ')) : 'Sin categoría'}</td>
            <td>
                ${p.badge ? `<span class="product-card__badge" style="position:static; display:inline-block; font-size: 10px; padding: 2px 6px;">${escapeHtml(i18n.t('badge.' + getBadgeKey(p.badge)))}</span>` : '-'}
            </td>
            <td>USD ${parseFloat(p.price).toFixed(2)}</td>
            <td>
                <label class="toggle-switch ${p.indexed === false ? 'toggle-switch--gray' : ''}">
                    <input type="checkbox" ${p.indexed !== false ? 'checked' : ''} ${p.archived ? 'disabled' : ''} onchange="toggleIndexHandler(${parseInt(p.id)}, this.checked)">
                    <span class="slider"></span>
                </label>
            </td>
            <td>
                <label class="toggle-switch">
                    <input type="checkbox" ${p.published !== false ? 'checked' : ''} ${p.archived ? 'disabled' : ''} onchange="togglePublishHandler(${parseInt(p.id)}, this.checked)">
                    <span class="slider"></span>
                </label>
            </td>
            <td class="actions-cell">
                <div class="actions-wrapper">
                    <button class="btn-icon" onclick="window.location.href='admin-product.html?id=${parseInt(p.id)}'" title="Editar"><i data-lucide="edit-3"></i></button>
                    <button class="btn-icon" onclick="downloadPDFHandler(${parseInt(p.id)}, this)" title="Exportar PDF"><i data-lucide="file-text"></i></button>
                    <button class="btn-icon" onclick="downloadBundleHandler(${parseInt(p.id)}, this)" title="Descargar Bundle (ZIP)"><i data-lucide="package"></i></button>
                    ${p.archived
            ? `<button class="btn-icon" onclick="unarchiveProductHandler(${parseInt(p.id)})" title="Desarchivar"><i data-lucide="archive-restore"></i></button>`
            : `<button class="btn-icon" onclick="archiveProductHandler(${parseInt(p.id)})" title="Archivar"><i data-lucide="archive"></i></button>`
        }
                </div>
            </td>
        </tr>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
}

async function loadOrders() {
    const orders = await fetchAllOrders();
    const tbody = document.querySelector('#orders-table tbody');

    // Client-side date filtering
    const dateStartVal = document.getElementById('date-start')?.value;
    const dateEndVal = document.getElementById('date-end')?.value;

    let filteredOrders = orders;

    if (dateStartVal) {
        const [y, m, d] = dateStartVal.split('-').map(Number);
        const start = new Date(y, m - 1, d, 0, 0, 0, 0);
        filteredOrders = filteredOrders.filter(o => new Date(o.created_at) >= start);
    }

    if (dateEndVal) {
        const [y, m, d] = dateEndVal.split('-').map(Number);
        const end = new Date(y, m - 1, d, 23, 59, 59, 999);
        filteredOrders = filteredOrders.filter(o => new Date(o.created_at) <= end);
    }

    if (filteredOrders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">No hay pedidos en este rango de fechas.</td></tr>';
        return;
    }

    tbody.innerHTML = filteredOrders.map(o => `
        <tr>
            <td><strong>#${escapeHtml(String(o.id).slice(0, 8).toUpperCase())}</strong></td>
            <td>
                <div style="font-weight: 600; color: var(--admin-text);">${escapeHtml(o.email || 'N/A')}</div>
                <div style="font-size: 11px; color: var(--admin-text-light);">${escapeHtml(o.user_id)}</div>
                <small class="text-gray">${o.created_at ? new Date(o.created_at).toLocaleDateString() : '-'}</small>
            </td>
            <td>${o.created_at ? new Date(o.created_at).toLocaleTimeString() : '-'}</td>
            <td><strong>USD ${parseFloat(o.total).toFixed(2)}</strong></td>
            <td>
                <span class="status-badge status-${escapeHtml(o.status)}">${escapeHtml(i18n.t('status.' + o.status))}</span>
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
            <td class="actions-cell">
                <div class="actions-wrapper">
                    <button class="btn-icon" onclick="editCategoryHandler(${parseInt(c.id)}, '${escapeHtml(c.name).replace(/'/g, "\\'")}')"><i data-lucide="edit-3"></i></button>
                    <button class="btn-icon" onclick="deleteCategoryHandler(${parseInt(c.id)})"><i data-lucide="trash-2"></i></button>
                </div>
            </td>
        </tr>
    `).join('');

    if (window.lucide) window.lucide.createIcons();

    // Wire up "Nueva Categoría" button
    document.getElementById('btn-add-category').onclick = () => openCategoryModal();
}

async function openCategoryModal(category = null) {
    const modal = document.getElementById('category-modal');
    const title = document.getElementById('category-modal-title');
    const form = document.getElementById('category-form');

    // Reset form
    form.reset();
    document.getElementById('category-id').value = category ? category.id : '';
    title.textContent = category ? 'Editar Categoría' : 'Nueva Categoría';

    if (category) {
        // Fetch translations
        const { data: translations } = await fetchCategoryTranslations(category.id);
        document.getElementById('category-name-es').value = translations?.es || category.name || '';
        document.getElementById('category-name-en').value = translations?.en || '';
        document.getElementById('category-name-pt').value = translations?.pt || '';
    }

    modal.style.display = 'flex';
}

async function handleCategorySave(e) {
    e.preventDefault();
    const id = document.getElementById('category-id').value;
    const nameEs = document.getElementById('category-name-es').value.trim();
    const nameEn = document.getElementById('category-name-en').value.trim();
    const namePt = document.getElementById('category-name-pt').value.trim();

    if (!nameEs) return alert('El nombre en español es obligatorio');

    const names = { es: nameEs, en: nameEn, pt: namePt };

    try {
        let categoryId = id;
        if (id) {
            // Update
            const { error } = await updateCategory(id, { name: nameEs });
            if (error) throw error;
        } else {
            // Create
            const { data, error } = await createCategory({ name: nameEs });
            if (error) throw error;
            categoryId = data.id;
        }

        // Save translations
        const { error: transError } = await upsertCategoryTranslations(categoryId, names);
        if (transError) throw transError;

        document.getElementById('category-modal').style.display = 'none';
        loadCategories();
    } catch (error) {
        alert('Error al guardar categoría: ' + error.message);
    }
}

window.editCategoryHandler = async (id, currentName) => {
    openCategoryModal({ id, name: currentName });
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

window.toggleIndexHandler = async (id, indexed) => {
    const { error } = await updateProduct(id, { indexed });
    if (error) {
        alert('Error al cambiar indexación: ' + error.message);
        loadProducts(); // Revert UI
    } else {
        loadProducts();
    }
};

async function prepareProductForPDF(productId) {
    // 1. Fetch Product Images
    const images = await fetchProductImages(productId);
    const imageData = images.map(img => img.public_url);

    // 2. Fetch Full Product Data
    const product = await fetchProductById(productId);
    if (!product) throw new Error('Producto no encontrado');

    return {
        ...product,
        images: imageData,
        meta: {
            size: product.size || '-',
            stitches: String(product.stitches || 0),
            color_changes: String(product.colorChangeCount || 0),
            colors_used: String(product.colorCount || 0)
        }
    };
}

window.downloadPDFHandler = async (productId, btn) => {
    const originalHTML = btn.innerHTML;
    try {
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="animate-spin" style="width: 16px; height: 16px;"></i>';
        if (window.lucide) window.lucide.createIcons();

        const pdfProduct = await prepareProductForPDF(productId);
        const settings = await fetchPDFSettings();

        if (window.generateProductPDF) {
            const pdfSettings = {
                logo: settings.logo || 'MiniFrancine',
                promo: settings.promo || '',
                footer: settings.footer || 'MiniFrancine - Embroidery Designs'
            };
            await window.generateProductPDF(pdfProduct, pdfSettings);
        } else {
            throw new Error('Generador de PDF no disponible');
        }
    } catch (err) {
        console.error(err);
        alert('Error al exportar PDF: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
        if (window.lucide) window.lucide.createIcons();
    }
};

window.downloadBundleHandler = async (productId, btn) => {
    const originalHTML = btn.innerHTML;
    try {
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="animate-spin" style="width: 16px; height: 16px;"></i>';
        if (window.lucide) window.lucide.createIcons();

        const pdfProduct = await prepareProductForPDF(productId);
        const signedFiles = await downloadProductFile(productId);
        const settings = await fetchPDFSettings();

        if (window.generateProductBundle) {
            const bundleSettings = {
                logo: settings.logo || 'MiniFrancine',
                footer: settings.footer || 'MiniFrancine - Embroidery Designs'
            };
            await window.generateProductBundle(pdfProduct, signedFiles || [], bundleSettings);
        } else {
            throw new Error('Generador de Bundle no disponible');
        }

    } catch (err) {
        console.error(err);
        alert('Error al descargar Bundle: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
        if (window.lucide) window.lucide.createIcons();
    }
};

window.deleteProductHandler = async (id) => {
    if (confirm('¿Seguro que quieres eliminar este producto?')) {
        await deleteProduct(id);
        loadProducts();
    }
};

window.archiveProductHandler = async (id) => {
    if (confirm('¿Archivar este producto? Se despublicará automáticamente y no aparecerá en el catálogo.')) {
        const { error } = await archiveProduct(id);
        if (error) {
            alert('Error al archivar: ' + error.message);
        }
        loadProducts();
    }
};

window.unarchiveProductHandler = async (id) => {
    if (confirm('¿Desarchivar este producto? Deberás publicarlo manualmente si deseas que aparezca en el catálogo.')) {
        const { error } = await unarchiveProduct(id);
        if (error) {
            alert('Error al desarchivar: ' + error.message);
        }
        loadProducts();
    }
};


document.addEventListener('DOMContentLoaded', init);
