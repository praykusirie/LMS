-- Add additional book columns for bulk import support
ALTER TABLE books ADD COLUMN IF NOT EXISTS pages INTEGER;
ALTER TABLE books ADD COLUMN IF NOT EXISTS series VARCHAR(255);
ALTER TABLE books ADD COLUMN IF NOT EXISTS language VARCHAR(50);
ALTER TABLE books ADD COLUMN IF NOT EXISTS volume VARCHAR(50);
ALTER TABLE books ADD COLUMN IF NOT EXISTS format VARCHAR(50);

-- Mark all existing data as primary level
UPDATE books SET level = 'primary' WHERE level IS NULL;
UPDATE categories SET level = 'primary' WHERE level IS NULL;
UPDATE subjects SET level = 'primary' WHERE level IS NULL;
UPDATE shelf_locations SET level = 'primary' WHERE level IS NULL;
UPDATE classes SET level = 'primary' WHERE level IS NULL;
UPDATE items SET level = 'primary' WHERE level IS NULL;
UPDATE teachers SET level = 'primary' WHERE level IS NULL;
UPDATE students SET level = 'primary' WHERE level IS NULL;
UPDATE stocks SET level = 'primary' WHERE level IS NULL;
UPDATE borrow_records SET level = 'primary' WHERE level IS NULL;
