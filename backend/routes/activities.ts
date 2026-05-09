import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../lib/db.js';
import { getSessionUser } from '../lib/session.js';
import { requirePermission } from '../lib/middleware.js';
import { getTeacherAccessContext, teacherHasAssignedLevel } from '../lib/teacher-access.js';

const router = Router();

async function readClassForActivity(classId: string) {
    const result = await pool.query<{ id: string; short_code: string | null; level: string | null }>(
        'SELECT id, short_code, level FROM classes WHERE id = $1',
        [classId],
    );

    return result.rows[0] ?? null;
}

async function ensureTeacherCanAccessClass(user: Awaited<ReturnType<typeof getSessionUser>>, classId: string) {
    if (!user) {
        return { ok: false as const, status: 401, error: 'Unauthorized' };
    }

    const classRow = await readClassForActivity(classId);
    if (!classRow) {
        return { ok: false as const, status: 404, error: 'Class not found' };
    }

    if (user.role !== 'teacher') {
        return { ok: true as const, classRow };
    }

    const teacherAccess = await getTeacherAccessContext(pool, user);
    if (!teacherHasAssignedLevel(teacherAccess.assignedLevels, classRow.level)) {
        return { ok: false as const, status: 403, error: 'Access denied for selected class' };
    }

    return { ok: true as const, classRow };
}

async function ensureTeacherOwnsActivity(user: Awaited<ReturnType<typeof getSessionUser>>, activityId: string) {
    if (!user) {
        return { ok: false as const, status: 401, error: 'Unauthorized' };
    }

    const result = await pool.query<{ id: string; teacher_id: string | null; total_marks: number }>(
        'SELECT id, teacher_id, total_marks FROM activities WHERE id = $1',
        [activityId],
    );

    const activity = result.rows[0];
    if (!activity) {
        return { ok: false as const, status: 404, error: 'Activity not found' };
    }

    if (user.role === 'teacher' && activity.teacher_id !== user.id) {
        return { ok: false as const, status: 403, error: 'Access denied for selected activity' };
    }

    return { ok: true as const, activity };
}

// Get all activities with filters
router.get('/', async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        const { class_id, date_from, date_to } = req.query;
        
        let sql = `
            SELECT a.*, 
                   c.name AS class_name,
                   c.short_code AS class_short_code,
                   u.name AS teacher_name,
                   COALESCE(marks_counts.marks_count, 0) AS marks_count,
                   COALESCE(student_counts.total_students, 0) AS total_students
            FROM activities a
            JOIN classes c ON c.id = a.class_id
            LEFT JOIN "user" u ON u.id = a.teacher_id
            LEFT JOIN (
                SELECT activity_id, COUNT(*) AS marks_count
                FROM activity_marks
                GROUP BY activity_id
            ) marks_counts ON marks_counts.activity_id = a.id
            LEFT JOIN (
                SELECT class_id, COUNT(*) AS total_students
                FROM students 
                WHERE is_active = true
                GROUP BY class_id
            ) student_counts ON student_counts.class_id = a.class_id
            WHERE a.is_active = true
        `;
        const params: any[] = [];
        let paramIndex = 1;

        if (class_id) {
            sql += ` AND a.class_id = $${paramIndex++}`;
            params.push(class_id);
        }

        if (date_from) {
            sql += ` AND a.date >= $${paramIndex++}`;
            params.push(date_from);
        }

        if (date_to) {
            sql += ` AND a.date <= $${paramIndex++}`;
            params.push(date_to);
        }

        // Teachers see their own activities, admins see all
        if (user?.role === 'teacher') {
            sql += ` AND a.teacher_id = $${paramIndex++}`;
            params.push(user.id);
        }

        sql += ` ORDER BY a.date DESC, a.created_at DESC`;

        const result = await pool.query(sql, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching activities:', error);
        res.status(500).json({ error: 'Failed to fetch activities' });
    }
});

// Get next activity ID for a class
router.get('/next-id/:classId', async (req: Request, res: Response) => {
    try {
        const classId = String(req.params.classId || '');

        const user = await getSessionUser(req);
        const classAccess = await ensureTeacherCanAccessClass(user, classId);
        if (!classAccess.ok) {
            res.status(classAccess.status).json({ error: classAccess.error });
            return;
        }

        const shortCode = classAccess.classRow.short_code;
        const result = await pool.query(
            'SELECT get_next_activity_id($1) AS next_id',
            [shortCode]
        );
        
        res.json({ nextId: result.rows[0].next_id, shortCode });
    } catch (error) {
        console.error('Error getting next activity ID:', error);
        res.status(500).json({ error: 'Failed to get next activity ID' });
    }
});

// Get single activity with student marks
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id || '');
        const user = await getSessionUser(req);
        
        // Get activity details
        const activityResult = await pool.query(
            `SELECT a.*, 
                    c.name AS class_name,
                    c.short_code AS class_short_code,
                    u.name AS teacher_name
             FROM activities a
             JOIN classes c ON c.id = a.class_id
             LEFT JOIN "user" u ON u.id = a.teacher_id
             WHERE a.id = $1`,
            [id]
        );
        
        if (activityResult.rows.length === 0) {
            res.status(404).json({ error: 'Activity not found' });
            return;
        }
        
        const activity = activityResult.rows[0];
        if (user?.role === 'teacher' && activity.teacher_id !== user.id) {
            res.status(403).json({ error: 'Access denied for selected activity' });
            return;
        }
        
        // Get students in class with their marks and attendance status
        const studentsResult = await pool.query(
            `SELECT s.id AS id,
                    s.name AS student_name,
                    s.avatar,
                    s.student_id AS student_code,
                    am.id AS mark_id,
                    am.marks_obtained,
                    a.total_marks,
                    att.status AS attendance_status
             FROM students s
             JOIN activities a ON a.class_id = s.class_id
             LEFT JOIN activity_marks am ON am.student_id = s.id AND am.activity_id = a.id
             LEFT JOIN attendance att ON att.student_id = s.id AND att.class_id = a.class_id AND att.date = a.date
             WHERE a.id = $1 AND s.is_active = true
             ORDER BY s.name`,
            [id]
        );
        
        res.json({
            ...activity,
            students: studentsResult.rows
        });
    } catch (error) {
        console.error('Error fetching activity:', error);
        res.status(500).json({ error: 'Failed to fetch activity' });
    }
});

const createActivitySchema = z.object({
    name: z.string().min(1, 'Name is required'),
    class_id: z.string().uuid('Invalid class ID'),
    date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date'),
    total_marks: z.number().positive('Total marks must be positive').nullable().optional(),
    activity_type: z.string().optional(),
});

// Create new activity
router.post('/', requirePermission('class_activities', 'manage'), async (req: Request, res: Response) => {
    try {
        const { name, class_id, date, total_marks, activity_type } = createActivitySchema.parse(req.body);
        const user = await getSessionUser(req);
        
        if (!total_marks) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        const classAccess = await ensureTeacherCanAccessClass(user, class_id);
        if (!classAccess.ok) {
            res.status(classAccess.status).json({ error: classAccess.error });
            return;
        }

        // Check attendance has been taken for this class on this date
        const attendanceCheck = await pool.query(
            'SELECT COUNT(*)::int AS count FROM attendance WHERE class_id = $1 AND date = $2',
            [class_id, date]
        );
        if (attendanceCheck.rows[0].count === 0) {
            res.status(400).json({ error: 'Attendance must be taken for this class before creating an activity for this date' });
            return;
        }

        const shortCode = classAccess.classRow.short_code;
        const idResult = await pool.query(
            'SELECT get_next_activity_id($1) AS next_id',
            [shortCode]
        );
        const activityId = idResult.rows[0].next_id;
        
        const result = await pool.query(
            `INSERT INTO activities (activity_id, name, class_id, teacher_id, date, total_marks, level, activity_type)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [activityId, name, class_id, user?.id || null, date, total_marks, classAccess.classRow.level, activity_type || 'test']
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating activity:', error);
        res.status(500).json({ error: 'Failed to create activity' });
    }
});

// Update activity
router.put('/:id', requirePermission('class_activities', 'manage'), async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id || '');
        const { name, date, total_marks, is_active, activity_type } = req.body;
        const user = await getSessionUser(req);

        const activityAccess = await ensureTeacherOwnsActivity(user, id);
        if (!activityAccess.ok) {
            res.status(activityAccess.status).json({ error: activityAccess.error });
            return;
        }
        
        const result = await pool.query(
            `UPDATE activities
             SET name = COALESCE($1, name),
                 date = COALESCE($2, date),
                 total_marks = COALESCE($3, total_marks),
                 is_active = COALESCE($4, is_active),
                 activity_type = COALESCE($5, activity_type),
                 updated_at = NOW()
             WHERE id = $6
             RETURNING *`,
            [name, date, total_marks, is_active, activity_type, id]
        );
        
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Activity not found' });
            return;
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating activity:', error);
        res.status(500).json({ error: 'Failed to update activity' });
    }
});

// Delete activity
router.delete('/:id', requirePermission('class_activities', 'manage'), async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id || '');
        const user = await getSessionUser(req);

        const activityAccess = await ensureTeacherOwnsActivity(user, id);
        if (!activityAccess.ok) {
            res.status(activityAccess.status).json({ error: activityAccess.error });
            return;
        }
        
        const result = await pool.query(
            'DELETE FROM activities WHERE id = $1 RETURNING *',
            [id]
        );
        
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Activity not found' });
            return;
        }
        
        res.json({ message: 'Activity deleted successfully' });
    } catch (error) {
        console.error('Error deleting activity:', error);
        res.status(500).json({ error: 'Failed to delete activity' });
    }
});

// Save/update student marks for an activity
router.post('/:id/marks', requirePermission('class_activities', 'manage'), async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        const id = String(req.params.id || '');
        const { marks } = req.body; // Array of { student_id, marks_obtained }
        const user = await getSessionUser(req);

        const activityAccess = await ensureTeacherOwnsActivity(user, id);
        if (!activityAccess.ok) {
            res.status(activityAccess.status).json({ error: activityAccess.error });
            return;
        }
        
        if (!Array.isArray(marks) || marks.length === 0) {
            res.status(400).json({ error: 'Marks array is required' });
            return;
        }
        
        // Get activity total marks for validation
        const totalMarks = activityAccess.activity.total_marks;
        
        // Validate marks don't exceed total
        for (const mark of marks) {
            if (mark.marks_obtained > totalMarks) {
                res.status(400).json({ 
                    error: `Marks cannot exceed total marks (${totalMarks})`,
                    student_id: mark.student_id
                });
                return;
            }
            if (mark.marks_obtained < 0) {
                res.status(400).json({ 
                    error: 'Marks cannot be negative',
                    student_id: mark.student_id
                });
                return;
            }
        }
        
        await client.query('BEGIN');
        
        // Insert or update marks
        for (const mark of marks) {
            await client.query(
                `INSERT INTO activity_marks (activity_id, student_id, marks_obtained)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (activity_id, student_id)
                 DO UPDATE SET marks_obtained = $3, updated_at = NOW()`,
                [id, mark.student_id, mark.marks_obtained]
            );
        }

        // Auto-set 0 for absent students who have no marks yet
        await client.query(
            `INSERT INTO activity_marks (activity_id, student_id, marks_obtained)
             SELECT $1, att.student_id, 0
             FROM attendance att
             JOIN activities a ON a.class_id = att.class_id AND a.date = att.date
             WHERE a.id = $1
               AND att.status = 'absent'
               AND NOT EXISTS (
                   SELECT 1 FROM activity_marks am
                   WHERE am.activity_id = $1 AND am.student_id = att.student_id
               )
             ON CONFLICT (activity_id, student_id) DO NOTHING`,
            [id]
        );
        
        await client.query('COMMIT');
        
        res.json({ 
            message: 'Marks saved successfully',
            count: marks.length
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error saving marks:', error);
        res.status(500).json({ error: 'Failed to save marks' });
    } finally {
        client.release();
    }
});

export default router;
