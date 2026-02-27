
import { loadComponents, updateNavbarAuth, updateNavbarCartCount, createSkeletonCard } from './components.js';
import { getUser, onAuthStateChange, fetchPurchasedProducts, downloadProductFile, fetchProductById, fetchProductImages, fetchPDFSettings, getSignedBundleUrl } from './api.js';
import { loadCart, getCartCount } from './state.js';
import { escapeHtml, sanitizeCssValue, showToast, InfiniteScrollManager, showLoadingOverlay, hideLoadingOverlay } from './utils.js';
import { generateProductBundle } from './pdf-export.js';
import i18n from './i18n.js';

async function init() {
    // 1. Init User State early to prevent flickering
    const user = await getUser();

    // 2. Load Navbar/Footer
    await loadComponents(user);

    // Show skeletons immediately
    const grid = document.getElementById('designs-grid');
    if (grid) {
        grid.innerHTML = Array(4).fill(0).map(() => createSkeletonCard()).join('');
    }

    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    await loadCart(user);
    updateNavbarCartCount(getCartCount());

    onAuthStateChange((event, session) => {
        const u = session ? session.user : null;
        updateNavbarAuth(u);
        if (!u) window.location.href = 'login.html';
    });

    window.addEventListener('cart-updated', () => {
        updateNavbarCartCount(getCartCount());
    });

    await loadAndRender();
}

async function loadAndRender() {
    const grid = document.getElementById('designs-grid');

    try {
        const products = await fetchPurchasedProducts();
        renderDesigns(products);
    } catch (error) {
        console.error('Error loading purchased products:', error);
        grid.innerHTML = `
            <div class="empty-state">
                <p>${i18n.t('error.designs_load')}</p>
            </div>
        `;
    }
}

let designsScrollManager = null;

function renderDesigns(products) {
    const grid = document.getElementById('designs-grid');

    if (!products || products.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i data-lucide="package" style="width:48px; height:48px; opacity:0.5;"></i>
                <p>${i18n.t('designs.empty')}</p>
                <a href="index.html" class="btn btn--primary" style="margin-top: 8px;">${i18n.t('favorites.action')}</a>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    // Initialize scroll manager
    if (designsScrollManager) {
        designsScrollManager.disconnect();
    }
    designsScrollManager = new InfiniteScrollManager(products, 24);

    // Clear grid and load first page
    grid.innerHTML = '';
    const firstBatch = designsScrollManager.loadMore();
    grid.innerHTML = firstBatch.map(product => renderDesignCard(product)).join('');

    // Create or get sentinel and loading indicator
    let sentinel = document.getElementById('designs-scroll-sentinel');
    let loadingIndicator = document.getElementById('designs-loading-more');

    if (!sentinel) {
        sentinel = document.createElement('div');
        sentinel.id = 'designs-scroll-sentinel';
        sentinel.style.height = '1px';
        grid.parentElement.appendChild(sentinel);
    }

    if (!loadingIndicator) {
        loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'designs-loading-more';
        loadingIndicator.style.cssText = 'display: none; text-align: center; padding: 20px;';
        loadingIndicator.innerHTML = Array(4).fill(0).map(() => createSkeletonCard()).join('');
        grid.parentElement.appendChild(loadingIndicator);
    }

    // Setup infinite scroll
    designsScrollManager.setupObserver(sentinel, () => {
        if (!designsScrollManager.hasMore()) return;

        loadingIndicator.style.display = 'grid';
        loadingIndicator.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
        loadingIndicator.style.gap = '24px';

        setTimeout(() => {
            const newBatch = designsScrollManager.loadMore();
            grid.insertAdjacentHTML('beforeend', newBatch.map(p => renderDesignCard(p)).join(''));
            loadingIndicator.style.display = 'none';
            if (window.lucide) window.lucide.createIcons();
            attachDownloadListeners();
        }, 300);
    });

    if (window.lucide) window.lucide.createIcons();
    attachDownloadListeners();
    handleScrollToProduct();
}

function renderDesignCard(product) {
    const noIndex = product.indexed === false;
    const imageHtml = (product.mainImage)
        ? (noIndex
            ? `<div class="product-card__img product-card__img--noindex" style="background-image: url('${escapeHtml(product.mainImage)}'); background-size: cover; background-position: center; width: 100%; height: 100%;" aria-label="${escapeHtml(product.title)}"></div>`
            : `<img src="${escapeHtml(product.mainImage)}" alt="${escapeHtml(product.title)}" class="product-card__img" loading="lazy">`)
        : '';

    return `
        <div class="product-card product-card--purchased ${noIndex ? 'product-card--noindex' : ''}" id="product-${parseInt(product.id)}" data-id="${parseInt(product.id)}" ${noIndex ? 'data-nosnippet' : ''}>
            <a href="product.html?id=${product.id}" class="product-card__image" style="background: ${sanitizeCssValue(product.imageColor)}; display: block;" ${noIndex ? 'rel="nofollow"' : ''}>
                ${imageHtml}
                <span class="product-card__badge product-card__badge--purchased">
                    ${i18n.t('designs.purchased')}
                </span>
            </a>
            <div class="product-card__info">
                <span class="product-card__category">${escapeHtml(product.category)}</span>
                <h3 class="product-card__title">${escapeHtml(product.title)}</h3>
                <div class="product-card__price-row">
                    <div class="product-card__btns">
                        ${product.isBundle ? '' : `
                        <button class="btn btn--sm btn--purchased btn-download" data-id="${parseInt(product.id)}" data-title="${escapeHtml(product.title)}">
                            <i data-lucide="download"></i> ${i18n.t('btn.download')}
                        </button>
                        `}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function attachDownloadListeners() {
    document.querySelectorAll('.btn-download').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const productId = parseInt(btn.dataset.id);
            const productTitle = btn.dataset.title;

            const originalHTML = btn.innerHTML;
            btn.innerHTML = `<i data-lucide="loader"></i> ${i18n.t('btn.downloading')}`;
            btn.disabled = true;
            if (window.lucide) window.lucide.createIcons();

            // Show persistent loading overlay
            showLoadingOverlay(i18n.t('btn.downloading'), i18n.t('msg.download_preparing'));

            try {
                // 1. Check if pre-generated ZIP exists
                const product = await fetchProductById(productId);
                if (!product) {
                    throw new Error('No se pudo obtener la información del producto.');
                }

                if (product.bundledZipUrl) {
                    // FAST PATH: Download pre-generated ZIP
                    const downloadName = `${product.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.zip`;
                    const signedUrl = await getSignedBundleUrl(product.bundledZipUrl, downloadName);
                    if (signedUrl) {
                        const link = document.createElement('a');
                        link.href = signedUrl;
                        link.download = `${product.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.zip`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);

                        // Success!
                        hideLoadingOverlay();
                        btn.innerHTML = `<i data-lucide="check"></i> ${i18n.t('btn.downloaded')}`;
                        if (window.lucide) window.lucide.createIcons();
                        setTimeout(() => {
                            btn.innerHTML = originalHTML;
                            btn.disabled = false;
                            if (window.lucide) window.lucide.createIcons();
                        }, 2000);
                        return; // Exit
                    }
                }

                // SLOW PATH (Fallback): Generate on the fly
                const signedFiles = await downloadProductFile(productId);

                const images = await fetchProductImages(productId);
                const imageData = images ? images.map(img => img.public_url) : [];

                // 3. Prepare structured product record for PDF generator
                const productForPDF = {
                    ...product,
                    images: imageData,
                    meta: {
                        size: product.size || '-',
                        stitches: String(product.stitches || 0),
                        color_changes: String(product.colorChangeCount || 0),
                        colors_used: String(product.colorCount || 0)
                    }
                };

                // 4. Fetch Global PDF Settings (Logo, Promo, Footer from Admin)
                const pdfSettings = await fetchPDFSettings();

                // Fallback to defaults if settings are empty
                const settings = {
                    logo: pdfSettings.logo || 'MiniFrancine',
                    promo: pdfSettings.promo || '',
                    footer: pdfSettings.footer || 'MiniFrancine - Embroidery Designs'
                };

                await generateProductBundle(productForPDF, signedFiles, settings);

                // Success!
                hideLoadingOverlay();
                btn.innerHTML = `<i data-lucide="check"></i> ${i18n.t('btn.downloaded')}`;
                if (window.lucide) window.lucide.createIcons();
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.disabled = false;
                    if (window.lucide) window.lucide.createIcons();
                }, 2000);
            } catch (err) {
                console.error('Download error:', err);
                hideLoadingOverlay();
                const errMsg = err.message || i18n.t('error.download_link');
                showToast(errMsg, 'error');
                btn.innerHTML = originalHTML;
                btn.disabled = false;
                if (window.lucide) window.lucide.createIcons();
            }
        });
    });
}

function handleScrollToProduct() {
    const hash = window.location.hash;
    if (!hash || !hash.startsWith('#product-')) return;

    const targetId = hash.substring(1);
    const targetCard = document.getElementById(targetId);

    if (targetCard) {
        setTimeout(() => {
            targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            targetCard.classList.add('product-card--highlighted');
            setTimeout(() => {
                targetCard.classList.remove('product-card--highlighted');
            }, 1500);
        }, 300);
    }
}

document.addEventListener('DOMContentLoaded', init);
