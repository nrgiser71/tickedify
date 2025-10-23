-- ===================================================================
-- TICKEDIFY MESSAGING SYSTEM - DATABASE SETUP
-- Feature: 026-lees-messaging-system
-- Phase 1: Core Foundation
-- ===================================================================

-- BELANGRIJK: Voer dit SQL bestand uit in Neon Console
-- URL: https://console.neon.tech → select tickedify database → SQL Editor

-- ===================================================================
-- TABLE 1: admin_messages
-- Stores all messages created by admin
-- ===================================================================

CREATE TABLE admin_messages (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'information',
  target_type VARCHAR(50) DEFAULT 'all',
  target_subscription VARCHAR(50)[],
  target_search TEXT,
  target_users VARCHAR(50)[],
  trigger_type VARCHAR(50) DEFAULT 'immediate',
  trigger_value TEXT,
  dismissible BOOLEAN DEFAULT TRUE,
  snoozable BOOLEAN DEFAULT TRUE,
  snooze_durations INTEGER[] DEFAULT ARRAY[3600, 14400, 86400],
  publish_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  button_label VARCHAR(100),
  button_action VARCHAR(50),
  button_target TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for admin_messages
CREATE INDEX idx_admin_messages_active ON admin_messages(active);
CREATE INDEX idx_admin_messages_publish_expires ON admin_messages(publish_at, expires_at);

-- ===================================================================
-- TABLE 2: message_interactions
-- Tracks user interactions with messages (dismissed, snoozed, etc.)
-- ===================================================================

CREATE TABLE message_interactions (
  message_id INTEGER REFERENCES admin_messages(id) ON DELETE CASCADE,
  user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
  snoozed_until TIMESTAMP,
  dismissed BOOLEAN DEFAULT FALSE,
  first_shown_at TIMESTAMP DEFAULT NOW(),
  last_shown_at TIMESTAMP DEFAULT NOW(),
  shown_count INTEGER DEFAULT 1,
  button_clicked BOOLEAN DEFAULT FALSE,
  button_clicked_at TIMESTAMP,
  PRIMARY KEY (message_id, user_id)
);

-- Indexes for message_interactions
CREATE INDEX idx_message_interactions_user ON message_interactions(user_id);
CREATE INDEX idx_message_interactions_snoozed ON message_interactions(snoozed_until)
  WHERE snoozed_until IS NOT NULL;
CREATE INDEX idx_message_interactions_status ON message_interactions(user_id, dismissed, snoozed_until);

-- ===================================================================
-- TABLE 3: user_page_visits
-- Tracks page visits per user for trigger conditions
-- ===================================================================

CREATE TABLE user_page_visits (
  user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
  page_identifier VARCHAR(100) NOT NULL,
  visit_count INTEGER DEFAULT 1,
  first_visit_at TIMESTAMP DEFAULT NOW(),
  last_visit_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, page_identifier)
);

-- Index for user_page_visits
CREATE INDEX idx_user_page_visits_count ON user_page_visits(page_identifier, visit_count);

-- ===================================================================
-- TABLE 4: Add subscription_type to users table (if not exists)
-- ===================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_type VARCHAR(50) DEFAULT 'free';
CREATE INDEX IF NOT EXISTS idx_users_subscription ON users(subscription_type, created_at);

-- ===================================================================
-- VERIFICATION QUERIES
-- Run these to verify successful creation
-- ===================================================================

-- Should return 3 rows (admin_messages, message_interactions, user_page_visits)
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('admin_messages', 'message_interactions', 'user_page_visits');

-- Should return column info
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'admin_messages' ORDER BY ordinal_position;

-- Should return 1 if subscription_type exists
SELECT COUNT(*) FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'subscription_type';

-- ===================================================================
-- SETUP COMPLETE
-- Next step: Implement backend endpoints in server.js
-- ===================================================================
