-- Items Master table
CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit VARCHAR(50) DEFAULT 'pcs',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stocks table
CREATE TABLE IF NOT EXISTS stocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_id VARCHAR(20) NOT NULL UNIQUE,
    created_by VARCHAR(255) NOT NULL,
    created_by_name VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stock Items table
CREATE TABLE IF NOT EXISTS stock_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 0,
    current_stock INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'available',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_status CHECK (status IN ('available', 'low', 'out_of_stock'))
);

-- Function to get next stock_id
CREATE OR REPLACE FUNCTION get_next_stock_id() RETURNS VARCHAR AS $$
DECLARE
    next_num INTEGER;
    next_id VARCHAR;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(stock_id FROM 7) AS INTEGER)), 0) + 1
    INTO next_num
    FROM stocks;
    
    next_id := 'LMSSTK' || LPAD(next_num::TEXT, 4, '0');
    RETURN next_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update stock item status based on quantity
CREATE OR REPLACE FUNCTION update_stock_item_status() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.current_stock <= 0 THEN
        NEW.status := 'out_of_stock';
    ELSIF NEW.current_stock <= 5 THEN
        NEW.status := 'low';
    ELSE
        NEW.status := 'available';
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_stock_item_status
    BEFORE INSERT OR UPDATE OF current_stock ON stock_items
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_item_status();

-- Insert some default items
INSERT INTO items (name, description, unit) VALUES
    ('Textbook - Mathematics', 'Mathematics textbooks for various grades', 'pcs'),
    ('Textbook - English', 'English language textbooks', 'pcs'),
    ('Textbook - Science', 'Science textbooks for various grades', 'pcs'),
    ('Notebook - A4', 'A4 size notebooks', 'pcs'),
    ('Notebook - A5', 'A5 size notebooks', 'pcs'),
    ('Pen - Blue', 'Blue ballpoint pens', 'pcs'),
    ('Pen - Black', 'Black ballpoint pens', 'pcs'),
    ('Pencil - HB', 'HB graphite pencils', 'pcs'),
    ('Eraser', 'Standard erasers', 'pcs'),
    ('Ruler - 30cm', '30cm plastic rulers', 'pcs'),
    ('Folder - A4', 'A4 document folders', 'pcs'),
    ('Chalk - White', 'White chalk sticks', 'box'),
    ('Chalk - Colored', 'Colored chalk sticks', 'box'),
    ('Marker - Whiteboard', 'Whiteboard markers', 'pcs'),
    ('Duster - Whiteboard', 'Whiteboard dusters', 'pcs')
ON CONFLICT DO NOTHING;
