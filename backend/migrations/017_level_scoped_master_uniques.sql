-- Replace global master-data uniqueness with level-scoped uniqueness.
-- Null or blank levels are treated as one shared scope.

ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key;
ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_name_key;
ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_code_key;
ALTER TABLE shelf_locations DROP CONSTRAINT IF EXISTS shelf_locations_code_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_name_level
    ON categories (LOWER(TRIM(name)), COALESCE(NULLIF(TRIM(level), ''), '__shared__'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_classes_name_level
    ON classes (LOWER(TRIM(name)), COALESCE(NULLIF(TRIM(level), ''), '__shared__'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_subjects_code_level
    ON subjects (LOWER(TRIM(code)), COALESCE(NULLIF(TRIM(level), ''), '__shared__'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_shelf_locations_code_level
    ON shelf_locations (LOWER(TRIM(code)), COALESCE(NULLIF(TRIM(level), ''), '__shared__'));