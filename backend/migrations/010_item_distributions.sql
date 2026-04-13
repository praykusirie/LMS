-- Item distributions to teachers
CREATE TABLE IF NOT EXISTS item_distributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    distribution_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    issued_by TEXT REFERENCES "user"(id) ON DELETE SET NULL,
    level VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_item_distribution_level CHECK (level IS NULL OR level IN ('primary', 'secondary'))
);

CREATE INDEX IF NOT EXISTS idx_item_distributions_teacher_id ON item_distributions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_item_distributions_item_id ON item_distributions(item_id);
CREATE INDEX IF NOT EXISTS idx_item_distributions_distribution_date ON item_distributions(distribution_date DESC);
CREATE INDEX IF NOT EXISTS idx_item_distributions_level ON item_distributions(level);

CREATE OR REPLACE TRIGGER trg_item_distributions_updated_at
    BEFORE UPDATE ON item_distributions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
