
import { fetchCategories } from './api.js';

export const loadComponents = async () => {
  const navbarPlaceholder = document.getElementById('navbar-placeholder');
  const footerPlaceholder = document.getElementById('footer-placeholder');

  if (navbarPlaceholder) {
    // Fetch categories for dropdown
    const categories = await fetchCategories();
    const categoriesList = categories.map(c =>
      `<a href="catalog.html?category=${encodeURIComponent(c.name)}" class="navbar__dropdown-item">${escapeHtml(c.name)}</a>`
    ).join('');

    navbarPlaceholder.innerHTML = `
    <header class="navbar">
      <div class="navbar__left">
        <i data-lucide="scissors" class="navbar__logo-icon"></i>
        <a href="index.html" class="navbar__logo-text">PatchFiles</a>
      </div>
      <div class="navbar__links">
        <a href="index.html" class="navbar__link ${window.location.pathname.includes('index.html') || window.location.pathname === '/' ? 'navbar__link--active' : ''}">Inicio</a>
        
        <div class="navbar__menu-item">
            <a href="categories.html" class="navbar__link ${window.location.pathname.includes('categories.html') ? 'navbar__link--active' : ''}" style="display:flex;align-items:center;gap:4px;">
                Categorías <i data-lucide="chevron-down" style="width:14px;height:14px;"></i>
            </a>
            <div class="navbar__dropdown">
                <a href="categories.html" class="navbar__dropdown-item" style="font-weight:700; color:var(--primary-color);">Ver todas</a>
                <div class="navbar__dropdown-divider"></div>
                ${categoriesList}
            </div>
        </div>

        <a href="help.html" class="navbar__link">Novedades</a>
        <a href="help.html" class="navbar__link">Ayuda</a>
      </div>
      <div class="navbar__right">
        <i data-lucide="search" class="navbar__icon"></i>
        <div class="navbar__cart-wrap" onclick="window.location.href='cart.html'">
          <i data-lucide="shopping-cart" class="navbar__icon"></i>
          <span class="navbar__cart-badge">0</span>
        </div>
        <div class="navbar__account" id="navbar-account">
          <button class="navbar__user-btn" id="navbar-user-btn" onclick="window.location.href='login.html'">
            <i data-lucide="user"></i>
            <span id="navbar-user-text">Login</span>
            <i data-lucide="chevron-down" id="navbar-user-arrow" style="width: 16px; height: 16px; margin-left: -2px; display: none;"></i>
          </button>
          <div class="navbar__dropdown" id="navbar-dropdown">
            <a href="favorites.html" class="navbar__dropdown-item">
              <i data-lucide="heart"></i> Mis Favoritos
            </a>
            <a href="mis-disenos.html" class="navbar__dropdown-item">
              <i data-lucide="palette"></i> Mis Diseños
            </a>
            <a href="orders.html" class="navbar__dropdown-item">
              <i data-lucide="receipt"></i> Mis Compras
            </a>
            <a href="messages.html" class="navbar__dropdown-item">
              <i data-lucide="message-circle"></i> Mensajes
            </a>
            <div class="navbar__dropdown-divider"></div>
            <button class="navbar__dropdown-item navbar__dropdown-item--danger" id="navbar-logout-btn">
              <i data-lucide="log-out"></i> Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </header>
        `;
  }

  if (footerPlaceholder) {
    footerPlaceholder.innerHTML = `
    <footer class="footer">
      <div class="footer__top">
        <div class="footer__brand">
          <div class="footer__brand-logo"><i data-lucide="scissors"></i><span>PatchFiles</span></div>
          <p class="footer__brand-desc">Archivos digitales de bordado premium para máquinas industriales y domésticas.</p>
        </div>
        <div class="footer__col">
          <a href="index.html">Inicio</a><a href="categories.html">Categorías</a><a href="help.html">Novedades</a><a href="help.html">Ayuda</a>
        </div>
      </div>
      <div class="footer__bottom">
        <span>
          &copy; 2026 PatchFiles. Todos los derechos reservados.
          <a href="help.html" style="margin-left: 10px; color: inherit; text-decoration: none;">Términos y Condiciones</a>
        </span>
      </div>
    </footer>
        `;
  }

  // Initialize Lucide icons for injected content
  if (window.lucide) {
    window.lucide.createIcons();
  }
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
      userText.textContent = escapeHtml(user.email);

      // Show arrow
      const arrow = document.getElementById('navbar-user-arrow');
      if (arrow) arrow.style.display = 'block';

      // Toggle dropdown on click
      userBtn.onclick = (e) => {
        e.stopPropagation();
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
      const { data: profile } = await getProfile(user.id);
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
      userText.textContent = 'Login';
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
};

export const updateNavbarCartCount = (count) => {
  const badges = document.querySelectorAll('.navbar__cart-badge');
  badges.forEach(b => b.textContent = count);
};

import { isFavorite, isPurchased } from './state.js';
import { sanitizeCssValue } from './utils.js';

export const createProductCard = (product) => {
  const purchased = isPurchased(product.id);
  const favorite = isFavorite(product.id);

  return `
    <div class="product-card ${purchased ? 'product-card--purchased' : ''}" data-id="${parseInt(product.id)}">
      <div class="product-card__image" style="background: ${sanitizeCssValue(product.imageColor)};">
        ${product.mainImage ? `<img src="${escapeHtml(product.mainImage)}" alt="${escapeHtml(product.title)}" class="product-card__img" loading="lazy">` : ''}
        ${purchased
      ? `<span class="product-card__badge product-card__badge--purchased"><i data-lucide="check-circle"></i> Comprado</span>`
      : (product.badge ? `<span class="product-card__badge ${product.badgeColor === 'green' ? 'product-card__badge--green' : ''}">${escapeHtml(product.badge)}</span>` : '')}
        <div class="product-card__heart ${favorite ? 'product-card__heart--active' : ''}" data-id="${parseInt(product.id)}">
            <i data-lucide="heart"></i>
        </div>
      </div>
      <div class="product-card__info">
        <span class="product-card__category">${escapeHtml(product.category)}</span>
        <h3 class="product-card__title">${escapeHtml(product.title)}</h3>
        <div class="product-card__tags">
          ${product.tags ? product.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('') : ''}
        </div>
        <div class="product-card__price-row">
          <span class="product-card__price">USD ${parseFloat(product.price).toFixed(2)}</span>
          <div class="product-card__btns">
            ${purchased
      ? `<a href="mis-disenos.html#product-${parseInt(product.id)}" class="btn btn--sm btn--purchased">
                   <i data-lucide="download"></i> Mis diseños
                 </a>`
      : `<button class="btn btn--sm btn--outline btn-add-cart" data-id="${parseInt(product.id)}">
                   <i data-lucide="shopping-cart"></i>
                 </button>
                 <button class="btn btn--sm btn--primary btn-buy-now" data-id="${parseInt(product.id)}">
                    Comprar
                 </button>`}
          </div>
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
