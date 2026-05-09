import { Router } from 'express';
import type { Request, Response } from 'express';
import { pool } from '../lib/db.js';
import { getSessionUser, getLevelFilter } from '../lib/session.js';
import { requirePermission } from '../lib/middleware.js';
import { getTeacherAccessContext, teacherHasAssignedLevel } from '../lib/teacher-access.js';

const router = Router();

async function getTeacherAttendanceScope(user: Awaited<ReturnType<typeof getSessionUser>>) {
    if (!user) {
        return { mode: 'levels' as const, assignedLevels: [], classes: [] };
    }

    const teacherAccess = await getTeacherAccessContext(pool, user);
    if (teacherAccess.isHomeroomTeacher && teacherAccess.homeroomClassId) {
        const classResult = await pool.query<{ id: string; name: string; level: string | null }>(
            'SELECT id, name, level FROM classes WHERE id = $1',
            [teacherAccess.homeroomClassId],
        );

        return {
            mode: 'homeroom' as const,
            assignedLevels: teacherAccess.assignedLevels,
            classes: classResult.rows,
        };
    }

    if (teacherAccess.assignedLevels.length === 0) {
        return {
            mode: 'levels' as const,
            assignedLevels: teacherAccess.assignedLevels,
            classes: [],
        };
    }

    const classResult = await pool.query<{ id: string; name: string; level: string | null }>(
        `SELECT id, name, level
         FROM classes
         WHERE level = ANY($1::text[])
         ORDER BY name ASC`,
        [teacherAccess.assignedLevels],
    );

    return {
        mode: 'levels' as const,
        assignedLevels: teacherAccess.assignedLevels,
        classes: classResult.rows,
    };
}

async function ensureTeacherCanAccessAttendanceClass(
    user: Awaited<ReturnType<typeof getSessionUser>>,
    classId: string,
) {
    if (!user) {
        return { ok: false as const, status: 401, error: 'Unauthorized' };
    }

    const classResult = await pool.query<{ id: string; name: string; level: string | null }>(
        'SELECT id, name, level FROM classes WHERE id = $1',
        [classId],
    );
    const classRow = classResult.rows[0];
    if (!classRow) {
        return { ok: false as const, status: 404, error: 'Class not found' };
    }

    if (user.role !== 'teacher') {
        return { ok: true as const, classRow };
    }

    const teacherScope = await getTeacherAttendanceScope(user);
    if (teacherScope.mode === 'homeroom') {
        const homeroomClass = teacherScope.classes[0];
        if (!homeroomClass || homeroomClass.id !== classId) {
            return { ok: false as const, status: 403, error: 'Access denied for selected class' };
        }

        return { ok: true as const, classRow };
    }

    if (!teacherHasAssignedLevel(teacherScope.assignedLevels, classRow.level)) {
        return { ok: false as const, status: 403, error: 'Access denied for selected class' };
    }

    return { ok: true as const, classRow };
}

// Get the homeroom class for the current teacher user
router.get('/my-class', async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        if (!user) { res.status(401).json({ error: 'Unauthorized' }); return; }

        if (user.role !== 'teacher') {
            res.json({ class_id: null, class_name: null });
            return;
        }

        const teacherScope = await getTeacherAttendanceScope(user);
        const homeroomClass = teacherScope.mode === 'homeroom' ? teacherScope.classes[0] : null;

        if (!homeroomClass) {
            res.json({ class_id: null, class_name: null });
            return;
        }

        res.json({ class_id: homeroomClass.id, class_name: homeroomClass.name });
    } catch (error) {
        console.error('Error fetching homeroom class:', error);
        res.status(500).json({ error: 'Failed to fetch homeroom class' });
    }
});

// Get attendance class access for the current user
router.get('/my-classes', async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        if (!user) { res.status(401).json({ error: 'Unauthorized' }); return; }

        if (user.role === 'teacher') {
            const teacherScope = await getTeacherAttendanceScope(user);
            res.json({ mode: teacherScope.mode, classes: teacherScope.classes });
            return;
        }

        const { clause, params } = getLevelFilter(user);
        const result = await pool.query(
            `SELECT id, name, level
             FROM classes
             WHERE 1=1 ${clause}
             ORDER BY name ASC`,
            params,
        );

        res.json({ mode: 'levels', classes: result.rows });
    } catch (error) {
        console.error('Error fetching attendance classes:', error);
        res.status(500).json({ error: 'Failed to fetch attendance classes' });
    }
});

// Check if attendance exists for a class on a given date
router.get('/check/:classId/:date', async (req: Request, res: Response) => {
    try {
        const classId = String(req.params.classId || '');
        const date = String(req.params.date || '');
        const user = await getSessionUser(req);

        if (user?.role === 'teacher') {
            const classAccess = await ensureTeacherCanAccessAttendanceClass(user, classId);
            if (!classAccess.ok) {
                res.status(classAccess.status).json({ error: classAccess.error });
                return;
            }
        }

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

        const where: string[] = ['1=1'];
        const params: unknown[] = [];
        let idx = 1;

        if (user?.role === 'teacher' && class_id) {
            const classAccess = await ensureTeacherCanAccessAttendanceClass(user, String(class_id));
            if (!classAccess.ok) {
                res.status(classAccess.status).json({ error: classAccess.error });
                return;
            }
        }

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

        if (user?.role === 'teacher') {
            const teacherScope = await getTeacherAttendanceScope(user);
            if (!class_id && teacherScope.mode === 'homeroom') {
                const homeroomClass = teacherScope.classes[0];
                if (!homeroomClass) {
                    res.json([]);
                    return;
                }

                where.push(`a.class_id = $${idx}`);
                params.push(homeroomClass.id);
                idx++;
            } else if (!class_id) {
                if (teacherScope.assignedLevels.length === 0) {
                    res.json([]);
                    return;
                }

                where.push(`c.level = ANY($${idx}::text[])`);
                params.push(teacherScope.assignedLevels);
                idx++;
            }
        } else {
            const { clause: levelClause, params: levelParams, paramOffset } = getLevelFilter(user, 'a', idx);
            if (levelClause) {
                where.push(levelClause.replace(/^AND\s+/, ''));
                params.push(...levelParams);
                idx = paramOffset;
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
             WHERE ${where.join(' AND ')}
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
        const user = await getSessionUser(req);
        const { class_id } = req.query;
        if (!class_id) {
            res.status(400).json({ error: 'class_id is required' });
            return;
        }

        if (user?.role === 'teacher') {
            const classAccess = await ensureTeacherCanAccessAttendanceClass(user, String(class_id));
            if (!classAccess.ok) {
                res.status(classAccess.status).json({ error: classAccess.error });
                return;
            }
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
        const classAccess = user?.role === 'teacher'
            ? await ensureTeacherCanAccessAttendanceClass(user, class_id)
            : null;
        if (classAccess && !classAccess.ok) {
            res.status(classAccess.status).json({ error: classAccess.error });
            return;
        }

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
