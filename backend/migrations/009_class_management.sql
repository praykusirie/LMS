-- Class Management Module Migration
-- Activities and Results tracking for teachers

-- Add short_code column to classes table for activity ID generation
ALTER TABLE classes ADD COLUMN IF NOT EXISTS short_code VARCHAR(10);

-- Drop existing constraint if present (for idempotency)
ALTER TABLE classes DROP CONSTRAINT IF EXISTS unique_class_short_code;

-- Update existing classes with short codes based on name
-- Format: First letter of each word + numbers, handle duplicates
DO $$
DECLARE
    class_record RECORD;
    base_code VARCHAR(10);
    new_code VARCHAR(10);
    counter INTEGER;
    code_exists BOOLEAN;
BEGIN
    FOR class_record IN SELECT id, name FROM classes WHERE short_code IS NULL ORDER BY name LOOP
        -- Generate base short code from first letters of each word
        base_code := UPPER(REGEXP_REPLACE(
            COALESCE(
                (SELECT STRING_AGG(LEFT(word, 1), '') 
                 FROM regexp_split_to_table(class_record.name, '\s+') AS word 
                 WHERE word ~ '^[A-Za-z]'),
                LEFT(class_record.name, 3)
            ),
            '[^A-Za-z0-9]', '', 'g'
        ));
        
        -- Ensure at least 2 characters
        IF LENGTH(base_code) < 2 THEN
            base_code := base_code || LPAD(class_record.id::text, 2, '0');
        END IF;
        
        -- Truncate to 8 chars to leave room for suffix
        base_code := LEFT(base_code, 8);
        
        -- Check for duplicates and append number if needed
        new_code := base_code;
        counter := 1;
        
        LOOP
            -- Check if this code already exists
            SELECT EXISTS(
                SELECT 1 FROM classes 
                WHERE short_code = new_code AND id != class_record.id
            ) INTO code_exists;
            
            EXIT WHEN NOT code_exists;
            
            -- Try next number
            new_code := base_code || counter::text;
            counter := counter + 1;
            
            -- Safety check
            IF counter > 99 THEN
                new_code := LEFT(base_code, 6) || LPAD(class_record.id::text, 3, '0');
                EXIT;
            END IF;
        END LOOP;
        
        -- Update the class
        UPDATE classes SET short_code = new_code WHERE id = class_record.id;
    END LOOP;
END $$;

-- Make short_code unique for activity ID generation
ALTER TABLE classes ADD CONSTRAINT unique_class_short_code UNIQUE (short_code);

-- Activities table
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    total_marks INTEGER NOT NULL CHECK (total_marks > 0),
    level VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity marks table (student scores)
CREATE TABLE IF NOT EXISTS activity_marks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    marks_obtained INTEGER NOT NULL CHECK (marks_obtained >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(activity_id, student_id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_activities_class_id ON activities(class_id);
CREATE INDEX IF NOT EXISTS idx_activities_teacher_id ON activities(teacher_id);
CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(date);
CREATE INDEX IF NOT EXISTS idx_activity_marks_activity_id ON activity_marks(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_marks_student_id ON activity_marks(student_id);

-- Function to generate next activity ID
CREATE OR REPLACE FUNCTION get_next_activity_id(p_short_code VARCHAR) RETURNS VARCHAR AS $$
DECLARE
    next_num INTEGER;
    next_id VARCHAR;
    prefix VARCHAR;
BEGIN
    prefix := 'LMSACT-' || p_short_code || '-';
    
    -- Find the max number for this class prefix
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(activity_id FROM LENGTH(prefix) + 1) AS INTEGER)
    ), 0) + 1
    INTO next_num
    FROM activities
    WHERE activity_id LIKE prefix || '%';
    
    next_id := prefix || LPAD(next_num::TEXT, 6, '0');
    RETURN next_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_activities_updated_at
    BEFORE UPDATE ON activities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_activity_marks_updated_at
    BEFORE UPDATE ON activity_marks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add permissions for Class Management module
INSERT INTO permissions (name, description, module, action) VALUES
    ('View Class Activities', 'View class activities list', 'class_activities', 'view'),
    ('Manage Class Activities', 'Create, edit, delete class activities', 'class_activities', 'manage'),
    ('View Results', 'View student results', 'results', 'view'),
    ('Manage Results', 'Export and manage results', 'results', 'manage')
ON CONFLICT (module, action) DO NOTHING;

-- Assign permissions to admin and teacher roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.module IN ('class_activities', 'results')
WHERE r.name IN ('admin', 'teacher')
ON CONFLICT DO NOTHING;
