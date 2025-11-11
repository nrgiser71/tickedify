# Tasks: Separate Test Environment with Database Isolation

**Input**: Design documents from `/specs/064-we-moeten-werk/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → SUCCESS: Tech stack extracted (Node.js 18+, Express.js, PostgreSQL)
   → Structure: Single monolith (server.js + public/)
2. Load optional design documents:
   → data-model.md: No new entities (infrastructure only)
   → contracts/: 1 file → 7 API endpoints
   → research.md: 7 technical decisions extracted
   → quickstart.md: 5 test phases identified
3. Generate tasks by category:
   → Setup: Manual (Neon DB + Vercel env vars) + backend connection pools
   → Tests: 7 contract tests (1 per endpoint)
   → Core: 7 API endpoint implementations + Admin UI
   → Integration: Environment routing + dual connection management
   → Polish: Integration testing via quickstart.md scenarios
4. Apply task rules:
   → Contract tests can run parallel [P] (different endpoints)
   → Backend endpoints sequential (same server.js file)
   → Frontend UI components sequential (same admin2.html/js)
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001-T020)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All 7 contracts have tests ✅
   → All endpoints implemented ✅
   → Quickstart validation included ✅
9. Return: SUCCESS (20 tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[M]**: Manual task (requires human action)
- Include exact file paths in descriptions

## Path Conventions
**Tickedify uses Single Project structure**:
- Backend: `server.js` (monolith)
- Frontend: `public/admin2.html`, `public/admin2.js`, `public/admin2.css`
- Environment: `.env` (local), Vercel dashboard (production/staging)
- Database: Neon PostgreSQL (production + test)

---

## Phase 3.1: Infrastructure Setup (Manual)

### T001 [M] Create test database on Neon
**Manual task - Admin execution required**

**Actions**:
1. Navigate to Neon dashboard: https://console.neon.tech
2. Select Tickedify project
3. Click "Create Database"
4. Configure:
   - Database name: `tickedify_test`
   - Owner: Default postgres user
   - Branch: main (same as production)
5. Copy connection string: `postgresql://user:password@host/tickedify_test?sslmode=require`
6. Test connection: `psql "CONNECTION_STRING" -c "SELECT version();"`

**Success Criteria**:
- [ ] Test database exists on Neon
- [ ] Connection string copied
- [ ] Connection verified with psql

**Dependencies**: None (first task)

---

### T002 [M] Configure Vercel environment variables
**Manual task - Admin execution required**

**Actions**:
1. Navigate to Vercel dashboard: https://vercel.com/tickedify/tickedify/settings/environment-variables
2. Add new variable:
   - Key: `DATABASE_URL_TEST`
   - Value: Connection string from T001
   - Environments: Preview + Development (NOT Production)
3. Verify existing `DATABASE_URL` unchanged
4. Save configuration

**Success Criteria**:
- [ ] `DATABASE_URL_TEST` exists for Preview + Development
- [ ] `DATABASE_URL` remains for Production + Preview + Development
- [ ] Production environment ONLY has `DATABASE_URL`

**Dependencies**: T001 (needs connection string)

---

## Phase 3.2: Backend Connection Infrastructure

### T003 Add test database connection pool to server.js
**File**: `server.js` (lines ~20-50, after production pool initialization)

**Implementation**:
```javascript
// After existing productionPool initialization

// Test database pool (only if DATABASE_URL_TEST exists)
let testPool = null;
if (process.env.DATABASE_URL_TEST) {
  testPool = new Pool({
    connectionString: process.env.DATABASE_URL_TEST,
    max: 10, // Smaller pool for test environment
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  });

  console.log('Test database pool initialized');
}

// Helper function to get correct pool based on context
function getPool(useTest = false) {
  if (useTest && !testPool) {
    throw new Error('Test database not configured - DATABASE_URL_TEST missing');
  }
  return useTest ? testPool : productionPool;
}
```

**Success Criteria**:
- [ ] Test pool initialized only if DATABASE_URL_TEST exists
- [ ] Production pool remains unchanged
- [ ] getPool() helper function available
- [ ] No breaking changes to existing code

**Dependencies**: T002 (needs environment variable configured)

---

### T004 Implement environment-based connection routing in server.js
**File**: `server.js` (lines ~50-80, after pool initialization)

**Implementation**:
```javascript
// Environment detection helper
function getEnvironment() {
  return process.env.VERCEL_ENV || 'development';
}

// Determine which database to use for admin operations
function useTestDatabase() {
  const env = getEnvironment();
  // Admin operations on staging (preview) use test database
  return env === 'preview' && testPool !== null;
}

// Export for use in admin endpoints
module.exports.getPool = getPool;
module.exports.useTestDatabase = useTestDatabase;
module.exports.productionPool = productionPool;
module.exports.testPool = testPool;
```

**Success Criteria**:
- [ ] Environment detection works correctly
- [ ] Staging environment routes to test DB (when available)
- [ ] Production environment always routes to production DB
- [ ] Functions exported for endpoint use

**Dependencies**: T003 (needs pool initialization)

---

## Phase 3.3: Contract Tests (TDD) ⚠️ MUST COMPLETE BEFORE IMPLEMENTATION

**CRITICAL**: All tests below MUST be written and MUST FAIL before implementing endpoints.

### T005 [P] Contract test: GET /api/admin/test-db/verify
**File**: `tests/contract/test-admin-verify.js` (new file)

**Implementation**:
```javascript
const request = require('supertest');
const app = require('../../server');

describe('GET /api/admin/test-db/verify', () => {
  it('should return connection status for both databases', async () => {
    const response = await request(app)
      .get('/api/admin/test-db/verify')
      .set('Cookie', 'session=ADMIN_SESSION'); // Mock admin session

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('production');
    expect(response.body.production).toHaveProperty('connected');
    expect(response.body).toHaveProperty('test');
    expect(response.body.test).toHaveProperty('connected');
  });

  it('should require admin authentication', async () => {
    const response = await request(app)
      .get('/api/admin/test-db/verify');

    expect(response.status).toBe(401); // Unauthorized
  });
});
```

**Success Criteria**:
- [ ] Test file created
- [ ] Test verifies response schema
- [ ] Test checks auth requirement
- [ ] Test FAILS (endpoint not implemented yet)

**Dependencies**: T004 (needs pool infrastructure)

---

### T006 [P] Contract test: POST /api/admin/test-db/copy-schema
**File**: `tests/contract/test-admin-copy-schema.js` (new file)

**Implementation**:
```javascript
const request = require('supertest');
const app = require('../../server');

describe('POST /api/admin/test-db/copy-schema', () => {
  it('should copy schema and return success response', async () => {
    const response = await request(app)
      .post('/api/admin/test-db/copy-schema')
      .set('Cookie', 'session=ADMIN_SESSION')
      .send({ confirm: true });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.tablesCreated).toBeGreaterThan(0);
    expect(response.body).toHaveProperty('duration');
  });

  it('should reject without confirmation', async () => {
    const response = await request(app)
      .post('/api/admin/test-db/copy-schema')
      .set('Cookie', 'session=ADMIN_SESSION')
      .send({ confirm: false });

    expect(response.status).toBe(400);
  });
});
```

**Success Criteria**:
- [ ] Test verifies schema copy response
- [ ] Test checks confirmation requirement
- [ ] Test FAILS (endpoint not implemented)

**Dependencies**: T004 (needs pool infrastructure)

---

### T007 [P] Contract test: GET /api/admin/production-users
**File**: `tests/contract/test-admin-production-users.js` (new file)

**Implementation**:
```javascript
const request = require('supertest');
const app = require('../../server');

describe('GET /api/admin/production-users', () => {
  it('should return list of production users', async () => {
    const response = await request(app)
      .get('/api/admin/production-users')
      .set('Cookie', 'session=ADMIN_SESSION');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('users');
    expect(Array.isArray(response.body.users)).toBe(true);

    if (response.body.users.length > 0) {
      const user = response.body.users[0];
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('username');
      expect(user).toHaveProperty('email');
    }
  });
});
```

**Success Criteria**:
- [ ] Test verifies user list response
- [ ] Test checks array structure
- [ ] Test FAILS (endpoint not implemented)

**Dependencies**: T004 (needs pool infrastructure)

---

### T008 [P] Contract test: POST /api/admin/test-db/copy-user
**File**: `tests/contract/test-admin-copy-user.js` (new file)

**Implementation**:
```javascript
const request = require('supertest');
const app = require('../../server');

describe('POST /api/admin/test-db/copy-user', () => {
  it('should copy user and return success response', async () => {
    const response = await request(app)
      .post('/api/admin/test-db/copy-user')
      .set('Cookie', 'session=ADMIN_SESSION')
      .send({ userId: 1, confirm: true });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body).toHaveProperty('userEmail');
    expect(response.body).toHaveProperty('tasksCopied');
  });

  it('should return 409 for duplicate user', async () => {
    // First copy
    await request(app)
      .post('/api/admin/test-db/copy-user')
      .set('Cookie', 'session=ADMIN_SESSION')
      .send({ userId: 1, confirm: true });

    // Second copy (duplicate)
    const response = await request(app)
      .post('/api/admin/test-db/copy-user')
      .set('Cookie', 'session=ADMIN_SESSION')
      .send({ userId: 1, confirm: true });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('UserAlreadyExists');
  });
});
```

**Success Criteria**:
- [ ] Test verifies copy success response
- [ ] Test checks duplicate prevention (409)
- [ ] Test FAILS (endpoint not implemented)

**Dependencies**: T004 (needs pool infrastructure)

---

### T009 [P] Contract test: GET /api/admin/test-users
**File**: `tests/contract/test-admin-test-users.js` (new file)

**Implementation**:
```javascript
const request = require('supertest');
const app = require('../../server');

describe('GET /api/admin/test-users', () => {
  it('should return list of test database users', async () => {
    const response = await request(app)
      .get('/api/admin/test-users')
      .set('Cookie', 'session=ADMIN_SESSION');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('users');
    expect(Array.isArray(response.body.users)).toBe(true);
  });
});
```

**Success Criteria**:
- [ ] Test verifies test user list response
- [ ] Test FAILS (endpoint not implemented)

**Dependencies**: T004 (needs pool infrastructure)

---

### T010 [P] Contract test: DELETE /api/admin/test-db/user/:userId
**File**: `tests/contract/test-admin-delete-user.js` (new file)

**Implementation**:
```javascript
const request = require('supertest');
const app = require('../../server');

describe('DELETE /api/admin/test-db/user/:userId', () => {
  it('should delete user and return success response', async () => {
    const response = await request(app)
      .delete('/api/admin/test-db/user/1')
      .set('Cookie', 'session=ADMIN_SESSION');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body).toHaveProperty('deletedTasks');
  });

  it('should return 404 for non-existent user', async () => {
    const response = await request(app)
      .delete('/api/admin/test-db/user/99999')
      .set('Cookie', 'session=ADMIN_SESSION');

    expect(response.status).toBe(404);
  });
});
```

**Success Criteria**:
- [ ] Test verifies delete success response
- [ ] Test checks 404 for missing user
- [ ] Test FAILS (endpoint not implemented)

**Dependencies**: T004 (needs pool infrastructure)

---

### T011 [P] Contract test: POST /api/admin/test-db/clear
**File**: `tests/contract/test-admin-clear.js` (new file)

**Implementation**:
```javascript
const request = require('supertest');
const app = require('../../server');

describe('POST /api/admin/test-db/clear', () => {
  it('should clear database and return success response', async () => {
    const response = await request(app)
      .post('/api/admin/test-db/clear')
      .set('Cookie', 'session=ADMIN_SESSION')
      .send({ confirm: true });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.tablesCleared).toBeGreaterThan(0);
  });

  it('should reject without confirmation', async () => {
    const response = await request(app)
      .post('/api/admin/test-db/clear')
      .set('Cookie', 'session=ADMIN_SESSION')
      .send({ confirm: false });

    expect(response.status).toBe(400);
  });
});
```

**Success Criteria**:
- [ ] Test verifies clear success response
- [ ] Test checks confirmation requirement
- [ ] Test FAILS (endpoint not implemented)

**Dependencies**: T004 (needs pool infrastructure)

---

## Phase 3.4: Backend API Implementation (ONLY after tests fail)

**⚠️ CRITICAL**: Do NOT start this phase until ALL contract tests (T005-T011) are written and failing.

### T012 Implement 7 admin API endpoints in server.js
**File**: `server.js` (lines ~2500+, new admin section)

**Endpoints to implement** (sequential - same file):
1. `GET /api/admin/test-db/verify` - Verify both database connections
2. `POST /api/admin/test-db/copy-schema` - Copy schema from production to test
3. `GET /api/admin/production-users` - List production users
4. `POST /api/admin/test-db/copy-user` - Copy user to test database
5. `GET /api/admin/test-users` - List test database users
6. `DELETE /api/admin/test-db/user/:userId` - Delete user from test database
7. `POST /api/admin/test-db/clear` - Clear test database

**Implementation structure**:
```javascript
// Admin Test Environment Management Endpoints

// 1. Verify database connections
app.get('/api/admin/test-db/verify', requireAdmin, async (req, res) => {
  try {
    const prodCheck = await productionPool.query('SELECT 1');
    const testCheck = testPool ? await testPool.query('SELECT 1') : null;

    res.json({
      production: {
        connected: prodCheck.rowCount === 1,
        latency: prodCheck.duration || 0
      },
      test: {
        connected: testCheck ? testCheck.rowCount === 1 : false,
        configured: testPool !== null
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'DatabaseVerificationFailed', message: error.message });
  }
});

// 2. Copy schema (pg_dump + restore)
app.post('/api/admin/test-db/copy-schema', requireAdmin, async (req, res) => {
  if (!req.body.confirm) {
    return res.status(400).json({ error: 'BadRequest', message: 'Confirmation required' });
  }

  try {
    const startTime = Date.now();

    // Use pg_dump via child_process to export schema
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);

    // Step 1: Export production schema
    await execPromise(`pg_dump --schema-only ${process.env.DATABASE_URL} > /tmp/schema.sql`);

    // Step 2: Clear test database
    await testPool.query('DROP SCHEMA public CASCADE');
    await testPool.query('CREATE SCHEMA public');

    // Step 3: Import schema to test
    await execPromise(`psql ${process.env.DATABASE_URL_TEST} < /tmp/schema.sql`);

    const duration = Date.now() - startTime;

    res.json({
      success: true,
      tablesCreated: 12, // Hardcoded or query information_schema
      duration,
      details: 'Schema copied successfully with all constraints and indexes'
    });
  } catch (error) {
    res.status(500).json({ error: 'SchemaCopyFailed', message: error.message });
  }
});

// 3. List production users
app.get('/api/admin/production-users', requireAdmin, async (req, res) => {
  try {
    const result = await productionPool.query(
      'SELECT id, username, email FROM users ORDER BY id'
    );

    res.json({ users: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'QueryFailed', message: error.message });
  }
});

// 4. Copy user to test (with duplicate prevention)
app.post('/api/admin/test-db/copy-user', requireAdmin, async (req, res) => {
  const { userId, confirm } = req.body;

  if (!confirm) {
    return res.status(400).json({ error: 'BadRequest', message: 'Confirmation required' });
  }

  try {
    // Check if user exists in production
    const prodUser = await productionPool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (prodUser.rows.length === 0) {
      return res.status(404).json({ error: 'UserNotFound', message: `User ID ${userId} not found` });
    }

    const user = prodUser.rows[0];

    // Check for duplicate in test
    const testUser = await testPool.query('SELECT id FROM users WHERE email = $1', [user.email]);
    if (testUser.rows.length > 0) {
      return res.status(409).json({
        error: 'UserAlreadyExists',
        message: `User ${user.email} already exists in test database`
      });
    }

    // Copy user and related data in transaction
    const client = await testPool.connect();
    try {
      await client.query('BEGIN');

      // Copy user
      await client.query(
        'INSERT INTO users (id, username, password_hash, email, email_import_code) VALUES ($1, $2, $3, $4, $5)',
        [user.id, user.username, user.password_hash, user.email, user.email_import_code]
      );

      // Copy taken
      const taken = await productionPool.query('SELECT * FROM taken WHERE user_id = $1', [userId]);
      let tasksCopied = 0;
      for (const taak of taken.rows) {
        await client.query(
          'INSERT INTO taken (...) VALUES (...)', // Full INSERT statement
          [/* taak values */]
        );
        tasksCopied++;
      }

      // Copy other related data (projecten, contexten, subtaken, bijlagen, feedback)
      // ... (similar pattern for each table)

      await client.query('COMMIT');

      res.json({
        success: true,
        userEmail: user.email,
        tasksCopied,
        duration: Date.now() - startTime
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    res.status(500).json({ error: 'CopyFailed', message: error.message });
  }
});

// 5. List test users
app.get('/api/admin/test-users', requireAdmin, async (req, res) => {
  try {
    const result = await testPool.query(
      'SELECT id, username, email FROM users ORDER BY id'
    );

    res.json({ users: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'QueryFailed', message: error.message });
  }
});

// 6. Delete user from test
app.delete('/api/admin/test-db/user/:userId', requireAdmin, async (req, res) => {
  const userId = req.params.userId;

  try {
    // Check if user exists
    const user = await testPool.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'UserNotFound', message: 'User not found in test database' });
    }

    // Count related data before delete
    const taskCount = await testPool.query('SELECT COUNT(*) FROM taken WHERE user_id = $1', [userId]);

    // Delete user (cascades via foreign keys)
    await testPool.query('DELETE FROM feedback WHERE user_id = $1', [userId]);
    await testPool.query('DELETE FROM taken WHERE user_id = $1', [userId]); // Cascades to subtaken, bijlagen
    await testPool.query('DELETE FROM users WHERE id = $1', [userId]);

    res.json({
      success: true,
      deletedTasks: parseInt(taskCount.rows[0].count)
    });
  } catch (error) {
    res.status(500).json({ error: 'DeleteFailed', message: error.message });
  }
});

// 7. Clear test database
app.post('/api/admin/test-db/clear', requireAdmin, async (req, res) => {
  if (!req.body.confirm) {
    return res.status(400).json({ error: 'BadRequest', message: 'Confirmation required' });
  }

  try {
    // Delete in correct order (foreign keys)
    await testPool.query('DELETE FROM feedback');
    await testPool.query('DELETE FROM bijlagen');
    await testPool.query('DELETE FROM subtaken');
    await testPool.query('DELETE FROM taken');
    await testPool.query('DELETE FROM users');
    // ... (all tables)

    res.json({
      success: true,
      tablesCleared: 12
    });
  } catch (error) {
    res.status(500).json({ error: 'ClearFailed', message: error.message });
  }
});
```

**Success Criteria**:
- [ ] All 7 endpoints implemented
- [ ] All contract tests (T005-T011) now PASS
- [ ] requireAdmin middleware enforced
- [ ] Error handling for all failure cases
- [ ] Logging for all operations

**Dependencies**: T005-T011 (tests must fail first)

---

## Phase 3.5: Frontend Admin UI

### T013 Add Test Environment section to admin2.html
**File**: `public/admin2.html` (lines ~200+, new section)

**Implementation**:
```html
<!-- Add new tab to navigation -->
<div class="admin-tabs">
  <button class="tab" data-section="users">Users</button>
  <button class="tab" data-section="feedback">Feedback</button>
  <button class="tab" data-section="page-help">Page Help</button>
  <button class="tab" data-section="test-env">Test Environment</button>
</div>

<!-- Test Environment Section -->
<section id="test-env" class="admin-section" style="display: none;">
  <h2>Test Environment Management</h2>

  <!-- Database Status -->
  <div class="db-status">
    <h3>Database Status</h3>
    <div id="db-status-prod" class="status-indicator">Production: <span>Checking...</span></div>
    <div id="db-status-test" class="status-indicator">Test: <span>Checking...</span></div>
    <button onclick="verifyDatabases()">Refresh Status</button>
  </div>

  <!-- Database Operations -->
  <div class="db-operations">
    <h3>Database Operations</h3>
    <button onclick="copySchema()" class="btn-primary">Copy Schema from Production</button>
    <button onclick="clearTestDatabase()" class="btn-danger">Clear Test Database</button>
  </div>

  <!-- User Management -->
  <div class="user-management">
    <div class="user-list-container">
      <div class="production-users">
        <h3>Production Users</h3>
        <div id="production-users-list">Loading...</div>
      </div>

      <div class="test-users">
        <h3>Test Users</h3>
        <div id="test-users-list">Loading...</div>
      </div>
    </div>
  </div>
</section>
```

**Success Criteria**:
- [ ] New "Test Environment" tab added
- [ ] Database status indicators displayed
- [ ] Operation buttons styled and accessible
- [ ] User lists have proper containers

**Dependencies**: T012 (needs backend endpoints)

---

### T014 Implement Test Environment JavaScript in admin2.js
**File**: `public/admin2.js` (lines ~1000+, new functions)

**Implementation**:
```javascript
// Test Environment Management Functions

async function verifyDatabases() {
  try {
    const response = await fetch('/api/admin/test-db/verify');
    const data = await response.json();

    document.querySelector('#db-status-prod span').textContent =
      data.production.connected ? '✅ Connected' : '❌ Disconnected';
    document.querySelector('#db-status-test span').textContent =
      data.test.connected ? '✅ Connected' : '❌ Disconnected';
  } catch (error) {
    showNotification('Failed to verify databases', 'error');
  }
}

async function copySchema() {
  if (!confirm('This will clear the test database and copy the schema from production. Continue?')) {
    return;
  }

  showNotification('Copying schema...', 'info');

  try {
    const response = await fetch('/api/admin/test-db/copy-schema', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true })
    });

    const data = await response.json();

    if (response.ok) {
      showNotification(`Schema copied successfully - ${data.tablesCreated} tables created`, 'success');
    } else {
      showNotification(`Schema copy failed: ${data.message}`, 'error');
    }
  } catch (error) {
    showNotification('Schema copy failed', 'error');
  }
}

async function loadProductionUsers() {
  try {
    const response = await fetch('/api/admin/production-users');
    const data = await response.json();

    const listHtml = data.users.map(user => `
      <div class="user-item">
        <span class="user-info">${user.username} (${user.email})</span>
        <button onclick="copyUser(${user.id}, '${user.email}')" class="btn-small">Copy to Test</button>
      </div>
    `).join('');

    document.getElementById('production-users-list').innerHTML = listHtml;
  } catch (error) {
    document.getElementById('production-users-list').innerHTML = 'Failed to load users';
  }
}

async function copyUser(userId, userEmail) {
  if (!confirm(`Copy user ${userEmail} and all related data to test database?`)) {
    return;
  }

  showNotification('Copying user...', 'info');

  try {
    const response = await fetch('/api/admin/test-db/copy-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, confirm: true })
    });

    const data = await response.json();

    if (response.ok) {
      showNotification(`User copied successfully - ${data.tasksCopied} tasks`, 'success');
      loadTestUsers(); // Refresh test users list
    } else if (response.status === 409) {
      showNotification(`User already exists in test database`, 'error');
    } else {
      showNotification(`Copy failed: ${data.message}`, 'error');
    }
  } catch (error) {
    showNotification('User copy failed', 'error');
  }
}

async function loadTestUsers() {
  try {
    const response = await fetch('/api/admin/test-users');
    const data = await response.json();

    const listHtml = data.users.map(user => `
      <div class="user-item">
        <span class="user-info">${user.username} (${user.email})</span>
        <button onclick="deleteTestUser(${user.id}, '${user.email}')" class="btn-small btn-danger">Delete</button>
      </div>
    `).join('');

    document.getElementById('test-users-list').innerHTML = listHtml || 'No users in test database';
  } catch (error) {
    document.getElementById('test-users-list').innerHTML = 'Failed to load users';
  }
}

async function deleteTestUser(userId, userEmail) {
  if (!confirm(`Delete user ${userEmail} and all related data from test database?`)) {
    return;
  }

  try {
    const response = await fetch(`/api/admin/test-db/user/${userId}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (response.ok) {
      showNotification(`User deleted - ${data.deletedTasks} tasks removed`, 'success');
      loadTestUsers(); // Refresh list
    } else {
      showNotification(`Delete failed: ${data.message}`, 'error');
    }
  } catch (error) {
    showNotification('Delete failed', 'error');
  }
}

async function clearTestDatabase() {
  if (!confirm('Delete ALL data from test database? Schema will remain. This cannot be undone.')) {
    return;
  }

  showNotification('Clearing test database...', 'info');

  try {
    const response = await fetch('/api/admin/test-db/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true })
    });

    const data = await response.json();

    if (response.ok) {
      showNotification(`Test database cleared - ${data.tablesCleared} tables`, 'success');
      loadTestUsers(); // Refresh (will show empty)
    } else {
      showNotification(`Clear failed: ${data.message}`, 'error');
    }
  } catch (error) {
    showNotification('Clear failed', 'error');
  }
}

// Initialize Test Environment tab
function initTestEnvironment() {
  verifyDatabases();
  loadProductionUsers();
  loadTestUsers();
}

// Add to existing tab switching logic
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const section = tab.dataset.section;
    if (section === 'test-env') {
      initTestEnvironment();
    }
  });
});
```

**Success Criteria**:
- [ ] All functions implemented
- [ ] API calls use correct endpoints
- [ ] Confirmation dialogs for destructive operations
- [ ] User lists refresh after operations
- [ ] Notifications show operation feedback

**Dependencies**: T012, T013 (needs backend + HTML structure)

---

### T015 Style Test Environment section in admin2.css
**File**: `public/admin2.css` (lines ~500+, new styles)

**Implementation**:
```css
/* Test Environment Section */
#test-env {
  padding: 20px;
}

.db-status {
  margin-bottom: 30px;
  padding: 15px;
  background-color: #f5f5f5;
  border-radius: 5px;
}

.status-indicator {
  margin: 10px 0;
  font-size: 16px;
  font-weight: 500;
}

.status-indicator span {
  font-weight: bold;
}

.db-operations {
  margin-bottom: 30px;
}

.db-operations button {
  margin-right: 10px;
}

.user-management {
  margin-top: 30px;
}

.user-list-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.production-users,
.test-users {
  border: 1px solid #ddd;
  border-radius: 5px;
  padding: 15px;
  background-color: #fff;
}

.user-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  margin: 5px 0;
  border: 1px solid #eee;
  border-radius: 3px;
  background-color: #fafafa;
}

.user-info {
  flex-grow: 1;
}

.btn-small {
  padding: 5px 10px;
  font-size: 12px;
  border-radius: 3px;
  cursor: pointer;
}

.btn-danger {
  background-color: #dc3545;
  color: white;
  border: none;
}

.btn-danger:hover {
  background-color: #c82333;
}

.btn-primary {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
}

.btn-primary:hover {
  background-color: #0056b3;
}
```

**Success Criteria**:
- [ ] Test Environment section styled consistently
- [ ] User lists display in grid layout
- [ ] Buttons have hover states
- [ ] Status indicators visually distinct
- [ ] Responsive design maintained

**Dependencies**: T013, T014 (needs HTML + JS structure)

---

## Phase 3.6: Integration Testing (Constitution Compliant)

### T016 Deploy to staging and verify database connections
**Environment**: dev.tickedify.com

**Actions**:
1. Commit all changes from T003-T015
2. Merge feature branch to staging
3. Push to trigger Vercel deployment
4. Wait 30-60 seconds for deployment
5. Verify `/api/version` endpoint returns new version
6. Execute quickstart.md Phase 1 (Infrastructure validation)

**Success Criteria**:
- [ ] Staging deployed successfully
- [ ] Both databases accessible via verify endpoint
- [ ] Environment variables configured correctly
- [ ] No production database impact

**Dependencies**: T002, T003, T012 (infrastructure + implementation)

---

### T017 Execute quickstart.md Phase 2-3 (Schema + User Copy)
**Environment**: dev.tickedify.com

**Test Scenarios** (from quickstart.md):
1. Copy schema to test database
2. Verify 12 tables created with zero data
3. List production users
4. Copy user to test database
5. Verify user data integrity (FK relationships)
6. Test duplicate prevention (409 error)
7. Login to dev.tickedify.com/app with copied user
8. Verify application works with test data

**Success Criteria**:
- [ ] All quickstart Phase 2 tests pass
- [ ] All quickstart Phase 3 tests pass
- [ ] Production database unaffected
- [ ] Test data accessible via application

**Dependencies**: T016 (staging deployment)

---

### T018 Execute quickstart.md Phase 4 (Test DB Management)
**Environment**: dev.tickedify.com

**Test Scenarios**:
1. List test database users
2. Delete individual user from test
3. Verify cascade delete (tasks, attachments)
4. Clear entire test database
5. Verify schema preserved after clear
6. Verify production database unchanged

**Success Criteria**:
- [ ] All quickstart Phase 4 tests pass
- [ ] Delete operations work correctly
- [ ] Clear operation preserves schema
- [ ] Production isolation verified

**Dependencies**: T017 (user data copied)

---

### T019 Execute quickstart.md Phase 5 (End-to-End Workflow)
**Environment**: dev.tickedify.com

**Full Workflow Test**:
1. Verify connections → Copy schema → Copy user → Test app → Clear DB → Verify production
2. Estimated time: <5 minutes total
3. All operations complete without errors
4. Production database completely isolated

**Success Criteria**:
- [ ] Complete workflow executes successfully
- [ ] All operations within performance goals
- [ ] No production data affected
- [ ] Feature ready for user approval

**Dependencies**: T018 (all operations tested)

---

## Phase 3.7: Documentation & Deployment

### T020 Update CHANGELOG.md with feature documentation
**File**: `public/changelog.html`

**Content** (English, as per constitution):
```html
<div class="version-entry badge-feature">
  <div class="version-header">
    <span class="version-number">v1.x.x</span>
    <span class="version-date">2025-11-11</span>
  </div>
  <div class="version-content">
    <h3>✨ Features</h3>
    <ul>
      <li><strong>Isolated Test Environment</strong>: Separate test database for dev.tickedify.com enables safe feature testing without production risk</li>
      <li><strong>Database Management Tools</strong>: Admin interface for copying schema, users, and managing test data</li>
      <li><strong>Production Isolation</strong>: Complete separation ensures production data remains unaffected by testing activities</li>
    </ul>

    <h3>🎯 Improvements</h3>
    <ul>
      <li><strong>Admin Dashboard</strong>: New "Test Environment" section in admin2.html for test database operations</li>
      <li><strong>Dual Database Support</strong>: Environment-based routing automatically selects correct database (production vs test)</li>
      <li><strong>Data Copy Utilities</strong>: One-click user data copy with relationship preservation for realistic testing</li>
    </ul>
  </div>
</div>
```

**Success Criteria**:
- [ ] Changelog entry added
- [ ] Version incremented in package.json
- [ ] English language used (per constitution)
- [ ] Badge set to "badge-feature"

**Dependencies**: T019 (feature complete and tested)

---

## Dependencies Graph

```
T001 (Create Neon DB)
  └─→ T002 (Configure Vercel env vars)
        └─→ T003 (Add test pool to server.js)
              └─→ T004 (Environment routing)
                    ├─→ T005-T011 (Contract tests - parallel)
                    │     └─→ T012 (API endpoints implementation)
                    │           ├─→ T013 (Admin HTML)
                    │           │     └─→ T014 (Admin JS)
                    │           │           └─→ T015 (Admin CSS)
                    │           └─→ T016 (Deploy to staging)
                    │                 └─→ T017 (Quickstart Phase 2-3)
                    │                       └─→ T018 (Quickstart Phase 4)
                    │                             └─→ T019 (Quickstart Phase 5)
                    │                                   └─→ T020 (Changelog)
```

---

## Parallel Execution Examples

### Contract Tests (T005-T011) - Can run in parallel
```bash
# All 7 contract tests can run simultaneously (different test files)
npm test tests/contract/test-admin-verify.js &
npm test tests/contract/test-admin-copy-schema.js &
npm test tests/contract/test-admin-production-users.js &
npm test tests/contract/test-admin-copy-user.js &
npm test tests/contract/test-admin-test-users.js &
npm test tests/contract/test-admin-delete-user.js &
npm test tests/contract/test-admin-clear.js &
wait
```

**Why parallel**: Different test files, no shared state, independent validation

---

## Implementation Notes

**Manual Tasks** (T001-T002):
- Require admin access to Neon and Vercel dashboards
- Cannot be automated - human execution required
- Document credentials securely (NOT in repo)

**Backend Tasks** (T003-T012):
- All modify `server.js` - must be sequential
- Contract tests (T005-T011) can run parallel (different files)
- TDD critical: Tests MUST fail before implementation

**Frontend Tasks** (T013-T015):
- Sequential (modify same files: admin2.html, admin2.js, admin2.css)
- Reuse existing admin2.html patterns for consistency
- Confirmation dialogs for all destructive operations

**Testing Tasks** (T016-T019):
- Follow constitution: API-first testing (not UI automation)
- Use quickstart.md as test script (manual execution)
- Verify production isolation after every operation

**Constitution Compliance**:
- ✅ Beta Freeze: Staging only (no main branch)
- ✅ Staging-First: All testing on dev.tickedify.com
- ✅ Test-First API: Direct endpoint testing via quickstart scenarios
- ✅ Versioning: T020 updates package.json + changelog
- ✅ English UI: Changelog and UI text in English

---

## Validation Checklist

**Task Completeness**:
- [x] All 7 contracts have corresponding tests (T005-T011)
- [x] All 7 endpoints have implementations (T012)
- [x] All tests come before implementation (T005-T011 → T012)
- [x] Parallel tasks truly independent (T005-T011 different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task

**Feature Completeness**:
- [x] Infrastructure setup (T001-T002)
- [x] Backend connection management (T003-T004)
- [x] Contract tests (T005-T011)
- [x] API implementation (T012)
- [x] Admin UI (T013-T015)
- [x] Integration testing (T016-T019)
- [x] Documentation (T020)

**Constitution Compliance**:
- [x] Staging-only deployment (T016)
- [x] API-first testing (T016-T019)
- [x] Version bump included (T020)
- [x] Changelog in English (T020)

---

**Total Tasks**: 20
**Estimated Time**:
- Manual setup (T001-T002): 30 minutes
- Backend implementation (T003-T012): 4-6 hours
- Frontend implementation (T013-T015): 2-3 hours
- Integration testing (T016-T019): 1-2 hours
- Documentation (T020): 30 minutes
- **Total**: 8-12 hours

**Ready for execution** ✅
