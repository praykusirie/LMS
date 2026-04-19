-- Migration 015: Attendance module
-- Adds user_id link to teachers, homeroom fields on user table, attendance table, and permissions

-- ── 1. Link teachers to user accounts ───────────────────────
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_teachers_user_id ON teachers(user_id) WHERE user_id IS NOT NULL;

-- Backfill existing teachers by name matching
UPDATE teachers t
SET user_id = u.id
FROM "user" u
WHERE LOWER(t.name) = LOWER(u.name)
  AND u.role = 'teacher'
  AND t.user_id IS NULL;

-- ── 2. Add homeroom fields to user table ────────────────────
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS is_homeroom_teacher BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS homeroom_class_id UUID REFERENCES classes(id) ON DELETE SET NULL;

-- Sync existing homeroom data from teachers to user table
UPDATE "user" u
SET is_homeroom_teacher = TRUE,
    homeroom_class_id = t.homeroom_class_id
FROM teachers t
WHERE t.user_id = u.id
  AND t.is_homeroom_teacher = TRUE
  AND t.homeroom_class_id IS NOT NULL;

-- ── 3. Create attendance table ──────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    status VARCHAR(10) NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'excused')),
    recorded_by TEXT NOT NULL REFERENCES "user"(id),
    level VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(class_id, date, student_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON attendance(class_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_level ON attendance(level);

-- ── 4. Attendance permissions ───────────────────────────────
INSERT INTO permissions (name, description, module, action) VALUES
    ('View Attendance', 'View attendance records', 'attendance', 'view'),
    ('Manage Attendance', 'Record and edit attendance', 'attendance', 'manage')
ON CONFLICT (module, action) DO NOTHING;

-- Assign to admin and teacher roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name IN ('admin', 'teacher')
  AND p.module = 'attendance'
ON CONFLICT DO NOTHING;
