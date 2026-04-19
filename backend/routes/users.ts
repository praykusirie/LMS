import { Router } from 'express';
import type { Request, Response } from 'express';
import { pool } from '../lib/db.js';
import { requirePermission } from '../lib/middleware.js';

const router = Router();

// Get all users with gender (better-auth listUsers doesn't return custom fields)
router.get('/', async (_req: Request, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT id, name, email, role, banned, gender, level, is_homeroom_teacher, homeroom_class_id, "createdAt"
             FROM "user"
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
        const { name, gender, role, level, is_homeroom_teacher, homeroom_class_id } = req.body;

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
            values.push(level);
        }
        if (is_homeroom_teacher !== undefined) {
            fields.push(`is_homeroom_teacher = $${idx++}`);
            values.push(Boolean(is_homeroom_teacher));
        }
        if (homeroom_class_id !== undefined) {
            fields.push(`homeroom_class_id = $${idx++}`);
            values.push(is_homeroom_teacher ? homeroom_class_id || null : null);
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

            if (existingTeacher.rows.length === 0) {
                // Create new teacher record linked to user
                const nextIdResult = await client.query('SELECT get_next_teacher_id() AS next_id');
                const teacherId = nextIdResult.rows[0].next_id;
                await client.query(
                    `INSERT INTO teachers (teacher_id, name, gender, is_homeroom_teacher, homeroom_class_id, level, user_id)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [
                        teacherId,
                        updatedUser.name,
                        updatedUser.gender || 'male',
                        Boolean(updatedUser.is_homeroom_teacher),
                        updatedUser.is_homeroom_teacher ? updatedUser.homeroom_class_id : null,
                        updatedUser.level || null,
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
                         updated_at = NOW()
                     WHERE user_id = $6`,
                    [
                        updatedUser.name,
                        updatedUser.gender || 'male',
                        Boolean(updatedUser.is_homeroom_teacher),
                        updatedUser.is_homeroom_teacher ? updatedUser.homeroom_class_id : null,
                        updatedUser.level || null,
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
