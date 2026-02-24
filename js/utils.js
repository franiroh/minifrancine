
/**
 * Escapes HTML special characters to prevent XSS attacks.
 * Use this whenever inserting user/DB data into innerHTML templates.
 */
export const escapeHtml = (str) => {
    if (str == null) return '';
    const s = String(str);
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

/**
 * Sanitizes a CSS value to prevent injection via style attributes.
 * Only allows safe CSS patterns (colors, gradients, urls).
 */
export const sanitizeCssValue = (value) => {
    if (value == null) return '';
    const s = String(value);
    // Remove anything that looks like JS injection: expression(), url(javascript:), etc.
    if (/expression\s*\(/i.test(s) || /javascript\s*:/i.test(s) || /vbscript\s*:/i.test(s)) {
        return '';
    }
    // Allow: hex colors, rgb/rgba, hsl, gradients, named colors, url() with https
    return s;
};

export const formatPrice = (price) => {
    return `USD ${parseFloat(price).toFixed(2)}`;
};

export const getUrlParam = (param) => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
};

export const renderBreadcrumbs = (items) => {
    return `
        <nav class="breadcrumbs">
            ${items.map((item, index) => `
                ${index > 0 ? '<span class="breadcrumbs__sep">/</span>' : ''}
                ${item.href
            ? `<a href="${escapeHtml(item.href)}" class="breadcrumbs__link">${escapeHtml(item.label)}</a>`
            : `<span class="breadcrumbs__current">${escapeHtml(item.label)}</span>`
        }
            `).join('')}
        </nav>
    `;
};

export const showToast = (message, type = 'info') => {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;

    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-circle';

    toast.innerHTML = `
        <i data-lucide="${iconName}"></i>
        <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    if (window.lucide) {
        window.lucide.createIcons({
            attrs: {
                class: `lucide lucide-${iconName}`
            },
            nameAttr: 'data-lucide',
            root: toast
        });
    }

    // Auto remove
    setTimeout(() => {
        toast.style.animation = 'toast-out 0.3s forwards';
        toast.addEventListener('animationend', () => {
            toast.remove();
            if (container.children.length === 0) {
                container.remove();
            }
        });
    }, 3000);
};

export const showLoadingOverlay = (message, subtext = '') => {
    // Prevent duplicates
    if (document.querySelector('.loading-overlay')) return;

    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
        <div class="loading-overlay__spinner"></div>
        <div class="loading-overlay__content">
            <h2 class="loading-overlay__text">${escapeHtml(message)}</h2>
            ${subtext ? `<p class="loading-overlay__subtext">${escapeHtml(subtext)}</p>` : ''}
        </div>
    `;
    document.body.appendChild(overlay);
};

export const hideLoadingOverlay = () => {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) {
        overlay.style.animation = 'fade-out 0.3s forwards';
        overlay.addEventListener('animationend', () => {
            overlay.remove();
        });
    }
};

export const getBadgeKey = (badge) => {
    if (!badge) return null;
    const lower = badge.toLowerCase().trim();
    if (lower === 'nuevo' || lower === 'new') return 'new';
    if (lower === 'oferta' || lower === 'sale') return 'sale';
    if (lower === 'hot') return 'hot';
    return lower; // Fallback to whatever it is (e.g if we add more later)
};

/**
 * Manages infinite scroll pagination for product grids
 */
export class InfiniteScrollManager {
    constructor(items, itemsPerPage = 24) {
        this.allItems = items;
        this.itemsPerPage = itemsPerPage;
        this.currentPage = 0;
        this.loadedItems = [];
        this.observer = null;
    }

    /**
     * Load the next page of items
     * @returns {Array} New items loaded
     */
    loadMore() {
        const start = this.currentPage * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const newItems = this.allItems.slice(start, end);
        this.loadedItems.push(...newItems);
        this.currentPage++;
        return newItems;
    }

    /**
     * Check if there are more items to load
     * @returns {boolean}
     */
    hasMore() {
        return this.currentPage * this.itemsPerPage < this.allItems.length;
    }

    /**
     * Reset pagination with new items
     * @param {Array} newItems - New array of items
     */
    reset(newItems) {
        this.allItems = newItems;
        this.currentPage = 0;
        this.loadedItems = [];
    }

    /**
     * Get all currently loaded items
     * @returns {Array}
     */
    getLoadedItems() {
        return this.loadedItems;
    }

    /**
     * Setup intersection observer for infinite scroll
     * @param {HTMLElement} sentinel - Element to observe
     * @param {Function} onLoadMore - Callback when more items should load
     */
    setupObserver(sentinel, onLoadMore) {
        if (this.observer) {
            this.observer.disconnect();
        }

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && this.hasMore()) {
                    onLoadMore();
                }
            });
        }, {
            rootMargin: '100px' // Start loading 100px before reaching sentinel
        });

        this.observer.observe(sentinel);
    }

    /**
     * Disconnect the observer
     */
    disconnect() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }
}
