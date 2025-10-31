# Data Model: Bulk Edit Properties Translation

## Overview
This is a **pure UI translation feature** with no data model changes required.

## Entities
N/A - No database schema changes, no new entities, no modified entities.

## Relationships
N/A - No relationship changes.

## State Transitions
N/A - No state machine changes.

## Validation Rules
N/A - No validation rule changes. Existing validation remains:
- At least one property must be filled (enforced in `collectBulkEditUpdates()`)
- Date must be valid format (enforced by HTML5 date input)
- Time must be positive integer (enforced by HTML5 number input with min="0")

## Data Migration
N/A - No database migration required.

## Rationale
This feature only translates user-facing text elements from Dutch to English. All backend data structures, API contracts, database schemas, and business logic remain unchanged. The translation is purely cosmetic and does not affect data persistence, retrieval, or processing.
