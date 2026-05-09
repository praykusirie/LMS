import { pool } from './db.js';
import { getLevelFilter } from './session.js';

type DetailTrendPeriod = 'week' | 'month' | '6months';
type DetailActivityPeriod = 'week' | 'month' | 'all';

export function readDetailTrendPeriod(value: unknown): DetailTrendPeriod {
    if (value === 'month' || value === '6months') {
        return value;
    }
    return 'week';
}

export function readDetailActivityPeriod(value: unknown): DetailActivityPeriod {
    if (value === 'week' || value === 'month' || value === 'all') {
        return value;
    }
    return 'all';
}

export function getActivityWindowClause(period: DetailActivityPeriod, column: string): string {
    switch (period) {
        case 'week':
            return `AND ${column} >= date_trunc('day', NOW()) - interval '6 days'`;
        case 'month':
            return `AND ${column} >= date_trunc('day', NOW()) - interval '29 days'`;
        case 'all':
        default:
            return '';
    }
}

export function buildBookTrendQuery(period: DetailTrendPeriod, levelClause: string): string {
    const config = {
        week: {
            rangeStart: "date_trunc('day', NOW()) - interval '6 days'",
            rangeEnd: "date_trunc('day', NOW())",
            step: "interval '1 day'",
            truncUnit: 'day',
            labelFormat: 'Dy',
        },
        month: {
            rangeStart: "date_trunc('week', NOW()) - interval '4 weeks'",
            rangeEnd: "date_trunc('week', NOW())",
            step: "interval '1 week'",
            truncUnit: 'week',
            labelFormat: 'DD Mon',
        },
        '6months': {
            rangeStart: "date_trunc('month', NOW()) - interval '5 months'",
            rangeEnd: "date_trunc('month', NOW())",
            step: "interval '1 month'",
            truncUnit: 'month',
            labelFormat: 'Mon',
        },
    }[period];

    return `
        WITH series AS (
            SELECT generate_series(
                ${config.rangeStart},
                ${config.rangeEnd},
                ${config.step}
            ) AS bucket
        )
        SELECT
            to_char(series.bucket, '${config.labelFormat}') AS month,
            COALESCE(borrows.count, 0)::int AS borrows,
            COALESCE(returns.count, 0)::int AS returns
        FROM series
        LEFT JOIN (
            SELECT date_trunc('${config.truncUnit}', br.borrow_date) AS bucket, COUNT(*) AS count
            FROM borrow_records br
            WHERE br.book_id = $1
                AND br.borrow_date >= ${config.rangeStart} ${levelClause}
            GROUP BY date_trunc('${config.truncUnit}', br.borrow_date)
        ) borrows ON borrows.bucket = series.bucket
        LEFT JOIN (
            SELECT date_trunc('${config.truncUnit}', br.return_date) AS bucket, COUNT(*) AS count
            FROM borrow_records br
            WHERE br.book_id = $1
                AND br.return_date IS NOT NULL
                AND br.return_date >= ${config.rangeStart} ${levelClause}
            GROUP BY date_trunc('${config.truncUnit}', br.return_date)
        ) returns ON returns.bucket = series.bucket
        ORDER BY series.bucket ASC
    `;
}

export async function getBookDetailStatsService(
    bookId: string,
    book: any,
    user: any,
    trendPeriod: DetailTrendPeriod,
    activityPeriod: DetailActivityPeriod
) {
    const activityWindowClause = getActivityWindowClause(activityPeriod, 'br.borrow_date');

    const { clause: trendLevelClause, params: trendLevelParams } = getLevelFilter(user, 'br', 2);
    const { clause: currentBorrowersLevelClause, params: currentBorrowersLevelParams } = getLevelFilter(user, 'br', 2);
    const { clause: historyLevelClause, params: historyLevelParams } = getLevelFilter(user, 'br', 2);
    const { clause: summaryLevelClause, params: summaryLevelParams } = getLevelFilter(user, 'br', 2);
    const { clause: activeSummaryLevelClause } = getLevelFilter(user, 'active', 2);
    const { clause: relatedLevelClause, params: relatedLevelParams } = getLevelFilter(user, 'rb', 5);

    const [trendResult, currentBorrowersResult, historyResult, summaryResult, relatedBooksResult] = await Promise.all([
        pool.query(buildBookTrendQuery(trendPeriod, trendLevelClause), [bookId, ...trendLevelParams]),
        pool.query(
            `SELECT
                br.id,
                s.id AS student_ref_id,
                s.name AS student_name,
                COALESCE(s.student_id, s.admission_number, '') AS student_code,
                s.avatar AS student_avatar,
                s.gender AS student_gender,
                c.name AS class_name,
                br.borrow_date,
                br.due_date,
                CASE
                    WHEN br.status = 'borrowed' AND br.due_date < NOW() THEN 'overdue'
                    ELSE br.status
                END AS current_status,
                (
                    SELECT COUNT(*)::int
                    FROM borrow_records active
                    WHERE active.student_id = s.id
                        AND active.status IN ('borrowed', 'overdue')
                ) AS active_borrows
             FROM borrow_records br
             JOIN students s ON s.id = br.student_id
             LEFT JOIN classes c ON c.id = s.class_id
             WHERE br.book_id = $1
                AND br.status IN ('borrowed', 'overdue')
                ${activityWindowClause} ${currentBorrowersLevelClause}
             ORDER BY br.borrow_date DESC
             LIMIT 8`,
            [bookId, ...currentBorrowersLevelParams],
        ),
        pool.query(
            `SELECT
                br.id,
                s.id AS student_ref_id,
                s.name AS student_name,
                COALESCE(s.student_id, s.admission_number, '') AS student_code,
                s.avatar AS student_avatar,
                s.gender AS student_gender,
                c.name AS class_name,
                br.borrow_date,
                br.due_date,
                br.return_date,
                COALESCE(br.fine_amount, 0)::numeric AS fine_amount,
                CASE
                    WHEN br.status = 'borrowed' AND br.due_date < NOW() THEN 'overdue'
                    ELSE br.status
                END AS current_status,
                CASE
                    WHEN br.return_date IS NOT NULL AND br.return_date > br.due_date THEN CEIL(EXTRACT(EPOCH FROM (br.return_date - br.due_date)) / 86400)::int
                    WHEN br.return_date IS NULL AND br.status = 'borrowed' AND br.due_date < NOW() THEN CEIL(EXTRACT(EPOCH FROM (NOW() - br.due_date)) / 86400)::int
                    ELSE 0
                END AS late_days
             FROM borrow_records br
             JOIN students s ON s.id = br.student_id
             LEFT JOIN classes c ON c.id = s.class_id
             WHERE br.book_id = $1
                ${activityWindowClause} ${historyLevelClause}
             ORDER BY br.borrow_date DESC
             LIMIT 20`,
            [bookId, ...historyLevelParams],
        ),
        pool.query(
            `WITH filtered_records AS (
                SELECT br.*
                FROM borrow_records br
                WHERE br.book_id = $1
                    ${activityWindowClause} ${summaryLevelClause}
            ),
            segment_counts AS (
                SELECT
                    COALESCE(c.name, s.level, 'Mixed') AS segment,
                    COUNT(*)::int AS count
                FROM filtered_records fr
                JOIN students s ON s.id = fr.student_id
                LEFT JOIN classes c ON c.id = s.class_id
                GROUP BY COALESCE(c.name, s.level, 'Mixed')
            )
            SELECT
                (SELECT COUNT(*)::int FROM filtered_records) AS total_borrowed,
                (
                    SELECT COUNT(*)::int
                    FROM borrow_records active
                    WHERE active.book_id = $1
                        AND active.status IN ('borrowed', 'overdue')
                        ${activeSummaryLevelClause}
                ) AS active_borrowers,
                COALESCE(
                    (
                        SELECT ROUND(AVG(EXTRACT(EPOCH FROM (fr.return_date - fr.borrow_date)) / 86400)::numeric, 1)
                        FROM filtered_records fr
                        WHERE fr.return_date IS NOT NULL
                    ),
                    0
                ) AS average_loan_days,
                (
                    SELECT MIN(active.due_date)
                    FROM borrow_records active
                    WHERE active.book_id = $1
                        AND active.status IN ('borrowed', 'overdue')
                        ${activeSummaryLevelClause}
                ) AS next_due_date,
                COALESCE(
                    (SELECT segment FROM segment_counts ORDER BY count DESC, segment ASC LIMIT 1),
                    'No data'
                ) AS top_borrower_segment,
                COALESCE(
                    (
                        SELECT ROUND(count::numeric / NULLIF((SELECT COUNT(*) FROM filtered_records), 0) * 100, 0)::int
                        FROM segment_counts
                        ORDER BY count DESC, segment ASC
                        LIMIT 1
                    ),
                    0
                ) AS top_borrower_segment_share`,
            [bookId, ...summaryLevelParams],
        ),
        pool.query(
            `SELECT
                rb.id,
                rb.book_id,
                rb.title,
                rb.author,
                rb.cover_image,
                rb.available,
                rb.quantity,
                c.name AS category_name,
                s.name AS subject_name,
                cl.name AS class_name
             FROM books rb
             LEFT JOIN categories c ON c.id = rb.category_id
             LEFT JOIN subjects s ON s.id = rb.subject_id
             LEFT JOIN classes cl ON cl.id = rb.class_id
             WHERE rb.id <> $1::uuid
                AND rb.is_active = true
                AND (
                    ($2::uuid IS NOT NULL AND rb.category_id = $2::uuid)
                    OR ($3::uuid IS NOT NULL AND rb.subject_id = $3::uuid)
                    OR ($4::uuid IS NOT NULL AND rb.class_id = $4::uuid)
                )
                ${relatedLevelClause}
             ORDER BY
                CASE
                    WHEN $2::uuid IS NOT NULL AND rb.category_id = $2::uuid THEN 0
                    WHEN $3::uuid IS NOT NULL AND rb.subject_id = $3::uuid THEN 1
                    WHEN $4::uuid IS NOT NULL AND rb.class_id = $4::uuid THEN 2
                    ELSE 3
                END,
                rb.created_at DESC
             LIMIT 3`,
            [bookId, book.category_id, book.subject_id, book.class_id, ...relatedLevelParams],
        ),
    ]);

    return {
        trend: trendResult.rows,
        currentBorrowers: currentBorrowersResult.rows,
        history: historyResult.rows,
        metrics: summaryResult.rows[0],
        relatedBooks: relatedBooksResult.rows,
    };
}