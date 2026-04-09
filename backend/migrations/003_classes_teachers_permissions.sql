CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    student_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    is_homeroom_teacher BOOLEAN NOT NULL DEFAULT FALSE,
    homeroom_class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION get_next_teacher_id() RETURNS VARCHAR AS $$
DECLARE
    next_num INTEGER;
    next_id VARCHAR;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(teacher_id FROM 7) AS INTEGER)), 0) + 1
    INTO next_num
    FROM teachers;

    next_id := 'LMSTCH' || LPAD(next_num::TEXT, 5, '0');
    RETURN next_id;
END;
$$ LANGUAGE plpgsql;

INSERT INTO classes (name, description) VALUES
    ('Junior', 'Junior class'),
    ('Senior A', 'Senior class section A'),
    ('Senior B', 'Senior class section B'),
    ('Nursery', 'Nursery class'),
    ('Year 1 A', 'Year 1 section A'),
    ('Year 1 B', 'Year 1 section B'),
    ('Year 2 A', 'Year 2 section A'),
    ('Year 2 B', 'Year 2 section B'),
    ('Year 2 C', 'Year 2 section C'),
    ('Year 3 A', 'Year 3 section A'),
    ('Year 3 B', 'Year 3 section B'),
    ('Year 4 A', 'Year 4 section A'),
    ('Year 4 B', 'Year 4 section B'),
    ('Year 5 A', 'Year 5 section A'),
    ('Year 5 B', 'Year 5 section B'),
    ('Year 6 A', 'Year 6 section A'),
    ('Year 6 B', 'Year 6 section B'),
    ('Year 7 A', 'Year 7 section A'),
    ('Year 7 B', 'Year 7 section B'),
    ('Year 8 A', 'Year 8 section A'),
    ('Year 8 B', 'Year 8 section B'),
    ('Year 9 A', 'Year 9 section A'),
    ('Year 9 B', 'Year 9 section B')
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (name, description, module, action) VALUES
    ('View Items', 'View items master list', 'items', 'view'),
    ('Create Items', 'Create items', 'items', 'create'),
    ('Edit Items', 'Edit items', 'items', 'edit'),
    ('Delete Items', 'Delete items', 'items', 'delete'),
    ('View Teachers', 'View teachers list', 'teachers', 'view'),
    ('Create Teachers', 'Create teachers', 'teachers', 'create'),
    ('Edit Teachers', 'Edit teachers', 'teachers', 'edit'),
    ('Delete Teachers', 'Delete teachers', 'teachers', 'delete'),
    ('View Stock', 'View stock and stock reports', 'stock', 'view'),
    ('Manage Stock', 'Create and update stock entries', 'stock', 'manage')
ON CONFLICT (module, action) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.module IN ('items', 'teachers', 'stock')
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (
    (p.module = 'items' AND p.action IN ('view', 'create', 'edit', 'delete'))
    OR (p.module = 'stock' AND p.action IN ('view', 'manage'))
    OR (p.module = 'teachers' AND p.action = 'view')
)
WHERE r.name = 'librarian'
ON CONFLICT DO NOTHING;
