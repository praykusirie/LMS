import { Router } from 'express';
import type { Request, Response } from 'express';
import { pool } from '../lib/db.js';
import { getSessionUser, getLevelFilter } from '../lib/session.js';
import { requirePermission } from '../lib/middleware.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        const { clause, params } = getLevelFilter(user, 'sl');
        const result = await pool.query(
            `SELECT sl.*, 
                    (SELECT COUNT(*) FROM books b WHERE b.shelf_location_id = sl.id)::INTEGER AS book_count
             FROM shelf_locations sl 
             WHERE 1=1 ${clause}
             ORDER BY sl.code ASC`,
            params
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching shelf locations:', error);
        res.status(500).json({ error: 'Failed to fetch shelf locations' });
    }
});

router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT sl.*, 
                    (SELECT COUNT(*) FROM books b WHERE b.shelf_location_id = sl.id)::INTEGER AS book_count
             FROM shelf_locations sl 
             WHERE sl.id = $1`,
            [id]
        );
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Shelf location not found' });
            return;
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching shelf location:', error);
        res.status(500).json({ error: 'Failed to fetch shelf location' });
    }
});

router.post('/', requirePermission('shelf_locations', 'manage'), async (req: Request, res: Response) => {
    try {
        const { code, name, section, capacity, level } = req.body;
        const user = await getSessionUser(req);
        const recordLevel = level ?? user?.level ?? null;

        const existing = await pool.query(
            'SELECT id FROM shelf_locations WHERE LOWER(code) = LOWER($1)',
            [code.trim()]
        );
        if (existing.rows.length > 0) {
            res.status(409).json({ message: `Shelf location with code "${code.trim()}" already exists` });
            return;
        }

        const result = await pool.query(
            'INSERT INTO shelf_locations (code, name, section, capacity, level) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [code, name, section || null, capacity || 100, recordLevel]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating shelf location:', error);
        res.status(500).json({ error: 'Failed to create shelf location' });
    }
});

router.put('/:id', requirePermission('shelf_locations', 'manage'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { code, name, section, capacity, is_active } = req.body;
        const result = await pool.query(
            `UPDATE shelf_locations
             SET code = $1,
                 name = $2,
                 section = $3,
                 capacity = COALESCE($4, capacity),
                 is_active = COALESCE($5, is_active),
                 updated_at = NOW()
             WHERE id = $6
             RETURNING *`,
            [code, name, section, capacity ?? null, is_active ?? null, id]
        );
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Shelf location not found' });
            return;
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating shelf location:', error);
        res.status(500).json({ error: 'Failed to update shelf location' });
    }
});

router.delete('/:id', requirePermission('shelf_locations', 'manage'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM shelf_locations WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Shelf location not found' });
            return;
        }
        res.json({ message: 'Shelf location deleted successfully' });
    } catch (error) {
        console.error('Error deleting shelf location:', error);
        res.status(500).json({ error: 'Failed to delete shelf location' });
    }
});

export default router;
