import { Router } from 'express';
import type { Request, Response } from 'express';
import { pool } from '../lib/db.js';
import { getSessionUser, getLevelFilter } from '../lib/session.js';
import { requirePermission } from '../lib/middleware.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        const { clause, params } = getLevelFilter(user, 'c');
        const result = await pool.query(
            `SELECT c.*, 
                    (SELECT COUNT(*) FROM books b WHERE b.category_id = c.id)::INTEGER AS book_count
             FROM categories c 
             WHERE 1=1 ${clause}
             ORDER BY c.name ASC`,
            params
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT c.*, 
                    (SELECT COUNT(*) FROM books b WHERE b.category_id = c.id)::INTEGER AS book_count
             FROM categories c 
             WHERE c.id = $1`,
            [id]
        );
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Category not found' });
            return;
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching category:', error);
        res.status(500).json({ error: 'Failed to fetch category' });
    }
});

router.post('/', requirePermission('categories', 'manage'), async (req: Request, res: Response) => {
    try {
        const { name, description, level } = req.body;
        const user = await getSessionUser(req);
        const recordLevel = level ?? user?.level ?? null;

        const existing = await pool.query(
            'SELECT id FROM categories WHERE LOWER(name) = LOWER($1)',
            [name.trim()]
        );
        if (existing.rows.length > 0) {
            res.status(409).json({ message: `Category "${name.trim()}" already exists` });
            return;
        }

        const result = await pool.query(
            'INSERT INTO categories (name, description, level) VALUES ($1, $2, $3) RETURNING *',
            [name, description || null, recordLevel]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ error: 'Failed to create category' });
    }
});

router.put('/:id', requirePermission('categories', 'manage'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description, is_active } = req.body;
        const result = await pool.query(
            `UPDATE categories
             SET name = $1,
                 description = $2,
                 is_active = COALESCE($3, is_active),
                 updated_at = NOW()
             WHERE id = $4
             RETURNING *`,
            [name, description, is_active ?? null, id]
        );
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Category not found' });
            return;
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ error: 'Failed to update category' });
    }
});

router.delete('/:id', requirePermission('categories', 'manage'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Category not found' });
            return;
        }
        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ error: 'Failed to delete category' });
    }
});

export default router;
