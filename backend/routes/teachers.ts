import { Router } from 'express';
import type { Request, Response } from 'express';
import { pool } from '../lib/db.js';
import { getSessionUser, getLevelFilter } from '../lib/session.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        const { clause, params } = getLevelFilter(user, 't');
        const result = await pool.query(
            `SELECT t.*, c.name AS homeroom_class_name
             FROM teachers t
             LEFT JOIN classes c ON c.id = t.homeroom_class_id
             WHERE 1=1 ${clause}
             ORDER BY t.created_at DESC`,
            params
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

router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT t.*, c.name AS homeroom_class_name
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

router.post('/', async (req: Request, res: Response) => {
    try {
        const { name, gender, is_homeroom_teacher, homeroom_class_id, level } = req.body;
        const user = await getSessionUser(req);
        const recordLevel = level ?? user?.level ?? null;

        const existing = await pool.query(
            'SELECT id FROM teachers WHERE LOWER(name) = LOWER($1)',
            [name.trim()]
        );
        if (existing.rows.length > 0) {
            res.status(409).json({ message: `Teacher "${name.trim()}" already exists` });
            return;
        }

        const nextIdResult = await pool.query('SELECT get_next_teacher_id() AS next_id');
        const teacherId = nextIdResult.rows[0].next_id;
        const result = await pool.query(
            `INSERT INTO teachers (teacher_id, name, gender, is_homeroom_teacher, homeroom_class_id, level)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [
                teacherId,
                name,
                gender || 'male',
                Boolean(is_homeroom_teacher),
                is_homeroom_teacher ? homeroom_class_id || null : null,
                recordLevel,
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating teacher:', error);
        res.status(500).json({ error: 'Failed to create teacher' });
    }
});

router.put('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, gender, is_homeroom_teacher, homeroom_class_id } = req.body;
        const result = await pool.query(
            `UPDATE teachers
             SET name = $1,
                 gender = $2,
                 is_homeroom_teacher = $3,
                 homeroom_class_id = $4,
                 updated_at = NOW()
             WHERE id = $5
             RETURNING *`,
            [
                name,
                gender || 'male',
                Boolean(is_homeroom_teacher),
                is_homeroom_teacher ? homeroom_class_id || null : null,
                id,
            ]
        );
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Teacher not found' });
            return;
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating teacher:', error);
        res.status(500).json({ error: 'Failed to update teacher' });
    }
});

router.delete('/:id', async (req: Request, res: Response) => {
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
