# Project Guidelines

Project: GENIUSONE
Framework: Laravel

## Mandatory GeniusOne UI/UX Consistency Rules

### Layout and Content
- Keep pages clean, compact, and content-focused.
- Display the main page content directly below the page header.
- Avoid redundant headings (e.g., do not display both "Payment Term" and "Master Payment Term" as competing headings for the same page).
- Remove unnecessary summary labels, decorative metrics, and record-count messages such as "records shown" outside the table footer when they do not provide meaningful functionality.
- Do not add explanatory descriptions, statistics, badges, or decorative elements without a clear functional purpose.

### Tables and Pagination
- Always place pagination below the table.
- Keep the entry-count summary and pagination controls in the table footer area.
- Keep search, page-size selection, sorting, and pagination consistently positioned across listing pages.
- Keep page-size / rows selector in the table footer area only with pagination; do not duplicate rows / entries selection above the table.
- Table row numbers in the `No` column must remain sequential regardless of column sorting or sort direction.
- Reuse shared table components and CSS rather than implementing a different table layout for each page.

### Buttons and Icons
- Never duplicate icons within a button.
- The `Add New` button must display only one plus icon.
- Keep icon size, alignment, and stroke style consistent.
- Reuse the existing free, open-source icon library when suitable.
- Do not introduce another icon library without a clear reason.

### Forms
- Keep field labels, inputs, spacing, and action buttons consistent with existing GeniusOne pages.
- Use clear `Save` and `Cancel` actions.
- Avoid redundant back buttons in form headers when a `Cancel` action is available in the form actions.
- Avoid unnecessarily wide forms, excessive empty space, and decorative elements.

### Language and Branding
- All newly created user-facing text must be in English.
- Preserve GeniusOne branding, design tokens, typography, colors, and shared components.
- Reference screenshots define content and workflow, not the visual theme.
