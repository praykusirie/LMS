import { Router } from 'express';
import type { Request, Response } from 'express';
import { pool } from '../lib/db.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT b.*, 
                    c.name AS category_name,
                    s.name AS subject_name,
                    cl.name AS class_name,
                    sl.code AS shelf_location_code,
                    sl.name AS shelf_location_name
             FROM books b
             LEFT JOIN categories c ON c.id = b.category_id
             LEFT JOIN subjects s ON s.id = b.subject_id
             LEFT JOIN classes cl ON cl.id = b.class_id
             LEFT JOIN shelf_locations sl ON sl.id = b.shelf_location_id
             ORDER BY b.created_at DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching books:', error);
        res.status(500).json({ error: 'Failed to fetch books' });
    }
});

router.get('/next-id', async (_req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT get_next_book_id() AS next_id');
        res.json({ nextId: result.rows[0].next_id });
    } catch (error) {
        console.error('Error getting next book ID:', error);
        res.status(500).json({ error: 'Failed to get next book ID' });
    }
});

router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT b.*, 
                    c.name AS category_name,
                    s.name AS subject_name,
                    cl.name AS class_name,
                    sl.code AS shelf_location_code,
                    sl.name AS shelf_location_name
             FROM books b
             LEFT JOIN categories c ON c.id = b.category_id
             LEFT JOIN subjects s ON s.id = b.subject_id
             LEFT JOIN classes cl ON cl.id = b.class_id
             LEFT JOIN shelf_locations sl ON sl.id = b.shelf_location_id
             WHERE b.id = $1`,
            [id]
        );
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Book not found' });
            return;
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching book:', error);
        res.status(500).json({ error: 'Failed to fetch book' });
    }
});

router.post('/', async (req: Request, res: Response) => {
    try {
        const { 
            title, author, isbn, category_id, subject_id, class_id, 
            shelf_location_id, quantity, cover_image, description,
            published_year, publisher 
        } = req.body;
        
        const nextIdResult = await pool.query('SELECT get_next_book_id() AS next_id');
        const bookId = nextIdResult.rows[0].next_id;
        
        const result = await pool.query(
            `INSERT INTO books (
                book_id, title, author, isbn, category_id, subject_id, class_id,
                shelf_location_id, quantity, available, cover_image, description,
                published_year, publisher
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, $10, $11, $12, $13)
            RETURNING *`,
            [
                bookId, title, author || null, isbn || null, 
                category_id || null, subject_id || null, class_id || null,
                shelf_location_id || null, quantity || 1, 
                cover_image || null, description || null,
                published_year || null, publisher || null
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating book:', error);
        res.status(500).json({ error: 'Failed to create book' });
    }
});

router.put('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { 
            title, author, isbn, category_id, subject_id, class_id, 
            shelf_location_id, quantity, cover_image, description,
            published_year, publisher, is_active 
        } = req.body;
        
        const result = await pool.query(
            `UPDATE books
             SET title = $1,
                 author = $2,
                 isbn = $3,
                 category_id = $4,
                 subject_id = $5,
                 class_id = $6,
                 shelf_location_id = $7,
                 quantity = COALESCE($8, quantity),
                 cover_image = $9,
                 description = $10,
                 published_year = $11,
                 publisher = $12,
                 is_active = COALESCE($13, is_active),
                 updated_at = NOW()
             WHERE id = $14
             RETURNING *`,
            [
                title, author, isbn, category_id || null, subject_id || null, 
                class_id || null, shelf_location_id || null, quantity ?? null,
                cover_image, description, published_year, publisher, 
                is_active ?? null, id
            ]
        );
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Book not found' });
            return;
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating book:', error);
        res.status(500).json({ error: 'Failed to update book' });
    }
});

router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM books WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Book not found' });
            return;
        }
        res.json({ message: 'Book deleted successfully' });
    } catch (error) {
        console.error('Error deleting book:', error);
        res.status(500).json({ error: 'Failed to delete book' });
    }
});

export default router;
