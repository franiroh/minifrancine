-- Create site_translations table
CREATE TABLE IF NOT EXISTS site_translations (
    key TEXT PRIMARY KEY,
    es TEXT NOT NULL,
    en TEXT,
    pt TEXT,
    section TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE site_translations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public Read Translations"
ON site_translations FOR SELECT
USING (true);

CREATE POLICY "Admin CRUD Translations"
ON site_translations FOR ALL
USING (auth.role() = 'authenticated');

-- Insert Initial Data (Navbar & Footer & Common)
INSERT INTO site_translations (key, es, en, pt, section) VALUES
('nav.home', 'Inicio', 'Home', 'Início', 'navbar'),
('nav.catalog', 'Catálogo', 'Catalog', 'Catálogo', 'navbar'),
('nav.help', 'Ayuda y Contacto', 'Help & Contact', 'Ajuda e Contato', 'navbar'),
('nav.login', 'Ingresar', 'Login', 'Entrar', 'navbar'),
('nav.account', 'Mi Cuenta', 'My Account', 'Minha Conta', 'navbar'),
('nav.admin', 'Admin Panel', 'Admin Panel', 'Painel Admin', 'navbar'),
('nav.logout', 'Cerrar Sesión', 'Logout', 'Sair', 'navbar'),
('footer.desc', 'Archivos digitales de bordado premium para máquinas bordadoras domésticas.', 'Premium digital embroidery files for domestic embroidery machines.', 'Arquivos digitais de bordado premium para máquinas de bordar domésticas.', 'footer'),
('footer.rights', 'Todos los derechos reservados.', 'All rights reserved.', 'Todos os direitos reservados.', 'footer'),
('hero.badge', 'Más de 5,000 diseños disponibles', 'Over 5,000 designs available', 'Mais de 5.000 designs disponíveis', 'home'),
('hero.cta.catalog', 'Explorar Catálogo', 'Explore Catalog', 'Explorar Catálogo', 'home'),
('hero.cta.new', 'Ver Novedades', 'See New Arrivals', 'Ver Novidades', 'home'),
('catalog.title', 'Catálogo de Diseños', 'Design Catalog', 'Catálogo de Designs', 'catalog'),
('catalog.loading', 'Cargando productos...', 'Loading products...', 'Carregando produtos...', 'catalog'),
('btn.add_cart', 'Agregar al Carrito', 'Add to Cart', 'Adicionar ao Carrinho', 'product'),
('btn.buy_now', 'Comprar Ahora', 'Buy Now', 'Comprar Agora', 'product'),
('common.currency', 'USD', 'USD', 'USD', 'common')
ON CONFLICT (key) DO NOTHING;
