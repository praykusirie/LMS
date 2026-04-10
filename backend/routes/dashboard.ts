import { Router } from 'express';
import type { Request, Response } from 'express';
import { pool } from '../lib/db.js';
import { getSessionUser } from '../lib/session.js';

const router = Router();

// Get dashboard statistics
router.get('/stats', async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        const isFiltered = user && user.role !== 'admin' && user.level;
        const levelCondOr = isFiltered ? `AND (level = '${user.level}' OR level IS NULL)` : '';

        const result = await pool.query(`
            SELECT
                (SELECT COUNT(*) FROM books WHERE is_active = true ${levelCondOr}) AS total_books,
                (SELECT COALESCE(SUM(quantity), 0) FROM books WHERE is_active = true ${levelCondOr}) AS total_copies,
                (SELECT COUNT(*) FROM borrow_records WHERE status = 'borrowed' ${levelCondOr}) AS borrowed_books,
                (SELECT COUNT(*) FROM borrow_records WHERE status = 'overdue' ${levelCondOr}) AS overdue_books,
                (SELECT COUNT(*) FROM students WHERE is_active = true ${levelCondOr}) AS registered_students,
                (SELECT COUNT(*) FROM teachers WHERE 1=1 ${levelCondOr}) AS total_teachers
        `);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

// Get borrowing trends (last 6 months)
router.get('/borrowing-trends', async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        const isFiltered = user && user.role !== 'admin' && user.level;
        const levelCondOr = isFiltered ? `AND (level = '${user.level}' OR level IS NULL)` : '';

        const result = await pool.query(`
            WITH months AS (
                SELECT generate_series(
                    date_trunc('month', NOW()) - interval '5 months',
                    date_trunc('month', NOW()),
                    interval '1 month'
                ) AS month
            )
            SELECT
                to_char(m.month, 'Mon') AS month,
                COALESCE(borrows.count, 0)::int AS borrows,
                COALESCE(returns.count, 0)::int AS returns
            FROM months m
            LEFT JOIN (
                SELECT date_trunc('month', borrow_date) AS month, COUNT(*) AS count
                FROM borrow_records
                WHERE borrow_date >= date_trunc('month', NOW()) - interval '5 months' ${levelCondOr}
                GROUP BY date_trunc('month', borrow_date)
            ) borrows ON borrows.month = m.month
            LEFT JOIN (
                SELECT date_trunc('month', return_date) AS month, COUNT(*) AS count
                FROM borrow_records
                WHERE return_date IS NOT NULL
                    AND return_date >= date_trunc('month', NOW()) - interval '5 months' ${levelCondOr}
                GROUP BY date_trunc('month', return_date)
            ) returns ON returns.month = m.month
            ORDER BY m.month ASC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching borrowing trends:', error);
        res.status(500).json({ error: 'Failed to fetch borrowing trends' });
    }
});

// Get recent activity
router.get('/recent-activity', async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        const isFiltered = user && user.role !== 'admin' && user.level;
        const levelCondOr = isFiltered ? `AND (br.level = '${user.level}' OR br.level IS NULL)` : '';

        const result = await pool.query(`
            (
                SELECT
                    br.id,
                    'borrow' AS type,
                    'borrowed "' || b.title || '"' AS description,
                    s.name AS user_name,
                    s.gender AS user_gender,
                    br.borrow_date AS timestamp
                FROM borrow_records br
                JOIN books b ON b.id = br.book_id
                JOIN students s ON s.id = br.student_id
                WHERE br.status = 'borrowed' ${levelCondOr}
                ORDER BY br.borrow_date DESC
                LIMIT 5
            )
            UNION ALL
            (
                SELECT
                    br.id,
                    'return' AS type,
                    'returned "' || b.title || '"' AS description,
                    s.name AS user_name,
                    s.gender AS user_gender,
                    br.return_date AS timestamp
                FROM borrow_records br
                JOIN books b ON b.id = br.book_id
                JOIN students s ON s.id = br.student_id
                WHERE br.status = 'returned' AND br.return_date IS NOT NULL ${levelCondOr}
                ORDER BY br.return_date DESC
                LIMIT 5
            )
            ORDER BY timestamp DESC
            LIMIT 10
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching recent activity:', error);
        res.status(500).json({ error: 'Failed to fetch recent activity' });
    }
});

export default router;
