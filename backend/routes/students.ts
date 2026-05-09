import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { pool } from '../lib/db.js';
import { getSessionUser, getLevelFilter } from '../lib/session.js';
import { requirePermission } from '../lib/middleware.js';
import { getTeacherAccessContext, teacherHasAssignedLevel } from '../lib/teacher-access.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/', async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        const { class_id } = req.query;
        let sql = `SELECT s.*, 
                    c.name AS class_name,
                    (SELECT COUNT(*) FROM borrow_records br WHERE br.student_id = s.id AND br.status = 'borrowed')::INTEGER AS active_borrows
             FROM students s
             LEFT JOIN classes c ON c.id = s.class_id
             WHERE 1=1`;
        const params: unknown[] = [];
        let paramIndex = 1;

        if (class_id) {
            sql += ` AND s.class_id = $${paramIndex++}`;
            params.push(class_id);
        }

        if (user?.role === 'teacher') {
            const teacherAccess = await getTeacherAccessContext(pool, user);
            if (class_id) {
                const classResult = await pool.query<{ level: string | null }>(
                    'SELECT level FROM classes WHERE id = $1',
                    [class_id],
                );
                if (classResult.rows.length === 0) {
                    res.status(404).json({ error: 'Class not found' });
                    return;
                }

                const classLevel = classResult.rows[0]?.level;
                if (!teacherHasAssignedLevel(teacherAccess.assignedLevels, classLevel)) {
                    res.status(403).json({ error: 'Access denied for selected class' });
                    return;
                }
            } else {
                if (teacherAccess.assignedLevels.length === 0) {
                    res.json([]);
                    return;
                }

                sql += ` AND s.level = ANY($${paramIndex++}::text[])`;
                params.push(teacherAccess.assignedLevels);
            }
        } else {
            const { clause, params: levelParams, paramOffset } = getLevelFilter(user, 's', paramIndex);
            if (clause) {
                sql += ` ${clause}`;
                params.push(...levelParams);
                paramIndex = paramOffset;
            }
        }

        sql += ' ORDER BY s.created_at DESC';

        const result = await pool.query(
            sql,
            params,
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ error: 'Failed to fetch students' });
    }
});

router.get('/next-id', async (_req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT get_next_student_id() AS next_id');
        res.json({ nextId: result.rows[0].next_id });
    } catch (error) {
        console.error('Error getting next student ID:', error);
        res.status(500).json({ error: 'Failed to get next student ID' });
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

router.post('/', requirePermission('students', 'create'), async (req: Request, res: Response) => {
    try {
        const { 
            first_name, last_name, name, class_id, gender, email, phone, 
            dob, nationality, parent_email, parent_phone, address, avatar, level 
        } = req.body;
        const user = await getSessionUser(req);
        const recordLevel = level ?? user?.level ?? null;

        // Generate full name if not provided
        const fullName = name || `${first_name || ''} ${last_name || ''}`.trim();

        const existing = await pool.query(
            'SELECT id FROM students WHERE LOWER(name) = LOWER($1) AND class_id = $2',
            [fullName, class_id || null]
        );
        if (existing.rows.length > 0) {
            res.status(409).json({ message: `Student "${fullName}" already exists in this class` });
            return;
        }
        
        const nextIdResult = await pool.query('SELECT get_next_student_id() AS next_id');
        const studentId = nextIdResult.rows[0].next_id;
        
        const result = await pool.query(
            `INSERT INTO students (
                student_id, name, first_name, last_name, class_id, gender, 
                email, phone, dob, nationality, parent_email, parent_phone, 
                address, avatar, level
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
             RETURNING *`,
            [
                studentId, fullName, first_name || null, last_name || null, 
                class_id || null, gender || 'male', email || null, phone || null,
                dob || null, nationality || null, parent_email || null, 
                parent_phone || null, address || null, avatar || null, recordLevel
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating student:', error);
        res.status(500).json({ error: 'Failed to create student' });
    }
});

router.put('/:id', requirePermission('students', 'edit'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { 
            first_name, last_name, name, class_id, gender, email, phone, 
            dob, nationality, parent_email, parent_phone, address, avatar, is_active 
        } = req.body;
        
        // Generate full name if not provided
        const fullName = name || `${first_name || ''} ${last_name || ''}`.trim();
        
        const result = await pool.query(
            `UPDATE students
             SET name = COALESCE($1, name),
                 first_name = COALESCE($2, first_name),
                 last_name = COALESCE($3, last_name),
                 class_id = $4,
                 gender = $5,
                 email = $6,
                 phone = $7,
                 dob = $8,
                 nationality = $9,
                 parent_email = $10,
                 parent_phone = $11,
                 address = $12,
                 avatar = $13,
                 is_active = COALESCE($14, is_active),
                 updated_at = NOW()
             WHERE id = $15
             RETURNING *`,
            [
                fullName, first_name ?? null, last_name ?? null,
                class_id || null, gender, email, phone,
                dob || null, nationality || null, parent_email || null,
                parent_phone || null, address || null, avatar, is_active ?? null, id
            ]
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

router.delete('/:id', requirePermission('students', 'delete'), async (req: Request, res: Response) => {
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

// Bulk import from Excel/CSV
router.post('/bulk', requirePermission('students', 'create'), upload.single('file'), async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        const bodyLevel = req.body?.level;
        const recordLevel = bodyLevel ?? user?.level ?? null;

        if (!req.file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]!];
        if (!sheet) {
            res.status(400).json({ error: 'Empty workbook' });
            return;
        }

        // Auto-detect header row
        const knownHeaders = ['studentid', 'firstname', 'lastname', 'dob', 'nationality', 'gender', 'parentemail', 'class'];
        const allRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        let headerRowIndex = 0;

        for (let i = 0; i < Math.min(allRows.length, 10); i++) {
            const rowValues = (allRows[i] || []).map((v: any) => String(v).toLowerCase().trim());
            const matchCount = rowValues.filter((v: string) => knownHeaders.some(h => v.includes(h.toLowerCase()))).length;
            if (matchCount >= 2) {
                headerRowIndex = i;
                break;
            }
        }

        // Re-parse using detected header row
        const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { 
            defval: '', 
            range: headerRowIndex 
        });

        if (rows.length === 0) {
            res.status(400).json({ error: 'No data rows found' });
            return;
        }

        // Normalize header keys to lowercase
        const normalized = rows.map(row => {
            const obj: Record<string, any> = {};
            for (const [k, v] of Object.entries(row)) {
                obj[k.toLowerCase().trim().replace(/\s+/g, '')] = v;
            }
            return obj;
        });

        // Preload class lookup map
        const clsRes = await pool.query(`SELECT id, LOWER(name) AS name FROM classes`);
        const clsMap = new Map(clsRes.rows.map((r: any) => [r.name, r.id]));

        interface ParsedStudent {
            student_id?: string | undefined;
            first_name: string;
            last_name: string;
            dob: string | null;
            nationality: string | null;
            gender: string;
            parent_email: string | null;
            class_id: string | null;
            class_name: string | null;
            email: string | null;
            phone: string | null;
        }

        const students: ParsedStudent[] = [];
        let skipped = 0;
        const errors: string[] = [];

        for (let i = 0; i < normalized.length; i++) {
            const row = normalized[i]!;
            const firstName = String(row['firstname'] || row['first_name'] || '').trim();
            const lastName = String(row['lastname'] || row['last_name'] || '').trim();
            
            if (!firstName && !lastName) {
                skipped++;
                continue;
            }

            const studentId = String(row['studentid'] || row['student_id'] || '').trim() || undefined;
            const className = String(row['class'] || '').trim();
            const classId = clsMap.get(className.toLowerCase()) || null;
            
            if (className && !classId) {
                errors.push(`Row ${i + 1}: Class "${className}" not found`);
            }

            // Parse DOB
            let dob: string | null = null;
            const dobValue = row['dob'] || row['dateofbirth'] || row['date_of_birth'] || '';
            if (dobValue) {
                if (typeof dobValue === 'number') {
                    // Excel date number (serial date) - convert to JS Date
                    // Excel epoch is 1900-01-01, but has a bug with 1900 being a leap year
                    const excelEpoch = new Date(1899, 11, 30);
                    const jsDate = new Date(excelEpoch.getTime() + dobValue * 24 * 60 * 60 * 1000);
                    if (!isNaN(jsDate.getTime())) {
                        dob = `${jsDate.getFullYear()}-${String(jsDate.getMonth() + 1).padStart(2, '0')}-${String(jsDate.getDate()).padStart(2, '0')}`;
                    }
                } else {
                    const dateStr = String(dobValue).trim();
                    // Try various date formats
                    const dateMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
                    if (dateMatch) {
                        const [_, d, m, y] = dateMatch;
                        const year = y!.length === 2 ? (parseInt(y!) > 50 ? `19${y}` : `20${y}`) : y;
                        dob = `${year}-${m!.padStart(2, '0')}-${d!.padStart(2, '0')}`;
                    }
                }
            }

            const gender = String(row['gender'] || 'male').toLowerCase().trim();
            const validGender = ['male', 'female', 'other'].includes(gender) ? gender : 'male';

            students.push({
                student_id: studentId,
                first_name: firstName,
                last_name: lastName,
                dob,
                nationality: String(row['nationality'] || '').trim() || null,
                gender: validGender,
                parent_email: String(row['parentemail'] || row['parent_email'] || '').trim() || null,
                class_id: classId,
                class_name: className || null,
                email: null,
                phone: null
            });
        }

        if (students.length === 0) {
            res.status(400).json({ error: 'No valid student records found', errors });
            return;
        }

        // Insert students
        let imported = 0;
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            for (const student of students) {
                // Check for duplicate by name and class
                const fullName = `${student.first_name} ${student.last_name}`.trim();
                const existing = await client.query(
                    'SELECT id FROM students WHERE LOWER(name) = LOWER($1) AND class_id = $2',
                    [fullName, student.class_id]
                );
                
                if (existing.rows.length > 0) {
                    continue; // Skip duplicates
                }

                // Get next student ID if not provided
                let studentId = student.student_id;
                if (!studentId) {
                    const nextIdResult = await client.query('SELECT get_next_student_id() AS next_id');
                    studentId = nextIdResult.rows[0].next_id;
                }

                // Get next admission number
                const admResult = await client.query('SELECT get_next_admission_number() AS next_adm');
                const admissionNumber = admResult.rows[0].next_adm;

                await client.query(
                    `INSERT INTO students (
                        student_id, admission_number, name, first_name, last_name, class_id, gender,
                        dob, nationality, parent_email, level, is_active
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                    [
                        studentId, admissionNumber, fullName, student.first_name, student.last_name,
                        student.class_id, student.gender, student.dob, student.nationality,
                        student.parent_email, recordLevel, true
                    ]
                );
                imported++;
            }
            
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

        res.json({
            imported,
            skipped,
            total: rows.length,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        console.error('Error importing students:', error);
        res.status(500).json({ error: 'Failed to import students' });
    }
});

export default router;
