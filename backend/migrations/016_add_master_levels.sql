-- 016_add_master_levels.sql

-- Add missing 'level' columns to all master data tables to support RBAC
ALTER TABLE categories ADD COLUMN IF NOT EXISTS level VARCHAR(20);
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS level VARCHAR(20);
ALTER TABLE classes ADD COLUMN IF NOT EXISTS level VARCHAR(20);
ALTER TABLE shelf_locations ADD COLUMN IF NOT EXISTS level VARCHAR(20);
ALTER TABLE books ADD COLUMN IF NOT EXISTS level VARCHAR(20);
ALTER TABLE items ADD COLUMN IF NOT EXISTS level VARCHAR(20);
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS level VARCHAR(20);
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS level VARCHAR(20);
ALTER TABLE borrow_records ADD COLUMN IF NOT EXISTS level VARCHAR(20);

-- Default all existing records to 'primary' to prevent null reference errors on fetches
UPDATE categories SET level = 'primary' WHERE level IS NULL;
UPDATE subjects SET level = 'primary' WHERE level IS NULL;
UPDATE classes SET level = 'primary' WHERE level IS NULL;
UPDATE shelf_locations SET level = 'primary' WHERE level IS NULL;
UPDATE books SET level = 'primary' WHERE level IS NULL;
UPDATE items SET level = 'primary' WHERE level IS NULL;
UPDATE stocks SET level = 'primary' WHERE level IS NULL;
UPDATE teachers SET level = 'primary' WHERE level IS NULL;
UPDATE borrow_records SET level = 'primary' WHERE level IS NULL;

-- Optional: Create indexes for performance on the 'level' column
CREATE INDEX IF NOT EXISTS idx_categories_level_new ON categories(level);
CREATE INDEX IF NOT EXISTS idx_subjects_level_new ON subjects(level);
CREATE INDEX IF NOT EXISTS idx_classes_level_new ON classes(level);
CREATE INDEX IF NOT EXISTS idx_books_level_new ON books(level);
