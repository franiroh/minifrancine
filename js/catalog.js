import { fetchProducts, getUser, fetchCategories } from './api.js';
import { loadComponents, createProductCard, createSkeletonCard } from './components.js';
import { loadFavorites, loadPurchases, addToCart, toggleFavorite } from './state.js';
import { renderBreadcrumbs, escapeHtml, InfiniteScrollManager } from './utils.js';
import i18n from './i18n.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Immediate UI Updates (Prevent Flash)
    const params = new URLSearchParams(window.location.search);
    const tag = params.get('tag');
    const category = params.get('category');
    const search = params.get('search');

    const pageTitle = document.getElementById('page-title');
    const catalogHeader = document.querySelector('.catalog__header');
    const categoryHeader = document.getElementById('category-header');
    const categoryTitle = document.getElementById('category-title');
    const resultCount = document.getElementById('result-count');

    // Apply visibility/text changes immediately
    // Apply visibility/text changes
    if (category) {
        // Category View
        if (catalogHeader) catalogHeader.style.display = 'none';
        categoryHeader.style.display = 'block';
        // Wait for translation to load before setting text
        // categoryTitle.textContent = category; 
        categoryTitle.innerHTML = '<span class="skeleton-text" style="width: 200px; display: inline-block;"></span>';
        categoryTitle.removeAttribute('data-i18n');
        document.title = `Categoría: ${category} — MiniFrancine`;
    } else if (tag) {
        // Tag View
        if (pageTitle) {
            // Use i18n for "Tag:" prefix if possible, or just hardcode as existing but allow dynamic updates
            // Better: Set data-i18n to a key that accepts params? 
            // Or just manual construction:
            const tagPrefix = i18n.t('catalog.tag_prefix') || 'Etiqueta:';
            pageTitle.textContent = `${tagPrefix} "${tag}"`;
            pageTitle.removeAttribute('data-i18n');
        }
        document.title = `Etiqueta: ${tag} — MiniFrancine`;
    } else if (search) {
        // Search View
        if (pageTitle) {
            const searchPrefix = i18n.t('catalog.search_prefix') || 'Resultados para:';
            pageTitle.textContent = `${searchPrefix} "${search}"`;
            pageTitle.removeAttribute('data-i18n');
        }
        document.title = `Búsqueda: ${search} — MiniFrancine`;
    }

    // 2. Load Components (Navbar/Footer) - This initializes i18n
    await loadComponents();

    // Import i18n dynamically or from module if possible, but loadComponents initializes it. 
    // We can import it at top level.

    if (category) {
        // Category View
        if (catalogHeader) catalogHeader.style.display = 'none';
        categoryHeader.style.display = 'block';
        // Wait for translation to load before setting text
        // categoryTitle.textContent = category; 
        categoryTitle.innerHTML = '<span class="skeleton-text" style="width: 200px; display: inline-block;"></span>';
        categoryTitle.removeAttribute('data-i18n');
        document.title = `Categoría: ${category} — MiniFrancine`;
    } else if (tag) {
        // Tag View - Re-apply title with correct translation now that i18n is initialized
        if (pageTitle) {
            const tagPrefix = i18n.t('catalog.tag_prefix');
            pageTitle.textContent = `${tagPrefix} "${tag}"`;
            pageTitle.removeAttribute('data-i18n');
        }
        document.title = `Etiqueta: ${tag} — MiniFrancine`;
    } else {
        // Default All View - Show category header with full catalog title
        if (catalogHeader) catalogHeader.style.display = 'none';
        categoryHeader.style.display = 'block';
        if (categoryTitle) {
            categoryTitle.textContent = i18n.t('catalog.full_title') || 'Catálogo Completo';
            categoryTitle.setAttribute('data-i18n', 'catalog.full_title');
        }
        // Update subtitle
        const categorySubtitle = categoryHeader?.querySelector('p');
        if (categorySubtitle) {
            categorySubtitle.textContent = i18n.t('catalog.full_subtitle') || 'Explora todos nuestros diseños de bordado';
            categorySubtitle.setAttribute('data-i18n', 'catalog.full_subtitle');
        }
    }

    const grid = document.getElementById('catalog-grid');
    if (grid) {
        grid.innerHTML = Array(8).fill(0).map(() => createSkeletonCard()).join('');
    }

    // 3. Init User State
    const user = await getUser();
    if (user) {
        await Promise.all([
            loadFavorites(user),
            loadPurchases(user)
        ]);
    }

    // 4. Fetch Categories & Render Filters
    const categories = await fetchCategories();
    renderFilters(categories, category);

    // Update Title with Translation if category is present
    if (category) {
        const catObj = categories.find(c => c.name === category);
        if (catObj) {
            const translatedName = i18n.t(`category.${catObj.id}`);
            if (categoryTitle) categoryTitle.textContent = translatedName;
            document.title = `Categoría: ${translatedName} — MiniFrancine`;
        }
    }

    // 5. Render Breadcrumbs
    const breadcrumbsContainer = document.getElementById('breadcrumbs-placeholder');
    if (breadcrumbsContainer) {
        if (category) {
            const catObj = categories.find(c => c.name === category);
            const label = catObj ? i18n.t(`category.${catObj.id}`) : category;

            breadcrumbsContainer.innerHTML = renderBreadcrumbs([
                { label: i18n.t('nav.home'), href: 'index.html' },
                { label: i18n.t('nav.catalog'), href: 'categories.html' },
                { label: label, href: null }
            ]);
        } else if (tag) {
            breadcrumbsContainer.innerHTML = renderBreadcrumbs([
                { label: i18n.t('nav.home'), href: 'index.html' },
                { label: i18n.t('nav.catalog'), href: 'catalog.html' },
                { label: tag, href: null }
            ]);
        } else if (search) {
            breadcrumbsContainer.innerHTML = renderBreadcrumbs([
                { label: i18n.t('nav.home'), href: 'index.html' },
                { label: i18n.t('nav.catalog'), href: 'catalog.html' },
                { label: `"${search}"`, href: null }
            ]);
        } else {
            breadcrumbsContainer.innerHTML = renderBreadcrumbs([
                { label: i18n.t('nav.home'), href: 'index.html' },
                { label: i18n.t('nav.catalog'), href: null }
            ]);
        }
    }

    // 6. Fetch Products
    const sort = params.get('sort');

    // Fetch products. If category is selected, we fetch all to extract tags, then filter.
    // However, fetchProducts already handles search/tag/sort.
    // For category view, we fetch all products to get the full tag list for that category.
    let fetchedProducts = await fetchProducts({
        publishedOnly: true,
        // If NO category, we can use DB-level tag/search filtering
        tag: category ? null : tag,
        search: search,
        sort: sort
    });

    let displayProducts = fetchedProducts;
    if (category) {
        displayProducts = fetchedProducts.filter(p => p.category === category);
        // Render tag filters based on ALL products in this category
        renderTagFilters(displayProducts, category, tag);

        // Then apply the tag filter for the grid if present
        if (tag) {
            displayProducts = displayProducts.filter(p => p.tags && p.tags.includes(tag));
        }
    } else {
        const tagContainer = document.getElementById('tag-filters');
        if (tagContainer) tagContainer.style.display = 'none';
    }

    // Update count
    if (resultCount) {
        resultCount.dataset.count = displayProducts.length;
        const key = displayProducts.length === 1 ? 'catalog.result_single' : 'catalog.result_plural';
        resultCount.textContent = `${displayProducts.length} ${i18n.t(key)}`;
    }

    // 7. Render Grid
    renderGrid(grid, displayProducts);
});

function renderTagFilters(categoryProducts, categoryName, activeTag) {
    const container = document.getElementById('tag-filters');
    if (!container) return;

    // Extract unique tags from products in this category
    const allTags = new Set();
    categoryProducts.forEach(p => {
        if (p.tags && Array.isArray(p.tags)) {
            p.tags.forEach(t => allTags.add(t));
        }
    });

    if (allTags.size === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'flex';

    // "Todos" chip for the current category
    let html = `
        <a href="catalog.html?category=${encodeURIComponent(categoryName)}" 
           class="filter-chip filter-chip--tag ${!activeTag ? 'filter-chip--active' : ''}" 
           style="text-decoration: none;">
           ${i18n.t('category.all') || 'Todos'}
        </a>
    `;

    // Sort tags alphabetically
    const sortedTags = Array.from(allTags).sort((a, b) => a.localeCompare(b));

    html += sortedTags.map(t => {
        const isActive = activeTag === t;
        return `
            <a href="catalog.html?category=${encodeURIComponent(categoryName)}&tag=${encodeURIComponent(t)}" 
               class="filter-chip filter-chip--tag ${isActive ? 'filter-chip--active' : ''}" 
               style="text-decoration: none;">
               ${escapeHtml(t)}
            </a>
        `;
    }).join('');

    container.innerHTML = html;
}

function renderFilters(categories, activeCategory) {
    const container = document.getElementById('catalog-filters');
    if (!container) return;

    if (!categories || categories.length === 0) return;

    // 'Todos' button
    let html = `
        <a href="catalog.html" class="filter-chip ${!activeCategory ? 'filter-chip--active' : ''}" style="text-decoration: none;" data-i18n="category.all">${i18n.t('category.all') || 'Todos'}</a>
    `;

    // Categories
    html += categories.map(c => `
        <a href="catalog.html?category=${encodeURIComponent(c.name)}" 
           class="filter-chip ${activeCategory === c.name ? 'filter-chip--active' : ''}" 
           style="text-decoration: none;"
           data-i18n="category.${c.id}">
           ${i18n.t(`category.${c.id}`) || escapeHtml(c.name)}
        </a>
    `).join('');

    container.innerHTML = html;
}

let scrollManager = null;

function renderGrid(grid, products) {
    if (!grid) return;

    if (products.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #6b7280; padding: 40px;">${i18n.t('msg.no_products_category') || 'No se encontraron productos.'}</p>`;
        return;
    }

    // Initialize scroll manager
    if (scrollManager) {
        scrollManager.disconnect();
    }
    scrollManager = new InfiniteScrollManager(products, 24);

    // Clear grid and load first page
    grid.innerHTML = '';
    const firstBatch = scrollManager.loadMore();
    grid.innerHTML = firstBatch.map(p => createProductCard(p)).join('');

    // Create or get sentinel and loading indicator
    let sentinel = document.getElementById('scroll-sentinel');
    let loadingIndicator = document.getElementById('loading-more');

    if (!sentinel) {
        sentinel = document.createElement('div');
        sentinel.id = 'scroll-sentinel';
        sentinel.style.height = '1px';
        grid.parentElement.appendChild(sentinel);
    }

    if (!loadingIndicator) {
        loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'loading-more';
        loadingIndicator.style.cssText = 'display: none; text-align: center; padding: 20px;';
        loadingIndicator.innerHTML = Array(4).fill(0).map(() => createSkeletonCard()).join('');
        grid.parentElement.appendChild(loadingIndicator);
    }

    // Setup infinite scroll
    scrollManager.setupObserver(sentinel, () => {
        if (!scrollManager.hasMore()) return;

        // Show loading indicator
        loadingIndicator.style.display = 'grid';
        loadingIndicator.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
        loadingIndicator.style.gap = '24px';

        // Simulate slight delay for better UX
        setTimeout(() => {
            const newBatch = scrollManager.loadMore();
            const newCards = newBatch.map(p => createProductCard(p)).join('');
            grid.insertAdjacentHTML('beforeend', newCards);

            // Hide loading indicator
            loadingIndicator.style.display = 'none';

            // Re-init icons
            if (window.lucide) window.lucide.createIcons();

            // Attach listeners to new cards
            attachCardListeners(grid, products);
        }, 300);
    });

    // Re-init icons
    if (window.lucide) window.lucide.createIcons();

    // Attach Listeners
    attachCardListeners(grid, products);
}

function attachCardListeners(grid, products) {
    // Add to Cart
    grid.querySelectorAll('.btn-add-cart').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            const product = products.find(p => p.id === id);
            if (product) {
                addToCart(product);
                const originalHTML = btn.innerHTML;
                btn.innerHTML = '<i data-lucide="check"></i>';
                btn.classList.add('text-green');
                if (window.lucide) window.lucide.createIcons();
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.classList.remove('text-green');
                    if (window.lucide) window.lucide.createIcons();
                }, 1000);
            }
        });
    });

    // Buy Now
    grid.querySelectorAll('.btn-buy-now').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            const product = products.find(p => p.id === id);
            if (product) {
                await addToCart(product);
                window.location.href = 'checkout.html';
            }
        });
    });

    // Toggle Favorite
    grid.querySelectorAll('.product-card__heart').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            toggleFavorite(id);
        });
    });

    // Navigate to Detail
    grid.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.btn-add-cart') &&
                !e.target.closest('.btn-buy-now') &&
                !e.target.closest('.btn--purchased') &&
                !e.target.closest('.product-card__heart')) {
                const id = card.dataset.id;
                window.location.href = `product.html?id=${id}`;
            }
        });
    });

    // Language Listener
    window.addEventListener('language-changed', () => {
        const params = new URLSearchParams(window.location.search);
        const tag = params.get('tag');
        const category = params.get('category');

        if (tag) {
            const pageTitle = document.getElementById('page-title');
            if (pageTitle) {
                const tagPrefix = i18n.t('catalog.tag_prefix');
                pageTitle.textContent = `${tagPrefix} "${tag}"`;
            }
        }

        // Update Result Count Text
        const resultCount = document.getElementById('result-count');
        if (resultCount && resultCount.dataset.count !== undefined) {
            const count = parseInt(resultCount.dataset.count);
            const key = count === 1 ? 'catalog.result_single' : 'catalog.result_plural';
            resultCount.textContent = `${count} ${i18n.t(key)}`;
        }
    });
}
