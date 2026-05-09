import { Router } from 'express';
import type { Request, Response } from 'express';
import * as XLSX from 'xlsx';
import { pool } from '../lib/db.js';
import { getSessionUser, getLevelFilter } from '../lib/session.js';
import { getTeacherInstructionClasses } from '../lib/teacher-access.js';

const router = Router();

// ── Helpers ──────────────────────────────────────────────────

function getDateRange(range: string): { dateFrom: string | null; dateTo: string | null } {
    const now = new Date();
    let dateFrom: string | null = null;
    const dateTo: string | null = now.toISOString();

    switch (range) {
        case 'today': {
            const d = new Date(now);
            d.setHours(0, 0, 0, 0);
            dateFrom = d.toISOString();
            break;
        }
        case 'this-week': {
            const d = new Date(now);
            d.setDate(d.getDate() - d.getDay());
            d.setHours(0, 0, 0, 0);
            dateFrom = d.toISOString();
            break;
        }
        case 'this-month': {
            const d = new Date(now.getFullYear(), now.getMonth(), 1);
            dateFrom = d.toISOString();
            break;
        }
        case 'this-year': {
            const d = new Date(now.getFullYear(), 0, 1);
            dateFrom = d.toISOString();
            break;
        }
        default:
            // all-time
            return { dateFrom: null, dateTo: null };
    }
    return { dateFrom, dateTo };
}

function buildDateClause(
    dateFrom: string | null,
    dateTo: string | null,
    col: string,
    paramIdx: number,
): { clause: string; params: unknown[]; nextIdx: number } {
    const parts: string[] = [];
    const params: unknown[] = [];
    let idx = paramIdx;
    if (dateFrom) {
        parts.push(`${col} >= $${idx}`);
        params.push(dateFrom);
        idx++;
    }
    if (dateTo) {
        parts.push(`${col} <= $${idx}`);
        params.push(dateTo);
        idx++;
    }
    return {
        clause: parts.length ? 'AND ' + parts.join(' AND ') : '',
        params,
        nextIdx: idx,
    };
}

// ── Overview ─────────────────────────────────────────────────

router.get('/overview', async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        const range = String(req.query.range || 'all-time');
        const { dateFrom, dateTo } = getDateRange(range);

        // Parameterized level filters for different table aliases
        const { clause: lev, params: levP, paramOffset: p1 } = getLevelFilter(user, undefined, 1);
        const { clause: levBr, params: levBrP, paramOffset: p2 } = getLevelFilter(user, 'br', p1);
        const statsParams = [...levP, ...levBrP];

        // Summary stats (no date filter — these are totals)
        const statsRes = await pool.query(`
            SELECT
                (SELECT COUNT(*) FROM books WHERE is_active = true ${lev}) AS total_books,
                (SELECT COALESCE(SUM(quantity), 0) FROM books WHERE is_active = true ${lev}) AS total_copies,
                (SELECT COUNT(*) FROM borrow_records br WHERE br.status = 'borrowed' ${levBr}) AS borrowed_books,
                (SELECT COUNT(*) FROM borrow_records br WHERE br.status = 'overdue' ${levBr}) AS overdue_books,
                (SELECT COUNT(*) FROM students WHERE is_active = true ${lev}) AS registered_students,
                (SELECT COUNT(*) FROM teachers WHERE 1=1 ${lev}) AS total_teachers
        `, statsParams);

        // Monthly borrowing activity (date-filtered)
        const { clause: levBrMonth, params: levBrMonthP, paramOffset: mNext } = getLevelFilter(user, 'br', 1);
        const monthlyParams: unknown[] = [...levBrMonthP];
        let mIdx = mNext;

        let monthFrom = "NOW() - interval '11 months'";
        if (dateFrom) {
            monthFrom = `$${mIdx}::timestamptz`;
            monthlyParams.push(dateFrom);
            mIdx++;
        }

        const monthlyRes = await pool.query(`
            WITH months AS (
                SELECT generate_series(
                    date_trunc('month', ${monthFrom}),
                    date_trunc('month', NOW()),
                    interval '1 month'
                ) AS month
            )
            SELECT
                to_char(m.month, 'Mon') AS month,
                COALESCE(borrows.count, 0)::int AS issues,
                COALESCE(returns.count, 0)::int AS returns
            FROM months m
            LEFT JOIN (
                SELECT date_trunc('month', borrow_date) AS month, COUNT(*) AS count
                FROM borrow_records br
                WHERE borrow_date >= date_trunc('month', ${monthFrom}) ${levBrMonth}
                GROUP BY 1
            ) borrows ON borrows.month = m.month
            LEFT JOIN (
                SELECT date_trunc('month', return_date) AS month, COUNT(*) AS count
                FROM borrow_records br
                WHERE return_date IS NOT NULL
                    AND return_date >= date_trunc('month', ${monthFrom}) ${levBrMonth}
                GROUP BY 1
            ) returns ON returns.month = m.month
            ORDER BY m.month ASC
        `, monthlyParams);

        // Books by category
        const { clause: levBCat, params: levBCatP } = getLevelFilter(user, 'b', 1);
        const categoryRes = await pool.query(`
            SELECT
                COALESCE(c.name, 'Uncategorized') AS name,
                COUNT(*)::int AS count
            FROM books b
            LEFT JOIN categories c ON c.id = b.category_id
            WHERE b.is_active = true ${levBCat}
            GROUP BY c.name
            ORDER BY count DESC
        `, levBCatP);
        const totalCat = categoryRes.rows.reduce((s: number, r: any) => s + r.count, 0);
        const categoryData = categoryRes.rows.map((r: any) => ({
            name: r.name,
            count: r.count,
            value: totalCat > 0 ? Math.round((r.count / totalCat) * 100) : 0,
        }));

        // Class-wise borrowing
        const { clause: levBrCw, params: levBrCwP } = getLevelFilter(user, 'br', 1);
        const classWiseRes = await pool.query(`
            SELECT
                cl.name AS class,
                COUNT(*) FILTER (WHERE br.status IN ('borrowed', 'overdue', 'returned'))::int AS borrowed,
                COUNT(*) FILTER (WHERE br.status = 'returned')::int AS returned,
                COUNT(*) FILTER (WHERE br.status = 'overdue')::int AS overdue
            FROM borrow_records br
            JOIN students s ON s.id = br.student_id
            JOIN classes cl ON cl.id = s.class_id
            WHERE 1=1 ${levBrCw}
            GROUP BY cl.name
            ORDER BY cl.name
        `, levBrCwP);

        // Top 5 borrowed books
        const { clause: levBrTop, params: levBrTopP } = getLevelFilter(user, 'br', 1);
        const topBooksRes = await pool.query(`
            SELECT b.title, b.author, COUNT(*)::int AS borrow_count
            FROM borrow_records br
            JOIN books b ON b.id = br.book_id
            WHERE 1=1 ${levBrTop}
            GROUP BY b.id, b.title, b.author
            ORDER BY borrow_count DESC
            LIMIT 5
        `, levBrTopP);

        // Top 5 borrowers
        const { clause: levBrBorr, params: levBrBorrP } = getLevelFilter(user, 'br', 1);
        const topBorrowersRes = await pool.query(`
            SELECT
                s.name,
                cl.name AS class,
                COUNT(*)::int AS borrow_count,
                CASE
                    WHEN COUNT(*) = 0 THEN 0
                    ELSE ROUND(COUNT(*) FILTER (WHERE br.status = 'returned')::numeric / COUNT(*) * 100)::int
                END AS return_rate
            FROM borrow_records br
            JOIN students s ON s.id = br.student_id
            JOIN classes cl ON cl.id = s.class_id
            WHERE 1=1 ${levBrBorr}
            GROUP BY s.id, s.name, cl.name
            ORDER BY borrow_count DESC
            LIMIT 5
        `, levBrBorrP);

        res.json({
            stats: statsRes.rows[0],
            monthlyActivity: monthlyRes.rows,
            categoryDistribution: categoryData,
            classWiseBorrowing: classWiseRes.rows,
            topBorrowedBooks: topBooksRes.rows,
            topBorrowers: topBorrowersRes.rows,
        });
    } catch (error) {
        console.error('Error fetching overview report:', error);
        res.status(500).json({ error: 'Failed to fetch overview report' });
    }
});

// ── Borrowing ────────────────────────────────────────────────

router.get('/borrowing', async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        const range = String(req.query.range || 'all-time');
        const search = String(req.query.search || '').trim();
        const sortBy = String(req.query.sortBy || 'date');
        const { dateFrom, dateTo } = getDateRange(range);
        const { clause: levelClause, params: levelParams, paramOffset } = getLevelFilter(user, 'br');

        const where: string[] = ['1=1'];
        const params: unknown[] = [...levelParams];
        let idx = paramOffset;

        if (search) {
            where.push(`(LOWER(b.title) LIKE LOWER($${idx}) OR LOWER(s.name) LIKE LOWER($${idx}))`);
            params.push(`%${search}%`);
            idx++;
        }
        if (dateFrom) {
            where.push(`br.borrow_date >= $${idx}`);
            params.push(dateFrom);
            idx++;
        }
        if (dateTo) {
            where.push(`br.borrow_date <= $${idx}`);
            params.push(dateTo);
            idx++;
        }

        const orderMap: Record<string, string> = {
            date: 'br.borrow_date DESC',
            student: 's.name ASC',
            book: 'b.title ASC',
            status: 'br.status ASC',
        };
        const order = orderMap[sortBy] || orderMap.date;

        const result = await pool.query(
            `SELECT
                br.id, b.title AS book_title, s.name AS student_name,
                br.borrow_date, br.due_date, br.return_date,
                CASE WHEN br.status = 'borrowed' AND br.due_date < NOW() THEN 'overdue' ELSE br.status END AS status
             FROM borrow_records br
             JOIN books b ON b.id = br.book_id
             JOIN students s ON s.id = br.student_id
             WHERE ${where.join(' AND ')} ${levelClause}
             ORDER BY ${order}`,
            params,
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching borrowing report:', error);
        res.status(500).json({ error: 'Failed to fetch borrowing report' });
    }
});

// ── Inventory ────────────────────────────────────────────────

router.get('/inventory', async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        const search = String(req.query.search || '').trim();
        const category = String(req.query.category || 'all');
        const { clause: levelClause, params: levelParams, paramOffset } = getLevelFilter(user, 'b');

        const where: string[] = ['b.is_active = true'];
        const params: unknown[] = [...levelParams];
        let idx = paramOffset;

        if (search) {
            where.push(`(LOWER(b.title) LIKE LOWER($${idx}) OR LOWER(b.author) LIKE LOWER($${idx}))`);
            params.push(`%${search}%`);
            idx++;
        }
        if (category !== 'all') {
            where.push(`c.name = $${idx}`);
            params.push(category);
            idx++;
        }

        // Stats
        const statsRes = await pool.query(`
            SELECT
                COUNT(*)::int AS total_titles,
                COALESCE(SUM(b.quantity), 0)::int AS total_copies,
                COALESCE(SUM(b.available), 0)::int AS available,
                COALESCE(SUM(b.quantity - b.available), 0)::int AS borrowed_out
            FROM books b
            LEFT JOIN categories c ON c.id = b.category_id
            WHERE ${where.join(' AND ')} ${levelClause}
        `, params);

        // Book list
        const booksRes = await pool.query(`
            SELECT
                b.id, b.title, b.author,
                COALESCE(c.name, 'Uncategorized') AS category,
                COALESCE(sub.name, '-') AS subject,
                b.quantity, b.available
            FROM books b
            LEFT JOIN categories c ON c.id = b.category_id
            LEFT JOIN subjects sub ON sub.id = b.subject_id
            WHERE ${where.join(' AND ')} ${levelClause}
            ORDER BY b.title
        `, params);

        // Categories for filter dropdown
        const categoriesRes = await pool.query(`SELECT name FROM categories WHERE is_active = true ORDER BY name`);

        res.json({
            stats: statsRes.rows[0],
            books: booksRes.rows,
            categories: categoriesRes.rows.map((r: any) => r.name),
        });
    } catch (error) {
        console.error('Error fetching inventory report:', error);
        res.status(500).json({ error: 'Failed to fetch inventory report' });
    }
});

// ── Students ─────────────────────────────────────────────────

router.get('/students', async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        const search = String(req.query.search || '').trim();
        const classId = String(req.query.classId || 'all');
        const { clause: levelClause, params: levelParams, paramOffset } = getLevelFilter(user, 's');

        const where: string[] = ['1=1'];
        const params: unknown[] = [...levelParams];
        let idx = paramOffset;

        if (search) {
            where.push(`(LOWER(s.name) LIKE LOWER($${idx}) OR LOWER(s.admission_number) LIKE LOWER($${idx}))`);
            params.push(`%${search}%`);
            idx++;
        }
        if (classId !== 'all') {
            where.push(`s.class_id = $${idx}`);
            params.push(classId);
            idx++;
        }

        // Stats
        const statsRes = await pool.query(`
            SELECT
                COUNT(*)::int AS total_students,
                COUNT(*) FILTER (WHERE s.is_active = true)::int AS active,
                (SELECT COUNT(DISTINCT br.student_id) FROM borrow_records br WHERE br.status IN ('borrowed', 'overdue'))::int AS with_borrows,
                (SELECT COUNT(DISTINCT br.student_id) FROM borrow_records br WHERE br.status = 'overdue')::int AS with_overdue
            FROM students s
            WHERE ${where.join(' AND ')} ${levelClause}
        `, params);

        // Student list
        const studentsRes = await pool.query(`
            SELECT
                s.id, s.name, s.admission_number, s.email, s.avatar, s.is_active,
                COALESCE(cl.name, '-') AS class_name,
                COALESCE(overdue.cnt, 0)::int AS overdue_count
            FROM students s
            LEFT JOIN classes cl ON cl.id = s.class_id
            LEFT JOIN (
                SELECT student_id, COUNT(*)::int AS cnt
                FROM borrow_records WHERE status = 'overdue'
                GROUP BY student_id
            ) overdue ON overdue.student_id = s.id
            WHERE ${where.join(' AND ')} ${levelClause}
            ORDER BY s.name
        `, params);

        // Classes for filter dropdown
        const classesRes = await pool.query(`SELECT id, name FROM classes WHERE is_active = true ORDER BY name`);

        res.json({
            stats: statsRes.rows[0],
            students: studentsRes.rows,
            classes: classesRes.rows,
        });
    } catch (error) {
        console.error('Error fetching students report:', error);
        res.status(500).json({ error: 'Failed to fetch students report' });
    }
});

// ── Overdue ──────────────────────────────────────────────────

router.get('/overdue', async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        const { clause: levelClause, params: levelParams, paramOffset } = getLevelFilter(user, 'br');

        // Stats
        const statsRes = await pool.query(`
            SELECT
                COUNT(*)::int AS total_overdue,
                COALESCE(AVG(EXTRACT(DAY FROM NOW() - br.due_date)), 0)::int AS avg_days_overdue
            FROM borrow_records br
            WHERE br.status = 'overdue' ${levelClause}
        `, levelParams);

        // Also catch borrowed records that are actually overdue
        const overdueRes = await pool.query(`
            SELECT
                br.id, b.title AS book_title, s.name AS student_name,
                br.due_date,
                GREATEST(EXTRACT(DAY FROM NOW() - br.due_date)::int, 0) AS days_overdue
            FROM borrow_records br
            JOIN books b ON b.id = br.book_id
            JOIN students s ON s.id = br.student_id
            WHERE (br.status = 'overdue' OR (br.status = 'borrowed' AND br.due_date < NOW())) ${levelClause}
            ORDER BY days_overdue DESC
        `, levelParams);

        res.json({
            stats: statsRes.rows[0],
            records: overdueRes.rows,
        });
    } catch (error) {
        console.error('Error fetching overdue report:', error);
        res.status(500).json({ error: 'Failed to fetch overdue report' });
    }
});

// ── Finance ──────────────────────────────────────────────────

router.get('/finance', async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        if (!user) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const range = String(req.query.range || 'all-time');
        const academicYear = String(req.query.academicYear || '').trim();
        const { dateFrom, dateTo } = getDateRange(range);

        const where: string[] = ['1=1'];
        const params: unknown[] = [];
        let idx = 1;

        if (academicYear) {
            where.push(`i.academic_year = $${idx}`);
            params.push(academicYear);
            idx++;
        }
        if (dateFrom) {
            where.push(`i.invoice_date >= $${idx}`);
            params.push(dateFrom);
            idx++;
        }
        if (dateTo) {
            where.push(`i.invoice_date <= $${idx}`);
            params.push(dateTo);
            idx++;
        }

        // Summary
        const summaryRes = await pool.query(`
            SELECT
                COALESCE(SUM(i.total_amount), 0)::numeric AS total_invoiced,
                COALESCE(SUM(i.total_paid), 0)::numeric AS total_paid,
                COALESCE(SUM(i.balance), 0)::numeric AS total_outstanding,
                COUNT(*)::int AS total_invoices,
                COUNT(*) FILTER (WHERE i.status = 'paid')::int AS paid_count,
                COUNT(*) FILTER (WHERE i.status = 'partial')::int AS partial_count,
                COUNT(*) FILTER (WHERE i.status = 'unpaid')::int AS unpaid_count
            FROM invoices i
            WHERE ${where.join(' AND ')}
        `, params);

        // Collection by year_group
        const byClassRes = await pool.query(`
            SELECT
                i.year_group,
                COALESCE(SUM(i.total_amount), 0)::numeric AS invoiced,
                COALESCE(SUM(i.total_paid), 0)::numeric AS collected,
                COALESCE(SUM(i.balance), 0)::numeric AS outstanding,
                COUNT(*)::int AS invoice_count
            FROM invoices i
            WHERE ${where.join(' AND ')}
            GROUP BY i.year_group
            ORDER BY i.year_group
        `, params);

        // Payment method breakdown
        const paymentDateWhere: string[] = ['1=1'];
        const payParams: unknown[] = [];
        let pIdx = 1;
        if (dateFrom) {
            paymentDateWhere.push(`ip.payment_date >= $${pIdx}`);
            payParams.push(dateFrom);
            pIdx++;
        }
        if (dateTo) {
            paymentDateWhere.push(`ip.payment_date <= $${pIdx}`);
            payParams.push(dateTo);
            pIdx++;
        }

        const payMethodRes = await pool.query(`
            SELECT
                ip.payment_method,
                COUNT(*)::int AS count,
                COALESCE(SUM(ip.amount), 0)::numeric AS total
            FROM invoice_payments ip
            WHERE ${paymentDateWhere.join(' AND ')}
            GROUP BY ip.payment_method
            ORDER BY total DESC
        `, payParams);

        // Outstanding balances by class
        const outstandingRes = await pool.query(`
            SELECT
                i.year_group,
                s.name AS student_name,
                i.invoice_number,
                i.total_amount::numeric,
                i.total_paid::numeric,
                i.balance::numeric,
                i.status
            FROM invoices i
            JOIN students s ON s.id = i.student_id
            WHERE i.balance > 0 ${academicYear ? `AND i.academic_year = $1` : ''}
            ORDER BY i.balance DESC
            LIMIT 50
        `, academicYear ? [academicYear] : []);

        // Academic years for filter  
        const yearsRes = await pool.query(`SELECT DISTINCT academic_year FROM invoices ORDER BY academic_year DESC`);

        res.json({
            summary: summaryRes.rows[0],
            collectionByClass: byClassRes.rows,
            paymentMethods: payMethodRes.rows,
            outstandingBalances: outstandingRes.rows,
            academicYears: yearsRes.rows.map((r: any) => r.academic_year),
        });
    } catch (error) {
        console.error('Error fetching finance report:', error);
        res.status(500).json({ error: 'Failed to fetch finance report' });
    }
});

// ── Teacher Overview ─────────────────────────────────────────

router.get('/teacher-overview', async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        if (!user) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const accessibleClasses = await getTeacherInstructionClasses(pool, user);
        const accessibleClassIds = accessibleClasses.map((classItem) => classItem.id);

        // Summary stats
        const summaryRes = await pool.query(`
            SELECT
                (
                    SELECT COUNT(*)::int
                    FROM students s
                    WHERE s.class_id = ANY($1::uuid[])
                      AND s.is_active = true
                ) AS total_students
        `, [accessibleClassIds]);

        // Performance across classes
        const perfRes = await pool.query(`
            SELECT
                c.name AS class_name,
                COUNT(DISTINCT a.id)::int AS activities_count,
                COALESCE(ROUND(AVG(am.marks_obtained)::numeric, 1), 0) AS avg_score,
                COALESCE(
                    ROUND(COUNT(*) FILTER (WHERE am.marks_obtained >= a.total_marks * 0.4)::numeric /
                    NULLIF(COUNT(*), 0) * 100, 1), 0
                )::numeric AS pass_rate,
                COUNT(DISTINCT am.student_id)::int AS students_assessed
            FROM classes c
            LEFT JOIN activities a ON a.class_id = c.id AND a.teacher_id = $2 AND a.is_active = true
            LEFT JOIN activity_marks am ON am.activity_id = a.id
            WHERE c.id = ANY($1::uuid[])
            GROUP BY c.id, c.name
            ORDER BY c.name
        `, [accessibleClassIds, user.id]);

        // Activity completion
        const actRes = await pool.query(`
            SELECT
                a.name AS activity_name,
                c.name AS class_name,
                a.date,
                a.total_marks,
                COUNT(am.id)::int AS marks_entered,
                (SELECT COUNT(*) FROM students s2 WHERE s2.class_id = c.id AND s2.is_active = true)::int AS total_students,
                COALESCE(ROUND(AVG(am.marks_obtained)::numeric, 1), 0) AS avg_marks
            FROM activities a
            JOIN classes c ON c.id = a.class_id
            LEFT JOIN activity_marks am ON am.activity_id = a.id
            WHERE a.teacher_id = $1
              AND a.is_active = true
            GROUP BY a.id, a.name, c.id, c.name, a.date, a.total_marks, a.created_at
            ORDER BY a.date DESC, a.created_at DESC
            LIMIT 20
        `, [user.id]);

        // Overall avg + pass rate
        const overallRes = await pool.query(`
            SELECT
                COALESCE(ROUND(AVG(am.marks_obtained)::numeric, 1), 0) AS avg_score,
                COALESCE(
                    ROUND(COUNT(*) FILTER (WHERE am.marks_obtained >= a.total_marks * 0.4)::numeric /
                    NULLIF(COUNT(*), 0) * 100, 1), 0
                )::numeric AS pass_rate
            FROM activity_marks am
            JOIN activities a ON a.id = am.activity_id
            WHERE a.teacher_id = $1
              AND a.is_active = true
        `, [user.id]);

        res.json({
            classPerformance: perfRes.rows,
            activityCompletion: actRes.rows,
            summary: {
                totalClasses: accessibleClasses.length,
                ...summaryRes.rows[0],
                avgScore: overallRes.rows[0]?.avg_score || 0,
                passRate: overallRes.rows[0]?.pass_rate || 0,
            },
        });
    } catch (error) {
        console.error('Error fetching teacher overview:', error);
        res.status(500).json({ error: 'Failed to fetch teacher overview' });
    }
});

// ── Export ────────────────────────────────────────────────────

router.get('/export/:section', async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        if (!user) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const { section } = req.params;
        const format = String(req.query.format || 'csv');
        const range = String(req.query.range || 'all-time');
        const { dateFrom, dateTo } = getDateRange(range);

        const isFiltered = user.role !== 'admin' && user.level;
        const lev = isFiltered ? `AND (level = '${user.level}' OR level IS NULL)` : '';
        const levBr = isFiltered ? `AND (br.level = '${user.level}' OR br.level IS NULL)` : '';

        let rows: Record<string, any>[] = [];
        let headers: string[] = [];
        let sheetName = 'Report';

        switch (section) {
            case 'borrowing': {
                sheetName = 'Borrowing Report';
                headers = ['Book', 'Student', 'Borrow Date', 'Due Date', 'Return Date', 'Status'];
                const result = await pool.query(`
                    SELECT b.title, s.name AS student, br.borrow_date, br.due_date, br.return_date,
                        CASE WHEN br.status = 'borrowed' AND br.due_date < NOW() THEN 'overdue' ELSE br.status END AS status
                    FROM borrow_records br
                    JOIN books b ON b.id = br.book_id
                    JOIN students s ON s.id = br.student_id
                    WHERE 1=1 ${levBr}
                    ORDER BY br.borrow_date DESC
                `);
                rows = result.rows.map(r => ({
                    Book: r.title,
                    Student: r.student,
                    'Borrow Date': r.borrow_date ? new Date(r.borrow_date).toLocaleDateString() : '',
                    'Due Date': r.due_date ? new Date(r.due_date).toLocaleDateString() : '',
                    'Return Date': r.return_date ? new Date(r.return_date).toLocaleDateString() : '-',
                    Status: r.status,
                }));
                break;
            }
            case 'inventory': {
                sheetName = 'Inventory Report';
                headers = ['Title', 'Author', 'Category', 'Subject', 'Total', 'Available', 'Status'];
                const result = await pool.query(`
                    SELECT b.title, b.author, COALESCE(c.name, '-') AS category,
                        COALESCE(sub.name, '-') AS subject, b.quantity, b.available
                    FROM books b
                    LEFT JOIN categories c ON c.id = b.category_id
                    LEFT JOIN subjects sub ON sub.id = b.subject_id
                    WHERE b.is_active = true ${lev.replace(/level/g, 'b.level')}
                    ORDER BY b.title
                `);
                rows = result.rows.map(r => ({
                    Title: r.title,
                    Author: r.author,
                    Category: r.category,
                    Subject: r.subject,
                    Total: r.quantity,
                    Available: r.available,
                    Status: r.available > 0 ? 'In Stock' : 'Out of Stock',
                }));
                break;
            }
            case 'students': {
                sheetName = 'Students Report';
                headers = ['Name', 'Admission No', 'Class', 'Status', 'Overdue Books'];
                const result = await pool.query(`
                    SELECT s.name, s.admission_number, COALESCE(cl.name, '-') AS class_name,
                        s.is_active, COALESCE(o.cnt, 0)::int AS overdue_count
                    FROM students s
                    LEFT JOIN classes cl ON cl.id = s.class_id
                    LEFT JOIN (SELECT student_id, COUNT(*)::int AS cnt FROM borrow_records WHERE status = 'overdue' GROUP BY student_id) o ON o.student_id = s.id
                    WHERE 1=1 ${lev.replace(/level/g, 's.level')}
                    ORDER BY s.name
                `);
                rows = result.rows.map(r => ({
                    Name: r.name,
                    'Admission No': r.admission_number,
                    Class: r.class_name,
                    Status: r.is_active ? 'Active' : 'Inactive',
                    'Overdue Books': r.overdue_count,
                }));
                break;
            }
            case 'overdue': {
                sheetName = 'Overdue Report';
                headers = ['Book', 'Student', 'Due Date', 'Days Overdue'];
                const result = await pool.query(`
                    SELECT b.title, s.name AS student, br.due_date,
                        GREATEST(EXTRACT(DAY FROM NOW() - br.due_date)::int, 0) AS days_overdue
                    FROM borrow_records br
                    JOIN books b ON b.id = br.book_id
                    JOIN students s ON s.id = br.student_id
                    WHERE (br.status = 'overdue' OR (br.status = 'borrowed' AND br.due_date < NOW())) ${levBr}
                    ORDER BY days_overdue DESC
                `);
                rows = result.rows.map(r => ({
                    Book: r.title,
                    Student: r.student,
                    'Due Date': r.due_date ? new Date(r.due_date).toLocaleDateString() : '',
                    'Days Overdue': r.days_overdue,
                }));
                break;
            }
            case 'finance': {
                sheetName = 'Finance Report';
                headers = ['Student', 'Invoice No', 'Year Group', 'Total Amount', 'Paid', 'Balance', 'Status'];
                const result = await pool.query(`
                    SELECT s.name, i.invoice_number, i.year_group, i.total_amount, i.total_paid, i.balance, i.status
                    FROM invoices i
                    JOIN students s ON s.id = i.student_id
                    ORDER BY i.created_at DESC
                `);
                rows = result.rows.map(r => ({
                    Student: r.name,
                    'Invoice No': r.invoice_number,
                    'Year Group': r.year_group,
                    'Total Amount': Number(r.total_amount),
                    Paid: Number(r.total_paid),
                    Balance: Number(r.balance),
                    Status: r.status,
                }));
                break;
            }
            default: {
                res.status(400).json({ error: `Unknown section: ${section}` });
                return;
            }
        }

        if (rows.length === 0) {
            res.status(404).json({ error: 'No data to export' });
            return;
        }

        const dateStr = new Date().toISOString().slice(0, 10);
        const filename = `${sheetName.replace(/\s+/g, '-').toLowerCase()}-${dateStr}`;

        if (format === 'csv') {
            const csvHeaders = headers.join(',');
            const csvRows = rows.map(r => headers.map(h => {
                const val = String(r[h] ?? '');
                return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
            }).join(','));
            const csv = [csvHeaders, ...csvRows].join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
            res.send(csv);
        } else if (format === 'xlsx' || format === 'excel') {
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
            const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
            res.send(buf);
        } else if (format === 'pdf') {
            // Generate a simple PDF table
            try {
                const PDFDocument = (await import('pdfkit')).default;
                const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
                const buffers: Buffer[] = [];
                doc.on('data', (chunk: Buffer) => buffers.push(chunk));
                doc.on('end', () => {
                    const pdf = Buffer.concat(buffers);
                    res.setHeader('Content-Type', 'application/pdf');
                    res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
                    res.send(pdf);
                });

                // Title
                doc.fontSize(18).font('Helvetica-Bold').text('ShulePro LMS', { align: 'center' });
                doc.fontSize(14).font('Helvetica').text(sheetName, { align: 'center' });
                doc.fontSize(9).text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
                doc.moveDown(1);

                // Table
                const colWidths = headers.map(() => Math.floor((doc.page.width - 80) / headers.length));
                const startX = 40;
                let y = doc.y;

                // Header row
                doc.font('Helvetica-Bold').fontSize(8);
                headers.forEach((h, i) => {
                    doc.text(h, startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y, {
                        width: colWidths[i], align: 'left',
                    });
                });
                y += 15;
                doc.moveTo(startX, y).lineTo(doc.page.width - 40, y).stroke();
                y += 5;

                // Data rows
                doc.font('Helvetica').fontSize(7);
                for (const row of rows) {
                    if (y > doc.page.height - 60) {
                        doc.addPage();
                        y = 40;
                    }
                    headers.forEach((h, i) => {
                        const val = String(row[h] ?? '');
                        doc.text(val, startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y, {
                            width: colWidths[i], align: 'left',
                        });
                    });
                    y += 13;
                }

                doc.end();
            } catch {
                // pdfkit not installed — fallback to CSV
                res.status(400).json({ error: 'PDF export requires pdfkit. Install it with: npm install pdfkit' });
            }
        } else {
            res.status(400).json({ error: `Unknown format: ${format}` });
        }
    } catch (error) {
        console.error('Error exporting report:', error);
        res.status(500).json({ error: 'Failed to export report' });
    }
});

export default router;
