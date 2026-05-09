import { pool, withTransaction } from './db.js';

export async function createItemDistributionService(
    userId: string,
    userLevel: string | undefined | null,
    userRole: string | undefined | null,
    teacherId: string,
    itemId: string,
    quantity: number,
    distributionDate?: string
) {
    if (!teacherId || !itemId || !Number.isFinite(quantity) || quantity <= 0) {
        throw new Error('teacher_id, item_id and quantity are required');
    }

    const insertResult = await withTransaction(async (client) => {
        const teacherResult = await client.query('SELECT id FROM teachers WHERE id = $1', [teacherId]);
        if (teacherResult.rows.length === 0) {
            throw new Error('Teacher not found');
        }

        const itemResult = await client.query('SELECT id FROM items WHERE id = $1', [itemId]);
        if (itemResult.rows.length === 0) {
            throw new Error('Item not found');
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
            [itemId, userLevel, userRole],
        );

        const totalAvailable = stockRows.rows.reduce((sum: number, row: { current_stock: number }) => {
            return sum + Number(row.current_stock || 0);
        }, 0);

        if (totalAvailable < quantity) {
            throw new Error(`Insufficient stock. Available: ${totalAvailable}`);
        }

        let remaining = quantity;
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

        const result = await client.query(
            `INSERT INTO item_distributions (teacher_id, item_id, quantity, distribution_date, issued_by, level)
             VALUES ($1, $2, $3, COALESCE($4::timestamptz, NOW()), $5, $6)
             RETURNING *`,
            [teacherId, itemId, quantity, distributionDate ?? null, userId, userLevel ?? null],
        );
        return result.rows[0];
    });

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
        [insertResult.id],
    );

    return distribution.rows[0];
}

export async function createBatchItemDistributionService(
    userId: string,
    userLevel: string | undefined | null,
    userRole: string | undefined | null,
    teacherId: string,
    items: Array<{ item_id: string; quantity: number }>,
    distributionDate?: string
) {
    if (!teacherId || !Array.isArray(items) || items.length === 0) {
        throw new Error('teacher_id and at least one item are required');
    }

    const combinedMap = new Map<string, number>();
    for (const item of items) {
        combinedMap.set(item.item_id, (combinedMap.get(item.item_id) ?? 0) + item.quantity);
    }
    const combined = [...combinedMap.entries()].map(([item_id, quantity]) => ({ item_id, quantity }));

    return withTransaction(async (client) => {
        const teacherResult = await client.query('SELECT id FROM teachers WHERE id = $1', [teacherId]);
        if (teacherResult.rows.length === 0) {
            throw new Error('Teacher not found');
        }

        for (const item of combined) {
            const itemResult = await client.query('SELECT id, name FROM items WHERE id = $1', [item.item_id]);
            if (itemResult.rows.length === 0) {
                throw new Error(`Item not found: ${item.item_id}`);
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
                [item.item_id, userLevel, userRole],
            );

            const totalAvailable = stockRows.rows.reduce((sum: number, row: { current_stock: number }) => {
                return sum + Number(row.current_stock || 0);
            }, 0);

            if (totalAvailable < item.quantity) {
                throw new Error(`Insufficient stock for item ${itemResult.rows[0].name}. Requested: ${item.quantity}, Available: ${totalAvailable}`);
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
                [teacherId, item.item_id, item.quantity, distributionDate ?? null, userId, userLevel ?? null],
            );
            insertedIds.push(insertResult.rows[0].id);
        }

        const result = await client.query(
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

        return {
            count: result.rows.length,
            distributions: result.rows,
        };
    });
}

export async function deleteItemDistributionService(distributionId: string) {
    return withTransaction(async (client) => {
        const distResult = await client.query(
            'SELECT id, item_id, quantity FROM item_distributions WHERE id = $1',
            [distributionId],
        );

        if (distResult.rows.length === 0) {
            throw new Error('Distribution record not found');
        }

        const dist = distResult.rows[0];

        // Restore stock: find earliest stock_items row for this item and add quantity back
        const stockRow = await client.query(
            `SELECT id FROM stock_items
             WHERE item_id = $1
             ORDER BY created_at ASC
             LIMIT 1`,
            [dist.item_id],
        );

        if (stockRow.rows.length > 0) {
            await client.query(
                'UPDATE stock_items SET current_stock = current_stock + $1 WHERE id = $2',
                [dist.quantity, stockRow.rows[0].id],
            );
        }

        await client.query('DELETE FROM item_distributions WHERE id = $1', [distributionId]);
        return { success: true };
    });
}