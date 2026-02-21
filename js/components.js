
import { fetchCategories } from './api.js';
import i18n from './i18n.js';

export const loadComponents = async () => {
  const navbarPlaceholder = document.getElementById('navbar-placeholder');
  const footerPlaceholder = document.getElementById('footer-placeholder');

  // Initialize i18n first
  await i18n.init();
  document.body.classList.remove('loading-i18n');

  if (navbarPlaceholder) {
    // Fetch categories for dropdown
    const categories = await fetchCategories();
    // Categories names are dynamic, we might translate them later via a different mechanism or JSON column
    const categoriesList = categories.map(c =>
      `<a href="catalog.html?category=${encodeURIComponent(c.name)}" class="navbar__dropdown-item" data-i18n="category.${c.id}">${i18n.t(`category.${c.id}`) || escapeHtml(c.name)}</a>`
    ).join('');

    const lastCount = localStorage.getItem('patchfiles_last_count') || '0';

    navbarPlaceholder.innerHTML = `
    <header class="navbar" id="main-navbar">
      <div class="navbar__main">
        <div class="navbar__left">
          <button class="navbar__toggle" id="mobile-menu-toggle">
              <i data-lucide="menu"></i>
          </button>
          <i data-lucide="scissors" class="navbar__logo-icon"></i>
          <div class="navbar__brand-wrap">
              <a href="index.html" class="navbar__logo-text">MiniFrancine</a>
              <span class="navbar__subtitle" data-i18n="nav.subtitle">Embroidery ITH Files</span>
          </div>
        </div>

        <div class="navbar__links">
          <a href="index.html" class="navbar__link ${window.location.pathname.includes('index.html') || window.location.pathname === '/' ? 'navbar__link--active' : ''}" data-i18n="nav.home">Inicio</a>
          
          <div class="navbar__menu-item">
              <a href="categories.html" class="navbar__link ${window.location.pathname.includes('categories.html') ? 'navbar__link--active' : ''}" style="display:flex;align-items:center;gap:4px;">
                  <span data-i18n="nav.catalog">Categorías</span> <i data-lucide="chevron-down" style="width:14px;height:14px;"></i>
              </a>
              <div class="navbar__dropdown">
                  <a href="categories.html" class="navbar__dropdown-item" style="font-weight:700; color:var(--primary-color);" data-i18n="nav.all_categories">Ver todas</a>
                  <div class="navbar__dropdown-divider"></div>
                  ${categoriesList}
              </div>
          </div>

          <a href="catalog.html?sort=newest" class="navbar__link ${window.location.search.includes('sort=newest') ? 'navbar__link--active' : ''}" data-i18n="nav.new">Novedades</a>
          <a href="catalog.html?sale=true" class="navbar__link ${window.location.search.includes('sale=true') ? 'navbar__link--active' : ''}" data-i18n="nav.sale">Ofertas</a>
          <a href="faq.html" class="navbar__link" data-i18n="nav.faq">FAQ</a>
        </div>

        <div class="navbar__right">
          <!-- Language Switcher -->
          <div class="navbar__menu-item navbar__lang" id="lang-menu" style="margin-right:8px;">
            <button class="navbar__lang-btn">
                <img src="https://flagcdn.com/w20/${i18n.lang === 'en' ? 'us' : i18n.lang}.png" class="navbar__flag" alt="${i18n.lang}">
                <i data-lucide="chevron-down"></i>
            </button>
              <div class="navbar__dropdown" style="min-width:140px; right:0; left:auto;">
                  <button class="navbar__dropdown-item lang-btn" data-lang="es" style="width:100%;text-align:left;">
                      <img src="https://flagcdn.com/w20/es.png" class="navbar__flag" alt="ES" style="margin-right:8px;"> Español
                  </button>
                  <button class="navbar__dropdown-item lang-btn" data-lang="en" style="width:100%;text-align:left;">
                      <img src="https://flagcdn.com/w20/us.png" class="navbar__flag" alt="EN" style="margin-right:8px;"> English
                  </button>
                  <button class="navbar__dropdown-item lang-btn" data-lang="pt" style="width:100%;text-align:left;">
                      <img src="https://flagcdn.com/w20/br.png" class="navbar__flag" alt="PT" style="margin-right:8px;"> Português
                  </button>
              </div>
          </div>

          <div class="navbar__search">
              <form class="navbar__search-form" id="nav-search-form">
                  <i data-lucide="search" class="navbar__search-icon" style="width:16px;height:16px;color:#9CA3AF;margin-right:8px;"></i>
                  <input type="text" class="navbar__search-input" placeholder="Buscar..." id="nav-search-input" data-i18n-placeholder="nav.search_placeholder">
                  <button type="submit" class="hidden"></button>
              </form>
          </div>
          <div class="navbar__cart-wrap" onclick="window.location.href='cart.html'">
            <i data-lucide="shopping-cart" class="navbar__icon"></i>
            <span class="navbar__cart-badge">${lastCount}</span>
          </div>
          <div class="navbar__account" id="navbar-account">
            <button class="navbar__user-btn" id="navbar-user-btn" onclick="window.location.href='login.html'">
              <i data-lucide="user"></i>
              <span id="navbar-user-text" data-i18n="nav.login">Login</span>
              <i data-lucide="chevron-down" id="navbar-user-arrow" style="width: 16px; height: 16px; margin-left: -2px; display: none;"></i>
            </button>
            <div class="navbar__dropdown" id="navbar-dropdown">
              <a href="profile.html" class="navbar__dropdown-item">
                <i data-lucide="user"></i> <span data-i18n="nav.profile">Mi Perfil</span>
              </a>
              <a href="favorites.html" class="navbar__dropdown-item">
                <i data-lucide="heart"></i> <span data-i18n="nav.favorites">Mis Favoritos</span>
              </a>
              <a href="mis-disenos.html" class="navbar__dropdown-item">
                <i data-lucide="palette"></i> <span data-i18n="nav.my_designs">Mis Diseños</span>
              </a>
              <a href="orders.html" class="navbar__dropdown-item">
                <i data-lucide="receipt"></i> <span data-i18n="nav.my_orders">Mis Pedidos</span>
              </a>
              <a href="orders.html" class="navbar__dropdown-item">
                <i data-lucide="message-circle"></i> <span data-i18n="nav.messages">Mensajes</span>
              </a>
              <div class="navbar__dropdown-divider"></div>
              <button class="navbar__dropdown-item navbar__dropdown-item--danger" id="navbar-logout-btn">
                <i data-lucide="log-out"></i> <span data-i18n="nav.logout">Cerrar sesión</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="navbar__mobile-search">
          <form class="navbar__search-form" id="mobile-search-form">
              <i data-lucide="search" class="navbar__search-icon" style="width:16px;height:16px;color:#9CA3AF;margin-right:8px;"></i>
              <input type="text" class="navbar__search-input" placeholder="Buscar..." id="mobile-search-input" data-i18n-placeholder="nav.search_placeholder">
              <button type="submit" class="hidden"></button>
          </form>
      </div>
    </header>
    <div class="promo-bar" id="promo-bar">
      <div class="promo-bar__content" data-i18n="home.promos.bar_text">
        ${i18n.t('home.promos.bar_text')}
      </div>
    </div>
        `;
  }

  if (footerPlaceholder) {
    footerPlaceholder.innerHTML = `
    <footer class="footer">
      <div class="footer__top">
        <div class="footer__brand">
          <div class="footer__brand-logo"><i data-lucide="scissors"></i><span>MiniFrancine</span></div>
          <p class="footer__brand-desc" data-i18n="footer.description">Archivos digitales de bordado premium para máquinas bordadoras domésticas.</p>
        </div>
        <div class="footer__col">
          <a href="index.html" data-i18n="nav.home">Inicio</a>
          <a href="categories.html" data-i18n="nav.catalog">Categorías</a>
          <a href="catalog.html?sort=newest" data-i18n="nav.new">Novedades</a>
          <a href="faq.html" data-i18n="nav.faq">FAQ</a>
        </div>
      </div>
      <div class="footer__bottom">
        <span>
          &copy; 2026 MiniFrancine. <span data-i18n="footer.rights">Todos los derechos reservados.</span>
          <a href="terms.html" style="margin-left: 10px; color: inherit; text-decoration: none;" data-i18n="footer.terms">Términos y Condiciones</a>
        </span>
      </div>
    </footer>`;

  }

  // Handle Search Logic
  const searchForm = document.getElementById('nav-search-form');
  const searchInput = document.getElementById('nav-search-input');

  // Handle Search Logic (Desktop and Mobile)
  const setupSearch = (formId, inputId) => {
    const form = document.getElementById(formId);
    const input = document.getElementById(inputId);
    if (form && input) {
      form.onsubmit = (e) => {
        e.preventDefault();
        const query = input.value.trim();
        if (query) {
          window.location.href = `catalog.html?search=${encodeURIComponent(query)}`;
        }
      };
    }
  };

  setupSearch('nav-search-form', 'nav-search-input');
  setupSearch('mobile-search-form', 'mobile-search-input');

  // Ensure translations are applied to the newly injected HTML
  await i18n.updatePage();

  // Initialize Lucide icons for injected content
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Mobile Menu Logic
  const navbar = document.getElementById('main-navbar');
  const menuToggle = document.getElementById('mobile-menu-toggle');

  if (navbar && menuToggle) {
    menuToggle.addEventListener('click', () => {
      navbar.classList.toggle('navbar--mobile-open');
      const icon = menuToggle.querySelector('i');
      if (icon) {
        const isOpening = navbar.classList.contains('navbar--mobile-open');
        icon.setAttribute('data-lucide', isOpening ? 'x' : 'menu');
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  // Dropdown Toggle Logic (Mobile & Desktop Click)
  const setupToggle = (buttonId, wrapperId, openClass) => {
    const btn = document.getElementById(buttonId);
    const wrapper = document.getElementById(wrapperId);
    if (btn && wrapper) {
      btn.onclick = (e) => {
        e.stopPropagation();
        // Close other top-bar menus first
        const accountWrap = document.getElementById('navbar-account');
        if (wrapperId !== 'navbar-account' && accountWrap) accountWrap.classList.remove('navbar__account--open');
        const langMenu = document.getElementById('lang-menu');
        if (wrapperId !== 'lang-menu' && langMenu) langMenu.classList.remove('navbar__menu-item--open');

        wrapper.classList.toggle(openClass);
      };
    }
  };

  setupToggle('navbar-user-btn', 'navbar-account', 'navbar__account--open');
  // Special handling for language menu button which is a child of the menu-item
  const langMenu = document.getElementById('lang-menu');
  if (langMenu) {
    const langBtn = langMenu.querySelector('.navbar__lang-btn');
    if (langBtn) {
      langBtn.onclick = (e) => {
        e.stopPropagation();
        // Close account menu if open
        const accountWrap = document.getElementById('navbar-account');
        if (accountWrap) accountWrap.classList.remove('navbar__account--open');

        langMenu.classList.toggle('navbar__menu-item--open');
      };
    }
  }

  // Close menus when clicking outside
  document.addEventListener('click', (e) => {
    const langMenu = document.getElementById('lang-menu');
    const accountWrap = document.getElementById('navbar-account');
    if (langMenu && !langMenu.contains(e.target)) langMenu.classList.remove('navbar__menu-item--open');
    if (accountWrap && !accountWrap.contains(e.target)) accountWrap.classList.remove('navbar__account--open');
  });

  // Language Switcher Logic
  const langBtns = document.querySelectorAll('.lang-btn');
  langBtns.forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      const lang = e.currentTarget.dataset.lang || e.target.closest('.lang-btn').dataset.lang;
      if (lang) {
        localStorage.setItem('minifrancine_lang', lang);
        window.location.reload();
      }
    };
  });

  // Mobile Accordion Logic (Only for categories menu in the hamburger menu)
  const menuItems = document.querySelectorAll('.navbar__links .navbar__menu-item');
  menuItems.forEach(item => {
    const link = item.querySelector('.navbar__link');
    if (link) {
      link.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
          const dropdown = item.querySelector('.navbar__dropdown');
          if (dropdown) {
            e.preventDefault();
            item.classList.toggle('navbar__menu-item--open');
          }
        }
      });
    }
  });
};

import { getProfile } from './api.js';
import { escapeHtml } from './utils.js';

export const updateNavbarAuth = async (user) => {
  const userBtn = document.getElementById('navbar-user-btn');
  const userText = document.getElementById('navbar-user-text');
  const navLinks = document.querySelector('.navbar__links');
  const accountWrap = document.getElementById('navbar-account');
  const dropdown = document.getElementById('navbar-dropdown');
  const logoutBtn = document.getElementById('navbar-logout-btn');

  if (userBtn && userText) {
    if (user) {
      // Fetch profile first
      let profile = null;
      const { data } = await getProfile(user.id);
      profile = data;

      // Prefer full name if available, otherwise email
      const displayName = (profile && profile.full_name) ? profile.full_name : user.email;
      userText.textContent = escapeHtml(displayName);
      userText.removeAttribute('data-i18n'); // Prevent i18n from overwriting email

      // Show arrow
      const arrow = document.getElementById('navbar-user-arrow');
      if (arrow) arrow.style.display = 'block';

      // Toggle dropdown on click (Consistently handles other menus)
      userBtn.onclick = (e) => {
        e.stopPropagation();
        // Close Language menu if open
        const langMenu = document.getElementById('lang-menu');
        if (langMenu) langMenu.classList.remove('navbar__menu-item--open');

        accountWrap.classList.toggle('navbar__account--open');
      };

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (accountWrap && !accountWrap.contains(e.target)) {
          accountWrap.classList.remove('navbar__account--open');
        }
      });

      // Show dropdown
      if (dropdown) dropdown.style.display = '';

      // Logout button
      if (logoutBtn) {
        logoutBtn.onclick = async () => {
          const { supabase } = await import('./api.js');
          await supabase.auth.signOut();
          window.location.href = 'login.html';
        };
      }

      // Check for Admin role
      if (profile && profile.role === 'admin') {
        // Add Admin link if it doesn't exist
        if (navLinks && !document.getElementById('admin-link')) {
          const adminLink = document.createElement('a');
          adminLink.href = 'admin.html';
          adminLink.className = 'navbar__link';
          adminLink.id = 'admin-link';
          adminLink.style.color = 'var(--color-primary)';
          adminLink.style.fontWeight = 'bold';
          adminLink.textContent = 'Admin';
          navLinks.appendChild(adminLink);
        }
      }
    } else {
      userText.setAttribute('data-i18n', 'nav.login');
      userText.textContent = i18n.t('nav.login');
      // Hide arrow
      const arrow = document.getElementById('navbar-user-arrow');
      if (arrow) arrow.style.display = 'none';

      userBtn.onclick = () => window.location.href = 'login.html';
      // Hide dropdown when logged out
      if (dropdown) dropdown.style.display = 'none';
      // Remove Admin link if logging out
      const adminLink = document.getElementById('admin-link');
      if (adminLink) adminLink.remove();
    }
  }
}


export const updateNavbarCartCount = (count) => {
  localStorage.setItem('patchfiles_last_count', count);
  const badges = document.querySelectorAll('.navbar__cart-badge');
  badges.forEach(b => b.textContent = count);
};

import { isFavorite, isPurchased } from './state.js';
import { sanitizeCssValue, getBadgeKey } from './utils.js';

export const createProductCard = (product) => {
  const purchased = isPurchased(product.id);
  const favorite = isFavorite(product.id);

  // Discount Calculation
  const isProdPurchased = purchased; // already defined above
  const price = isProdPurchased ? 0 : parseFloat(product.price);
  const oldPrice = parseFloat(product.oldPrice || product.old_price);
  const hasDiscount = !isProdPurchased && oldPrice > price;
  const discountPerc = hasDiscount ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;

  return `
    <div class="product-card ${purchased ? 'product-card--purchased' : ''}" data-id="${parseInt(product.id)}">
      <div class="product-card__image" style="background: ${sanitizeCssValue(product.imageColor)};">
        ${product.mainImage ? `<img src="${escapeHtml(product.mainImage)}" alt="${escapeHtml(product.title)}" class="product-card__img" loading="lazy">` : ''}
        ${purchased
      ? `<span class="product-card__badge product-card__badge--purchased">${i18n.t('btn.purchased')}</span>`
      : (product.badge ? (() => {
        const bKey = 'badge.' + getBadgeKey(product.badge);
        const bTrans = i18n.t(bKey);
        return `<span class="product-card__badge ${product.badgeColor === 'green' ? 'product-card__badge--green' : ''}">${escapeHtml(bTrans)}</span>`;
      })() : '')}
        <div class="product-card__heart ${favorite ? 'product-card__heart--active' : ''}" data-id="${parseInt(product.id)}">
            <i data-lucide="heart"></i>
        </div>
      </div>
      <div class="product-card__info">
        <span class="product-card__category">${escapeHtml(i18n.t(`category.${product.categoryId}`) || product.category)}</span>
        
        <div class="product-card__price-wrap">
            <span class="product-card__price">USD ${price.toFixed(2)}</span>
            ${hasDiscount ? `<span class="product-card__old-price">USD ${oldPrice.toFixed(2)}</span>` : ''}
        </div>

        <h3 class="product-card__title">${escapeHtml(product.title)}</h3>

        <div class="product-card__btns">
          ${purchased
      ? `<a href="mis-disenos.html#product-${parseInt(product.id)}" class="btn btn--sm btn--purchased" style="width: 100%;">
                 <i data-lucide="download"></i> ${i18n.t('btn.my_designs')}
               </a>`
      : `<button class="btn btn--sm btn--outline btn-add-cart" data-id="${parseInt(product.id)}" style="flex:1;">
                 ${i18n.t('btn.add_to_cart')}
               </button>
               <button class="btn btn--sm btn--primary btn-buy-now" data-id="${parseInt(product.id)}" style="flex:1;">
                  ${i18n.t('btn.buy_now')}
               </button>`}
        </div>
      </div>
    </div>
  `;
};

export const createSkeletonCard = () => {
  return `
    <div class="product-card product-card--skeleton">
      <div class="product-card__image">
        <div class="skeleton skeleton-img"></div>
      </div>
      <div class="product-card__info">
        <div class="skeleton skeleton-text" style="width: 50%;"></div>
        <div class="skeleton skeleton-title"></div>
        <div class="product-card__price-row">
            <div class="skeleton skeleton-price"></div>
        </div>
      </div>
    </div>
  `;
};
