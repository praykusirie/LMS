-- Add level column to user table (better-auth users)
-- Values: 'primary', 'secondary', or NULL (visible to all / admin)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS level VARCHAR(20);

-- Add level column to all master/data tables
ALTER TABLE categories ADD COLUMN IF NOT EXISTS level VARCHAR(20);
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS level VARCHAR(20);
ALTER TABLE shelf_locations ADD COLUMN IF NOT EXISTS level VARCHAR(20);
ALTER TABLE classes ADD COLUMN IF NOT EXISTS level VARCHAR(20);
ALTER TABLE items ADD COLUMN IF NOT EXISTS level VARCHAR(20);
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS level VARCHAR(20);
ALTER TABLE students ADD COLUMN IF NOT EXISTS level VARCHAR(20);
ALTER TABLE books ADD COLUMN IF NOT EXISTS level VARCHAR(20);
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS level VARCHAR(20);
ALTER TABLE borrow_records ADD COLUMN IF NOT EXISTS level VARCHAR(20);

-- Add check constraint for valid level values
-- (NULL is allowed for shared/legacy data)
ALTER TABLE "user" ADD CONSTRAINT valid_user_level CHECK (level IS NULL OR level IN ('primary', 'secondary'));
ALTER TABLE categories ADD CONSTRAINT valid_category_level CHECK (level IS NULL OR level IN ('primary', 'secondary'));
ALTER TABLE subjects ADD CONSTRAINT valid_subject_level CHECK (level IS NULL OR level IN ('primary', 'secondary'));
ALTER TABLE shelf_locations ADD CONSTRAINT valid_shelf_level CHECK (level IS NULL OR level IN ('primary', 'secondary'));
ALTER TABLE classes ADD CONSTRAINT valid_class_level CHECK (level IS NULL OR level IN ('primary', 'secondary'));
ALTER TABLE items ADD CONSTRAINT valid_item_level CHECK (level IS NULL OR level IN ('primary', 'secondary'));
ALTER TABLE teachers ADD CONSTRAINT valid_teacher_level CHECK (level IS NULL OR level IN ('primary', 'secondary'));
ALTER TABLE students ADD CONSTRAINT valid_student_level CHECK (level IS NULL OR level IN ('primary', 'secondary'));
ALTER TABLE books ADD CONSTRAINT valid_book_level CHECK (level IS NULL OR level IN ('primary', 'secondary'));
ALTER TABLE stocks ADD CONSTRAINT valid_stock_level CHECK (level IS NULL OR level IN ('primary', 'secondary'));
ALTER TABLE borrow_records ADD CONSTRAINT valid_borrow_level CHECK (level IS NULL OR level IN ('primary', 'secondary'));

-- Create indexes for level filtering performance
CREATE INDEX IF NOT EXISTS idx_categories_level ON categories(level);
CREATE INDEX IF NOT EXISTS idx_subjects_level ON subjects(level);
CREATE INDEX IF NOT EXISTS idx_shelf_locations_level ON shelf_locations(level);
CREATE INDEX IF NOT EXISTS idx_classes_level ON classes(level);
CREATE INDEX IF NOT EXISTS idx_items_level ON items(level);
CREATE INDEX IF NOT EXISTS idx_teachers_level ON teachers(level);
CREATE INDEX IF NOT EXISTS idx_students_level ON students(level);
CREATE INDEX IF NOT EXISTS idx_books_level ON books(level);
CREATE INDEX IF NOT EXISTS idx_stocks_level ON stocks(level);
CREATE INDEX IF NOT EXISTS idx_borrow_records_level ON borrow_records(level);
