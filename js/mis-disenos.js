
import { loadComponents, updateNavbarAuth, updateNavbarCartCount, createSkeletonCard } from './components.js';
import { getUser, onAuthStateChange, fetchPurchasedProducts, downloadProductFile, fetchProductById } from './api.js';
import { loadCart, getCartCount } from './state.js';
import { escapeHtml, sanitizeCssValue, showToast, InfiniteScrollManager } from './utils.js';
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
    return `
        <div class="product-card product-card--purchased" id="product-${parseInt(product.id)}" data-id="${parseInt(product.id)}">
            <a href="product.html?id=${product.id}" class="product-card__image" style="background: ${sanitizeCssValue(product.imageColor)}; display: block;">
                ${product.mainImage ? `<img src="${escapeHtml(product.mainImage)}" alt="${escapeHtml(product.title)}" class="product-card__img" loading="lazy">` : ''}
                <span class="product-card__badge product-card__badge--purchased">
                    ${i18n.t('designs.purchased')}
                </span>
            </a>
            <div class="product-card__info">
                <span class="product-card__category">${escapeHtml(product.category)}</span>
                <h3 class="product-card__title">${escapeHtml(product.title)}</h3>
                <div class="product-card__price-row">
                    <div class="product-card__btns">
                        <button class="btn btn--sm btn--purchased btn-download" data-id="${parseInt(product.id)}" data-title="${escapeHtml(product.title)}">
                            <i data-lucide="download"></i> ${i18n.t('btn.download')}
                        </button>
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

            try {
                // 1. Get Signed URLs for all files
                const signedFiles = await downloadProductFile(productId);

                if (signedFiles && signedFiles.length > 0) {
                    // 2. Fetch full product data for PDF generation
                    const productData = await fetchProductById(productId);

                    if (!productData) {
                        throw new Error('Could not fetch product details');
                    }

                    // 3. Generate and Download ZIP Bundle
                    // Set default settings for user download
                    const settings = {
                        logo: 'MiniFrancine',
                        footer: 'MiniFrancine - Embroidery Designs'
                    };

                    await generateProductBundle(productData, signedFiles, settings);

                    btn.innerHTML = `<i data-lucide="check"></i> ${i18n.t('btn.downloaded')}`;
                    if (window.lucide) window.lucide.createIcons();
                    setTimeout(() => {
                        btn.innerHTML = originalHTML;
                        btn.disabled = false;
                        if (window.lucide) window.lucide.createIcons();
                    }, 2000);
                } else {
                    showToast(i18n.t('error.file_unavailable'), 'error');
                    btn.innerHTML = originalHTML;
                    btn.disabled = false;
                    if (window.lucide) window.lucide.createIcons();
                }
            } catch (err) {
                console.error('Download error:', err);
                showToast(i18n.t('error.download_link'), 'error');
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
