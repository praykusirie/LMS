-- 019_granular_permissions.sql
-- Add granular per-action permissions for every module used across the application.
-- No auto-assignment to non-admin roles — admins can toggle per role via the Permissions page.

INSERT INTO permissions (name, description, module, action) VALUES
    -- Teachers
    ('View Teachers',           'View teacher list and profiles',            'teachers',        'view'),
    ('Create Teachers',         'Add new teachers',                          'teachers',        'create'),
    ('Edit Teachers',           'Edit teacher details',                      'teachers',        'edit'),
    ('Delete Teachers',         'Remove teachers',                           'teachers',        'delete'),

    -- Class Activities
    ('View Class Activities',   'View class activities and results',         'class_activities','view'),
    ('Create Class Activities', 'Create new class activities',               'class_activities','create'),
    ('Manage Class Activities',  'Edit activities and record/save marks',    'class_activities','manage'),

    -- Attendance
    ('View Attendance',         'View attendance records',                   'attendance',      'view'),
    ('Manage Attendance',       'Record and update attendance',              'attendance',      'manage'),

    -- Results
    ('View Results',            'View class result reports',                 'results',         'view'),

    -- Items / Inventory
    ('View Items',              'View items inventory',                      'items',           'view'),
    ('Create Items',            'Add new inventory items',                   'items',           'create'),
    ('Edit Items',              'Edit inventory item details',               'items',           'edit'),
    ('Delete Items',            'Remove inventory items',                    'items',           'delete'),

    -- Subjects
    ('View Subjects',           'View subjects list',                        'subjects',        'view'),
    ('Manage Subjects',         'Create, edit, delete subjects',             'subjects',        'manage'),

    -- Shelf Locations
    ('View Shelf Locations',    'View shelf locations',                      'shelf_locations', 'view'),
    ('Manage Shelf Locations',  'Create, edit, delete shelf locations',      'shelf_locations', 'manage'),

    -- Categories
    ('View Categories',         'View book categories',                      'categories',      'view'),
    ('Manage Categories',       'Create, edit, delete book categories',      'categories',      'manage'),

    -- Finance
    ('View Finance',            'View finance reports and invoices',         'finance',         'view'),
    ('Create Finance Records',  'Create invoices and finance entries',       'finance',         'create'),
    ('Edit Finance Records',    'Edit existing finance records',             'finance',         'edit'),
    ('Manage Fee Structure',    'Create and edit fee structures',            'finance',         'manage_fees'),

    -- Stock
    ('View Stock',              'View library stock records',                'stock',           'view'),
    ('Create Stock',            'Add new stock entries',                     'stock',           'create'),
    ('Edit Stock',              'Edit existing stock records',               'stock',           'edit'),

    -- Library (Overdue actions)
    ('Send Overdue Reminders',  'Send reminders to students with overdue books', 'library',    'remind'),
    ('Manage Overdue Books',    'Mark returned, waive fines for overdue books',  'library',    'manage')

ON CONFLICT (module, action) DO NOTHING;

-- Grant every NEW permission to the admin role so admin retains full access.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;
