import { Router } from 'express';
import type { Request, Response } from 'express';
import { pool } from '../lib/db.js';
import { getSessionUser } from '../lib/session.js';
import { requirePermission } from '../lib/middleware.js';
import {
    normalizeTeacherAssignedLevels,
    primaryTeacherAssignedLevel,
    validateHomeroomClassAssignment,
} from '../lib/teacher-access.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        const params: unknown[] = [];
        let levelClause = '';

        if (user && user.role !== 'admin' && user.level) {
            params.push(user.level);
            levelClause = `AND (
                $1 = ANY(COALESCE(t.assigned_levels, CASE WHEN t.level IS NOT NULL THEN ARRAY[t.level] ELSE ARRAY[]::text[] END))
                OR t.level = $1
            )`;
        }

        const result = await pool.query(
            `SELECT t.*,
                    COALESCE(
                        t.assigned_levels,
                        CASE WHEN t.level IS NOT NULL THEN ARRAY[t.level] ELSE ARRAY[]::text[] END
                    ) AS assigned_levels,
                    c.name AS homeroom_class_name
             FROM teachers t
             LEFT JOIN classes c ON c.id = t.homeroom_class_id
             WHERE 1=1 ${levelClause}
             ORDER BY t.created_at DESC`,
            params,
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching teachers:', error);
        res.status(500).json({ error: 'Failed to fetch teachers' });
    }
});

router.get('/next-id', async (_req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT get_next_teacher_id() AS next_id');
        res.json({ nextId: result.rows[0].next_id });
    } catch (error) {
        console.error('Error getting next teacher ID:', error);
        res.status(500).json({ error: 'Failed to get next teacher ID' });
    }
});

// Teacher overview — must be registered BEFORE /:id to avoid route conflict
router.get('/:id/overview', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const teacherResult = await pool.query(
            `SELECT t.*,
                    COALESCE(
                        t.assigned_levels,
                        CASE WHEN t.level IS NOT NULL THEN ARRAY[t.level] ELSE ARRAY[]::text[] END
                    ) AS assigned_levels,
                    c.name AS homeroom_class_name
             FROM teachers t
             LEFT JOIN classes c ON c.id = t.homeroom_class_id
             WHERE t.id = $1`,
            [id],
        );
        if (teacherResult.rows.length === 0) {
            res.status(404).json({ error: 'Teacher not found' });
            return;
        }
        const teacher = teacherResult.rows[0];

        // Resolve accessible class IDs from assigned levels
        const levels: string[] = Array.isArray(teacher.assigned_levels)
            ? teacher.assigned_levels
            : teacher.level
                ? [teacher.level]
                : [];

        const classIdsResult = levels.length > 0
            ? await pool.query<{ id: string }>(
                  'SELECT id FROM classes WHERE level = ANY($1::text[])',
                  [levels],
              )
            : teacher.homeroom_class_id
                ? await pool.query<{ id: string }>(
                      'SELECT id FROM classes WHERE id = $1',
                      [teacher.homeroom_class_id],
                  )
                : { rows: [] as { id: string }[] };

        const accessibleClassIds = classIdsResult.rows.map((r) => r.id);

        const statsResult = await pool.query(`
            SELECT
                (SELECT COUNT(*)::int
                 FROM students s
                 WHERE s.class_id = ANY($1::uuid[])
                   AND s.is_active = true) AS total_students,
                (SELECT COUNT(*)::int
                 FROM activities a
                 WHERE a.teacher_id = $2
                   AND a.is_active = true) AS total_activities,
                COALESCE(
                    (SELECT ROUND(AVG(
                        (am.marks_obtained::numeric / NULLIF(a.total_marks, 0)) * 100
                    ), 1)
                     FROM activity_marks am
                     JOIN activities a ON a.id = am.activity_id
                     WHERE a.teacher_id = $2
                       AND a.is_active = true),
                0) AS avg_score
        `, [accessibleClassIds, teacher.user_id || null]);

        const activitiesResult = await pool.query(
            `SELECT a.id, a.activity_id, a.name, a.date, a.total_marks,
                    c.name AS class_name,
                    COUNT(am.id)::int AS marks_entered
             FROM activities a
             JOIN classes c ON c.id = a.class_id
             LEFT JOIN activity_marks am ON am.activity_id = a.id
             WHERE a.teacher_id = $1
               AND a.is_active = true
             GROUP BY a.id, a.activity_id, a.name, a.date, a.total_marks, c.name, a.created_at
             ORDER BY a.date DESC, a.created_at DESC
             LIMIT 10`,
            [teacher.user_id || null],
        );

        res.json({
            teacher,
            stats: statsResult.rows[0],
            activities: activitiesResult.rows,
        });
    } catch (error) {
        console.error('Error fetching teacher overview:', error);
        res.status(500).json({ error: 'Failed to fetch teacher overview' });
    }
});

router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT t.*,
                    COALESCE(
                        t.assigned_levels,
                        CASE WHEN t.level IS NOT NULL THEN ARRAY[t.level] ELSE ARRAY[]::text[] END
                    ) AS assigned_levels,
                    c.name AS homeroom_class_name
             FROM teachers t
             LEFT JOIN classes c ON c.id = t.homeroom_class_id
             WHERE t.id = $1`,
            [id]
        );
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Teacher not found' });
            return;
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching teacher:', error);
        res.status(500).json({ error: 'Failed to fetch teacher' });
    }
});

router.post('/', requirePermission('teachers', 'create'), async (req: Request, res: Response) => {
    try {
        const { name, gender, is_homeroom_teacher, homeroom_class_id, level, assigned_levels } = req.body;
        const user = await getSessionUser(req);
        const normalizedName = String(name || '').trim();
        const assignedLevels = normalizeTeacherAssignedLevels(assigned_levels, level ?? user?.level ?? null);

        if (!normalizedName) {
            res.status(400).json({ error: 'Teacher name is required' });
            return;
        }

        if (assignedLevels.length === 0) {
            res.status(400).json({ error: 'At least one teacher level must be assigned' });
            return;
        }

        if (Boolean(is_homeroom_teacher) && !homeroom_class_id) {
            res.status(400).json({ error: 'Homeroom class is required for homeroom teachers' });
            return;
        }

        const homeroomValidation = await validateHomeroomClassAssignment(
            pool,
            Boolean(is_homeroom_teacher) ? homeroom_class_id || null : null,
            assignedLevels,
        );
        if (!homeroomValidation.ok) {
            res.status(homeroomValidation.status).json({ error: homeroomValidation.error });
            return;
        }

        const existing = await pool.query(
            `SELECT id,
                    COALESCE(
                        assigned_levels,
                        CASE WHEN level IS NOT NULL THEN ARRAY[level] ELSE ARRAY[]::text[] END
                    ) AS assigned_levels,
                    level
             FROM teachers
             WHERE LOWER(name) = LOWER($1)`,
            [normalizedName],
        );
        const hasLevelConflict = existing.rows.some((row) => {
            const existingLevels = normalizeTeacherAssignedLevels(row.assigned_levels, row.level);
            return existingLevels.some((teacherLevel) => assignedLevels.includes(teacherLevel));
        });
        if (hasLevelConflict) {
            res.status(409).json({ message: `Teacher "${normalizedName}" already exists for one of the selected levels` });
            return;
        }

        const nextIdResult = await pool.query('SELECT get_next_teacher_id() AS next_id');
        const teacherId = nextIdResult.rows[0].next_id;
        const result = await pool.query(
            `INSERT INTO teachers (
                teacher_id,
                name,
                gender,
                is_homeroom_teacher,
                homeroom_class_id,
                level,
                assigned_levels
            )
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
                teacherId,
                normalizedName,
                gender || 'male',
                Boolean(is_homeroom_teacher),
                is_homeroom_teacher ? homeroom_class_id || null : null,
                primaryTeacherAssignedLevel(assignedLevels),
                assignedLevels,
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating teacher:', error);
        res.status(500).json({ error: 'Failed to create teacher' });
    }
});

router.put('/:id', requirePermission('teachers', 'edit'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, gender, is_homeroom_teacher, homeroom_class_id, level, assigned_levels } = req.body;

        const currentResult = await pool.query(
            `SELECT id,
                    user_id,
                    name,
                    gender,
                    is_homeroom_teacher,
                    homeroom_class_id,
                    level,
                    COALESCE(
                        assigned_levels,
                        CASE WHEN level IS NOT NULL THEN ARRAY[level] ELSE ARRAY[]::text[] END
                    ) AS assigned_levels
             FROM teachers
             WHERE id = $1`,
            [id],
        );
        if (currentResult.rows.length === 0) {
            res.status(404).json({ error: 'Teacher not found' });
            return;
        }

        const currentTeacher = currentResult.rows[0];
        const normalizedName = String(name ?? currentTeacher.name ?? '').trim();
        const assignedLevels = normalizeTeacherAssignedLevels(
            assigned_levels,
            level ?? currentTeacher.assigned_levels ?? currentTeacher.level ?? null,
        );

        if (!normalizedName) {
            res.status(400).json({ error: 'Teacher name is required' });
            return;
        }

        if (assignedLevels.length === 0) {
            res.status(400).json({ error: 'At least one teacher level must be assigned' });
            return;
        }

        const homeroomFlag = Boolean(is_homeroom_teacher ?? currentTeacher.is_homeroom_teacher);
        const homeroomClassId = homeroomFlag
            ? (homeroom_class_id ?? currentTeacher.homeroom_class_id ?? null)
            : null;

        if (homeroomFlag && !homeroomClassId) {
            res.status(400).json({ error: 'Homeroom class is required for homeroom teachers' });
            return;
        }

        const homeroomValidation = await validateHomeroomClassAssignment(pool, homeroomClassId, assignedLevels);
        if (!homeroomValidation.ok) {
            res.status(homeroomValidation.status).json({ error: homeroomValidation.error });
            return;
        }

        const duplicateCheck = await pool.query(
            `SELECT id,
                    COALESCE(
                        assigned_levels,
                        CASE WHEN level IS NOT NULL THEN ARRAY[level] ELSE ARRAY[]::text[] END
                    ) AS assigned_levels,
                    level
             FROM teachers
             WHERE LOWER(name) = LOWER($1)
               AND id <> $2`,
            [normalizedName, id],
        );
        const hasLevelConflict = duplicateCheck.rows.some((row) => {
            const existingLevels = normalizeTeacherAssignedLevels(row.assigned_levels, row.level);
            return existingLevels.some((teacherLevel) => assignedLevels.includes(teacherLevel));
        });
        if (hasLevelConflict) {
            res.status(409).json({ message: `Teacher "${normalizedName}" already exists for one of the selected levels` });
            return;
        }

        const result = await pool.query(
            `UPDATE teachers
             SET name = $1,
                 gender = $2,
                 is_homeroom_teacher = $3,
                 homeroom_class_id = $4,
                 level = $5,
                 assigned_levels = $6,
                 updated_at = NOW()
             WHERE id = $7
             RETURNING *`,
            [
                normalizedName,
                gender || currentTeacher.gender || 'male',
                homeroomFlag,
                homeroomClassId,
                primaryTeacherAssignedLevel(assignedLevels),
                assignedLevels,
                id,
            ]
        );

        if (currentTeacher.user_id) {
            await pool.query(
                `UPDATE "user"
                 SET name = $1,
                     gender = $2,
                     level = $3,
                     is_homeroom_teacher = $4,
                     homeroom_class_id = $5
                 WHERE id = $6`,
                [
                    normalizedName,
                    gender || currentTeacher.gender || 'male',
                    primaryTeacherAssignedLevel(assignedLevels),
                    homeroomFlag,
                    homeroomClassId,
                    currentTeacher.user_id,
                ],
            );
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating teacher:', error);
        res.status(500).json({ error: 'Failed to update teacher' });
    }
});

router.delete('/:id', requirePermission('teachers', 'delete'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM teachers WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Teacher not found' });
            return;
        }
        res.json({ message: 'Teacher deleted successfully' });
    } catch (error) {
        console.error('Error deleting teacher:', error);
        res.status(500).json({ error: 'Failed to delete teacher' });
    }
});

export default router;
