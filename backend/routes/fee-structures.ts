import { Router } from 'express';
import type { Request, Response } from 'express';
import { pool } from '../lib/db.js';
import { getSessionUser } from '../lib/session.js';

const router = Router();

// ── Fee Structures CRUD ──────────────────────────────────────

// GET all fee structures for an academic year
router.get('/', async (req: Request, res: Response) => {
    try {
        const academicYear = req.query.academic_year as string;
        const where: string[] = ['1=1'];
        const params: unknown[] = [];
        let idx = 1;

        if (academicYear) {
            where.push(`academic_year = $${idx}`);
            params.push(academicYear);
            idx++;
        }

        const result = await pool.query(
            `SELECT * FROM fee_structures
             WHERE ${where.join(' AND ')}
             ORDER BY
                CASE level
                    WHEN 'pre_primary' THEN 1
                    WHEN 'primary' THEN 2
                    WHEN 'secondary' THEN 3
                    WHEN 'advanced' THEN 4
                END,
                tuition_amount ASC`,
            params,
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching fee structures:', error);
        res.status(500).json({ error: 'Failed to fetch fee structures' });
    }
});

// GET single fee structure
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT * FROM fee_structures WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Fee structure not found' });
            return;
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching fee structure:', error);
        res.status(500).json({ error: 'Failed to fetch fee structure' });
    }
});

// POST create fee structure
router.post('/', async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        if (!user) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const { academic_year, year_group, level, tuition_amount, total_term_fee,
            term1_percent, term2_percent, term3_percent,
            books_fee, cambridge_exam_fee, hostel_fee } = req.body;

        if (!academic_year || !year_group || !level) {
            res.status(400).json({ error: 'academic_year, year_group, and level are required' });
            return;
        }

        const result = await pool.query(
            `INSERT INTO fee_structures
                (academic_year, year_group, level, tuition_amount, total_term_fee,
                 term1_percent, term2_percent, term3_percent,
                 books_fee, cambridge_exam_fee, hostel_fee)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING *`,
            [
                academic_year, year_group, level,
                tuition_amount || 0, total_term_fee || 0,
                term1_percent ?? 50, term2_percent ?? 35, term3_percent ?? 15,
                books_fee || 0, cambridge_exam_fee || 0, hostel_fee || 0,
            ],
        );
        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        if (error?.code === '23505') {
            res.status(409).json({ error: 'Fee structure already exists for this year group and academic year' });
            return;
        }
        console.error('Error creating fee structure:', error);
        res.status(500).json({ error: 'Failed to create fee structure' });
    }
});

// PUT update fee structure
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        if (!user) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const { tuition_amount, total_term_fee, term1_percent, term2_percent, term3_percent,
            books_fee, cambridge_exam_fee, hostel_fee } = req.body;

        const result = await pool.query(
            `UPDATE fee_structures SET
                tuition_amount = COALESCE($1, tuition_amount),
                total_term_fee = COALESCE($2, total_term_fee),
                term1_percent = COALESCE($3, term1_percent),
                term2_percent = COALESCE($4, term2_percent),
                term3_percent = COALESCE($5, term3_percent),
                books_fee = COALESCE($6, books_fee),
                cambridge_exam_fee = COALESCE($7, cambridge_exam_fee),
                hostel_fee = COALESCE($8, hostel_fee),
                updated_at = NOW()
             WHERE id = $9
             RETURNING *`,
            [tuition_amount, total_term_fee, term1_percent, term2_percent, term3_percent,
                books_fee, cambridge_exam_fee, hostel_fee, req.params.id],
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Fee structure not found' });
            return;
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating fee structure:', error);
        res.status(500).json({ error: 'Failed to update fee structure' });
    }
});

// DELETE fee structure
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const result = await pool.query('DELETE FROM fee_structures WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Fee structure not found' });
            return;
        }
        res.json({ message: 'Fee structure deleted' });
    } catch (error) {
        console.error('Error deleting fee structure:', error);
        res.status(500).json({ error: 'Failed to delete fee structure' });
    }
});

// POST bulk upsert for an academic year
router.post('/bulk', async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        if (!user) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const { items } = req.body as { items: Array<{
            academic_year: string; year_group: string; level: string;
            tuition_amount: number; total_term_fee: number;
            term1_percent?: number; term2_percent?: number; term3_percent?: number;
            books_fee?: number; cambridge_exam_fee?: number; hostel_fee?: number;
        }> };

        if (!items || !Array.isArray(items) || items.length === 0) {
            res.status(400).json({ error: 'items array is required' });
            return;
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const results = [];
            for (const item of items) {
                const r = await client.query(
                    `INSERT INTO fee_structures
                        (academic_year, year_group, level, tuition_amount, total_term_fee,
                         term1_percent, term2_percent, term3_percent,
                         books_fee, cambridge_exam_fee, hostel_fee)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                     ON CONFLICT (academic_year, year_group) DO UPDATE SET
                        tuition_amount = EXCLUDED.tuition_amount,
                        total_term_fee = EXCLUDED.total_term_fee,
                        term1_percent = EXCLUDED.term1_percent,
                        term2_percent = EXCLUDED.term2_percent,
                        term3_percent = EXCLUDED.term3_percent,
                        books_fee = EXCLUDED.books_fee,
                        cambridge_exam_fee = EXCLUDED.cambridge_exam_fee,
                        hostel_fee = EXCLUDED.hostel_fee,
                        updated_at = NOW()
                     RETURNING *`,
                    [
                        item.academic_year, item.year_group, item.level,
                        item.tuition_amount || 0, item.total_term_fee || 0,
                        item.term1_percent ?? 50, item.term2_percent ?? 35, item.term3_percent ?? 15,
                        item.books_fee || 0, item.cambridge_exam_fee || 0, item.hostel_fee || 0,
                    ],
                );
                results.push(r.rows[0]);
            }
            await client.query('COMMIT');
            res.json(results);
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error bulk upserting fee structures:', error);
        res.status(500).json({ error: 'Failed to save fee structures' });
    }
});

// ── Other Charges CRUD ──────────────────────────────────────

// GET other charges
router.get('/other-charges/list', async (req: Request, res: Response) => {
    try {
        const academicYear = req.query.academic_year as string;
        const where: string[] = ['1=1'];
        const params: unknown[] = [];
        let idx = 1;

        if (academicYear) {
            where.push(`academic_year = $${idx}`);
            params.push(academicYear);
            idx++;
        }

        const result = await pool.query(
            `SELECT * FROM fee_other_charges WHERE ${where.join(' AND ')} ORDER BY fee_type, fee_name`,
            params,
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching other charges:', error);
        res.status(500).json({ error: 'Failed to fetch other charges' });
    }
});

// POST create other charge
router.post('/other-charges', async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        if (!user) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const { academic_year, fee_name, amount, fee_type, min_level } = req.body;
        if (!academic_year || !fee_name) {
            res.status(400).json({ error: 'academic_year and fee_name are required' });
            return;
        }

        const result = await pool.query(
            `INSERT INTO fee_other_charges (academic_year, fee_name, amount, fee_type, min_level)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [academic_year, fee_name, amount || 0, fee_type || 'annual', min_level || null],
        );
        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        if (error?.code === '23505') {
            res.status(409).json({ error: 'This charge already exists for this academic year' });
            return;
        }
        console.error('Error creating other charge:', error);
        res.status(500).json({ error: 'Failed to create other charge' });
    }
});

// PUT update other charge
router.put('/other-charges/:id', async (req: Request, res: Response) => {
    try {
        const { fee_name, amount, fee_type, min_level } = req.body;
        const result = await pool.query(
            `UPDATE fee_other_charges SET
                fee_name = COALESCE($1, fee_name),
                amount = COALESCE($2, amount),
                fee_type = COALESCE($3, fee_type),
                min_level = $4,
                updated_at = NOW()
             WHERE id = $5
             RETURNING *`,
            [fee_name, amount, fee_type, min_level ?? null, req.params.id],
        );
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Other charge not found' });
            return;
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating other charge:', error);
        res.status(500).json({ error: 'Failed to update other charge' });
    }
});

// DELETE other charge
router.delete('/other-charges/:id', async (req: Request, res: Response) => {
    try {
        const result = await pool.query('DELETE FROM fee_other_charges WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Other charge not found' });
            return;
        }
        res.json({ message: 'Other charge deleted' });
    } catch (error) {
        console.error('Error deleting other charge:', error);
        res.status(500).json({ error: 'Failed to delete other charge' });
    }
});

// GET distinct academic years (for dropdowns)
router.get('/academic-years/list', async (_req: Request, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT DISTINCT academic_year FROM fee_structures ORDER BY academic_year DESC`,
        );
        res.json(result.rows.map((r: any) => r.academic_year));
    } catch (error) {
        console.error('Error fetching academic years:', error);
        res.status(500).json({ error: 'Failed to fetch academic years' });
    }
});

export default router;
