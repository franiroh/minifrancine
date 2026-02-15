
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { email, message } = await req.json();

        if (!email || !message) {
            return new Response(
                JSON.stringify({ error: 'Missing email or message' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        if (!RESEND_API_KEY) {
            console.error('RESEND_API_KEY is not set');
            return new Response(
                JSON.stringify({ error: 'Server misconfiguration: API Key missing' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: 'PatchFiles Support <onboarding@resend.dev>', // Or verify a collection domain
                to: ['minifrancine@gmail.com'],
                subject: `Consulta de ${email}`,
                html: `
          <p><strong>De:</strong> ${email}</p>
          <p><strong>Mensaje:</strong></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
        `,
                reply_to: email, // So you can reply directly to the user
            }),
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
