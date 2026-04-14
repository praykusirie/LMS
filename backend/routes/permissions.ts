import { Router } from 'express';
import type { Request, Response } from 'express';
import { pool } from '../lib/db.js';
import { requirePermission, clearPermissionCache } from '../lib/middleware.js';

const router = Router();

// Get all permissions
router.get('/', async (_req: Request, res: Response) => {
    try {
        const result = await pool.query(
            'SELECT * FROM permissions ORDER BY module, name'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching permissions:', error);
        res.status(500).json({ error: 'Failed to fetch permissions' });
    }
});

// Get permissions by role
router.get('/role/:roleId', async (req: Request, res: Response) => {
    try {
        const { roleId } = req.params;
        const result = await pool.query(
            `SELECT p.*, rp.role_id IS NOT NULL as assigned
             FROM permissions p
             LEFT JOIN role_permissions rp ON p.id = rp.permission_id AND rp.role_id = $1
             ORDER BY p.module, p.name`,
            [roleId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching role permissions:', error);
        res.status(500).json({ error: 'Failed to fetch role permissions' });
    }
});

// Assign permission to role
router.post('/assign', requirePermission('permissions', 'manage'), async (req: Request, res: Response) => {
    try {
        const { roleId, permissionId } = req.body;
        await pool.query(
            'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [roleId, permissionId]
        );
        clearPermissionCache();
        res.status(201).json({ message: 'Permission assigned successfully' });
    } catch (error) {
        console.error('Error assigning permission:', error);
        res.status(500).json({ error: 'Failed to assign permission' });
    }
});

// Remove permission from role
router.post('/revoke', requirePermission('permissions', 'manage'), async (req: Request, res: Response) => {
    try {
        const { roleId, permissionId } = req.body;
        await pool.query(
            'DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
            [roleId, permissionId]
        );
        clearPermissionCache();
        res.json({ message: 'Permission revoked successfully' });
    } catch (error) {
        console.error('Error revoking permission:', error);
        res.status(500).json({ error: 'Failed to revoke permission' });
    }
});

// Bulk update role permissions
router.put('/role/:roleId', requirePermission('permissions', 'manage'), async (req: Request, res: Response) => {
    try {
        const { roleId } = req.params;
        const { permissionIds } = req.body;
        
        // Remove all existing permissions for the role
        await pool.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);
        
        // Add new permissions
        if (permissionIds && permissionIds.length > 0) {
            const values = permissionIds.map((_: string, i: number) => `($1, $${i + 2})`).join(', ');
            await pool.query(
                `INSERT INTO role_permissions (role_id, permission_id) VALUES ${values}`,
                [roleId, ...permissionIds]
            );
        }
        
        clearPermissionCache();
        res.json({ message: 'Permissions updated successfully' });
    } catch (error) {
        console.error('Error updating permissions:', error);
        res.status(500).json({ error: 'Failed to update permissions' });
    }
});

export default router;
