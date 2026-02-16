import { fetchProducts, getUser, fetchCategories } from './api.js';
import { loadComponents, createProductCard, createSkeletonCard } from './components.js';
import { loadFavorites, loadPurchases, addToCart, toggleFavorite } from './state.js';
import { renderBreadcrumbs, escapeHtml } from './utils.js';
import i18n from './i18n.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Immediate UI Updates (Prevent Flash)
    const params = new URLSearchParams(window.location.search);
    const tag = params.get('tag');
    const category = params.get('category');

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
            pageTitle.textContent = `Etiqueta: "${tag}"`;
            pageTitle.removeAttribute('data-i18n');
        }
        document.title = `Etiqueta: ${tag} — MiniFrancine`;
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
        // Tag View
        if (pageTitle) {
            pageTitle.textContent = `Etiqueta: "${tag}"`;
            pageTitle.removeAttribute('data-i18n');
        }
        document.title = `Etiqueta: ${tag} — MiniFrancine`;
    } else {
        // Default All View
        // Do nothing, let data-i18n="catalog.full_title" in HTML handle it via i18n.updatePage()
        // Or ensure it is set if we are switching views dynamically (not the case here, it's page load)
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
                { label: i18n.t('nav.catalog'), href: 'catalog.html' }, // "Catálogo"
                { label: tag, href: null }
            ]);
        } else {
            breadcrumbsContainer.innerHTML = renderBreadcrumbs([
                { label: i18n.t('nav.home'), href: 'index.html' },
                { label: i18n.t('nav.catalog'), href: null }
            ]);
        }
    }

    // 6. Fetch Products
    let products = [];
    if (category) {
        const allProducts = await fetchProducts({ publishedOnly: true });
        products = allProducts.filter(p => p.category === category);
    } else if (tag) {
        products = await fetchProducts({ publishedOnly: true, tag: tag });
    } else {
        products = await fetchProducts({ publishedOnly: true });
    }

    // Update count
    if (resultCount) resultCount.textContent = `${products.length} diseños encontrados`;

    // 7. Render Grid
    renderGrid(grid, products);
});

function renderFilters(categories, activeCategory) {
    const container = document.getElementById('catalog-filters');
    if (!container) return;

    if (!categories || categories.length === 0) return;

    // 'Todos' button
    let html = `
        <a href="catalog.html" class="filter-chip ${!activeCategory ? 'filter-chip--active' : ''}" style="text-decoration: none;" data-i18n="category.all">Todos</a>
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

function renderGrid(grid, products) {
    if (!grid) return;

    if (products.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #6b7280; padding: 40px;">No se encontraron productos.</p>';
        return;
    }

    grid.innerHTML = products.map(p => createProductCard(p)).join('');

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
}
