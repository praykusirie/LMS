import { Router } from 'express';
import type { Request, Response } from 'express';
import { pool } from '../lib/db.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
    try {
        const result = await pool.query(
            'SELECT * FROM classes ORDER BY name ASC'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching classes:', error);
        res.status(500).json({ error: 'Failed to fetch classes' });
    }
});

router.post('/', async (req: Request, res: Response) => {
    try {
        const { name, description } = req.body;
        const result = await pool.query(
            'INSERT INTO classes (name, description) VALUES ($1, $2) RETURNING *',
            [name, description || null]
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
        const { name, description, student_count, is_active } = req.body;
        const result = await pool.query(
            `UPDATE classes
             SET name = $1,
                 description = $2,
                 student_count = COALESCE($3, student_count),
                 is_active = COALESCE($4, is_active),
                 updated_at = NOW()
             WHERE id = $5
             RETURNING *`,
            [name, description, student_count ?? null, is_active ?? null, id]
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
