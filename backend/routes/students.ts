import { Router } from 'express';
import type { Request, Response } from 'express';
import { pool } from '../lib/db.js';
import { getSessionUser, getLevelFilter } from '../lib/session.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        const { clause, params } = getLevelFilter(user, 's');
        const result = await pool.query(
            `SELECT s.*, 
                    c.name AS class_name,
                    (SELECT COUNT(*) FROM borrow_records br WHERE br.student_id = s.id AND br.status = 'borrowed')::INTEGER AS active_borrows
             FROM students s
             LEFT JOIN classes c ON c.id = s.class_id
             WHERE 1=1 ${clause}
             ORDER BY s.created_at DESC`,
            params
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ error: 'Failed to fetch students' });
    }
});

router.get('/next-admission', async (_req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT get_next_admission_number() AS next_id');
        res.json({ nextId: result.rows[0].next_id });
    } catch (error) {
        console.error('Error getting next admission number:', error);
        res.status(500).json({ error: 'Failed to get next admission number' });
    }
});

router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT s.*, 
                    c.name AS class_name,
                    (SELECT COUNT(*) FROM borrow_records br WHERE br.student_id = s.id AND br.status = 'borrowed')::INTEGER AS active_borrows
             FROM students s
             LEFT JOIN classes c ON c.id = s.class_id
             WHERE s.id = $1`,
            [id]
        );
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Student not found' });
            return;
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching student:', error);
        res.status(500).json({ error: 'Failed to fetch student' });
    }
});

router.get('/:id/borrow-history', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT br.*, b.title AS book_title, b.book_id AS book_code
             FROM borrow_records br
             JOIN books b ON b.id = br.book_id
             WHERE br.student_id = $1
             ORDER BY br.borrow_date DESC`,
            [id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching borrow history:', error);
        res.status(500).json({ error: 'Failed to fetch borrow history' });
    }
});

router.post('/', async (req: Request, res: Response) => {
    try {
        const { name, class_id, gender, email, phone, avatar, level } = req.body;
        const user = await getSessionUser(req);
        const recordLevel = level ?? user?.level ?? null;

        const existing = await pool.query(
            'SELECT id FROM students WHERE LOWER(name) = LOWER($1) AND class_id = $2',
            [name.trim(), class_id || null]
        );
        if (existing.rows.length > 0) {
            res.status(409).json({ message: `Student "${name.trim()}" already exists in this class` });
            return;
        }
        
        const nextIdResult = await pool.query('SELECT get_next_admission_number() AS next_id');
        const admissionNumber = nextIdResult.rows[0].next_id;
        
        const result = await pool.query(
            `INSERT INTO students (admission_number, name, class_id, gender, email, phone, avatar, level)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [admissionNumber, name, class_id || null, gender || 'male', email || null, phone || null, avatar || null, recordLevel]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating student:', error);
        res.status(500).json({ error: 'Failed to create student' });
    }
});

router.put('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, class_id, gender, email, phone, avatar, is_active } = req.body;
        
        const result = await pool.query(
            `UPDATE students
             SET name = $1,
                 class_id = $2,
                 gender = $3,
                 email = $4,
                 phone = $5,
                 avatar = $6,
                 is_active = COALESCE($7, is_active),
                 updated_at = NOW()
             WHERE id = $8
             RETURNING *`,
            [name, class_id || null, gender, email, phone, avatar, is_active ?? null, id]
        );
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Student not found' });
            return;
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating student:', error);
        res.status(500).json({ error: 'Failed to update student' });
    }
});

router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM students WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Student not found' });
            return;
        }
        res.json({ message: 'Student deleted successfully' });
    } catch (error) {
        console.error('Error deleting student:', error);
        res.status(500).json({ error: 'Failed to delete student' });
    }
});

export default router;
