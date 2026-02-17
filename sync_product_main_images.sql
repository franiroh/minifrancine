-- Sync main_image field with the first image from product_images table
-- This fixes products that have old/incorrect main_image URLs

UPDATE products
SET main_image = (
    SELECT public_url
    FROM product_images
    WHERE product_images.product_id = products.id
    ORDER BY created_at ASC
    LIMIT 1
)
WHERE id IN (
    SELECT DISTINCT product_id
    FROM product_images
);

-- Verify the update
SELECT 
    p.id,
    p.title,
    p.main_image as current_main_image,
    pi.public_url as first_gallery_image
FROM products p
LEFT JOIN LATERAL (
    SELECT public_url
    FROM product_images
    WHERE product_id = p.id
    ORDER BY created_at ASC
    LIMIT 1
) pi ON true
WHERE p.id IN (SELECT DISTINCT product_id FROM product_images);
