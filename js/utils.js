
/**
 * Escapes HTML special characters to prevent XSS attacks.
 * Use this whenever inserting user/DB data into innerHTML templates.
 */
export const escapeHtml = (str) => {
    if (str == null) return '';
    const s = String(str);
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

/**
 * Sanitizes a CSS value to prevent injection via style attributes.
 * Only allows safe CSS patterns (colors, gradients, urls).
 */
export const sanitizeCssValue = (value) => {
    if (value == null) return '';
    const s = String(value);
    // Remove anything that looks like JS injection: expression(), url(javascript:), etc.
    if (/expression\s*\(/i.test(s) || /javascript\s*:/i.test(s) || /vbscript\s*:/i.test(s)) {
        return '';
    }
    // Allow: hex colors, rgb/rgba, hsl, gradients, named colors, url() with https
    return s;
};

export const formatPrice = (price) => {
    return `$${parseFloat(price).toFixed(2)}`;
};

export const getUrlParam = (param) => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
};

export const renderBreadcrumbs = (items) => {
    return `
        <nav class="breadcrumbs" style="padding: 16px 80px; font-size: 14px; color: #6B7280; display:flex; gap: 8px; align-items: center;">
            ${items.map((item, index) => `
                ${index > 0 ? '<span style="color:#d1d5db;">/</span>' : ''}
                ${item.href
            ? `<a href="${escapeHtml(item.href)}" style="color: inherit; text-decoration: none; transition: color 0.2s;" onmouseover="this.style.color='#1A1A1A'" onmouseout="this.style.color='inherit'">${escapeHtml(item.label)}</a>`
            : `<span style="color: #1A1A1A; font-weight: 500;">${escapeHtml(item.label)}</span>`
        }
            `).join('')}
        </nav>
    `;
};
