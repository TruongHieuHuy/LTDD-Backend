-- Add Product and Category tables to database
-- Run this migration after existing tables

-- ==================== CATEGORY TABLE ====================
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(10), -- Emoji icon
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ==================== PRODUCT TABLE ====================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    image_url VARCHAR(500),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_created_at ON products(created_at DESC);
CREATE INDEX idx_categories_name ON categories(name);

-- Seed initial categories
INSERT INTO categories (name, description, icon) VALUES
    ('Accessories', 'Gaming accessories and peripherals', '🎮'),
    ('Electronics', 'Electronic devices and gadgets', '💻'),
    ('Software', 'Software licenses and tools', '💿'),
    ('Services', 'Digital services and subscriptions', '🔧'),
    ('Books', 'Educational books and resources', '📚')
ON CONFLICT (name) DO NOTHING;

-- Seed sample products
INSERT INTO products (name, description, price, category_id) 
SELECT 
    'Gaming Headset Pro',
    'High quality gaming headset with 7.1 surround sound',
    99.99,
    id 
FROM categories WHERE name = 'Accessories'
UNION ALL
SELECT 
    'Mechanical Keyboard RGB',
    'RGB mechanical keyboard with Cherry MX switches',
    129.99,
    id 
FROM categories WHERE name = 'Accessories'
UNION ALL
SELECT 
    'Gaming Mouse Wireless',
    'Wireless gaming mouse with 16000 DPI',
    79.99,
    id 
FROM categories WHERE name = 'Accessories'
UNION ALL
SELECT 
    'HD Webcam 1080p',
    'Full HD webcam for streaming',
    59.99,
    id 
FROM categories WHERE name = 'Electronics'
UNION ALL
SELECT 
    'USB-C Hub',
    'Multi-port USB-C hub with HDMI',
    39.99,
    id 
FROM categories WHERE name = 'Electronics'
UNION ALL
SELECT 
    'Game Development Course',
    'Complete game development course with Unity',
    149.99,
    id 
FROM categories WHERE name = 'Software'
UNION ALL
SELECT 
    'Premium Support Plan',
    '24/7 premium customer support',
    29.99,
    id 
FROM categories WHERE name = 'Services'
UNION ALL
SELECT 
    'Programming Fundamentals',
    'Learn programming from scratch',
    24.99,
    id 
FROM categories WHERE name = 'Books';

-- Create updated_at trigger for products
CREATE OR REPLACE FUNCTION update_product_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_timestamp
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_product_timestamp();

-- Create updated_at trigger for categories
CREATE OR REPLACE FUNCTION update_category_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_category_timestamp
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_category_timestamp();

-- Comments
COMMENT ON TABLE categories IS 'Product categories for organization';
COMMENT ON TABLE products IS 'Products available in the application';
COMMENT ON COLUMN products.category_id IS 'Optional reference to category, NULL if category deleted';
