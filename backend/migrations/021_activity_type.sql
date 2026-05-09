-- Add activity_type column to activities table
ALTER TABLE activities ADD COLUMN IF NOT EXISTS activity_type VARCHAR(20) NOT NULL DEFAULT 'test';

-- Add index for filtering by type
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(activity_type);
