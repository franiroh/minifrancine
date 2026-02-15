
export const loadComponents = async () => {
  const navbarPlaceholder = document.getElementById('navbar-placeholder');
  const footerPlaceholder = document.getElementById('footer-placeholder');

  if (navbarPlaceholder) {
    navbarPlaceholder.innerHTML = `
    <header class="navbar">
      <div class="navbar__left">
        <i data-lucide="scissors" class="navbar__logo-icon"></i>
        <a href="index.html" class="navbar__logo-text">PatchFiles</a>
      </div>
      <div class="navbar__links">
        <a href="index.html" class="navbar__link ${window.location.pathname.includes('index.html') || window.location.pathname === '/' ? 'navbar__link--active' : ''}">Catálogo</a>
        <a href="categories.html" class="navbar__link ${window.location.pathname.includes('categories.html') ? 'navbar__link--active' : ''}">Categorías</a>
        <a href="#" class="navbar__link">Novedades</a>
        <a href="#" class="navbar__link">Ayuda</a>
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
            <a href="mis-disenos.html" class="navbar__dropdown-item">
              <i data-lucide="palette"></i> Mis Diseños
            </a>
            <a href="orders.html" class="navbar__dropdown-item">
              <i data-lucide="receipt"></i> Mis Compras
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
          <h4>Productos</h4><a href="index.html">Catálogo</a><a href="#">Novedades</a><a href="#">Más vendidos</a><a href="#">Ofertas</a>
        </div>
        <div class="footer__col">
          <h4>Soporte</h4><a href="#">Centro de ayuda</a><a href="#">Formatos compatibles</a><a href="#">Guía de uso</a><a href="#">Contacto</a>
        </div>
        <div class="footer__col">
          <h4>Mi Cuenta</h4><a href="mis-disenos.html">Mis Diseños</a><a href="orders.html">Mis Compras</a>
        </div>
        <div class="footer__col">
          <h4>Legal</h4><a href="#">Términos de uso</a><a href="#">Política de privacidad</a><a href="#">Licencias</a>
        </div>
      </div>
      <div class="footer__bottom">
        <span>&copy; 2026 PatchFiles. Todos los derechos reservados.</span>
        <div class="footer__social"><i data-lucide="instagram"></i><i data-lucide="facebook"></i><i data-lucide="youtube"></i></div>
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
