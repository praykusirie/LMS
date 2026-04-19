import { Router } from 'express';
import type { Request, Response } from 'express';
import { pool } from '../lib/db.js';
import { getSessionUser, getLevelFilter } from '../lib/session.js';
import { requirePermission } from '../lib/middleware.js';

const router = Router();

// Get the homeroom class for the current teacher user
router.get('/my-class', async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        if (!user) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const result = await pool.query(
            `SELECT u.homeroom_class_id AS class_id, c.name AS class_name
             FROM "user" u
             LEFT JOIN classes c ON c.id = u.homeroom_class_id
             WHERE u.id = $1 AND u.is_homeroom_teacher = TRUE`,
            [user.id]
        );

        if (result.rows.length === 0 || !result.rows[0].class_id) {
            res.json({ class_id: null, class_name: null });
            return;
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching homeroom class:', error);
        res.status(500).json({ error: 'Failed to fetch homeroom class' });
    }
});

// Check if attendance exists for a class on a given date
router.get('/check/:classId/:date', async (req: Request, res: Response) => {
    try {
        const { classId, date } = req.params;

        const result = await pool.query(
            `SELECT COUNT(*)::int AS count
             FROM attendance
             WHERE class_id = $1 AND date = $2`,
            [classId, date]
        );

        const taken = result.rows[0].count > 0;
        res.json({ taken, count: result.rows[0].count });
    } catch (error) {
        console.error('Error checking attendance:', error);
        res.status(500).json({ error: 'Failed to check attendance' });
    }
});

// Get attendance records for a class on a date
router.get('/', async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        const { class_id, date } = req.query;
        const { clause: levelClause, params: levelParams, paramOffset } = getLevelFilter(user, 'a');

        const where: string[] = ['1=1'];
        const params: unknown[] = [...levelParams];
        let idx = paramOffset;

        if (class_id) {
            where.push(`a.class_id = $${idx}`);
            params.push(class_id);
            idx++;
        }
        if (date) {
            where.push(`a.date = $${idx}`);
            params.push(date);
            idx++;
        }

        // Homeroom teachers see only their class
        if (user?.role === 'teacher') {
            const homeroom = await pool.query(
                `SELECT homeroom_class_id FROM "user" WHERE id = $1 AND is_homeroom_teacher = TRUE`,
                [user.id]
            );
            if (homeroom.rows.length > 0 && homeroom.rows[0].homeroom_class_id) {
                where.push(`a.class_id = $${idx}`);
                params.push(homeroom.rows[0].homeroom_class_id);
                idx++;
            }
        }

        const result = await pool.query(
            `SELECT a.id, a.class_id, a.date, a.student_id, a.status, a.recorded_by,
                    s.name AS student_name, s.admission_number, s.avatar,
                    c.name AS class_name,
                    u.name AS recorded_by_name
             FROM attendance a
             JOIN students s ON s.id = a.student_id
             JOIN classes c ON c.id = a.class_id
             LEFT JOIN "user" u ON u.id = a.recorded_by
             WHERE ${where.join(' AND ')} ${levelClause}
             ORDER BY s.name`,
            params
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching attendance:', error);
        res.status(500).json({ error: 'Failed to fetch attendance' });
    }
});

// Get attendance summary (list of dates with counts) for a class
router.get('/summary', async (req: Request, res: Response) => {
    try {
        const { class_id } = req.query;
        if (!class_id) {
            res.status(400).json({ error: 'class_id is required' });
            return;
        }

        const result = await pool.query(
            `SELECT date,
                    COUNT(*)::int AS total,
                    COUNT(*) FILTER (WHERE status = 'present')::int AS present,
                    COUNT(*) FILTER (WHERE status = 'absent')::int AS absent,
                    COUNT(*) FILTER (WHERE status = 'excused')::int AS excused
             FROM attendance
             WHERE class_id = $1
             GROUP BY date
             ORDER BY date DESC
             LIMIT 30`,
            [class_id]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching attendance summary:', error);
        res.status(500).json({ error: 'Failed to fetch attendance summary' });
    }
});

// Record or update attendance for a class + date
router.post('/', requirePermission('attendance', 'manage'), async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        const user = await getSessionUser(req);
        if (!user) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const { class_id, date, records } = req.body;
        // records: Array<{ student_id: string, status: 'present' | 'absent' | 'excused' }>

        if (!class_id || !date || !Array.isArray(records) || records.length === 0) {
            res.status(400).json({ error: 'class_id, date, and records array are required' });
            return;
        }

        // Validate statuses
        const validStatuses = ['present', 'absent', 'excused'];
        for (const record of records) {
            if (!record.student_id || !validStatuses.includes(record.status)) {
                res.status(400).json({ error: `Invalid record: student_id and valid status required` });
                return;
            }
        }

        // Get the class level for the records
        const classResult = await client.query('SELECT level FROM classes WHERE id = $1', [class_id]);
        const classLevel = classResult.rows[0]?.level || null;

        await client.query('BEGIN');

        for (const record of records) {
            await client.query(
                `INSERT INTO attendance (class_id, date, student_id, status, recorded_by, level)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (class_id, date, student_id)
                 DO UPDATE SET status = $4, recorded_by = $5, updated_at = NOW()`,
                [class_id, date, record.student_id, record.status, user.id, classLevel]
            );
        }

        await client.query('COMMIT');

        res.json({ message: 'Attendance recorded successfully', count: records.length });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error recording attendance:', error);
        res.status(500).json({ error: 'Failed to record attendance' });
    } finally {
        client.release();
    }
});

export default router;
