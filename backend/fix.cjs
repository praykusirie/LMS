const fs = require('fs');
let file = 'routes/dashboard.ts';
let content = fs.readFileSync(file, 'utf8');
const idx = content.indexOf('// Get Top Books');
if (idx !== -1) { content = content.substring(0, idx); }
fs.writeFileSync(file, content + Buffer.from(`
// Get Top Books
router.get('/library-top-books', async (req: Request, res: Response) => {
    try {
        const result = await pool.query(`\n            SELECT b.title, b.author, COUNT(br.id)::int AS borrow_count\n            FROM borrow_records br\n            JOIN books b ON b.id = br.book_id\n            GROUP BY b.id, b.title, b.author\n            ORDER BY borrow_count DESC\n            LIMIT 5\n        `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch top books' });
    }
});

// Get Top Authors
router.get('/library-top-authors', async (req: Request, res: Response) => {
    try {
        const result = await pool.query(`\n            SELECT b.author, COUNT(br.id)::int AS borrow_count, COUNT(DISTINCT b.id)::int as book_count\n            FROM borrow_records br\n            JOIN books b ON b.id = br.book_id\n            WHERE b.author IS NOT NULL AND b.author != ''\n            GROUP BY b.author\n            ORDER BY borrow_count DESC\n            LIMIT 5\n        `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch top authors' });
    }
}); 
export default router;
