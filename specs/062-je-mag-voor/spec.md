# Feature Specification: Page Help Icons with Admin-Configurable Content

**Feature Branch**: `062-je-mag-voor`
**Created**: 2025-11-09
**Status**: Ready for Planning
**Input**: User description: "Je mag voor elke pagina, behalve CSV Import en Settings, naast de titel van de pagina een help icoontje zetten. Als je op dat icoontje klikt moet er een markdown bericht getoond worden met uitleg over de pagina. Dit mag in dezelfde stijl als de berichten van het type information. Elk van deze informatieberichten wil ik in admin2.html kunnen instellen. Op die pagina zal er dus in het menu aan de linker kant een nieuw item moeten bijkomen. Als je nog vragen hebt mag je ze stellen."

## Execution Flow (main)
```
1. Parse user description from Input
   → Feature adds help icons to page titles with admin-configurable markdown content
2. Extract key concepts from description
   → Actors: End users (viewing help), Admin users (configuring help)
   → Actions: View help icon, click icon, display markdown, configure content
   → Data: Help content per page (markdown format)
   → Constraints: Exclude CSV Import and Settings pages
3. For each unclear aspect:
   → [RESOLVED: All aspects sufficiently clear for initial spec]
4. Fill User Scenarios & Testing section
   → User flow: Click help icon → View formatted help content
   → Admin flow: Navigate to admin section → Edit help content → Save
5. Generate Functional Requirements
   → Each requirement is testable
6. Identify Key Entities
   → Help Content entity with page identifier and markdown text
7. Run Review Checklist
   → No implementation details included
   → Spec focuses on user needs
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## User Scenarios & Testing

### Primary User Story

**As an end user**, I want to see a help icon next to page titles so that I can quickly understand what each page is for and how to use it, without leaving the page.

**As an admin user**, I want to configure the help content for each page so that I can provide relevant, up-to-date guidance to users without requiring code changes.

### Acceptance Scenarios

1. **Given** I am viewing any page except CSV Import or Settings, **When** I look at the page title, **Then** I see a help icon next to the title

2. **Given** I am on a page with a help icon, **When** I click the help icon, **Then** I see a formatted information message displaying the help content for that page

3. **Given** I am an admin user viewing the admin dashboard, **When** I navigate to the menu, **Then** I see a "Page Help" option in the left sidebar

4. **Given** I am in the Page Help admin section, **When** I select a page, **Then** I see the current help content for that page in markdown format

5. **Given** I am editing help content for a page, **When** I save my changes, **Then** the updated content is immediately available when users click the help icon on that page

6. **Given** I am viewing help content, **When** the content contains markdown formatting, **Then** the formatting is properly rendered (headings, lists, links, bold, italic, etc.)

### Edge Cases

- What happens when no help content has been configured for a page yet? **RESOLVED**: Default content will be provided during implementation and is editable via admin2
- What happens when help content is very long? **RESOLVED**: Popup will have scrollable area without character limit
- Can help content contain images or only text formatting? **RESOLVED**: Text formatting only (same as existing information messages)
- What happens if admin deletes all help content for a page? **RESOLVED**: Show empty popup

## Requirements

### Functional Requirements

- **FR-001**: System MUST display a help icon next to the page title on all pages except CSV Import and Settings pages

- **FR-002**: System MUST show formatted help content when users click the help icon

- **FR-003**: System MUST render help content as markdown, supporting standard markdown formatting (headings, lists, bold, italic, links)

- **FR-004**: System MUST display help content in the same visual style as existing information messages

- **FR-005**: System MUST provide an admin interface section for managing page help content

- **FR-006**: Admin interface MUST include a new menu item in the left sidebar for accessing page help management

- **FR-007**: Admin interface MUST allow selection of pages to configure help content for

- **FR-008**: Admin interface MUST allow editing of help content in markdown format for each page

- **FR-009**: System MUST persist help content changes made by admins

- **FR-010**: System MUST make updated help content immediately available to end users after admin saves changes

- **FR-011**: System MUST identify each page uniquely to associate help content correctly using internal page identifiers (based on active view)

- **FR-012**: System MUST provide default help content for all eligible pages during implementation

- **FR-013**: System MUST display popup with scrollable area when help content exceeds visible space

- **FR-014**: System MUST show empty popup when admin has deleted all help content for a page

- **FR-015**: System MUST support same markdown formatting as existing information messages (headings, lists, bold, italic, links) without image support

### Key Entities

- **Page Help Content**: Represents help information for a specific page, containing:
  - Page identifier (to determine which page the help belongs to)
  - Markdown content (the actual help text)
  - Last modified timestamp (to track when content was updated)
  - Modified by user (to track who made changes)

- **Page**: Represents a page in the application that can have help content, characterized by:
  - Page identifier/name
  - Page title (where help icon appears)
  - Eligibility for help icon (excludes CSV Import and Settings)

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

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
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities resolved through user clarification
- [x] User scenarios defined
- [x] Requirements generated (15 functional requirements)
- [x] Entities identified
- [x] Review checklist passed

---

## User Clarifications (Resolved)

1. **Default behavior**: Default help content will be provided during implementation, editable via admin2
2. **Content length handling**: Scrollable area without character limit
3. **Media support**: Text formatting only (same as existing information messages)
4. **Page identification**: Internal page identifiers based on active view (SPA consideration)
5. **Empty content handling**: Show empty popup when all content is deleted

---

**Status**: ✅ Ready for `/plan` phase
