# Tickedify In-App Messaging System - Complete Implementation Specification

## Overview

This document contains the complete technical specification for implementing a one-way admin-to-user messaging system in Tickedify. The system supports broadcast messages, targeted messaging, conditional triggers, rich content, and analytics.

**Implementation Approach:** 4 phases, each deliverable and testable independently.

---

## Phase 1: Core Foundation (~4 hours)

### Deliverable
A basic messaging system where admins can create text-only messages that appear as modal popups to users.

### 1.1 Database Schema

#### Table: `admin_messages`
```sql
CREATE TABLE admin_messages (
  id SERIAL PRIMARY KEY,

  -- Content
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'information',  -- Phase 3 feature, prepare now

  -- Targeting (Phase 2, but prepare structure now)
  target_type VARCHAR(50) DEFAULT 'all',  -- 'all', 'filtered', 'specific_users'
  target_subscription VARCHAR(50)[],  -- NULL = all subscriptions
  target_search TEXT,  -- Search term for name/email filtering
  target_users INTEGER[],  -- Array of specific user IDs

  -- Triggering (Phase 2, but prepare structure now)
  trigger_type VARCHAR(50) DEFAULT 'immediate',  -- 'immediate', 'days_after_signup', 'first_page_visit', 'nth_page_visit'
  trigger_value TEXT,  -- Depends on trigger_type

  -- Behavior (Phase 3, but prepare structure now)
  dismissible BOOLEAN DEFAULT TRUE,
  snoozable BOOLEAN DEFAULT TRUE,
  snooze_durations INTEGER[] DEFAULT ARRAY[3600, 14400, 86400],  -- [1h, 4h, 1d] in seconds

  -- Scheduling (Phase 2, but prepare structure now)
  publish_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,  -- NULL = never expires

  -- Buttons (Phase 3, but prepare structure now)
  button_label VARCHAR(100),
  button_action VARCHAR(50),  -- 'navigate', 'external'
  button_target TEXT,

  -- Status
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_admin_messages_active ON admin_messages(active);
CREATE INDEX idx_admin_messages_publish_expires ON admin_messages(publish_at, expires_at);
```

#### Table: `message_interactions`
```sql
CREATE TABLE message_interactions (
  message_id INTEGER REFERENCES admin_messages(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,

  -- Status
  snoozed_until TIMESTAMP,  -- NULL = not snoozed
  dismissed BOOLEAN DEFAULT FALSE,

  -- Tracking
  first_shown_at TIMESTAMP DEFAULT NOW(),
  last_shown_at TIMESTAMP DEFAULT NOW(),
  shown_count INTEGER DEFAULT 1,

  -- Button interaction (Phase 3+4)
  button_clicked BOOLEAN DEFAULT FALSE,
  button_clicked_at TIMESTAMP,

  PRIMARY KEY (message_id, user_id)
);

CREATE INDEX idx_message_interactions_user ON message_interactions(user_id);
CREATE INDEX idx_message_interactions_snoozed ON message_interactions(snoozed_until) WHERE snoozed_until IS NOT NULL;
```

#### Table: `user_page_visits`
```sql
CREATE TABLE user_page_visits (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  page_identifier VARCHAR(100) NOT NULL,

  visit_count INTEGER DEFAULT 1,
  first_visit_at TIMESTAMP DEFAULT NOW(),
  last_visit_at TIMESTAMP DEFAULT NOW(),

  PRIMARY KEY (user_id, page_identifier)
);

CREATE INDEX idx_user_page_visits_count ON user_page_visits(page_identifier, visit_count);
```

### 1.2 Backend API Endpoints

#### POST `/api/admin/messages`
**Purpose:** Create a new message (admin only)

**Request:**
```json
{
  "title": "Welcome to Tickedify",
  "message": "This is your task management app...",
  "target_type": "all"
}
```

**Response:**
```json
{
  "success": true,
  "messageId": 123,
  "message": "Message created successfully"
}
```

**Implementation:**
- Verify user is admin (user_id = 1 for now, proper admin check in Phase 2)
- Insert into `admin_messages` table
- Return message ID

#### GET `/api/messages/unread`
**Purpose:** Fetch unread messages for current user

**Query params:** None (user from session)

**Response:**
```json
{
  "messages": [
    {
      "id": 123,
      "title": "Welcome to Tickedify",
      "message": "This is your task management app...",
      "message_type": "information",
      "dismissible": true,
      "snoozable": true
    }
  ]
}
```

**Logic:**
```javascript
// Pseudo-code for message filtering
const now = new Date();

// Get all active messages
WHERE active = true
  AND publish_at <= now
  AND (expires_at IS NULL OR expires_at > now)
  AND target_type = 'all'  // Phase 1: only support 'all'

// Exclude already interacted messages
AND id NOT IN (
  SELECT message_id FROM message_interactions
  WHERE user_id = current_user
    AND (dismissed = true OR snoozed_until > now)
)

// Order: message_type priority (Phase 3), then created_at
ORDER BY created_at DESC
```

#### POST `/api/messages/:id/dismiss`
**Purpose:** Mark message as dismissed

**Request:** No body needed

**Response:**
```json
{
  "success": true
}
```

**Implementation:**
```sql
INSERT INTO message_interactions (message_id, user_id, dismissed)
VALUES ($1, $2, true)
ON CONFLICT (message_id, user_id)
DO UPDATE SET dismissed = true, last_shown_at = NOW();
```

#### POST `/api/page-visit/:pageIdentifier`
**Purpose:** Track page visit (for trigger logic in Phase 2)

**Request:** No body needed

**Response:**
```json
{
  "success": true,
  "visitCount": 5
}
```

**Implementation:**
```sql
INSERT INTO user_page_visits (user_id, page_identifier, visit_count)
VALUES ($1, $2, 1)
ON CONFLICT (user_id, page_identifier)
DO UPDATE SET
  visit_count = user_page_visits.visit_count + 1,
  last_visit_at = NOW()
RETURNING visit_count;
```

### 1.3 Frontend: Message Modal Component

**File:** `public/js/message-modal.js`

**Functionality:**
- Check for unread messages on app load
- Display modal with message content
- Handle dismiss action
- Simple, clean UI

**Modal HTML Structure:**
```html
<div id="message-modal-overlay" class="modal-overlay" style="display: none;">
  <div class="message-modal">
    <div class="message-header">
      <span class="message-icon">ℹ️</span>
      <h3 class="message-title"><!-- Title here --></h3>
    </div>
    <div class="message-body">
      <p class="message-content"><!-- Message here --></p>
    </div>
    <div class="message-actions">
      <button class="btn-message-dismiss">Got it</button>
    </div>
  </div>
</div>
```

**JavaScript Logic:**
```javascript
// Auto-check on page load
document.addEventListener('DOMContentLoaded', async () => {
  await checkForMessages();
});

async function checkForMessages() {
  const response = await fetch('/api/messages/unread');
  const data = await response.json();

  if (data.messages && data.messages.length > 0) {
    showMessage(data.messages[0]); // Phase 1: show first message only
  }
}

function showMessage(message) {
  const modal = document.getElementById('message-modal-overlay');
  document.querySelector('.message-title').textContent = message.title;
  document.querySelector('.message-content').textContent = message.message;
  modal.style.display = 'flex';

  // Handle dismiss
  document.querySelector('.btn-message-dismiss').onclick = async () => {
    await fetch(`/api/messages/${message.id}/dismiss`, { method: 'POST' });
    modal.style.display = 'none';
  };
}
```

**CSS Styling:**
```css
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.message-modal {
  background: white;
  border-radius: 8px;
  padding: 24px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.message-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.message-icon {
  font-size: 24px;
}

.message-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.message-body {
  margin-bottom: 20px;
  line-height: 1.6;
}

.message-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-message-dismiss {
  padding: 8px 16px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.btn-message-dismiss:hover {
  background: #1d4ed8;
}
```

### 1.4 Admin Interface: Basic Message Creator

**File:** `public/admin.html` (add new section)

**HTML:**
```html
<section id="admin-messages">
  <h2>📢 Messages</h2>

  <div class="message-creator">
    <h3>Create New Message</h3>
    <form id="create-message-form">
      <div class="form-group">
        <label>Title:</label>
        <input type="text" id="msg-title" required maxlength="255">
      </div>

      <div class="form-group">
        <label>Message:</label>
        <textarea id="msg-content" rows="5" required></textarea>
      </div>

      <button type="submit" class="btn-primary">Create Message</button>
    </form>
  </div>

  <div class="message-list">
    <h3>Active Messages</h3>
    <div id="messages-list">
      <!-- Messages will be loaded here -->
    </div>
  </div>
</section>
```

**JavaScript:**
```javascript
// In admin.js
document.getElementById('create-message-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const title = document.getElementById('msg-title').value;
  const message = document.getElementById('msg-content').value;

  const response = await fetch('/api/admin/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, message, target_type: 'all' })
  });

  if (response.ok) {
    alert('Message created!');
    e.target.reset();
    loadMessagesList();
  }
});

async function loadMessagesList() {
  const response = await fetch('/api/admin/messages');
  const data = await response.json();

  const list = document.getElementById('messages-list');
  list.innerHTML = data.messages.map(msg => `
    <div class="message-item">
      <strong>${msg.title}</strong>
      <p>${msg.message.substring(0, 100)}...</p>
      <small>Created: ${new Date(msg.created_at).toLocaleString()}</small>
    </div>
  `).join('');
}

// Load on page load
loadMessagesList();
```

### 1.5 Integration Points

**Add to existing files:**

1. **app.html** - Include message modal script:
```html
<script src="js/message-modal.js"></script>
```

2. **server.js** - Add routes:
```javascript
// Admin routes (require admin check)
app.post('/api/admin/messages', async (req, res) => { /* implementation */ });
app.get('/api/admin/messages', async (req, res) => { /* implementation */ });

// User routes
app.get('/api/messages/unread', async (req, res) => { /* implementation */ });
app.post('/api/messages/:id/dismiss', async (req, res) => { /* implementation */ });
app.post('/api/page-visit/:pageIdentifier', async (req, res) => { /* implementation */ });
```

### 1.6 Testing Checklist for Phase 1

- [ ] Database tables created successfully
- [ ] Can create a message via admin interface
- [ ] Message appears as modal popup when user loads app
- [ ] "Got it" button dismisses message
- [ ] Dismissed message doesn't appear again
- [ ] Multiple users can see the same message
- [ ] Page visit tracking works (check database)

### 1.7 Phase 1 Completion Criteria

✅ Admin can create basic text messages
✅ Messages display as modal popups to all users
✅ Users can dismiss messages
✅ Dismissed messages don't re-appear
✅ Basic admin interface for message creation
✅ Database schema supports future phases

---

## Phase 2: Targeting & Triggers (~4 hours)

### Deliverable
Advanced message targeting (by subscription, user search) and conditional triggers (scheduled, days after signup, nth page visit).

### 2.1 User Management Context

**Assumption:** Users table has these fields:
- `id` (INTEGER)
- `email` (VARCHAR)
- `name` (VARCHAR) - or `first_name`/`last_name`
- `subscription_type` (VARCHAR) - 'free', 'premium', 'trial', etc.
- `created_at` (TIMESTAMP)

If these don't exist, they need to be added.

### 2.2 Backend API Extensions

#### GET `/api/admin/users/search?q=john`
**Purpose:** Search users by name/email for targeting

**Response:**
```json
{
  "users": [
    {
      "id": 42,
      "name": "John Doe",
      "email": "john@example.com",
      "subscription_type": "premium"
    }
  ]
}
```

**Implementation:**
```sql
SELECT id, name, email, subscription_type
FROM users
WHERE
  name ILIKE '%' || $1 || '%' OR
  email ILIKE '%' || $1 || '%'
ORDER BY name
LIMIT 50;
```

#### GET `/api/admin/messages/preview-targets`
**Purpose:** Preview how many users a message will target

**Query params:**
- `target_type`: 'all', 'filtered', 'specific_users'
- `target_subscription`: JSON array ['free', 'premium']
- `target_users`: JSON array [1, 2, 3]

**Response:**
```json
{
  "count": 245,
  "sample": [
    { "id": 1, "name": "Jan Buskens", "email": "jan@buskens.be" },
    { "id": 5, "name": "Test User", "email": "test@example.com" }
  ]
}
```

**Implementation:**
```javascript
// Build dynamic query based on parameters
let query = 'SELECT id, name, email FROM users WHERE 1=1';
const params = [];

if (target_type === 'filtered' && target_subscription) {
  query += ` AND subscription_type = ANY($${params.length + 1})`;
  params.push(target_subscription);
}

if (target_type === 'specific_users' && target_users) {
  query += ` AND id = ANY($${params.length + 1})`;
  params.push(target_users);
}

// Get count
const countResult = await pool.query(query.replace('id, name, email', 'COUNT(*)'), params);

// Get sample (first 5)
const sampleResult = await pool.query(query + ' LIMIT 5', params);
```

#### Update: POST `/api/admin/messages`
**Enhanced request body:**
```json
{
  "title": "Premium Feature Update",
  "message": "New features available...",

  // Targeting
  "target_type": "filtered",
  "target_subscription": ["premium"],
  "target_search": null,
  "target_users": null,

  // Triggering
  "trigger_type": "days_after_signup",
  "trigger_value": "3",

  // Scheduling
  "publish_at": "2025-02-01T09:00:00Z",
  "expires_at": "2025-03-01T23:59:59Z"
}
```

#### Update: GET `/api/messages/unread`
**Enhanced logic to support triggers:**

```javascript
const userId = req.session.userId;
const now = new Date();

// Get user info for targeting
const user = await pool.query(
  'SELECT subscription_type, created_at FROM users WHERE id = $1',
  [userId]
);

// Calculate days since signup
const daysSinceSignup = Math.floor(
  (now - new Date(user.created_at)) / (1000 * 60 * 60 * 24)
);

// Build query
let query = `
  SELECT m.* FROM admin_messages m
  WHERE m.active = true
    AND m.publish_at <= $1
    AND (m.expires_at IS NULL OR m.expires_at > $1)
`;

const params = [now];

// Targeting filter
query += ` AND (
  m.target_type = 'all'
  OR (m.target_type = 'filtered' AND (
    m.target_subscription IS NULL OR $2 = ANY(m.target_subscription)
  ))
  OR (m.target_type = 'specific_users' AND $3 = ANY(m.target_users))
)`;
params.push(user.subscription_type, userId);

// Trigger filter
query += ` AND (
  m.trigger_type = 'immediate'
  OR (m.trigger_type = 'days_after_signup' AND $4 >= m.trigger_value::integer)
)`;
params.push(daysSinceSignup);

// Exclude already interacted
query += ` AND m.id NOT IN (
  SELECT message_id FROM message_interactions
  WHERE user_id = $3 AND (dismissed = true OR snoozed_until > $1)
)`;

const messages = await pool.query(query, params);
```

**Handle page visit triggers:**
```javascript
// Separate query for page visit triggered messages
if (req.query.page) {  // Pass current page identifier
  const pageVisit = await pool.query(
    'SELECT visit_count FROM user_page_visits WHERE user_id = $1 AND page_identifier = $2',
    [userId, req.query.page]
  );

  if (pageVisit.rows.length > 0) {
    const visitCount = pageVisit.rows[0].visit_count;

    // Find messages triggered by this visit count
    const pageMessages = await pool.query(`
      SELECT * FROM admin_messages
      WHERE trigger_type IN ('first_page_visit', 'nth_page_visit')
        AND trigger_value LIKE $1
        AND active = true
        AND (
          (trigger_type = 'first_page_visit' AND $2 = 1)
          OR (trigger_type = 'nth_page_visit' AND
              SPLIT_PART(trigger_value, ':', 1)::integer = $2)
        )
    `, [`%:${req.query.page}`, visitCount]);

    // Merge with other messages
    messages.rows.push(...pageMessages.rows);
  }
}
```

### 2.3 Frontend: Enhanced Admin Interface

**Updated admin.html message creator:**

```html
<form id="create-message-form">
  <div class="form-group">
    <label>Title:</label>
    <input type="text" id="msg-title" required maxlength="255">
  </div>

  <div class="form-group">
    <label>Message:</label>
    <textarea id="msg-content" rows="5" required></textarea>
  </div>

  <!-- TARGETING SECTION -->
  <div class="form-section">
    <h4>Targeting</h4>

    <div class="form-group">
      <label>
        <input type="radio" name="target-type" value="all" checked>
        Everyone
      </label>
    </div>

    <div class="form-group">
      <label>
        <input type="radio" name="target-type" value="filtered">
        Filtered by subscription
      </label>
      <div id="subscription-filters" style="display: none; margin-left: 20px;">
        <label><input type="checkbox" value="free"> Free</label>
        <label><input type="checkbox" value="premium"> Premium</label>
        <label><input type="checkbox" value="trial"> Trial</label>
      </div>
    </div>

    <div class="form-group">
      <label>
        <input type="radio" name="target-type" value="specific_users">
        Specific users
      </label>
      <div id="user-search" style="display: none; margin-left: 20px;">
        <input type="text" id="user-search-input" placeholder="Search users...">
        <div id="user-search-results"></div>
        <div id="selected-users"></div>
      </div>
    </div>

    <div class="target-preview">
      <strong>Target: </strong>
      <span id="target-count">All users</span>
    </div>
  </div>

  <!-- TRIGGER SECTION -->
  <div class="form-section">
    <h4>Trigger</h4>

    <div class="form-group">
      <label>
        <input type="radio" name="trigger-type" value="immediate" checked>
        Immediately after publish
      </label>
    </div>

    <div class="form-group">
      <label>
        <input type="radio" name="trigger-type" value="days_after_signup">
        X days after signup:
      </label>
      <input type="number" id="days-after-signup" min="0" style="width: 60px;" disabled>
      days
    </div>

    <div class="form-group">
      <label>
        <input type="radio" name="trigger-type" value="first_page_visit">
        First visit to page:
      </label>
      <select id="first-visit-page" disabled>
        <option value="dagelijkse-planning">Dagelijkse Planning</option>
        <option value="edit-task-modal">Edit Task Modal</option>
        <option value="actielijst">Actielijst</option>
        <option value="inbox">Inbox</option>
      </select>
    </div>

    <div class="form-group">
      <label>
        <input type="radio" name="trigger-type" value="nth_page_visit">
        Nth visit to page:
      </label>
      Visit #<input type="number" id="nth-visit-count" min="1" style="width: 60px;" disabled>
      to
      <select id="nth-visit-page" disabled>
        <option value="dagelijkse-planning">Dagelijkse Planning</option>
        <option value="edit-task-modal">Edit Task Modal</option>
        <option value="actielijst">Actielijst</option>
        <option value="inbox">Inbox</option>
      </select>
    </div>
  </div>

  <!-- SCHEDULING SECTION -->
  <div class="form-section">
    <h4>Scheduling</h4>

    <div class="form-group">
      <label>Publish at:</label>
      <input type="datetime-local" id="publish-at">
      <small>Leave empty for immediate publish</small>
    </div>

    <div class="form-group">
      <label>Expires at:</label>
      <input type="datetime-local" id="expires-at">
      <small>Leave empty for no expiration</small>
    </div>
  </div>

  <button type="submit" class="btn-primary">Create Message</button>
</form>
```

**JavaScript for dynamic form:**

```javascript
// Show/hide sections based on radio selection
document.querySelectorAll('input[name="target-type"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    document.getElementById('subscription-filters').style.display =
      e.target.value === 'filtered' ? 'block' : 'none';
    document.getElementById('user-search').style.display =
      e.target.value === 'specific_users' ? 'block' : 'none';
    updateTargetPreview();
  });
});

document.querySelectorAll('input[name="trigger-type"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    document.getElementById('days-after-signup').disabled = e.target.value !== 'days_after_signup';
    document.getElementById('first-visit-page').disabled = e.target.value !== 'first_page_visit';
    document.getElementById('nth-visit-count').disabled = e.target.value !== 'nth_page_visit';
    document.getElementById('nth-visit-page').disabled = e.target.value !== 'nth_page_visit';
  });
});

// Live target preview
let previewDebounce;
async function updateTargetPreview() {
  clearTimeout(previewDebounce);
  previewDebounce = setTimeout(async () => {
    const targetType = document.querySelector('input[name="target-type"]:checked').value;

    let params = { target_type: targetType };

    if (targetType === 'filtered') {
      const subscriptions = Array.from(
        document.querySelectorAll('#subscription-filters input:checked')
      ).map(cb => cb.value);
      params.target_subscription = JSON.stringify(subscriptions);
    }

    if (targetType === 'specific_users') {
      params.target_users = JSON.stringify(selectedUserIds);
    }

    const query = new URLSearchParams(params);
    const response = await fetch(`/api/admin/messages/preview-targets?${query}`);
    const data = await response.json();

    document.getElementById('target-count').textContent =
      `${data.count} user${data.count !== 1 ? 's' : ''}`;
  }, 500);
}

// User search
let selectedUserIds = [];
document.getElementById('user-search-input').addEventListener('input', async (e) => {
  const query = e.target.value;
  if (query.length < 2) return;

  const response = await fetch(`/api/admin/users/search?q=${encodeURIComponent(query)}`);
  const data = await response.json();

  const resultsDiv = document.getElementById('user-search-results');
  resultsDiv.innerHTML = data.users.map(user => `
    <div class="user-result" data-user-id="${user.id}">
      <strong>${user.name}</strong> (${user.email})
      <button onclick="selectUser(${user.id}, '${user.name}')">Add</button>
    </div>
  `).join('');
});

function selectUser(userId, userName) {
  if (!selectedUserIds.includes(userId)) {
    selectedUserIds.push(userId);
    const selectedDiv = document.getElementById('selected-users');
    selectedDiv.innerHTML += `
      <span class="selected-user" data-user-id="${userId}">
        ${userName} <button onclick="removeUser(${userId})">×</button>
      </span>
    `;
    updateTargetPreview();
  }
}

function removeUser(userId) {
  selectedUserIds = selectedUserIds.filter(id => id !== userId);
  document.querySelector(`[data-user-id="${userId}"]`).remove();
  updateTargetPreview();
}

// Form submission
document.getElementById('create-message-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const targetType = document.querySelector('input[name="target-type"]:checked').value;
  const triggerType = document.querySelector('input[name="trigger-type"]:checked').value;

  const data = {
    title: document.getElementById('msg-title').value,
    message: document.getElementById('msg-content').value,

    target_type: targetType,
    target_subscription: targetType === 'filtered' ?
      Array.from(document.querySelectorAll('#subscription-filters input:checked')).map(cb => cb.value) :
      null,
    target_users: targetType === 'specific_users' ? selectedUserIds : null,

    trigger_type: triggerType,
    trigger_value: getTriggerValue(triggerType),

    publish_at: document.getElementById('publish-at').value || null,
    expires_at: document.getElementById('expires-at').value || null
  };

  const response = await fetch('/api/admin/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (response.ok) {
    alert('Message created!');
    e.target.reset();
  }
});

function getTriggerValue(triggerType) {
  switch(triggerType) {
    case 'days_after_signup':
      return document.getElementById('days-after-signup').value;
    case 'first_page_visit':
      return document.getElementById('first-visit-page').value;
    case 'nth_page_visit':
      const count = document.getElementById('nth-visit-count').value;
      const page = document.getElementById('nth-visit-page').value;
      return `${count}:${page}`;
    default:
      return null;
  }
}
```

### 2.4 Frontend: Page Visit Tracking

**Update message-modal.js:**

```javascript
// Track page visits automatically
const currentPage = getCurrentPage();  // Determine from URL or data attribute

// Track visit on load
await fetch(`/api/page-visit/${currentPage}`, { method: 'POST' });

// Check for messages with page context
await checkForMessages(currentPage);

function getCurrentPage() {
  // Determine page identifier from URL or DOM
  const path = window.location.pathname;

  if (path.includes('dagelijkse-planning') || path.includes('app.html')) {
    return 'dagelijkse-planning';
  }
  if (path.includes('actielijst')) {
    return 'actielijst';
  }
  // Add more page identifiers
  return 'unknown';
}

// Also track when modals open
function trackModalOpen(modalName) {
  fetch(`/api/page-visit/${modalName}`, { method: 'POST' });
  checkForMessages(modalName);
}

// Example: Track edit task modal
// In your existing openEditTaskPopup function:
async function openEditTaskPopup(taskId) {
  await trackModalOpen('edit-task-modal');
  // ... rest of existing code
}
```

### 2.5 Testing Checklist for Phase 2

- [ ] Can target "everyone"
- [ ] Can target users by subscription type (free/premium)
- [ ] Can search and select specific users
- [ ] Target preview shows accurate count
- [ ] "Days after signup" trigger works correctly
- [ ] "First page visit" trigger works correctly
- [ ] "Nth page visit" trigger works correctly (test with n=5)
- [ ] Scheduled messages appear at correct time
- [ ] Expired messages don't appear
- [ ] Page visit tracking increments correctly

### 2.6 Phase 2 Completion Criteria

✅ Advanced targeting (subscription, specific users) works
✅ User search functionality in admin
✅ Target preview shows accurate counts
✅ Conditional triggers (signup, page visits) work
✅ Scheduled messages publish correctly
✅ Message expiration works
✅ Page visit tracking integrated

---

## Phase 3: Rich Content & UX (~4 hours)

### Deliverable
Message types with icons, markdown support, buttons, multi-message carousel, snooze functionality, and priority handling.

### 3.1 Message Types & Icons

**Supported types:**
- `information` (ℹ️) - Blue
- `educational` (📚) - Blue
- `warning` (⚠️) - Orange
- `important` (❗) - Red
- `feature` (🆕) - Purple
- `tip` (💡) - Yellow

**Priority order for carousel:**
1. `important` (always first)
2. `warning`
3. `feature`
4. `educational`
5. `tip`
6. `information`

### 3.2 Backend API Extensions

#### Update: POST `/api/admin/messages`
**Additional fields:**
```json
{
  "message_type": "educational",
  "dismissible": true,
  "snoozable": true,
  "button_label": "Try it now",
  "button_action": "navigate",
  "button_target": "/dagelijkse-planning"
}
```

#### POST `/api/messages/:id/snooze`
**Purpose:** Snooze a message

**Request:**
```json
{
  "duration": 3600  // seconds (1 hour)
}
```

**Response:**
```json
{
  "success": true,
  "snoozedUntil": "2025-01-15T15:00:00Z"
}
```

**Implementation:**
```sql
INSERT INTO message_interactions (message_id, user_id, snoozed_until)
VALUES ($1, $2, NOW() + INTERVAL '1 second' * $3)
ON CONFLICT (message_id, user_id)
DO UPDATE SET snoozed_until = NOW() + INTERVAL '1 second' * $3;
```

#### Update: GET `/api/messages/unread`
**Add priority sorting:**
```sql
ORDER BY
  CASE message_type
    WHEN 'important' THEN 1
    WHEN 'warning' THEN 2
    WHEN 'feature' THEN 3
    WHEN 'educational' THEN 4
    WHEN 'tip' THEN 5
    WHEN 'information' THEN 6
    ELSE 7
  END,
  created_at DESC
```

### 3.3 Frontend: Enhanced Modal with Carousel

**Updated message-modal.js:**

```javascript
let currentMessages = [];
let currentMessageIndex = 0;

async function checkForMessages(page = getCurrentPage()) {
  const response = await fetch(`/api/messages/unread?page=${page}`);
  const data = await response.json();

  if (data.messages && data.messages.length > 0) {
    currentMessages = data.messages;
    currentMessageIndex = 0;
    showMessage(currentMessages[0]);
  }
}

function showMessage(message) {
  const modal = document.getElementById('message-modal-overlay');

  // Update content
  const icon = getMessageIcon(message.message_type);
  document.querySelector('.message-icon').textContent = icon;
  document.querySelector('.message-title').textContent = message.title;

  // Parse markdown links in message
  const messageHtml = parseMarkdownLinks(message.message);
  document.querySelector('.message-content').innerHTML = messageHtml;

  // Apply type-specific styling
  const modalElement = document.querySelector('.message-modal');
  modalElement.className = `message-modal message-${message.message_type}`;

  // Update carousel indicator
  if (currentMessages.length > 1) {
    document.querySelector('.carousel-indicator').textContent =
      `${currentMessageIndex + 1} / ${currentMessages.length}`;
    document.querySelector('.carousel-indicator').style.display = 'block';

    // Show/hide navigation buttons
    document.querySelector('.btn-prev').style.display =
      currentMessageIndex > 0 ? 'inline-block' : 'none';
    document.querySelector('.btn-next').style.display =
      currentMessageIndex < currentMessages.length - 1 ? 'inline-block' : 'none';
  } else {
    document.querySelector('.carousel-indicator').style.display = 'none';
    document.querySelector('.btn-prev').style.display = 'none';
    document.querySelector('.btn-next').style.display = 'none';
  }

  // Handle button
  const buttonContainer = document.querySelector('.message-button');
  if (message.button_label) {
    buttonContainer.innerHTML = `
      <button class="btn-message-action" data-action="${message.button_action}"
              data-target="${message.button_target}">
        ${message.button_label}
      </button>
    `;
    buttonContainer.style.display = 'block';

    // Attach handler
    document.querySelector('.btn-message-action').addEventListener('click', () => {
      handleButtonAction(message);
    });
  } else {
    buttonContainer.style.display = 'none';
  }

  // Handle snooze options
  const snoozeContainer = document.querySelector('.snooze-options');
  if (message.snoozable) {
    snoozeContainer.style.display = 'flex';
  } else {
    snoozeContainer.style.display = 'none';
  }

  // Update dismiss button visibility
  const dismissBtn = document.querySelector('.btn-message-dismiss');
  if (message.dismissible) {
    dismissBtn.style.display = 'inline-block';
    dismissBtn.textContent = 'Got it';
  } else {
    dismissBtn.style.display = 'none';
  }

  // If not dismissible and no button, show "OK" button that just closes
  if (!message.dismissible && !message.button_label) {
    dismissBtn.style.display = 'inline-block';
    dismissBtn.textContent = 'OK';
  }

  modal.style.display = 'flex';
}

function getMessageIcon(type) {
  const icons = {
    information: 'ℹ️',
    educational: '📚',
    warning: '⚠️',
    important: '❗',
    feature: '🆕',
    tip: '💡'
  };
  return icons[type] || 'ℹ️';
}

function parseMarkdownLinks(text) {
  // Simple markdown link parser: [text](url)
  return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank">$1</a>');
}

async function handleButtonAction(message) {
  // Track button click
  await fetch(`/api/messages/${message.id}/button-click`, { method: 'POST' });

  if (message.button_action === 'navigate') {
    // Internal navigation
    window.location.href = message.button_target;
  } else if (message.button_action === 'external') {
    // External link
    window.open(message.button_target, '_blank');
  }

  // Dismiss after button click (unless it's a critical message)
  if (message.dismissible) {
    await dismissMessage(message.id);
  }
}

// Carousel navigation
document.querySelector('.btn-prev').addEventListener('click', () => {
  if (currentMessageIndex > 0) {
    currentMessageIndex--;
    showMessage(currentMessages[currentMessageIndex]);
  }
});

document.querySelector('.btn-next').addEventListener('click', () => {
  if (currentMessageIndex < currentMessages.length - 1) {
    currentMessageIndex++;
    showMessage(currentMessages[currentMessageIndex]);
  }
});

// Snooze handling
document.querySelectorAll('.btn-snooze').forEach(btn => {
  btn.addEventListener('click', async () => {
    const duration = parseInt(btn.dataset.duration);
    await snoozeMessage(currentMessages[currentMessageIndex].id, duration);
  });
});

async function snoozeMessage(messageId, duration) {
  await fetch(`/api/messages/${messageId}/snooze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ duration })
  });

  // Remove from current messages
  currentMessages = currentMessages.filter(m => m.id !== messageId);

  // Show next message or close modal
  if (currentMessages.length > 0) {
    currentMessageIndex = Math.min(currentMessageIndex, currentMessages.length - 1);
    showMessage(currentMessages[currentMessageIndex]);
  } else {
    document.getElementById('message-modal-overlay').style.display = 'none';
  }
}

async function dismissMessage(messageId) {
  await fetch(`/api/messages/${messageId}/dismiss`, { method: 'POST' });

  // Remove from current messages
  currentMessages = currentMessages.filter(m => m.id !== messageId);

  // Show next message or close modal
  if (currentMessages.length > 0) {
    currentMessageIndex = Math.min(currentMessageIndex, currentMessages.length - 1);
    showMessage(currentMessages[currentMessageIndex]);
  } else {
    document.getElementById('message-modal-overlay').style.display = 'none';
  }
}

// Update dismiss button handler
document.querySelector('.btn-message-dismiss').addEventListener('click', () => {
  dismissMessage(currentMessages[currentMessageIndex].id);
});
```

**Updated modal HTML:**

```html
<div id="message-modal-overlay" class="modal-overlay" style="display: none;">
  <div class="message-modal">
    <div class="message-header">
      <span class="message-icon">ℹ️</span>
      <h3 class="message-title"></h3>
      <span class="carousel-indicator" style="display: none;">1 / 3</span>
    </div>

    <div class="message-body">
      <div class="message-content"></div>
    </div>

    <!-- Optional action button -->
    <div class="message-button" style="display: none;"></div>

    <div class="message-actions">
      <!-- Carousel navigation -->
      <button class="btn-prev" style="display: none;">◀ Previous</button>
      <button class="btn-next" style="display: none;">Next ▶</button>

      <!-- Snooze options -->
      <div class="snooze-options" style="display: none;">
        <button class="btn-snooze" data-duration="3600">💤 1 hour</button>
        <button class="btn-snooze" data-duration="14400">💤 4 hours</button>
        <button class="btn-snooze" data-duration="86400">💤 1 day</button>
      </div>

      <!-- Dismiss -->
      <button class="btn-message-dismiss">Got it</button>
    </div>
  </div>
</div>
```

**Enhanced CSS:**

```css
.message-modal {
  background: white;
  border-radius: 12px;
  padding: 24px;
  max-width: 550px;
  width: 90%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  border-left: 5px solid #3B82F6;
}

/* Type-specific styling */
.message-information {
  border-left-color: #10B981;
  background: linear-gradient(to right, #D1FAE5 0%, white 50px);
}

.message-educational {
  border-left-color: #3B82F6;
  background: linear-gradient(to right, #EFF6FF 0%, white 50px);
}

.message-warning {
  border-left-color: #F59E0B;
  background: linear-gradient(to right, #FEF3C7 0%, white 50px);
}

.message-important {
  border-left-color: #EF4444;
  background: linear-gradient(to right, #FEE2E2 0%, white 50px);
}

.message-feature {
  border-left-color: #8B5CF6;
  background: linear-gradient(to right, #EDE9FE 0%, white 50px);
}

.message-tip {
  border-left-color: #F59E0B;
  background: linear-gradient(to right, #FEF9C3 0%, white 50px);
}

.message-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.message-icon {
  font-size: 28px;
}

.message-title {
  flex: 1;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.carousel-indicator {
  font-size: 12px;
  color: #6B7280;
  background: #F3F4F6;
  padding: 4px 8px;
  border-radius: 12px;
}

.message-body {
  margin-bottom: 20px;
  line-height: 1.6;
}

.message-content a {
  color: #2563eb;
  text-decoration: underline;
}

.message-button {
  margin-bottom: 16px;
}

.btn-message-action {
  width: 100%;
  padding: 12px 16px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 15px;
}

.btn-message-action:hover {
  background: #1d4ed8;
}

.message-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-prev, .btn-next {
  padding: 6px 12px;
  background: #F3F4F6;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.btn-prev:hover, .btn-next:hover {
  background: #E5E7EB;
}

.snooze-options {
  display: flex;
  gap: 6px;
}

.btn-snooze {
  padding: 6px 10px;
  background: #FEF3C7;
  border: 1px solid #F59E0B;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  white-space: nowrap;
}

.btn-snooze:hover {
  background: #FDE68A;
}

.btn-message-dismiss {
  padding: 8px 20px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.btn-message-dismiss:hover {
  background: #1d4ed8;
}

/* Responsive */
@media (max-width: 600px) {
  .message-modal {
    width: 95%;
    padding: 20px;
  }

  .message-actions {
    flex-direction: column;
  }

  .snooze-options {
    width: 100%;
    justify-content: space-between;
  }
}
```

### 3.4 Admin Interface: Message Type Selector

**Add to message creator form:**

```html
<div class="form-group">
  <label>Message Type:</label>
  <select id="message-type" required>
    <option value="information">ℹ️ Information (General updates, news)</option>
    <option value="educational">📚 Educational (Tutorials, how-to guides)</option>
    <option value="tip">💡 Tip (Productivity tips, best practices)</option>
    <option value="feature">🆕 Feature (New functionality announcements)</option>
    <option value="warning">⚠️ Warning (Cautions, deprecations)</option>
    <option value="important">❗ Important (Critical info, breaking changes)</option>
  </select>
</div>

<div class="form-group">
  <label>
    <input type="checkbox" id="dismissible" checked>
    Dismissible (users can close it)
  </label>
</div>

<div class="form-group">
  <label>
    <input type="checkbox" id="snoozable" checked>
    Snoozable (users can snooze it)
  </label>
</div>

<!-- Button Section -->
<div class="form-section">
  <h4>Action Button (Optional)</h4>

  <div class="form-group">
    <label>
      <input type="checkbox" id="has-button">
      Add action button
    </label>
  </div>

  <div id="button-config" style="display: none;">
    <div class="form-group">
      <label>Button Label:</label>
      <input type="text" id="button-label" maxlength="100" placeholder="Try it now">
    </div>

    <div class="form-group">
      <label>Button Action:</label>
      <select id="button-action">
        <option value="navigate">Navigate to page (internal)</option>
        <option value="external">Open external link</option>
      </select>
    </div>

    <div class="form-group">
      <label>Target:</label>
      <input type="text" id="button-target" placeholder="/dagelijkse-planning or https://...">
    </div>
  </div>
</div>
```

**JavaScript:**

```javascript
document.getElementById('has-button').addEventListener('change', (e) => {
  document.getElementById('button-config').style.display =
    e.target.checked ? 'block' : 'none';
});

// Update form submission to include new fields
// In the existing submit handler, add:
data.message_type = document.getElementById('message-type').value;
data.dismissible = document.getElementById('dismissible').checked;
data.snoozable = document.getElementById('snoozable').checked;

if (document.getElementById('has-button').checked) {
  data.button_label = document.getElementById('button-label').value;
  data.button_action = document.getElementById('button-action').value;
  data.button_target = document.getElementById('button-target').value;
}
```

### 3.5 Backend: Button Click Tracking

**Add endpoint:**

```javascript
app.post('/api/messages/:id/button-click', async (req, res) => {
  const messageId = req.params.id;
  const userId = req.session.userId;

  await pool.query(`
    UPDATE message_interactions
    SET button_clicked = true, button_clicked_at = NOW()
    WHERE message_id = $1 AND user_id = $2
  `, [messageId, userId]);

  res.json({ success: true });
});
```

### 3.6 Testing Checklist for Phase 3

- [ ] All message types display with correct icons and colors
- [ ] Markdown links render correctly
- [ ] Action buttons work (navigate and external)
- [ ] Multiple messages display in carousel (prev/next buttons)
- [ ] Important messages appear first in carousel
- [ ] Snooze works (1h, 4h, 1d options)
- [ ] Snoozed messages reappear after duration
- [ ] Non-dismissible messages can't be closed
- [ ] Button clicks are tracked in database

### 3.7 Phase 3 Completion Criteria

✅ Message types with icons and styling work
✅ Markdown support for links functional
✅ Action buttons (navigate/external) work
✅ Multi-message carousel functional
✅ Priority sorting (important first) works
✅ Snooze functionality complete
✅ Non-dismissible messages enforced
✅ Button tracking works

---

## Phase 4: Analytics & Admin UI (~4-5 hours)

### Deliverable
Complete admin dashboard with message analytics, preview functionality, and user interaction tracking.

### 4.1 Backend API: Analytics Endpoints

#### GET `/api/admin/messages/:id/analytics`
**Purpose:** Get detailed analytics for a specific message

**Response:**
```json
{
  "message": {
    "id": 123,
    "title": "Welcome to Tickedify",
    "created_at": "2025-01-15T10:00:00Z"
  },
  "targeting": {
    "total_targeted": 245,
    "estimated_reach": 245
  },
  "engagement": {
    "total_shown": 198,
    "total_dismissed": 156,
    "total_snoozed": 42,
    "button_clicks": 89
  },
  "rates": {
    "seen_rate": 80.8,
    "dismiss_rate": 63.7,
    "snooze_rate": 17.1,
    "button_click_rate": 45.0
  },
  "users": [
    {
      "id": 1,
      "name": "Jan Buskens",
      "email": "jan@buskens.be",
      "first_shown": "2025-01-15T11:30:00Z",
      "dismissed": true,
      "snoozed": false,
      "button_clicked": true
    }
  ]
}
```

**Implementation:**
```javascript
app.get('/api/admin/messages/:id/analytics', async (req, res) => {
  const messageId = req.params.id;

  // Get message details
  const message = await pool.query(
    'SELECT * FROM admin_messages WHERE id = $1',
    [messageId]
  );

  // Calculate total targeted users
  const targeting = await calculateTargeting(message.rows[0]);

  // Get interaction stats
  const interactions = await pool.query(`
    SELECT
      COUNT(*) as total_shown,
      COUNT(*) FILTER (WHERE dismissed = true) as total_dismissed,
      COUNT(*) FILTER (WHERE snoozed_until > NOW()) as total_snoozed,
      COUNT(*) FILTER (WHERE button_clicked = true) as button_clicks
    FROM message_interactions
    WHERE message_id = $1
  `, [messageId]);

  // Get detailed user interactions
  const users = await pool.query(`
    SELECT
      u.id, u.name, u.email,
      mi.first_shown_at,
      mi.dismissed,
      mi.snoozed_until IS NOT NULL AND mi.snoozed_until > NOW() as snoozed,
      mi.button_clicked
    FROM message_interactions mi
    JOIN users u ON u.id = mi.user_id
    WHERE mi.message_id = $1
    ORDER BY mi.first_shown_at DESC
  `, [messageId]);

  const stats = interactions.rows[0];

  res.json({
    message: message.rows[0],
    targeting: targeting,
    engagement: stats,
    rates: {
      seen_rate: (stats.total_shown / targeting.total_targeted * 100).toFixed(1),
      dismiss_rate: (stats.total_dismissed / stats.total_shown * 100).toFixed(1),
      snooze_rate: (stats.total_snoozed / stats.total_shown * 100).toFixed(1),
      button_click_rate: stats.button_clicks > 0 ?
        (stats.button_clicks / stats.total_shown * 100).toFixed(1) : 0
    },
    users: users.rows
  });
});

async function calculateTargeting(message) {
  let query = 'SELECT COUNT(*) FROM users WHERE 1=1';
  const params = [];

  if (message.target_type === 'filtered' && message.target_subscription) {
    query += ` AND subscription_type = ANY($${params.length + 1})`;
    params.push(message.target_subscription);
  }

  if (message.target_type === 'specific_users' && message.target_users) {
    query += ` AND id = ANY($${params.length + 1})`;
    params.push(message.target_users);
  }

  const result = await pool.query(query, params);
  return {
    total_targeted: parseInt(result.rows[0].count),
    estimated_reach: parseInt(result.rows[0].count)
  };
}
```

#### GET `/api/admin/messages`
**Purpose:** List all messages with summary stats

**Response:**
```json
{
  "messages": [
    {
      "id": 123,
      "title": "Welcome to Tickedify",
      "message_type": "educational",
      "target_type": "all",
      "trigger_type": "immediate",
      "active": true,
      "created_at": "2025-01-15T10:00:00Z",
      "stats": {
        "targeted": 245,
        "shown": 198,
        "dismissed": 156
      }
    }
  ]
}
```

**Implementation:**
```javascript
app.get('/api/admin/messages', async (req, res) => {
  const messages = await pool.query(`
    SELECT
      m.*,
      COUNT(DISTINCT CASE WHEN mi.user_id IS NOT NULL THEN mi.user_id END) as shown_count,
      COUNT(DISTINCT CASE WHEN mi.dismissed = true THEN mi.user_id END) as dismissed_count
    FROM admin_messages m
    LEFT JOIN message_interactions mi ON mi.message_id = m.id
    GROUP BY m.id
    ORDER BY m.created_at DESC
  `);

  // Enhance with targeting counts
  const enhanced = await Promise.all(messages.rows.map(async (msg) => {
    const targeting = await calculateTargeting(msg);
    return {
      ...msg,
      stats: {
        targeted: targeting.total_targeted,
        shown: parseInt(msg.shown_count),
        dismissed: parseInt(msg.dismissed_count)
      }
    };
  }));

  res.json({ messages: enhanced });
});
```

#### POST `/api/admin/messages/:id/toggle`
**Purpose:** Activate/deactivate a message

**Response:**
```json
{
  "success": true,
  "active": false
}
```

**Implementation:**
```javascript
app.post('/api/admin/messages/:id/toggle', async (req, res) => {
  const result = await pool.query(`
    UPDATE admin_messages
    SET active = NOT active
    WHERE id = $1
    RETURNING active
  `, [req.params.id]);

  res.json({
    success: true,
    active: result.rows[0].active
  });
});
```

### 4.2 Admin UI: Messages Dashboard

**Add to admin.html:**

```html
<section id="admin-messages-dashboard">
  <h2>📢 Messages Dashboard</h2>

  <div class="dashboard-tabs">
    <button class="tab-btn active" data-tab="create">Create Message</button>
    <button class="tab-btn" data-tab="list">All Messages</button>
  </div>

  <!-- CREATE TAB (existing form from Phase 2) -->
  <div id="tab-create" class="tab-content active">
    <!-- Existing message creator form goes here -->
  </div>

  <!-- LIST TAB -->
  <div id="tab-list" class="tab-content" style="display: none;">
    <div class="messages-table">
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Type</th>
            <th>Targeting</th>
            <th>Trigger</th>
            <th>Stats</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="messages-table-body">
          <!-- Populated by JS -->
        </tbody>
      </table>
    </div>
  </div>
</section>

<!-- Analytics Modal -->
<div id="analytics-modal" class="modal-overlay" style="display: none;">
  <div class="analytics-modal">
    <div class="modal-header">
      <h3>Message Analytics</h3>
      <button class="btn-close" onclick="closeAnalyticsModal()">×</button>
    </div>

    <div class="modal-body">
      <div id="analytics-content">
        <!-- Populated by JS -->
      </div>
    </div>
  </div>
</div>
```

**JavaScript for dashboard:**

```javascript
// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    // Remove active from all
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');

    // Add active to clicked
    e.target.classList.add('active');
    document.getElementById(`tab-${e.target.dataset.tab}`).style.display = 'block';

    // Load data if list tab
    if (e.target.dataset.tab === 'list') {
      loadMessagesList();
    }
  });
});

async function loadMessagesList() {
  const response = await fetch('/api/admin/messages');
  const data = await response.json();

  const tbody = document.getElementById('messages-table-body');
  tbody.innerHTML = data.messages.map(msg => `
    <tr class="${msg.active ? '' : 'inactive'}">
      <td>
        <strong>${msg.title}</strong>
        <br><small>${msg.message.substring(0, 60)}...</small>
      </td>
      <td>
        ${getMessageIcon(msg.message_type)} ${msg.message_type}
      </td>
      <td>
        ${getTargetingLabel(msg)}
        <br><small>${msg.stats.targeted} users</small>
      </td>
      <td>
        ${getTriggerLabel(msg)}
      </td>
      <td>
        <div class="stats-mini">
          👁️ ${msg.stats.shown} / ${msg.stats.targeted}
          <br>✓ ${msg.stats.dismissed}
        </div>
      </td>
      <td>
        <span class="badge ${msg.active ? 'badge-active' : 'badge-inactive'}">
          ${msg.active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td class="actions">
        <button onclick="viewAnalytics(${msg.id})" class="btn-sm">📊 Analytics</button>
        <button onclick="toggleMessage(${msg.id})" class="btn-sm">
          ${msg.active ? '⏸️ Pause' : '▶️ Activate'}
        </button>
      </td>
    </tr>
  `).join('');
}

function getMessageIcon(type) {
  const icons = {
    information: 'ℹ️',
    educational: '📚',
    warning: '⚠️',
    important: '❗',
    feature: '🆕',
    tip: '💡'
  };
  return icons[type] || 'ℹ️';
}

function getTargetingLabel(msg) {
  if (msg.target_type === 'all') return 'Everyone';
  if (msg.target_type === 'filtered') return `Filtered (${msg.target_subscription.join(', ')})`;
  if (msg.target_type === 'specific_users') return 'Specific users';
  return msg.target_type;
}

function getTriggerLabel(msg) {
  switch(msg.trigger_type) {
    case 'immediate': return 'Immediate';
    case 'days_after_signup': return `${msg.trigger_value} days after signup`;
    case 'first_page_visit': return `First visit: ${msg.trigger_value}`;
    case 'nth_page_visit':
      const [n, page] = msg.trigger_value.split(':');
      return `${n}th visit: ${page}`;
    default: return msg.trigger_type;
  }
}

async function toggleMessage(messageId) {
  const response = await fetch(`/api/admin/messages/${messageId}/toggle`, {
    method: 'POST'
  });

  if (response.ok) {
    loadMessagesList();
  }
}

async function viewAnalytics(messageId) {
  const response = await fetch(`/api/admin/messages/${messageId}/analytics`);
  const data = await response.json();

  const content = document.getElementById('analytics-content');
  content.innerHTML = `
    <div class="analytics-header">
      <h4>${data.message.title}</h4>
      <p>${data.message.message}</p>
    </div>

    <div class="analytics-stats">
      <div class="stat-card">
        <div class="stat-value">${data.targeting.total_targeted}</div>
        <div class="stat-label">Targeted Users</div>
      </div>

      <div class="stat-card">
        <div class="stat-value">${data.engagement.total_shown}</div>
        <div class="stat-label">Shown</div>
        <div class="stat-sub">${data.rates.seen_rate}% of targeted</div>
      </div>

      <div class="stat-card">
        <div class="stat-value">${data.engagement.total_dismissed}</div>
        <div class="stat-label">Dismissed</div>
        <div class="stat-sub">${data.rates.dismiss_rate}% of shown</div>
      </div>

      <div class="stat-card">
        <div class="stat-value">${data.engagement.total_snoozed}</div>
        <div class="stat-label">Snoozed</div>
        <div class="stat-sub">${data.rates.snooze_rate}% of shown</div>
      </div>

      ${data.engagement.button_clicks > 0 ? `
        <div class="stat-card">
          <div class="stat-value">${data.engagement.button_clicks}</div>
          <div class="stat-label">Button Clicks</div>
          <div class="stat-sub">${data.rates.button_click_rate}% of shown</div>
        </div>
      ` : ''}
    </div>

    <div class="analytics-users">
      <h5>User Interactions (${data.users.length})</h5>
      <table class="users-table">
        <thead>
          <tr>
            <th>User</th>
            <th>First Shown</th>
            <th>Dismissed</th>
            <th>Snoozed</th>
            <th>Clicked</th>
          </tr>
        </thead>
        <tbody>
          ${data.users.map(user => `
            <tr>
              <td>${user.name}<br><small>${user.email}</small></td>
              <td>${new Date(user.first_shown_at).toLocaleString()}</td>
              <td>${user.dismissed ? '✓' : '-'}</td>
              <td>${user.snoozed ? '💤' : '-'}</td>
              <td>${user.button_clicked ? '🔘' : '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById('analytics-modal').style.display = 'flex';
}

function closeAnalyticsModal() {
  document.getElementById('analytics-modal').style.display = 'none';
}
```

**CSS for dashboard:**

```css
.dashboard-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  border-bottom: 2px solid #E5E7EB;
}

.tab-btn {
  padding: 10px 20px;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  font-weight: 500;
  color: #6B7280;
}

.tab-btn.active {
  color: #2563eb;
  border-bottom-color: #2563eb;
}

.messages-table table {
  width: 100%;
  border-collapse: collapse;
}

.messages-table th,
.messages-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #E5E7EB;
}

.messages-table th {
  background: #F9FAFB;
  font-weight: 600;
  font-size: 13px;
  text-transform: uppercase;
  color: #6B7280;
}

.messages-table tr.inactive {
  opacity: 0.5;
}

.stats-mini {
  font-size: 13px;
  line-height: 1.6;
}

.badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.badge-active {
  background: #D1FAE5;
  color: #065F46;
}

.badge-inactive {
  background: #FEE2E2;
  color: #991B1B;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
  background: #F3F4F6;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin: 2px;
}

.btn-sm:hover {
  background: #E5E7EB;
}

/* Analytics Modal */
.analytics-modal {
  background: white;
  border-radius: 12px;
  padding: 24px;
  max-width: 900px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.btn-close {
  font-size: 24px;
  background: none;
  border: none;
  cursor: pointer;
  color: #6B7280;
}

.analytics-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #E5E7EB;
}

.analytics-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  background: #F9FAFB;
  padding: 16px;
  border-radius: 8px;
  text-align: center;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #2563eb;
}

.stat-label {
  font-size: 13px;
  font-weight: 600;
  color: #6B7280;
  margin-top: 4px;
}

.stat-sub {
  font-size: 12px;
  color: #9CA3AF;
  margin-top: 2px;
}

.analytics-users h5 {
  margin-bottom: 12px;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.users-table th,
.users-table td {
  padding: 8px;
  border-bottom: 1px solid #E5E7EB;
}

.users-table th {
  background: #F9FAFB;
  font-weight: 600;
  text-align: left;
}
```

### 4.3 Admin UI: Message Preview

**Add preview button to message creator:**

```html
<div class="form-actions">
  <button type="button" class="btn-secondary" onclick="previewMessage()">
    👁️ Preview Message
  </button>
  <button type="submit" class="btn-primary">Create Message</button>
</div>
```

**Preview function:**

```javascript
function previewMessage() {
  const title = document.getElementById('msg-title').value;
  const message = document.getElementById('msg-content').value;
  const messageType = document.getElementById('message-type').value;

  const hasButton = document.getElementById('has-button').checked;
  const buttonLabel = hasButton ? document.getElementById('button-label').value : null;

  // Create preview object
  const preview = {
    id: 'preview',
    title: title || 'Preview Title',
    message: message || 'Preview message content...',
    message_type: messageType,
    dismissible: document.getElementById('dismissible').checked,
    snoozable: document.getElementById('snoozable').checked,
    button_label: buttonLabel,
    button_action: hasButton ? document.getElementById('button-action').value : null,
    button_target: hasButton ? document.getElementById('button-target').value : null
  };

  // Show preview in modal
  currentMessages = [preview];
  currentMessageIndex = 0;
  showMessage(preview);

  // Override dismiss to just close (don't actually dismiss)
  document.querySelector('.btn-message-dismiss').onclick = () => {
    document.getElementById('message-modal-overlay').style.display = 'none';
  };
}
```

### 4.4 Testing Checklist for Phase 4

- [ ] Messages list displays all messages with stats
- [ ] Can toggle message active/inactive
- [ ] Analytics modal shows correct stats
- [ ] User interactions table populates correctly
- [ ] Target count is accurate
- [ ] Seen/dismiss/snooze rates calculate correctly
- [ ] Button click tracking shows in analytics
- [ ] Preview function works for all message types
- [ ] Preview shows correct button and styling

### 4.5 Phase 4 Completion Criteria

✅ Complete admin dashboard with message list
✅ Analytics display with stats and rates
✅ Individual user interaction tracking
✅ Message preview functionality
✅ Toggle message active/inactive
✅ All metrics calculate correctly

---

## Final Integration & Testing

### Integration Checklist

- [ ] All database tables created and indexed
- [ ] All API endpoints implemented and tested
- [ ] Frontend modal integrated into app.html
- [ ] Admin dashboard integrated into admin.html
- [ ] Page visit tracking added to all pages
- [ ] Message checking runs on app load
- [ ] All CSS added to stylesheets
- [ ] All JavaScript properly included

### End-to-End Test Scenarios

#### Scenario 1: Broadcast Message
1. Admin creates message: "App going English-only on Feb 1"
2. Target: Everyone
3. Trigger: Immediate
4. Type: Important
5. Verify: All users see message on next app load
6. User dismisses message
7. Verify: Message doesn't appear again for that user
8. Check analytics: Shows correct seen/dismiss counts

#### Scenario 2: Onboarding Sequence
1. Admin creates message: "Welcome to Daily Planning"
2. Target: All
3. Trigger: First visit to "dagelijkse-planning"
4. Type: Educational
5. Button: "Try it now" → navigate to /dagelijkse-planning
6. New user visits planning page
7. Verify: Message appears
8. User clicks button
9. Verify: Navigates to planning, message dismissed
10. Check analytics: Button click tracked

#### Scenario 3: Progressive Tutorial
1. Admin creates message: "Edit Task Basics"
2. Trigger: First visit to "edit-task-modal"
3. Admin creates message: "Keyboard Shortcuts"
4. Trigger: 5th visit to "edit-task-modal"
5. User opens edit modal 1st time
6. Verify: "Basics" message appears
7. User opens edit modal 5 times
8. Verify: "Keyboard Shortcuts" message appears on 5th

#### Scenario 4: Targeted Campaign
1. Admin creates message: "Premium Feature Available"
2. Target: Filtered → Premium users only
3. Trigger: Immediate
4. Button: "Learn more" → external link
5. Verify: Only premium users see message
6. Verify: Free users don't see message
7. Premium user clicks button
8. Verify: Opens external link in new tab

#### Scenario 5: Snooze & Re-appearance
1. User sees message
2. User clicks "Snooze 1 hour"
3. Verify: Message disappears
4. Verify: Message doesn't appear on page reload (within 1 hour)
5. Wait 1 hour (or manually set snoozed_until in database)
6. User reloads page
7. Verify: Message reappears

#### Scenario 6: Multiple Messages Carousel
1. Admin creates 3 messages (all immediate, all users)
2. User loads app
3. Verify: Modal shows "1 / 3"
4. Verify: Can navigate with prev/next buttons
5. Verify: Important message appears first
6. User dismisses message #1
7. Verify: Carousel updates to show remaining 2

### Performance Considerations

**Database Indexes:**
- Ensure indexes exist on frequently queried columns
- Monitor query performance on `message_interactions` table as it grows

**Optimization:**
```sql
-- Add index for unread message queries
CREATE INDEX idx_message_interactions_status
ON message_interactions(user_id, dismissed, snoozed_until);

-- Add composite index for targeting queries
CREATE INDEX idx_users_subscription
ON users(subscription_type, created_at);
```

**Caching Strategy:**
- Consider caching message list per user (invalidate on dismiss/snooze)
- Cache user page visit counts to reduce database hits

### Security Considerations

**Admin Authorization:**
```javascript
// Middleware to verify admin access
function requireAdmin(req, res, next) {
  if (req.session.userId !== 1) {  // Update with proper admin check
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

// Apply to all admin routes
app.post('/api/admin/messages', requireAdmin, async (req, res) => { ... });
app.get('/api/admin/messages', requireAdmin, async (req, res) => { ... });
```

**Input Validation:**
```javascript
// Validate message creation
function validateMessageInput(data) {
  if (!data.title || data.title.length > 255) {
    throw new Error('Invalid title');
  }

  if (!data.message || data.message.length > 10000) {
    throw new Error('Invalid message');
  }

  const validTypes = ['information', 'educational', 'warning', 'important', 'feature', 'tip'];
  if (!validTypes.includes(data.message_type)) {
    throw new Error('Invalid message type');
  }

  // Validate targeting
  const validTargetTypes = ['all', 'filtered', 'specific_users'];
  if (!validTargetTypes.includes(data.target_type)) {
    throw new Error('Invalid target type');
  }

  // Validate trigger
  const validTriggers = ['immediate', 'days_after_signup', 'first_page_visit', 'nth_page_visit'];
  if (!validTriggers.includes(data.trigger_type)) {
    throw new Error('Invalid trigger type');
  }
}
```

### Deployment Checklist

Before deploying to production:

- [ ] Run all database migrations
- [ ] Test on staging environment
- [ ] Verify no SQL injection vulnerabilities
- [ ] Confirm admin-only routes are protected
- [ ] Test with multiple concurrent users
- [ ] Verify page visit tracking doesn't slow page loads
- [ ] Check mobile responsiveness of modal
- [ ] Test all snooze durations
- [ ] Verify expiration logic works correctly
- [ ] Test scheduled messages (publish_at in future)
- [ ] Backup database before migration
- [ ] Update CHANGELOG.md with new feature
- [ ] Bump version in package.json
- [ ] Deploy to staging first, then production

---

## Appendix A: Database Schema Summary

Complete schema with all tables:

```sql
-- Main messages table
CREATE TABLE admin_messages (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'information',
  target_type VARCHAR(50) DEFAULT 'all',
  target_subscription VARCHAR(50)[],
  target_search TEXT,
  target_users INTEGER[],
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

-- User interactions
CREATE TABLE message_interactions (
  message_id INTEGER REFERENCES admin_messages(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  snoozed_until TIMESTAMP,
  dismissed BOOLEAN DEFAULT FALSE,
  first_shown_at TIMESTAMP DEFAULT NOW(),
  last_shown_at TIMESTAMP DEFAULT NOW(),
  shown_count INTEGER DEFAULT 1,
  button_clicked BOOLEAN DEFAULT FALSE,
  button_clicked_at TIMESTAMP,
  PRIMARY KEY (message_id, user_id)
);

-- Page visit tracking
CREATE TABLE user_page_visits (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  page_identifier VARCHAR(100) NOT NULL,
  visit_count INTEGER DEFAULT 1,
  first_visit_at TIMESTAMP DEFAULT NOW(),
  last_visit_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, page_identifier)
);

-- Indexes
CREATE INDEX idx_admin_messages_active ON admin_messages(active);
CREATE INDEX idx_admin_messages_publish_expires ON admin_messages(publish_at, expires_at);
CREATE INDEX idx_message_interactions_user ON message_interactions(user_id);
CREATE INDEX idx_message_interactions_snoozed ON message_interactions(snoozed_until) WHERE snoozed_until IS NOT NULL;
CREATE INDEX idx_message_interactions_status ON message_interactions(user_id, dismissed, snoozed_until);
CREATE INDEX idx_user_page_visits_count ON user_page_visits(page_identifier, visit_count);
```

---

## Appendix B: API Endpoints Summary

**Admin Endpoints (require admin auth):**
- `POST /api/admin/messages` - Create message
- `GET /api/admin/messages` - List all messages with stats
- `GET /api/admin/messages/:id/analytics` - Get detailed analytics
- `POST /api/admin/messages/:id/toggle` - Toggle active status
- `GET /api/admin/users/search?q=query` - Search users
- `GET /api/admin/messages/preview-targets` - Preview targeting

**User Endpoints:**
- `GET /api/messages/unread?page=identifier` - Get unread messages
- `POST /api/messages/:id/dismiss` - Dismiss message
- `POST /api/messages/:id/snooze` - Snooze message
- `POST /api/messages/:id/button-click` - Track button click
- `POST /api/page-visit/:pageIdentifier` - Track page visit

---

## Appendix C: Page Identifiers Reference

Standard page identifiers for triggers:

- `dagelijkse-planning` - Daily planning page
- `actielijst` - Action list page
- `inbox` - Inbox page
- `edit-task-modal` - Edit task modal
- `quick-add-modal` - Quick add modal
- `recurring-task-popup` - Recurring task popup
- `planning-popup` - Planning popup

Add more as needed in application.

---

## Appendix D: Example Messages

**Welcome Message (Day 1):**
```
Type: Educational
Title: Welcome to Tickedify!
Message: Tickedify helps you master your time with the "Baas Over Je Tijd" method. Start by adding tasks to your action list, then plan them in your daily calendar. [Learn more](https://tickedify.com/help)
Trigger: 0 days after signup
Target: Everyone
Button: Get Started → /dagelijkse-planning
```

**Planning Tutorial (First Visit):**
```
Type: Educational
Title: Welcome to Daily Planning
Message: This is where you organize your day. Drag tasks from your action list to time slots on the calendar. Use colors to set priorities.
Trigger: First visit to dagelijkse-planning
Target: Everyone
Button: Try it now → navigate
```

**Advanced Tips (5th Visit):**
```
Type: Tip
Title: Keyboard Shortcuts for Power Users
Message: Speed up your workflow! Press Tab to move between fields, Enter to save, Escape to cancel. You can also use Ctrl+S to quick-save.
Trigger: 5th visit to edit-task-modal
Target: Everyone
```

**Feature Announcement:**
```
Type: Feature
Title: New: Time Tracking
Message: Track how long tasks actually take! Click the timer icon when you start working on a task. This helps you improve your time estimates.
Trigger: Immediate
Target: Premium users
Publish: 2025-02-15 09:00
Button: Learn more → https://tickedify.com/features/time-tracking
```

**Important Announcement:**
```
Type: Important
Title: Tickedify is Going English-Only
Message: Starting March 1st, 2025, Tickedify will be available in English only. This allows us to focus on building better features faster. All your data will remain unchanged.
Trigger: Immediate
Target: Everyone
Publish: 2025-02-01 00:00
Expires: 2025-03-01 23:59
Dismissible: false
```

**Maintenance Warning:**
```
Type: Warning
Title: Scheduled Maintenance Tonight
Message: Tickedify will be offline for maintenance tonight from 2 AM to 4 AM CET. Please save your work before then.
Trigger: Immediate
Target: Everyone
Publish: 2025-01-20 18:00
Expires: 2025-01-21 04:00
```

---

## Implementation Notes

**Code Style:**
- All code in English (variable names, comments, etc.)
- Follow existing Tickedify code style
- Use async/await for database queries
- Proper error handling with try/catch

**Testing:**
- Test each phase independently before moving to next
- Create test messages for each scenario
- Verify with multiple user accounts
- Check mobile responsiveness

**Version Control:**
- Create feature branch: `feature/admin-messaging-system`
- Commit after each phase completion
- Update CHANGELOG.md with each phase
- Merge to develop, test on staging, then to main

**Documentation:**
- Update ARCHITECTURE.md with new tables and endpoints
- Add inline code comments for complex logic
- Document page identifiers in code

---

## Phase Implementation Order

1. **Phase 1 First:** Get basic messaging working end-to-end
2. **Phase 2 Next:** Add targeting and triggers
3. **Phase 3 Then:** Polish UX with rich content
4. **Phase 4 Finally:** Add analytics and admin polish

Each phase builds on the previous, so this order is recommended.

---

**End of Specification**

This document contains everything needed to implement the complete messaging system. Simply reference this file when ready to begin implementation.
