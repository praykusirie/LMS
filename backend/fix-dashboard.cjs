const fs = require('fs');
let file = 'routes/dashboard.ts';
let content = fs.readFileSync(file, 'utf8');

const topBooksIndex = content.indexOf('// Get Top Books');
if (topBooksIndex > -1) {
  content = content.substring(0, topBooksIndex);
}

const appendix = \// Get Top Books
router.get('/library-top-books', async (req: Request, res: Response) => {
    try {
        const result = await pool.query(\\\
            SELECT b.title, b.author, COUNT(br.id)::int AS borrow_count
            FROM borrow_records br
            JOIN books b ON b.id = br.book_id
            GROUP BY b.id, b.title, b.author
            ORDER BY borrow_count DESC
            LIMIT 5
        \\\);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch top books' });
    }
});

// Get Top Authors
router.get('/library-top-authors', async (req: Request, res: Response) => {
    try {
        const result = await pool.query(\\\
            SELECT b.author, COUNT(br.id)::int AS borrow_count, COUNT(DISTINCT b.id)::int as book_count
            FROM borrow_records br
            JOIN books b ON b.id = br.book_id
            WHERE b.author IS NOT NULL AND b.author != ''
            GROUP BY b.author
            ORDER BY borrow_count DESC
            LIMIT 5
        \\\);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch top authors' });
    }
});

export default router;
\;

fs.writeFileSync(file, content + appendix);
console.log('Fixed dashboard.ts');
