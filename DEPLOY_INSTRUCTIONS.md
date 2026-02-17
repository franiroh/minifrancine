# Crear Edge Function - send-email

## 📋 Crear la función en Supabase Dashboard

Estás en: https://supabase.com/dashboard/project/dxqsdzktytehycpnrbtn/functions

### Paso 1: Crear nueva función
1. Haz clic en el botón **"Create a new function"** o **"New Edge Function"**
2. En el nombre, escribe: `send-email`
3. Haz clic en **"Create function"** o **"Continue"**

### Paso 2: Copiar el código
1. Abre VS Code
2. Abre el archivo: `e:\!dev\minifrancine\supabase\functions\send-email\index.ts`
3. Selecciona TODO el contenido (Ctrl + A)
4. Cópialo (Ctrl + C)

### Paso 3: Pegar y desplegar
1. En el editor del Dashboard de Supabase, **borra** cualquier código de ejemplo
2. **Pega** el código que copiaste (Ctrl + V)
3. **Verifica** que la URL del botón sea: `https://franiroh.github.io/minifrancine/mis-disenos.html`
4. Haz clic en **"Deploy"** o **"Save"**

### Paso 4: Verificar variables de entorno
1. Ve a: **Settings → Edge Functions** (o busca "Environment Variables")
2. Verifica que exista la variable: `RESEND_API_KEY`
3. Si no existe, agrégala con tu API key de Resend

---

## ✅ Probar el Email

Una vez desplegado:

1. **Realiza una compra de prueba** en tu sitio
2. **Revisa tu email** (el que usaste para registrarte)
3. **Revisa spam** si no lo ves en la bandeja principal
4. **Verifica los logs** si no llega:
   - Ve a: Functions → send-email → Logs
   - Busca errores

---

## 🎨 El email incluye:

- ✉️ Saludo personalizado con nombre del usuario
- 📦 Número de orden (primeros 8 caracteres)
- 📅 Fecha y hora de la compra
- 🛍️ Lista de productos con precios individuales
- 💰 Total destacado en color de marca
- 🔗 Botón para descargar diseños
- 📧 Footer con información de contacto

---

## 🐛 Si algo falla:

1. **Verifica** que `RESEND_API_KEY` esté configurada
2. **Revisa** los logs de la función en el Dashboard
3. **Verifica** que el email del usuario esté correcto en la base de datos
4. **Comprueba** que la tabla `orders` tenga la relación con `order_items` y `products`
