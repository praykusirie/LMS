-- Add missing permissions for modules that exist in the system but lack DB entries

INSERT INTO permissions (name, description, module, action) VALUES
    -- Teacher Management
    ('View Teachers', 'View teacher list', 'teachers', 'view'),
    ('Create Teachers', 'Add new teachers', 'teachers', 'create'),
    ('Edit Teachers', 'Edit teacher details', 'teachers', 'edit'),
    ('Delete Teachers', 'Remove teachers', 'teachers', 'delete'),

    -- Items (additional CRUD)
    ('Create Items', 'Add new items', 'items', 'create'),
    ('Edit Items', 'Edit items', 'items', 'edit'),
    ('Delete Items', 'Delete items', 'items', 'delete'),

    -- Stock Management
    ('View Stock', 'View stock details', 'stock', 'view'),
    ('Create Stock', 'Create new stock entries', 'stock', 'create'),
    ('Edit Stock', 'Edit stock entries', 'stock', 'edit'),

    -- Class Activities
    ('View Class Activities', 'View class activities', 'class_activities', 'view'),
    ('Manage Class Activities', 'Create and manage class activities', 'class_activities', 'manage'),

    -- Results
    ('View Results', 'View student results', 'results', 'view'),
    ('Manage Results', 'Create and manage results', 'results', 'manage')
ON CONFLICT (module, action) DO NOTHING;

-- Assign all new permissions to admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Assign teacher-related and class-management permissions to librarian
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'librarian'
AND (
    p.module IN ('teachers', 'stock', 'items', 'class_activities', 'results')
)
ON CONFLICT DO NOTHING;

-- Assign class activities and results view to teacher role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'teacher'
AND (
    (p.module = 'class_activities' AND p.action IN ('view', 'manage'))
    OR (p.module = 'results' AND p.action IN ('view', 'manage'))
    OR (p.module = 'teachers' AND p.action = 'view')
)
ON CONFLICT DO NOTHING;
