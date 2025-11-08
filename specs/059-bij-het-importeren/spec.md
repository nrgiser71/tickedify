# Feature Specification: Email Import Attachment Syntax Flexibility

**Feature Branch**: `059-bij-het-importeren`
**Created**: 2025-11-08
**Status**: Ready for Planning
**Input**: User description: "Bij het importeren van emails ondersteunen we een bepaalde systax om de gebruiker toe te laten instructies mee te geven met een email. E�n van die instructies is "a:" om te zeggen dat er een bijlage moet verwerkt worden. Na de dubbelpunt moeten ze naam of een deel van de naam meegeven om aan te geven welke bijlage. Het is dus niet mogelijk om gewoon "a;" zonder een naam. Dat moet wel kunnen, want soms is er maar 1 bijlage en is het niet nodig om een naam mee te geven. Dus het dubbelpunt en tekst moeten niet meer verplicht zijn. Begrijp je?"

## Execution Flow (main)
```
1. Parse user description from Input
   � Description is clear: make attachment name optional in @t syntax
2. Extract key concepts from description
   � Actor: User sending email with attachments
   � Action: Include attachment using simplified syntax
   � Data: Email attachments
   � Constraint: Single attachment scenario should not require filename
3. For each unclear aspect:
   � No major ambiguities - clear enhancement request
4. Fill User Scenarios & Testing section
   � Primary flow: User sends email with single attachment using "a;" syntax
   � Edge case: Multiple attachments with "a;" syntax
5. Generate Functional Requirements
   � Each requirement is testable
6. Identify Key Entities
   � Attachments, Email, Task
7. Run Review Checklist
   � No technical details included
   � All requirements testable
8. Return: SUCCESS (spec ready for planning)
```

---

## � Quick Guidelines
-  Focus on WHAT users need and WHY
- L Avoid HOW to implement (no tech stack, APIs, code structure)
- =e Written for business stakeholders, not developers

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
Een gebruiker wil een email versturen naar Tickedify met ��n bijlage (bijvoorbeeld een factuur of document). Ze willen de bijlage automatisch laten verwerken zonder de bestandsnaam te hoeven specificeren in de @t syntax, omdat er toch maar ��n bijlage is.

**Huidige situatie**: Gebruiker moet `@t a: factuur.pdf;` schrijven
**Gewenste situatie**: Gebruiker kan `@t a;` schrijven als er maar ��n bijlage is

### Acceptance Scenarios

1. **Given** een email met ��n bijlage en @t instructie `a;`
   **When** de email wordt ge�mporteerd
   **Then** de bijlage wordt automatisch verwerkt en gekoppeld aan de taak

2. **Given** een email met ��n bijlage en @t instructie `a: document.pdf;`
   **When** de email wordt ge�mporteerd
   **Then** de bijlage met naam "document.pdf" wordt verwerkt (backwards compatible)

3. **Given** een email met meerdere bijlagen (bijvoorbeeld 3 PDF bestanden) en @t instructie `a;`
   **When** de email wordt ge�mporteerd
   **Then** de eerste bijlage wordt automatisch verwerkt en gekoppeld aan de taak

4. **Given** een email met meerdere bijlagen en @t instructie `a: factuur;`
   **When** de email wordt ge�mporteerd
   **Then** de bijlage waarvan de naam "factuur" bevat wordt verwerkt (bestaand gedrag blijft behouden)

5. **Given** een email zonder bijlagen en @t instructie `a;`
   **When** de email wordt ge�mporteerd
   **Then** de instructie wordt stilletjes genegeerd en de taak wordt normaal aangemaakt (consistent met bestaande @t error tolerance)

### Edge Cases
- **Multiple attachments with `a;` syntax**: De eerste bijlage wordt automatisch verwerkt
- **No attachments with `a;` syntax**: De instructie wordt stilletjes genegeerd (geen error)
- **Whitespace variations**: `a:` en `a: ` (met spatie maar geen tekst) worden behandeld als `a;`
- **Case sensitivity**: `A;` en `a;` zijn equivalent (consistent met bestaande @t case-insensitive gedrag)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept `a;` syntax without a filename in @t email instructions
- **FR-002**: System MUST process the attachment when `a;` is used and exactly one attachment is present
- **FR-003**: System MUST remain backwards compatible with existing `a: filename;` syntax
- **FR-004**: System MUST handle `a: filename;` syntax identically to current behavior (partial name matching)
- **FR-005**: System MUST treat `a:` and `a: ` (colon without text or only whitespace) identically to `a;` for user convenience
- **FR-006**: System MUST process only the first attachment when `a;` is used with multiple attachments present
- **FR-007**: System MUST silently ignore the `a;` instruction when no attachments are present (consistent with existing @t error tolerance)
- **FR-008**: System MUST maintain case-insensitive matching for attachment codes (consistent with existing @t syntax behavior)

### Key Entities

- **Attachment**: Represents a file attached to an email
  - Has a filename
  - Has content (file data)
  - Can be associated with a task

- **Email**: Contains the @t instruction syntax
  - May have zero, one, or multiple attachments
  - Contains parsed @t instructions including attachment directives

- **Task**: The task being created from the email
  - Can have attachments linked to it
  - Created based on email content and @t instructions

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
- [x] Ambiguities resolved with defaults
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---

## Design Decisions

The following decisions were made to ensure consistency with existing @t syntax behavior:

1. **Multiple attachments with `a;`**: Process only the first attachment automatically
   - Rationale: Predictable, simple behavior; users can use `a: filename;` for specific attachments

2. **No attachments with `a;`**: Silently ignore the instruction
   - Rationale: Consistent with existing @t error tolerance (invalid codes don't crash task creation)

3. **Whitespace equivalence**: Treat `a:`, `a: `, and `a;` identically
   - Rationale: User-friendly; prevents confusion from accidental whitespace
