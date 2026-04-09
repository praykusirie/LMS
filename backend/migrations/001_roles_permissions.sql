-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    module VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(module, action)
);

-- Role-Permission junction table
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

-- Insert default roles
INSERT INTO roles (name, description) VALUES
    ('admin', 'Administrator with full access'),
    ('librarian', 'Library staff with book and borrow management access'),
    ('teacher', 'Teacher with limited access to reports and students'),
    ('user', 'Basic user with minimal access')
ON CONFLICT (name) DO NOTHING;

-- Insert default permissions
INSERT INTO permissions (name, description, module, action) VALUES
    -- Dashboard
    ('View Dashboard', 'Access the main dashboard', 'dashboard', 'view'),
    
    -- User Management
    ('View Users', 'View user list', 'users', 'view'),
    ('Create Users', 'Create new users', 'users', 'create'),
    ('Edit Users', 'Edit existing users', 'users', 'edit'),
    ('Delete Users', 'Delete users', 'users', 'delete'),
    
    -- Role Management
    ('View Roles', 'View role list', 'roles', 'view'),
    ('Manage Roles', 'Create, edit, delete roles', 'roles', 'manage'),
    
    -- Permission Management
    ('Manage Permissions', 'Assign permissions to roles', 'permissions', 'manage'),
    
    -- Book Management
    ('View Books', 'View book catalog', 'books', 'view'),
    ('Create Books', 'Add new books', 'books', 'create'),
    ('Edit Books', 'Edit book details', 'books', 'edit'),
    ('Delete Books', 'Remove books from catalog', 'books', 'delete'),
    
    -- Student Management
    ('View Students', 'View student list', 'students', 'view'),
    ('Create Students', 'Add new students', 'students', 'create'),
    ('Edit Students', 'Edit student details', 'students', 'edit'),
    ('Delete Students', 'Remove students', 'students', 'delete'),
    
    -- Borrow/Return
    ('Manage Borrowing', 'Process book borrowing and returns', 'borrow', 'manage'),
    ('View Borrowing History', 'View borrow/return history', 'borrow', 'view'),
    
    -- Overdue
    ('View Overdue', 'View overdue books', 'overdue', 'view'),
    ('Manage Overdue', 'Send reminders, manage fines', 'overdue', 'manage'),
    
    -- Reports
    ('View Reports', 'Access reports and analytics', 'reports', 'view'),
    ('Export Reports', 'Export report data', 'reports', 'export'),
    
    -- Settings
    ('View Settings', 'View system settings', 'settings', 'view'),
    ('Manage Settings', 'Modify system settings', 'settings', 'manage'),
    
    -- Master Data (Classes, Categories, Subjects, Shelf Locations)
    ('View Master Data', 'View classes, categories, subjects, locations', 'master', 'view'),
    ('Manage Master Data', 'Create, edit, delete master data', 'master', 'manage')
ON CONFLICT (module, action) DO NOTHING;

-- Assign all permissions to admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Assign librarian permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'librarian'
AND p.module IN ('dashboard', 'books', 'students', 'borrow', 'overdue', 'master')
ON CONFLICT DO NOTHING;

-- Assign teacher permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'teacher'
AND (
    (p.module = 'dashboard' AND p.action = 'view')
    OR (p.module = 'students' AND p.action = 'view')
    OR (p.module = 'reports' AND p.action = 'view')
    OR (p.module = 'borrow' AND p.action = 'view')
)
ON CONFLICT DO NOTHING;

-- Assign basic user permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'user'
AND p.module = 'dashboard' AND p.action = 'view'
ON CONFLICT DO NOTHING;
