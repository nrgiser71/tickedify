# Feature Specification: Revenue Dashboard Detail View

**Feature Branch**: `066-in-het-admin2`
**Created**: 2025-11-14
**Status**: Draft
**Input**: User description: "In het Admin2 scherm is er een revenue dashboard met daarin een aantal vakken in verband met de opbrengst. Bij elk van die vakken moet er een mogelijkheid zijn om de details te tonen. Bouw dat in."

## Execution Flow (main)
```
1. Parse user description from Input
   ’ Feature identified: Add detail views to revenue dashboard stat cards
2. Extract key concepts from description
   ’ Actors: Admin users
   ’ Actions: Click/view details for revenue metrics
   ’ Data: Subscription data, revenue breakdowns, user lists
   ’ Constraints: Must work with existing revenue dashboard
3. For each unclear aspect:
   ’ [NEEDS CLARIFICATION: What specific details should each card show?]
   ’ [NEEDS CLARIFICATION: Should details open as modal, side panel, or inline expansion?]
   ’ [NEEDS CLARIFICATION: Should user lists be paginated? If so, how many per page?]
   ’ [NEEDS CLARIFICATION: What actions should be available in detail views?]
4. Fill User Scenarios & Testing section
   ’ Primary flow: Admin clicks stat card ’ sees detailed breakdown
5. Generate Functional Requirements
   ’ Each requirement must be testable
   ’ Mark ambiguous requirements
6. Identify Key Entities (if data involved)
   ’ Revenue metrics, subscription data, user details
7. Run Review Checklist
   ’ WARN "Spec has uncertainties - see clarification markers"
8. Return: SUCCESS (spec ready for planning after clarifications)
```

---

## ¡ Quick Guidelines
-  Focus on WHAT users need and WHY
- L Avoid HOW to implement (no tech stack, APIs, code structure)
- =e Written for business stakeholders, not developers

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As an admin user, I want to click on any revenue metric card in the Admin2 Revenue Dashboard and see detailed information about that metric, so I can better understand the composition of revenue, identify trends, and take informed business decisions.

### Acceptance Scenarios

1. **Given** I am viewing the Revenue Dashboard in Admin2, **When** I click on the "Monthly Recurring Revenue" card, **Then** I see a detailed breakdown showing [NEEDS CLARIFICATION: MRR by plan type? MRR trend over time? Individual subscription contributions?]

2. **Given** I am viewing the Revenue Dashboard in Admin2, **When** I click on the "Active Subscriptions" card, **Then** I see a list of all active paying customers with [NEEDS CLARIFICATION: which user details? email, plan, start date, amount?]

3. **Given** I am viewing the Revenue Dashboard in Admin2, **When** I click on the "Premium Revenue" card, **Then** I see [NEEDS CLARIFICATION: list of Premium users? MRR breakdown by monthly/yearly? trend data?]

4. **Given** I am viewing the Revenue Dashboard in Admin2, **When** I click on the "Enterprise Revenue" card, **Then** I see [NEEDS CLARIFICATION: similar to Premium - specify exact details needed]

5. **Given** I am viewing the Revenue Dashboard in Admin2, **When** I click on the "Free Tier Revenue" card, **Then** [NEEDS CLARIFICATION: what to show? Free users don't generate revenue - show user count? conversion opportunities?]

6. **Given** I am viewing detail information for a revenue card, **When** I want to return to the dashboard overview, **Then** I can easily close/exit the detail view

7. **Given** a detail view contains a long list of users (e.g., 100+ subscriptions), **When** I view the details, **Then** [NEEDS CLARIFICATION: is the list paginated? scrollable? limited to top N?]

### Edge Cases
- What happens when a revenue metric has zero value? (e.g., no Enterprise subscriptions yet)
- What happens when detail data is still loading?
- What if a user in the detail list has incomplete data?
- How are trial users handled in "Active Subscriptions"? Are they included or excluded?
- How are cancelled subscriptions shown? (if at all in detail views)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a clickable interaction on each of the 5 revenue stat cards in the Revenue Dashboard
- **FR-002**: System MUST display detailed information when an admin clicks on "Monthly Recurring Revenue" card showing [NEEDS CLARIFICATION: specify exact details - breakdown by plan? trend? individual amounts?]
- **FR-003**: System MUST display detailed information when an admin clicks on "Active Subscriptions" card showing a list of paying customers with [NEEDS CLARIFICATION: specify which fields - email, name, plan, amount, start date?]
- **FR-004**: System MUST display detailed information when an admin clicks on "Premium Revenue" card showing [NEEDS CLARIFICATION: specify details]
- **FR-005**: System MUST display detailed information when an admin clicks on "Enterprise Revenue" card showing [NEEDS CLARIFICATION: specify details]
- **FR-006**: System MUST [NEEDS CLARIFICATION: handle "Free Tier Revenue" card - what to show for free users?]
- **FR-007**: System MUST provide a clear way to close/exit the detail view and return to the dashboard overview
- **FR-008**: System MUST indicate loading state while detail data is being fetched
- **FR-009**: System MUST handle empty states gracefully (e.g., "No Enterprise subscriptions yet")
- **FR-010**: Detail views MUST show real-time data from the database (not cached)
- **FR-011**: Detail views MUST respect admin authentication (only accessible by logged-in admin users)
- **FR-012**: System MUST [NEEDS CLARIFICATION: display format - modal popup? side panel? inline expansion below card?]
- **FR-013**: For detail views with user lists, system MUST [NEEDS CLARIFICATION: pagination strategy? how many items per page?]
- **FR-014**: Detail views MUST show [NEEDS CLARIFICATION: what actions are available? view user details? export data? filter/sort?]

### Key Entities *(include if feature involves data)*

- **Revenue Metric**: Represents aggregate revenue data (MRR, Active Subscriptions count, revenue by tier)
  - Attributes: metric type, current value, calculation period
  - Derived from: active subscription records

- **Subscription Detail**: Individual subscription contributing to revenue metrics
  - Attributes: [NEEDS CLARIFICATION: user email? name? plan type? billing cycle? amount? start date? status?]
  - Related to: User accounts in the system

- **Revenue Breakdown**: Detailed composition of a revenue metric
  - Attributes: [NEEDS CLARIFICATION: by plan type? by billing cycle (monthly/yearly)? by time period?]
  - Aggregated from: subscription details

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain *(BLOCKED: 13 clarifications needed)*
- [ ] Requirements are testable and unambiguous *(BLOCKED: depends on clarifications)*
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [ ] Dependencies and assumptions identified *(PARTIAL: need to clarify UI approach)*

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (13 clarification points)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [ ] Review checklist passed *(BLOCKED: pending clarifications)*

---

## Notes for Planning Phase

Once clarifications are provided, the planning phase should consider:

1. **UI/UX Approach**: Whether to use modal dialogs, slide-out panels, or inline expansions for detail views
2. **Data Volume**: How to handle potentially large lists (100+ subscriptions) efficiently
3. **Real-time Updates**: Whether detail views need to refresh automatically or manually
4. **Export Capability**: If admins need to export detail data (CSV, PDF, etc.)
5. **Filtering/Sorting**: Whether detail lists should support sorting by date, amount, plan, etc.

## Current Revenue Dashboard Structure

The existing Revenue Dashboard contains:
- **Stats Grid 1**: MRR and Active Subscriptions
- **Stats Grid 2**: Free Tier Revenue, Premium Revenue, Enterprise Revenue

Each card currently shows:
- Icon and label
- Main value (stat-value)
- Subtext (additional context)

The detail views should enhance these cards without disrupting the existing layout.
