-- Admin Dashboard v2 Performance Indexes
-- Migration 015
-- Created: 2025-10-18
-- Feature: Admin Dashboard v2 (T026)
-- Purpose: Optimize statistics query performance met strategic indexes

-- NOTE: This migration uses ACTUAL database column names (Dutch),
--       not the English names from data-model.md specification.

-- ============================================================================
-- Users table indexes
-- ============================================================================

-- User statistics performance
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_laatste_login ON users(laatste_login);
-- Note: idx_users_trial_end_date already exists with WHERE clause in migration 011-001
-- Note: idx_users_subscription_status already exists in migration 011-001
CREATE INDEX IF NOT EXISTS idx_users_account_type ON users(account_type);

-- User search performance (voor ILIKE queries in admin search)
-- Note: email already has UNIQUE constraint, maar explicit index helpt bij ILIKE
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_naam_lower ON users(LOWER(naam));

-- ============================================================================
-- Taken table indexes
-- ============================================================================

-- Task statistics and cascade operations
CREATE INDEX IF NOT EXISTS idx_taken_user_id ON taken(user_id);
CREATE INDEX IF NOT EXISTS idx_taken_afgewerkt ON taken(afgewerkt);
CREATE INDEX IF NOT EXISTS idx_taken_aangemaakt ON taken(aangemaakt);

-- Task grouping queries (project/context statistics via foreign keys)
CREATE INDEX IF NOT EXISTS idx_taken_project_id ON taken(project_id);
CREATE INDEX IF NOT EXISTS idx_taken_context_id ON taken(context_id);

-- Composite index voor user-specific completion queries
CREATE INDEX IF NOT EXISTS idx_taken_user_id_afgewerkt ON taken(user_id, afgewerkt);

-- Priority queries optimization
CREATE INDEX IF NOT EXISTS idx_taken_prioriteit ON taken(prioriteit);
CREATE INDEX IF NOT EXISTS idx_taken_top_prioriteit ON taken(top_prioriteit);

-- ============================================================================
-- Dagelijkse planning table indexes
-- ============================================================================

-- Planning queries performance
CREATE INDEX IF NOT EXISTS idx_dagelijkse_planning_user_id ON dagelijkse_planning(user_id);
CREATE INDEX IF NOT EXISTS idx_dagelijkse_planning_datum ON dagelijkse_planning(datum);

-- Composite index voor user-specific date queries
CREATE INDEX IF NOT EXISTS idx_dagelijkse_planning_user_datum ON dagelijkse_planning(user_id, datum);

-- Actie relation queries
CREATE INDEX IF NOT EXISTS idx_dagelijkse_planning_actie_id ON dagelijkse_planning(actie_id);

-- ============================================================================
-- Session table indexes
-- ============================================================================

-- Session management performance
CREATE INDEX IF NOT EXISTS idx_session_expire ON session(expire);

-- NOTE: Session table uses JSON (not JSONB), so we cannot create GIN index.
--       Force logout will need to use sequential scan on sess->>'passport'->>'user'
--       Consider migrating session.sess from JSON to JSONB in future migration for better performance.

-- ============================================================================
-- Related tables indexes voor Admin Dashboard queries
-- ============================================================================

-- Projecten table
CREATE INDEX IF NOT EXISTS idx_projecten_user_id ON projecten(user_id);
CREATE INDEX IF NOT EXISTS idx_projecten_aangemaakt ON projecten(aangemaakt);

-- Contexten table
CREATE INDEX IF NOT EXISTS idx_contexten_user_id ON contexten(user_id);
CREATE INDEX IF NOT EXISTS idx_contexten_aangemaakt ON contexten(aangemaakt);

-- Bijlagen table (storage statistics)
CREATE INDEX IF NOT EXISTS idx_bijlagen_user_id ON bijlagen(user_id);
CREATE INDEX IF NOT EXISTS idx_bijlagen_bestandsgrootte ON bijlagen(bestandsgrootte);
CREATE INDEX IF NOT EXISTS idx_bijlagen_geupload ON bijlagen(geupload);

-- Feedback table
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_aangemaakt ON feedback(aangemaakt);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);

-- Forensic logs table (admin audit trail)
CREATE INDEX IF NOT EXISTS idx_forensic_logs_user_id ON forensic_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_forensic_logs_timestamp ON forensic_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_forensic_logs_action ON forensic_logs(action);
CREATE INDEX IF NOT EXISTS idx_forensic_logs_category ON forensic_logs(category);

-- User storage usage
CREATE INDEX IF NOT EXISTS idx_user_storage_usage_user_id ON user_storage_usage(user_id);

-- Subscription history
CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id ON subscription_history(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_created_at ON subscription_history(created_at);
