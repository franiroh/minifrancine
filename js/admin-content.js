import { supabase } from './api.js';
import { showToast } from './utils.js';

export function initContent() {
    const btnSave = document.getElementById('btn-save-content');
    const fileInput = document.getElementById('hero-img-input');

    if (btnSave) {
        btnSave.addEventListener('click', saveContentConfig);
    }

    if (fileInput) {
        fileInput.addEventListener('change', handleImagePreview);
    }

    // Load initial data when tab is active or on init
    // We can just load it once since it's global config
    loadContentConfig();
}

async function loadContentConfig() {
    try {
        // 1. Load image from site_config
        const { data: config, error: configError } = await supabase
            .from('site_config')
            .select('*')
            .limit(1)
            .single();

        if (configError && configError.code !== 'PGRST116') {
            console.error('Error loading config:', configError);
        }

        if (config && config.hero_image_url) {
            const preview = document.getElementById('hero-img-preview');
            if (preview) {
                preview.style.backgroundImage = `url('${config.hero_image_url}')`;
                preview.innerHTML = ''; // Clear "No image" text
            }
        }

        // 2. Load texts from site_translations
        const { data: trans, error: transError } = await supabase
            .from('site_translations')
            .select('*')
            .in('key', ['hero.badge', 'hero.title', 'hero.description']);

        if (transError) {
            console.error('Error loading translations:', transError);
        }

        if (trans) {
            trans.forEach(t => {
                const prefix = t.key.replace('hero.', 'home-'); // badge -> home-badge, title -> home-title, description -> home-description
                if (document.getElementById(`${prefix}-es`)) document.getElementById(`${prefix}-es`).value = t.es || '';
                if (document.getElementById(`${prefix}-en`)) document.getElementById(`${prefix}-en`).value = t.en || '';
                if (document.getElementById(`${prefix}-pt`)) document.getElementById(`${prefix}-pt`).value = t.pt || '';
            });
        }
    } catch (err) {
        console.error('Unexpected error loading content config:', err);
    }
}

async function handleImagePreview(e) {
    const file = e.target.files[0];
    if (!file) return;

    const preview = document.getElementById('hero-img-preview');
    if (preview) {
        // Show local preview
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.style.backgroundImage = `url('${e.target.result}')`;
            preview.innerHTML = '';
        };
        reader.readAsDataURL(file);
    }
}

async function saveContentConfig() {
    const btn = document.getElementById('btn-save-content');
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="loader" class="animate-spin"></i> Guardando...`;
    btn.disabled = true;

    try {
        const fileInput = document.getElementById('hero-img-input');
        const file = fileInput.files[0];
        let imageUrl = null;

        // 1. Upload new image if selected
        if (file) {
            const fileExt = file.name.split('.').pop();
            const fileName = `hero-${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;
            const { error: uploadError } = await supabase.storage.from('site-assets').upload(filePath, file);
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('site-assets').getPublicUrl(filePath);
            imageUrl = publicUrl;
        }

        // 2. Update site_config (Image only)
        const { data: existingConfig } = await supabase.from('site_config').select('id, hero_image_url').limit(1).single();
        if (!imageUrl && existingConfig) imageUrl = existingConfig.hero_image_url;

        const configPayload = { hero_image_url: imageUrl, updated_at: new Date() };
        if (existingConfig) {
            const { error } = await supabase.from('site_config').update(configPayload).eq('id', existingConfig.id);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('site_config').insert([configPayload]);
            if (error) throw error;
        }

        // 3. Update site_translations (Texts)
        const keys = ['hero.badge', 'hero.title', 'hero.description'];
        for (const key of keys) {
            const prefix = key.replace('hero.', 'home-');
            const values = {
                key,
                es: document.getElementById(`${prefix}-es`).value,
                en: document.getElementById(`${prefix}-en`).value,
                pt: document.getElementById(`${prefix}-pt`).value,
                section: 'home',
                updated_at: new Date()
            };

            const { error: upsertError } = await supabase
                .from('site_translations')
                .upsert(values, { onConflict: 'key' });

            if (upsertError) throw upsertError;
        }

        // 4. Clear i18n cache to force refresh on next page load
        localStorage.removeItem('site_translations_cache');

        showToast('Contenido actualizado correctamente', 'success');

    } catch (err) {
        console.error('Error saving content:', err);
        showToast('Error al guardar cambios: ' + err.message, 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
        if (window.lucide) window.lucide.createIcons();
    }
}
