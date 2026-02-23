import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// Add helper for batching if needed
const BATCH_SIZE = 100;

const supabaseUrl = 'https://dxqsdzktytehycpnrbtn.supabase.co'
const supabaseKey = 'sb_publishable_crjG8THHPXfnLrtQityLWg_7pLdQPhG'
export const supabase = createClient(supabaseUrl, supabaseKey)

// Global Password Recovery Handling
// If a user lands on ANY page with a recovery token, redirect them to the reset page
supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY' && !window.location.pathname.includes('reset-password.html')) {
        console.log('Recovery event detected, redirecting to reset-password.html');
        // Preserve hash if it exists (contains the access token)
        const hash = window.location.hash;
        window.location.href = 'reset-password.html' + hash;
    }
});

export async function fetchProducts({ publishedOnly = false, tag = null, search = null, sort = null, badge = null, includeArchived = false } = {}) {
    let query = supabase
        .from('products')
        .select('*, product_categories(category_id, categories(name))')

    if (sort === 'oldest') {
        query = query.order('created_at', { ascending: true })
    } else {
        // Default: Newest first
        query = query.order('created_at', { ascending: false })
    }

    if (publishedOnly) {
        query = query.eq('published', true)
    }

    // Filter out archived products by default (unless explicitly requested)
    if (!includeArchived) {
        query = query.eq('archived', false)
    }

    if (tag) {
        query = query.contains('tags', [tag])
    }

    if (badge) {
        // We use ilike to be safe with case sensitivity (SALE vs sale)
        query = query.ilike('badge', `%${badge}%`)
    }

    if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching products:', error)
        return []
    }

    // Transform logic to match frontend expectations if necessary (camelCase vs snake_case)
    return data.map(p => {
        const categories = p.product_categories ? p.product_categories.map(pc => pc.categories?.name).filter(Boolean) : [];
        const categoryIds = p.product_categories ? p.product_categories.map(pc => pc.category_id) : [];

        return {
            id: p.id,
            title: p.title,
            category: categories.length > 0 ? categories[0] : 'Sin categoría', // Keep backwards compatibility
            categories: categories, // Array of strings
            categoryId: categoryIds.length > 0 ? categoryIds[0] : null, // Keep backwards compatibility
            categoryIds: categoryIds, // Array of numbers
            price: p.price,
            oldPrice: p.old_price,
            imageColor: p.image_color,
            colorCount: p.color_count,
            colorChangeCount: p.color_change_count,
            badge: p.badge,
            badgeColor: p.badge_color,
            tags: p.tags || [],
            size: p.size,
            stitches: p.stitches,
            formats: p.formats,
            rating: p.rating,
            reviews: p.reviews,
            description: p.description,
            mainImage: p.main_image,
            published: p.published,
            archived: p.archived,
            indexed: p.indexed,
            threadColors: p.thread_colors || []
        };
    });
}

export async function fetchProductById(id) {
    const { data, error } = await supabase
        .from('products')
        .select('*, product_categories(category_id, categories(name))')
        .eq('id', id)
        .single()

    if (error) {
        console.error('Error fetching product:', id, error)
        return null
    }

    const categories = data.product_categories ? data.product_categories.map(pc => pc.categories?.name).filter(Boolean) : [];
    const categoryIds = data.product_categories ? data.product_categories.map(pc => pc.category_id) : [];

    return {
        id: data.id,
        title: data.title,
        category: categories.length > 0 ? categories[0] : 'Sin categoría',
        categories: categories,
        categoryId: categoryIds.length > 0 ? categoryIds[0] : null,
        categoryIds: categoryIds,
        price: data.price,
        oldPrice: data.old_price,
        imageColor: data.image_color,
        colorCount: data.color_count,
        colorChangeCount: data.color_change_count,
        mainImage: data.main_image,
        badge: data.badge,
        badgeColor: data.badge_color,
        tags: data.tags || [],
        size: data.size,
        stitches: data.stitches,
        formats: data.formats,
        rating: data.rating,
        reviews: data.reviews,
        description: data.description,
        published: data.published,
        indexed: data.indexed,
        relatedProductIds: data.related_product_ids || [],
        threadColors: data.thread_colors || []
    };
}

export async function fetchProductsByIds(ids) {
    if (!ids || ids.length === 0) return [];

    const { data, error } = await supabase
        .from('products')
        .select('*, product_categories(category_id, categories(name))')
        .in('id', ids)
        .eq('published', true)
        .eq('archived', false);

    if (error) {
        console.error('Error fetching products by ids:', error);
        return [];
    }

    return data.map(p => {
        const categories = p.product_categories ? p.product_categories.map(pc => pc.categories?.name).filter(Boolean) : [];
        const categoryIds = p.product_categories ? p.product_categories.map(pc => pc.category_id) : [];

        return {
            id: p.id,
            title: p.title,
            category: categories.length > 0 ? categories[0] : 'Sin categoría',
            categories: categories,
            categoryId: categoryIds.length > 0 ? categoryIds[0] : null,
            categoryIds: categoryIds,
            price: p.price,
            oldPrice: p.old_price,
            imageColor: p.image_color,
            colorCount: p.color_count,
            colorChangeCount: p.color_change_count,
            badge: p.badge,
            badgeColor: p.badge_color,
            tags: p.tags || [],
            size: p.size,
            stitches: p.stitches,
            formats: p.formats,
            rating: p.rating,
            reviews: p.reviews,
            description: p.description,
            mainImage: p.main_image,
            published: p.published,
            archived: p.archived,
            indexed: p.indexed,
            threadColors: p.thread_colors || []
        };
    });
}

export async function fetchProductsListAdmin() {
    const { data, error } = await supabase
        .from('products')
        .select('id, title, main_image, image_color, tags')
        .order('title', { ascending: true });

    if (error) {
        console.error('Error fetching admin product list:', error);
        return [];
    }
    return data;
}

// --- Auth ---

export async function signUp(email, password, fullName) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName
            }
        }
    })
    return { data, error }
}

export async function checkNameExists(name) {
    const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .ilike('full_name', name) // Case-insensitive check
        .maybeSingle(); // Returns null if not found, instead of error

    if (error) {
        console.error('Error checking name:', error);
        return false; // Fail safe
    }
    return !!data;
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

export async function resetPassword(email) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password.html`
    })
    return { data, error }
}

export async function updatePassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({
        password: newPassword
    })
    return { data, error }
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

export async function updateProfile(userId, updates) {
    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()
    return { data, error }
}

export async function anonymizeUser(userId) {
    // 1. Security Check: Ensure the user is modifying their own account
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
        console.error('Security Alert: Attempt to delete another user account blocked.');
        return { error: { message: 'Unauthorized: You can only delete your own account.' } };
    }

    // 2. Check Role: Admins cannot delete their account
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

    if (profile && profile.role === 'admin') {
        console.error('Security Alert: Admin attempted to delete account.');
        return { error: { message: 'Unauthorized: Admins cannot delete their account.' } };
    }

    // Generate a unique dummy email to satisfy unique constraints and remove PII
    const timestamp = Date.now();
    const dummyEmail = `deleted_${timestamp}_${userId.substring(0, 8)}@minifrancine.com`;

    const updates = {
        full_name: 'Usuario Eliminado',
        // phone: null, // Removed from schema/UI, but safe to ignore if not present
        email: dummyEmail, // Store dummy email in profiles to anonymize
        updated_at: new Date()
    };

    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

    return { data, error };
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

export async function fetchFavoriteProducts(userId, specificIds = null) {
    let favIds;
    if (specificIds) {
        favIds = specificIds;
    } else {
        favIds = await fetchFavorites(userId)
    }

    if (!favIds || favIds.length === 0) return []

    const { data, error } = await supabase
        .from('products')
        .select('*, product_categories(category_id, categories(name))')
        .in('id', favIds)
        .order('title', { ascending: true })

    if (error) {
        console.error('Error fetching favorite products:', error)
        return []
    }

    return data.map(p => {
        const categories = p.product_categories ? p.product_categories.map(pc => pc.categories?.name).filter(Boolean) : [];
        const categoryIds = p.product_categories ? p.product_categories.map(pc => pc.category_id) : [];

        return {
            id: p.id,
            title: p.title,
            category: categories.length > 0 ? categories[0] : 'Sin categoría',
            categories: categories,
            categoryId: categoryIds.length > 0 ? categoryIds[0] : null,
            categoryIds: categoryIds,
            price: p.price,
            oldPrice: p.old_price,
            imageColor: p.image_color,
            colorCount: p.color_count,
            colorChangeCount: p.color_change_count,
            badge: p.badge,
            badgeColor: p.badge_color,
            size: p.size,
            stitches: p.stitches,
            formats: p.formats,
            rating: p.rating,
            reviews: p.reviews,
            description: p.description,
            mainImage: p.main_image,
            published: p.published
        };
    })
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

// --- Purchased Products ---

export async function fetchPurchasedProductIds() {
    const { data, error } = await supabase
        .rpc('get_purchased_product_ids')

    if (error) {
        console.error('Error fetching purchased products:', error)
        return []
    }
    return data || []
}

export async function fetchPurchasedProducts() {
    const purchasedIds = await fetchPurchasedProductIds()
    if (!purchasedIds || purchasedIds.length === 0) return []

    const { data, error } = await supabase
        .from('products')
        .select('*, product_categories(category_id, categories(name))')
        .in('id', purchasedIds)
        .order('id', { ascending: true })

    if (error) {
        console.error('Error fetching purchased products:', error)
        return []
    }

    return data.map(p => {
        const categories = p.product_categories ? p.product_categories.map(pc => pc.categories?.name).filter(Boolean) : [];
        const categoryIds = p.product_categories ? p.product_categories.map(pc => pc.category_id) : [];

        return {
            id: p.id,
            title: p.title,
            category: categories.length > 0 ? categories[0] : 'Sin categoría',
            categories: categories,
            categoryId: categoryIds.length > 0 ? categoryIds[0] : null,
            categoryIds: categoryIds,
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
            description: p.description,
            mainImage: p.main_image,
            published: p.published
        };
    })
}

// --- Cart ---

export async function fetchCart(userId) {
    const { data, error } = await supabase
        .from('cart_items')
        .select(`
            id,
            product_id,
            quantity,
            product:products (*, product_categories(category_id, categories(name)))
        `)
        .eq('user_id', userId)

    if (error) {
        console.error('Error fetching cart:', error)
        return []
    }

    // Transform to flat structure expected by state
    return data.map(item => {
        const p = item.product;
        const categories = p.product_categories ? p.product_categories.map(pc => pc.categories?.name).filter(Boolean) : [];
        const categoryIds = p.product_categories ? p.product_categories.map(pc => pc.category_id) : [];

        return {
            id: p.id,
            title: p.title,
            category: categories.length > 0 ? categories[0] : 'Sin categoría',
            categories: categories,
            categoryId: categoryIds.length > 0 ? categoryIds[0] : null,
            categoryIds: categoryIds,
            price: p.price,
            oldPrice: p.old_price,
            imageColor: p.image_color,
            mainImage: p.main_image,
            size: p.size,
            cart_item_id: item.id,
            quantity: item.quantity
        };
    });
}

export async function addToCartDB(userId, productId, quantity = 1) {
    const { data, error } = await supabase
        .from('cart_items')
        .upsert(
            { user_id: userId, product_id: productId, quantity },
            { onConflict: 'user_id,product_id', ignoreDuplicates: true }
        )
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

// --- Secure Payment (Edge Function) ---
export async function createOrderSecure(items, couponCode = null) {
    const user = await getUser();
    if (!user) throw new Error("User must be logged in");

    // items: [{ id: 1, quantity: 1 }, ...]
    // user_id is extracted from JWT on the server, NOT sent from client
    const { data, error } = await supabase.functions.invoke('paypal-order', {
        body: {
            action: 'create',
            items: items,
            couponCode: couponCode
        }
    });

    if (error) {
        console.error('Error creating secure order:', error);
        throw error;
    }
    return data; // { orderID, dbOrderId }
}

export async function captureOrderSecure(orderID, dbOrderId) {
    const { data, error } = await supabase.functions.invoke('paypal-order', {
        body: {
            action: 'capture',
            orderID: orderID,
            dbOrderId: dbOrderId
        }
    });

    if (error) {
        console.error('Error capturing secure order:', error);
        throw error;
    }
    return data;
}

// --- Coupons ---

export async function fetchMyCoupons() {
    const user = await getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_used', false)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching coupons:', error);
        return [];
    }
    return data;
}

export async function validateCoupon(code) {
    const user = await getUser();
    if (!user) return { data: null, error: { message: 'User not logged in' } };

    const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code)
        .eq('user_id', user.id)
        .eq('is_used', false)
        .single();

    if (error) {
        console.warn('Invalid or used coupon code:', code);
        return { data: null, error };
    }
    return { data, error: null };
}

export async function markCouponAsUsed(couponId) {
    const { error } = await supabase
        .from('coupons')
        .update({ is_used: true })
        .eq('id', couponId);

    if (error) console.error('Error marking coupon as used:', error);
    return !error;
}

// --- Send Order Confirmation Email ---
export async function sendOrderConfirmationEmail(orderId) {
    console.log('🔔 sendOrderConfirmationEmail called with orderId:', orderId);
    try {
        // Fetch order details with items
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select(`
                id,
                user_id,
                total,
                created_at,
                order_items (
                    product_id,
                    quantity,
                    price,
                    products (
                        title
                    )
                )
            `)
            .eq('id', orderId)
            .single();

        if (orderError || !order) {
            console.error('Error fetching order for email:', orderError);
            return { error: orderError };
        }

        // Fetch user email from profiles
        const { data: userData, error: userError } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('id', order.user_id)
            .single();

        if (userError || !userData) {
            console.error('Error fetching user for email:', userError);
            return { error: userError };
        }

        // Get email from auth.users
        const { data: { user } } = await supabase.auth.getUser();
        const userEmail = user?.email;

        // Format order items
        const items = order.order_items.map(item => ({
            title: item.products.title,
            price: parseFloat(item.price)
        }));

        // Format date
        const orderDate = new Date(order.created_at).toLocaleDateString('es-AR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Send email via Edge Function
        console.log('📧 Preparing to send email to:', userEmail);
        console.log('📧 Email data:', { userName: userData.full_name, itemCount: items.length, total: order.total });

        const { data, error } = await supabase.functions.invoke('send-email', {
            body: {
                type: 'order_confirmation',
                order: {
                    id: order.id,
                    userEmail: userEmail,
                    userName: userData.full_name || userEmail?.split('@')[0] || 'Cliente',
                    items: items,
                    total: parseFloat(order.total),
                    date: orderDate
                }
            }
        });

        console.log('📧 Edge Function response:', { data, error });

        if (error) {
            console.error('Error sending order confirmation email:', error);
            return { error };
        }

        console.log('Order confirmation email sent successfully:', data);
        return { data };

    } catch (error) {
        console.error('Exception sending order confirmation email:', error);
        return { error };
    }
}

export async function createOrder() {
    const { data, error } = await supabase
        .rpc('create_order_from_cart')
    return { data, error }
}

export async function getPayPalClientId() {
    const { data, error } = await supabase.functions.invoke('paypal-order', {
        body: { action: 'getClientId' }
    });

    if (error) {
        console.error('Error fetching PayPal Client ID:', error);
        return { error };
    }
    return { data };
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
            applied_coupon_code,
            discount_amount,
            order_items (
                product_id,
                quantity,
                price,
                products (
                    title,
                    main_image,
                    image_color
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
        .eq('product_id', productId);

    if (error) {
        console.error('Error fetching file info:', error);
        return [];
    }

    if (!files || files.length === 0) return [];

    // Sign all URLs
    const signedFiles = [];
    for (const f of files) {
        const { data: signedData, error: signError } = await supabase
            .storage
            .from('product-files')
            .createSignedUrl(f.storage_path, 3600); // 1 hour for bundling large sets

        if (!signError) {
            signedFiles.push({
                url: signedData.signedUrl,
                filename: f.filename
            });
        }
    }
    return signedFiles;
}

export async function fetchProductFiles(productId) {
    const { data, error } = await supabase
        .from('product_files')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching file records', error);
        return [];
    }
    return data;
}



// --- Admin ---

export async function fetchProfiles() {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name', { ascending: true });

    if (error) console.error('Error fetching profiles:', error);
    return data || [];
}

export async function fetchAllCoupons() {
    const { data, error } = await supabase
        .from('coupons')
        .select(`*`)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching all coupons:', error);
        return [];
    }
    return data;
}

export async function createCouponsBatch(baseCoupon, userIds) {
    // baseCoupon: { code, type, discount_percent, max_items }
    const rows = userIds.map(uid => ({
        ...baseCoupon,
        user_id: uid,
        is_used: false,
        created_at: new Date()
    }));

    // Split into chunks if there are many users
    const results = [];
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const chunk = rows.slice(i, i + BATCH_SIZE);
        const { data, error } = await supabase
            .from('coupons')
            .insert(chunk)
            .select();

        if (error) {
            console.error('Error in coupon batch insertion:', error);
            return { error };
        }
        results.push(...(data || []));
    }

    return { data: results, error: null };
}

export async function deleteCoupon(id) {
    const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', id);
    return { error };
}

export async function deleteCouponsBatch(ids) {
    if (!ids || ids.length === 0) return { error: null };
    const { error } = await supabase
        .from('coupons')
        .delete()
        .in('id', ids);
    return { error };
}

export async function fetchAllOrders() {
    const { data, error } = await supabase
        .rpc('get_admin_orders')

    if (error) {
        console.error('CRITICAL ERROR fetching orders:', error);
        alert('Error al cargar pedidos: ' + error.message);
        return []
    }
    return data
}

export async function fetchAdminStats(startDate, endDate) {
    // Helper to apply date filter
    const applyDates = (query) => {
        if (startDate) query = query.gte('created_at', startDate);
        if (endDate) query = query.lte('created_at', endDate + ' 23:59:59'); // Include full end day
        return query;
    };

    // Orders Count
    let orderQuery = supabase.from('orders').select('*', { count: 'exact', head: true });
    orderQuery = applyDates(orderQuery);
    const { count: orderCount } = await orderQuery;

    // Products Count
    let productQuery = supabase.from('products').select('*', { count: 'exact', head: true });
    // productQuery = applyDates(productQuery); // No filter for total count
    const { count: productCount } = await productQuery;

    // Published Count
    const { count: publishedCount } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('published', true);

    // Private Count
    const { count: privateCount } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('published', false);

    // Indexed Count
    const { count: indexedCount } = await supabase.from('products').select('*', { count: 'exact', head: true }).neq('indexed', false);

    // No-Indexed Count
    const { count: noIndexedCount } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('indexed', false);

    // Total Revenue
    let salesQuery = supabase.from('orders').select('total').eq('status', 'paid');
    salesQuery = applyDates(salesQuery);
    const { data: sales } = await salesQuery;

    let totalSales = 0;
    if (sales) {
        totalSales = sales.reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
    }

    // Paid Orders Count
    let paidQuery = supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'paid');
    paidQuery = applyDates(paidQuery);
    const { count: paidCount } = await paidQuery;

    // Pending Orders Count
    let pendingQuery = supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    pendingQuery = applyDates(pendingQuery);
    const { count: pendingCount } = await pendingQuery;

    // --- Coupons Stats ---
    // Coupon Sales (USD)
    let couponSalesQuery = supabase.from('orders').select('total').eq('status', 'paid').not('applied_coupon_code', 'is', null);
    couponSalesQuery = applyDates(couponSalesQuery);
    const { data: couponSalesData } = await couponSalesQuery;

    const couponSales = (couponSalesData || []).reduce((sum, o) => sum + parseFloat(o.total || 0), 0);

    // Total Coupons Count
    let totalCouponsQuery = supabase.from('coupons').select('*', { count: 'exact', head: true });
    // totalCouponsQuery = applyDates(totalCouponsQuery); // No filter for total count
    const { count: totalCoupons } = await totalCouponsQuery;

    // Used Coupons Count (based on orders in period)
    let usedCouponsQuery = supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'paid').not('applied_coupon_code', 'is', null);
    usedCouponsQuery = applyDates(usedCouponsQuery);
    const { count: usedCoupons } = await usedCouponsQuery;

    // Available Coupons Count (Absolute)
    let availableCouponsQuery = supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('is_used', false);
    // availableCouponsQuery = applyDates(availableCouponsQuery); // No filter for total availability
    const { count: availableCoupons } = await availableCouponsQuery;

    return {
        totalOrders: orderCount || 0,
        paidOrders: paidCount || 0,
        pendingOrders: pendingCount || 0,
        totalProducts: productCount || 0,
        publishedProducts: publishedCount || 0,
        privateProducts: privateCount || 0,
        indexedProducts: indexedCount || 0,
        noIndexedProducts: noIndexedCount || 0,
        totalSales: totalSales,
        totalCoupons: totalCoupons || 0,
        usedCoupons: usedCoupons || 0,
        availableCoupons: availableCoupons || 0,
        couponSales: couponSales || 0
    };
}


export async function createProduct(productData) {
    // Extract categoryIds from payload, don't send it to products table
    const { categoryIds, ...cleanProductData } = productData;

    // Create product
    const { data, error } = await supabase
        .from('products')
        .insert(cleanProductData)
        .select()
        .single()

    if (error || !data) return { data, error };

    // Insert into product_categories table
    if (categoryIds && categoryIds.length > 0) {
        const categoryRecords = categoryIds.map(id => ({ product_id: data.id, category_id: id }));
        const { error: catError } = await supabase
            .from('product_categories')
            .insert(categoryRecords);

        if (catError) {
            console.error("Error creating product categories", catError);
            return { data, error: catError };
        }
    }

    return { data, error }
}

export async function updateProduct(id, productData) {
    const { categoryIds, ...cleanProductData } = productData;

    const { data, error } = await supabase
        .from('products')
        .update(cleanProductData)
        .eq('id', id)
        .select()
        .single()

    if (error || !data) return { data, error };

    // Update categories if provided
    if (categoryIds !== undefined) {
        // Find existing mappings to avoid re-insertion or delete missing ones
        // Easiest is to delete all and re-insert 
        const { error: delError } = await supabase.from('product_categories').delete().eq('product_id', id);
        if (delError) {
            console.error("Error deleting product categories", delError);
            return { data, error: delError };
        }

        if (categoryIds.length > 0) {
            const categoryRecords = categoryIds.map(catId => ({ product_id: data.id, category_id: catId }));
            const { error: catError } = await supabase
                .from('product_categories')
                .insert(categoryRecords);

            if (catError) {
                console.error("Error updating product categories", catError);
                return { data, error: catError };
            }
        }
    }

    return { data, error }
}

export async function deleteProduct(id) {
    // Cascading delete should handle images/files from DB, 
    // but we might want to clean up storage too. 
    // For now, relying on DB cascade for records.
    const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)
    return { error }
}

export async function archiveProduct(id) {
    // Archive product and automatically unpublish it
    const { data, error } = await supabase
        .from('products')
        .update({
            archived: true,
            published: false
        })
        .eq('id', id)
        .select()
        .single()
    return { data, error }
}

export async function unarchiveProduct(id) {
    // Unarchive product (keep published=false for manual review)
    const { data, error } = await supabase
        .from('products')
        .update({ archived: false })
        .eq('id', id)
        .select()
        .single()
    return { data, error }
}


// Sanitize filename to prevent path traversal and special character issues
function sanitizeFileName(name) {
    // Remove path separators and special chars, keep only safe characters
    return name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.{2,}/g, '.');
}

const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_MIMES = [
    'application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed', 'application/x-7z-compressed',
    'application/octet-stream', // Generic binary (common for PES, DST, etc.)
    '' // Some embroidery files have no detected mime type
];
const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50MB

export async function uploadProductImage(file) {
    // Server-side validation
    if (!ALLOWED_IMAGE_MIMES.includes(file.type)) {
        console.error('Invalid image type:', file.type);
        return null;
    }
    if (file.size > MAX_IMAGE_BYTES) {
        console.error('Image too large:', file.size);
        return null;
    }

    const safeName = sanitizeFileName(file.name);
    const fileName = `${Date.now()}-${safeName}`;
    const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, {
            contentType: file.type,
            upsert: false
        });

    if (error) {
        console.error('Upload Error', error);
        return null;
    }

    const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

    return { publicUrl, storagePath: fileName };
}

export async function saveProductImageRecord(productId, storagePath, publicUrl) {
    const { error } = await supabase
        .from('product_images')
        .insert({
            product_id: productId,
            storage_path: storagePath,
            public_url: publicUrl
        })
    return { error }
}

export async function fetchProductImages(productId) {
    const { data, error } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: true })

    if (error) {
        console.error('Error fetching images:', error)
        return []
    }
    return data
}

export async function deleteProductImage(imageId) {
    // Get path first to delete from storage
    const { data: img, error: fetchError } = await supabase
        .from('product_images')
        .select('storage_path')
        .eq('id', imageId)
        .single()

    if (img) {
        await supabase.storage
            .from('product-images')
            .remove([img.storage_path])
    }

    const { error } = await supabase
        .from('product_images')
        .delete()
        .eq('id', imageId)
    return { error }
}

export async function uploadProductFile(file) {
    // Server-side validation
    if (!ALLOWED_FILE_MIMES.includes(file.type)) {
        console.error('Invalid file type:', file.type);
        return null;
    }
    if (file.size > MAX_FILE_BYTES) {
        console.error('File too large:', file.size);
        return null;
    }

    const safeName = sanitizeFileName(file.name);
    const fileName = `${Date.now()}-${safeName}`;
    const { data, error } = await supabase.storage
        .from('product-files')
        .upload(fileName, file, {
            contentType: file.type,
            upsert: false
        });

    if (error) {
        console.error('File Upload Error', error);
        return null;
    }
    return { storagePath: fileName, filename: file.name };
}

export async function saveProductFileRecord(productId, storagePath, filename) {
    // Upsert: One file per product for now? Or multiple? 
    // Schema allows multiple, but UI might treat as one. 
    // Let's Insert for now, UI can manage deletion of old ones.
    const { error } = await supabase
        .from('product_files')
        .insert({
            product_id: productId,
            storage_path: storagePath,
            filename: filename
        })
    return { error }
}

export async function fetchProductFile(productId) {
    const { data, error } = await supabase
        .from('product_files')
        .select('*')
        .eq('product_id', productId)
        .limit(1) // Just get one for now
        .maybeSingle()

    if (error) {
        console.error('Error fetching file record', error)
        return null
    }
    return data;
}

export async function deleteProductFile(fileRowId) {
    const { data: fileRec } = await supabase
        .from('product_files')
        .select('storage_path')
        .eq('id', fileRowId)
        .single()

    if (fileRec) {
        await supabase.storage
            .from('product-files')
            .remove([fileRec.storage_path])
    }

    const { error } = await supabase
        .from('product_files')
        .delete()
        .eq('id', fileRowId)
    return { error }
}

export async function fetchOrderById(orderId) {
    const { data, error } = await supabase
        .rpc('get_admin_order_by_id', { order_uuid: orderId })
        .single()

    if (error) {
        console.error('Error fetching order:', error)
        return null
    }
    return data
}

export async function fetchOrderItems(orderId) {
    const { data, error } = await supabase
        .from('order_items')
        .select(`
            *,
            products (
                title,
                main_image,
                image_color
            )
        `)
        .eq('order_id', orderId)

    if (error) {
        console.error('Error fetching order items:', error)
        return []
    }
    return data
}

// --- Categories ---

export async function fetchCategories() {
    // 1. Check Cache
    const CACHE_KEY = 'minifrancine_categories';
    const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
        try {
            const { data, timestamp } = JSON.parse(cached);
            const age = Date.now() - timestamp;
            if (age < CACHE_DURATION) {
                // Return cached data immediately
                return data;
            }
        } catch (e) {
            console.error('Error parsing categories cache', e);
            localStorage.removeItem(CACHE_KEY);
        }
    }

    // 2. Fetch from DB
    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true })

    if (error) {
        console.error('Error fetching categories:', error)
        return []
    }

    // 3. Save to Cache
    if (data) {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: data,
            timestamp: Date.now()
        }));
    }

    return data
}

const CACHE_KEY = 'minifrancine_categories';

export async function createCategory(categoryData) {
    const { data, error } = await supabase
        .from('categories')
        .insert(categoryData)
        .select()
        .single()

    if (!error) localStorage.removeItem(CACHE_KEY);
    return { data, error }
}

export async function updateCategory(id, categoryData) {
    const { data, error } = await supabase
        .from('categories')
        .update(categoryData)
        .eq('id', id)
        .select()
        .single()

    if (!error) localStorage.removeItem(CACHE_KEY);
    return { data, error }
}

export async function deleteCategory(id) {
    const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)

    if (!error) localStorage.removeItem(CACHE_KEY);
    return { error }
}

export async function upsertCategoryTranslations(id, names) {
    const key = `category.${id}`;
    const values = {
        key,
        es: names.es,
        en: names.en,
        pt: names.pt,
        section: 'category',
        updated_at: new Date()
    };

    const { error } = await supabase
        .from('site_translations')
        .upsert(values, { onConflict: 'key' });

    if (!error) {
        localStorage.removeItem('site_translations_cache');
    }
    return { error };
}

export async function fetchCategoryTranslations(id) {
    const key = `category.${id}`;
    const { data, error } = await supabase
        .from('site_translations')
        .select('*')
        .eq('key', key)
        .maybeSingle();

    return { data, error };
}


// --- Reviews ---

export async function fetchProductReviews(productId) {
    const { data, error } = await supabase
        .from('reviews')
        .select(`
            id,
            rating,
            comment,
            created_at,
            user_id,
            profiles (full_name)
        `)
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching reviews:', error);
        return [];
    }
    return data;
}

export async function fetchUserReview(userId, productId) {
    const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .maybeSingle();

    if (error && error.code !== 'PGRST116') { // PGRST116 is just "no rows returned" for single(), maybeSingle handles it better but just in case
        console.error('Error fetching user review:', error);
        return null;
    }
    return data;
}

export async function fetchAllUserReviews(userId) {
    const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('user_id', userId);

    if (error) {
        console.error('Error fetching all user reviews:', error);
        return [];
    }
    return data;
}


// Helper to update product stats after review change
async function _updateProductStats(productId) {
    // 1. Get average rating and count
    const { data, error } = await supabase
        .from('reviews')
        .select('rating')
        .eq('product_id', productId);

    if (error) {
        console.error('Error calculating stats:', error);
        return;
    }

    const count = data.length;
    const total = data.reduce((sum, r) => sum + r.rating, 0);
    const avg = count > 0 ? total / count : 0;

    // 2. Update product
    await supabase
        .from('products')
        .update({
            rating: avg,
            reviews: count
        })
        .eq('id', productId);
}

export async function addReview(userId, productId, rating, comment) {
    const { data, error } = await supabase
        .from('reviews')
        .insert({
            user_id: userId,
            product_id: productId,
            rating,
            comment
        })
        .select()
        .single();

    if (!error) {
        await _updateProductStats(productId);
    }

    return { data, error };
}

export async function updateReview(reviewId, rating, comment) {
    // Get productId first to update stats
    const { data: oldReview } = await supabase
        .from('reviews')
        .select('product_id')
        .eq('id', reviewId)
        .single();

    const { data, error } = await supabase
        .from('reviews')
        .update({
            rating,
            comment
        })
        .eq('id', reviewId)
        .select()
        .single();

    if (!error && oldReview) {
        await _updateProductStats(oldReview.product_id);
    }

    return { data, error };
}

export async function deleteReview(reviewId) {
    // Get productId first
    const { data: oldReview } = await supabase
        .from('reviews')
        .select('product_id')
        .eq('id', reviewId)
        .single();

    const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId);

    if (!error && oldReview) {
        await _updateProductStats(oldReview.product_id);
    }

    return { error };
}

