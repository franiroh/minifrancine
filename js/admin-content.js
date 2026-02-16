
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
        const { data, error } = await supabase
            .from('site_config')
            .select('*')
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "The result contains 0 rows"
            console.error('Error loading config:', error);
            showToast('Error cargando configuración', 'error');
            return;
        }

        if (data) {
            if (document.getElementById('home-badge')) document.getElementById('home-badge').value = data.hero_badge || '';
            if (document.getElementById('home-title')) document.getElementById('home-title').value = data.hero_title || '';
            if (document.getElementById('home-description')) document.getElementById('home-description').value = data.hero_description || '';

            if (data.hero_image_url) {
                const preview = document.getElementById('hero-img-preview');
                if (preview) {
                    preview.style.backgroundImage = `url('${data.hero_image_url}')`;
                    preview.innerHTML = ''; // Clear "No image" text
                }
            }
        }
    } catch (err) {
        console.error('Unexpected error loading config:', err);
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
        const badge = document.getElementById('home-badge').value;
        const title = document.getElementById('home-title').value;
        const description = document.getElementById('home-description').value;
        const fileInput = document.getElementById('hero-img-input');
        const file = fileInput.files[0];

        let imageUrl = null;

        // 1. Upload new image if selected
        if (file) {
            const fileExt = file.name.split('.').pop();
            const fileName = `hero-${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('site-assets')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage.from('site-assets').getPublicUrl(filePath);
            imageUrl = publicUrl;
        }

        // 2. Get existing ID to update, or insert new
        const { data: existing } = await supabase.from('site_config').select('id, hero_image_url').limit(1).single();

        // Keep old image URL if no new one uploaded
        if (!imageUrl && existing) {
            imageUrl = existing.hero_image_url;
        }

        const payload = {
            hero_badge: badge,
            hero_title: title,
            hero_description: description,
            hero_image_url: imageUrl,
            updated_at: new Date()
        };

        let error = null;

        if (existing) {
            const { error: updateError } = await supabase
                .from('site_config')
                .update(payload)
                .eq('id', existing.id);
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('site_config')
                .insert([payload]);
            error = insertError;
        }

        if (error) throw error;

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
