import { Router } from 'express';
import type { Request, Response } from 'express';
import { pool } from '../lib/db.js';
import { getSessionUser, getLevelFilter } from '../lib/session.js';
import { requirePermission } from '../lib/middleware.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        const { clause, params } = getLevelFilter(user, 's');
        const result = await pool.query(
            `SELECT s.*, 
                    (SELECT COUNT(*) FROM books b WHERE b.subject_id = s.id)::INTEGER AS book_count
             FROM subjects s 
             WHERE 1=1 ${clause}
             ORDER BY s.name ASC`,
            params
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

router.post('/', requirePermission('subjects', 'manage'), async (req: Request, res: Response) => {
    try {
        const { name, code, description, level } = req.body;
        const user = await getSessionUser(req);
        const recordLevel = level ?? user?.level ?? null;

        const existing = await pool.query(
            `SELECT id
             FROM subjects
             WHERE level IS NOT DISTINCT FROM $3
               AND (
                    LOWER(name) = LOWER($1)
                    OR ($2 <> '' AND code IS NOT NULL AND LOWER(code) = LOWER($2))
               )`,
            [name.trim(), code?.trim() || '', recordLevel]
        );
        if (existing.rows.length > 0) {
            res.status(409).json({ message: `Subject with name "${name.trim()}" or code "${code?.trim()}" already exists` });
            return;
        }

        const result = await pool.query(
            'INSERT INTO subjects (name, code, description, level) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, code, description || null, recordLevel]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating subject:', error);
        res.status(500).json({ error: 'Failed to create subject' });
    }
});

router.put('/:id', requirePermission('subjects', 'manage'), async (req: Request, res: Response) => {
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

router.delete('/:id', requirePermission('subjects', 'manage'), async (req: Request, res: Response) => {
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
