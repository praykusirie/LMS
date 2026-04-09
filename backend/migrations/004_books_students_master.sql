-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subjects table
CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shelf Locations table
CREATE TABLE IF NOT EXISTS shelf_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    section VARCHAR(50),
    capacity INTEGER NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Books table
CREATE TABLE IF NOT EXISTS books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id VARCHAR(20) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255),
    isbn VARCHAR(20),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    shelf_location_id UUID REFERENCES shelf_locations(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    available INTEGER NOT NULL DEFAULT 1,
    cover_image TEXT,
    description TEXT,
    published_year INTEGER,
    publisher VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_number VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    gender VARCHAR(10) NOT NULL DEFAULT 'male',
    email VARCHAR(255),
    phone VARCHAR(20),
    avatar TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_gender CHECK (gender IN ('male', 'female', 'other'))
);

-- Borrow Records table
CREATE TABLE IF NOT EXISTS borrow_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    borrowed_by VARCHAR(255) NOT NULL,
    borrow_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    return_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'borrowed',
    fine_amount DECIMAL(10, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_borrow_status CHECK (status IN ('borrowed', 'returned', 'overdue', 'lost'))
);

-- Function to get next book_id
CREATE OR REPLACE FUNCTION get_next_book_id() RETURNS VARCHAR AS $$
DECLARE
    next_num INTEGER;
    next_id VARCHAR;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(book_id FROM 7) AS INTEGER)), 0) + 1
    INTO next_num
    FROM books;
    
    next_id := 'LMSBOK' || LPAD(next_num::TEXT, 5, '0');
    RETURN next_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get next admission_number
CREATE OR REPLACE FUNCTION get_next_admission_number() RETURNS VARCHAR AS $$
DECLARE
    next_num INTEGER;
    next_id VARCHAR;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(admission_number FROM 4) AS INTEGER)), 0) + 1
    INTO next_num
    FROM students;
    
    next_id := 'ADM' || LPAD(next_num::TEXT, 7, '0');
    RETURN next_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update book availability on borrow
CREATE OR REPLACE FUNCTION update_book_availability() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE books SET available = available - 1, updated_at = NOW() WHERE id = NEW.book_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'borrowed' AND NEW.status = 'returned' THEN
        UPDATE books SET available = available + 1, updated_at = NOW() WHERE id = NEW.book_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_book_availability
    AFTER INSERT OR UPDATE ON borrow_records
    FOR EACH ROW
    EXECUTE FUNCTION update_book_availability();

-- Insert default categories
INSERT INTO categories (name, description) VALUES
    ('Fiction', 'Novels and fictional stories'),
    ('Non-Fiction', 'Factual and informational books'),
    ('Textbook', 'Educational textbooks'),
    ('Reference', 'Dictionaries, encyclopedias, etc.'),
    ('Biography', 'Life stories and memoirs'),
    ('Science', 'Scientific literature'),
    ('History', 'Historical literature'),
    ('Literature', 'Classic and modern literature')
ON CONFLICT (name) DO NOTHING;

-- Insert default subjects
INSERT INTO subjects (name, code, description) VALUES
    ('Mathematics', 'MATH', 'Mathematical studies'),
    ('English', 'ENG', 'English language and literature'),
    ('Science', 'SCI', 'General science studies'),
    ('History', 'HIST', 'Historical studies'),
    ('Geography', 'GEO', 'Geographical studies'),
    ('Physics', 'PHY', 'Physics studies'),
    ('Chemistry', 'CHEM', 'Chemistry studies'),
    ('Biology', 'BIO', 'Biology studies'),
    ('Computer Science', 'CS', 'Computer science and IT'),
    ('Art', 'ART', 'Art and creative studies')
ON CONFLICT (code) DO NOTHING;

-- Insert default shelf locations
INSERT INTO shelf_locations (code, name, section, capacity) VALUES
    ('A-01', 'Fiction Section A', 'A', 200),
    ('A-02', 'Fiction Section B', 'A', 200),
    ('B-01', 'Science Section', 'B', 250),
    ('B-02', 'Mathematics Section', 'B', 200),
    ('C-01', 'Reference Section', 'C', 150),
    ('D-01', 'Textbooks Section', 'D', 300),
    ('E-01', 'Literature Section', 'E', 180)
ON CONFLICT (code) DO NOTHING;

-- Add permissions for new modules
INSERT INTO permissions (name, description, module, action) VALUES
    ('View Categories', 'View categories list', 'categories', 'view'),
    ('Manage Categories', 'Create, edit, delete categories', 'categories', 'manage'),
    ('View Subjects', 'View subjects list', 'subjects', 'view'),
    ('Manage Subjects', 'Create, edit, delete subjects', 'subjects', 'manage'),
    ('View Shelf Locations', 'View shelf locations list', 'shelf_locations', 'view'),
    ('Manage Shelf Locations', 'Create, edit, delete shelf locations', 'shelf_locations', 'manage')
ON CONFLICT (module, action) DO NOTHING;

-- Assign new permissions to admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.module IN ('categories', 'subjects', 'shelf_locations')
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Assign new permissions to librarian
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.module IN ('categories', 'subjects', 'shelf_locations')
WHERE r.name = 'librarian'
ON CONFLICT DO NOTHING;
