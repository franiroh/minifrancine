
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
            'catalog.back_to_selection': { es: 'Volver a la selección de', en: 'Back to selection of', pt: 'Voltar à seleção de' },
            'btn.my_designs': { es: 'Mis diseños', en: 'My designs', pt: 'Meus designs' },
            'btn.buy_now': { es: 'Comprar', en: 'Buy now', pt: 'Comprar' },
            'category.all': { es: 'Todos', en: 'All', pt: 'Todos' },
            'catalog.full_title': { es: 'Catálogo Completo', en: 'Full Catalog', pt: 'Catálogo Completo' },
            'catalog.full_subtitle': { es: 'Explora todos nuestros diseños de bordado', en: 'Explore all our embroidery designs', pt: 'Explore todos os nossos designs de bordado' },
            'catalog.tag_prefix': { es: 'Etiqueta:', en: 'Tag:', pt: 'Tag:' },
            'catalog.search_prefix': { es: 'Resultados para:', en: 'Results for:', pt: 'Resultados para:' },
            'catalog.result_single': { es: 'resultado encontrado', en: 'result found', pt: 'resultado encontrado' },
            'catalog.result_plural': { es: 'resultados encontrados', en: 'results found', pt: 'resultados encontrados' },
            'hero.badge': { es: 'Más de 5,000 diseños disponibles', en: 'Over 5,000 designs available', pt: 'Mais de 5.000 designs disponíveis' },
            'hero.title': { es: 'Diseños de Bordado Profesionales', en: 'Professional Embroidery Designs', pt: 'Desenhos de Bordado Profissionais' },
            'hero.description': { es: 'Archivos digitales listos para tu máquina. Formatos DST, PES, JEF, VP3 y más. Descarga instantánea.', en: 'Digital files ready for your embroidery machine. DST, PES, JEF, VP3 formats and more. Instant download.', pt: 'Arquivos digitais prontos para sua máquina. Formatos DST, PES, JEF, VP3 e mais. Download instantâneo.' },

            'cart.coupon_notice': { es: 'Los cupones y descuentos se aplican en el checkout', en: 'Coupons and discounts are applied at checkout', pt: 'Cupons e descontos são aplicados no checkout' },

            // Favorites
            'favorites.title': { es: 'Mis Favoritos', en: 'My Favorites', pt: 'Meus Favoritos' },
            'favorites.subtitle': { es: 'Los diseños que más te gustan, guardados para ti.', en: 'The designs you love, saved for you.', pt: 'Os designs que você ama, salvos para você.' },
            'favorites.empty': { es: 'Aún no tienes favoritos guardados.', en: 'You have no saved favorites yet.', pt: 'Você ainda não tem favoritos salvos.' },
            'favorites.action': { es: 'Explorar Categorías', en: 'Browse Categories', pt: 'Explorar Categorias' },

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
            'checkout.digital_warning_title': { es: 'Información Importante', en: 'Important Information', pt: 'Informações Importantes' },
            'checkout.digital_warning_text': { es: 'Estás comprando diseños de bordado digitales. No recibirás ningún producto físico por correo. Los archivos estarán disponibles para descargar inmediatamente después de completar el pago.', en: 'You are purchasing digital embroidery designs. You will not receive any physical products by mail. Files will be available for download immediately after completing payment.', pt: 'Você está comprando designs de bordado digitais. Você não receberá nenhum produto físico pelo correio. Os arquivos estarão disponíveis para download imediatamente após a conclusão do pagamento.' },
            'checkout.digital_warning_checkbox': { es: 'Entiendo que estos son archivos digitales y no productos físicos para envío.', en: 'I understand that these are digital files and not physical products for shipping.', pt: 'Entendo que estes são arquivos digitais e não produtos físicos para envio.' },
            'checkout.secure_ssl': { es: 'Pago seguro con encriptación SSL de 256 bits', en: 'Secure payment with 256-bit SSL encryption', pt: 'Pagamento seguro com criptografia SSL de 256 bits' },
            'checkout.order_summary': { es: 'Tu Pedido', en: 'Your Order', pt: 'Seu Pedido' },
            'checkout.placeholder_name': { es: 'Tu nombre', en: 'Your name', pt: 'Seu nome' },
            'checkout.placeholder_email': { es: 'tu@email.com', en: 'you@email.com', pt: 'seu@email.com' },
            'checkout.payment_confirm': { es: 'Confirmar Pago', en: 'Confirm Payment', pt: 'Confirmar Pagamento' },
            'checkout.coupon_title': { es: 'Cupones y Descuentos', en: 'Coupons and Discounts', pt: 'Cupons e Descontos' },
            'checkout.coupon_placeholder': { es: 'Ingresa código de cupón', en: 'Enter coupon code', pt: 'Insira o código do cupom' },
            'checkout.coupon_apply': { es: 'Aplicar', en: 'Apply', pt: 'Aplicar' },
            'checkout.coupon_remove': { es: 'Quitar', en: 'Remove', pt: 'Remover' },
            'checkout.coupon_available': { es: 'Cupones disponibles', en: 'Available coupons', pt: 'Cupons disponíveis' },
            'checkout.coupon_saved': { es: 'Ahorraste', en: 'You saved', pt: 'Você economizou' },
            'checkout.coupon_invalid': { es: 'Cupón inválido o usado', en: 'Invalid or used coupon', pt: 'Cupom inválido ou usado' },
            'checkout.coupon_applied': { es: 'Cupón aplicado: ', en: 'Coupon applied: ', pt: 'Cupom aplicado: ' },
            'checkout.coupon_welcome_title': { es: 'Descuento de Bienvenida (20%)', en: 'Welcome Discount (20%)', pt: 'Desconto de Boas-vindas (20%)' },
            'checkout.coupon_bulk_title': { es: 'Descuento por Volumen (50% en 10 items)', en: 'Bulk Discount (50% on 10 items)', pt: 'Desconto por Volume (50% em 10 itens)' },

            // Orders
            'orders.title': { es: 'Mis Pedidos', en: 'My Orders', pt: 'Meus Pedidos' },
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

            'nav.my_orders': { es: 'Mis Pedidos', en: 'My Orders', pt: 'Meus Pedidos' },
            'error.designs_load': { es: 'Hubo un error al cargar tus diseños.', en: 'There was an error loading your designs.', pt: 'Houve um erro ao carregar seus designs.' },
            'error.orders_load': { es: 'Hubo un error al cargar tus pedidos.', en: 'There was an error loading your orders.', pt: 'Houve um erro ao carregar seus pedidos.' },
            'error.file_unavailable': { es: 'El archivo digital para este producto no está disponible todavía.', en: 'The digital file for this product is not available yet.', pt: 'O arquivo digital para este produto ainda não está disponível.' },
            'msg.purchased_removed': { es: 'producto(s) en tu carrito ya fueron comprados. Se han removido.', en: 'product(s) in your cart were already purchased and have been removed.', pt: 'produto(s) no seu carrinho já foram comprados. Foram removidos.' },

            // Terms and Conditions
            'terms.title': { es: 'Términos y Condiciones', en: 'Terms and Conditions', pt: 'Termos e Condições' },
            'terms.hero_subtitle': { es: 'Lea atentamente las condiciones de uso de nuestro servicio y la licencia de nuestros diseños digitales.', en: 'Please read carefully the conditions of use of our service and the license for our digital designs.', pt: 'Leia atentamente as condições de uso do nosso serviço e a licença dos nossos designs digitais.' },
            'terms.intro_title': { es: '1. Introducción', en: '1. Introduction', pt: '1. Introdução' },
            'terms.intro_text': { es: 'Al acceder y utilizar este sitio web, usted acepta cumplir con los siguientes términos y condiciones de uso.', en: 'By accessing and using this website, you agree to comply with the following terms and conditions of use.', pt: 'Ao acessar e usar este site, você concorda em cumprir os seguintes termos e condições de uso.' },
            'terms.license_title': { es: '2. Licencia de Uso', en: '2. Usage License', pt: '2. Licença de Uso' },
            'terms.license_text': { es: 'Todos los diseños adquiridos en MiniFrancine son para uso personal y para la creación de productos físicos. Queda estrictamente prohibida la reventa, distribución, sublicencia o intercambio de los archivos digitales originales.', en: 'All designs purchased from MiniFrancine are for personal use and for the creation of physical products. Reselling, distributing, sublicensing, or exchanging the original digital files is strictly prohibited.', pt: 'Todos os designs adquiridos na MiniFrancine são para uso pessoal e para a criação de produtos físicos. É estritamente proibida a revenda, distribuição, sublicenciamento ou troca dos arquivos digitais originais.' },
            'terms.refund_title': { es: '3. Política de Reembolso', en: '3. Refund Policy', pt: '3. Política de Reembolso' },
            'terms.refund_text': { es: 'Debido a la naturaleza digital de nuestros productos, todas las ventas son finales. No se ofrecen reembolsos una vez que los archivos han sido descargados o enviados.', en: 'Due to the digital nature of our products, all sales are final. No refunds are offered once the files have been downloaded or sent.', pt: 'Devido à natureza digital de nossos produtos, todas as vendas são finais. Não são oferecidos reembolsos após o download ou envio dos arquivos.' },
            'terms.liability_title': { es: '4. Limitación de Responsabilidad', en: '4. Limitation of Liability', pt: '4. Limitação de Responsabilidade' },
            'terms.liability_text': { es: 'MiniFrancine no será responsable de ningún daño derivado del uso de nuestros archivos o de problemas técnicos con su maquinaria de bordado.', en: 'MiniFrancine shall not be liable for any damages arising from the use of our files or technical issues with your embroidery machinery.', pt: 'A MiniFrancine não será responsável por quaisquer danos decorrentes do uso de nossos arquivos ou problemas técnicos com sua maquinaria de bordado.' },
            'terms.contact_title': { es: '5. Contacto', en: '5. Contact', pt: '5. Contato' },
            'terms.contact_text': { es: 'Si tiene alguna pregunta sobre estos términos, contáctenos en minifrancine@gmail.com.', en: 'If you have any questions about these terms, please contact us at minifrancine@gmail.com.', pt: 'Se você tiver alguma dúvida sobre estes termos, entre em contato conosco em minifrancine@gmail.com.' },
            'msg.login_required': { es: 'Debes iniciar sesión', en: 'You must log in', pt: 'Você deve fazer login' },
            'msg.digital_download': { es: 'Solo descarga digital', en: 'Digital Download Only', pt: 'Apenas download digital' },
            'designs.purchased': { es: 'Comprado', en: 'Purchased', pt: 'Comprado' },
            'btn.download': { es: 'Descargar', en: 'Download', pt: 'Baixar' },
            'btn.downloading': { es: 'Descargando...', en: 'Downloading...', pt: 'Baixando...' },
            'btn.downloaded': { es: 'Descargado', en: 'Downloaded', pt: 'Baixado' },
            'orders.product_default': { es: 'Producto', en: 'Product', pt: 'Produto' },
            'btn.purchased': { es: 'Comprado', en: 'Purchased', pt: 'Comprado' },
            'btn.add_to_cart': { es: 'Agregar al Carrito', en: 'Add to Cart', pt: 'Adicionar ao Carrinho' },
            'nav.home': { es: 'Inicio', en: 'Home', pt: 'Início' },
            'nav.catalog': { es: 'Categorías', en: 'Categories', pt: 'Categorias' },
            'nav.new': { es: 'Novedades', en: 'New', pt: 'Novidades' },
            'nav.sale': { es: 'Ofertas', en: 'Sale', pt: 'Ofertas' },
            'nav.subtitle': { es: 'Diseños de Bordado ITH', en: 'Embroidery ITH Files', pt: 'Desenhos de Bordado ITH' },
            'nav.search_placeholder': { es: 'Buscar diseños...', en: 'Search designs...', pt: 'Buscar desenhos...' },
            'nav.all_categories': { es: 'Ver todas', en: 'See all', pt: 'Ver todas' },
            'nav.faq': { es: 'FAQ', en: 'FAQ', pt: 'FAQ' },
            'footer.terms': { es: 'Términos y Condiciones', en: 'Terms and Conditions', pt: 'Termos e Condições' },
            'footer.rights': { es: 'Todos los derechos reservados.', en: 'All rights reserved.', pt: 'Todos os direitos reservados.' },
            'auth.login': { es: 'Iniciar Sesión', en: 'Log In', pt: 'Entrar' },
            'auth.register': { es: 'Registrarse', en: 'Register', pt: 'Registrar' },
            'auth.email': { es: 'Email', en: 'Email', pt: 'Email' },
            'auth.password': { es: 'Contraseña', en: 'Password', pt: 'Senha' },
            'auth.name': { es: 'Nombre', en: 'Name', pt: 'Nome' },
            'auth.forgot_password': { es: '¿Olvidaste tu contraseña?', en: 'Forgot your password?', pt: 'Esqueceu sua senha?' },
            'auth.btn_login': { es: 'Iniciar Sesión', en: 'Log In', pt: 'Entrar' },
            'auth.btn_register': { es: 'Registrarse', en: 'Register', pt: 'Registrar' },
            'auth.reset_password': { es: 'Recuperar Contraseña', en: 'Reset Password', pt: 'Recuperar Senha' },
            'auth.reset_instructions': { es: 'Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.', en: 'Enter your email and we\'ll send you a link to reset your password.', pt: 'Digite seu e-mail e enviaremos um link para redefinir sua senha.' },
            'auth.reset_link_sent': { es: '¡Enlace enviado! Revisa tu email para restablecer tu contraseña.', en: 'Link sent! Check your email to reset your password.', pt: 'Link enviado! Verifique seu e-mail para redefinir sua senha.' },
            'auth.send_reset_link': { es: 'Enviar enlace', en: 'Send link', pt: 'Enviar link' },
            'auth.sending': { es: 'Enviando...', en: 'Sending...', pt: 'Enviando...' },
            'auth.welcome': { es: 'Bienvenido de nuevo', en: 'Welcome back', pt: 'Bem-vindo de volta' },
            'auth.subtitle': { es: 'Inicia sesión para acceder a tus diseños', en: 'Log in to access your designs', pt: 'Faça login para acessar seus desenhos' },
            'auth.register_title': { es: 'Crea tu cuenta', en: 'Create your account', pt: 'Crie sua conta' },
            'auth.register_subtitle': { es: 'Únete para descargar diseños exclusivos', en: 'Join to download exclusive designs', pt: 'Junte-se para baixar designs exclusivos' },
            'auth.loading': { es: 'Cargando...', en: 'Loading...', pt: 'Carregando...' },
            'auth.verifying': { es: 'Verificando...', en: 'Verifying...', pt: 'Verificando...' },
            'auth.fill_all': { es: 'Completa todos los campos', en: 'Complete all fields', pt: 'Preencha todos os campos' },
            'auth.invalid_email': { es: 'Por favor ingresa un email válido', en: 'Please enter a valid email', pt: 'Por favor, insira um e-mail válido' },
            'auth.login_success': { es: 'Inicio de sesión exitoso', en: 'Login successful', pt: 'Login bem-sucedido' },
            'auth.register_success': { es: '¡Registro exitoso! Por favor verifica tu email.', en: 'Registration successful! Please check your email.', pt: 'Registro bem-sucedido! Por favor, verifique seu e-mail.' },
            'auth.name_taken': { es: 'Ese nombre ya está en uso. Por favor elige otro.', en: 'That name is already in use. Please choose another.', pt: 'Esse nome já está em uso. Por favor, escolha outro.' },
            'auth.rate_limit': { es: 'Demasiados intentos. Por favor espera unos minutos.', en: 'Too many attempts. Please wait a few minutes.', pt: 'Muitas tentativas. Por favor, aguarde alguns minutos.' },
            'auth.internal_error': { es: 'Error interno del formulario', en: 'Internal form error', pt: 'Erro interno do formulário' },
            'auth.logout': { es: 'Cerrar Sesión', en: 'Log Out', pt: 'Sair' },
            'auth.my_account': { es: 'Tu Cuenta', en: 'My Account', pt: 'Minha Conta' },
            'auth.hello': { es: 'Hola', en: 'Hello', pt: 'Olá' },
            'auth.placeholder_email': { es: 'tu@email.com', en: 'your@email.com', pt: 'seu@email.com' },
            'auth.placeholder_name': { es: 'Tu nombre', en: 'Your name', pt: 'Seu nome' },
            'auth.placeholder_password': { es: '••••••••', en: '••••••••', pt: '••••••••' },
            'auth.placeholder_subject': { es: 'Ej: Pregunta sobre pedido', en: 'Ex: Question about order', pt: 'Ex: Pergunta sobre o pedido' },
            'auth.placeholder_message': { es: 'Escribe tu mensaje aquí...', en: 'Write your message here...', pt: 'Escreva sua mensagem aqui...' },

            // Reset Password Page
            'reset_password.page_title': { es: 'MiniFrancine — Restablecer Contraseña', en: 'MiniFrancine — Reset Password', pt: 'MiniFrancine — Redefinir Senha' },
            'reset_password.title': { es: 'Restablecer Contraseña', en: 'Reset Password', pt: 'Redefinir Senha' },
            'reset_password.subtitle': { es: 'Ingresa tu nueva contraseña', en: 'Enter your new password', pt: 'Digite sua nova senha' },
            'reset_password.new_password': { es: 'Nueva Contraseña', en: 'New Password', pt: 'Nova Senha' },
            'reset_password.confirm_password': { es: 'Confirmar Contraseña', en: 'Confirm Password', pt: 'Confirmar Senha' },
            'reset_password.update_button': { es: 'Actualizar Contraseña', en: 'Update Password', pt: 'Atualizar Senha' },
            'reset_password.updating': { es: 'Actualizando...', en: 'Updating...', pt: 'Atualizando...' },
            'reset_password.invalid_session': { es: 'Sesión inválida. Por favor solicita un nuevo enlace de recuperación.', en: 'Invalid session. Please request a new recovery link.', pt: 'Sessão inválida. Por favor, solicite um novo link de recuperação.' },
            'reset_password.fill_both_fields': { es: 'Por favor completa ambos campos', en: 'Please fill in both fields', pt: 'Por favor, preencha ambos os campos' },
            'reset_password.min_length': { es: 'La contraseña debe tener al menos 6 caracteres', en: 'Password must be at least 6 characters', pt: 'A senha deve ter pelo menos 6 caracteres' },
            'reset_password.no_match': { es: 'Las contraseñas no coinciden', en: 'Passwords do not match', pt: 'As senhas não coincidem' },
            'reset_password.success': { es: '¡Contraseña actualizada exitosamente!', en: 'Password updated successfully!', pt: 'Senha atualizada com sucesso!' },

            // FAQ Page
            'faq.page_title': { es: 'MiniFrancine — Preguntas Frecuentes', en: 'MiniFrancine — FAQ', pt: 'MiniFrancine — Perguntas Frequentes' },
            'faq.hero_title': { es: 'Preguntas Frecuentes', en: 'Frequently Asked Questions', pt: 'Perguntas Frequentes' },
            'faq.hero_subtitle': { es: 'Todo lo que necesitas saber sobre cómo usar MiniFrancine, descargar tus diseños y preparar tus archivos de bordado.', en: 'Everything you need to know about using MiniFrancine, downloading your designs, and preparing your embroidery files.', pt: 'Tudo o que você precisa saber sobre como usar MiniFrancine, baixar seus designs e preparar seus arquivos de bordado.' },

            'faq.section_getting_started': { es: 'Comenzando', en: 'Getting Started', pt: 'Começando' },
            'faq.section_downloading': { es: 'Descargando Archivos', en: 'Downloading Files', pt: 'Baixando Arquivos' },
            'faq.section_extracting': { es: 'Descomprimiendo Archivos ZIP', en: 'Extracting ZIP Files', pt: 'Extraindo Arquivos ZIP' },
            'faq.section_equipment': { es: 'Equipo Necesario', en: 'Required Equipment', pt: 'Equipamento Necessário' },
            'faq.section_support': { es: 'Soporte', en: 'Support', pt: 'Suporte' },

            'faq.q1_browse': { es: '¿Cómo navego por los diseños?', en: 'How do I browse designs?', pt: 'Como navego pelos designs?' },
            'faq.a1_browse': { es: 'Puedes explorar nuestros diseños desde la página de <strong>Categorías</strong> en el menú principal. Usa los filtros por categoría o busca diseños específicos. Cada diseño muestra una vista previa y detalles del archivo.', en: 'You can explore our designs from the <strong>Categories</strong> page in the main menu. Use category filters or search for specific designs. Each design shows a preview and file details.', pt: 'Você pode explorar nossos designs na página <strong>Categorias</strong> no menu principal. Use filtros por categoria ou pesquise designs específicos. Cada design mostra uma prévia e detalhes do arquivo.' },

            'faq.q2_purchase': { es: '¿Cómo compro un diseño?', en: 'How do I purchase a design?', pt: 'Como compro um design?' },
            'faq.a2_purchase': { es: 'Haz clic en <strong>"Comprar"</strong> en cualquier diseño para agregarlo al carrito. Luego ve al carrito y completa el pago con PayPal. Una vez confirmado el pago, el diseño estará disponible en <strong>"Mis Diseños"</strong>.', en: 'Click <strong>"Buy"</strong> on any design to add it to your cart. Then go to cart and complete payment with PayPal. Once payment is confirmed, the design will be available in <strong>"My Designs"</strong>.', pt: 'Clique em <strong>"Comprar"</strong> em qualquer design para adicioná-lo ao carrinho. Em seguida, vá ao carrinho e complete o pagamento com PayPal. Após a confirmação do pagamento, o design estará disponível em <strong>"Meus Designs"</strong>.' },

            'faq.q3_download': { es: '¿Cómo descargo mis diseños comprados?', en: 'How do I download my purchased designs?', pt: 'Como baixo meus designs comprados?' },
            'faq.a3_download_intro': { es: 'Sigue estos pasos para descargar tus diseños:', en: 'Follow these steps to download your designs:', pt: 'Siga estes passos para baixar seus designs:' },
            'faq.a3_download_step1': { es: 'Ve a <strong>"Mis Diseños"</strong> en el menú de usuario', en: 'Go to <strong>"My Designs"</strong> in the user menu', pt: 'Vá para <strong>"Meus Designs"</strong> no menu do usuário' },
            'faq.a3_download_step2': { es: 'Encuentra el diseño que quieres descargar', en: 'Find the design you want to download', pt: 'Encontre o design que deseja baixar' },
            'faq.a3_download_step3': { es: 'Haz clic en el botón <strong>"Descargar"</strong>', en: 'Click the <strong>"Download"</strong> button', pt: 'Clique no botão <strong>"Baixar"</strong>' },
            'faq.a3_download_step4': { es: 'El archivo ZIP se guardará en tu carpeta de descargas', en: 'The ZIP file will be saved to your downloads folder', pt: 'O arquivo ZIP será salvo na sua pasta de downloads' },

            'faq.q4_redownload': { es: '¿Puedo volver a descargar un diseño?', en: 'Can I re-download a design?', pt: 'Posso baixar novamente um design?' },
            'faq.a4_redownload': { es: '¡Sí! Puedes descargar tus diseños comprados tantas veces como necesites. Solo ve a <strong>"Mis Diseños"</strong> y haz clic en descargar nuevamente.', en: 'Yes! You can download your purchased designs as many times as you need. Just go to <strong>"My Designs"</strong> and click download again.', pt: 'Sim! Você pode baixar seus designs comprados quantas vezes precisar. Basta ir para <strong>"Meus Designs"</strong> e clicar em baixar novamente.' },

            'faq.q5_what_is_zip': { es: '¿Qué es un archivo ZIP?', en: 'What is a ZIP file?', pt: 'O que é um arquivo ZIP?' },
            'faq.a5_what_is_zip': { es: 'Un archivo ZIP es un archivo comprimido que contiene tus diseños de bordado. Necesitas <strong>descomprimir</strong> (extraer) el archivo para acceder a los archivos de diseño individuales.', en: 'A ZIP file is a compressed file that contains your embroidery designs. You need to <strong>extract</strong> (unzip) the file to access the individual design files.', pt: 'Um arquivo ZIP é um arquivo compactado que contém seus designs de bordado. Você precisa <strong>extrair</strong> (descompactar) o arquivo para acessar os arquivos de design individuais.' },

            'faq.q6_extract_windows': { es: '¿Cómo descomprimo en Windows?', en: 'How do I extract on Windows?', pt: 'Como extraio no Windows?' },
            'faq.a6_extract_windows_intro': { es: 'En Windows:', en: 'On Windows:', pt: 'No Windows:' },
            'faq.a6_extract_windows_step1': { es: 'Haz clic derecho en el archivo ZIP', en: 'Right-click on the ZIP file', pt: 'Clique com o botão direito no arquivo ZIP' },
            'faq.a6_extract_windows_step2': { es: 'Selecciona <strong>"Extraer todo..."</strong>', en: 'Select <strong>"Extract All..."</strong>', pt: 'Selecione <strong>"Extrair Tudo..."</strong>' },
            'faq.a6_extract_windows_step3': { es: 'Elige dónde guardar los archivos', en: 'Choose where to save the files', pt: 'Escolha onde salvar os arquivos' },
            'faq.a6_extract_windows_step4': { es: 'Haz clic en <strong>"Extraer"</strong>', en: 'Click <strong>"Extract"</strong>', pt: 'Clique em <strong>"Extrair"</strong>' },

            'faq.q7_extract_mac': { es: '¿Cómo descomprimo en Mac?', en: 'How do I extract on Mac?', pt: 'Como extraio no Mac?' },
            'faq.a7_extract_mac': { es: 'En Mac, simplemente <strong>haz doble clic</strong> en el archivo ZIP y se extraerá automáticamente en la misma carpeta.', en: 'On Mac, simply <strong>double-click</strong> the ZIP file and it will automatically extract in the same folder.', pt: 'No Mac, simplesmente <strong>clique duas vezes</strong> no arquivo ZIP e ele será extraído automaticamente na mesma pasta.' },

            'faq.extract_software_windows': {
                es: 'Si tienes problemas, te recomendamos usar programas gratuitos como <a href="https://www.7-zip.org/" target="_blank" style="color:#FF6B6B;">7-Zip</a> o <a href="https://www.win-rar.com/" target="_blank" style="color:#FF6B6B;">WinRAR</a>.',
                en: 'If you have issues, we recommend using free programs like <a href="https://www.7-zip.org/" target="_blank" style="color:#FF6B6B;">7-Zip</a> or <a href="https://www.win-rar.com/" target="_blank" style="color:#FF6B6B;">WinRAR</a>.',
                pt: 'Se você tiver problemas, recomendamos usar programas gratuitos como <a href="https://www.7-zip.org/" target="_blank" style="color:#FF6B6B;">7-Zip</a> ou <a href="https://www.win-rar.com/" target="_blank" style="color:#FF6B6B;">WinRAR</a>.'
            },
            'faq.extract_software_mac': {
                es: 'Si el sistema no lo reconoce, te recomendamos usar <a href="https://theunarchiver.com/" target="_blank" style="color:#FF6B6B;">The Unarchiver</a> (gratis).',
                en: 'If the system doesn\'t recognize it, we recommend using <a href="https://theunarchiver.com/" target="_blank" style="color:#FF6B6B;">The Unarchiver</a> (free).',
                pt: 'Se o sistema não o reconhecer, recomendamos usar o <a href="https://theunarchiver.com/" target="_blank" style="color:#FF6B6B;">The Unarchiver</a> (grátis).'
            },

            'faq.q8_what_need': { es: '¿Qué necesito para usar estos diseños?', en: 'What do I need to use these designs?', pt: 'O que preciso para usar esses designs?' },
            'faq.a8_equipment_title': { es: 'Equipo Necesario:', en: 'Required Equipment:', pt: 'Equipamento Necessário:' },
            'faq.a8_equipment_machine': { es: '<strong>Máquina bordadora</strong> - Compatible con formatos de bordado digitales', en: '<strong>Embroidery machine</strong> - Compatible with digital embroidery formats', pt: '<strong>Máquina de bordar</strong> - Compatível com formatos de bordado digitais' },
            'faq.a8_equipment_usb': { es: '<strong>USB / Pen Drive</strong> - Para transferir archivos a tu máquina', en: '<strong>USB / Flash Drive</strong> - To transfer files to your machine', pt: '<strong>USB / Pen Drive</strong> - Para transferir arquivos para sua máquina' },
            'faq.a8_equipment_computer': { es: '<strong>Computadora</strong> - Para descargar y descomprimir archivos', en: '<strong>Computer</strong> - To download and extract files', pt: '<strong>Computador</strong> - Para baixar e extrair arquivos' },
            'faq.a8_equipment_software': { es: '<strong>Software de descompresión</strong> - Ya incluido en Windows y Mac', en: '<strong>Unzip software</strong> - Already included in Windows and Mac', pt: '<strong>Software de descompactação</strong> - Já incluído no Windows e Mac' },

            'faq.q9_formats': { es: '¿Qué formatos de archivo están disponibles?', en: 'What file formats are available?', pt: 'Quais formatos de arquivo estão disponíveis?' },
            'faq.a9_formats': { es: 'Nuestros diseños están disponibles en los formatos más comunes de bordado. Verifica la compatibilidad con tu máquina bordadora antes de comprar. Los formatos típicos incluyen PES, DST, JEF, y otros.', en: 'Our designs are available in the most common embroidery formats. Check compatibility with your embroidery machine before purchasing. Typical formats include PES, DST, JEF, and others.', pt: 'Nossos designs estão disponíveis nos formatos de bordado mais comuns. Verifique a compatibilidade com sua máquina de bordar antes de comprar. Os formatos típicos incluem PES, DST, JEF e outros.' },

            'faq.q10_contact': { es: '¿Aún tienes dudas o necesitas ayuda personalizada?', en: 'Still have questions or need personalized help?', pt: 'Ainda tem dúvidas ou precisa de ajuda personalizada?' },
            'faq.a10_contact': {
                es: '¡Estamos aquí para ayudarte! Si no encontraste la respuesta que buscabas, puedes enviarnos un email a <a href="mailto:minifrancine@gmail.com" style="color:#FF6B6B; font-weight:600;">minifrancine@gmail.com</a>. Respondemos todas las consultas en un plazo de 24-48 horas.',
                en: 'We are here to help! If you didn\'t find the answer you were looking for, you can send us an email at <a href="mailto:minifrancine@gmail.com" style="color:#FF6B6B; font-weight:600;">minifrancine@gmail.com</a>. We respond to all inquiries within 24-48 hours.',
                pt: 'Estamos aqui para ajudar! Se você não encontrou a resposta que procurava, pode nos enviar um e-mail para <a href="mailto:minifrancine@gmail.com" style="color:#FF6B6B; font-weight:600;">minifrancine@gmail.com</a>. Respondemos a todas as consultas em um prazo de 24-48 horas.'
            }
        };

        // 1. Try to load from local storage first (Cache)
        const cachedFn = localStorage.getItem('site_translations_cache');
        if (cachedFn) {
            try {
                this.translations = { ...staticTranslations, ...JSON.parse(cachedFn) };
            } catch (e) {
                console.error('Error parsing cached translations', e);
                this.translations = { ...staticTranslations };
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

                // Merge: Dynamic > Static
                const mergedTranslations = { ...staticTranslations, ...newTranslations };

                // Update cache
                localStorage.setItem('site_translations_cache', JSON.stringify(mergedTranslations));

                // Update memory and page
                this.translations = mergedTranslations;
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
        // Update elements with data-i18n
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.t(key);
            if (translation) {
                // Use innerHTML if translation contains HTML tags
                if (/<[^>]+>/.test(translation)) {
                    el.innerHTML = translation;
                } else {
                    el.textContent = translation;
                }
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
