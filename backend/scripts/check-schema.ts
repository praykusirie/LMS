import { pool } from '../lib/db.js';

async function main() {
    try {
        // Test the exact query used in the invoices list route
        const r = await pool.query(
            `SELECT
                i.*,
                s.name AS student_name,
                COALESCE(s.student_id, s.admission_number, '') AS student_code,
                c.name AS class_name
             FROM invoices i
             JOIN students s ON s.id = i.student_id
             LEFT JOIN classes c ON c.id = s.class_id
             ORDER BY i.created_at DESC
             LIMIT 3`
        );
        console.log('Invoices query OK, rows:', r.rows.length);
        if (r.rows.length > 0) {
            console.log('Sample:', JSON.stringify(r.rows[0], null, 2));
        }
    } catch (e: any) {
        console.error('ERROR:', e.message);
    }
    process.exit(0);
}
main();
