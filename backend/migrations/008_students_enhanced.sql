-- Enhanced students table with additional fields for LMS
-- Supports bulk import from Excel with columns: StudentID, FirstName, LastName, DOB, Nationality, Gender, ParentEmail, Class

-- Add new columns to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE students ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE students ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS nationality VARCHAR(50);
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_email VARCHAR(255);
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_phone VARCHAR(20);
ALTER TABLE students ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS student_id VARCHAR(20);
ALTER TABLE students ADD COLUMN IF NOT EXISTS level VARCHAR(20);

-- Drop existing constraints if they exist (for idempotency)
ALTER TABLE students DROP CONSTRAINT IF EXISTS unique_student_id;
ALTER TABLE students DROP CONSTRAINT IF EXISTS valid_student_level;

-- Add unique constraint on student_id (will be populated for new records)
ALTER TABLE students ADD CONSTRAINT unique_student_id UNIQUE (student_id);

-- Add check constraint for valid level values (NULL is allowed)
ALTER TABLE students ADD CONSTRAINT valid_student_level CHECK (level IS NULL OR level IN ('primary', 'secondary'));

-- Create index for level filtering
CREATE INDEX IF NOT EXISTS idx_students_level ON students(level);

-- Function to get next student ID in format LMSSTD00001
CREATE OR REPLACE FUNCTION get_next_student_id() RETURNS VARCHAR AS $$
DECLARE
    next_num INTEGER;
    next_id VARCHAR;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(student_id FROM 7) AS INTEGER)), 0) + 1
    INTO next_num
    FROM students
    WHERE student_id LIKE 'LMSSTD%';

    next_id := 'LMSSTD' || LPAD(next_num::TEXT, 5, '0');
    RETURN next_id;
END;
$$ LANGUAGE plpgsql;

-- Migrate existing students to use new student_id format
-- Only run if there are existing records without student_id
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM students WHERE student_id IS NULL LIMIT 1) THEN
        -- Update existing records with sequential IDs
        WITH numbered_students AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as row_num
            FROM students
            WHERE student_id IS NULL
        )
        UPDATE students s
        SET student_id = 'LMSSTD' || LPAD(ns.row_num::TEXT, 5, '0')
        FROM numbered_students ns
        WHERE s.id = ns.id;
    END IF;
END $$;

-- Update existing students: split name into first_name and last_name if null
UPDATE students 
SET first_name = CASE 
    WHEN first_name IS NULL AND name IS NOT NULL THEN 
        SPLIT_PART(name, ' ', 1)
    ELSE first_name 
END,
last_name = CASE 
    WHEN last_name IS NULL AND name IS NOT NULL THEN 
        CASE 
            WHEN POSITION(' ' IN name) > 0 THEN 
                SUBSTRING(name FROM POSITION(' ' IN name) + 1)
            ELSE NULL
        END
    ELSE last_name 
END
WHERE first_name IS NULL OR last_name IS NULL;
