# Research Findings: YouTube Onboarding Video Popup

**Date**: 2025-10-14
**Feature**: 014-de-eerste-keer
**Status**: Complete

## 1. YouTube iframe Player API Best Practices

### Decision: Use YouTube privacy-enhanced mode (youtube-nocookie.com)

**Rationale**:
- GDPR-compliant: Does not set cookies unless user interacts with video
- Same functionality as regular YouTube embeds
- Required for EU users (Tickedify heeft Nederlandse gebruikers)

**Implementation**:
```html
<iframe
  src="https://www.youtube-nocookie.com/embed/VIDEO_ID?controls=1&fs=1&rel=0&modestbranding=1"
  frameborder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
  allowfullscreen>
</iframe>
```

**Parameters chosen**:
- `controls=1` - Show YouTube controls (play, pause, volume, timeline) ✓
- `fs=1` - Enable fullscreen button ✓
- `rel=0` - Disable related videos from other channels
- `modestbranding=1` - Minimal YouTube branding
- `autoplay=0` - NO autoplay (spec requirement) ✓

**Security considerations**:
- No `sandbox` attribute needed (trust YouTube's iframe)
- CSP: Allow `https://www.youtube-nocookie.com` in frame-src
- No custom JavaScript YouTube API needed (keep it simple)

**Error handling**:
- Invalid/deleted video: iframe shows YouTube's built-in error message
- Network error: Browser handles iframe loading failure
- Fallback text: "Video kan niet geladen worden" when video_url is null/empty

**Alternatives considered**:
- ❌ YouTube IFrame API (JavaScript): Overkill, adds complexity
- ❌ Regular youtube.com embeds: Not GDPR-compliant
- ✅ Simple iframe with youtube-nocookie.com: Perfect balance

---

## 2. Modal Popup Patterns in Tickedify

### Decision: Follow existing ConfirmModal pattern

**Existing Pattern Analysis**:
```javascript
// Pattern from app.js:231-276 (ConfirmModal class)
class ConfirmModal {
  constructor() {
    this.modal = document.getElementById('confirmModal');
    this.setupEventListeners();
  }

  setupEventListeners() {
    // ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.style.display === 'flex') {
        this.hide();
      }
    });

    // Click overlay to close
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.hide();
    });
  }

  show() {
    this.modal.style.display = 'flex';
  }

  hide() {
    this.modal.style.display = 'none';
  }
}
```

**CSS Structure** (from style.css:1757-1809):
```css
.popup-overlay {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(20px);
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

.popup-content {
  background: var(--macos-bg-primary);
  padding: 24px;
  border-radius: var(--macos-radius-large);
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
```

**Tickedify Modal Hierarchy**:
- Standard modals: z-index 1000
- Keyboard help: z-index 1500 (higher priority)
- Planning popup: z-index 1000
- **Onboarding video: z-index 1200** (boven planning, onder keyboard help)

**Implementation for Onboarding**:
```javascript
class OnboardingVideoManager {
  constructor() {
    this.popup = document.getElementById('onboardingVideoPopup');
    this.setupEventListeners();
  }

  setupEventListeners() {
    // ESC key to close (standard Tickedify pattern)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.popup.style.display === 'flex') {
        this.closeVideo();
      }
    });

    // Click overlay to close
    this.popup.addEventListener('click', (e) => {
      if (e.target === this.popup) this.closeVideo();
    });

    // Close button
    const closeBtn = this.popup.querySelector('.close-video-btn');
    closeBtn.addEventListener('click', () => this.closeVideo());
  }

  async showVideo() {
    // Fetch video URL from API
    const response = await fetch('/api/settings/onboarding-video');
    const data = await response.json();

    if (data.url) {
      // Extract YouTube video ID
      const videoId = this.extractYouTubeId(data.url);
      const iframe = this.popup.querySelector('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?controls=1&fs=1&rel=0&modestbranding=1`;
    } else {
      // Show fallback message
      this.showFallbackMessage();
    }

    this.popup.style.display = 'flex';
  }

  async closeVideo() {
    this.popup.style.display = 'none';

    // Mark video as seen in database
    await fetch('/api/user/onboarding-video-seen', {
      method: 'PUT'
    });
  }

  extractYouTubeId(url) {
    // Support multiple YouTube URL formats
    const patterns = [
      /youtube\.com\/watch\?v=([^&]+)/,
      /youtube\.com\/embed\/([^?]+)/,
      /youtu\.be\/([^?]+)/,
      /youtube-nocookie\.com\/embed\/([^?]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    return null; // Invalid URL
  }

  showFallbackMessage() {
    const iframe = this.popup.querySelector('iframe');
    iframe.style.display = 'none';

    const fallback = this.popup.querySelector('.fallback-message');
    fallback.style.display = 'block';
    fallback.textContent = 'Nog geen welkomstvideo beschikbaar';
  }
}
```

**Responsive Design**:
- `.popup-content` already responsive with `width: 90%` and `max-width: 600px`
- YouTube iframe responsive via `aspect-ratio: 16 / 9` CSS
- Mobile: Full width minus padding, scrollable if needed

**Alternatives considered**:
- ❌ Create entirely new modal system: Inconsistent with codebase
- ❌ Use external modal library: Adds dependency
- ✅ Follow ConfirmModal pattern: Consistent, proven, simple

---

## 3. Database Migration Strategy

### Decision: Manual migration script with version tracking

**Tickedify Migration Pattern**:
- Migrations stored in root directory as `migration-XXX.js`
- Executed manually via Node.js: `node migration-014.js`
- Idempotent design (safe to run multiple times)

**Migration Script Template**:
```javascript
// migration-014-onboarding-video.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('🔄 Starting migration 014: Onboarding Video...');

    // Check if columns already exist (idempotent)
    const checkUsers = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name='users' AND column_name='onboarding_video_seen'
    `);

    if (checkUsers.rows.length === 0) {
      console.log('  Adding columns to users table...');
      await client.query(`
        ALTER TABLE users
        ADD COLUMN onboarding_video_seen BOOLEAN DEFAULT FALSE,
        ADD COLUMN onboarding_video_seen_at TIMESTAMP
      `);
    } else {
      console.log('  ✓ Users columns already exist');
    }

    // Check if system_settings table exists
    const checkTable = await client.query(`
      SELECT FROM information_schema.tables
      WHERE table_name='system_settings'
    `);

    if (checkTable.rows.length === 0) {
      console.log('  Creating system_settings table...');
      await client.query(`
        CREATE TABLE system_settings (
          key VARCHAR(255) PRIMARY KEY,
          value TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_by INTEGER REFERENCES users(id)
        )
      `);

      // Insert initial onboarding video URL (NULL)
      await client.query(`
        INSERT INTO system_settings (key, value)
        VALUES ('onboarding_video_url', NULL)
      `);
    } else {
      console.log('  ✓ system_settings table already exists');
    }

    await client.query('COMMIT');
    console.log('✅ Migration 014 complete!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
```

**Rollback Strategy**:
```javascript
// rollback-014-onboarding-video.js
async function rollback() {
  // Safe rollback: Drop columns, table only if they exist
  await client.query(`
    ALTER TABLE users
    DROP COLUMN IF EXISTS onboarding_video_seen,
    DROP COLUMN IF EXISTS onboarding_video_seen_at
  `);

  await client.query(`DROP TABLE IF EXISTS system_settings`);
}
```

**Version Tracking**:
- Package.json version bump: 0.18.13 → 0.19.0 (minor = new feature)
- Changelog entry with migration number reference
- Git commit message: "🗄️ Migration 014: Onboarding video database schema"

**Alternatives considered**:
- ❌ ORM migrations (Sequelize, TypeORM): Overkill for Tickedify
- ❌ Auto-migration on server start: Risky, no rollback
- ✅ Manual migration scripts: Full control, safe, Tickedify pattern

---

## 4. Admin Settings UI Patterns

### Decision: Follow admin.html stats card pattern

**Existing Admin Pattern** (from ARCHITECTURE.md):
```html
<!-- admin.html -->
<div class="stats-card">
  <h3>Feedback Statistieken</h3>
  <div class="stat-row">
    <span class="stat-label">Nieuw:</span>
    <span id="feedbackNieuwCount">-</span>
  </div>
</div>
```

**Onboarding Settings Card**:
```html
<!-- admin.html: Add to settings section -->
<div class="settings-card">
  <h3>📹 Welkomstvideo Instellingen</h3>

  <div class="form-group">
    <label for="onboardingVideoUrl">YouTube Video URL</label>
    <input
      type="url"
      id="onboardingVideoUrl"
      placeholder="https://youtube.com/watch?v=..."
      class="admin-input"
    >
    <small class="help-text">
      Ondersteunt: youtube.com, youtu.be, youtube-nocookie.com
    </small>
  </div>

  <div class="preview-section" id="videoPreview" style="display: none;">
    <h4>Preview</h4>
    <iframe id="previewIframe" width="100%" height="315" frameborder="0"></iframe>
  </div>

  <div class="button-group">
    <button id="saveVideoUrl" class="btn btn-primary">
      💾 Opslaan
    </button>
    <button id="previewVideo" class="btn btn-secondary">
      👁️ Preview
    </button>
    <button id="clearVideoUrl" class="btn btn-danger">
      🗑️ Verwijderen
    </button>
  </div>

  <div id="videoUrlStatus" class="status-message"></div>
</div>
```

**Admin.js Implementation**:
```javascript
// admin.js: Add to existing AdminManager class
async loadOnboardingSettings() {
  const response = await fetch('/api/settings/onboarding-video');
  const data = await response.json();

  document.getElementById('onboardingVideoUrl').value = data.url || '';
}

async saveOnboardingVideo() {
  const url = document.getElementById('onboardingVideoUrl').value;
  const statusEl = document.getElementById('videoUrlStatus');

  // Validate URL
  if (url && !this.isValidYouTubeUrl(url)) {
    statusEl.textContent = '❌ Ongeldige YouTube URL';
    statusEl.className = 'status-message error';
    return;
  }

  try {
    loading.showGlobal('Opslaan...');

    const response = await fetch('/api/settings/onboarding-video', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    if (response.ok) {
      toast.success('Welkomstvideo URL opgeslagen!');
      statusEl.textContent = '✅ Opgeslagen';
      statusEl.className = 'status-message success';
    } else {
      throw new Error('Save failed');
    }
  } catch (error) {
    toast.error('Fout bij opslaan video URL');
    statusEl.textContent = '❌ Opslaan mislukt';
    statusEl.className = 'status-message error';
  } finally {
    loading.hideGlobal();
  }
}

isValidYouTubeUrl(url) {
  const patterns = [
    /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
    /^https?:\/\/youtu\.be\/[\w-]+/,
    /^https?:\/\/(www\.)?youtube-nocookie\.com\/embed\/[\w-]+/
  ];

  return patterns.some(pattern => pattern.test(url));
}

showVideoPreview() {
  const url = document.getElementById('onboardingVideoUrl').value;
  const preview = document.getElementById('videoPreview');
  const iframe = document.getElementById('previewIframe');

  if (!url) {
    preview.style.display = 'none';
    return;
  }

  const videoId = this.extractYouTubeId(url);
  if (videoId) {
    iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?controls=1`;
    preview.style.display = 'block';
  }
}
```

**CSS Styling**:
```css
/* admin.css: Match existing Tickedify admin styling */
.settings-card {
  background: var(--macos-bg-primary);
  border-radius: var(--macos-radius-large);
  padding: 24px;
  box-shadow: var(--macos-shadow-light);
  margin-bottom: 20px;
}

.admin-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--macos-gray-5);
  border-radius: var(--macos-radius-medium);
  font-size: 14px;
}

.help-text {
  color: var(--macos-text-secondary);
  font-size: 12px;
  display: block;
  margin-top: 6px;
}

.preview-section {
  margin-top: 20px;
  padding: 16px;
  background: var(--macos-gray-6);
  border-radius: var(--macos-radius-medium);
}

.button-group {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.status-message {
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: var(--macos-radius-small);
  font-size: 13px;
}

.status-message.success {
  background: var(--macos-green-light);
  color: var(--macos-green);
}

.status-message.error {
  background: var(--macos-red-light);
  color: var(--macos-red);
}
```

**Loading & Toast Integration**:
- Use existing `LoadingManager` class (app.js:8000)
- Use existing `ToastManager` class (app.js:7600)
- Pattern: `loading.showGlobal('Saving...')` + `toast.success('Saved!')`

**Alternatives considered**:
- ❌ Separate settings page: Overkill, breaks admin.html structure
- ❌ Modal-based settings: Less discoverable
- ✅ Settings card in admin.html: Consistent, visible, proven pattern

---

## Summary of Research Decisions

| Topic | Decision | Rationale |
|-------|----------|-----------|
| **YouTube Embed** | youtube-nocookie.com iframe | GDPR-compliant, simple, no JS API needed |
| **Modal Pattern** | ConfirmModal class pattern | Consistent with Tickedify, ESC + overlay close |
| **Database Migration** | Manual migration scripts | Full control, idempotent, Tickedify standard |
| **Admin UI** | Settings card in admin.html | Matches existing pattern, visible, intuitive |

**No NEEDS CLARIFICATION items remaining** - All technical decisions made with clear rationale.

---

**Research Complete**: 2025-10-14
**Ready for Phase 1**: Design & Contracts
