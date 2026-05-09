import { Router } from 'express';
import type { Request, Response } from 'express';
import { pool, withTransaction } from '../lib/db.js';
import { getSessionUser, getLevelFilter } from '../lib/session.js';
import { requirePermission } from '../lib/middleware.js';
import { sendEmail } from '../lib/email.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        const status = String(req.query.status || '').toLowerCase();
        const search = String(req.query.search || '').trim();
        const { clause: levelClause, params: levelParams, paramOffset } = getLevelFilter(user, 'br');

        const where: string[] = ['1=1'];
        const params: unknown[] = [...levelParams];
        let idx = paramOffset;

        if (status === 'active') {
            where.push(`(br.status IN ('borrowed', 'overdue'))`);
        } else if (status === 'overdue') {
            where.push(`(br.status = 'borrowed' AND br.due_date < NOW())`);
        } else if (status) {
            where.push(`br.status = $${idx}`);
            params.push(status);
            idx += 1;
        }

        if (search) {
            where.push(`(
                LOWER(b.title) LIKE LOWER($${idx}) OR
                LOWER(s.name) LIKE LOWER($${idx}) OR
                LOWER(COALESCE(s.student_id, s.admission_number, '')) LIKE LOWER($${idx})
            )`);
            params.push(`%${search}%`);
            idx += 1;
        }

        const result = await pool.query(
            `SELECT
                br.*,
                b.title AS book_title,
                s.name AS student_name,
                COALESCE(s.student_id, s.admission_number, '') AS student_code,
                CASE
                    WHEN br.status = 'borrowed' AND br.due_date < NOW() THEN 'overdue'
                    ELSE br.status
                END AS current_status
             FROM borrow_records br
             JOIN books b ON b.id = br.book_id
             JOIN students s ON s.id = br.student_id
             WHERE ${where.join(' AND ')} ${levelClause}
             ORDER BY br.borrow_date DESC`,
            params,
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching borrow records:', error);
        res.status(500).json({ error: 'Failed to fetch borrow records' });
    }
});

router.post('/', requirePermission('borrow', 'manage'), async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        if (!user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const { student_id, book_id, due_date } = req.body as {
            student_id?: string;
            book_id?: string;
            due_date?: string;
        };

        if (!student_id || !book_id || !due_date) {
            res.status(400).json({ error: 'student_id, book_id and due_date are required' });
            return;
        }

        const resultRecord = await withTransaction(async (client) => {
            const studentResult = await client.query(
                'SELECT id, is_active FROM students WHERE id = $1 FOR UPDATE',
                [student_id]
            );
            
            const bookResult = await client.query(
                'SELECT id, title, available, level FROM books WHERE id = $1 FOR UPDATE',
                [book_id]
            );

            if (studentResult.rows.length === 0 || !studentResult.rows[0].is_active) {
                throw new Error('Active student not found');
            }

            if (bookResult.rows.length === 0) {
                throw new Error('Book not found');
            }

            if (Number(bookResult.rows[0].available || 0) <= 0) {
                throw new Error('This book is currently out of stock');
            }

            const activeBorrowResult = await client.query(
                `SELECT COUNT(*)::int AS count
                 FROM borrow_records
                 WHERE student_id = $1
                   AND status IN ('borrowed', 'overdue')`,
                [student_id],
            );

            if (Number(activeBorrowResult.rows[0]?.count || 0) >= 3) {
                throw new Error('Student has reached the maximum borrow limit (3 books)');
            }

            const recordLevel = (bookResult.rows[0].level as string | null) ?? user.level ?? null;

            const insertResult = await client.query(
                `INSERT INTO borrow_records (book_id, student_id, borrowed_by, due_date, status, level)
                 VALUES ($1, $2, $3, $4::timestamptz, 'borrowed', $5)
                 RETURNING *`,
                [book_id, student_id, user.id, due_date, recordLevel],
            );

            return insertResult.rows[0];
        });

        const result = await pool.query(
            `SELECT
                br.*,
                b.title AS book_title,
                s.name AS student_name,
                COALESCE(s.student_id, s.admission_number, '') AS student_code,
                CASE
                    WHEN br.status = 'borrowed' AND br.due_date < NOW() THEN 'overdue'
                    ELSE br.status
                END AS current_status
             FROM borrow_records br
             JOIN books b ON b.id = br.book_id
             JOIN students s ON s.id = br.student_id
             WHERE br.id = $1`,
            [resultRecord.id],
        );

        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        console.error('Error issuing book:', error);
        
        // Handle predictable logic errors thrown in the transaction
        if (['Active student not found', 'Book not found'].includes(error.message)) {
            res.status(404).json({ error: error.message });
            return;
        }
        if (['This book is currently out of stock', 'Student has reached the maximum borrow limit (3 books)'].includes(error.message)) {
            res.status(400).json({ error: error.message });
            return;
        }

        res.status(500).json({ error: 'Failed to issue book' });
    }
});

router.patch('/:id/return', requirePermission('borrow', 'manage'), async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        if (!user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const { id } = req.params;

        const existingResult = await pool.query(
            `SELECT br.*, b.title AS book_title
             FROM borrow_records br
             JOIN books b ON b.id = br.book_id
             WHERE br.id = $1`,
            [id],
        );

        if (existingResult.rows.length === 0) {
            res.status(404).json({ error: 'Borrow record not found' });
            return;
        }

        const existing = existingResult.rows[0];
        if (existing.status === 'returned') {
            res.status(400).json({ error: 'Book is already returned' });
            return;
        }

        const dueDate = new Date(existing.due_date);
        const now = new Date();
        let lateDays = 0;
        let fineAmount = 0;

        if (now > dueDate) {
            lateDays = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            fineAmount = lateDays * 1000;
        }

        const updateResult = await pool.query(
            `UPDATE borrow_records
             SET status = 'returned',
                 return_date = NOW(),
                 fine_amount = $1,
                 notes = CASE WHEN $2 > 0 THEN CONCAT('Late by ', $2::text, ' days') ELSE notes END,
                 updated_at = NOW()
             WHERE id = $3
             RETURNING *`,
            [fineAmount, lateDays, id],
        );

        const result = await pool.query(
            `SELECT
                br.*,
                b.title AS book_title,
                s.name AS student_name,
                COALESCE(s.student_id, s.admission_number, '') AS student_code,
                'returned'::text AS current_status
             FROM borrow_records br
             JOIN books b ON b.id = br.book_id
             JOIN students s ON s.id = br.student_id
             WHERE br.id = $1`,
            [updateResult.rows[0].id],
        );

        res.json({
            ...result.rows[0],
            late_days: lateDays,
            penalty: fineAmount,
        });
    } catch (error) {
        console.error('Error returning book:', error);
        res.status(500).json({ error: 'Failed to return book' });
    }
});

router.post('/:id/remind', requirePermission('overdue', 'manage'), async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        if (!user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const { id } = req.params;
        const result = await pool.query(
            `SELECT br.*, b.title AS book_title, u.email, u.name AS student_name
             FROM borrow_records br
             JOIN books b ON b.id = br.book_id
             JOIN students s ON s.id = br.student_id
             JOIN "user" u ON u.id = s.user_id
             WHERE br.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Borrow record not found' });
            return;
        }

        const record = result.rows[0];
        
        if (!record.email) {
            res.status(400).json({ error: 'Student does not have an attached email' });
            return;
        }
        
        const daysOverdue = Math.ceil((new Date().getTime() - new Date(record.due_date).getTime()) / (1000 * 60 * 60 * 24));

        await sendEmail({
            to: record.email,
            subject: 'Library Book Overdue Notice — ShulePro LMS',
            html: `
                <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
                    <h2 style="color:#e11d48">Overdue Book Notice</h2>
                    <p>Hi ${record.student_name},</p>
                    <p>This is a reminder that the following book is currently overdue:</p>
                    <div style="background:#f1f5f9;padding:12px;border-radius:8px;margin:16px 0">
                        <p style="margin:0;font-weight:bold">${record.book_title}</p>
                        <p style="margin:4px 0 0 0;color:#64748b;font-size:14px">Overdue by: ${daysOverdue} day(s)</p>
                    </div>
                    <p>Please return the book to the library as soon as possible.</p>
                </div>
            `
        });

        res.json({ success: true, message: 'Reminder sent' });
    } catch (error) {
        console.error('Error sending reminder:', error);
        res.status(500).json({ error: 'Failed to send reminder' });
    }
});

export default router;
