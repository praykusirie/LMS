import { Router } from 'express';
import type { Request, Response } from 'express';
import { pool } from '../lib/db.js';
import { getSessionUser, getLevelFilter } from '../lib/session.js';

const router = Router();

function buildDistributionFilters(req: Request, startIndex = 1): { clause: string; params: unknown[]; nextIndex: number } {
    const teacherId = String(req.query.teacher_id || '').trim();
    const itemId = String(req.query.item_id || '').trim();
    const dateFrom = String(req.query.date_from || '').trim();
    const dateTo = String(req.query.date_to || '').trim();

    const parts: string[] = [];
    const params: unknown[] = [];
    let idx = startIndex;

    if (teacherId) {
        parts.push(`d.teacher_id = $${idx}`);
        params.push(teacherId);
        idx += 1;
    }

    if (itemId) {
        parts.push(`d.item_id = $${idx}`);
        params.push(itemId);
        idx += 1;
    }

    if (dateFrom) {
        parts.push(`d.distribution_date >= $${idx}::date`);
        params.push(dateFrom);
        idx += 1;
    }

    if (dateTo) {
        parts.push(`d.distribution_date < ($${idx}::date + interval '1 day')`);
        params.push(dateTo);
        idx += 1;
    }

    return {
        clause: parts.length > 0 ? ` AND ${parts.join(' AND ')}` : '',
        params,
        nextIndex: idx,
    };
}

function csvEscape(value: unknown): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

router.get('/', async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        const { clause: levelClause, params: levelParams, paramOffset } = getLevelFilter(user, 'd');
        const { clause: filterClause, params: filterParams } = buildDistributionFilters(req, paramOffset);
        const result = await pool.query(
            `SELECT
                d.*,
                t.name AS teacher_name,
                t.teacher_id AS teacher_code,
                i.name AS item_name,
                i.unit AS item_unit,
                u.name AS issued_by_name
             FROM item_distributions d
             JOIN teachers t ON t.id = d.teacher_id
             JOIN items i ON i.id = d.item_id
             LEFT JOIN "user" u ON u.id = d.issued_by
             WHERE 1=1 ${levelClause}${filterClause}
             ORDER BY d.distribution_date DESC, d.created_at DESC`,
            [...levelParams, ...filterParams],
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching item distributions:', error);
        res.status(500).json({ error: 'Failed to fetch item distributions' });
    }
});

router.get('/report', async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        const { clause: levelClause, params: levelParams, paramOffset } = getLevelFilter(user, 'd');
        const { clause: filterClause, params: filterParams } = buildDistributionFilters(req, paramOffset);

        const result = await pool.query(
            `SELECT
                d.distribution_date,
                t.teacher_id AS teacher_code,
                t.name AS teacher_name,
                i.name AS item_name,
                i.unit AS item_unit,
                d.quantity,
                u.name AS issued_by_name
             FROM item_distributions d
             JOIN teachers t ON t.id = d.teacher_id
             JOIN items i ON i.id = d.item_id
             LEFT JOIN "user" u ON u.id = d.issued_by
             WHERE 1=1 ${levelClause}${filterClause}
             ORDER BY d.distribution_date DESC, d.created_at DESC`,
            [...levelParams, ...filterParams],
        );

        const header = [
            'Distribution Date',
            'Teacher Code',
            'Teacher Name',
            'Item',
            'Unit',
            'Quantity',
            'Issued By',
        ];

        const lines = [header.join(',')];
        for (const row of result.rows) {
            lines.push([
                csvEscape(new Date(row.distribution_date).toISOString()),
                csvEscape(row.teacher_code),
                csvEscape(row.teacher_name),
                csvEscape(row.item_name),
                csvEscape(row.item_unit),
                csvEscape(row.quantity),
                csvEscape(row.issued_by_name ?? ''),
            ].join(','));
        }

        const csv = lines.join('\n');
        const timestamp = new Date().toISOString().slice(0, 10);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="item-distribution-report-${timestamp}.csv"`);
        res.send(csv);
    } catch (error) {
        console.error('Error exporting distribution report:', error);
        res.status(500).json({ error: 'Failed to export distribution report' });
    }
});

router.post('/', async (req: Request, res: Response) => {
    const client = await pool.connect();

    try {
        const user = await getSessionUser(req);
        if (!user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const { teacher_id, item_id, quantity, distribution_date } = req.body as {
            teacher_id?: string;
            item_id?: string;
            quantity?: number;
            distribution_date?: string;
        };

        const qty = Number(quantity);
        if (!teacher_id || !item_id || !Number.isFinite(qty) || qty <= 0) {
            res.status(400).json({ error: 'teacher_id, item_id and quantity are required' });
            return;
        }

        await client.query('BEGIN');

        const teacherResult = await client.query('SELECT id FROM teachers WHERE id = $1', [teacher_id]);
        if (teacherResult.rows.length === 0) {
            await client.query('ROLLBACK');
            res.status(404).json({ error: 'Teacher not found' });
            return;
        }

        const itemResult = await client.query('SELECT id FROM items WHERE id = $1', [item_id]);
        if (itemResult.rows.length === 0) {
            await client.query('ROLLBACK');
            res.status(404).json({ error: 'Item not found' });
            return;
        }

        const stockRows = await client.query(
            `SELECT si.id, si.current_stock
             FROM stock_items si
             JOIN stocks s ON s.id = si.stock_id
             WHERE si.item_id = $1
               AND si.current_stock > 0
               AND ($2::text IS NULL OR $3 = 'admin' OR s.level = $2 OR s.level IS NULL)
             ORDER BY si.created_at ASC
             FOR UPDATE`,
            [item_id, user.level, user.role],
        );

        const totalAvailable = stockRows.rows.reduce((sum: number, row: { current_stock: number }) => {
            return sum + Number(row.current_stock || 0);
        }, 0);

        if (totalAvailable < qty) {
            await client.query('ROLLBACK');
            res.status(400).json({ error: `Insufficient stock. Available: ${totalAvailable}` });
            return;
        }

        let remaining = qty;
        for (const row of stockRows.rows as Array<{ id: string; current_stock: number }>) {
            if (remaining <= 0) break;
            const available = Number(row.current_stock || 0);
            const deduct = Math.min(available, remaining);

            await client.query(
                'UPDATE stock_items SET current_stock = current_stock - $1 WHERE id = $2',
                [deduct, row.id],
            );

            remaining -= deduct;
        }

        const insertResult = await client.query(
            `INSERT INTO item_distributions (teacher_id, item_id, quantity, distribution_date, issued_by, level)
             VALUES ($1, $2, $3, COALESCE($4::timestamptz, NOW()), $5, $6)
             RETURNING *`,
            [teacher_id, item_id, qty, distribution_date ?? null, user.id, user.level ?? null],
        );

        await client.query('COMMIT');

        const distribution = await pool.query(
            `SELECT
                d.*,
                t.name AS teacher_name,
                t.teacher_id AS teacher_code,
                i.name AS item_name,
                i.unit AS item_unit,
                u.name AS issued_by_name
             FROM item_distributions d
             JOIN teachers t ON t.id = d.teacher_id
             JOIN items i ON i.id = d.item_id
             LEFT JOIN "user" u ON u.id = d.issued_by
             WHERE d.id = $1`,
            [insertResult.rows[0].id],
        );

        res.status(201).json(distribution.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating item distribution:', error);
        res.status(500).json({ error: 'Failed to create item distribution' });
    } finally {
        client.release();
    }
});

router.post('/batch', async (req: Request, res: Response) => {
    const client = await pool.connect();

    try {
        const user = await getSessionUser(req);
        if (!user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const {
            teacher_id,
            distribution_date,
            items,
        } = req.body as {
            teacher_id?: string;
            distribution_date?: string;
            items?: Array<{ item_id?: string; quantity?: number }>;
        };

        if (!teacher_id || !Array.isArray(items) || items.length === 0) {
            res.status(400).json({ error: 'teacher_id and at least one item are required' });
            return;
        }

        const normalized = items
            .map((item) => ({
                item_id: item.item_id,
                quantity: Number(item.quantity),
            }))
            .filter((item) => item.item_id && Number.isFinite(item.quantity) && item.quantity > 0) as Array<{ item_id: string; quantity: number }>;

        if (normalized.length === 0) {
            res.status(400).json({ error: 'No valid items provided' });
            return;
        }

        const combinedMap = new Map<string, number>();
        for (const item of normalized) {
            combinedMap.set(item.item_id, (combinedMap.get(item.item_id) ?? 0) + item.quantity);
        }
        const combined = [...combinedMap.entries()].map(([item_id, quantity]) => ({ item_id, quantity }));

        await client.query('BEGIN');

        const teacherResult = await client.query('SELECT id FROM teachers WHERE id = $1', [teacher_id]);
        if (teacherResult.rows.length === 0) {
            await client.query('ROLLBACK');
            res.status(404).json({ error: 'Teacher not found' });
            return;
        }

        for (const item of combined) {
            const itemResult = await client.query('SELECT id, name FROM items WHERE id = $1', [item.item_id]);
            if (itemResult.rows.length === 0) {
                await client.query('ROLLBACK');
                res.status(404).json({ error: `Item not found: ${item.item_id}` });
                return;
            }

            const stockRows = await client.query(
                `SELECT si.id, si.current_stock
                 FROM stock_items si
                 JOIN stocks s ON s.id = si.stock_id
                 WHERE si.item_id = $1
                   AND si.current_stock > 0
                   AND ($2::text IS NULL OR $3 = 'admin' OR s.level = $2 OR s.level IS NULL)
                 ORDER BY si.created_at ASC
                 FOR UPDATE`,
                [item.item_id, user.level, user.role],
            );

            const totalAvailable = stockRows.rows.reduce((sum: number, row: { current_stock: number }) => {
                return sum + Number(row.current_stock || 0);
            }, 0);

            if (totalAvailable < item.quantity) {
                await client.query('ROLLBACK');
                res.status(400).json({
                    error: `Insufficient stock for item ${itemResult.rows[0].name}. Requested: ${item.quantity}, Available: ${totalAvailable}`,
                });
                return;
            }

            let remaining = item.quantity;
            for (const row of stockRows.rows as Array<{ id: string; current_stock: number }>) {
                if (remaining <= 0) break;
                const available = Number(row.current_stock || 0);
                const deduct = Math.min(available, remaining);

                await client.query(
                    'UPDATE stock_items SET current_stock = current_stock - $1 WHERE id = $2',
                    [deduct, row.id],
                );

                remaining -= deduct;
            }
        }

        const insertedIds: string[] = [];
        for (const item of combined) {
            const insertResult = await client.query(
                `INSERT INTO item_distributions (teacher_id, item_id, quantity, distribution_date, issued_by, level)
                 VALUES ($1, $2, $3, COALESCE($4::timestamptz, NOW()), $5, $6)
                 RETURNING id`,
                [teacher_id, item.item_id, item.quantity, distribution_date ?? null, user.id, user.level ?? null],
            );
            insertedIds.push(insertResult.rows[0].id);
        }

        await client.query('COMMIT');

        const result = await pool.query(
            `SELECT
                d.*,
                t.name AS teacher_name,
                t.teacher_id AS teacher_code,
                i.name AS item_name,
                i.unit AS item_unit,
                u.name AS issued_by_name
             FROM item_distributions d
             JOIN teachers t ON t.id = d.teacher_id
             JOIN items i ON i.id = d.item_id
             LEFT JOIN "user" u ON u.id = d.issued_by
             WHERE d.id = ANY($1::uuid[])
             ORDER BY d.created_at DESC`,
            [insertedIds],
        );

        res.status(201).json({
            count: result.rows.length,
            distributions: result.rows,
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating batch item distribution:', error);
        res.status(500).json({ error: 'Failed to create batch item distribution' });
    } finally {
        client.release();
    }
});

export default router;
