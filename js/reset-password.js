
import { loadComponents, updateNavbarAuth, updateNavbarCartCount } from './components.js';
import { updatePassword, getUser } from './api.js';
import { loadCart, getCartCount } from './state.js';
import { showToast } from './utils.js';
import { i18n } from './i18n.js';

async function init() {
    await loadComponents();

    loadCart();
    updateNavbarCartCount(getCartCount());

    const user = await getUser();
    updateNavbarAuth(user);

    if (!user) {
        showToast(i18n.t('reset_password.invalid_session'), 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 3000);
        return;
    }

    setupPasswordUpdate();

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
                showToast('Error: ' + error.message, 'error');
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
