import { Router } from 'express';
import type { Request, Response } from 'express';
import { pool } from '../lib/db.js';
import { getSessionUser, getLevelFilter } from '../lib/session.js';
import { requirePermission } from '../lib/middleware.js';

const router = Router();

// ── List invoices ────────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        const { clause: levelClause, params: levelParams, paramOffset } = getLevelFilter(user, 'i');

        const where: string[] = ['1=1'];
        const params: unknown[] = [...levelParams];
        let idx = paramOffset;

        const { academic_year, status, student_id, search } = req.query;

        if (academic_year) {
            where.push(`i.academic_year = $${idx}`);
            params.push(academic_year);
            idx++;
        }
        if (status) {
            where.push(`i.status = $${idx}`);
            params.push(status);
            idx++;
        }
        if (student_id) {
            where.push(`i.student_id = $${idx}`);
            params.push(student_id);
            idx++;
        }
        if (search) {
            where.push(`(
                LOWER(s.name) LIKE LOWER($${idx}) OR
                LOWER(i.invoice_number) LIKE LOWER($${idx}) OR
                LOWER(COALESCE(s.student_id, s.admission_number, '')) LIKE LOWER($${idx})
            )`);
            params.push(`%${search}%`);
            idx++;
        }

        const result = await pool.query(
            `SELECT
                i.*,
                s.name AS student_name,
                COALESCE(s.student_id, s.admission_number, '') AS student_code,
                c.name AS class_name,
                f.term1_percent,
                f.term2_percent,
                f.term3_percent
             FROM invoices i
             JOIN students s ON s.id = i.student_id
             LEFT JOIN classes c ON c.id = s.class_id
             LEFT JOIN fee_structures f ON f.academic_year = i.academic_year AND f.year_group = i.year_group
             WHERE ${where.join(' AND ')} ${levelClause}
             ORDER BY i.created_at DESC`,
            params,
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({ error: 'Failed to fetch invoices' });
    }
});

// ── Finance report ───────────────────────────────────────────
router.get('/report/summary', async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        const { clause: levelClause, params: levelParams, paramOffset } = getLevelFilter(user, 'i');

        const where: string[] = ["i.status != 'voided'"];
        const params: unknown[] = [...levelParams];
        let idx = paramOffset;

        if (req.query.academic_year) {
            where.push(`i.academic_year = $${idx}`);
            params.push(req.query.academic_year);
            idx++;
        }

        const result = await pool.query(
            `SELECT
                COUNT(*)::int AS invoice_count,
                COALESCE(SUM(i.total_amount), 0)::bigint AS total_invoiced,
                COALESCE(SUM(i.total_paid), 0)::bigint AS total_collected,
                COALESCE(SUM(i.balance), 0)::bigint AS total_outstanding,
                COUNT(*) FILTER (WHERE i.status = 'paid')::int AS paid_count,
                COUNT(*) FILTER (WHERE i.status = 'partial')::int AS partial_count,
                COUNT(*) FILTER (WHERE i.status = 'unpaid')::int AS unpaid_count
             FROM invoices i
             WHERE ${where.join(' AND ')} ${levelClause}`,
            params,
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching finance report:', error);
        res.status(500).json({ error: 'Failed to fetch finance report' });
    }
});

// ── Get single invoice with line items and payments ──────────
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const invoiceResult = await pool.query(
            `SELECT
                i.*,
                s.name AS student_name,
                COALESCE(s.student_id, s.admission_number, '') AS student_code,
                c.name AS class_name,
                f.term1_percent,
                f.term2_percent,
                f.term3_percent
             FROM invoices i
             JOIN students s ON s.id = i.student_id
             LEFT JOIN classes c ON c.id = s.class_id
             LEFT JOIN fee_structures f ON f.academic_year = i.academic_year AND f.year_group = i.year_group
             WHERE i.id = $1`,
            [req.params.id],
        );

        if (invoiceResult.rows.length === 0) {
            res.status(404).json({ error: 'Invoice not found' });
            return;
        }

        const [lineItemsResult, paymentsResult] = await Promise.all([
            pool.query(
                'SELECT * FROM invoice_line_items WHERE invoice_id = $1 ORDER BY sort_order',
                [req.params.id],
            ),
            pool.query(
                'SELECT * FROM invoice_payments WHERE invoice_id = $1 ORDER BY payment_date DESC',
                [req.params.id],
            ),
        ]);

        res.json({
            ...invoiceResult.rows[0],
            line_items: lineItemsResult.rows,
            payments: paymentsResult.rows,
        });
    } catch (error) {
        console.error('Error fetching invoice:', error);
        res.status(500).json({ error: 'Failed to fetch invoice' });
    }
});

// ── Create invoice (calculation engine) ──────────────────────
router.post('/', requirePermission('finance', 'create'), async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        if (!user) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const {
            student_id, academic_year, year_group,
            is_new_student, is_boarder,
            sibling_discount_percent,
            invoice_date, notes,
            line_item_overrides,
        } = req.body as {
            student_id: string;
            academic_year: string;
            year_group: string;
            is_new_student?: boolean;
            is_boarder?: boolean;
            sibling_discount_percent?: number;
            invoice_date?: string;
            notes?: string;
            line_item_overrides?: Array<{ fee_name: string; amount: number }>;
        };

        if (!student_id || !academic_year || !year_group) {
            res.status(400).json({ error: 'student_id, academic_year, and year_group are required' });
            return;
        }

        // Verify student exists
        const studentResult = await pool.query('SELECT id, is_active FROM students WHERE id = $1', [student_id]);
        if (studentResult.rows.length === 0) {
            res.status(404).json({ error: 'Student not found' });
            return;
        }

        // Lookup fee structure
        const feeResult = await pool.query(
            'SELECT * FROM fee_structures WHERE academic_year = $1 AND year_group = $2',
            [academic_year, year_group],
        );
        if (feeResult.rows.length === 0) {
            res.status(404).json({ error: `No fee structure found for ${year_group} in ${academic_year}` });
            return;
        }
        const fee = feeResult.rows[0];

        // Lookup other charges
        const chargesResult = await pool.query(
            'SELECT * FROM fee_other_charges WHERE academic_year = $1 AND is_active = TRUE',
            [academic_year],
        );
        const otherCharges = chargesResult.rows;

        // Level hierarchy for min_level filtering
        const LEVEL_ORDER: Record<string, number> = { pre_primary: 0, primary: 1, secondary: 2, advanced: 3 };
        const meetsMinLevel = (studentLevel: string, minLevel: string | null) => {
            if (!minLevel) return true;
            return (LEVEL_ORDER[studentLevel] ?? 0) >= (LEVEL_ORDER[minLevel] ?? 0);
        };

        // ── Build line items ──
        const lineItems: Array<{ fee_name: string; amount: number; sort_order: number }> = [];
        let sortOrder = 0;

        // Helper to check overrides
        const overrideMap = new Map<string, number>();
        if (line_item_overrides) {
            for (const o of line_item_overrides) {
                overrideMap.set(o.fee_name, o.amount);
            }
        }
        const getAmount = (name: string, defaultAmount: number) =>
            overrideMap.has(name) ? overrideMap.get(name)! : defaultAmount;

        // Tuition
        const tuitionAmount = Number(fee.total_term_fee);
        const discountPercent = sibling_discount_percent ?? 0;
        const discountAmount = Math.round(tuitionAmount * discountPercent / 100);
        const netTuition = tuitionAmount - discountAmount;

        lineItems.push({ fee_name: 'Tuition Fee', amount: getAmount('Tuition Fee', netTuition), sort_order: sortOrder++ });

        if (discountAmount > 0) {
            lineItems.push({ fee_name: 'Sibling Discount', amount: getAmount('Sibling Discount', -discountAmount), sort_order: sortOrder++ });
        }

        // New student fees
        if (is_new_student) {
            for (const charge of otherCharges.filter((c: any) => c.fee_type === 'new_student')) {
                lineItems.push({
                    fee_name: charge.fee_name,
                    amount: getAmount(charge.fee_name, Number(charge.amount)),
                    sort_order: sortOrder++,
                });
            }
        }

        // Annual fees (Development etc.) — filtered by min_level
        for (const charge of otherCharges.filter((c: any) => c.fee_type === 'annual' && meetsMinLevel(fee.level, c.min_level))) {
            lineItems.push({
                fee_name: charge.fee_name,
                amount: getAmount(charge.fee_name, Number(charge.amount)),
                sort_order: sortOrder++,
            });
        }

        // Books fee (from fee structure, per year group)
        if (Number(fee.books_fee) > 0) {
            lineItems.push({
                fee_name: 'Books Fee',
                amount: getAmount('Books Fee', Number(fee.books_fee)),
                sort_order: sortOrder++,
            });
        }

        // Cambridge exam fee (from fee structure, per year group)
        if (Number(fee.cambridge_exam_fee) > 0) {
            lineItems.push({
                fee_name: 'Cambridge Exam Fees',
                amount: getAmount('Cambridge Exam Fees', Number(fee.cambridge_exam_fee)),
                sort_order: sortOrder++,
            });
        }

        // Hostel fee (boarder)
        if (is_boarder && Number(fee.hostel_fee) > 0) {
            lineItems.push({
                fee_name: 'Hostel Fee',
                amount: getAmount('Hostel Fee', Number(fee.hostel_fee)),
                sort_order: sortOrder++,
            });
        }

        // ── Calculate totals ──
        const totalAmount = lineItems.reduce((sum, li) => sum + li.amount, 0);

        // Term split: percentages apply ONLY to tuition fee.
        // All additional charges (books, cambridge, hostel, annual, new-student) go to Term 1.
        const t1Pct = Number(fee.term1_percent);
        const t2Pct = Number(fee.term2_percent);
        const t3Pct = Number(fee.term3_percent);

        const tuitionForSplit = lineItems.find(li => li.fee_name === 'Tuition Fee')?.amount ?? 0;
        const additionalCharges = totalAmount - tuitionForSplit;

        const term1Tuition = Math.round(tuitionForSplit * t1Pct / 100);
        const term3Tuition = Math.round(tuitionForSplit * t3Pct / 100);
        const term2Tuition = tuitionForSplit - term1Tuition - term3Tuition;

        const term1Amount = term1Tuition + additionalCharges;
        const term2Amount = term2Tuition;
        const term3Amount = term3Tuition;

        // ── Insert invoice + line items in transaction ──
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const recordLevel = user.level ?? null;

            const invoiceResult = await client.query(
                `INSERT INTO invoices
                    (student_id, academic_year, year_group, invoice_date,
                     is_new_student, is_boarder, sibling_discount_percent,
                     tuition_amount, discount_amount, net_tuition,
                     total_amount, term1_amount, term2_amount, term3_amount,
                     balance, status, notes, created_by, level)
                 VALUES ($1, $2, $3, $4::date, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'unpaid', $16, $17, $18)
                 RETURNING *`,
                [
                    student_id, academic_year, year_group,
                    invoice_date || new Date().toISOString().split('T')[0],
                    is_new_student ?? false, is_boarder ?? false, discountPercent,
                    tuitionAmount, discountAmount, netTuition,
                    totalAmount, term1Amount, term2Amount, term3Amount,
                    totalAmount, // balance = total initially
                    notes || null, user.id, recordLevel,
                ],
            );

            const invoiceId = invoiceResult.rows[0].id;

            for (const li of lineItems) {
                await client.query(
                    `INSERT INTO invoice_line_items (invoice_id, fee_name, amount, sort_order)
                     VALUES ($1, $2, $3, $4)`,
                    [invoiceId, li.fee_name, li.amount, li.sort_order],
                );
            }

            await client.query('COMMIT');

            // Fetch the complete invoice
            const fullInvoice = await pool.query(
                `SELECT i.*, s.name AS student_name,
                    COALESCE(s.student_id, s.admission_number, '') AS student_code,
                    c.name AS class_name,
                    f.term1_percent,
                    f.term2_percent,
                    f.term3_percent
                 FROM invoices i
                 JOIN students s ON s.id = i.student_id
                 LEFT JOIN classes c ON c.id = s.class_id
                 LEFT JOIN fee_structures f ON f.academic_year = i.academic_year AND f.year_group = i.year_group
                 WHERE i.id = $1`,
                [invoiceId],
            );

            const lineItemsRows = await pool.query(
                'SELECT * FROM invoice_line_items WHERE invoice_id = $1 ORDER BY sort_order',
                [invoiceId],
            );

            res.status(201).json({
                ...fullInvoice.rows[0],
                line_items: lineItemsRows.rows,
                payments: [],
            });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error creating invoice:', error);
        res.status(500).json({ error: 'Failed to create invoice' });
    }
});

// ── Delete invoice (only if no payments) ─────────────────────
router.delete('/:id', requirePermission('finance', 'edit'), async (req: Request, res: Response) => {
    try {
        const paymentsCheck = await pool.query(
            'SELECT COUNT(*)::int AS count FROM invoice_payments WHERE invoice_id = $1',
            [req.params.id],
        );
        if (Number(paymentsCheck.rows[0]?.count) > 0) {
            res.status(400).json({ error: 'Cannot delete invoice with existing payments. Void it instead.' });
            return;
        }
        const result = await pool.query('DELETE FROM invoices WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Invoice not found' });
            return;
        }
        res.json({ message: 'Invoice deleted' });
    } catch (error) {
        console.error('Error deleting invoice:', error);
        res.status(500).json({ error: 'Failed to delete invoice' });
    }
});

// ── Record payment ───────────────────────────────────────────
router.post('/:id/payments', requirePermission('finance', 'edit'), async (req: Request, res: Response) => {
    try {
        const user = await getSessionUser(req);
        if (!user) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const { amount, payment_date, payment_method, reference, notes } = req.body as {
            amount: number;
            payment_date?: string;
            payment_method?: string;
            reference?: string;
            notes?: string;
        };

        if (!amount || amount <= 0) {
            res.status(400).json({ error: 'amount must be a positive number' });
            return;
        }

        // Verify invoice exists and isn't voided
        const invoiceResult = await pool.query(
            'SELECT * FROM invoices WHERE id = $1',
            [req.params.id],
        );
        if (invoiceResult.rows.length === 0) {
            res.status(404).json({ error: 'Invoice not found' });
            return;
        }
        const invoice = invoiceResult.rows[0];
        if (invoice.status === 'voided') {
            res.status(400).json({ error: 'Cannot add payment to a voided invoice' });
            return;
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Insert payment
            await client.query(
                `INSERT INTO invoice_payments (invoice_id, amount, payment_date, payment_method, reference, received_by, notes)
                 VALUES ($1, $2, $3::date, $4, $5, $6, $7)`,
                [
                    req.params.id, amount,
                    payment_date || new Date().toISOString().split('T')[0],
                    payment_method || 'bank_transfer',
                    reference || null, user.id, notes || null,
                ],
            );

            // Recalculate totals
            const totalPaidResult = await client.query(
                'SELECT COALESCE(SUM(amount), 0)::bigint AS total FROM invoice_payments WHERE invoice_id = $1',
                [req.params.id],
            );
            const newTotalPaid = Number(totalPaidResult.rows[0].total);
            const newBalance = Number(invoice.total_amount) - newTotalPaid;
            const newStatus = newBalance <= 0 ? 'paid' : newTotalPaid > 0 ? 'partial' : 'unpaid';

            await client.query(
                `UPDATE invoices SET total_paid = $1, balance = $2, status = $3, updated_at = NOW() WHERE id = $4`,
                [newTotalPaid, Math.max(0, newBalance), newStatus, req.params.id],
            );

            await client.query('COMMIT');

            // Return updated invoice
            const updated = await pool.query(
                `SELECT i.*, s.name AS student_name,
                    COALESCE(s.student_id, s.admission_number, '') AS student_code,
                    c.name AS class_name,
                    f.term1_percent,
                    f.term2_percent,
                    f.term3_percent
                 FROM invoices i
                 JOIN students s ON s.id = i.student_id
                 LEFT JOIN classes c ON c.id = s.class_id
                 LEFT JOIN fee_structures f ON f.academic_year = i.academic_year AND f.year_group = i.year_group
                 WHERE i.id = $1`,
                [req.params.id],
            );

            res.json(updated.rows[0]);
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error recording payment:', error);
        res.status(500).json({ error: 'Failed to record payment' });
    }
});

// ── Get payments for an invoice ──────────────────────────────
router.get('/:id/payments', async (req: Request, res: Response) => {
    try {
        const result = await pool.query(
            'SELECT * FROM invoice_payments WHERE invoice_id = $1 ORDER BY payment_date DESC',
            [req.params.id],
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({ error: 'Failed to fetch payments' });
    }
});

export default router;
