
import { supabase } from './api.js';

let translations = [];

export async function initI18nEditor() {
    console.log('Initializing i18n Editor...');
    await loadTranslations();
    renderTranslationsTable();

    // Event listener for Save Filter/Search if needed?
    // For now simple table.
}

async function loadTranslations() {
    const { data, error } = await supabase
        .from('site_translations')
        .select('*')
        .order('key');

    if (error) {
        console.error('Error loading translations:', error);
        alert('Error loading translations');
        return;
    }
    translations = data;
}

function renderTranslationsTable() {
    const container = document.getElementById('i18n-table-body');
    if (!container) return;

    if (translations.length === 0) {
        container.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay traducciones.</td></tr>';
        return;
    }

    container.innerHTML = translations.map(t => `
        <tr data-key="${t.key}">
            <td style="font-family:monospace; font-size:12px; color:#6B7280;">${t.key}</td>
            <td><input type="text" class="form-input i18n-input" data-lang="es" value="${escapeHtml(t.es || '')}" style="width:100%"></td>
            <td><input type="text" class="form-input i18n-input" data-lang="en" value="${escapeHtml(t.en || '')}" style="width:100%"></td>
            <td><input type="text" class="form-input i18n-input" data-lang="pt" value="${escapeHtml(t.pt || '')}" style="width:100%"></td>
            <td style="text-align:center;">
                <button class="btn btn-icon save-row-btn" title="Guardar"><i data-lucide="save"></i></button>
            </td>
        </tr>
    `).join('');

    // Re-init icons
    if (window.lucide) window.lucide.createIcons();

    // Add listeners
    document.querySelectorAll('.save-row-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const btn = e.target.closest('button');
            const row = btn.closest('tr');
            const key = row.dataset.key;
            const es = row.querySelector('[data-lang="es"]').value;
            const en = row.querySelector('[data-lang="en"]').value;
            const pt = row.querySelector('[data-lang="pt"]').value;

            // Visual feedback
            const originalText = btn.innerHTML;
            btn.innerHTML = '...';
            btn.disabled = true;

            await updateTranslation(key, { es, en, pt });

            btn.innerHTML = originalText;
            btn.disabled = false;
            // Re-render icon
            if (window.lucide) window.lucide.createIcons();
        });
    });
}

async function updateTranslation(key, values) {
    const { error } = await supabase
        .from('site_translations')
        .update(values)
        .eq('key', key);

    if (error) {
        console.error('Error updating translation:', error);
        alert('Error al guardar: ' + error.message);
    } else {
        // Clear i18n cache
        localStorage.removeItem('site_translations_cache');
    }
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
