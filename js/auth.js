

import { loadComponents, updateNavbarAuth, updateNavbarCartCount } from './components.js';
import { signIn, signUp, onAuthStateChange, getUser, signOut, checkNameExists, resetPassword } from './api.js';
import { loadCart, getCartCount, loadFavorites } from './state.js';
import { showToast } from './utils.js';

async function init() {
    await loadComponents();

    loadCart();
    updateNavbarCartCount(getCartCount());

    const user = await getUser();
    updateNavbarAuth(user);

    // If already logged in, maybe redirect to home?
    if (user) {
        // window.location.href = 'index.html';
        // But maybe user wants to see account page or logout. 
        // For now, let's keep it.
        document.getElementById('auth-title').textContent = 'Tu Cuenta';
        document.getElementById('auth-desc').textContent = `Hola, ${user.email} `;

        // Hide forms, show logout?
        const card = document.querySelector('.login-card');
        card.innerHTML = `
            <div class="login-card__header" style="text-align:center;">
                <h2 style="font-family: 'Bricolage Grotesque'; font-size: 24px; font-weight:700;">Tu Cuenta</h2>
                <p style="color:#6B7280;">${user.email}</p>
            </div>
    <button id="logout-btn" class="btn btn--outline btn--block btn--lg" style="margin-top:20px;">Cerrar Sesión</button>
`;
        document.getElementById('logout-btn').addEventListener('click', async () => {
            await signOut();
            window.location.reload();
        });
        return;
    }

    setupTabs();
    setupForms();
    setupPasswordReset();

    onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
            window.location.href = 'index.html';
        }
    });

    if (window.lucide) window.lucide.createIcons();
}

function setupTabs() {
    const tabs = document.querySelectorAll('.login-card__tab');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const title = document.getElementById('auth-title');
    const desc = document.getElementById('auth-desc');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('login-card__tab--active'));
            tab.classList.add('login-card__tab--active');

            const target = tab.dataset.tab;
            if (target === 'login') {
                loginForm.classList.remove('hidden');
                registerForm.classList.add('hidden');
                title.textContent = 'Bienvenido de nuevo';
                desc.textContent = 'Inicia sesión para acceder a tus diseños';
            } else {
                loginForm.classList.add('hidden');
                registerForm.classList.remove('hidden');
                title.textContent = 'Crea tu cuenta';
                desc.textContent = 'Unete para descargar diseños exclusivos';
            }
        });
    });
}

function setupForms() {
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');

    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            if (!email || !password) {
                showToast('Completa todos los campos', 'error');
                return;
            }

            loginBtn.textContent = 'Cargando...';
            loginBtn.disabled = true;

            const { error } = await signIn(email, password);

            if (error) {
                showToast('Error: ' + error.message, 'error');
                loginBtn.textContent = 'Iniciar Sesión';
                loginBtn.disabled = false;
            } else {
                showToast('Inicio de sesión exitoso', 'success');
                // Redirect handled by onAuthStateChange
            }
        });
    }

    if (registerBtn) {
        registerBtn.addEventListener('click', async () => {
            console.log('Register button clicked');
            try {
                const nameInput = document.getElementById('register-name');
                const emailInput = document.getElementById('register-email');
                const passInput = document.getElementById('register-password');

                if (!nameInput || !emailInput || !passInput) {
                    console.error('Missing form elements');
                    showToast('Error interno del formulario', 'error');
                    return;
                }

                const name = nameInput.value;
                const email = emailInput.value;
                const password = passInput.value;

                console.log('Attempting to register:', { name, email });

                if (!name || !email || !password) {
                    showToast('Completa todos los campos', 'error');
                    return;
                }

                registerBtn.textContent = 'Verificando...';
                registerBtn.disabled = true;

                // Check if name exists
                console.log('Checking name availability...');
                const exists = await checkNameExists(name);
                console.log('Name exists:', exists);

                if (exists) {
                    showToast('Ese nombre ya está en uso. Por favor elige otro.', 'error');
                    registerBtn.textContent = 'Registrarse';
                    registerBtn.disabled = false;
                    return;
                }

                registerBtn.textContent = 'Cargando...';

                console.log('Calling signUp...');
                const { data, error } = await signUp(email, password, name);
                console.log('SignUp result:', { data, error });

                if (error) {
                    console.error('SignUp Error:', error);
                    if (error.status === 429 || error.message.includes('429') || error.message.includes('rate limit')) {
                        showToast('Demasiados intentos. Por favor espera unos minutos.', 'error');
                    } else {
                        showToast('Error: ' + error.message, 'error');
                    }
                    registerBtn.textContent = 'Registrarse';
                    registerBtn.disabled = false;
                } else {
                    showToast('¡Registro exitoso! Por favor verifica tu email.', 'success');
                    // Depending on settings, might auto login
                }
            } catch (err) {
                console.error('Unexpected error during registration:', err);
                showToast('Error inesperado: ' + err.message, 'error');
                registerBtn.textContent = 'Registrarse';
                registerBtn.disabled = false;
            }
        });
    }
}

function setupPasswordReset() {
    const forgotPasswordLink = document.querySelector('.form-field__link');
    const modal = document.getElementById('reset-password-modal');
    const closeBtn = modal?.querySelector('.modal__close');
    const overlay = modal?.querySelector('.modal__overlay');
    const submitBtn = document.getElementById('reset-submit-btn');
    const emailInput = document.getElementById('reset-email');
    const messageDiv = document.getElementById('reset-message');

    // Open modal
    if (forgotPasswordLink && modal) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            modal.classList.remove('hidden');
            emailInput.value = '';
            messageDiv.classList.add('hidden');
            messageDiv.className = 'hidden';
            if (window.lucide) window.lucide.createIcons();
            // Apply i18n translations to modal content
            if (window.i18n) {
                window.i18n.translatePage();
            }
        });
    }

    // Close modal handlers
    const closeModal = () => {
        modal?.classList.add('hidden');
    };

    closeBtn?.addEventListener('click', closeModal);
    overlay?.addEventListener('click', closeModal);

    // Submit password reset
    if (submitBtn && emailInput && messageDiv) {
        submitBtn.addEventListener('click', async () => {
            const email = emailInput.value.trim();

            if (!email) {
                showToast('Por favor ingresa tu email', 'error');
                return;
            }

            // Basic email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showToast('Por favor ingresa un email válido', 'error');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span data-i18n="auth.sending">${window.i18n ? window.i18n.t('auth.sending') : 'Enviando...'}</span>`;

            const { error } = await resetPassword(email);

            if (error) {
                messageDiv.textContent = 'Error: ' + error.message;
                messageDiv.className = 'error';
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<span data-i18n="auth.send_reset_link">${window.i18n ? window.i18n.t('auth.send_reset_link') : 'Enviar enlace'}</span>`;
                if (window.i18n) window.i18n.translatePage();
            } else {
                messageDiv.textContent = window.i18n ? window.i18n.t('auth.reset_link_sent') : '¡Enlace enviado! Revisa tu email para restablecer tu contraseña.';
                messageDiv.className = 'success';
                emailInput.value = '';
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<span data-i18n="auth.send_reset_link">${window.i18n ? window.i18n.t('auth.send_reset_link') : 'Enviar enlace'}</span>`;
                if (window.i18n) window.i18n.translatePage();

                // Close modal after 3 seconds
                setTimeout(() => {
                    closeModal();
                }, 3000);
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', init);
