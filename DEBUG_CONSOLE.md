# Instrucciones para Ver Errores en la Consola

## Configurar la consola para que persistan los logs

1. **Abre tu sitio** en el navegador
2. **Presiona F12** para abrir las herramientas de desarrollador
3. **Ve a la pestaña "Console"**
4. **Haz clic en el ícono de configuración** (⚙️) en la parte superior derecha de la consola
5. **Marca la opción "Preserve log"** o **"Conservar registro"**
   - Esto evitará que los logs se borren cuando navegues a otra página

## Hacer una compra de prueba

1. Con la consola abierta y "Preserve log" activado
2. Haz una compra de prueba
3. **Copia TODOS los mensajes** que aparezcan en la consola (especialmente los rojos)
4. Pégamelos aquí en el chat

## Qué buscar

Específicamente busca:
- ✅ `🔔 sendOrderConfirmationEmail called with orderId:` - indica que la función se llamó
- ✅ `Order confirmation email sent` - indica que el email se envió
- ❌ Cualquier mensaje en **rojo** (errores)
- ❌ Mensajes sobre `window.currentDbOrderId`
- ❌ Errores de `supabase.functions.invoke`

Una vez que tengas los logs, pégamelos aquí para ver qué está fallando.
