import { supabase } from './api.js';
import { showToast } from './utils.js';

export async function initTagsManagement() {
    const btnSave = document.getElementById('btn-save-tags');
    if (btnSave) {
        btnSave.addEventListener('click', saveTagsConfig);
    }

    await loadTagsConfig();
}

async function loadTagsConfig() {
    try {
        const { data: config, error } = await supabase
            .from('site_config')
            .select('gtm_id, google_ads_id, google_ads_conversion_id')
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error loading tags config:', error);
            return;
        }

        if (config) {
            if (document.getElementById('tag-gtm-id')) document.getElementById('tag-gtm-id').value = config.gtm_id || '';
            if (document.getElementById('tag-google-ads-id')) document.getElementById('tag-google-ads-id').value = config.google_ads_id || '';
            if (document.getElementById('tag-google-ads-conv-id')) document.getElementById('tag-google-ads-conv-id').value = config.google_ads_conversion_id || '';
        }
    } catch (err) {
        console.error('Unexpected error loading tags config:', err);
    }
}

async function saveTagsConfig() {
    const btn = document.getElementById('btn-save-tags');
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="loader" class="animate-spin"></i> Guardando...`;
    btn.disabled = true;

    try {
        const gtmId = document.getElementById('tag-gtm-id').value.trim();
        const adsId = document.getElementById('tag-google-ads-id').value.trim();
        const convId = document.getElementById('tag-google-ads-conv-id').value.trim();

        const { data: existingConfig } = await supabase.from('site_config').select('id').limit(1).single();

        const payload = {
            gtm_id: gtmId,
            google_ads_id: adsId,
            google_ads_conversion_id: convId,
            updated_at: new Date()
        };

        let error;
        if (existingConfig) {
            const { error: updateError } = await supabase.from('site_config').update(payload).eq('id', existingConfig.id);
            error = updateError;
        } else {
            const { error: insertError } = await supabase.from('site_config').insert([payload]);
            error = insertError;
        }

        if (error) throw error;

        showToast('Etiquetas actualizadas correctamente', 'success');

        // Dispatch event for other components if needed
        window.dispatchEvent(new CustomEvent('marketing-tags-updated', { detail: payload }));

    } catch (err) {
        console.error('Error saving tags:', err);
        showToast('Error al guardar etiquetas: ' + err.message, 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
        if (window.lucide) window.lucide.createIcons();
    }
}
