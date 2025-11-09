# Data Model: Page Help Icons

## Entity: PageHelp

Represents help content for a specific page in the application.

### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| page_id | VARCHAR(50) | PRIMARY KEY, NOT NULL | Unique identifier for the page (e.g., 'inbox', 'acties') |
| content | TEXT | NOT NULL | Markdown-formatted help content |
| modified_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Timestamp of last modification |
| modified_by | VARCHAR(50) | NULL | Identifier of admin user who made the change |

### Database Schema

```sql
CREATE TABLE page_help (
  page_id VARCHAR(50) PRIMARY KEY,
  content TEXT NOT NULL,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_by VARCHAR(50)
);

-- Index for admin queries (list all with modification info)
CREATE INDEX idx_page_help_modified ON page_help(modified_at DESC);
```

### Relationships

- **No foreign keys**: page_id references are logical (view identifiers) not database references
- **No user FK**: modified_by is informational only, no enforcement
- **Standalone table**: Help content independent of other entities

### Valid page_id Values

The following page identifiers are valid (matching SPA view names):

1. `inbox` - Inbox page
2. `acties` - Acties (Actions) page
3. `opvolgen` - Opvolgen (Follow-up) page
4. `dagelijkse-planning` - Dagelijkse Planning (Daily Planning) page
5. `uitgesteld-wekelijks` - Uitgesteld Wekelijks (Postponed Weekly) page
6. `uitgesteld-maandelijks` - Uitgesteld Maandelijks (Postponed Monthly) page
7. `uitgesteld-3maandelijks` - Uitgesteld 3-maandelijks (Postponed Quarterly) page
8. `uitgesteld-6maandelijks` - Uitgesteld 6-maandelijks (Postponed Bi-annual) page
9. `uitgesteld-jaarlijks` - Uitgesteld Jaarlijks (Postponed Yearly) page
10. `afgewerkt` - Afgewerkt (Completed) page
11. `email-import` - Email Import page

**Excluded pages**: CSV Import, Settings (per requirements)

### State Transitions

**Initial State**: No database entry exists (default content served from code)

**Transitions**:
1. **Admin creates content** → Row inserted into database
2. **Admin updates content** → Row updated, modified_at refreshed
3. **Admin deletes content** → Row deleted, fallback to default

**No user-facing state**: All users see same content (no per-user customization)

### Validation Rules

#### page_id Validation
- MUST match one of the 11 valid page identifiers
- MUST be lowercase
- MUST use hyphens (not underscores or spaces)
- Example valid: `inbox`, `dagelijkse-planning`
- Example invalid: `Inbox`, `dagelijkse_planning`, `invalid-page`

#### content Validation
- MUST NOT be empty string
- MUST be valid UTF-8 text
- SHOULD be valid markdown (but not enforced at DB level)
- No maximum length (TEXT type supports up to 65,535 characters)
- Recommended: Keep under 5,000 characters for UX

#### modified_at Validation
- Automatically managed by database
- READ-ONLY from application perspective
- Used for audit trail and cache invalidation

#### modified_by Validation
- OPTIONAL (can be NULL)
- If provided, SHOULD reference admin user identifier
- No foreign key constraint (informational only)
- Example: "admin", "jan@tickedify.com"

### Default Content Strategy

**Fallback Logic**:
```
1. Query database for page_id
2. If row exists → Return content from database
3. If row NOT exists → Return hardcoded default from application code
4. If page_id invalid → Return error
```

**Default Content Storage**:
- Stored in application code (not database)
- Defined in JavaScript object or separate content file
- English language (per UI language policy)
- Can be overridden by database entry

**Example Default Content Object**:
```javascript
const DEFAULT_PAGE_HELP = {
  'inbox': `# Inbox

The **Inbox** is where all new tasks arrive before being processed.

## How to use
- Add tasks quickly without worrying about details
- Process inbox regularly to move tasks to appropriate lists
- Use drag & drop to move tasks to Acties or Opvolgen`,

  'acties': `# Acties

Your **action list** contains tasks you've committed to do.

## How to use
- Drag tasks from Inbox that you want to work on
- Prioritize using the star checkbox (max 3 priorities)
- Drag to Daily Planning to schedule execution`,

  // ... other pages
};
```

### Query Patterns

#### Fetch help content for specific page
```sql
-- Application query (with fallback logic in code)
SELECT content, modified_at, modified_by
FROM page_help
WHERE page_id = $1;

-- If no rows: return DEFAULT_PAGE_HELP[pageId]
```

#### Admin list all help content
```sql
-- Show all pages with modification info
SELECT page_id,
       LEFT(content, 100) as preview,
       modified_at,
       modified_by
FROM page_help
ORDER BY modified_at DESC;

-- Include pages with defaults (application logic joins defaults)
```

#### Admin update help content
```sql
-- Insert or update pattern (UPSERT)
INSERT INTO page_help (page_id, content, modified_by)
VALUES ($1, $2, $3)
ON CONFLICT (page_id)
DO UPDATE SET
  content = EXCLUDED.content,
  modified_at = CURRENT_TIMESTAMP,
  modified_by = EXCLUDED.modified_by;
```

#### Admin delete help content (revert to default)
```sql
DELETE FROM page_help
WHERE page_id = $1;

-- Application then serves DEFAULT_PAGE_HELP[pageId]
```

### Performance Considerations

**Indexing**:
- PRIMARY KEY on `page_id` provides fast lookups
- Additional index on `modified_at` for admin list queries
- No full-text index needed (content not searched)

**Caching**:
- Client-side: localStorage cache with 24-hour TTL
- Server-side: Optional in-memory cache for default content
- Cache invalidation: modified_at timestamp comparison

**Scalability**:
- Fixed dataset size (11 pages maximum)
- No growth over time (pages don't multiply)
- Minimal database load (infrequent writes, cached reads)

### Migration Strategy

**Initial Deployment**:
```sql
-- Create table (no initial data)
CREATE TABLE page_help (
  page_id VARCHAR(50) PRIMARY KEY,
  content TEXT NOT NULL,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_by VARCHAR(50)
);

CREATE INDEX idx_page_help_modified ON page_help(modified_at DESC);

-- Default content served from code (no INSERT statements)
```

**Future Migrations**:
- New pages: Add to DEFAULT_PAGE_HELP object (code change only)
- Schema changes: Standard ALTER TABLE migrations
- Content updates: Admin interface (no migration needed)

### Security & Access Control

**Read Access**:
- All authenticated users can fetch help content
- No sensitive information in help content
- Public-facing educational content

**Write Access**:
- ONLY admin users can modify help content
- Endpoint protection via admin authentication middleware
- Audit trail via `modified_by` field

**Validation**:
- Server-side validation of page_id against whitelist
- Markdown sanitization not required (admin-only input)
- SQL injection prevention via parameterized queries

### Data Integrity

**Constraints**:
- PRIMARY KEY ensures one help content per page
- NOT NULL on content prevents empty help
- No orphaned references (no foreign keys)

**Backup Strategy**:
- Included in regular database backups
- Default content in code serves as disaster recovery
- Version control tracks default content changes

### Example Data

```sql
-- Example after admin customization
INSERT INTO page_help (page_id, content, modified_by) VALUES
('inbox', '# Inbox - Custom Help

**Updated** help content for inbox with custom instructions.

- Custom point 1
- Custom point 2', 'admin'),

('acties', '# Acties - Custom Help

This is customized help for the Acties page.

## New section
Additional guidance here.', 'admin');

-- Other pages not in database → serve default from code
```

## Summary

- **Simple, flat structure**: Single table, no complex relationships
- **Hybrid storage**: Database for overrides, code for defaults
- **Audit trail**: modified_at and modified_by tracking
- **Scalable**: Fixed dataset size, efficient indexing
- **Secure**: Admin-only writes, public reads
- **Resilient**: Defaults in code provide fallback
