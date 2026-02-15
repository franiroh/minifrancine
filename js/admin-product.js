
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
    deleteProductFile,
    supabase
} from './api.js';
import { escapeHtml } from './utils.js';

const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

let currentProduct = null;
let currentFileRec = null;

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

    if (productId) {
        document.getElementById('page-title').textContent = 'Editar Producto';
        document.getElementById('prod-id').value = productId;
        await loadProductData(productId);
    } else {
        document.getElementById('page-title').textContent = 'Nuevo Producto';
    }

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
    document.getElementById('prod-category').value = product.category || 'Anime';
    document.getElementById('prod-badge').value = product.badge || '';
    document.getElementById('prod-badge-color').value = product.badgeColor || 'red';
    document.getElementById('prod-image-color').value = product.imageColor || '';
    document.getElementById('prod-size').value = product.size || '';
    document.getElementById('prod-stitches').value = product.stitches || '';
    document.getElementById('prod-formats').value = product.formats || '';

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

async function handleSave(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save');
    const originalText = btn.textContent;
    btn.textContent = 'Guardando...';
    btn.disabled = true;

    try {
        // 1. Save Product Details
        const data = {
            title: document.getElementById('prod-title').value,
            description: document.getElementById('prod-description').value,
            price: parseFloat(document.getElementById('prod-price').value),
            old_price: parseFloat(document.getElementById('prod-old-price').value) || null,
            category: document.getElementById('prod-category').value,
            badge: document.getElementById('prod-badge').value,
            badge_color: document.getElementById('prod-badge-color').value,
            image_color: document.getElementById('prod-image-color').value,
            size: document.getElementById('prod-size').value,
            stitches: document.getElementById('prod-stitches').value || '',
            formats: document.getElementById('prod-formats').value,
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

            // If it was a new product, or existing one with no main image, set the first uploaded one as main
            // Or just always update main_image to the latest or first? 
            // Simplified: If product has no main_image, set it.
            if ((!currentProduct || !currentProduct.mainImage) && firstImageUrl) {
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

        alert('Producto guardado correctamente');
        window.location.href = 'admin.html#products';

    } catch (err) {
        console.error(err);
        alert('Error al guardar: ' + err.message);
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', init);
