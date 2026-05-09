import { pool } from './db.js';

export async function mergeDuplicateBooksService() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Find duplicate groups: same title + isbn + author + publisher + published_year + level
        const dupGroups = await client.query(`
            SELECT 
                LOWER(TRIM(title)) AS t,
                COALESCE(LOWER(TRIM(isbn)), '') AS i,
                COALESCE(LOWER(TRIM(author)), '') AS a,
                COALESCE(LOWER(TRIM(publisher)), '') AS p,
                COALESCE(published_year, 0) AS y,
                COALESCE(level, '') AS l,
                array_agg(id ORDER BY created_at ASC) AS ids,
                array_agg(book_id ORDER BY created_at ASC) AS book_ids,
                array_agg(quantity ORDER BY created_at ASC) AS quantities,
                array_agg(available ORDER BY created_at ASC) AS availables,
                COUNT(*) AS cnt
            FROM books
            GROUP BY t, i, a, p, y, l
            HAVING COUNT(*) > 1
        `);

        let mergedGroups = 0;
        let removedRows = 0;

        for (const group of dupGroups.rows) {
            const ids: string[] = group.ids;
            const quantities: number[] = group.quantities;
            const availables: number[] = group.availables;
            const keepId = ids[0]!; // keep the earliest record
            const duplicateIds = ids.slice(1);

            const totalQuantity = quantities.reduce((s: number, q: number) => s + q, 0);
            const totalAvailable = availables.reduce((s: number, a: number) => s + a, 0);

            // Check if any duplicate has borrow_records referencing it
            const borrowCheck = await client.query(
                `SELECT DISTINCT book_id FROM borrow_records WHERE book_id = ANY($1)`,
                [duplicateIds]
            );

            // Reassign borrow_records from duplicates to the kept book
            if (borrowCheck.rows.length > 0) {
                await client.query(
                    `UPDATE borrow_records SET book_id = $1 WHERE book_id = ANY($2)`,
                    [keepId, duplicateIds]
                );
            }

            // Update the kept book with aggregated quantities
            await client.query(
                `UPDATE books SET quantity = $1, available = $2, updated_at = NOW() WHERE id = $3`,
                [totalQuantity, totalAvailable, keepId]
            );

            // Delete the duplicate rows
            await client.query(
                `DELETE FROM books WHERE id = ANY($1)`,
                [duplicateIds]
            );

            mergedGroups++;
            removedRows += duplicateIds.length;
        }

        await client.query('COMMIT');

        return {
            mergedGroups,
            removedRows,
            message: mergedGroups > 0
                ? `Merged ${mergedGroups} duplicate groups, removed ${removedRows} duplicate rows.`
                : 'No duplicates found.'
        };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}