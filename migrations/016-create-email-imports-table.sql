-- Migration 016: Create email_imports table
-- Created: 2025-10-19
-- Purpose: Track email imports for analytics in Admin Dashboard v2

-- Create email_imports table
CREATE TABLE IF NOT EXISTS email_imports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    from_email VARCHAR(255),
    subject TEXT,
    body TEXT,
    imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    task_id VARCHAR(50) REFERENCES taken(id) ON DELETE SET NULL,
    processed BOOLEAN DEFAULT false
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_imports_user_id ON email_imports(user_id);
CREATE INDEX IF NOT EXISTS idx_email_imports_imported_at ON email_imports(imported_at);
CREATE INDEX IF NOT EXISTS idx_email_imports_task_id ON email_imports(task_id);

-- Grant permissions (if needed)
-- GRANT SELECT, INSERT, UPDATE ON email_imports TO tickedify_app;

-- Verify table creation
SELECT 'email_imports table created successfully' AS status;
