import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { pool } from '../lib/db.js';
import { getSessionUser, getLevelFilter } from '../lib/session.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/', async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        const { clause, params } = getLevelFilter(user, 'b');
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
             WHERE 1=1 ${clause}
             ORDER BY b.created_at DESC`,
            params
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

// Check if duplicate books exist in the database
router.get('/duplicate-count', async (_req: Request, res: Response) => {
    try {
        const result = await pool.query(`
            SELECT COALESCE(SUM(cnt - 1), 0)::int AS duplicate_rows
            FROM (
                SELECT COUNT(*) AS cnt
                FROM books
                GROUP BY
                    LOWER(TRIM(title)),
                    COALESCE(LOWER(TRIM(isbn)), ''),
                    COALESCE(LOWER(TRIM(author)), ''),
                    COALESCE(LOWER(TRIM(publisher)), ''),
                    COALESCE(published_year, 0),
                    COALESCE(level, '')
                HAVING COUNT(*) > 1
            ) sub
        `);
        res.json({ duplicateRows: result.rows[0]?.duplicate_rows ?? 0 });
    } catch (error) {
        console.error('Error checking duplicates:', error);
        res.status(500).json({ error: 'Failed to check duplicates' });
    }
});

router.get('/isbn/:isbn', async (req: Request, res: Response) => {
    try {
        const isbn = String(req.params.isbn || '').trim();
        if (!isbn) {
            res.status(400).json({ error: 'ISBN is required' });
            return;
        }
        const user = await getSessionUser(req);
        const { clause, params } = getLevelFilter(user, 'b');
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
             WHERE b.isbn = $${params.length + 1} AND b.is_active = true ${clause}
             ORDER BY b.created_at DESC`,
            [...params, isbn]
        );
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'No book found with this ISBN' });
            return;
        }
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching book by ISBN:', error);
        res.status(500).json({ error: 'Failed to fetch book by ISBN' });
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
            published_year, publisher, pages, series, language, volume, format, level 
        } = req.body;
        const user = await getSessionUser(req);
        const recordLevel = level ?? user?.level ?? null;
        
        const nextIdResult = await pool.query('SELECT get_next_book_id() AS next_id');
        const bookId = nextIdResult.rows[0].next_id;
        
        const result = await pool.query(
            `INSERT INTO books (
                book_id, title, author, isbn, category_id, subject_id, class_id,
                shelf_location_id, quantity, available, cover_image, description,
                published_year, publisher, pages, series, language, volume, format, level
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            RETURNING *`,
            [
                bookId, title, author || null, isbn || null, 
                category_id || null, subject_id || null, class_id || null,
                shelf_location_id || null, quantity || 1, 
                cover_image || null, description || null,
                published_year || null, publisher || null,
                pages || null, series || null, language || null, volume || null, format || null,
                recordLevel
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
            published_year, publisher, pages, series, language, volume, format, is_active 
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
                 pages = $13,
                 series = $14,
                 language = $15,
                 volume = $16,
                 format = $17,
                 is_active = COALESCE($18, is_active),
                 updated_at = NOW()
             WHERE id = $19
             RETURNING *`,
            [
                title, author, isbn, category_id || null, subject_id || null, 
                class_id || null, shelf_location_id || null, quantity ?? null,
                cover_image, description, published_year, publisher,
                pages || null, series || null, language || null, volume || null, format || null,
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

// Merge duplicate books already in the database
router.post('/merge-duplicates', async (req: Request, res: Response) => {
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

        res.json({
            mergedGroups,
            removedRows,
            message: mergedGroups > 0
                ? `Merged ${mergedGroups} duplicate groups, removed ${removedRows} duplicate rows.`
                : 'No duplicates found.'
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error merging duplicates:', error);
        res.status(500).json({ error: 'Failed to merge duplicates' });
    } finally {
        client.release();
    }
});

// Bulk import from Excel/CSV
router.post('/bulk', upload.single('file'), async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        const bodyLevel = req.body?.level;
        const recordLevel = bodyLevel ?? user?.level ?? null;
        const overrideCategoryId = req.body?.category_id || null;

        if (!req.file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]!];
        if (!sheet) {
            res.status(400).json({ error: 'Empty workbook' });
            return;
        }

        // Auto-detect header row: scan first 10 rows for one containing known column names
        const knownHeaders = ['title', 'author', 'isbn', 'publisher', 'pages', 'language', 'published', 'quantity', 'category', 'genre', 'genres', 'subject', 'class'];
        const allRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        let headerRowIndex = 0;

        for (let i = 0; i < Math.min(allRows.length, 10); i++) {
            const rowValues = (allRows[i] || []).map((v: any) => String(v).toLowerCase().trim());
            const matchCount = rowValues.filter((v: string) => knownHeaders.some(h => v.includes(h))).length;
            if (matchCount >= 2) {
                headerRowIndex = i;
                break;
            }
        }

        // Re-parse using the detected header row
        const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { 
            defval: '', 
            range: headerRowIndex 
        });

        if (rows.length === 0) {
            res.status(400).json({ error: 'No data rows found' });
            return;
        }

        // Normalize header keys to lowercase
        const normalized = rows.map(row => {
            const obj: Record<string, any> = {};
            for (const [k, v] of Object.entries(row)) {
                obj[k.toLowerCase().trim()] = v;
            }
            return obj;
        });

        // Preload master lookup maps for matching by name
        const [catRes, subRes, clsRes, slRes] = await Promise.all([
            pool.query(`SELECT id, LOWER(name) AS name FROM categories`),
            pool.query(`SELECT id, LOWER(name) AS name FROM subjects`),
            pool.query(`SELECT id, LOWER(name) AS name FROM classes`),
            pool.query(`SELECT id, LOWER(code) AS code, LOWER(name) AS name FROM shelf_locations`),
        ]);
        const catMap = new Map(catRes.rows.map((r: any) => [r.name, r.id]));
        const subMap = new Map(subRes.rows.map((r: any) => [r.name, r.id]));
        const clsMap = new Map(clsRes.rows.map((r: any) => [r.name, r.id]));
        const slMap = new Map(slRes.rows.map((r: any) => [r.code, r.id]));
        const slNameMap = new Map(slRes.rows.map((r: any) => [r.name, r.id]));

        // ── Phase 1: parse all rows and deduplicate ─────────────────────
        interface ParsedBook {
            title: string;
            author: string | null;
            isbn: string | null;
            publisher: string | null;
            description: string | null;
            coverImage: string | null;
            series: string | null;
            language: string | null;
            volume: string | null;
            format: string | null;
            pages: number | null;
            publishedYear: number | null;
            quantity: number;
            categoryId: string | null;
            subjectId: string | null;
            classId: string | null;
            shelfLocationId: string | null;
        }

        // Map keyed by dedup signature → merged parsed book
        const dedupMap = new Map<string, ParsedBook>();
        let skipped = 0;

        for (let i = 0; i < normalized.length; i++) {
            const row = normalized[i]!;
            const title = String(row['title'] || '').trim();
            if (!title) {
                skipped++;
                continue;
            }

            const author = String(row['author'] || '').trim() || null;
            const isbn = String(row['isbn'] || '').trim() || null;
            const publisher = String(row['publisher'] || '').trim() || null;
            const description = String(row['summary'] || row['description'] || '').trim() || null;
            const coverImage = String(row['image url'] || row['image_url'] || row['cover_image'] || '').trim() || null;
            const series = String(row['series'] || '').trim() || null;
            const language = String(row['language'] || '').trim() || null;
            const volume = String(row['volume'] || '').trim() || null;
            const format = String(row['format'] || '').trim() || null;

            let pages: number | null = null;
            const pagesRaw = row['pages'];
            if (pagesRaw !== '' && pagesRaw != null) {
                const parsed = parseInt(String(pagesRaw), 10);
                if (!isNaN(parsed)) pages = parsed;
            }

            let publishedYear: number | null = null;
            const pubRaw = row['published'] || row['published date'] || row['published_year'] || row['publishedyear'];
            if (pubRaw) {
                const str = String(pubRaw).trim();
                const match = str.match(/(\d{4})/);
                if (match) publishedYear = parseInt(match[1]!, 10);
            }

            let quantity = 1;
            const qtyRaw = row['quantity'] || row['copy'] || row['copies'];
            if (qtyRaw !== '' && qtyRaw != null) {
                const parsed = parseInt(String(qtyRaw), 10);
                if (!isNaN(parsed) && parsed > 0) quantity = parsed;
            }

            // Resolve foreign keys by name matching
            const catName = String(row['category'] || row['genres'] || row['genre'] || '').trim().toLowerCase();
            const subName = String(row['subject'] || '').trim().toLowerCase();
            const clsName = String(row['class'] || '').trim().toLowerCase();
            const locRaw = String(row['shelflocation'] || row['shelf_location'] || row['location'] || row['bookshelf'] || '').trim().toLowerCase();

            // Category: use override from form if provided, else match from file
            const categoryId = overrideCategoryId || catMap.get(catName) || null;
            const subjectId = subMap.get(subName) || null;
            const classId = clsMap.get(clsName) || null;
            const shelfLocationId = slMap.get(locRaw) || slNameMap.get(locRaw) || null;

            // Build dedup key: same title + author + isbn + publisher + published year = same book
            const dedupKey = [
                title.toLowerCase(),
                (author || '').toLowerCase(),
                (isbn || '').toLowerCase(),
                (publisher || '').toLowerCase(),
                publishedYear ?? '',
            ].join('||');

            const existing = dedupMap.get(dedupKey);
            if (existing) {
                // Duplicate row → increment quantity
                existing.quantity += quantity;
            } else {
                dedupMap.set(dedupKey, {
                    title, author, isbn, publisher, description, coverImage,
                    series, language, volume, format, pages, publishedYear,
                    quantity, categoryId, subjectId, classId, shelfLocationId,
                });
            }
        }

        // ── Phase 2: check DB for existing books, upsert ─────────────────
        let imported = 0;
        let updatedExisting = 0;
        let duplicatesMerged = normalized.length - skipped - dedupMap.size;
        const errors: string[] = [];

        for (const [, book] of dedupMap) {
            try {
                // Check if a book with matching key fields already exists in DB
                const existingResult = await pool.query(
                    `SELECT id, quantity, available FROM books
                     WHERE LOWER(TRIM(title)) = LOWER(TRIM($1))
                       AND COALESCE(LOWER(TRIM(isbn)), '') = COALESCE(LOWER(TRIM($2)), '')
                       AND COALESCE(LOWER(TRIM(author)), '') = COALESCE(LOWER(TRIM($3)), '')
                       AND COALESCE(LOWER(TRIM(publisher)), '') = COALESCE(LOWER(TRIM($4)), '')
                       AND COALESCE(published_year, 0) = COALESCE($5, 0)
                       AND COALESCE(level, '') = COALESCE($6, '')
                     LIMIT 1`,
                    [
                        book.title, book.isbn, book.author, book.publisher,
                        book.publishedYear, recordLevel
                    ]
                );

                if (existingResult.rows.length > 0) {
                    // Book exists → increment quantity and available
                    const existing = existingResult.rows[0]!;
                    await pool.query(
                        `UPDATE books SET
                            quantity = quantity + $1,
                            available = available + $1,
                            cover_image = COALESCE(NULLIF($3, ''), cover_image),
                            description = COALESCE(NULLIF($4, ''), description),
                            category_id = COALESCE($5, category_id),
                            subject_id = COALESCE($6, subject_id),
                            class_id = COALESCE($7, class_id),
                            shelf_location_id = COALESCE($8, shelf_location_id),
                            series = COALESCE(NULLIF($9, ''), series),
                            language = COALESCE(NULLIF($10, ''), language),
                            pages = COALESCE($11, pages),
                            format = COALESCE(NULLIF($12, ''), format),
                            updated_at = NOW()
                         WHERE id = $2`,
                        [
                            book.quantity, existing.id,
                            book.coverImage, book.description,
                            book.categoryId, book.subjectId, book.classId, book.shelfLocationId,
                            book.series, book.language, book.pages, book.format
                        ]
                    );
                    updatedExisting++;
                } else {
                    // New book → insert
                    const nextIdResult = await pool.query('SELECT get_next_book_id() AS next_id');
                    const bookId = nextIdResult.rows[0]!.next_id;

                    await pool.query(
                        `INSERT INTO books (
                            book_id, title, author, isbn, category_id, subject_id, class_id,
                            shelf_location_id, quantity, available, cover_image, description,
                            published_year, publisher, pages, series, language, volume, format, level
                        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
                        [
                            bookId, book.title, book.author, book.isbn,
                            book.categoryId, book.subjectId, book.classId, book.shelfLocationId,
                            book.quantity, book.coverImage, book.description,
                            book.publishedYear, book.publisher, book.pages, book.series,
                            book.language, book.volume, book.format,
                            recordLevel
                        ]
                    );
                    imported++;
                }
            } catch (err: any) {
                errors.push(`"${book.title}": ${err.message || 'Unknown error'}`);
                skipped++;
            }
        }

        res.json({
            imported,
            updatedExisting,
            skipped,
            total: normalized.length,
            duplicatesMerged,
            errors: errors.slice(0, 20),
        });
    } catch (error) {
        console.error('Error bulk importing books:', error);
        res.status(500).json({ error: 'Failed to import books' });
    }
});

export default router;
