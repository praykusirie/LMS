-- Migration 014: Add missing indexes for query performance
-- All use IF NOT EXISTS to be idempotent

-- ── borrow_records ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_borrow_records_book_id ON borrow_records(book_id);
CREATE INDEX IF NOT EXISTS idx_borrow_records_student_id ON borrow_records(student_id);
CREATE INDEX IF NOT EXISTS idx_borrow_records_status ON borrow_records(status);
CREATE INDEX IF NOT EXISTS idx_borrow_records_borrow_date ON borrow_records(borrow_date DESC);
CREATE INDEX IF NOT EXISTS idx_borrow_records_due_date ON borrow_records(due_date);
CREATE INDEX IF NOT EXISTS idx_borrow_records_return_date ON borrow_records(return_date DESC);
CREATE INDEX IF NOT EXISTS idx_borrow_records_level ON borrow_records(level);

-- ── books ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_books_category_id ON books(category_id);
CREATE INDEX IF NOT EXISTS idx_books_subject_id ON books(subject_id);
CREATE INDEX IF NOT EXISTS idx_books_class_id ON books(class_id);
CREATE INDEX IF NOT EXISTS idx_books_shelf_location_id ON books(shelf_location_id);
CREATE INDEX IF NOT EXISTS idx_books_isbn ON books(isbn);
CREATE INDEX IF NOT EXISTS idx_books_is_active ON books(is_active);
CREATE INDEX IF NOT EXISTS idx_books_level ON books(level);

-- ── students ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_is_active ON students(is_active);
CREATE INDEX IF NOT EXISTS idx_students_admission_number ON students(admission_number);
CREATE INDEX IF NOT EXISTS idx_students_level ON students(level);

-- ── classes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_classes_level ON classes(level);
CREATE INDEX IF NOT EXISTS idx_classes_is_active ON classes(is_active);

-- ── categories ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_categories_level ON categories(level);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);

-- ── teachers ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_teachers_name ON teachers(name);

-- ── stock_items ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_stock_items_item_id ON stock_items(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_items_stock_id ON stock_items(stock_id);

-- ── activities ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_activities_class_id ON activities(class_id);
CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(date DESC);

-- ── activity_marks ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_activity_marks_activity_id ON activity_marks(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_marks_student_id ON activity_marks(student_id);

-- ── Missing permissions for classes module ──────────────────
INSERT INTO permissions (name, description, module, action) VALUES
    ('View Classes', 'View class list', 'classes', 'view'),
    ('Create Classes', 'Create new classes', 'classes', 'create'),
    ('Edit Classes', 'Edit class details', 'classes', 'edit'),
    ('Delete Classes', 'Delete classes', 'classes', 'delete')
ON CONFLICT (module, action) DO NOTHING;

-- Assign classes permissions to admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' AND p.module = 'classes'
ON CONFLICT DO NOTHING;
