-- Migration: Create page_help table for Feature 062
-- Created: 2025-11-09
-- Purpose: Store admin-configurable help content for pages

CREATE TABLE IF NOT EXISTS page_help (
  page_id VARCHAR(50) PRIMARY KEY,
  content TEXT NOT NULL,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_by VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_page_help_modified ON page_help(modified_at DESC);

-- Verify table creation
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'page_help'
ORDER BY ordinal_position;
