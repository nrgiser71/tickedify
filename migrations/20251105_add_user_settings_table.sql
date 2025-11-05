-- Migration: Add user_settings table for extensible user preferences
-- Date: 2025-11-05
-- Feature: 056-je-mag-een (Settings Screen)

BEGIN;

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create index for fast user_id lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Verify table structure
DO $$
BEGIN
    -- Check foreign key exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name LIKE '%user_settings_user_id_fkey%'
        AND table_name = 'user_settings'
    ) THEN
        RAISE EXCEPTION 'Foreign key constraint missing on user_settings.user_id';
    END IF;

    -- Check unique constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_type = 'UNIQUE'
        AND table_name = 'user_settings'
        AND constraint_name LIKE '%user_id%'
    ) THEN
        RAISE EXCEPTION 'Unique constraint missing on user_settings.user_id';
    END IF;

    RAISE NOTICE 'user_settings table created successfully';
END $$;

COMMIT;

-- Rollback script (execute manually if needed):
-- BEGIN;
-- DROP TABLE IF EXISTS user_settings CASCADE;
-- COMMIT;
