-- Fee Structure Enhancements: min_level, term splits, books fees

-- ============================================================
-- 1. Add min_level to fee_other_charges
-- ============================================================
ALTER TABLE fee_other_charges
    ADD COLUMN IF NOT EXISTS min_level VARCHAR(20) DEFAULT NULL;

-- Add check constraint for valid min_level values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'valid_min_level'
    ) THEN
        ALTER TABLE fee_other_charges
            ADD CONSTRAINT valid_min_level
            CHECK (min_level IS NULL OR min_level IN ('pre_primary', 'primary', 'secondary', 'advanced'));
    END IF;
END $$;

-- ============================================================
-- 2. Set Development Fee to apply only to Grade 1+ (primary+)
-- ============================================================
UPDATE fee_other_charges
SET min_level = 'primary'
WHERE fee_name = 'Development Fee'
  AND academic_year = '2025/2026';

-- ============================================================
-- 3. Fix term splits for Grade 11 and 13 (50/50, no Term 3)
-- ============================================================
UPDATE fee_structures
SET term1_percent = 50, term2_percent = 50, term3_percent = 0
WHERE academic_year = '2025/2026'
  AND year_group IN ('11', '13');

-- ============================================================
-- 4. Update books fees from actual school fee document
--    Pre-primary (Nursery/Junior/Senior): 80,000
--    Primary through Advanced (Yr 1-13): 500,000
-- ============================================================
UPDATE fee_structures
SET books_fee = 80000
WHERE academic_year = '2025/2026'
  AND level = 'pre_primary';

UPDATE fee_structures
SET books_fee = 500000
WHERE academic_year = '2025/2026'
  AND level IN ('primary', 'secondary', 'advanced');
