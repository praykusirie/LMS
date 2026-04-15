-- Finance Module: Fee structures, invoices, payments

-- ============================================================
-- 1. Fee Structures — tuition & per-year-group fees
-- ============================================================
CREATE TABLE IF NOT EXISTS fee_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year VARCHAR(20) NOT NULL,
    year_group VARCHAR(30) NOT NULL,
    level VARCHAR(20) NOT NULL,
    tuition_amount BIGINT NOT NULL DEFAULT 0,
    total_term_fee BIGINT NOT NULL DEFAULT 0,
    term1_percent INT NOT NULL DEFAULT 50,
    term2_percent INT NOT NULL DEFAULT 35,
    term3_percent INT NOT NULL DEFAULT 15,
    books_fee BIGINT NOT NULL DEFAULT 0,
    cambridge_exam_fee BIGINT NOT NULL DEFAULT 0,
    hostel_fee BIGINT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_fee_structure UNIQUE (academic_year, year_group),
    CONSTRAINT valid_fee_level CHECK (level IN ('pre_primary', 'primary', 'secondary', 'advanced')),
    CONSTRAINT valid_term_percents CHECK (term1_percent + term2_percent + term3_percent = 100)
);

CREATE INDEX IF NOT EXISTS idx_fee_structures_academic_year ON fee_structures(academic_year);
CREATE INDEX IF NOT EXISTS idx_fee_structures_level ON fee_structures(level);

CREATE OR REPLACE TRIGGER trg_fee_structures_updated_at
    BEFORE UPDATE ON fee_structures
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. Fee Other Charges — shared fees (admission, dev, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS fee_other_charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year VARCHAR(20) NOT NULL,
    fee_name VARCHAR(100) NOT NULL,
    amount BIGINT NOT NULL DEFAULT 0,
    fee_type VARCHAR(20) NOT NULL DEFAULT 'annual',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_fee_other_charge UNIQUE (academic_year, fee_name),
    CONSTRAINT valid_fee_type CHECK (fee_type IN ('new_student', 'annual', 'optional'))
);

CREATE INDEX IF NOT EXISTS idx_fee_other_charges_academic_year ON fee_other_charges(academic_year);

CREATE OR REPLACE TRIGGER trg_fee_other_charges_updated_at
    BEFORE UPDATE ON fee_other_charges
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 3. Invoices
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(30) NOT NULL UNIQUE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    academic_year VARCHAR(20) NOT NULL,
    year_group VARCHAR(30) NOT NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_new_student BOOLEAN NOT NULL DEFAULT FALSE,
    is_boarder BOOLEAN NOT NULL DEFAULT FALSE,
    sibling_discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
    tuition_amount BIGINT NOT NULL DEFAULT 0,
    discount_amount BIGINT NOT NULL DEFAULT 0,
    net_tuition BIGINT NOT NULL DEFAULT 0,
    total_amount BIGINT NOT NULL DEFAULT 0,
    term1_amount BIGINT NOT NULL DEFAULT 0,
    term2_amount BIGINT NOT NULL DEFAULT 0,
    term3_amount BIGINT NOT NULL DEFAULT 0,
    total_paid BIGINT NOT NULL DEFAULT 0,
    balance BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(10) NOT NULL DEFAULT 'unpaid',
    notes TEXT,
    created_by TEXT REFERENCES "user"(id) ON DELETE SET NULL,
    level VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_invoice_status CHECK (status IN ('unpaid', 'partial', 'paid', 'voided')),
    CONSTRAINT valid_invoice_level CHECK (level IS NULL OR level IN ('primary', 'secondary'))
);

CREATE INDEX IF NOT EXISTS idx_invoices_student_id ON invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_academic_year ON invoices(academic_year);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_level ON invoices(level);

CREATE OR REPLACE TRIGGER trg_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate invoice numbers: INV-YYYY-0001
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
    current_year TEXT;
    next_seq INT;
BEGIN
    current_year := to_char(NOW(), 'YYYY');
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(invoice_number FROM 10) AS INT)
    ), 0) + 1
    INTO next_seq
    FROM invoices
    WHERE invoice_number LIKE 'INV-' || current_year || '-%';

    NEW.invoice_number := 'INV-' || current_year || '-' || LPAD(next_seq::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_invoices_auto_number
    BEFORE INSERT ON invoices
    FOR EACH ROW
    WHEN (NEW.invoice_number IS NULL OR NEW.invoice_number = '')
    EXECUTE FUNCTION generate_invoice_number();

-- ============================================================
-- 4. Invoice Line Items
-- ============================================================
CREATE TABLE IF NOT EXISTS invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    fee_name VARCHAR(100) NOT NULL,
    amount BIGINT NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);

-- ============================================================
-- 5. Invoice Payments
-- ============================================================
CREATE TABLE IF NOT EXISTS invoice_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
    amount BIGINT NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method VARCHAR(30) NOT NULL DEFAULT 'bank_transfer',
    reference VARCHAR(100),
    received_by TEXT REFERENCES "user"(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_payment_method CHECK (payment_method IN ('cash', 'bank_transfer', 'mobile_money', 'cheque'))
);

CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_payment_date ON invoice_payments(payment_date DESC);

-- ============================================================
-- 6. Permissions
-- ============================================================
INSERT INTO permissions (name, description, module, action) VALUES
    ('View Finance', 'View invoices and financial data', 'finance', 'view'),
    ('Create Invoices', 'Create new invoices', 'finance', 'create'),
    ('Edit Invoices', 'Edit invoices and record payments', 'finance', 'edit'),
    ('Manage Fee Structure', 'Manage fee structures and academic year fees', 'finance', 'manage_fees')
ON CONFLICT (module, action) DO NOTHING;

-- Assign all finance permissions to admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin'
AND p.module = 'finance'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 7. Seed 2025/2026 Fee Structure (from school fee document)
-- ============================================================

-- Pre-Primary & Primary levels
INSERT INTO fee_structures (academic_year, year_group, level, tuition_amount, total_term_fee, books_fee) VALUES
    ('2025/2026', 'Nursery',  'pre_primary', 2200000, 2420000, 0),
    ('2025/2026', 'Junior',   'pre_primary', 2200000, 2420000, 0),
    ('2025/2026', 'Senior',   'pre_primary', 2200000, 2420000, 0),
    ('2025/2026', 'Yr 1',     'primary',     2500000, 2760000, 0),
    ('2025/2026', 'Yr 2',     'primary',     2500000, 2760000, 0),
    ('2025/2026', 'Yr 3',     'primary',     2500000, 2760000, 0),
    ('2025/2026', 'Yr 4',     'primary',     2500000, 2760000, 0),
    ('2025/2026', 'Yr 5',     'primary',     2750000, 3030000, 0),
    ('2025/2026', 'Yr 6',     'primary',     3000000, 3300000, 0)
ON CONFLICT (academic_year, year_group) DO NOTHING;

-- Secondary level
INSERT INTO fee_structures (academic_year, year_group, level, tuition_amount, total_term_fee, books_fee) VALUES
    ('2025/2026', '7',  'secondary', 4500000, 4960000, 0),
    ('2025/2026', '8',  'secondary', 4500000, 4960000, 0),
    ('2025/2026', '9',  'secondary', 5000000, 5500000, 0),
    ('2025/2026', '10', 'secondary', 5500000, 6050000, 0),
    ('2025/2026', '11', 'secondary', 6000000, 6600000, 0)
ON CONFLICT (academic_year, year_group) DO NOTHING;

-- Advanced level
INSERT INTO fee_structures (academic_year, year_group, level, tuition_amount, total_term_fee, books_fee) VALUES
    ('2025/2026', '12', 'advanced', 8000000, 8800000, 0),
    ('2025/2026', '13', 'advanced', 8000000, 8800000, 0)
ON CONFLICT (academic_year, year_group) DO NOTHING;

-- Other Charges (shared across year groups)
INSERT INTO fee_other_charges (academic_year, fee_name, amount, fee_type) VALUES
    ('2025/2026', 'Admission Fee',       300000,  'new_student'),
    ('2025/2026', 'Application Form Fee', 50000,  'new_student'),
    ('2025/2026', 'Interview Fee',        60000,  'new_student'),
    ('2025/2026', 'Development Fee',     300000,  'annual')
ON CONFLICT (academic_year, fee_name) DO NOTHING;
