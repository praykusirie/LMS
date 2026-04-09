import { Router } from 'express';
import type { Request, Response } from 'express';
import { pool } from '../lib/db.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT c.*, 
                    (SELECT COUNT(*) FROM books b WHERE b.category_id = c.id)::INTEGER AS book_count
             FROM categories c 
             ORDER BY c.name ASC`
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

router.post('/', async (req: Request, res: Response) => {
    try {
        const { name, description } = req.body;
        const result = await pool.query(
            'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *',
            [name, description || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ error: 'Failed to create category' });
    }
});

router.put('/:id', async (req: Request, res: Response) => {
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

router.delete('/:id', async (req: Request, res: Response) => {
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
