import { Router } from 'express';
import type { Request, Response } from 'express';
import { pool } from '../lib/db.js';

const router = Router();

// GET all stocks with summary
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.*,
        COUNT(si.id) as total_items,
        COALESCE(SUM(si.quantity), 0) as total_quantity,
        COUNT(CASE WHEN si.status = 'out_of_stock' THEN 1 END) as out_of_stock_count,
        COUNT(CASE WHEN si.status = 'low' THEN 1 END) as low_stock_count,
        COUNT(CASE WHEN si.status = 'available' THEN 1 END) as available_count
      FROM stocks s
      LEFT JOIN stock_items si ON s.id = si.stock_id
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching stocks:', error);
    res.status(500).json({ error: 'Failed to fetch stocks' });
  }
});

// GET next stock ID
router.get('/next-id', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT get_next_stock_id() as next_id');
    res.json({ nextId: result.rows[0].next_id });
  } catch (error) {
    console.error('Error getting next stock ID:', error);
    res.status(500).json({ error: 'Failed to get next stock ID' });
  }
});

// GET stock details report (aggregate totals)
router.get('/report', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        i.id as item_id,
        i.name as item_name,
        i.unit,
        COALESCE(SUM(si.quantity), 0) as total_quantity,
        COALESCE(SUM(si.current_stock), 0) as total_current_stock,
        CASE 
          WHEN COALESCE(SUM(si.current_stock), 0) <= 0 THEN 'out_of_stock'
          WHEN COALESCE(SUM(si.current_stock), 0) <= 5 THEN 'low'
          ELSE 'available'
        END as overall_status,
        COUNT(DISTINCT si.stock_id) as stock_count
      FROM items i
      LEFT JOIN stock_items si ON i.id = si.item_id
      GROUP BY i.id, i.name, i.unit
      ORDER BY i.name ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching stock report:', error);
    res.status(500).json({ error: 'Failed to fetch stock report' });
  }
});

// GET single stock with items
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const stockResult = await pool.query('SELECT * FROM stocks WHERE id = $1', [id]);
    if (stockResult.rows.length === 0) {
      res.status(404).json({ error: 'Stock not found' });
      return;
    }
    
    const itemsResult = await pool.query(`
      SELECT 
        si.*,
        i.name as item_name,
        i.description as item_description,
        i.unit as item_unit
      FROM stock_items si
      JOIN items i ON si.item_id = i.id
      WHERE si.stock_id = $1
      ORDER BY i.name ASC
    `, [id]);
    
    res.json({
      ...stockResult.rows[0],
      items: itemsResult.rows
    });
  } catch (error) {
    console.error('Error fetching stock:', error);
    res.status(500).json({ error: 'Failed to fetch stock' });
  }
});

// POST create new stock
router.post('/', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { created_by, created_by_name, notes, items } = req.body;
    
    // Get next stock ID
    const idResult = await client.query('SELECT get_next_stock_id() as next_id');
    const stockId = idResult.rows[0].next_id;
    
    // Create stock
    const stockResult = await client.query(
      'INSERT INTO stocks (stock_id, created_by, created_by_name, notes) VALUES ($1, $2, $3, $4) RETURNING *',
      [stockId, created_by, created_by_name, notes || null]
    );
    const stock = stockResult.rows[0];
    
    // Add items
    if (items && items.length > 0) {
      for (const item of items) {
        await client.query(
          'INSERT INTO stock_items (stock_id, item_id, quantity, current_stock) VALUES ($1, $2, $3, $3)',
          [stock.id, item.item_id, item.quantity]
        );
      }
    }
    
    await client.query('COMMIT');
    
    // Fetch complete stock with items
    const completeResult = await pool.query(`
      SELECT 
        si.*,
        i.name as item_name,
        i.description as item_description,
        i.unit as item_unit
      FROM stock_items si
      JOIN items i ON si.item_id = i.id
      WHERE si.stock_id = $1
      ORDER BY i.name ASC
    `, [stock.id]);
    
    res.status(201).json({
      ...stock,
      items: completeResult.rows
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating stock:', error);
    res.status(500).json({ error: 'Failed to create stock' });
  } finally {
    client.release();
  }
});

// PUT update stock (add/edit items)
router.put('/:id', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { notes, items } = req.body;
    
    // Update stock notes
    if (notes !== undefined) {
      await client.query(
        'UPDATE stocks SET notes = $1, updated_at = NOW() WHERE id = $2',
        [notes, id]
      );
    }
    
    // Replace all items
    if (items) {
      await client.query('DELETE FROM stock_items WHERE stock_id = $1', [id]);
      
      for (const item of items) {
        await client.query(
          'INSERT INTO stock_items (stock_id, item_id, quantity, current_stock) VALUES ($1, $2, $3, $4)',
          [id, item.item_id, item.quantity, item.current_stock ?? item.quantity]
        );
      }
    }
    
    await client.query('COMMIT');
    
    // Fetch updated stock
    const stockResult = await pool.query('SELECT * FROM stocks WHERE id = $1', [id]);
    const itemsResult = await pool.query(`
      SELECT 
        si.*,
        i.name as item_name,
        i.description as item_description,
        i.unit as item_unit
      FROM stock_items si
      JOIN items i ON si.item_id = i.id
      WHERE si.stock_id = $1
      ORDER BY i.name ASC
    `, [id]);
    
    res.json({
      ...stockResult.rows[0],
      items: itemsResult.rows
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating stock:', error);
    res.status(500).json({ error: 'Failed to update stock' });
  } finally {
    client.release();
  }
});

// DELETE stock
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM stocks WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Stock not found' });
      return;
    }
    res.json({ message: 'Stock deleted successfully' });
  } catch (error) {
    console.error('Error deleting stock:', error);
    res.status(500).json({ error: 'Failed to delete stock' });
  }
});

export default router;
