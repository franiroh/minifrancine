
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
import {
    getUser,
    fetchProductById,
    createProduct,
    updateProduct,
    uploadProductImage,
    saveProductImageRecord,
    fetchProductImages,
    deleteProductImage,
    uploadProductFile,
    saveProductFileRecord,
    fetchProductFile,
    fetchCategories,
    fetchProductsListAdmin,
    supabase
} from './api.js';
import { escapeHtml } from './utils.js';

const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

let currentProduct = null;
let currentFileRec = null;

let allAdminProducts = [];
let selectedRelatedProducts = [];
let allCategories = [];
let selectedCategoryIds = [];

async function init() {
    // Auth Check
    const user = await getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Role Check
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || profile.role !== 'admin') {
        alert('Access Denied');
        window.location.href = 'index.html';
        return;
    }

    // Populate Topbar Info
    const emailEl = document.getElementById('admin-email');
    if (emailEl) emailEl.textContent = user.email;

    if (window.lucide) window.lucide.createIcons();

    // Populate categories
    allCategories = await fetchCategories();
    // Instead of populating a <select>, we just render our custom UI based on the current state.
    renderCategorySelectorUI();

    // Fetch all products for related products datalist
    allAdminProducts = await fetchProductsListAdmin();
    if (productId) {
        allAdminProducts = allAdminProducts.filter(p => p.id !== parseInt(productId, 10));
    }
    const datalist = document.getElementById('related-products-list');
    if (datalist) {
        datalist.innerHTML = allAdminProducts.map(p =>
            `<option value="${p.id} - ${escapeHtml(p.title)}">`
        ).join('');
    }

    if (productId) {
        document.getElementById('page-title').textContent = 'Editar Producto';
        document.getElementById('prod-id').value = productId;

        // Configure View Button
        const viewBtn = document.getElementById('btn-view-product');
        if (viewBtn) {
            viewBtn.classList.remove('hidden');
            viewBtn.onclick = () => window.open(`product.html?id=${productId}`, '_blank');
        }

        await loadProductData(productId);
    } else {
        document.getElementById('page-title').textContent = 'Nuevo Producto';
    }

    // Published toggle label sync
    const pubCheckbox = document.getElementById('prod-published');
    const pubLabel = document.getElementById('prod-published-label');
    pubCheckbox.addEventListener('change', () => {
        pubLabel.textContent = pubCheckbox.checked ? 'Publicado' : 'No publicado';
        pubLabel.style.color = pubCheckbox.checked ? '#22C55E' : '#9CA3AF';
    });

    // Indexed toggle label sync
    const indexCheckbox = document.getElementById('prod-indexed');
    const indexLabel = document.getElementById('prod-indexed-label');
    indexCheckbox.addEventListener('change', () => {
        indexLabel.textContent = indexCheckbox.checked ? 'Indexar' : 'No indexar';
        indexLabel.style.color = indexCheckbox.checked ? '#22C55E' : '#9CA3AF';
    });

    setupEventListeners();
    fadeOutPreloader();
}

function fadeOutPreloader() {
    const preloader = document.getElementById('preloader');
    if (preloader) {
        preloader.classList.add('hidden');
        setTimeout(() => preloader.remove(), 300);
    }
}

async function loadProductData(id) {
    const product = await fetchProductById(id);
    if (!product) {
        alert('Producto no encontrado');
        window.location.href = 'admin.html#products';
        return;
    }
    currentProduct = product;

    // Fill Basic Fields
    document.getElementById('prod-title').value = product.title || '';
    document.getElementById('prod-description').value = product.description || '';
    document.getElementById('prod-price').value = product.price || '';
    document.getElementById('prod-old-price').value = product.oldPrice || '';
    selectedCategoryIds = product.categoryIds || (product.categoryId ? [product.categoryId] : []);
    renderCategorySelectorUI();
    const badgeVal = product.badge ? product.badge.toLowerCase() : '';
    // Map existing common values to standardized keys if needed
    const standardizedBadge = badgeVal === 'nuevo' ? 'new' : (badgeVal === 'oferta' ? 'sale' : badgeVal);
    document.getElementById('prod-badge').value = standardizedBadge;
    document.getElementById('prod-badge-color').value = product.badgeColor || 'red';
    document.getElementById('prod-tags').value = (product.tags || []).join(', ');
    document.getElementById('prod-image-color').value = product.imageColor || '';
    document.getElementById('prod-color-count').value = product.colorCount || '';
    document.getElementById('prod-color-change-count').value = product.colorChangeCount || '';
    document.getElementById('prod-size').value = product.size || '';
    document.getElementById('prod-stitches').value = product.stitches ? Number(product.stitches).toLocaleString('en-US') : '';
    document.getElementById('prod-formats').value = product.formats || '';

    // Published state
    const pubCheckbox = document.getElementById('prod-published');
    const pubLabel = document.getElementById('prod-published-label');
    pubCheckbox.checked = product.published !== false;
    pubLabel.textContent = pubCheckbox.checked ? 'Publicado' : 'No publicado';
    pubLabel.style.color = pubCheckbox.checked ? '#22C55E' : '#9CA3AF';

    // Indexed state
    const indexCheckbox = document.getElementById('prod-indexed');
    const indexLabel = document.getElementById('prod-indexed-label');
    indexCheckbox.checked = product.indexed !== false; // default true
    indexLabel.textContent = indexCheckbox.checked ? 'Indexar' : 'No indexar';
    indexLabel.style.color = indexCheckbox.checked ? '#22C55E' : '#9CA3AF';

    // Load Related Products
    selectedRelatedProducts = product.relatedProductIds || [];
    renderRelatedProducts();

    // Load Images
    const images = await fetchProductImages(id);
    const gallery = document.getElementById('image-gallery');
    gallery.innerHTML = '';

    // Check if we have main_image but no gallery images (legacy migration visual aid)
    if (images.length === 0 && product.mainImage) {
        // Show at least the main image if exists
        gallery.innerHTML += createGalleryItemHTML('legacy-main', product.mainImage, false);
    }

    images.forEach(img => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.innerHTML = `
            <img src="${escapeHtml(img.public_url)}" loading="lazy">
            <div class="remove-btn" onclick="removeImage('${escapeHtml(img.id)}')">
                <i data-lucide="x" style="width: 16px; height: 16px;"></i>
            </div>
        `;
        gallery.appendChild(item);
    });

    if (window.lucide) window.lucide.createIcons();

    // Load File Info
    const fileRec = await fetchProductFile(id);
    if (fileRec) {
        currentFileRec = fileRec;
        showFileStatus(fileRec.filename);
    }
}

function createGalleryItemHTML(id, url, canDelete) {
    return `
        <div class="gallery-item">
            <img src="${escapeHtml(url)}" loading="lazy">
            ${canDelete ? `
            <div class="remove-btn" onclick="removeImage('${escapeHtml(id)}')">
                <i data-lucide="x" style="width: 16px; height: 16px;"></i>
            </div>` : ''}
        </div>
    `;
}

function setupEventListeners() {
    // Save Button
    document.getElementById('btn-save').onclick = handleSave;

    // Related Products
    const btnAddRelated = document.getElementById('btn-add-related');
    if (btnAddRelated) btnAddRelated.onclick = handleAddRelated;

    // Image Upload Drop/Click
    const dropZone = document.getElementById('images-drop-zone');
    const fileInput = document.getElementById('prod-images-input');

    dropZone.onclick = () => fileInput.click();
    fileInput.onchange = handleImageSelect;

    dropZone.ondragover = (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--primary-color)'; };
    dropZone.ondragleave = (e) => { e.preventDefault(); dropZone.style.borderColor = '#e5e7eb'; };
    dropZone.ondrop = (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#e5e7eb';
        handleImageSelect({ target: { files: e.dataTransfer.files } });
    };

    // File Upload
    const fileDropZone = document.getElementById('file-drop-zone');
    const prodFileInput = document.getElementById('prod-file-input');

    fileDropZone.onclick = () => prodFileInput.click();
    prodFileInput.onchange = handleFileSelect;

    fileDropZone.ondragover = (e) => { e.preventDefault(); fileDropZone.style.borderColor = 'var(--primary-color)'; };
    fileDropZone.ondragleave = (e) => { e.preventDefault(); fileDropZone.style.borderColor = '#e5e7eb'; };
    fileDropZone.ondrop = (e) => {
        e.preventDefault();
        fileDropZone.style.borderColor = '#e5e7eb';
        handleFileSelect({ target: { files: e.dataTransfer.files } });
    };

    // Delete File
    document.getElementById('btn-delete-file').onclick = handleDeleteFile;

    // Stitches: auto-format with commas as user types
    const stitchesInput = document.getElementById('prod-stitches');
    stitchesInput.addEventListener('input', () => {
        const raw = stitchesInput.value.replace(/,/g, '').replace(/\D/g, '');
        stitchesInput.value = raw ? Number(raw).toLocaleString('en-US') : '';
    });
}

let pendingImages = [];
let pendingFile = null;

// Allowed types and limits for security
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed', 'application/x-7z-compressed'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function handleImageSelect(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    files.forEach(file => {
        // Validate image type
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            alert(`Tipo de archivo no permitido: ${file.name}. Solo se aceptan: JPG, PNG, WebP, GIF.`);
            return;
        }
        // Validate image size
        if (file.size > MAX_IMAGE_SIZE) {
            alert(`Archivo demasiado grande: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo: 5MB.`);
            return;
        }
        pendingImages.push(file);

        // Preview
        const reader = new FileReader();
        reader.onload = (loadEvent) => {
            const gallery = document.getElementById('image-gallery');
            const item = document.createElement('div');
            item.className = 'gallery-item';
            item.style.opacity = '0.7'; // Indicate pending
            item.innerHTML = `
                <img src="${loadEvent.target.result}">
                <div class="remove-btn" title="Pending Save">
                    <i data-lucide="clock" style="width: 16px; height: 16px;"></i>
                </div>
            `;
            gallery.appendChild(item);
            if (window.lucide) window.lucide.createIcons();
        };
        reader.readAsDataURL(file);
    });
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        alert(`Tipo de archivo no permitido: ${file.name}. Solo se aceptan: ZIP, RAR, 7z.`);
        e.target.value = '';
        return;
    }
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
        alert(`Archivo demasiado grande: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo: 50MB.`);
        e.target.value = '';
        return;
    }

    pendingFile = file;
    showFileStatus(file.name + ' (Pendiente de guardar)');
}

function showFileStatus(name) {
    document.getElementById('file-drop-zone').classList.add('hidden');
    document.getElementById('current-file-display').classList.remove('hidden');
    document.getElementById('current-filename').textContent = name;
}

async function handleDeleteFile() {
    if (!confirm('¿Eliminar archivo? Se borrará al guardar los cambios (o inmediatamente si ya existe).')) return;

    if (currentFileRec) {
        await deleteProductFile(currentFileRec.id);
        currentFileRec = null;
    }
    pendingFile = null;

    document.getElementById('file-drop-zone').classList.remove('hidden');
    document.getElementById('current-file-display').classList.add('hidden');
    document.getElementById('prod-file-input').value = '';
}

window.removeImage = async (id) => {
    if (id === 'legacy-main') return; // Can't delete the fallback easily from here without refreshing logic
    if (confirm('¿Eliminar imagen?')) {
        await deleteProductImage(id);
        // Refresh
        await loadProductData(productId);
    }
};

function handleAddRelated() {
    const input = document.getElementById('prod-related-search');
    const val = input.value.trim();
    if (!val) return;

    // Extract ID from "ID - Title" format
    const match = val.match(/^(\d+)\s+-/);
    if (!match) {
        alert("Selecciona un diseño válido de la lista.");
        return;
    }
    const id = parseInt(match[1], 10);

    if (selectedRelatedProducts.includes(id)) {
        alert("Este diseño ya está en la lista de relacionados.");
        input.value = '';
        return;
    }

    selectedRelatedProducts.push(id);
    renderRelatedProducts();
    input.value = '';
}

window.removeRelatedProduct = (id) => {
    selectedRelatedProducts = selectedRelatedProducts.filter(pid => pid !== id);
    renderRelatedProducts();
};

function renderRelatedProducts() {
    const container = document.getElementById('related-products-container');
    if (!container) return;

    if (selectedRelatedProducts.length === 0) {
        container.innerHTML = '<p class="text-gray text-sm">No hay diseños relacionados seleccionados.</p>';
        return;
    }

    container.innerHTML = selectedRelatedProducts.map(id => {
        const prod = allAdminProducts.find(p => p.id === id);
        const title = prod ? escapeHtml(prod.title) : `Diseño #${id} (No encontrado)`;
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border: 1px solid #e5e7eb; border-radius: 6px;">
                <span class="text-sm">${title}</span>
                <button type="button" class="btn-icon text-red" onclick="removeRelatedProduct(${id})">
                    <i data-lucide="trash-2" style="width:16px; height:16px;"></i>
                </button>
            </div>
        `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
}

async function handleSave(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save');
    const originalText = btn.textContent;
    btn.textContent = 'Guardando...';
    btn.disabled = true;

    try {
        // 1. Save Product Details
        const selectedCategories = selectedCategoryIds;
        const data = {
            title: document.getElementById('prod-title').value,
            description: document.getElementById('prod-description').value,
            price: parseFloat(document.getElementById('prod-price').value),
            old_price: parseFloat(document.getElementById('prod-old-price').value) || null,
            category_id: selectedCategories.length > 0 ? selectedCategories[0] : null,
            categoryIds: selectedCategories,
            badge: document.getElementById('prod-badge').value,
            badge_color: document.getElementById('prod-badge-color').value,
            tags: document.getElementById('prod-tags').value.split(',').map(t => t.trim()).filter(t => t),
            image_color: document.getElementById('prod-image-color').value,
            color_count: parseInt(document.getElementById('prod-color-count').value) || 0,
            color_change_count: parseInt(document.getElementById('prod-color-change-count').value) || 0,
            size: document.getElementById('prod-size').value,
            stitches: parseInt(document.getElementById('prod-stitches').value.replace(/,/g, ''), 10) || 0,
            formats: document.getElementById('prod-formats').value,
            published: document.getElementById('prod-published').checked,
            indexed: document.getElementById('prod-indexed').checked,
            related_product_ids: selectedRelatedProducts
        };

        let savedProductId = productId; // Existing or new

        if (productId) {
            const { error } = await updateProduct(productId, data);
            if (error) throw error;
        } else {
            const { data: newProd, error } = await createProduct(data);
            if (error) throw error;
            savedProductId = newProd.id;
        }

        // 2. Upload Pending Images
        if (pendingImages.length > 0) {
            let firstImageUrl = null;
            for (const file of pendingImages) {
                const res = await uploadProductImage(file);
                if (res) {
                    const { error: imgErr } = await saveProductImageRecord(savedProductId, res.storagePath, res.publicUrl);
                    if (imgErr) throw imgErr;
                    if (!firstImageUrl) firstImageUrl = res.publicUrl;
                }
            }

            // Always update main_image to the first uploaded image
            if (firstImageUrl) {
                const { error: mainImgErr } = await updateProduct(savedProductId, { main_image: firstImageUrl });
                if (mainImgErr) throw mainImgErr;
            }

        }

        // 3. Upload Pending File
        if (pendingFile) {
            // Delete old if exists? logic handled in UI mostly, but to be safe:
            if (currentFileRec) {
                await deleteProductFile(currentFileRec.id);
            }
            const res = await uploadProductFile(pendingFile);
            if (res) {
                const { error: fileErr } = await saveProductFileRecord(savedProductId, res.storagePath, res.filename);
                if (fileErr) throw fileErr;
            }
        }

        // --- FIX: Clear pending buffers so subsequent saves don't re-upload/duplicate ---
        pendingImages = [];
        pendingFile = null;
        // -------------------------------------------------------------------------------

        alert('Producto guardado correctamente');

        // If it was a new product, redirect to edit mode for this product
        if (!productId) {
            window.location.href = `admin-product.html?id=${savedProductId}`;
        } else {
            // If existing, just refresh data (optional) or just stay here
            // Ensure View button is visible
            const viewBtn = document.getElementById('btn-view-product');
            if (viewBtn) {
                viewBtn.classList.remove('hidden');
                viewBtn.onclick = () => window.open(`product.html?id=${savedProductId}`, '_blank');
            }
            // Optionally reload data to confirm consistent state
            await loadProductData(savedProductId);
        }

    } catch (err) {
        console.error(err);
        alert('Error al guardar: ' + err.message);
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

function renderCategorySelectorUI() {
    const container = document.getElementById('selected-categories-container');
    const dropdownList = document.getElementById('category-dropdown-list');
    const msg = document.getElementById('no-categories-msg');

    if (!container || !dropdownList) return;

    // 1. Render Selected Tags
    container.innerHTML = '';
    if (selectedCategoryIds.length === 0) {
        if (msg) container.appendChild(msg);
    } else {
        selectedCategoryIds.forEach(id => {
            const category = allCategories.find(c => c.id === id);
            if (category) {
                const tagEl = document.createElement('div');
                tagEl.className = 'selected-tag';
                tagEl.style.cssText = 'display: inline-flex; align-items: center; background: #FFF0F0; border: 1px solid #FFE0E0; color: #FF6B6B; padding: 4px 8px; border-radius: 9999px; font-size: 14px;';

                const nameSpan = document.createElement('span');
                nameSpan.textContent = escapeHtml(category.name);
                tagEl.appendChild(nameSpan);

                const removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.innerHTML = '<i data-lucide="x" style="width: 14px; height: 14px;"></i>';
                removeBtn.style.cssText = 'background: none; border: none; padding: 0; margin-left: 6px; cursor: pointer; color: inherit; display: flex; align-items: center;';
                removeBtn.onclick = (e) => {
                    e.stopPropagation();
                    selectedCategoryIds = selectedCategoryIds.filter(catId => catId !== id);
                    renderCategorySelectorUI();
                };
                tagEl.appendChild(removeBtn);

                container.appendChild(tagEl);
            }
        });
    }

    // 2. Render Dropdown Options
    dropdownList.innerHTML = '';
    const availableCategories = allCategories.filter(c => !selectedCategoryIds.includes(c.id));

    if (availableCategories.length === 0) {
        const emptyEl = document.createElement('div');
        emptyEl.style.cssText = 'padding: 8px 12px; color: #6B7280; font-size: 14px; text-align: center;';
        emptyEl.textContent = 'No hay más categorías disponibles';
        dropdownList.appendChild(emptyEl);
    } else {
        availableCategories.forEach(category => {
            const itemEl = document.createElement('div');
            itemEl.className = 'dropdown-item';
            itemEl.style.cssText = 'padding: 8px 12px; cursor: pointer; transition: background 0.2s; font-size: 14px; color: #374151;';
            itemEl.textContent = escapeHtml(category.name);
            itemEl.onmouseover = () => itemEl.style.background = '#F3F4F6';
            itemEl.onmouseout = () => itemEl.style.background = 'transparent';
            itemEl.onclick = () => {
                selectedCategoryIds.push(category.id);
                renderCategorySelectorUI();
                dropdownList.classList.add('hidden');
            };
            dropdownList.appendChild(itemEl);
        });
    }

    if (window.lucide) window.lucide.createIcons();
}

document.addEventListener('DOMContentLoaded', () => {
    init();

    const dropdownBtn = document.getElementById('category-dropdown-btn');
    const dropdownList = document.getElementById('category-dropdown-list');

    if (dropdownBtn && dropdownList) {
        dropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownList.classList.toggle('hidden');
        });

        document.addEventListener('click', (e) => {
            if (!dropdownBtn.contains(e.target) && !dropdownList.contains(e.target)) {
                dropdownList.classList.add('hidden');
            }
        });
    }
});
