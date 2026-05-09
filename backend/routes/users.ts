import { Router } from 'express';
import type { Request, Response } from 'express';
import { pool } from '../lib/db.js';
import { requirePermission } from '../lib/middleware.js';
import {
    normalizeTeacherAssignedLevels,
    primaryTeacherAssignedLevel,
    validateHomeroomClassAssignment,
} from '../lib/teacher-access.js';

const router = Router();

// Get all users with gender (better-auth listUsers doesn't return custom fields)
router.get('/', async (_req: Request, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT u.id,
                    u.name,
                    u.email,
                    u.role,
                    u.banned,
                    u.gender,
                    u.level,
                    u.is_homeroom_teacher,
                    u.homeroom_class_id,
                    u."createdAt",
                    t.teacher_id,
                    COALESCE(
                        t.assigned_levels,
                        CASE WHEN t.level IS NOT NULL THEN ARRAY[t.level] ELSE ARRAY[]::text[] END
                    ) AS assigned_levels
             FROM "user" u
             LEFT JOIN teachers t ON t.user_id = u.id
             ORDER BY "createdAt" DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Update user details (name, gender, role, homeroom)
router.put('/:id', requirePermission('users', 'manage'), async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { name, gender, role, level, assigned_levels, is_homeroom_teacher, homeroom_class_id } = req.body;

        const currentUserResult = await client.query(
            `SELECT id, name, role, level, gender, is_homeroom_teacher, homeroom_class_id
             FROM "user"
             WHERE id = $1`,
            [id],
        );
        if (currentUserResult.rows.length === 0) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const currentUser = currentUserResult.rows[0];
        const existingTeacherResult = await client.query(
            `SELECT id,
                    teacher_id,
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
             WHERE user_id = $1`,
            [id],
        );
        const existingTeacher = existingTeacherResult.rows[0] ?? null;
        const targetRole = role ?? currentUser.role;
        const teacherAssignedLevels = targetRole === 'teacher'
            ? normalizeTeacherAssignedLevels(
                assigned_levels,
                level ?? existingTeacher?.assigned_levels ?? existingTeacher?.level ?? currentUser.level ?? null,
            )
            : [];

        if (targetRole === 'teacher' && teacherAssignedLevels.length === 0) {
            res.status(400).json({ error: 'At least one teacher level must be assigned' });
            return;
        }

        const homeroomFlag = targetRole === 'teacher'
            ? Boolean(is_homeroom_teacher ?? existingTeacher?.is_homeroom_teacher ?? currentUser.is_homeroom_teacher)
            : false;
        const homeroomClassId = homeroomFlag
            ? (homeroom_class_id ?? existingTeacher?.homeroom_class_id ?? currentUser.homeroom_class_id ?? null)
            : null;

        if (targetRole === 'teacher') {
            if (homeroomFlag && !homeroomClassId) {
                res.status(400).json({ error: 'Homeroom class is required for homeroom teachers' });
                return;
            }

            const homeroomValidation = await validateHomeroomClassAssignment(
                client,
                homeroomClassId,
                teacherAssignedLevels,
            );
            if (!homeroomValidation.ok) {
                res.status(homeroomValidation.status).json({ error: homeroomValidation.error });
                return;
            }
        }

        const fields: string[] = [];
        const values: unknown[] = [];
        let idx = 1;

        if (name !== undefined) {
            fields.push(`name = $${idx++}`);
            values.push(name);
        }
        if (gender !== undefined) {
            fields.push(`gender = $${idx++}`);
            values.push(gender);
        }
        if (role !== undefined) {
            fields.push(`role = $${idx++}`);
            values.push(role);
        }
        if (level !== undefined) {
            fields.push(`level = $${idx++}`);
            values.push(targetRole === 'teacher' ? primaryTeacherAssignedLevel(teacherAssignedLevels) : level);
        } else if (targetRole === 'teacher' && assigned_levels !== undefined) {
            fields.push(`level = $${idx++}`);
            values.push(primaryTeacherAssignedLevel(teacherAssignedLevels));
        }
        if (is_homeroom_teacher !== undefined) {
            fields.push(`is_homeroom_teacher = $${idx++}`);
            values.push(homeroomFlag);
        }
        if (homeroom_class_id !== undefined) {
            fields.push(`homeroom_class_id = $${idx++}`);
            values.push(homeroomClassId);
        } else if (targetRole === 'teacher' && is_homeroom_teacher !== undefined) {
            fields.push(`homeroom_class_id = $${idx++}`);
            values.push(homeroomClassId);
        }

        if (fields.length === 0) {
            res.status(400).json({ error: 'No fields to update' });
            return;
        }

        await client.query('BEGIN');

        values.push(id);
        const result = await client.query(
            `UPDATE "user" SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, name, email, role, banned, gender, level, is_homeroom_teacher, homeroom_class_id, "createdAt"`,
            values
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const updatedUser = result.rows[0];

        // Auto-create/update teacher record when role is 'teacher'
        if (updatedUser.role === 'teacher') {
            const existingTeacher = await client.query(
                'SELECT id FROM teachers WHERE user_id = $1',
                [id]
            );

            const syncedAssignedLevels = normalizeTeacherAssignedLevels(
                assigned_levels,
                existingTeacherResult.rows[0]?.assigned_levels ?? updatedUser.level ?? null,
            );

            if (existingTeacher.rows.length === 0) {
                // Create new teacher record linked to user
                const nextIdResult = await client.query('SELECT get_next_teacher_id() AS next_id');
                const teacherId = nextIdResult.rows[0].next_id;
                await client.query(
                    `INSERT INTO teachers (
                        teacher_id,
                        name,
                        gender,
                        is_homeroom_teacher,
                        homeroom_class_id,
                        level,
                        assigned_levels,
                        user_id
                     )
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                    [
                        teacherId,
                        updatedUser.name,
                        updatedUser.gender || 'male',
                        homeroomFlag,
                        homeroomClassId,
                        primaryTeacherAssignedLevel(syncedAssignedLevels),
                        syncedAssignedLevels,
                        id,
                    ]
                );
            } else {
                // Sync teacher record with user data
                await client.query(
                    `UPDATE teachers
                     SET name = $1,
                         gender = $2,
                         is_homeroom_teacher = $3,
                         homeroom_class_id = $4,
                         level = $5,
                         assigned_levels = $6,
                         updated_at = NOW()
                     WHERE user_id = $7`,
                    [
                        updatedUser.name,
                        updatedUser.gender || 'male',
                        homeroomFlag,
                        homeroomClassId,
                        primaryTeacherAssignedLevel(syncedAssignedLevels),
                        syncedAssignedLevels,
                        id,
                    ]
                );
            }
        }

        await client.query('COMMIT');
        res.json(updatedUser);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    } finally {
        client.release();
    }
});

export default router;
