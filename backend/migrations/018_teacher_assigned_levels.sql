-- Add teacher-specific multi-level assignment.

ALTER TABLE teachers ADD COLUMN IF NOT EXISTS assigned_levels TEXT[];

UPDATE teachers t
SET assigned_levels = ARRAY[COALESCE(t.level, u.level, 'primary')]::TEXT[]
FROM "user" u
WHERE u.id = t.user_id
  AND (t.assigned_levels IS NULL OR cardinality(t.assigned_levels) = 0);

UPDATE teachers
SET assigned_levels = ARRAY[COALESCE(level, 'primary')]::TEXT[]
WHERE assigned_levels IS NULL OR cardinality(assigned_levels) = 0;

ALTER TABLE teachers ALTER COLUMN assigned_levels SET DEFAULT ARRAY['primary']::TEXT[];

ALTER TABLE teachers DROP CONSTRAINT IF EXISTS valid_teacher_assigned_levels;

ALTER TABLE teachers
ADD CONSTRAINT valid_teacher_assigned_levels CHECK (
    assigned_levels IS NOT NULL
    AND cardinality(assigned_levels) BETWEEN 1 AND 2
    AND assigned_levels <@ ARRAY['primary', 'secondary']::TEXT[]
);

CREATE INDEX IF NOT EXISTS idx_teachers_assigned_levels ON teachers USING GIN (assigned_levels);