import { supabase } from './api.js';

async function initMarketingTags() {
    try {
        const { data: config, error } = await supabase
            .from('site_config')
            .select('gtm_id, google_ads_id, google_ads_conversion_id')
            .limit(1)
            .single();

        if (error || !config) {
            console.warn('Marketing tags not configured or could not be loaded.');
            return;
        }

        const { gtm_id, google_ads_id, google_ads_conversion_id } = config;

        // 1. Google Tag Manager (Script)
        if (gtm_id) {
            (function (w, d, s, l, i) {
                w[l] = w[l] || []; w[l].push({
                    'gtm.start':
                        new Date().getTime(), event: 'gtm.js'
                }); var f = d.getElementsByTagName(s)[0],
                    j = d.createElement(s), dl = l != 'dataLayer' ? '&l=' + l : ''; j.async = true; j.src =
                        'https://www.googletagmanager.com/gtm.js?id=' + i + dl; f.parentNode.insertBefore(j, f);
            })(window, document, 'script', 'dataLayer', gtm_id);
        }

        // 2. Google Ads (gtag.js)
        if (google_ads_id) {
            const script = document.createElement('script');
            script.async = true;
            script.src = `https://www.googletagmanager.com/gtag/js?id=${google_ads_id}`;
            document.head.appendChild(script);

            window.dataLayer = window.dataLayer || [];
            function gtag() { window.dataLayer.push(arguments); }
            gtag('js', new Date());
            gtag('config', google_ads_id);

            // 3. Conversion Event (only on thank-you page)
            if (window.location.pathname.includes('thank-you.html') && google_ads_conversion_id) {
                gtag('event', 'conversion', {
                    'send_to': `${google_ads_id}/${google_ads_conversion_id}`,
                    'value': 1.0,
                    'currency': 'ARS',
                    'transaction_id': ''
                });
            }
        }
    } catch (err) {
        console.error('Error initializing marketing tags:', err);
    }
}

// Run as soon as possible
initMarketingTags();
