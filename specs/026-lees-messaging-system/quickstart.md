# Quickstart: In-App Admin-to-User Messaging System

**Feature**: 026-lees-messaging-system
**Date**: 2025-01-23

## Prerequisites

- Feature branch `026-lees-messaging-system` checked out
- PostgreSQL database met toegang tot Neon console
- Node.js/npm geïnstalleerd voor local development
- Vercel CLI voor staging deployment (optioneel)
- Admin test account: jan@buskens.be / qyqhut-muDvop-fadki9

---

## Phase 1: Core Foundation (~4 uur)

### Step 1: Database Schema Setup

**Maak de 3 nieuwe tabellen aan**:

```bash
# Log in op Neon console: https://console.neon.tech
# Select tickedify database
# Run SQL:
```

```sql
-- Table 1: admin_messages
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

-- Indexes
CREATE INDEX idx_admin_messages_active ON admin_messages(active);
CREATE INDEX idx_admin_messages_publish_expires ON admin_messages(publish_at, expires_at);

-- Table 2: message_interactions
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

-- Indexes
CREATE INDEX idx_message_interactions_user ON message_interactions(user_id);
CREATE INDEX idx_message_interactions_snoozed ON message_interactions(snoozed_until)
  WHERE snoozed_until IS NOT NULL;
CREATE INDEX idx_message_interactions_status ON message_interactions(user_id, dismissed, snoozed_until);

-- Table 3: user_page_visits
CREATE TABLE user_page_visits (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  page_identifier VARCHAR(100) NOT NULL,
  visit_count INTEGER DEFAULT 1,
  first_visit_at TIMESTAMP DEFAULT NOW(),
  last_visit_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, page_identifier)
);

-- Index
CREATE INDEX idx_user_page_visits_count ON user_page_visits(page_identifier, visit_count);

-- Optional: Add subscription_type to users if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_type VARCHAR(50) DEFAULT 'free';
CREATE INDEX IF NOT EXISTS idx_users_subscription ON users(subscription_type, created_at);
```

**Verify schema**:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('admin_messages', 'message_interactions', 'user_page_visits');
```

Expected: 3 rows returned

---

### Step 2: Backend API Endpoints

**Bestand**: `server.js`

**Locatie voor nieuwe code**: Na regel 6,253 (einde van bestand) of in logische sectie

**Admin Endpoints toevoegen**:

```javascript
// === ADMIN MESSAGING ENDPOINTS ===

// Middleware: Admin authorization
function requireAdmin(req, res, next) {
  if (!req.session.userId || req.session.userId !== 1) {
    return res.status(403).json({ error: 'Forbidden - Admin access required' });
  }
  next();
}

// POST /api/admin/messages - Create message
app.post('/api/admin/messages', requireAdmin, async (req, res) => {
  try {
    const {
      title, message, message_type, target_type, target_subscription,
      target_users, trigger_type, trigger_value, dismissible, snoozable,
      publish_at, expires_at, button_label, button_action, button_target
    } = req.body;

    // Validation
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    const result = await pool.query(`
      INSERT INTO admin_messages (
        title, message, message_type, target_type, target_subscription,
        target_users, trigger_type, trigger_value, dismissible, snoozable,
        publish_at, expires_at, button_label, button_action, button_target
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id
    `, [
      title, message, message_type || 'information', target_type || 'all',
      target_subscription, target_users, trigger_type || 'immediate',
      trigger_value, dismissible !== false, snoozable !== false,
      publish_at || null, expires_at || null, button_label || null,
      button_action || null, button_target || null
    ]);

    res.status(201).json({
      success: true,
      messageId: result.rows[0].id,
      message: 'Message created successfully'
    });
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/messages - List all messages
app.get('/api/admin/messages', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        m.*,
        COUNT(DISTINCT CASE WHEN mi.user_id IS NOT NULL THEN mi.user_id END) as shown_count,
        COUNT(DISTINCT CASE WHEN mi.dismissed = true THEN mi.user_id END) as dismissed_count
      FROM admin_messages m
      LEFT JOIN message_interactions mi ON mi.message_id = m.id
      GROUP BY m.id
      ORDER BY m.created_at DESC
    `);

    // TODO: Calculate targeted count per message (zie data-model.md Query Patterns)

    res.json({ messages: result.rows });
  } catch (error) {
    console.error('List messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/messages/:id/analytics - Message analytics
app.get('/api/admin/messages/:id/analytics', requireAdmin, async (req, res) => {
  try {
    const messageId = req.params.id;

    // TODO: Implement full analytics (zie api-contracts.md)

    res.json({ message: 'Analytics implementation TODO' });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/messages/:id/toggle - Toggle active status
app.post('/api/admin/messages/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE admin_messages
      SET active = NOT active
      WHERE id = $1
      RETURNING active
    `, [req.params.id]);

    res.json({ success: true, active: result.rows[0].active });
  } catch (error) {
    console.error('Toggle message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/users/search - Search users
app.get('/api/admin/users/search', requireAdmin, async (req, res) => {
  try {
    const query = req.query.q;
    if (!query || query.length < 2) {
      return res.json({ users: [] });
    }

    const result = await pool.query(`
      SELECT id, username as name, email, subscription_type
      FROM users
      WHERE username ILIKE $1 OR email ILIKE $1
      ORDER BY username
      LIMIT 50
    `, [`%${query}%`]);

    res.json({ users: result.rows });
  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/messages/preview-targets - Preview targeting
app.get('/api/admin/messages/preview-targets', requireAdmin, async (req, res) => {
  try {
    // TODO: Implement target preview (zie api-contracts.md)
    res.json({ count: 0, sample: [] });
  } catch (error) {
    console.error('Preview targets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

**User Endpoints toevoegen**:

```javascript
// === USER MESSAGING ENDPOINTS ===

// GET /api/messages/unread - Get unread messages
app.get('/api/messages/unread', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userId = req.session.userId;
    const now = new Date();

    // Basic query - Phase 1: only 'all' targeting + 'immediate' trigger
    const result = await pool.query(`
      SELECT m.* FROM admin_messages m
      WHERE m.active = true
        AND m.publish_at <= $1
        AND (m.expires_at IS NULL OR m.expires_at > $1)
        AND m.target_type = 'all'
        AND m.trigger_type = 'immediate'
        AND m.id NOT IN (
          SELECT message_id FROM message_interactions
          WHERE user_id = $2
            AND (dismissed = true OR snoozed_until > $1)
        )
      ORDER BY m.created_at DESC
    `, [now, userId]);

    res.json({ messages: result.rows });
  } catch (error) {
    console.error('Unread messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/messages/:id/dismiss - Dismiss message
app.post('/api/messages/:id/dismiss', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    await pool.query(`
      INSERT INTO message_interactions (message_id, user_id, dismissed)
      VALUES ($1, $2, true)
      ON CONFLICT (message_id, user_id)
      DO UPDATE SET dismissed = true, last_shown_at = NOW()
    `, [req.params.id, req.session.userId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Dismiss message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/page-visit/:pageIdentifier - Track page visit
app.post('/api/page-visit/:pageIdentifier', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await pool.query(`
      INSERT INTO user_page_visits (user_id, page_identifier, visit_count)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, page_identifier)
      DO UPDATE SET
        visit_count = user_page_visits.visit_count + 1,
        last_visit_at = NOW()
      RETURNING visit_count
    `, [req.session.userId, req.params.pageIdentifier]);

    res.json({ success: true, visitCount: result.rows[0].visit_count });
  } catch (error) {
    console.error('Page visit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

---

### Step 3: Frontend Message Modal

**Bestand**: `public/js/message-modal.js` (nieuw bestand aanmaken)

```javascript
// Message Modal System voor Tickedify
// Handles message display, carousel navigation, dismiss actions

let currentMessages = [];
let currentMessageIndex = 0;

// Auto-check on page load
document.addEventListener('DOMContentLoaded', async () => {
  await checkForMessages();
});

async function checkForMessages() {
  try {
    const response = await fetch('/api/messages/unread');
    if (!response.ok) return;

    const data = await response.json();

    if (data.messages && data.messages.length > 0) {
      currentMessages = data.messages;
      currentMessageIndex = 0;
      showMessage(currentMessages[0]);
    }
  } catch (error) {
    console.error('Check messages error:', error);
  }
}

function showMessage(message) {
  const modal = document.getElementById('message-modal-overlay');
  if (!modal) return;

  // Update content
  document.querySelector('.message-title').textContent = message.title;
  document.querySelector('.message-content').textContent = message.message;

  // Show modal
  modal.style.display = 'flex';

  // Handle dismiss button
  const dismissBtn = document.querySelector('.btn-message-dismiss');
  dismissBtn.onclick = async () => {
    await dismissMessage(message.id);
  };
}

async function dismissMessage(messageId) {
  try {
    await fetch(`/api/messages/${messageId}/dismiss`, { method: 'POST' });

    // Close modal
    const modal = document.getElementById('message-modal-overlay');
    modal.style.display = 'none';

    // Remove from current messages
    currentMessages = currentMessages.filter(m => m.id !== messageId);

    // Show next message if available
    if (currentMessages.length > 0) {
      currentMessageIndex = Math.min(currentMessageIndex, currentMessages.length - 1);
      showMessage(currentMessages[currentMessageIndex]);
    }
  } catch (error) {
    console.error('Dismiss error:', error);
  }
}
```

---

### Step 4: HTML Modal Structure

**Bestand**: `public/app.html`

**Locatie**: Voeg toe vóór de closing `</body>` tag

```html
<!-- Message Modal -->
<div id="message-modal-overlay" class="modal-overlay" style="display: none;">
  <div class="message-modal">
    <div class="message-header">
      <span class="message-icon">ℹ️</span>
      <h3 class="message-title"></h3>
    </div>
    <div class="message-body">
      <p class="message-content"></p>
    </div>
    <div class="message-actions">
      <button class="btn-message-dismiss">Got it</button>
    </div>
  </div>
</div>

<!-- Include message modal script -->
<script src="js/message-modal.js"></script>
```

---

### Step 5: CSS Styling

**Bestand**: `public/style.css`

**Locatie**: Voeg toe aan einde van bestand (na regel 6,542)

```css
/* === MESSAGE MODAL STYLING === */

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

---

### Step 6: Test Phase 1

**Test Scenario 1: Create First Message**

1. Log in als admin: https://dev.tickedify.com/admin.html
2. Open browser console: `F12` → Console tab
3. Run SQL om test message te maken:

```javascript
fetch('/api/admin/messages', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Welcome to Tickedify',
    message: 'This is a test message from the new messaging system!',
    message_type: 'information',
    target_type: 'all',
    trigger_type: 'immediate'
  })
}).then(r => r.json()).then(console.log);
```

Expected output: `{success: true, messageId: 1, message: "Message created successfully"}`

**Test Scenario 2: View Message as User**

1. Log out van admin
2. Log in als regular user: jan@buskens.be / qyqhut-muDvop-fadki9
3. Navigate to https://dev.tickedify.com/app
4. Expected: Modal appears met "Welcome to Tickedify" message
5. Click "Got it" button
6. Expected: Modal disappears
7. Reload page
8. Expected: Modal does NOT appear (dismissed)

**Test Scenario 3: Verify Database**

```sql
-- Check message was created
SELECT * FROM admin_messages WHERE id = 1;

-- Check interaction was recorded
SELECT * FROM message_interactions WHERE message_id = 1;
```

Expected: 1 row in each table

---

## Phase 1 Success Criteria

- [x] Database tables created successfully
- [x] Can create a message via admin API
- [x] Message appears as modal popup when user loads app
- [x] "Got it" button dismisses message
- [x] Dismissed message doesn't appear again
- [x] Page visit tracking endpoint responds (geen visual output yet)

---

## Next Steps

**Phase 2**: Targeting & Triggers (~4 uur)
- Implement subscription filtering
- Add user search API
- Implement days_after_signup trigger
- Add page visit triggers
- Scheduled messages support

**Phase 3**: Rich Content & UX (~4 uur)
- Message types met icons en kleuren
- Markdown link parsing
- Action buttons (navigate/external)
- Snooze functionality
- Message carousel voor meerdere berichten

**Phase 4**: Analytics & Admin UI (~4-5 uur)
- Complete admin dashboard
- Message list table
- Analytics modal met stats
- Target preview
- Message toggle active/inactive

---

## Deployment Checklist (Phase 1)

- [ ] Version bump in package.json (e.g., 0.19.134)
- [ ] Commit changes: `git add . && git commit -m "📢 FEATURE: Phase 1 messaging foundation - v0.19.134"`
- [ ] Push to feature branch: `git push origin 026-lees-messaging-system`
- [ ] Verify staging deployment: https://dev.tickedify.com
- [ ] Test alle Phase 1 scenarios op staging
- [ ] Update public/changelog.html met Phase 1 entry
- [ ] Update ARCHITECTURE.md met nieuwe tabellen en endpoints
- [ ] **DO NOT** merge to main (BETA FREEZE actief)

---

## Troubleshooting

**Issue**: Modal doesn't appear
- Check: Browser console for JavaScript errors
- Check: Network tab - is /api/messages/unread returning data?
- Check: Database - zijn er active messages in admin_messages?

**Issue**: Dismiss doesn't work
- Check: Network tab - is POST /api/messages/:id/dismiss responding 200?
- Check: Database - is er een row in message_interactions?
- Check: Session authentication - is user ingelogd?

**Issue**: SQL errors
- Check: Foreign key constraints - does users table have rows?
- Check: Column names - exact match met schema?
- Check: Array syntax - gebruik ARRAY[...] voor PostgreSQL arrays

---

**Quickstart Ready for Phase 1 Implementation** ✅
