import { Router } from 'express';
import type { Request, Response } from 'express';
import { pool } from '../lib/db.js';
import { getSessionUser, getLevelFilter } from '../lib/session.js';

const router = Router();

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
        const user = await getSessionUser(req);
        const { clause: levelClause, params: levelParams } = getLevelFilter(user, undefined, 1);

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
                WHERE borrow_date >= date_trunc('month', NOW()) - interval '5 months' ${levelClause}
                GROUP BY date_trunc('month', borrow_date)
            ) borrows ON borrows.month = m.month
            LEFT JOIN (
                SELECT date_trunc('month', return_date) AS month, COUNT(*) AS count
                FROM borrow_records
                WHERE return_date IS NOT NULL
                    AND return_date >= date_trunc('month', NOW()) - interval '5 months' ${levelClause}
                GROUP BY date_trunc('month', return_date)
            ) returns ON returns.month = m.month
            ORDER BY m.month ASC
        `, levelParams);
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

        const teacherRes = await pool.query(`SELECT id FROM teachers WHERE name = $1 LIMIT 1`, [user.name]);
        const teacherId = teacherRes.rows[0]?.id;

        if (!teacherId) {
            return res.json({
                my_classes: 0, my_students: 0, activities_count: 0,
                avg_score: 0, pass_rate: 0, recent_activities: [], recent_results: []
            });
        }

        const statsRes = await pool.query(`
            SELECT
                (SELECT COUNT(DISTINCT ct.class_id) FROM class_teachers ct WHERE ct.teacher_id = $1) AS my_classes,
                (SELECT COUNT(*) FROM students s
                 JOIN class_teachers ct ON ct.class_id = s.class_id
                 WHERE ct.teacher_id = $1 AND s.is_active = true) AS my_students,
                (SELECT COUNT(*) FROM class_activities ca
                 JOIN class_teachers ct ON ct.class_id = ca.class_id
                 WHERE ct.teacher_id = $1) AS activities_count
        `, [teacherId]);

        const perfRes = await pool.query(`
            SELECT
                COALESCE(AVG(cam.marks), 0)::numeric(5,1) AS avg_score,
                COALESCE(
                    ROUND(COUNT(*) FILTER (WHERE cam.marks >= ca.total_marks * 0.4)::numeric /
                    NULLIF(COUNT(*), 0) * 100, 1), 0
                ) AS pass_rate
            FROM class_activity_marks cam
            JOIN class_activities ca ON ca.id = cam.activity_id
            JOIN class_teachers ct ON ct.class_id = ca.class_id
            WHERE ct.teacher_id = $1
        `, [teacherId]);

        const activitiesRes = await pool.query(`
            SELECT ca.id, ca.name, ca.date, ca.total_marks, c.name AS class_name,
                   COUNT(cam.id) AS marks_entered
            FROM class_activities ca
            JOIN classes c ON c.id = ca.class_id
            JOIN class_teachers ct ON ct.class_id = ca.class_id
            LEFT JOIN class_activity_marks cam ON cam.activity_id = ca.id
            WHERE ct.teacher_id = $1
            GROUP BY ca.id, ca.name, ca.date, ca.total_marks, c.name
            ORDER BY ca.date DESC
            LIMIT 10
        `, [teacherId]);

        const resultsRes = await pool.query(`
            SELECT ca.name AS activity_name, c.name AS class_name, ca.date,
                   ca.total_marks,
                   COALESCE(AVG(cam.marks), 0)::numeric(5,1) AS avg_marks,
                   COUNT(cam.id) AS student_count
            FROM class_activities ca
            JOIN classes c ON c.id = ca.class_id
            JOIN class_teachers ct ON ct.class_id = ca.class_id
            LEFT JOIN class_activity_marks cam ON cam.activity_id = ca.id
            WHERE ct.teacher_id = $1
            GROUP BY ca.id, ca.name, c.name, ca.date, ca.total_marks
            ORDER BY ca.date DESC
            LIMIT 10
        `, [teacherId]);

        res.json({
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

export default router;
