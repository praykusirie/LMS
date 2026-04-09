import { Router } from 'express';
import type { Request, Response } from 'express';
import { pool } from '../lib/db.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT s.*, 
                    (SELECT COUNT(*) FROM books b WHERE b.subject_id = s.id)::INTEGER AS book_count
             FROM subjects s 
             ORDER BY s.name ASC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching subjects:', error);
        res.status(500).json({ error: 'Failed to fetch subjects' });
    }
});

router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT s.*, 
                    (SELECT COUNT(*) FROM books b WHERE b.subject_id = s.id)::INTEGER AS book_count
             FROM subjects s 
             WHERE s.id = $1`,
            [id]
        );
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Subject not found' });
            return;
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching subject:', error);
        res.status(500).json({ error: 'Failed to fetch subject' });
    }
});

router.post('/', async (req: Request, res: Response) => {
    try {
        const { name, code, description } = req.body;
        const result = await pool.query(
            'INSERT INTO subjects (name, code, description) VALUES ($1, $2, $3) RETURNING *',
            [name, code, description || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating subject:', error);
        res.status(500).json({ error: 'Failed to create subject' });
    }
});

router.put('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, code, description, is_active } = req.body;
        const result = await pool.query(
            `UPDATE subjects
             SET name = $1,
                 code = $2,
                 description = $3,
                 is_active = COALESCE($4, is_active),
                 updated_at = NOW()
             WHERE id = $5
             RETURNING *`,
            [name, code, description, is_active ?? null, id]
        );
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Subject not found' });
            return;
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating subject:', error);
        res.status(500).json({ error: 'Failed to update subject' });
    }
});

router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM subjects WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Subject not found' });
            return;
        }
        res.json({ message: 'Subject deleted successfully' });
    } catch (error) {
        console.error('Error deleting subject:', error);
        res.status(500).json({ error: 'Failed to delete subject' });
    }
});

export default router;
