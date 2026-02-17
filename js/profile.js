
import { loadComponents, updateNavbarAuth } from './components.js';
import { getUser, getProfile, updateProfile } from './api.js';
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
    loadUserProfile(user.id, user.email);

    document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleSave(user.id);
    });
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
        document.getElementById('phone').value = profile.phone || '';
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
        phone: document.getElementById('phone').value,
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
