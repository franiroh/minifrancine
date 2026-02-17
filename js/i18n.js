
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
        // Define static translations (badges, statuses, etc.)
        const staticTranslations = {
            'badge.new': { es: 'Nuevo', en: 'New', pt: 'Novo' },
            'badge.hot': { es: 'Hot', en: 'Hot', pt: 'Quente' },
            'badge.sale': { es: 'Oferta', en: 'Sale', pt: 'Oferta' },
            'status.pending': { es: 'Pendiente', en: 'Pending', pt: 'Pendente' },
            'status.paid': { es: 'Pagado', en: 'Paid', pt: 'Pago' },
            'status.sent': { es: 'Enviado', en: 'Shipped', pt: 'Enviado' },
            'status.cancelled': { es: 'Cancelado', en: 'Cancelled', pt: 'Cancelado' },
            'catalog.tag_prefix': { es: 'Etiqueta:', en: 'Tag:', pt: 'Tag:' },
            'catalog.result_single': { es: 'resultado', en: 'result', pt: 'resultado' },
            'catalog.result_plural': { es: 'resultados', en: 'results', pt: 'resultados' },
            'btn.my_designs': { es: 'Mis diseños', en: 'My designs', pt: 'Meus designs' },
            'btn.buy_now': { es: 'Comprar', en: 'Buy now', pt: 'Comprar' },
            'category.all': { es: 'Todos', en: 'All', pt: 'Todos' },
            'catalog.full_title': { es: 'Catálogo Completo', en: 'Full Catalog', pt: 'Catálogo Completo' },
            'catalog.full_subtitle': { es: 'Explora todos nuestros diseños de bordado', en: 'Explore all our embroidery designs', pt: 'Explore todos os nossos designs de bordado' },

            // Favorites
            'favorites.title': { es: 'Mis Favoritos', en: 'My Favorites', pt: 'Meus Favoritos' },
            'favorites.subtitle': { es: 'Los diseños que más te gustan, guardados para ti.', en: 'The designs you love, saved for you.', pt: 'Os designs que você ama, salvos para você.' },
            'favorites.empty': { es: 'Aún no tienes favoritos guardados.', en: 'You have no saved favorites yet.', pt: 'Você ainda não tem favoritos salvos.' },
            'favorites.action': { es: 'Explorar Catálogo', en: 'Browse Catalog', pt: 'Explorar Catálogo' },

            // My Designs
            'designs.title': { es: 'Mis Diseños', en: 'My Designs', pt: 'Meus Designs' },
            'designs.subtitle': { es: 'Todos tus diseños de bordado descargables en un solo lugar', en: 'All your downloadable embroidery designs in one place', pt: 'Todos os seus designs de bordado para download em um só lugar' },
            'designs.loading': { es: 'Cargando tus diseños...', en: 'Loading your designs...', pt: 'Carregando seus designs...' },
            'designs.empty': { es: 'No has comprado ningún diseño aún.', en: 'You haven\'t purchased any designs yet.', pt: 'Você ainda não comprou nenhum design.' },

            // Checkout
            'checkout.step_cart': { es: 'Carrito', en: 'Cart', pt: 'Carrinho' },
            'checkout.step_payment': { es: 'Pago', en: 'Payment', pt: 'Pagamento' },
            'checkout.step_confirm': { es: 'Confirmación', en: 'Confirmation', pt: 'Confirmação' },
            'checkout.pay_method': { es: 'Método de Pago', en: 'Payment Method', pt: 'Método de Pagamento' },
            'checkout.secure_paypal': { es: 'Pago seguro con PayPal', en: 'Secure payment with PayPal', pt: 'Pagamento seguro com PayPal' },
            'checkout.billing': { es: 'Información de Facturación', en: 'Billing Information', pt: 'Informações de Faturamento' },
            'checkout.name': { es: 'Nombre completo', en: 'Full Name', pt: 'Nome completo' },
            'checkout.email': { es: 'Email', en: 'Email', pt: 'Email' },
            'checkout.country': { es: 'País', en: 'Country', pt: 'País' },
            'checkout.secure_ssl': { es: 'Pago seguro con encriptación SSL de 256 bits', en: 'Secure payment with 256-bit SSL encryption', pt: 'Pagamento seguro com criptografia SSL de 256 bits' },
            'checkout.order_summary': { es: 'Tu Pedido', en: 'Your Order', pt: 'Seu Pedido' },
            'checkout.placeholder_name': { es: 'Tu nombre', en: 'Your name', pt: 'Seu nome' },
            'checkout.placeholder_email': { es: 'tu@email.com', en: 'you@email.com', pt: 'seu@email.com' },

            // Orders
            'orders.title': { es: 'Mis Compras', en: 'My Purchases', pt: 'Minhas Compras' },
            'orders.subtitle': { es: 'Historial de pedidos y descargas', en: 'Order history and downloads', pt: 'Histórico de pedidos e downloads' },
            'orders.loading': { es: 'Cargando tus compras...', en: 'Loading your purchases...', pt: 'Carregando suas compras...' },
            'orders.empty': { es: 'No has realizado ninguna compra.', en: 'You haven\'t made any purchases.', pt: 'Você ainda não fez nenhuma compra.' },
            'orders.rate_title': { es: 'Calificar Producto', en: 'Rate Product', pt: 'Avaliar Produto' },
            'orders.rate_score': { es: 'Puntuación:', en: 'Score:', pt: 'Pontuação:' },
            'orders.rate_comment': { es: 'Comentario:', en: 'Comment:', pt: 'Comentário:' },
            'orders.rate_placeholder': { es: '¿Qué te pareció este diseño?', en: 'What did you think of this design?', pt: 'O que você achou deste design?' },
            'orders.rate_delete': { es: 'Eliminar', en: 'Delete', pt: 'Excluir' },
            'orders.rate_save': { es: 'Guardar Calificación', en: 'Save Rating', pt: 'Salvar Avaliação' },

            // Profile
            'profile.title': { es: 'Mi Perfil', en: 'My Profile', pt: 'Meu Perfil' },
            'profile.subtitle': { es: 'Gestiona tu información personal', en: 'Manage your personal information', pt: 'Gerencie suas informações pessoais' },
            'profile.email': { es: 'Email', en: 'Email', pt: 'Email' },
            'profile.email_helper': { es: 'El email no se puede cambiar.', en: 'Email cannot be changed.', pt: 'O email não pode ser alterado.' },
            'profile.name': { es: 'Nombre Completo', en: 'Full Name', pt: 'Nome Completo' },
            'profile.phone': { es: 'Teléfono', en: 'Phone', pt: 'Telefone' },
            'profile.save': { es: 'Guardar Cambios', en: 'Save Changes', pt: 'Salvar Alterações' },
            'profile.saving': { es: 'Guardando...', en: 'Saving...', pt: 'Salvando...' },
            'profile.saved': { es: 'Guardado', en: 'Saved', pt: 'Salvo' },
            'nav.profile': { es: 'Mi Perfil', en: 'My Profile', pt: 'Meu Perfil' },
            'error.profile_load': { es: 'Error al cargar el perfil.', en: 'Error loading profile.', pt: 'Erro ao carregar o perfil.' },
            'error.profile_save': { es: 'Error al guardar el perfil.', en: 'Error saving profile.', pt: 'Erro ao salvar o perfil.' },
            'msg.profile_saved': { es: 'Perfil actualizado correctamente.', en: 'Profile updated successfully.', pt: 'Perfil atualizado com sucesso.' },
            'msg.no_products_category': { es: 'No se encontraron productos en esta categoría.', en: 'No products found in this category.', pt: 'Nenhum produto encontrado nesta categoria.' },

            // JS Updates
            'error.designs_load': { es: 'Hubo un error al cargar tus diseños.', en: 'There was an error loading your designs.', pt: 'Houve um erro ao carregar seus designs.' },
            'error.orders_load': { es: 'Hubo un error al cargar tus compras.', en: 'There was an error loading your purchases.', pt: 'Houve um erro ao carregar suas compras.' },
            'error.file_unavailable': { es: 'El archivo digital para este producto no está disponible todavía.', en: 'The digital file for this product is not available yet.', pt: 'O arquivo digital para este produto ainda não está disponível.' },
            'msg.purchased_removed': { es: 'producto(s) en tu carrito ya fueron comprados. Se han removido.', en: 'product(s) in your cart were already purchased and have been removed.', pt: 'produto(s) no seu carrinho já foram comprados. Foram removidos.' },
            'msg.login_required': { es: 'Debes iniciar sesión', en: 'You must log in', pt: 'Você deve fazer login' },
            'designs.purchased': { es: 'Comprado', en: 'Purchased', pt: 'Comprado' },
            'btn.download': { es: 'Descargar', en: 'Download', pt: 'Baixar' },
            'btn.downloading': { es: 'Descargando...', en: 'Downloading...', pt: 'Baixando...' },
            'btn.downloaded': { es: 'Descargado', en: 'Downloaded', pt: 'Baixado' },
            'orders.product_default': { es: 'Producto', en: 'Product', pt: 'Produto' },
            'btn.purchased': { es: 'Comprado', en: 'Purchased', pt: 'Comprado' },
            'btn.add_to_cart': { es: 'Agregar al Carrito', en: 'Add to Cart', pt: 'Adicionar ao Carrinho' },
            'nav.login': { es: 'Iniciar Sesión', en: 'Log In', pt: 'Entrar' }
        };

        // 1. Try to load from local storage first (Cache)
        const cachedFn = localStorage.getItem('site_translations_cache');
        if (cachedFn) {
            try {
                this.translations = JSON.parse(cachedFn);
                // Ensure static translations are present even if cache is old
                Object.assign(this.translations, staticTranslations);
            } catch (e) {
                console.error('Error parsing cached translations', e);
            }
        } else {
            // Init with static if no cache
            this.translations = { ...staticTranslations };
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

                // Merge static translations
                Object.assign(newTranslations, staticTranslations);

                // Update cache
                localStorage.setItem('site_translations_cache', JSON.stringify(newTranslations));

                // If we didn't have cache, or if we want to ensure freshness, update memory
                this.translations = newTranslations;
                this.updatePage();
            }
        } catch (err) {
            console.error('Fetch error', err);
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
