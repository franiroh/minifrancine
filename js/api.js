
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://dxqsdzktytehycpnrbtn.supabase.co'
const supabaseKey = 'sb_publishable_crjG8THHPXfnLrtQityLWg_7pLdQPhG'
export const supabase = createClient(supabaseUrl, supabaseKey)

export async function fetchProducts() {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('id', { ascending: true })

    if (error) {
        console.error('Error fetching products:', error)
        return []
    }

    // Transform logic to match frontend expectations if necessary (camelCase vs snake_case)
    return data.map(p => ({
        id: p.id,
        title: p.title,
        category: p.category,
        price: p.price,
        oldPrice: p.old_price,
        imageColor: p.image_color,
        badge: p.badge,
        badgeColor: p.badge_color,
        size: p.size,
        stitches: p.stitches,
        formats: p.formats,
        rating: p.rating,
        reviews: p.reviews,
        description: p.description
    }));
}

export async function fetchProductById(id) {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()

    if (error) {
        console.error('Error fetching product:', id, error)
        return null
    }

    return {
        id: data.id,
        title: data.title,
        category: data.category,
        price: data.price,
        oldPrice: data.old_price,
        imageColor: data.image_color,
        badge: data.badge,
        badgeColor: data.badge_color,
        size: data.size,
        stitches: data.stitches,
        formats: data.formats,
        rating: data.rating,
        reviews: data.reviews,
        description: data.description
    };
}

// --- Auth ---

export async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    })
    return { data, error }
}

export async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })
    return { data, error }
}

export async function signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
}

export async function getUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
}

export async function getProfile(userId) {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
    return { data, error }
}

export function onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session)
    })
}

// --- Favorites ---

export async function fetchFavorites(userId) {
    const { data, error } = await supabase
        .from('favorites')
        .select('product_id')
        .eq('user_id', userId)

    if (error) {
        console.error('Error fetching favorites:', error)
        return []
    }
    return data.map(f => f.product_id)
}

export async function addToFavorites(userId, productId) {
    const { error } = await supabase
        .from('favorites')
        .insert({ user_id: userId, product_id: productId })
    return { error }
}

export async function removeFromFavorites(userId, productId) {
    const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId)
    return { error }
}



// --- Cart ---

export async function fetchCart(userId) {
    const { data, error } = await supabase
        .from('cart_items')
        .select(`
            id,
            product_id,
            quantity,
            product:products (*)
        `)
        .eq('user_id', userId)

    if (error) {
        console.error('Error fetching cart:', error)
        return []
    }

    // Transform to flat structure expected by state
    return data.map(item => ({
        ...item.product, // Spread product details
        // Override potential name conflicts or just use product data
        cart_item_id: item.id, // Store cart_item_id for deletion
        quantity: item.quantity
    }))
}

export async function addToCartDB(userId, productId, quantity = 1) {
    // Check if item exists to increment? For now assuming simple add or ignore
    const { data, error } = await supabase
        .from('cart_items')
        .insert({ user_id: userId, product_id: productId, quantity })
        .select()

    return { data, error }
}

export async function removeFromCartDB(cartItemId) {
    const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', cartItemId)
    return { error }
}

export async function clearCartDB(userId) {
    const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId)
    return { error }
}

// --- Orders ---

export async function createOrder() {
    const { data, error } = await supabase
        .rpc('create_order_from_cart')
    return { data, error }
}

export async function confirmOrderPayment(orderId, paymentId) {
    const { error } = await supabase
        .rpc('confirm_order_payment', {
            p_order_id: orderId,
            p_payment_id: paymentId
        })
    return { error }
}

export async function verifyPayment(orderId, paymentId) {
    const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { order_id: orderId, payment_id: paymentId }
    })
    return { data, error }
}

export async function getPayPalClientId() {
    const { data, error } = await supabase.functions.invoke('get-paypal-config', {
        method: 'GET'
    })
    return { data, error }
}



export async function fetchMyOrders(userId) {
    const { data, error } = await supabase
        .from('orders')
        .select(`
            id,
            total,
            status,
            created_at,
            payment_id,
            order_items (
                product_id,
                quantity,
                price,
                products (
                    title
                )
            )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching orders:', error)
        throw error
    }
    return data
}

export async function downloadProductFile(productId) {
    const { data: files, error } = await supabase
        .from('product_files')
        .select('storage_path, filename')
        .eq('product_id', productId)
        .single()

    if (error) {
        console.error('Error fetching file info:', error)
        return null
    }

    if (!files) return null;

    const { data: signedData, error: signError } = await supabase
        .storage
        .from('product-files')
        .createSignedUrl(files.storage_path, 60)

    if (signError) {
        console.error('Error signing URL:', signError)
        return null
    }

    return {
        url: signedData.signedUrl,
        filename: files.filename
    }
}

// --- Admin ---

export async function fetchAllOrders() {
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching all orders:', error)
        return []
    }
    return data
}

export async function fetchAdminStats() {
    // For V1, simple aggregation. Large scale needs RPC or Edge Function.
    const { count: orderCount, error: orderError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })

    const { count: productCount, error: prodError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })

    // Total Revenue (manual sum for now)
    const { data: sales, error: salesError } = await supabase
        .from('orders')
        .select('total')
        .eq('status', 'paid')

    let totalSales = 0;
    if (sales) {
        totalSales = sales.reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
    }

    return {
        totalOrders: orderCount || 0,
        totalProducts: productCount || 0,
        totalSales: totalSales
    }
}

export async function createProduct(productData) {
    const { data, error } = await supabase
        .from('products')
        .insert(productData)
        .select()
    return { data, error }
}

export async function updateProduct(id, productData) {
    const { data, error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', id)
        .select()
    return { data, error }
}

export async function deleteProduct(id) {
    const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)
    return { error }
}

export async function uploadProductImage(file) {
    const fileName = `${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

    if (error) {
        console.error('Upload Error', error);
        return null;
    }

    const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

    return publicUrl;
}
