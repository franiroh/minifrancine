
import { loadComponents, updateNavbarAuth } from './components.js';
import { getUser, getProfile, updateProfile, anonymizeUser, signOut } from './api.js';
import { showToast } from './utils.js';
import i18n from './i18n.js';

async function init() {
    await loadComponents();

    const user = await getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    updateNavbarAuth(user);

    // Listen for state updates
    window.addEventListener('cart-updated', () => {
        updateNavbarCartCount(getCartCount());
    });

    const { loadCart, getCartCount } = await import('./state.js');
    const { updateNavbarCartCount } = await import('./components.js');

    await loadCart(user);
    updateNavbarCartCount(getCartCount());

    loadUserProfile(user.id, user.email);

    document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleSave(user.id);
    });

    // Delete Account Logic
    const deleteBtn = document.getElementById('delete-account-btn');
    const deleteModal = document.getElementById('delete-modal');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            deleteModal.style.display = 'block';
            if (window.lucide) window.lucide.createIcons();
        });
    }

    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', () => {
            deleteModal.style.display = 'none';
        });
    }

    // Close modal if clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === deleteModal) {
            deleteModal.style.display = 'none';
        }
    });

    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async () => {
            await handleDeleteAccount(user.id);
        });
    }
}

// ... existing functions ...

async function handleDeleteAccount(userId) {
    const confirmBtn = document.getElementById('confirm-delete-btn');
    const originalText = confirmBtn.innerHTML;

    confirmBtn.innerHTML = `<i data-lucide="loader-2" class="animate-spin"></i> Eliminando...`;
    confirmBtn.disabled = true;
    if (window.lucide) window.lucide.createIcons();

    // 1. Anonymize Profile
    const { error } = await anonymizeUser(userId);

    if (error) {
        console.error('Error deleting account:', error);
        showToast('Error al eliminar cuenta. Intenta nuevamente.', 'error');
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;
        return;
    }

    // 2. Sign Out
    await signOut();

    // 3. Redirect
    showToast('Tu cuenta ha sido eliminada.', 'success');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1500);
}

async function loadUserProfile(userId, email) {
    document.getElementById('email').value = email;

    const { data: profile, error } = await getProfile(userId);
    if (error) {
        console.error('Error loading profile:', error);
        showToast(i18n.t('error.profile_load'), 'error');
        return;
    }

    if (profile) {
        document.getElementById('full_name').value = profile.full_name || '';

        // Hide delete option if admin
        if (profile.role === 'admin') {
            const deleteBtn = document.getElementById('delete-account-btn');
            if (deleteBtn) {
                deleteBtn.style.display = 'none';
            }
        }
    }
}

async function handleSave(userId) {
    const btn = document.getElementById('save-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="loader-2" class="animate-spin"></i> ${i18n.t('profile.saving')}`;
    btn.disabled = true;
    if (window.lucide) window.lucide.createIcons();

    const updates = {
        full_name: document.getElementById('full_name').value,
        updated_at: new Date()
    };

    const { error } = await updateProfile(userId, updates);

    if (error) {
        console.error('Error updating profile:', error);
        showToast(i18n.t('error.profile_save'), 'error');
        btn.innerHTML = originalText;
        btn.disabled = false;
        if (window.lucide) window.lucide.createIcons();
    } else {
        showToast(i18n.t('msg.profile_saved'), 'success');
        btn.innerHTML = `<i data-lucide="check"></i> ${i18n.t('profile.saved')}`;
        if (window.lucide) window.lucide.createIcons();

        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
            if (window.lucide) window.lucide.createIcons();
        }, 2000);
    }
}

document.addEventListener('DOMContentLoaded', init);
