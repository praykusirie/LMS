import { Router } from 'express';
import type { Request, Response } from 'express';
import { pool } from '../lib/db.js';
import { getSessionUser, getLevelFilter } from '../lib/session.js';
import { requirePermission } from '../lib/middleware.js';
import {
    createItemDistributionService,
    createBatchItemDistributionService,
    deleteItemDistributionService
} from '../lib/item-distributions.service.js';

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

router.get('/', requirePermission('distribution', 'view'), async (req: Request, res: Response) => {
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

router.get('/report', requirePermission('distribution', 'view'), async (req: Request, res: Response) => {
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

router.post('/', requirePermission('distribution', 'create'), async (req: Request, res: Response) => {
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
        
        try {
            const distribution = await createItemDistributionService(
                user.id,
                user.level,
                user.role,
                teacher_id || '',
                item_id || '',
                qty,
                distribution_date
            );
            res.status(201).json(distribution);
        } catch (error: any) {
            if (['teacher_id, item_id and quantity are required'].includes(error.message)) {
                res.status(400).json({ error: error.message });
                return;
            }
            throw error;
        }
    } catch (error: any) {
        console.error('Error creating item distribution:', error);
        
        if (['Teacher not found', 'Item not found'].includes(error.message)) {
            res.status(404).json({ error: error.message });
            return;
        }
        if (error.message.startsWith('Insufficient stock.')) {
            res.status(400).json({ error: error.message });
            return;
        }

        res.status(500).json({ error: 'Failed to create item distribution' });
    }
});

router.post('/batch', requirePermission('distribution', 'create'), async (req: Request, res: Response) => {
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

        const result = await createBatchItemDistributionService(
            user.id,
            user.level,
            user.role,
            teacher_id,
            normalized,
            distribution_date
        );

        res.status(201).json(result);
    } catch (error: any) {
        console.error('Error creating batch item distribution:', error);
        if (error.message === 'Teacher not found' || error.message.startsWith('Item not found')) {
            res.status(404).json({ error: error.message });
            return;
        }
        if (error.message.startsWith('Insufficient stock')) {
            res.status(400).json({ error: error.message });
            return;
        }
        res.status(500).json({ error: 'Failed to create batch item distribution' });
    }
});

router.delete('/:id', requirePermission('distribution', 'delete'), async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        if (!user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const { id } = req.params;
        if (!id || typeof id !== 'string') {
            res.status(400).json({ error: 'Valid id is required' });
            return;
        }
        const result = await deleteItemDistributionService(id);
        res.json(result);
    } catch (error: any) {
        console.error('Error voiding item distribution:', error);
        if (error.message === 'Distribution record not found') {
            res.status(404).json({ error: error.message });
            return;
        }
        res.status(500).json({ error: 'Failed to void distribution' });
    }
});

export default router;
