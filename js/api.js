
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://dxqsdzktytehycpnrbtn.supabase.co'
const supabaseKey = 'sb_publishable_crjG8THHPXfnLrtQityLWg_7pLdQPhG'
export const supabase = createClient(supabaseUrl, supabaseKey)

export async function fetchProducts({ publishedOnly = false, tag = null } = {}) {
    let query = supabase
        .from('products')
        .select('*, categories(name)')
        .order('id', { ascending: true })

    if (publishedOnly) {
        query = query.eq('published', true)
    }

    if (tag) {
        query = query.contains('tags', [tag])
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching products:', error)
        return []
    }

    // Transform logic to match frontend expectations if necessary (camelCase vs snake_case)
    return data.map(p => ({
        id: p.id,
        title: p.title,
        category: p.categories?.name || 'Sin categoría',
        categoryId: p.category_id,
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
        published: p.published
    }));
}

export async function fetchProductById(id) {
    const { data, error } = await supabase
        .from('products')
        .select('*, categories(name)')
        .eq('id', id)
        .single()

    if (error) {
        console.error('Error fetching product:', id, error)
        return null
    }

    return {
        id: data.id,
        title: data.title,
        category: data.categories?.name || 'Sin categoría',
        categoryId: data.category_id,
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
        published: data.published
    };
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
        .select('*, categories(name)')
        .in('id', favIds)
        .order('title', { ascending: true })

    if (error) {
        console.error('Error fetching favorite products:', error)
        return []
    }

    return data.map(p => ({
        id: p.id,
        title: p.title,
        category: p.categories?.name || 'Sin categoría',
        categoryId: p.category_id,
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
    }))
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
        .select('*, categories(name)')
        .in('id', purchasedIds)
        .order('id', { ascending: true })

    if (error) {
        console.error('Error fetching purchased products:', error)
        return []
    }

    return data.map(p => ({
        id: p.id,
        title: p.title,
        category: p.categories?.name || 'Sin categoría',
        categoryId: p.category_id,
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
    }))
}

// --- Cart ---

export async function fetchCart(userId) {
    const { data, error } = await supabase
        .from('cart_items')
        .select(`
            id,
            product_id,
            quantity,
            product:products (*, categories(name))
        `)
        .eq('user_id', userId)

    if (error) {
        console.error('Error fetching cart:', error)
        return []
    }

    // Transform to flat structure expected by state
    return data.map(item => ({
        ...item.product,
        category: item.product.categories?.name || 'Sin categoría',
        cart_item_id: item.id,
        quantity: item.quantity
    }))
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
export async function createOrderSecure(items) {
    const user = await getUser();
    if (!user) throw new Error("User must be logged in");

    // items: [{ id: 1, quantity: 1 }, ...]
    // user_id is extracted from JWT on the server, NOT sent from client
    const { data, error } = await supabase.functions.invoke('paypal-order', {
        body: {
            action: 'create',
            items: items
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

    // Products Count (Usually not filtered by date in this context, but let's keep it total)
    // Actually, dashboard usually shows current total products. 
    // Let's NOT filter products by date unless asked (usually inventory doesn't depend on sales date range).
    const { count: productCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })

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

    return {
        totalOrders: orderCount || 0,
        paidOrders: paidCount || 0,
        pendingOrders: pendingCount || 0,
        totalProducts: productCount || 0,
        totalSales: totalSales
    }
}


export async function createProduct(productData) {
    const { data, error } = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single()
    return { data, error }
}

export async function updateProduct(id, productData) {
    const { data, error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', id)
        .select()
        .single()
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

// Sanitize filename to prevent path traversal and special character issues
function sanitizeFileName(name) {
    // Remove path separators and special chars, keep only safe characters
    return name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.{2,}/g, '.');
}

const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_MIMES = ['application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed', 'application/x-7z-compressed'];
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

