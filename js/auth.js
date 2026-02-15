
import { loadComponents, updateNavbarAuth, updateNavbarCartCount } from './components.js';
import { signIn, signUp, onAuthStateChange, getUser, signOut } from './api.js';
import { loadCart, getCartCount, loadFavorites } from './state.js';
import { showToast } from './utils.js';

async function init() {
    await loadComponents();

    loadCart();
    updateNavbarCartCount(getCartCount());

    const user = await getUser();
    updateNavbarAuth(user);

    // If already logged in, maybe redirect to home?
    if (user) {
        // window.location.href = 'index.html';
        // But maybe user wants to see account page or logout. 
        // For now, let's keep it.
        document.getElementById('auth-title').textContent = 'Tu Cuenta';
        document.getElementById('auth-desc').textContent = `Hola, ${user.email}`;

        // Hide forms, show logout?
        const card = document.querySelector('.login-card');
        card.innerHTML = `
            <div class="login-card__header" style="text-align:center;">
                <h2 style="font-family: 'Bricolage Grotesque'; font-size: 24px; font-weight:700;">Tu Cuenta</h2>
                <p style="color:#6B7280;">${user.email}</p>
            </div>
            <button id="logout-btn" class="btn btn--outline btn--block btn--lg" style="margin-top:20px;">Cerrar Sesión</button>
        `;
        document.getElementById('logout-btn').addEventListener('click', async () => {
            await signOut();
            window.location.reload();
        });
        return;
    }

    setupTabs();
    setupForms();

    onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
            window.location.href = 'index.html';
        }
    });

    if (window.lucide) window.lucide.createIcons();
}

function setupTabs() {
    const tabs = document.querySelectorAll('.login-card__tab');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const title = document.getElementById('auth-title');
    const desc = document.getElementById('auth-desc');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('login-card__tab--active'));
            tab.classList.add('login-card__tab--active');

            const target = tab.dataset.tab;
            if (target === 'login') {
                loginForm.classList.remove('hidden');
                registerForm.classList.add('hidden');
                title.textContent = 'Bienvenido de nuevo';
                desc.textContent = 'Inicia sesión para acceder a tus diseños';
            } else {
                loginForm.classList.add('hidden');
                registerForm.classList.remove('hidden');
                title.textContent = 'Crea tu cuenta';
                desc.textContent = 'Unete para descargar diseños exclusivos';
            }
        });
    });
}

function setupForms() {
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');

    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            if (!email || !password) {
                showToast('Completa todos los campos', 'error');
                return;
            }

            loginBtn.textContent = 'Cargando...';
            loginBtn.disabled = true;

            const { error } = await signIn(email, password);

            if (error) {
                showToast('Error: ' + error.message, 'error');
                loginBtn.textContent = 'Iniciar Sesión';
                loginBtn.disabled = false;
            } else {
                showToast('Inicio de sesión exitoso', 'success');
                // Redirect handled by onAuthStateChange
            }
        });
    }

    if (registerBtn) {
        registerBtn.addEventListener('click', async () => {
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            if (!email || !password) {
                showToast('Completa todos los campos', 'error');
                return;
            }

            registerBtn.textContent = 'Cargando...';
            registerBtn.disabled = true;

            const { error } = await signUp(email, password);

            if (error) {
                showToast('Error: ' + error.message, 'error');
                registerBtn.textContent = 'Registrarse';
                registerBtn.disabled = false;
            } else {
                showToast('¡Registro exitoso! Por favor verifica tu email.', 'success');
                // Depending on settings, might auto login
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', init);
