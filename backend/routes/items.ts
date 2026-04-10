import { Router } from 'express';
import type { Request, Response } from 'express';
import { pool } from '../lib/db.js';
import { getSessionUser, getLevelFilter } from '../lib/session.js';

const router = Router();

// GET all items
router.get('/', async (req: Request, res: Response) => {
  try {
    const user = await getSessionUser(req);
    const { clause, params } = getLevelFilter(user);
    const result = await pool.query(
      `SELECT * FROM items WHERE 1=1 ${clause} ORDER BY name ASC`,
      params
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// GET item by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM items WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// POST create item
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description, unit, level } = req.body;
    const user = await getSessionUser(req);
    const recordLevel = level ?? user?.level ?? null;

    const existing = await pool.query(
      'SELECT id FROM items WHERE LOWER(name) = LOWER($1)',
      [name.trim()]
    );
    if (existing.rows.length > 0) {
      res.status(409).json({ message: `Item "${name.trim()}" already exists` });
      return;
    }

    const result = await pool.query(
      'INSERT INTO items (name, description, unit, level) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description || null, unit || 'pcs', recordLevel]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// PUT update item
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, unit } = req.body;
    const result = await pool.query(
      'UPDATE items SET name = $1, description = $2, unit = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
      [name, description, unit, id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// DELETE item
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM items WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

export default router;
