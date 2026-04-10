import { Router } from 'express';
import type { Request, Response } from 'express';
import { pool } from '../lib/db.js';

const router = Router();

// Get all roles
router.get('/', async (_req: Request, res: Response) => {
    try {
        const result = await pool.query(
            'SELECT * FROM roles ORDER BY created_at DESC'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ error: 'Failed to fetch roles' });
    }
});

// Get single role
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT * FROM roles WHERE id = $1',
            [id]
        );
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Role not found' });
            return;
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching role:', error);
        res.status(500).json({ error: 'Failed to fetch role' });
    }
});

// Create role
router.post('/', async (req: Request, res: Response) => {
    try {
        const { name, description } = req.body;

        const existing = await pool.query(
            'SELECT id FROM roles WHERE LOWER(name) = LOWER($1)',
            [name.trim()]
        );
        if (existing.rows.length > 0) {
            res.status(409).json({ message: `Role "${name.trim()}" already exists` });
            return;
        }

        const result = await pool.query(
            'INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING *',
            [name, description]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating role:', error);
        res.status(500).json({ error: 'Failed to create role' });
    }
});

// Update role
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const result = await pool.query(
            'UPDATE roles SET name = $1, description = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
            [name, description, id]
        );
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Role not found' });
            return;
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating role:', error);
        res.status(500).json({ error: 'Failed to update role' });
    }
});

// Delete role
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'DELETE FROM roles WHERE id = $1 RETURNING *',
            [id]
        );
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Role not found' });
            return;
        }
        res.json({ message: 'Role deleted successfully' });
    } catch (error) {
        console.error('Error deleting role:', error);
        res.status(500).json({ error: 'Failed to delete role' });
    }
});

export default router;
