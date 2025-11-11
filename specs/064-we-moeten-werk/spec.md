# Feature Specification: Separate Test Environment with Database Isolation

**Feature Branch**: `064-we-moeten-werk`
**Created**: 2025-11-11
**Status**: Ready for Planning
**Input**: User description: "We moeten werk maken van een volledig gescheiden testomgeving. We hebben al dev.tickedify.com, maar die gebruikt dezelfde database als productie en dat is niet veilig. We moeten dus een nieuwe database maken en die koppelen met dev.tickedify.com. Dat mag om te beginnen een lege database zijn, want ik wil in de admin2.html een aantal functies toevoegen met betrekking op de testomgeving:
1. Ik wil met een knop een kopie kunnen maken van de productiedatabase naar de test database. Enkel de structuur. Niet de data.
2. Ik wil een lijst van de gebruikers in de productieomgevin zien en een gebruiker kunnen selecteren en voor die gebruiker alles van productie naar test kopiëren.

Dat is het om te beginnen."

## Execution Flow (main)
```
1. Parse user description from Input
   → SUCCESS: Clear feature request for test environment isolation
2. Extract key concepts from description
   → Actors: Admin user
   → Actions: Copy database schema, copy user data, clear test database, delete users
   → Data: Production database, test database, user data
   → Constraints: No production data by default, selective user copy, no duplicates
3. For each unclear aspect:
   → [RESOLVED] Schema copy includes all: indexes, constraints, sequences, triggers
   → [RESOLVED] User copy includes all related entities (tasks, projects, contexts, tags, planning, etc.)
   → [RESOLVED] Confirmation dialogs required before all operations
   → [RESOLVED] Auto-clear test DB before schema copy
   → [RESOLVED] Separate clear button for test database
   → [RESOLVED] No rollback needed - partial copy acceptable
   → [RESOLVED] Prevent duplicate users + provide delete user function
4. Fill User Scenarios & Testing section
   → SUCCESS: Clear user flows identified and updated
5. Generate Functional Requirements
   → SUCCESS: All requirements clarified and testable
6. Identify Key Entities
   → SUCCESS: Database, User data identified
7. Run Review Checklist
   → SUCCESS: All clarifications resolved
8. Return: SUCCESS (spec ready for planning)
```

---

## Quick Guidelines
- Focus on WHAT users need and WHY
- Avoid HOW to implement (no tech stack, APIs, code structure)
- Written for business stakeholders, not developers

---

## User Scenarios & Testing

### Primary User Story
As an administrator, I need a completely isolated test environment so that I can safely test new features without any risk to production data or affecting live users. The test environment should start empty but allow me to selectively copy database schema and specific user data from production for realistic testing scenarios.

### Acceptance Scenarios

**Infrastructure Setup**

1. **Given** production database exists on hosting platform, **When** admin creates new empty test database, **Then** test database is available with unique connection credentials

2. **Given** test database credentials exist, **When** admin configures dev.tickedify.com deployment with test credentials, **Then** dev.tickedify.com connects exclusively to test database

3. **Given** both databases are configured, **When** system verifies connections, **Then** both production and test databases are accessible independently

**Admin Operations**

4. **Given** admin is logged into admin2.html, **When** admin clicks "Copy Database Schema" button, **Then** system shows confirmation dialog asking to proceed

5. **Given** admin confirms schema copy, **When** operation executes, **Then** test database is cleared completely and receives full schema structure (tables, columns, indexes, constraints, sequences, triggers) from production with zero data rows

6. **Given** admin is logged into admin2.html, **When** admin views user list from production, **Then** system displays all production users with name and email

7. **Given** admin selects a specific user from production list, **When** admin clicks copy button, **Then** system shows confirmation dialog

8. **Given** admin confirms user copy, **When** operation executes, **Then** system copies that user and all related data (tasks, projects, contexts, tags, recurring patterns, daily planning, notifications, preferences) from production to test database

9. **Given** admin attempts to copy user that already exists in test, **When** copy is initiated, **Then** system shows error message preventing duplicate

10. **Given** test database contains users, **When** admin views test database user list in admin2.html, **Then** system displays all test users with delete button per user

11. **Given** admin clicks delete button for test user, **When** admin confirms deletion, **Then** system removes that user and all related data from test database

12. **Given** admin clicks "Clear Test Database" button, **When** admin confirms, **Then** system removes all data from test database (schema remains intact)

13. **Given** admin has copied schema and user data, **When** admin accesses dev.tickedify.com, **Then** application connects to test database and shows copied user's data

### Edge Cases
- What happens when test database already contains data before schema copy? → Auto-cleared with confirmation
- What happens if admin tries to copy user that doesn't exist? → Error message
- What happens if admin tries to copy user that already exists in test? → Error message preventing duplicate
- What happens if database connection fails during copy operation? → Partial copy acceptable, admin can retry
- How does system handle large user datasets during copy? → No progress indication needed initially
- Can admin copy same user multiple times? → No, prevented by duplicate detection

## Requirements

### Functional Requirements

**Database Infrastructure Setup**
- **FR-001**: A new empty test database MUST be created on database hosting platform
- **FR-002**: Test database MUST have its own unique connection credentials (host, database name, username, password)
- **FR-003**: Test database credentials MUST be stored in environment configuration
- **FR-004**: dev.tickedify.com deployment MUST be configured to use test database credentials
- **FR-005**: Production database credentials MUST remain unchanged and used by tickedify.com
- **FR-006**: System MUST be able to verify successful connection to both databases independently

**Database Isolation**
- **FR-007**: System MUST maintain two completely separate database connections: production and test
- **FR-008**: dev.tickedify.com MUST connect exclusively to test database
- **FR-009**: tickedify.com MUST connect exclusively to production database
- **FR-010**: Test database MUST start as empty database with no pre-existing data
- **FR-011**: Operations on test database MUST NOT affect production database in any way

**Schema Copy Functionality**
- **FR-012**: Admin MUST be able to trigger database schema copy via button in admin2.html interface
- **FR-013**: Schema copy MUST show confirmation dialog before execution
- **FR-014**: Schema copy MUST automatically clear all data from test database before copying
- **FR-015**: Schema copy MUST replicate complete table structure including tables, columns, indexes, constraints, sequences, and triggers from production to test database
- **FR-016**: Schema copy MUST NOT copy any data rows
- **FR-017**: Schema copy MUST provide success feedback when complete
- **FR-018**: Schema copy MUST provide clear error message if operation fails

**User Data Copy Functionality**
- **FR-019**: Admin MUST be able to view list of all production users in admin2.html
- **FR-020**: Production user list MUST display user name and email address
- **FR-021**: Admin MUST be able to select one user from production list
- **FR-022**: User copy MUST show confirmation dialog before execution
- **FR-023**: User copy MUST copy complete user data including: user record, tasks, projects, contexts, tags, recurring patterns, daily planning entries, notifications, and user preferences
- **FR-024**: User copy MUST preserve all relationships between copied entities (foreign keys)
- **FR-025**: User copy MUST prevent copying user if that user already exists in test database (error message)
- **FR-026**: User copy MUST provide success feedback when complete
- **FR-027**: User copy MUST provide clear error message if operation fails

**Test Database Management**
- **FR-028**: Admin MUST be able to view list of all users in test database in admin2.html
- **FR-029**: Test user list MUST display user name and email with delete button per user
- **FR-030**: Admin MUST be able to delete individual users from test database
- **FR-031**: User delete MUST show confirmation dialog before execution
- **FR-032**: User delete MUST remove user and all related data from test database
- **FR-033**: Admin MUST be able to clear entire test database via separate button
- **FR-034**: Clear test database MUST show confirmation dialog before execution
- **FR-035**: Clear test database MUST remove all data but preserve schema structure
- **FR-036**: Clear operation MUST provide success feedback when complete

**Safety & Feedback**
- **FR-037**: System MUST show confirmation dialog before all destructive operations (schema copy, user copy, user delete, database clear)
- **FR-038**: System MUST provide success feedback when operations complete successfully
- **FR-039**: System MUST provide clear error messages when operations fail
- **FR-040**: Partial copies are acceptable - system does not need to rollback on failure

**Access Control**
- **FR-041**: All test environment functions MUST only be accessible to admin users
- **FR-042**: Admin2.html interface MUST require admin authentication to access test environment controls

### Key Entities

- **Production Database**: The live database containing real user data that must never be modified by test operations. Source for schema and user data copies.

- **Test Database**: Isolated database for dev.tickedify.com. Starts empty, receives copied schema and selective user data. Can be cleared and reset at any time.

- **User Data Set**: Complete collection of data belonging to one user including:
  - User record (authentication, profile)
  - Tasks (all user's tasks)
  - Projects (user's projects)
  - Contexts (user's contexts)
  - Tags (user's tags)
  - Recurring patterns (task recurrence definitions)
  - Daily planning entries (calendar assignments)
  - Notifications (user's notification history)
  - User preferences (settings, UI state)

- **Database Schema**: Complete database structure including:
  - Tables (table definitions)
  - Columns (column definitions and types)
  - Indexes (performance indexes)
  - Constraints (primary keys, foreign keys, check constraints, unique constraints)
  - Sequences (auto-increment definitions)
  - Triggers (database triggers if any)

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked and resolved (7 clarifications completed)
- [x] User scenarios defined and expanded
- [x] Requirements generated and clarified
- [x] Entities identified and detailed
- [x] Review checklist passed

---

## Clarifications Resolved

1. **Schema copy scope**: ✅ Copy everything including indexes, constraints, sequences, and triggers
2. **User data scope**: ✅ Copy all related entities (tasks, projects, contexts, tags, recurring patterns, daily planning, notifications, preferences)
3. **Confirmation dialogs**: ✅ Show confirmation before all destructive operations
4. **Existing data handling**: ✅ Auto-clear test database before schema copy (with confirmation)
5. **Database reset**: ✅ Provide separate "Clear Test Database" button
6. **Transaction safety**: ✅ No rollback needed - partial copy acceptable, admin can retry
7. **Duplicate prevention**: ✅ Prevent duplicate users + provide delete function for test users

---

## Summary

This feature provides complete test environment isolation with infrastructure setup and four main capabilities:

**Phase 1: Infrastructure Setup**
- Create new empty test database on hosting platform
- Configure dev.tickedify.com to connect to test database
- Verify both database connections work independently

**Phase 2: Admin Management Features**
1. **Copy Schema**: One-click copy of complete database structure from production to test (with auto-clear)
2. **Copy User**: Select and copy individual user with all related data from production to test
3. **Manage Test Users**: View test users and delete individual users when needed
4. **Clear Test DB**: Reset test database to empty state while preserving schema

All operations require confirmation dialogs for safety. Duplicate users are prevented. The test environment provides realistic data for feature testing without any risk to production.
