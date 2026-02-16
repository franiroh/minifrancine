
import { supabase } from './api.js';

export const i18n = {
    lang: localStorage.getItem('minifrancine_lang') || 'en',
    translations: {},

    async init() {
        console.log('Initializing i18n...', this.lang);
        await this.loadTranslations();
        document.documentElement.lang = this.lang;
        this.updatePage();
    },

    async loadTranslations() {
        // 1. Try to load from local storage first (Cache)
        const cachedFn = localStorage.getItem('site_translations_cache');
        if (cachedFn) {
            try {
                this.translations = JSON.parse(cachedFn);
                // console.log('Loaded translations from cache');
            } catch (e) {
                console.error('Error parsing cached translations', e);
            }
        }

        // 2. Fetch fresh data from Supabase (Background / Async)
        try {
            const { data, error } = await supabase
                .from('site_translations')
                .select('*');

            if (error) console.error('Error loading translations:', error);

            if (data) {
                const newTranslations = data.reduce((acc, row) => {
                    acc[row.key] = row;
                    return acc;
                }, {});

                // Update cache
                localStorage.setItem('site_translations_cache', JSON.stringify(newTranslations));

                // If we didn't have cache, or if we want to ensure freshness, update memory
                this.translations = newTranslations;
            }
        } catch (err) {
            console.error('Unexpected error loading translations:', err);
        }
    },

    t(key) {
        const item = this.translations[key];
        if (!item) return key; // Fallback to key if not found
        return item[this.lang] || item['es'] || key;
    },

    setLanguage(lang) {
        if (['es', 'en', 'pt'].includes(lang)) {
            this.lang = lang;
            localStorage.setItem('minifrancine_lang', lang);
            document.documentElement.lang = lang;
            this.updatePage();
            window.dispatchEvent(new CustomEvent('language-changed', { detail: { lang } }));
        }
    },

    async updatePage() {
        // Fetch translations if empty? (Already done in init)

        // Update elements with data-i18n
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.t(key);

            // If the element has children (like icons), we try to find a text node or a span.
            // Current strategy: If it has children, look for a text node to replace, OR assume simple text.
            // Better: Use a helper to safely replace text content while keeping icons?
            // Actually, for this site, most i18n elements will be simple text.
            // For complex ones (like Navbar with icon + text), we should wrap text in a span with data-i18n.
            // Exception: Hero Badge had an icon.

            if (el.children.length === 0) {
                el.textContent = translation;
            } else {
                // If it has children, we might be breaking layout if we just set textContent.
                // Does it have a data-i18n-target? No.
                // Let's assume if it has children, we should look for a specific child or APPEND/PREPEND?
                // No, standard is: Developer wraps text in <span>.
                // Let's warn in console if we are overwriting children.
                // console.warn('i18n: Overwriting children for key', key, el);
                // For now, let's just use textContent as it's safer for XSS than innerHTML, 
                // but we might lose icons if they are not separated.
                // FIX: We will refactor HTML to ensure text is isolated.
                el.textContent = translation;
            }
        });

        // Update placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (key) el.placeholder = this.t(key);
        });

        // Update titles
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            if (key) el.title = this.t(key);
        });
    }
};

export default i18n;
