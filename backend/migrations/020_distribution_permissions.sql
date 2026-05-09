-- 020_distribution_permissions.sql
-- Add dedicated permissions for the Items Distribution module.

INSERT INTO permissions (name, description, module, action) VALUES
    ('View Distributions',   'View item distribution records and CSV export', 'distribution', 'view'),
    ('Create Distributions', 'Issue items to teachers',                       'distribution', 'create')
ON CONFLICT (module, action) DO NOTHING;

-- Grant both new permissions to the admin role.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
  AND p.module = 'distribution'
ON CONFLICT DO NOTHING;
