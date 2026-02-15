
import { fetchFavorites, addToFavorites, removeFromFavorites, fetchCart, addToCartDB, removeFromCartDB, clearCartDB, fetchPurchasedProductIds } from './api.js';

export const state = {
    cart: [],
    favorites: new Set(),
    purchases: new Set(),
    user: null,
};

// --- Cart Logic (Hybrid) ---

export const loadCart = async (user = null) => {
    state.user = user;

    if (user) {
        // DB Cart
        // First check if we have local items to merge
        const localCart = JSON.parse(localStorage.getItem('patchfiles_cart') || '[]');
        if (localCart.length > 0) {
            console.log('Merging local cart to DB...');
            for (const item of localCart) {
                await addToCartDB(user.id, item.id, 1);
            }
            localStorage.removeItem('patchfiles_cart');
        }

        const dbCart = await fetchCart(user.id);
        state.cart = dbCart;
    } else {
        // Local Cart
        const stored = localStorage.getItem('patchfiles_cart');
        if (stored) {
            state.cart = JSON.parse(stored);
        } else {
            state.cart = [];
        }
    }

    window.dispatchEvent(new CustomEvent('cart-updated'));
    return state.cart;
};

export const addToCart = async (product) => {
    // Block adding already-purchased products
    if (isPurchased(product.id)) {
        alert('Ya compraste este producto. Puedes descargarlo desde "Mis Compras".');
        return;
    }

    if (state.user) {
        // DB Add
        const { data, error } = await addToCartDB(state.user.id, product.id, 1);
        if (!error) {
            // Reload cart to get the new ID and structure
            await loadCart(state.user);
        } else {
            alert('Error adding to cart');
        }
    } else {
        // Local Add
        state.cart.push(product);
        saveLocalCart();
    }
    console.log(`Added ${product.title} to cart`);
};

export const removeFromCart = async (indexOrId) => {
    if (state.user) {
        // DB Remove - Expects cart_item_id or index from mapped array
        const item = state.cart[indexOrId]; // Assuming index passed from UI
        if (item && item.cart_item_id) {
            await removeFromCartDB(item.cart_item_id);
            await loadCart(state.user);
        }
    } else {
        // Local Remove
        state.cart.splice(indexOrId, 1);
        saveLocalCart();
    }
};

export const clearCart = async () => {
    if (state.user) {
        await clearCartDB(state.user.id);
        await loadCart(state.user);
    } else {
        state.cart = [];
        saveLocalCart();
    }
}

const saveLocalCart = () => {
    localStorage.setItem('patchfiles_cart', JSON.stringify(state.cart));
    window.dispatchEvent(new CustomEvent('cart-updated'));
};

export const getCartTotal = () => {
    return state.cart.reduce((sum, item) => sum + item.price, 0).toFixed(2);
};

export const getCartCount = () => {
    return state.cart.length;
};

// --- Favorites Logic ---

export const loadFavorites = async (user) => {
    if (!user) {
        state.favorites.clear();
        return;
    }
    state.user = user;
    const favIds = await fetchFavorites(user.id);
    state.favorites = new Set(favIds);
    window.dispatchEvent(new CustomEvent('favorites-updated'));
};

export const toggleFavorite = async (productId) => {
    if (!state.user) {
        alert('Debes iniciar sesión para agregar favoritos.');
        return;
    }

    const isFav = state.favorites.has(productId);

    // Optimistic Update
    if (isFav) {
        state.favorites.delete(productId);
    } else {
        state.favorites.add(productId);
    }
    window.dispatchEvent(new CustomEvent('favorites-updated'));

    // API Call
    let result;
    if (isFav) {
        result = await removeFromFavorites(state.user.id, productId);
    } else {
        result = await addToFavorites(state.user.id, productId);
    }

    if (result.error) {
        console.error('Error toggling favorite:', result.error);
        alert('Hubo un error al actualizar favoritos.');
        // Revert
        if (isFav) {
            state.favorites.add(productId);
        } else {
            state.favorites.delete(productId);
        }
        window.dispatchEvent(new CustomEvent('favorites-updated'));
    }
};

export const isFavorite = (productId) => {
    return state.favorites.has(productId);
};

// --- Purchased Products Logic ---

export const loadPurchases = async (user) => {
    if (!user) {
        state.purchases.clear();
        return;
    }
    state.user = user;
    const purchasedIds = await fetchPurchasedProductIds();
    state.purchases = new Set(purchasedIds);
    window.dispatchEvent(new CustomEvent('purchases-updated'));
};

export const isPurchased = (productId) => {
    return state.purchases.has(productId);
};
