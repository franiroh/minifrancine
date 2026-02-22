

import { loadComponents, updateNavbarAuth, updateNavbarCartCount } from './components.js';
import { signIn, signUp, onAuthStateChange, getUser, signOut, checkNameExists, resetPassword } from './api.js';
import { loadCart, getCartCount, loadFavorites } from './state.js';
import { showToast } from './utils.js';
import i18n from './i18n.js';

async function init() {
    // 1. Init User State early to prevent flickering
    const user = await getUser();

    // 2. Load Navbar/Footer
    await loadComponents(user);

    // Listen for state updates
    window.addEventListener('cart-updated', () => {
        updateNavbarCartCount(getCartCount());
    });

    await loadCart(user);
    updateNavbarCartCount(getCartCount());

    // If already logged in, maybe redirect to home?
    if (user) {
        // window.location.href = 'index.html';
        // But maybe user wants to see account page or logout. 
        // For now, let's keep it.
        document.getElementById('auth-title').textContent = i18n.t('auth.my_account');
        document.getElementById('auth-desc').textContent = `${i18n.t('auth.hello')}, ${user.email}`;

        // Hide forms, show logout?
        const card = document.querySelector('.login-card');
        card.innerHTML = `
            <div class="login-card__header" style="text-align:center;">
                <h2 style="font-family: 'Bricolage Grotesque'; font-size: 24px; font-weight:700;" data-i18n="auth.my_account">${i18n.t('auth.my_account')}</h2>
                <p style="color:#6B7280;">${user.email}</p>
            </div>
            <button id="logout-btn" class="btn btn--outline btn--block btn--lg" style="margin-top:20px;" data-i18n="auth.logout">${i18n.t('auth.logout')}</button>
        `;
        document.getElementById('logout-btn').addEventListener('click', async () => {
            await signOut();
            window.location.reload();
        });

        // Re-init icons and translate manually since card content was overwritten
        if (window.lucide) window.lucide.createIcons();
        i18n.updatePage();
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
                title.textContent = i18n.t('auth.welcome');
                desc.textContent = i18n.t('auth.subtitle');
            } else {
                loginForm.classList.add('hidden');
                registerForm.classList.remove('hidden');
                title.textContent = i18n.t('auth.register_title');
                desc.textContent = i18n.t('auth.register_subtitle');
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
                showToast(i18n.t('auth.fill_all'), 'error');
                return;
            }

            loginBtn.textContent = i18n.t('auth.loading');
            loginBtn.disabled = true;

            const { error } = await signIn(email, password);

            if (error) {
                showToast(i18n.t('error.prefix') + error.message, 'error');
                loginBtn.textContent = i18n.t('auth.btn_login');
                loginBtn.disabled = false;
            } else {
                showToast(i18n.t('auth.login_success'), 'success');
                // Redirect handled by onAuthStateChange
            }
        });
    }

    if (registerBtn) {
        registerBtn.addEventListener('click', async () => {
            console.log('Register attempt started');
            try {
                const nameInput = document.getElementById('register-name');
                const emailInput = document.getElementById('register-email');
                const passInput = document.getElementById('register-password');

                if (!nameInput || !emailInput || !passInput) {
                    console.error('Registration error: Missing form elements');
                    showToast(i18n.t('auth.internal_error'), 'error');
                    return;
                }

                const name = nameInput.value.trim();
                const email = emailInput.value.trim();
                const password = passInput.value;

                if (!name || !email || !password) {
                    showToast(i18n.t('auth.fill_all'), 'error');
                    return;
                }

                registerBtn.textContent = i18n.t('auth.verifying');
                registerBtn.disabled = true;

                // Check if name exists
                const exists = await checkNameExists(name);

                if (exists) {
                    showToast(i18n.t('auth.name_taken'), 'error');
                    // Reset button
                    registerBtn.textContent = i18n.t('auth.btn_register');
                    registerBtn.disabled = false;
                    return;
                }

                registerBtn.textContent = i18n.t('auth.loading');

                const { data, error } = await signUp(email, password, name);

                if (error) {
                    console.error('SignUp Error details:', error);

                    // Handle rate limit specifically
                    if (error.status === 429 || error.message.toLowerCase().includes('rate limit') || error.message.includes('429')) {
                        showToast(i18n.t('auth.rate_limit'), 'error');
                    } else {
                        showToast(i18n.t('error.prefix') + (error.message || 'Error desconocido'), 'error');
                    }

                    // Always reset button on error
                    registerBtn.textContent = i18n.t('auth.btn_register');
                    registerBtn.disabled = false;
                } else {
                    console.log('SignUp successful:', data);
                    showToast(i18n.t('auth.register_success'), 'success');
                    // Reset or redirect logic if needed
                }
            } catch (err) {
                console.error('Unexpected error during registration caught:', err);
                showToast(i18n.t('error.unexpected') + err.message, 'error');

                // Final safety reset
                registerBtn.textContent = i18n.t('auth.btn_register');
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

            // Clear previous state
            if (emailInput) emailInput.value = '';
            if (messageDiv) {
                messageDiv.textContent = '';
                messageDiv.className = 'hidden';
            }
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<span data-i18n="auth.send_reset_link">${i18n.t('auth.send_reset_link')}</span>`;
            }

            modal.classList.remove('hidden');
            // Apply i18n translations to modal content
            i18n.updatePage();
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
                showToast(i18n.t('auth.fill_all'), 'error');
                return;
            }

            // Basic email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showToast(i18n.t('auth.invalid_email'), 'error');
                return;
            }

            try {
                submitBtn.disabled = true;
                submitBtn.innerHTML = `<span data-i18n="auth.sending">${i18n.t('auth.sending')}</span>`;
                messageDiv.className = 'hidden';

                const { error } = await resetPassword(email);

                if (error) {
                    console.error('Password reset error object:', error);

                    const errMsg = error.message || '';
                    const status = error.status || error.code || '';

                    // Handle rate limit specifically
                    if (status === 429 || errMsg.includes('429') || errMsg.toLowerCase().includes('rate limit')) {
                        messageDiv.textContent = i18n.t('auth.rate_limit');
                    } else {
                        // Fallback to error message or stringified error if no message exists
                        messageDiv.textContent = i18n.t('error.prefix') + (errMsg || JSON.stringify(error) || 'Unknown error');
                    }

                    messageDiv.className = 'error';
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = `<span data-i18n="auth.send_reset_link">${i18n.t('auth.send_reset_link')}</span>`;
                    i18n.updatePage();
                } else {
                    messageDiv.textContent = i18n.t('auth.reset_link_sent');
                    messageDiv.className = 'success';
                    emailInput.value = '';
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = `<span data-i18n="auth.send_reset_link">${i18n.t('auth.send_reset_link')}</span>`;
                    i18n.updatePage();

                    // Close modal after 4 seconds to give user time to read
                    setTimeout(() => {
                        closeModal();
                    }, 4000);
                }
            } catch (err) {
                console.error('Unexpected error during password reset:', err);
                messageDiv.textContent = i18n.t('error.unexpected') + err.message;
                messageDiv.className = 'error';
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<span data-i18n="auth.send_reset_link">${i18n.t('auth.send_reset_link')}</span>`;
                i18n.updatePage();
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', init);
