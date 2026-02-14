
export const formatPrice = (price) => {
    return `$${parseFloat(price).toFixed(2)}`;
};

export const getUrlParam = (param) => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
};
