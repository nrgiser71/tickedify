# API Contracts

**Feature**: Filter Persistentie Fix voor Herhalende Taken
**Date**: 2025-11-03

## Overview

Deze bug fix vereist **GEEN nieuwe API endpoints** en **GEEN API contract wijzigingen**.

Dit is een pure frontend fix die alleen de timing van de `filterPlanningActies()` call aanpast in de bestaande `completePlanningTask()` flow.

## Existing API Endpoints (Unchanged)

De fix interacteert met bestaande endpoints maar wijzigt ze niet:

### GET /api/taak/:id
Wordt gebruikt om nieuwe herhalende taak op te halen na creatie (regel 10748).
- **No changes** - bestaande implementatie blijft ongewijzigd

### PUT /api/taak/:id
Wordt gebruikt om taak af te vinken (regel 10712: `verplaatsTaakNaarAfgewerkt`).
- **No changes** - bestaande implementatie blijft ongewijzigd

### GET /api/dagelijkse-planning/:date
Wordt gebruikt om planning data te refreshen (regel 10792).
- **No changes** - bestaande implementatie blijft ongewijzigd

### GET /api/ingeplande-acties/:date
Wordt gebruikt om ingeplande acties op te halen (regel 10774).
- **No changes** - bestaande implementatie blijft ongewijzigd

## Contract Tests

**No contract tests needed** omdat er geen API changes zijn.

De bestaande contract tests voor bovenstaande endpoints blijven geldig en ongewijzigd.

## Integration Points

**Frontend ↔ Backend**:
- Frontend roept bestaande endpoints aan in bestaande volgorde
- Response formats blijven ongewijzigd
- Error handling blijft ongewijzigd

**Testing Focus**:
- UI state management (filter persistence)
- DOM manipulation timing
- Browser automation via Playwright

## Conclusion

Geen API contracts of contract tests vereist voor deze frontend-only bug fix.
