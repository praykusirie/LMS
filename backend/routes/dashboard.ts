import { Router } from 'express';
import type { Request, Response } from 'express';
import { pool } from '../lib/db.js';
import { getSessionUser, getLevelFilter } from '../lib/session.js';
import { getTeacherInstructionClasses } from '../lib/teacher-access.js';

const router = Router();

type TrendPeriod = 'week' | 'month' | '6months';
type LibraryPeriod = 'week' | 'month' | 'all';

function readTrendPeriod(value: unknown): TrendPeriod {
    if (value === 'month' || value === '6months') {
        return value;
    }

    return 'week';
}

function readLibraryPeriod(value: unknown, fallback: LibraryPeriod = 'month'): LibraryPeriod {
    if (value === 'week' || value === 'month' || value === 'all') {
        return value;
    }

    return fallback;
}

function getTimeWindowClause(period: TrendPeriod | LibraryPeriod, column: string): string {
    switch (period) {
        case 'week':
            return `AND ${column} >= date_trunc('day', NOW()) - interval '6 days'`;
        case 'month':
            return `AND ${column} >= date_trunc('day', NOW()) - interval '29 days'`;
        case '6months':
            return `AND ${column} >= date_trunc('month', NOW()) - interval '5 months'`;
        case 'all':
        default:
            return '';
    }
}

function buildBorrowingTrendsQuery(period: TrendPeriod, levelClause: string): string {
    const config = {
        week: {
            rangeStart: "date_trunc('day', NOW()) - interval '6 days'",
            rangeEnd: "date_trunc('day', NOW())",
            step: "interval '1 day'",
            truncUnit: 'day',
            labelFormat: 'Dy',
        },
        month: {
            rangeStart: "date_trunc('week', NOW()) - interval '4 weeks'",
            rangeEnd: "date_trunc('week', NOW())",
            step: "interval '1 week'",
            truncUnit: 'week',
            labelFormat: 'DD Mon',
        },
        '6months': {
            rangeStart: "date_trunc('month', NOW()) - interval '5 months'",
            rangeEnd: "date_trunc('month', NOW())",
            step: "interval '1 month'",
            truncUnit: 'month',
            labelFormat: 'Mon',
        },
    }[period];

    return `
        WITH series AS (
            SELECT generate_series(
                ${config.rangeStart},
                ${config.rangeEnd},
                ${config.step}
            ) AS bucket
        )
        SELECT
            to_char(series.bucket, '${config.labelFormat}') AS month,
            COALESCE(borrows.count, 0)::int AS borrows,
            COALESCE(returns.count, 0)::int AS returns
        FROM series
        LEFT JOIN (
            SELECT date_trunc('${config.truncUnit}', borrow_date) AS bucket, COUNT(*) AS count
            FROM borrow_records
            WHERE borrow_date >= ${config.rangeStart} ${levelClause}
            GROUP BY date_trunc('${config.truncUnit}', borrow_date)
        ) borrows ON borrows.bucket = series.bucket
        LEFT JOIN (
            SELECT date_trunc('${config.truncUnit}', return_date) AS bucket, COUNT(*) AS count
            FROM borrow_records
            WHERE return_date IS NOT NULL
                AND return_date >= ${config.rangeStart} ${levelClause}
            GROUP BY date_trunc('${config.truncUnit}', return_date)
        ) returns ON returns.bucket = series.bucket
        ORDER BY series.bucket ASC
    `;
}

// Get dashboard statistics
router.get('/stats', async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        const { clause: levBooks, params: levBooksP, paramOffset: p1 } = getLevelFilter(user, undefined, 1);
        const { clause: levBr, params: levBrP, paramOffset: p2 } = getLevelFilter(user, undefined, p1);
        const { clause: levSt, params: levStP, paramOffset: p3 } = getLevelFilter(user, undefined, p2);
        const { clause: levTch, params: levTchP } = getLevelFilter(user, undefined, p3);
        const allParams = [...levBooksP, ...levBrP, ...levStP, ...levTchP];

        const result = await pool.query(`
            SELECT
                (SELECT COUNT(*) FROM books WHERE is_active = true ${levBooks}) AS total_books,
                (SELECT COALESCE(SUM(quantity), 0) FROM books WHERE is_active = true ${levBooks}) AS total_copies,
                (SELECT COUNT(*) FROM borrow_records WHERE status = 'borrowed' ${levBr}) AS borrowed_books,
                (SELECT COUNT(*) FROM borrow_records WHERE status = 'overdue' ${levBr}) AS overdue_books,
                (SELECT COUNT(*) FROM students WHERE is_active = true ${levSt}) AS registered_students,
                (SELECT COUNT(*) FROM teachers WHERE 1=1 ${levTch}) AS total_teachers
        `, allParams);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

// Get borrowing trends (last 6 months)
router.get('/borrowing-trends', async (req: Request, res: Response) => {
    try {
        const period = readTrendPeriod(req.query.period);
        const user = await getSessionUser(req);
        const { clause: levelClause, params: levelParams } = getLevelFilter(user, undefined, 1);

        const result = await pool.query(buildBorrowingTrendsQuery(period, levelClause), levelParams);
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
        const { clause: levelClause, params: levelParams } = getLevelFilter(user, 'br', 1);

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
                WHERE br.status = 'borrowed' ${levelClause}
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
                WHERE br.status = 'returned' AND br.return_date IS NOT NULL ${levelClause}
                ORDER BY br.return_date DESC
                LIMIT 5
            )
            ORDER BY timestamp DESC
            LIMIT 10
        `, levelParams);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching recent activity:', error);
        res.status(500).json({ error: 'Failed to fetch recent activity' });
    }
});

// Teacher dashboard stats
router.get('/teacher-stats', async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        if (!user) return res.status(401).json({ error: 'Unauthorized' });

        const accessibleClasses = await getTeacherInstructionClasses(pool, user);
        const accessibleClassIds = accessibleClasses.map((classItem) => classItem.id);

        const statsRes = await pool.query(`
            SELECT
                (
                    SELECT COUNT(*)::int
                    FROM students s
                    WHERE s.class_id = ANY($1::uuid[])
                      AND s.is_active = true
                ) AS my_students,
                (
                    SELECT COUNT(*)::int
                    FROM activities a
                    WHERE a.teacher_id = $2
                      AND a.is_active = true
                ) AS activities_count
        `, [accessibleClassIds, user.id]);

        const perfRes = await pool.query(`
            SELECT
                COALESCE(
                    ROUND(AVG((am.marks_obtained::numeric / NULLIF(a.total_marks, 0)) * 100), 1),
                    0
                ) AS avg_score,
                COALESCE(
                    ROUND(COUNT(*) FILTER (WHERE am.marks_obtained >= a.total_marks * 0.4)::numeric /
                    NULLIF(COUNT(*), 0) * 100, 1), 0
                ) AS pass_rate
            FROM activity_marks am
            JOIN activities a ON a.id = am.activity_id
            WHERE a.teacher_id = $1
              AND a.is_active = true
        `, [user.id]);

        const activitiesRes = await pool.query(`
            SELECT a.id, a.name, a.date, a.total_marks, c.name AS class_name,
                   COUNT(am.id)::int AS marks_entered
            FROM activities a
            JOIN classes c ON c.id = a.class_id
            LEFT JOIN activity_marks am ON am.activity_id = a.id
            WHERE a.teacher_id = $1
              AND a.is_active = true
            GROUP BY a.id, a.name, a.date, a.total_marks, c.name, a.created_at
            ORDER BY a.date DESC, a.created_at DESC
            LIMIT 10
        `, [user.id]);

        const resultsRes = await pool.query(`
            SELECT a.name AS activity_name, c.name AS class_name, a.date,
                   a.total_marks,
                   COALESCE(ROUND(AVG(am.marks_obtained)::numeric, 1), 0) AS avg_marks,
                   COUNT(am.id)::int AS student_count
            FROM activities a
            JOIN classes c ON c.id = a.class_id
            LEFT JOIN activity_marks am ON am.activity_id = a.id
            WHERE a.teacher_id = $1
              AND a.is_active = true
            GROUP BY a.id, a.name, c.name, a.date, a.total_marks, a.created_at
            ORDER BY a.date DESC, a.created_at DESC
            LIMIT 10
        `, [user.id]);

        res.json({
            my_classes: accessibleClasses.length,
            ...statsRes.rows[0],
            ...perfRes.rows[0],
            recent_activities: activitiesRes.rows,
            recent_results: resultsRes.rows,
        });
    } catch (error) {
        console.error('Error fetching teacher stats:', error);
        res.status(500).json({ error: 'Failed to fetch teacher stats' });
    }
});

// Finance dashboard stats
router.get('/finance-stats', async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        if (!user) return res.status(401).json({ error: 'Unauthorized' });

        const summaryRes = await pool.query(`
            SELECT
                COALESCE(SUM(total_amount), 0)::numeric AS total_invoiced,
                COALESCE(SUM(total_paid), 0)::numeric AS total_paid,
                COALESCE(SUM(balance), 0)::numeric AS total_outstanding,
                COUNT(*) AS total_invoices,
                COUNT(*) FILTER (WHERE status = 'paid') AS paid_count,
                COUNT(*) FILTER (WHERE status = 'partial') AS partial_count,
                COUNT(*) FILTER (WHERE status = 'unpaid') AS unpaid_count
            FROM invoices
        `);

        const monthlyRes = await pool.query(`
            WITH months AS (
                SELECT generate_series(
                    date_trunc('month', NOW()) - interval '5 months',
                    date_trunc('month', NOW()),
                    interval '1 month'
                ) AS month
            )
            SELECT
                to_char(m.month, 'Mon') AS month,
                COALESCE(SUM(ip.amount), 0)::numeric AS revenue
            FROM months m
            LEFT JOIN invoice_payments ip ON date_trunc('month', ip.payment_date) = m.month
            GROUP BY m.month
            ORDER BY m.month ASC
        `);

        const recentPaymentsRes = await pool.query(`
            SELECT ip.id, ip.amount, ip.payment_date, ip.payment_method,
                   s.name AS student_name, i.invoice_number
            FROM invoice_payments ip
            JOIN invoices i ON i.id = ip.invoice_id
            JOIN students s ON s.id = i.student_id
            ORDER BY ip.payment_date DESC
            LIMIT 10
        `);

        const outstandingRes = await pool.query(`
            SELECT i.id, i.invoice_number, i.total_amount, i.total_paid,
                   i.balance,
                   s.name AS student_name, i.created_at
            FROM invoices i
            JOIN students s ON s.id = i.student_id
            WHERE i.status != 'paid'
            ORDER BY i.balance DESC
            LIMIT 10
        `);

        res.json({
            ...summaryRes.rows[0],
            monthly_revenue: monthlyRes.rows,
            recent_payments: recentPaymentsRes.rows,
            outstanding_invoices: outstandingRes.rows,
        });
    } catch (error) {
        console.error('Error fetching finance stats:', error);
        res.status(500).json({ error: 'Failed to fetch finance stats' });
    }
});


router.get('/library-category-distribution', async (req: Request, res: Response) => {
    try {
        const period = readLibraryPeriod(req.query.period, 'month');
        const user = await getSessionUser(req);
        const { clause: levelClause, params: levelParams } = getLevelFilter(user, 'br', 1);
        const timeClause = getTimeWindowClause(period, 'br.borrow_date');

        const result = await pool.query(`
            SELECT c.name, COUNT(br.id)::int AS circulation_count
            FROM borrow_records br
            JOIN books b ON b.id = br.book_id
            JOIN categories c ON c.id = b.category_id
            WHERE 1=1 ${levelClause} ${timeClause}
            GROUP BY c.id, c.name
            ORDER BY circulation_count DESC, c.name ASC
        `, levelParams);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching category distribution:', error);
        res.status(500).json({ error: 'Failed to fetch category distribution' });
    }
});


// Get Top Books
router.get('/library-top-books', async (req: Request, res: Response) => {
    try {
        const period = readLibraryPeriod(req.query.period, 'month');
        const user = await getSessionUser(req);
        const { clause: levelClause, params: levelParams } = getLevelFilter(user, 'br', 1);
        const timeClause = getTimeWindowClause(period, 'br.borrow_date');

        const result = await pool.query(`
            SELECT b.title, b.author, b.cover_image, COUNT(br.id)::int AS borrow_count
            FROM borrow_records br
            JOIN books b ON b.id = br.book_id
            WHERE 1=1 ${levelClause} ${timeClause}
            GROUP BY b.id, b.title, b.author, b.cover_image
            ORDER BY borrow_count DESC
            LIMIT 5
        `, levelParams);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching top books:', error);
        res.status(500).json({ error: 'Failed to fetch top books' });
    }
});

// Get Top Authors
router.get('/library-top-authors', async (req: Request, res: Response) => {
    try {
        const period = readLibraryPeriod(req.query.period, 'week');
        const user = await getSessionUser(req);
        const { clause: levelClause, params: levelParams } = getLevelFilter(user, 'br', 1);
        const timeClause = getTimeWindowClause(period, 'br.borrow_date');

        const result = await pool.query(`
            SELECT b.author, COUNT(br.id)::int AS borrow_count, COUNT(DISTINCT b.id)::int AS book_count
            FROM borrow_records br
            JOIN books b ON b.id = br.book_id
            WHERE b.author IS NOT NULL AND b.author != '' ${levelClause} ${timeClause}
            GROUP BY b.author
            ORDER BY borrow_count DESC
            LIMIT 5
        `, levelParams);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching top authors:', error);
        res.status(500).json({ error: 'Failed to fetch top authors' });
    }
});

export default router;



