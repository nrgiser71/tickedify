-- Migration: Add Account Settings Block functionality
-- Feature: 058-dan-mag-je
-- Date: 2025-11-05
-- Version: 0.21.93
-- Description: Add user account metadata tracking and password reset tokens

-- =====================================================
-- PART 1: Extend users table with account metadata
-- =====================================================

-- Add last_login tracking
ALTER TABLE users
  ADD COLUMN last_login TIMESTAMP DEFAULT NULL;

-- Add task statistics counters
ALTER TABLE users
  ADD COLUMN total_tasks_created INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN total_tasks_completed INTEGER DEFAULT 0 NOT NULL;

-- Add check constraint for non-negative task counts
ALTER TABLE users
  ADD CONSTRAINT chk_users_task_counts_nonnegative
  CHECK (total_tasks_created >= 0 AND total_tasks_completed >= 0);

-- =====================================================
-- PART 2: Backfill existing users' task statistics
-- =====================================================

-- Backfill total_tasks_created with existing data
UPDATE users u
SET total_tasks_created = (
  SELECT COUNT(*)
  FROM taken t
  WHERE t.user_id = u.id
);

-- Backfill total_tasks_completed with existing data
UPDATE users u
SET total_tasks_completed = (
  SELECT COUNT(*)
  FROM taken t
  WHERE t.user_id = u.id
    AND t.afgewerkt IS NOT NULL
);

-- Note: last_login remains NULL for existing users until next login

-- =====================================================
-- PART 3: Create password_reset_tokens table
-- =====================================================

CREATE TABLE password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  user_agent TEXT DEFAULT NULL
);

-- Create indexes for efficient queries
CREATE INDEX idx_password_reset_tokens_user_id
  ON password_reset_tokens(user_id);

CREATE INDEX idx_password_reset_tokens_expires_at
  ON password_reset_tokens(expires_at);

-- Add check constraint for token_hash length (SHA-256 = 64 hex chars)
ALTER TABLE password_reset_tokens
  ADD CONSTRAINT chk_password_reset_tokens_hash_length
  CHECK (LENGTH(token_hash) = 64);

-- =====================================================
-- VERIFICATION QUERIES (run after migration)
-- =====================================================

-- Verify users table has new columns
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'users'
-- AND column_name IN ('last_login', 'total_tasks_created', 'total_tasks_completed');

-- Verify password_reset_tokens table exists
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'password_reset_tokens'
-- ORDER BY ordinal_position;

-- Verify indexes created
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'password_reset_tokens';

-- Verify check constraints
-- SELECT conname, contype, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'password_reset_tokens'::regclass
--   AND contype = 'c';

-- =====================================================
-- MIGRATION SUCCESS
-- =====================================================
-- Migration completed successfully
-- Users table: 3 new columns added (last_login, total_tasks_created, total_tasks_completed)
-- Password reset table: Created with 8 columns + 2 indexes + 1 check constraint
-- Backfill: Existing users' task statistics populated from taken table
