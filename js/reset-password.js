
import { loadComponents, updateNavbarAuth, updateNavbarCartCount } from './components.js';
import { updatePassword, getUser, onAuthStateChange } from './api.js';
import { loadCart, getCartCount } from './state.js';
import { showToast } from './utils.js';
import { i18n } from './i18n.js';

async function init() {
    // 1. Check for immediate user (session exists)
    let user = await getUser();

    // 2. Load basic components
    await loadComponents(user);

    // Listen for state updates
    window.addEventListener('cart-updated', () => {
        updateNavbarCartCount(getCartCount());
    });

    await loadCart(user);
    updateNavbarCartCount(getCartCount());

    // 3. If no user, wait for PASSWORD_RECOVERY event (Supabase processes hash fragment)
    if (!user) {
        console.log('No current user, waiting for auth recovery state change...');
        const { data: { subscription } } = onAuthStateChange(async (event, session) => {
            if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
                console.log('Auth event caught:', event);
                subscription.unsubscribe();
                setupPasswordUpdate();
                if (window.lucide) window.lucide.createIcons();
            }
        });

        // Fail-safe timeout
        setTimeout(async () => {
            const finalUser = await getUser();
            if (!finalUser) {
                showToast(i18n.t('reset_password.invalid_session'), 'error');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 3000);
            }
        }, 5000);
    } else {
        setupPasswordUpdate();
    }

    if (window.lucide) window.lucide.createIcons();
}

function setupPasswordUpdate() {
    const updateBtn = document.getElementById('update-password-btn');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');

    if (updateBtn && newPasswordInput && confirmPasswordInput) {
        updateBtn.addEventListener('click', async () => {
            const newPassword = newPasswordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            if (!newPassword || !confirmPassword) {
                showToast(i18n.t('reset_password.fill_both_fields'), 'error');
                return;
            }

            if (newPassword.length < 6) {
                showToast(i18n.t('reset_password.min_length'), 'error');
                return;
            }

            if (newPassword !== confirmPassword) {
                showToast(i18n.t('reset_password.no_match'), 'error');
                return;
            }

            updateBtn.disabled = true;
            updateBtn.innerHTML = `<span>${i18n.t('reset_password.updating')}</span>`;

            const { error } = await updatePassword(newPassword);

            if (error) {
                showToast(i18n.t('error.prefix') + error.message, 'error');
                updateBtn.disabled = false;
                updateBtn.innerHTML = `<span data-i18n="reset_password.update_button">${i18n.t('reset_password.update_button')}</span>`;
            } else {
                showToast(i18n.t('reset_password.success'), 'success');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', init);
