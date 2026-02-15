
import { loadComponents, updateNavbarAuth, updateNavbarCartCount } from './components.js';
import { getUser, onAuthStateChange } from './api.js';
import { loadCart, getCartCount } from './state.js';

async function init() {
    await loadComponents();

    const user = await getUser();
    updateNavbarAuth(user);

    await loadCart(user);
    updateNavbarCartCount(getCartCount());

    onAuthStateChange((event, session) => {
        updateNavbarAuth(session?.user);
    });

    const form = document.getElementById('contact-form');
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }

    // Character counter
    const msgInput = document.getElementById('message');
    const charCount = document.getElementById('char-count');
    if (msgInput && charCount) {
        msgInput.addEventListener('input', () => {
            const len = msgInput.value.length;
            charCount.textContent = `${len} / 500`;
            if (len >= 500) {
                charCount.style.color = 'red';
            } else {
                charCount.style.color = '#6B7280';
            }
        });
    }
}

function sanitizeInput(str) {
    const div = document.createElement('div');
    div.innerText = str;
    return div.innerHTML;
}

async function handleSubmit(e) {
    e.preventDefault();

    const emailInput = document.getElementById('email');
    const messageInput = document.getElementById('message');

    let email = emailInput.value.trim();
    let message = messageInput.value.trim();

    // 1. Basic Validation
    if (!email || !message) {
        alert('Por favor completa todos los campos.');
        return;
    }

    // 2. Length Validation (Double check)
    if (message.length > 500) {
        alert('El mensaje es demasiado largo. Por favor redúcelo a 500 caracteres.');
        return;
    }

    // 3. Content Sanitization (Strip HTML)
    // Even though mailto is safe from XSS execution in client, 
    // we strip tags to ensure "text-only" requirement.
    message = message.replace(/<[^>]*>?/gm, '');

    // 4. Send via Edge Function
    const submitBtn = document.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Enviando... <i data-lucide="loader-2" class="spin"></i>';

    try {
        const { supabase } = await import('./api.js');
        const { data, error } = await supabase.functions.invoke('send-email', {
            body: { email, message },
        });

        if (error) throw error;

        alert('¡Mensaje enviado correctamente! Nos pondremos en contacto contigo pronto.');
        document.getElementById('contact-form').reset();
        document.getElementById('char-count').textContent = '0 / 500';

    } catch (err) {
        console.error('Error sending email:', err);
        alert('Hubo un error al enviar el mensaje. Por favor intenta nuevamente o escríbenos directamente a minifrancine@gmail.com.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
        if (window.lucide) window.lucide.createIcons();
    }
}

document.addEventListener('DOMContentLoaded', init);
