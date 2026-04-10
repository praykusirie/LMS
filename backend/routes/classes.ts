import { Router } from 'express';
import type { Request, Response } from 'express';
import { pool } from '../lib/db.js';
import { getSessionUser, getLevelFilter } from '../lib/session.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        const { clause, params } = getLevelFilter(user);
        const result = await pool.query(
            `SELECT * FROM classes WHERE 1=1 ${clause} ORDER BY name ASC`,
            params
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching classes:', error);
        res.status(500).json({ error: 'Failed to fetch classes' });
    }
});

router.post('/', async (req: Request, res: Response) => {
    try {
        const { name, description, level } = req.body;
        const user = await getSessionUser(req);
        const recordLevel = level ?? user?.level ?? null;

        const existing = await pool.query(
            'SELECT id FROM classes WHERE LOWER(name) = LOWER($1)',
            [name.trim()]
        );
        if (existing.rows.length > 0) {
            res.status(409).json({ message: `Class "${name.trim()}" already exists` });
            return;
        }

        const result = await pool.query(
            'INSERT INTO classes (name, description, level) VALUES ($1, $2, $3) RETURNING *',
            [name, description || null, recordLevel]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating class:', error);
        res.status(500).json({ error: 'Failed to create class' });
    }
});

router.put('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description, student_count, is_active, level } = req.body;
        const result = await pool.query(
            `UPDATE classes
             SET name = $1,
                 description = $2,
                 student_count = COALESCE($3, student_count),
                 is_active = COALESCE($4, is_active),
                 level = COALESCE($5, level),
                 updated_at = NOW()
             WHERE id = $6
             RETURNING *`,
            [name, description, student_count ?? null, is_active ?? null, level ?? null, id]
        );
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Class not found' });
            return;
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating class:', error);
        res.status(500).json({ error: 'Failed to update class' });
    }
});

router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM classes WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Class not found' });
            return;
        }
        res.json({ message: 'Class deleted successfully' });
    } catch (error) {
        console.error('Error deleting class:', error);
        res.status(500).json({ error: 'Failed to delete class' });
    }
});

export default router;
