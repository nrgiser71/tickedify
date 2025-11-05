# Research: Settings Screen Infrastructure

**Feature**: 056-je-mag-een (Settings Screen)
**Date**: 2025-11-05
**Status**: Complete

## Overview

Research existing Tickedify patterns for implementing the Settings screen infrastructure with sidebar navigation, database persistence, and extensible settings schema.

## Technical Decisions

### 1. Database Schema Design

**Decision**: Use JSONB column for flexible settings storage with user_id foreign key

**Rationale**:
- PostgreSQL JSONB provides efficient storage and querying for semi-structured data
- Allows schema evolution without migrations (add new settings without ALTER TABLE)
- Enables partial updates (update single setting without replacing entire object)
- Maintains relational integrity via user_id foreign key
- Follows existing Tickedify pattern for flexible data (similar to task metadata)

**Schema**:
```sql
CREATE TABLE user_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES gebruikers(id) ON DELETE CASCADE,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);
```

**Alternatives Considered**:
- Separate columns per setting (rejected: requires migration for each new setting)
- Key-value table (rejected: more complex queries, less efficient for bulk reads)
- No database (localStorage only) (rejected: spec requires database persistence)

### 2. API Endpoint Design

**Decision**: RESTful CRUD endpoints following existing Tickedify conventions

**Endpoints**:
- `GET /api/user-settings` - Fetch current user's settings
- `POST /api/user-settings` - Create or update settings (upsert pattern)
- Response format: `{ success: true/false, settings: {...}, error: "..." }`

**Rationale**:
- Matches existing Tickedify API patterns (consistent with /api/taak, /api/lijst/acties)
- Session-based authentication (existing req.session.userId pattern)
- Upsert pattern simplifies client logic (no need to check if settings exist)
- JSONB allows partial updates via PostgreSQL operators

**Alternatives Considered**:
- Separate POST (create) and PUT (update) (rejected: adds unnecessary complexity)
- GraphQL (rejected: no GraphQL infrastructure in Tickedify)
- WebSocket (rejected: overkill for simple CRUD operations)

### 3. Frontend Navigation Pattern

**Decision**: Extend existing sidebar navigation with Settings item below Search

**Implementation Approach**:
- Add Settings link in `public/app.html` sidebar after Search menu item
- Use gear icon (⚙️ or SVG) matching existing icon style
- CSS: Add `.nav-section-gap` class for spacing (margin-top: 20px)
- JavaScript: Add `showSettings()` function following existing `showDailyPlanning()` pattern
- Route handling: Add case in existing navigation switch statement

**Rationale**:
- Consistent with existing Tickedify UI patterns (Search, Trash, Daily Planning)
- Leverages existing navigation infrastructure (no new routing library)
- Visual spacing matches spec requirement (like Trash → Daily Planning gap)
- Gear icon is universal settings symbol

**Alternatives Considered**:
- Top navigation bar (rejected: sidebar is established pattern)
- Hamburger menu (rejected: unnecessary complexity for few items)
- Modal/popup (rejected: spec requires dedicated screen)

### 4. Settings Screen Layout

**Decision**: Empty placeholder screen with future extensibility structure

**Components**:
- Header: "Settings" with icon
- Content area: Placeholder text "Settings will be available here"
- Footer: "Save" button (disabled initially, enabled when settings exist)
- Structure: Prepare sections for future categories (Account, Preferences, etc.)

**Rationale**:
- Infrastructure-first approach per spec clarifications
- Single page layout as specified (no tabs initially)
- Manual save workflow (not auto-save)
- Extensible: Easy to add settings sections later

**Styling Approach**:
- Reuse existing `.main-content` container classes
- Match Daily Planning screen layout patterns
- Responsive design (existing mobile breakpoints)

**Alternatives Considered**:
- Tabbed interface from day 1 (rejected: YAGNI, spec says empty initially)
- Accordion sections (rejected: unnecessary for empty screen)
- Modal-based settings (rejected: spec requires dedicated screen)

### 5. State Management

**Decision**: Use existing Tickedify global state pattern

**Pattern**:
- Global `userSettings` object loaded on app init
- Modified via `loadUserSettings()` and `saveUserSettings()` functions
- Toast notifications for success/error feedback (existing pattern)
- Dirty state tracking for "unsaved changes" detection (future)

**Rationale**:
- Matches existing Tickedify patterns (currentUser, tasks, lists globals)
- No state management library needed (Vanilla JS requirement)
- Simple and sufficient for settings use case

**Alternatives Considered**:
- LocalStorage as source of truth (rejected: spec requires database)
- Event-driven architecture (rejected: overkill for current scope)
- React/Vue state (rejected: Vanilla JS constraint)

### 6. Testing Strategy

**Decision**: API-first testing via curl, then UI verification

**Test Approach**:
1. Database migration verification (table exists, constraints work)
2. API contract tests (GET returns empty settings for new user)
3. API contract tests (POST creates/updates settings)
4. UI navigation test (sidebar click navigates to settings screen)
5. UI spacing verification (visual check of Search → Settings gap)

**Rationale**:
- Constitutional requirement: Test-First via API
- Faster and more reliable than UI-only testing
- Direct verification of business logic
- UI testing only for UI-specific features

**Tools**:
- curl with `-s -L -k` flags for API testing
- Manual browser testing on dev.tickedify.com for UI
- PostgreSQL client for direct database verification

### 7. Migration Strategy

**Decision**: SQL migration file with rollback support

**Migration File**: `migrations/YYYYMMDDHHMMSS_add_user_settings_table.sql`

**Content**:
```sql
-- Up migration
CREATE TABLE IF NOT EXISTS user_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES gebruikers(id) ON DELETE CASCADE,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);

-- Down migration (commented for manual execution if needed)
-- DROP TABLE IF EXISTS user_settings;
```

**Rationale**:
- Follows existing Tickedify migration pattern
- Index on user_id for fast lookups
- CASCADE delete maintains referential integrity
- UNIQUE constraint prevents duplicate settings per user

## Constitutional Compliance

### Beta Freeze ✅
- Development on feature branch (056-je-mag-een)
- Testing on staging (dev.tickedify.com)
- No production deployment

### Staging-First ✅
- Merge to staging branch after development
- Vercel auto-deployment to dev.tickedify.com
- User testing before any production consideration

### Test-First via API ✅
- API endpoints tested via curl before UI testing
- Database state verified via direct queries
- UI testing only for visual/navigation aspects

### Simplicity ✅
- No new frameworks or libraries
- Leverages existing Tickedify patterns
- JSONB for flexibility without over-engineering
- Infrastructure-first approach (empty screen initially)

## Key Integration Points

### Existing Code Patterns to Follow

1. **Authentication** (from server.js):
   ```javascript
   // Existing pattern
   app.get('/api/user-settings', requireLogin, async (req, res) => {
       const userId = req.session.userId;
       // ... implementation
   });
   ```

2. **Database Queries** (from server.js):
   ```javascript
   // Existing pattern
   const result = await pool.query(
       'SELECT settings FROM user_settings WHERE user_id = $1',
       [userId]
   );
   ```

3. **Error Handling** (from server.js):
   ```javascript
   // Existing pattern
   res.json({ success: false, error: error.message });
   ```

4. **Frontend Navigation** (from app.js):
   ```javascript
   // Existing pattern
   function showSettings() {
       hideAllScreens();
       document.getElementById('settings-screen').style.display = 'block';
       setActiveNavItem('settings');
   }
   ```

5. **Toast Notifications** (from app.js):
   ```javascript
   // Existing pattern
   showToast('Settings saved successfully', 'success');
   showToast('Failed to save settings', 'error');
   ```

## Implementation Risks & Mitigations

### Risk 1: Database Migration on Staging
**Impact**: Could affect existing staging data
**Mitigation**:
- Test migration on local database first
- Use IF NOT EXISTS clause
- Verify no conflicts with existing tables

### Risk 2: Session State Sync
**Impact**: Settings might not reflect immediately after save
**Mitigation**:
- Reload settings from API after successful save
- Update global `userSettings` object immediately
- Toast notification confirms save success

### Risk 3: Extensibility Without Breaking Changes
**Impact**: Future settings additions might require schema changes
**Mitigation**:
- JSONB allows schema-less additions
- Version settings object if needed (e.g., `{ version: 1, ... }`)
- Document settings structure in data-model.md

## Next Steps (Phase 1)

1. Generate data-model.md with detailed user_settings schema
2. Create API contracts for GET/POST endpoints (OpenAPI spec)
3. Generate quickstart.md with testing scenarios
4. Update CLAUDE.md with Settings screen context

## References

- Feature Spec: `specs/056-je-mag-een/spec.md`
- Constitution: `.specify/memory/constitution.md`
- Existing Patterns: `ARCHITECTURE.md`, `server.js`, `public/app.js`
