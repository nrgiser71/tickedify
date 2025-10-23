# Feature Specification: Admin Dashboard v2 (admin2.html)

**Feature Branch**: `018-implementeer-de-volgende`
**Created**: 2025-10-18
**Status**: Draft
**Input**: User description: "Implementeer de volgende lijst in het nieuwe dashboard: 1,2,3,4,5,6,9,10,11,13,17,18,23,24,26,29,30,31,32,41,42,51,52,53,54,55,56,57,66,72,73,81,89,101. Voeg daar ook nog het volgende actie aan toe: aanpassen van de checkout URL's"

## Execution Flow (main)
```
1. Parse user description from Input
   ’ Feature numbers mapped to statistics and actions
2. Extract key concepts from description
   ’ Actors: Admin users
   ’ Actions: View statistics, manage users, configure system, manage database, manage payments
   ’ Data: User data, task data, email data, database metrics, payment configs
   ’ Constraints: Multi-screen interface for clarity
3. For each unclear aspect:
   ’ [RESOLVED: All items mapped to clear requirements]
4. Fill User Scenarios & Testing section
   ’ Admin dashboard access, navigation, data viewing, user management
5. Generate Functional Requirements
   ’ Statistics display, user CRUD, system config, database tools, payment management
6. Identify Key Entities
   ’ Users, Tasks, Email Imports, Database Tables, Payment Configurations, System Settings
7. Run Review Checklist
   ’ No implementation details in requirements
8. Return: SUCCESS (spec ready for planning)
```

---

## ¡ Quick Guidelines
-  Focus on WHAT users need and WHY
- L Avoid HOW to implement (no tech stack, APIs, code structure)
- =e Written for business stakeholders, not developers

---

## User Scenarios & Testing

### Primary User Story
As an admin user, I need a comprehensive dashboard (admin2.html) to monitor system health, manage users, view statistics, configure system settings, perform database operations, and manage payment configurations - all organized across multiple screens for clarity and ease of use.

### Acceptance Scenarios

#### Dashboard Navigation & Statistics
1. **Given** admin is logged into admin2.html, **When** they land on the home screen, **Then** they see key user statistics (total users, active users, new registrations, subscription distribution, trial metrics, user growth graph, recent registrations, inactive users)
2. **Given** admin is on the dashboard, **When** they navigate to task statistics screen, **Then** they see total tasks, task completion rate, tasks created today, and task details
3. **Given** admin is on the dashboard, **When** they navigate to email statistics screen, **Then** they see total imported emails, recent imports, and users with email import enabled
4. **Given** admin is on the dashboard, **When** they navigate to database screen, **Then** they see database size, table sizes, row counts per table
5. **Given** admin is on the dashboard, **When** they navigate to payment screen, **Then** they see total revenue (MRR) and revenue per subscription tier

#### User Management
6. **Given** admin is on user management screen, **When** they search for a user by email/name/ID, **Then** the system displays matching user(s)
7. **Given** admin has found a user, **When** they view user details, **Then** they see complete account information (email, subscription tier, trial status, account type, registration date, last login)
8. **Given** admin is viewing a user, **When** they change subscription tier, **Then** the user's tier is updated and change is logged
9. **Given** admin is viewing a user with active trial, **When** they extend the trial with a custom date, **Then** the trial_end_date is updated
10. **Given** admin is viewing a user, **When** they block the account, **Then** the user cannot login and existing sessions are terminated
11. **Given** admin is viewing a blocked user, **When** they unblock the account, **Then** the user can login again
12. **Given** admin is viewing a user, **When** they delete the account, **Then** system shows warning about data deletion before confirming
13. **Given** admin is viewing a user, **When** they reset the password, **Then** system generates new password and provides it to admin

#### System Configuration
14. **Given** admin is on system settings screen, **When** they update onboarding video URL, **Then** the new URL is saved to system_settings and applies to all new users
15. **Given** admin is on database tools screen, **When** they execute a custom SQL query, **Then** system executes query and displays results (with read-only safety check for non-SELECT queries)
16. **Given** admin is on database tools screen, **When** they trigger database cleanup, **Then** system removes old/orphaned data and reports what was cleaned
17. **Given** admin is on debug tools screen, **When** they view user data inspector for a specific user, **Then** they see all data associated with that user (tasks, planning, settings, subscription)

#### Payment Management
18. **Given** admin is on payment configuration screen, **When** they view payment configurations, **Then** they see all configured checkout URLs and plan details
19. **Given** admin is on payment configuration screen, **When** they edit a checkout URL, **Then** the URL is updated and applied immediately
20. **Given** admin is on security screen, **When** they force logout a user, **Then** all user sessions are invalidated

### Edge Cases
- What happens when admin searches for non-existent user? ’ Display "no results found" message
- What happens when admin tries to delete the only admin account? ’ System prevents deletion with error message
- What happens when admin executes destructive SQL without confirmation? ’ System shows confirmation dialog for non-SELECT queries
- What happens when database cleanup finds no orphaned data? ’ Report "no cleanup needed"
- What happens when admin tries to set invalid trial date (past date)? ’ System validates and shows error
- What happens when payment checkout URL is malformed? ’ System validates URL format before saving
- What happens when admin navigates between screens? ’ Active screen is highlighted, data persists during session

## Requirements

### Functional Requirements

#### Statistics & Monitoring
- **FR-001**: System MUST display total number of registered users
- **FR-002**: System MUST display count of active users (logged in last 7/30 days)
- **FR-003**: System MUST display new user registrations (today/week/month breakdown)
- **FR-004**: System MUST display user distribution by subscription tier (Free/Premium/Enterprise)
- **FR-005**: System MUST display trial conversion rate (trial users who converted to paid)
- **FR-006**: System MUST display count of users with active trials
- **FR-009**: System MUST display user growth over time as a visual graph
- **FR-010**: System MUST display list of 10 most recent registrations
- **FR-011**: System MUST display count of inactive users (>30/60/90 days since last login)
- **FR-013**: System MUST display total task count across all users
- **FR-017**: System MUST display task completion rate (percentage of completed tasks)
- **FR-018**: System MUST display tasks created today/week/month
- **FR-023**: System MUST display total emails imported across all users
- **FR-024**: System MUST display emails imported today/week/month
- **FR-026**: System MUST display count and percentage of users with email import enabled
- **FR-029**: System MUST display total database size in MB/GB
- **FR-030**: System MUST display individual table sizes
- **FR-031**: System MUST display database growth rate (per day/week/month)
- **FR-032**: System MUST display record count for each database table
- **FR-041**: System MUST display Monthly Recurring Revenue (MRR)
- **FR-042**: System MUST display revenue breakdown by subscription tier

#### User Management Actions
- **FR-051**: Admin MUST be able to search for users by email, name, or ID
- **FR-052**: Admin MUST be able to view complete user details (account info, subscription, trial status)
- **FR-053**: Admin MUST be able to change user subscription tier (Free ” Premium ” Enterprise)
- **FR-054**: Admin MUST be able to extend trial period with custom trial_end_date
- **FR-055**: Admin MUST be able to block user accounts (prevent login)
- **FR-056**: Admin MUST be able to delete user accounts with cascade delete warning
- **FR-057**: Admin MUST be able to reset user passwords (admin-initiated reset)

#### System Configuration Actions
- **FR-066**: Admin MUST be able to change onboarding video URL in system settings
- **FR-072**: Admin MUST be able to execute custom SQL queries with read-only safety check
- **FR-073**: Admin MUST be able to trigger database backup manually
- **FR-081**: Admin MUST be able to inspect all data for a specific user (user data inspector)

#### Payment Management Actions
- **FR-089**: Admin MUST be able to view all payment configurations (Mollie checkout URLs)
- **FR-NEW-001**: Admin MUST be able to edit checkout URLs for payment plans
- **FR-101**: Admin MUST be able to force logout users (invalidate sessions)

#### UI/UX Requirements
- **FR-UI-001**: Dashboard MUST be organized into multiple screens for clarity (not one single page)
- **FR-UI-002**: Dashboard MUST have clear navigation between screens
- **FR-UI-003**: Dashboard MUST be accessible at /admin2.html (separate from existing admin.html)
- **FR-UI-004**: Dashboard MUST require admin authentication
- **FR-UI-005**: Dashboard MUST show active screen indicator in navigation
- **FR-UI-006**: Dashboard statistics MUST refresh when screen is loaded
- **FR-UI-007**: Dashboard MUST show loading indicators during data fetch operations
- **FR-UI-008**: Dashboard MUST display error messages when operations fail

#### Security & Safety Requirements
- **FR-SEC-001**: System MUST prevent deletion of the last admin account
- **FR-SEC-002**: System MUST show confirmation dialog for destructive operations (user delete, SQL queries)
- **FR-SEC-003**: System MUST log all admin actions for audit purposes
- **FR-SEC-004**: System MUST validate trial dates (cannot be in past, must be reasonable future date)
- **FR-SEC-005**: System MUST validate checkout URLs before saving
- **FR-SEC-006**: System MUST terminate user sessions when account is blocked

### Key Entities

- **User**: Represents a Tickedify user account with properties: ID, email, name, subscription tier, trial status, trial_end_date, account_type (normal/admin), registration date, last login, active status
- **Task**: Represents a user's task with properties: ID, user_id, title, completion status, creation date, completion date
- **Email Import**: Represents imported emails with properties: ID, user_id, email content, import date, processing status
- **Database Table**: Represents database structure with properties: table name, size in MB, row count, indexes
- **Payment Configuration**: Represents payment plans with properties: plan_id, tier name, checkout_url, price, features, active status
- **System Settings**: Represents global configuration with properties: setting key, setting value, description, last modified
- **Admin Session**: Represents active admin login with properties: session_id, admin_user_id, login time, last activity

---

## Proposed Screen Structure

Based on functional requirements, the dashboard should be organized into these screens:

1. **<à Home Dashboard** - Key metrics overview (FR-001 through FR-006, FR-009, FR-010, FR-011)
2. **=Ê Task Analytics** - Task statistics (FR-013, FR-017, FR-018)
3. **=ç Email Analytics** - Email import statistics (FR-023, FR-024, FR-026)
4. **=¾ Database Monitor** - Database metrics (FR-029, FR-030, FR-031, FR-032)
5. **=° Revenue Dashboard** - Payment and revenue stats (FR-041, FR-042, FR-089)
6. **=e User Management** - Search, view, manage users (FR-051 through FR-057)
7. **™ System Settings** - Configuration tools (FR-066, FR-NEW-001)
8. **=' Database Tools** - SQL queries, backup, cleanup (FR-072, FR-073)
9. **= Debug Tools** - User data inspector (FR-081)
10. **= Security** - Session management (FR-101)

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
- [x] Ambiguities marked (none found)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---

## Notes

- This specification focuses on WHAT the dashboard should do, not HOW to implement it
- The existing admin.html remains untouched - this is a completely new dashboard
- All numbered items from user request have been mapped to functional requirements
- Multi-screen design ensures clarity and ease of use (avoiding overwhelming single-page interface)
- Security and audit logging are critical for admin operations
- All statistics should be real-time or clearly indicate last refresh time
