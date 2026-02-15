
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
            ? `<a href="${item.href}" style="color: inherit; text-decoration: none; transition: color 0.2s;" onmouseover="this.style.color='#1A1A1A'" onmouseout="this.style.color='inherit'">${item.label}</a>`
            : `<span style="color: #1A1A1A; font-weight: 500;">${item.label}</span>`
        }
            `).join('')}
        </nav>
    `;
};
