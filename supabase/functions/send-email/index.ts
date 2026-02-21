
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContactEmailData {
    type: 'contact';
    email: string;
    message: string;
}

interface OrderEmailData {
    type: 'order_confirmation';
    order: {
        id: string;
        userEmail: string;
        userName: string;
        items: Array<{ title: string; price: number }>;
        total: number;
        date: string;
    };
}

type EmailRequest = ContactEmailData | OrderEmailData;

function createOrderConfirmationHTML(order: OrderEmailData['order']): string {
    const itemsHTML = order.items.map(item => `
        <div style="border-bottom: 1px solid #e5e7eb; padding: 12px 0; display: flex; justify-content: space-between;">
            <span style="color: #374151;">${item.title}</span>
            <span style="color: #1f2937; font-weight: 500;">USD ${item.price.toFixed(2)}</span>
        </div>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #FF6B9D 0%, #FF8FAB 100%); color: white; padding: 40px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 700;">¡Gracias por tu compra!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Tu pedido ha sido confirmado</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 20px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hola <strong>${order.userName}</strong>,
            </p>
            <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 30px 0;">
                Tu pedido ha sido procesado exitosamente. Aquí están los detalles de tu compra:
            </p>
            
            <!-- Order Details Box -->
            <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin-bottom: 30px;">
                <div style="margin-bottom: 20px;">
                    <h2 style="color: #1f2937; font-size: 18px; font-weight: 600; margin: 0 0 8px 0;">Pedido #${order.id.slice(0, 8)}</h2>
                    <p style="color: #6b7280; font-size: 14px; margin: 0;">
                        <strong>Fecha:</strong> ${order.date}
                    </p>
                </div>
                
                <h3 style="color: #374151; font-size: 16px; font-weight: 600; margin: 0 0 16px 0;">Productos:</h3>
                ${itemsHTML}
                
                <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: #1f2937; font-size: 18px; font-weight: 700;">Total:</span>
                        <span style="color: #FF6B9D; font-size: 24px; font-weight: 700;">USD ${order.total.toFixed(2)}</span>
                    </div>
                </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://minifrancine.com/mis-disenos.html" 
                   style="display: inline-block; background-color: #FF6B9D; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Descargar mis diseños
                </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; text-align: center;">
                Puedes acceder a tus diseños en cualquier momento desde tu cuenta.
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
                ¡Gracias por confiar en MiniFrancine!
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Si tienes alguna pregunta, contáctanos en minifrancine@gmail.com
            </p>
        </div>
    </div>
</body>
</html>
    `;
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const body: EmailRequest = await req.json();

        if (!RESEND_API_KEY) {
            console.error('RESEND_API_KEY is not set');
            return new Response(
                JSON.stringify({ error: 'Server misconfiguration: API Key missing' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        let emailPayload: any;

        if (body.type === 'contact') {
            // Contact form email
            const { email, message } = body;

            if (!email || !message) {
                return new Response(
                    JSON.stringify({ error: 'Missing email or message' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            emailPayload = {
                from: 'MiniFrancine Support <onboarding@resend.dev>',
                to: ['minifrancine@gmail.com'],
                subject: `Consulta de ${email}`,
                html: `
                    <p><strong>De:</strong> ${email}</p>
                    <p><strong>Mensaje:</strong></p>
                    <p>${message.replace(/\n/g, '<br>')}</p>
                `,
                reply_to: email,
            };

        } else if (body.type === 'order_confirmation') {
            // Order confirmation email
            const { order } = body;

            if (!order || !order.userEmail || !order.items || !order.total) {
                return new Response(
                    JSON.stringify({ error: 'Missing order data' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            emailPayload = {
                from: 'MiniFrancine <onboarding@resend.dev>',
                to: [order.userEmail],
                subject: `Confirmación de pedido #${order.id.slice(0, 8)} - MiniFrancine`,
                html: createOrderConfirmationHTML(order),
            };

        } else {
            return new Response(
                JSON.stringify({ error: 'Invalid email type' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Send email via Resend
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify(emailPayload),
        });

        const data = await res.json();

        if (!res.ok) {
            console.error('Resend API Error:', data);
            return new Response(
                JSON.stringify({ error: 'Error sending email via provider', details: data }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
            JSON.stringify(data),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Edge Function Error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
