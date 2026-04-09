-- Add gender column to teachers table
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS gender VARCHAR(10) DEFAULT 'male';

-- Add gender column to user table (better-auth users)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS gender VARCHAR(10) DEFAULT 'male';
