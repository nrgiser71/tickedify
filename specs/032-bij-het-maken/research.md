# Research: "Volgende Keer" Bericht Trigger Implementation

**Feature**: 032-bij-het-maken
**Date**: 2025-10-24
**Status**: Complete

## Research Scope

Dit document documenteert design decisions voor het toevoegen van een "next_time" trigger optie aan het bestaande Tickedify messaging system.

## Design Decisions

### 1. Trigger Logic Design

**Question**: Hoe bepalen of gebruiker een "next_time" bericht moet zien?

**Decision**: Vergelijk message `created_at` timestamp met user's laatste interaction timestamp uit `message_interactions` tabel.

**Rationale**:
- Message moet verschijnen als `message.created_at > user_interaction.timestamp` OR geen interaction bestaat
- Eenvoudig te implementeren met bestaande database structuur
- Consistent met bestaande trigger evaluation patterns in server.js

**Implementation Approach**:
```sql
-- Pseudo-code voor trigger evaluation
SELECT m.* FROM admin_messages m
LEFT JOIN message_interactions mi ON m.id = mi.message_id AND mi.user_id = $1
WHERE m.trigger_type = 'next_time'
  AND m.active = TRUE
  AND (mi.message_id IS NULL OR mi.dismissed = FALSE)
  AND m.publish_at <= NOW()
  AND (m.expires_at IS NULL OR m.expires_at > NOW())
```

**Alternatives Considered**:
- **Option A**: Track page visits en gebruik user_page_visits tabel
  - Rejected: Te complex, "next_time" is message-centric, niet page-centric
- **Option B**: Client-side timestamp comparison
  - Rejected: Inconsistent met bestaande server-side trigger evaluation

---

### 2. "Next Time" Definition

**Question**: Wat betekent "volgende bezoek" precies?

**Decision**: Eerste pagina load (van een willekeurige pagina) NA message `created_at` waar user nog GEEN interaction met het bericht heeft gehad (dismissed = FALSE of geen record).

**Rationale**:
- Simpel: Geen tracking van specifieke pagina's nodig
- Gebruiksvriendelijk: Bericht verschijnt zodra user de app opent na message creatie
- Herbruikt bestaande polling systeem (5-minuut interval in message-modal.js)

**Clarifications**:
- "Next time" is relatief tot message creation time, NIET tot user's vorige bezoek
- Multiple page loads binnen één sessie zonder dismiss = bericht blijft verschijnen (gewenst gedrag volgens spec)
- Browser refresh zonder dismiss = bericht verschijnt opnieuw (gewenst gedrag)

**Implementation Notes**:
- Geen wijziging aan message-modal.js polling logica nodig
- Backend /api/messages/unread doet alle filtering
- Frontend toont wat backend teruggeeft

---

### 3. Multiple Messages Handling

**Question**: Waar filteren: backend of frontend? Hoe omgaan met meerdere "next_time" berichten?

**Decision**: Backend filtert in GET /api/messages/unread endpoint. Alle niet-gedismissede "next_time" berichten worden tegelijk getoond.

**Rationale**:
- **Backend filtering**: Consistent met bestaande trigger types (immediate, page_visit_count)
- **Multiple messages**: Spec vereist dat ALLE actieve "next_time" berichten getoond worden
- **Simpliciteit**: Frontend blijft "dumb display layer"

**Implementation Approach**:
```javascript
// In GET /api/messages/unread endpoint (pseudo-code)
const messages = await pool.query(`
  SELECT DISTINCT m.*
  FROM admin_messages m
  LEFT JOIN message_interactions mi
    ON m.id = mi.message_id AND mi.user_id = $1
  WHERE m.active = TRUE
    AND m.publish_at <= NOW()
    AND (m.expires_at IS NULL OR m.expires_at > NOW())
    AND (
      -- Immediate trigger
      (m.trigger_type = 'immediate' AND mi.dismissed = FALSE)
      OR
      -- Next time trigger (NEW)
      (m.trigger_type = 'next_time' AND (mi.dismissed = FALSE OR mi.message_id IS NULL))
      OR
      -- Page visit count trigger
      (m.trigger_type = 'page_visit_count' AND ...)
    )
`);
```

**Alternatives Considered**:
- **Option A**: Frontend filtering
  - Rejected: Inconsistent met architectuur, meer API roundtrips
- **Option B**: Limit to 1 "next_time" message per page
  - Rejected: Spec expliciet vereist ALLE berichten tonen

---

### 4. Backwards Compatibility

**Question**: Heeft nieuwe trigger_type impact op bestaande triggers?

**Decision**: Geen impact. Nieuwe trigger_type waarde ('next_time') wordt toegevoegd als apart case in backend switch/if logic. Bestaande triggers blijven volledig ongewijzigd.

**Rationale**:
- Database schema: trigger_type VARCHAR(50) heeft ruimte voor nieuwe waarden
- Backend: Additive change - nieuwe case in conditional logic
- Frontend: Nieuwe radio button optie, bestaande opties blijven identiek

**Compatibility Checklist**:
✅ Database: Geen schema wijzigingen (VARCHAR(50) is voldoende)
✅ Backend: Additive logic - geen wijziging aan bestaande trigger cases
✅ Frontend: Extra radio button - bestaande form blijft werken
✅ API: Geen breaking changes aan request/response formats
✅ Testing: Bestaande messages blijven functioneren

**Risk Mitigation**:
- Deploy naar staging first (dev.tickedify.com)
- Manual regression test van bestaande triggers
- Database rollback niet nodig (geen schema changes)

---

### 5. Message Edit Behavior

**Question**: Wat gebeurt er als admin een "next_time" bericht bewerkt?

**Decision**: Users die het origineel al gedismissed hebben zien de update NIET. Users die het nog niet zagen krijgen de update automatisch (omdat er nog geen interaction record is).

**Rationale**:
- Consistent met user feedback in spec clarifications
- Implementeert zich vanzelf: dismiss tracking blijft op message_id level
- Geen extra code nodig voor dit gedrag

**Implementation Detail**:
```sql
-- Message edit: UPDATE admin_messages SET ... WHERE id = $1
-- Interaction records blijven intact:
-- - Users met dismissed=TRUE → zien update niet (gewenst)
-- - Users zonder interaction → zien update wel (gewenst)
-- - Users met dismissed=FALSE maar wel first_shown_at → complex edge case
```

**Edge Case**: User heeft bericht gezien maar niet gedismissed, dan wordt message ge-edit.
- **Current Behavior**: User blijft oude versie zien tot dismiss
- **Acceptable**: Rare edge case, geen extra complexity waard

---

## Technology Stack Confirmation

**Backend**:
- Language: Node.js / JavaScript (ES6+)
- Framework: Express.js
- Database: PostgreSQL via Neon (cloud hosted)
- ORM: Direct pg pool queries (geen ORM framework)

**Frontend**:
- Language: Vanilla JavaScript (geen frameworks)
- Polling: 5-minuut interval via setInterval
- Display: Modal/popup systeem in message-modal.js

**Deployment**:
- Platform: Vercel (serverless)
- Process: Git push → Vercel auto-deploy
- Testing: Manual testing op dev.tickedify.com (staging)

## Implementation Risks

**Low Risk** ✅:
- Simple additive change
- No schema migrations
- Well-understood codebase
- Existing test environment

**Mitigation Strategy**:
1. Deploy to staging first
2. Manual test all acceptance scenarios from spec
3. Regression test existing triggers
4. Monitor production logs post-deployment

## Next Steps

✅ Research complete - all design decisions documented
→ Proceed to Phase 1: Data Model & Contracts generation

---

**Reviewed**: 2025-10-24
**Status**: APPROVED - Ready for Phase 1
