import { Router } from 'express';
import type { Request, Response } from 'express';
import { pool } from '../lib/db.js';
import { requirePermission } from '../lib/middleware.js';

const router = Router();

// Get all users with gender (better-auth listUsers doesn't return custom fields)
router.get('/', async (_req: Request, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT id, name, email, role, banned, gender, level, "createdAt"
             FROM "user"
             ORDER BY "createdAt" DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Update user details (name, gender, role)
router.put('/:id', requirePermission('users', 'manage'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, gender, role, level } = req.body;

        const fields: string[] = [];
        const values: unknown[] = [];
        let idx = 1;

        if (name !== undefined) {
            fields.push(`name = $${idx++}`);
            values.push(name);
        }
        if (gender !== undefined) {
            fields.push(`gender = $${idx++}`);
            values.push(gender);
        }
        if (role !== undefined) {
            fields.push(`role = $${idx++}`);
            values.push(role);
        }
        if (level !== undefined) {
            fields.push(`level = $${idx++}`);
            values.push(level);
        }

        if (fields.length === 0) {
            res.status(400).json({ error: 'No fields to update' });
            return;
        }

        values.push(id);
        const result = await pool.query(
            `UPDATE "user" SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, name, email, role, banned, gender, level, "createdAt"`,
            values
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

export default router;
