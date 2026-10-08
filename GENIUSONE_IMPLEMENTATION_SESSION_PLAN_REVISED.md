# GENIUSONE --- IMPLEMENTATION SESSION PLAN & AGENT RULES

## 1. Purpose

This document defines the implementation structure for GeniusOne.

The session structure is intentionally separated by responsibility so
that implementation, debugging, revision, and evaluation remain
traceable.

The session numbers are not tied to the example structure previously
discussed. They are organized according to the actual scope and
dependency of the GeniusOne system.

------------------------------------------------------------------------

# 2. Global Development Rules

These rules apply to every session.

1.  Discuss and establish the scope before implementation.
2.  Work only on the responsibility assigned to the current session.
3.  Do not mix unrelated frontend, backend, security, and testing
    responsibilities.
4.  Inspect the existing implementation before making changes.
5.  Preserve approved functionality outside the current scope.
6.  Do not invent requirements.
7.  Do not change business rules without explicit approval.
8.  Do not perform unrelated refactoring.
9.  Do not add features that are not part of the current scope.
10. Evaluate the implementation strictly against the requirements and
    references provided by the user.
11. Small UI and workflow details are still requirements when they are
    visible in the reference or explicitly specified.
12. Search, filtering, pagination, sorting, headers, navigation,
    footers, exports, details, statuses, approvals, and document flows
    must not be omitted merely because they are secondary UI elements.
13. Testing is performed at defined milestone sessions, not after every
    implementation session.
14. A milestone test must cover the sessions belonging to that layer.
15. Later sessions must not be implemented prematurely.
16. All agent prompts, implementation instructions, documentation, and
    reports must use English.
17. When a defect is discovered, identify the responsible layer before
    modifying the system.
18. Revisions must remain within the affected responsibility unless a
    cross-layer change is genuinely required.
19. The agent must stop after completing the assigned session and wait
    for the next instruction.
20. Core UI Principle (Dedicated Full Pages vs No Floating Drawers/Modals):
    GeniusOne is a modern enterprise redesign of SmartOne with 100% data parity.
    All floating pop-up windows and right-side sliding drawers for document details
    and new record creation (e.g. Add Receive Material, Transaction History)
    are replaced by dedicated full-page views with persistent routes:
    - `/pr/detail/:code` (Purchase Request Detail)
    - `/po/detail/:code` (Purchase Order Detail with embedded Audit Log)
    - `/report/detail/:code` (PR–PO Traceability Detail)
    - `/warehouse/detail/:code` (Warehouse BPB Detail)
    - `/warehouse/create` (Add Receive Material Form)
    Document URLs MUST NOT use easily scraped sequential numbering (`details1`, `details2`),
    but instead use slugified business document codes (e.g. `POL-1026-0040`,
    `0026-PR-IMLI-X-2026`, `0138-WHIN-IMLI-G-X-2026`).
    Full-page layouts must adapt element sizing, responsive multi-column KPI grids,
    full-width tables, and embedded ledgers to prevent awkward empty white space.
    All copy, labels, and documentation must remain strictly in English.

------------------------------------------------------------------------

# 3. System Scope

The implementation is divided into four major layers:

`Frontend → Backend → Security → Final Verification`

The frontend layer establishes the visual and interaction foundation.

The backend layer establishes data, business rules, document
relationships, and workflows.

The security layer protects access, requests, data, and application
boundaries.

The final verification layer validates the complete integrated system.

------------------------------------------------------------------------

# 4. Session Structure

## SESSION 1 --- Figma Design Foundation

### Responsibility

Create the approved Figma design foundation before Laravel frontend implementation begins.

### Scope

-   Inspect the provided visual references and raw design direction.
-   Establish the visual design system in Figma.
-   Establish typography and font usage.
-   Establish the approved color palette.
-   Establish spacing and sizing foundations.
-   Establish layout and grid rules.
-   Establish shared header structure.
-   Establish main navigation structure.
-   Establish footer structure.
-   Establish reusable buttons, inputs, dropdowns, tables, badges, and status patterns.
-   Establish shared patterns for PR, PO, combined PR-PO reporting, and Warehouse/BPB.
-   Preserve the functional structure visible in the reference application.
-   Keep the design consistent across all currently approved modules.
-   Do not invent visual elements that are not supported by the provided direction.

### Out of Scope

-   Laravel implementation.
-   Backend business logic.
-   Database implementation.
-   Authentication.
-   Authorization.
-   Security hardening.
-   Functional testing.
## SESSION 2 --- Laravel Frontend Foundation

### Responsibility

Translate the approved Figma design into the Laravel frontend foundation.

### Scope

-   Inspect the existing Laravel project.
-   Establish the frontend page structure.
-   Implement the shared application layout.
-   Implement the main header.
-   Implement the main navigation.
-   Implement the footer.
-   Implement the approved typography.
-   Implement the approved color palette.
-   Implement spacing and sizing foundations.
-   Implement reusable UI patterns from Figma.
-   Implement the basic table structure.
-   Implement the basic form structure.
-   Implement the basic button and status styles.
-   Establish frontend routes/views for PR, PO, combined PR-PO reporting, and Warehouse/BPB.
-   Preserve the approved Figma design.

### Out of Scope

-   Backend business logic.
-   Database implementation.
-   Authentication.
-   Authorization.
-   Security hardening.
-   Final frontend testing.
## SESSION 4 --- Backend Architecture and Data Foundation

### Responsibility

Establish the backend foundation required by the GeniusOne procurement
workflow.

### Scope

-   Inspect the existing backend structure.
-   Establish models.
-   Establish database relationships.
-   Establish migrations.
-   Establish required services or business-logic layers.
-   Establish validation foundations.
-   Establish document relationships.
-   Establish common backend conventions.
-   Establish data structures required by PR, PO, and warehouse/BPB.
-   Prepare the backend for the implementation of business workflows.

### Out of Scope

-   Security hardening.
-   Final testing.
-   New business functionality outside the approved scope.

------------------------------------------------------------------------

## SESSION 5 --- Purchase Request Backend

### Responsibility

Implement the complete backend behavior for Purchase Request.

### Scope

-   PR creation.
-   PR retrieval.
-   PR editing where applicable.
-   PR item handling.
-   PR quantities.
-   PR status.
-   PR approval flow.
-   PR detail data.
-   PR search.
-   PR filtering.
-   PR sorting.
-   PR pagination.
-   PR export data.
-   PR validation.
-   PR relationship to subsequent procurement processes.

### Business Requirement

The PR must provide the source quantity and item information required by
the following procurement workflow.

------------------------------------------------------------------------

## SESSION 6 --- Purchase Order Backend

### Responsibility

Implement the complete backend behavior for Purchase Order.

### Scope

-   PO creation.
-   PO retrieval.
-   PO item handling.
-   Supplier relationship.
-   PO quantities.
-   PO status.
-   Approval status.
-   Receiving status.
-   PO detail.
-   More Details.
-   Item code.
-   Unit.
-   Quantity PO.
-   Quantity received.
-   Remark/description.
-   Facility type.
-   Created information.
-   Search.
-   Filtering.
-   Date range.
-   Sorting.
-   Pagination.
-   Export to Excel.
-   PR-to-PO relationship.

### Outstanding Rule

Outstanding means the required quantity has not been fully fulfilled.

Example:

Required quantity = 3 pieces.

Fulfilled quantity = 2 pieces.

Outstanding quantity = 1 piece.

Therefore, the document remains Outstanding until the required quantity
is fully fulfilled.

A fully fulfilled quantity becomes Complete.

------------------------------------------------------------------------

## SESSION 7 --- Approval and Procurement Workflow

### Responsibility

Implement document approval and the procurement workflow connecting PR,
PO, and warehouse processing.

### Scope

-   PR approval.
-   PO approval.
-   Approval states.
-   Approval transitions.
-   Approved PO availability for warehouse processing.
-   Document status transitions.
-   Quantity transitions.
-   Outstanding-to-Complete transitions.
-   Document references.
-   Procurement-to-warehouse transition.

### Core Workflow

`PR → PR Approval → PO → PO Approval → Warehouse/BPB`

The workflow must preserve the business sequence shown by the reference
application.

------------------------------------------------------------------------

## SESSION 8 --- Combined PR-PO Reporting Backend

### Responsibility

Implement the backend behavior for the combined Purchase Request and Purchase Order report.

### Scope

-   PR-to-PO reporting relationship.
-   PR and PO creation-date ranges.
-   Supplier filtering.
-   Item Material filtering.
-   Overall status filtering.
-   PO status filtering.
-   PR status filtering.
-   Facility filtering.
-   Section filtering.
-   Search.
-   Sorting.
-   Pagination.
-   Outstanding and Complete reporting.
-   BPB-related quantity visibility where applicable.
-   Material code.
-   Qty PR.
-   Qty PO.
-   Qty BPB.
-   Outstanding quantity.
-   Currency.
-   Price.
-   Total PPn.
-   Total PPh.
-   Additional cost.
-   Subtotal.
-   DN Number.
-   Type BC.
-   Facility / Non Facility.
-   Aju Number.
-   SPPB Number.
-   Description.
-   Export to Excel.
-   Preserve the relationship between the report and source PR/PO data.

### Business Requirement

The combined report must represent the procurement relationship between PR and PO and must reflect the actual fulfillment state.

Outstanding must remain based on an unfulfilled required quantity.

------------------------------------------------------------------------

## SESSION 9 --- Warehouse / BPB Backend

### Responsibility

Implement the backend functionality for Receive Material / BPB.

### Scope

-   Receive Material records.
-   RN relationship.
-   PO relationship.
-   Supplier relationship.
-   BPB Type.
-   Document Type.
-   Approval status.
-   Receive Date.
-   Item Material.
-   Job Number.
-   PO Number.
-   Delivery Note.
-   Receive Quantity.
-   Warehouse Location.
-   Remark.
-   Detail Receive Material.
-   Approval handling.
-   Search.
-   Filtering.
-   Date range.
-   Sorting.
-   Pagination.
-   Export to Excel.
-   Print PDF data.
-   Relationship back to PO.

### Business Relationship

Once an approved PO reaches the warehouse process, receiving/BPB data
must be associated with the relevant PO and item quantities.

------------------------------------------------------------------------

## SESSION 10 --- Backend Integration and Backend Milestone Test

### Responsibility

Integrate and stabilize the complete backend workflow.

### Scope

-   Integrate PR and PO.
-   Integrate PO approval.
-   Integrate PO with warehouse/BPB.
-   Verify document relationships.
-   Verify quantity propagation.
-   Verify Outstanding logic.
-   Verify Complete logic.
-   Verify status transitions.
-   Verify approval transitions.
-   Verify detail relationships.
-   Verify search/filter/pagination data behavior.
-   Verify export data.
-   Fix backend integration defects.

### Backend Milestone Test

Perform the backend test once after Sessions 3--7.

No formal backend milestone test is required after Sessions 4--9
individually.

------------------------------------------------------------------------

# 6. Security Implementation

## SESSION 11 --- Authentication and Authorization

### Responsibility

Protect application access and define user permissions.

### Scope

-   Authentication.
-   Login/session handling.
-   Authorization.
-   User roles.
-   Permission boundaries.
-   Protected routes.
-   Protected backend operations.
-   Access restrictions between relevant modules.
-   Unauthorized access handling.

------------------------------------------------------------------------

## SESSION 12 --- Application and Data Security

### Responsibility

Secure application inputs, requests, data access, and sensitive
information.

### Scope

-   Request validation.
-   Input validation.
-   Mass-assignment protection.
-   Query safety.
-   Database access protection.
-   File upload validation where applicable.
-   Export security.
-   Sensitive configuration handling.
-   Secret handling.
-   Error exposure.
-   Sensitive information exposure.
-   Data integrity protection.
-   Common Laravel/application security weaknesses.

------------------------------------------------------------------------

## SESSION 13 --- Security Review and Security Milestone Test

### Responsibility

Review and stabilize the complete security layer.

### Scope

-   Review authentication.
-   Review authorization.
-   Review protected routes.
-   Review permission boundaries.
-   Review request validation.
-   Review input handling.
-   Review database access.
-   Review file handling.
-   Review sensitive information exposure.
-   Fix discovered security defects.

### Security Milestone Test

Perform the security test once after Sessions 11--12.

No formal security milestone test is required after Sessions 11--12.

------------------------------------------------------------------------

# 7. Final Verification

## SESSION 14 --- Full End-to-End Testing

### Responsibility

Validate the complete GeniusOne system after frontend, backend, and
security implementation are complete.

### Scope

### Frontend

-   Header.
-   Navigation.
-   Footer.
-   Search.
-   Filters.
-   Date range.
-   Dropdowns.
-   Sorting.
-   Pagination.
-   Tables.
-   Horizontal scrolling.
-   Detail pages.
-   More Details.
-   Status badges.
-   Approval indicators.
-   Export buttons.
-   Print interfaces.

### PR

-   PR creation.
-   PR item data.
-   PR quantity.
-   PR approval.
-   PR status.
-   PR search/filter/pagination.
-   PR details.
-   PR-to-PO transition.

### Combined PR-PO Reporting

-   Combined PR-PO reporting.
-   PR and PO date ranges.
-   Supplier.
-   Item Material.
-   Overall status.
-   PO status.
-   PR status.
-   Facility.
-   Section.
-   Search/filter/sorting/pagination.
-   Outstanding and Complete reporting.
-   Quantity and fulfillment data.
-   Material code.
-   Currency and price.
-   Tax and cost fields.
-   Document references.
-   Export.

### PO

-   PO creation.
-   PO item data.
-   Supplier.
-   Quantity.
-   Approval.
-   Receiving status.
-   Outstanding.
-   Complete.
-   More Details.
-   Item code.
-   Unit.
-   Remark.
-   Facility type.
-   Search/filter/pagination.
-   Export.

### Warehouse / BPB

-   Receive Material.
-   RN.
-   PO relationship.
-   Supplier.
-   BPB Type.
-   Document Type.
-   Approval.
-   Receive Date.
-   Item data.
-   Quantity.
-   Warehouse Location.
-   Detail Receive Material.
-   Export.
-   Print PDF.

### Security

-   Authentication.
-   Authorization.
-   Protected routes.
-   Permission boundaries.
-   Request validation.
-   Data protection.

### End-to-End Business Flow

`PR → PR Approval → PO → PO Approval → Warehouse/BPB → Receiving`

### Final Rule

The final testing session is for finding and fixing defects against
approved requirements.

Do not introduce new features during final testing unless explicitly
requested.

------------------------------------------------------------------------

# 8. Testing Strategy

Testing is milestone-based.



  Layer         Sessions   Testing
  ------------- ---------- ------------
  Frontend      1--3       Session 3
  Backend       4--9       Session 10
  Security      11--12     Session 13
  Full System   1--13      Session 14

Testing must not be repeated after every implementation session unless
explicitly requested.

------------------------------------------------------------------------

# 9. Defect Ownership

When an issue is found, classify it before making changes.

### Frontend Issue

Examples:

-   Incorrect spacing.
-   Wrong color.
-   Incorrect typography.
-   Broken layout.
-   Missing button.
-   Incorrect dropdown appearance.
-   Pagination UI problem.
-   Table presentation problem.

Responsible layer: Frontend.

### Backend Issue

Examples:

-   Incorrect calculation.
-   Incorrect quantity.
-   Incorrect status transition.
-   Incorrect database relationship.
-   Incorrect filter result.
-   Incorrect export data.
-   Incorrect workflow behavior.

Responsible layer: Backend.

### Security Issue

Examples:

-   Unauthorized access.
-   Missing permission checks.
-   Unsafe input handling.
-   Sensitive information exposure.
-   Unsafe database operation.

Responsible layer: Security.

### Integration Issue

If a defect crosses multiple layers, identify the root cause first.

Do not automatically modify both layers.

------------------------------------------------------------------------

# 10. Reference Fidelity

The reference application must be treated as a functional and visual
reference.

Small details must be preserved when applicable, including:

-   Search.
-   Filters.
-   Date ranges.
-   Dropdown search.
-   Sorting.
-   Pagination.
-   Horizontal scrolling.
-   Header.
-   Navigation.
-   Footer.
-   Export to Excel.
-   Print PDF.
-   Detail.
-   More Details.
-   Status.
-   Approval.
-   Quantity.
-   Outstanding.
-   Complete.
-   Item code.
-   Unit.
-   Remark.
-   Supplier.
-   Facility type.
-   Created information.
-   Document relationships.
-   PR-to-PO flow.
-   PO-to-BPB flow.

These are part of the expected implementation and must not be dismissed
as secondary details.

------------------------------------------------------------------------

# 11. Agent Execution Protocol

At the beginning of every session, the agent must:

1.  Read this document.
2.  Identify the current session.
3.  Read the requirements assigned to that session.
4.  Inspect the existing implementation.
5.  Identify dependencies on previously completed sessions.
6.  Implement only the current session's scope.
7.  Preserve previously approved functionality.
8.  Avoid unrelated refactoring.
9.  Avoid adding unrequested features.
10. Report the implementation result.
11. Identify blockers if any.
12. Stop and wait for the next session instruction.

------------------------------------------------------------------------

# 12. Revision Protocol

When the user requests a revision:

1.  Identify the affected session responsibility.
2.  Identify whether the issue is frontend, backend, security, or
    integration-related.
3.  Modify only the necessary layer.
4.  Preserve previously approved functionality.
5.  Re-check the requirement that caused the revision.
6.  Do not use the revision as an opportunity to redesign unrelated
    functionality.
7.  Do not introduce new requirements without explicit approval.

------------------------------------------------------------------------

# 13. Session Summary



  Session   Layer      Responsibility                           Test
  --------- ---------- -------------------------------------- -------------------
  1         Frontend   Figma design foundation                No
  2         Frontend   Laravel frontend foundation            No
  3         Frontend   Frontend completion                    **Frontend test**
  4         Backend    Architecture and data foundation       No
  5         Backend    PR backend                             No
  6         Backend    PO backend                             No
  7         Backend    Approval and procurement workflow      No
  8         Backend    Combined PR-PO reporting backend       No
  9         Backend    Warehouse / BPB backend                No
  10        Backend    Backend integration                    **Backend test**
  11        Security   Authentication and authorization       No
  12        Security   Application and data security           No
  13        Security   Security review                         **Security test**
  14        Final      Full end-to-end testing                 **Final test**

------------------------------------------------------------------------

# 14. Final Implementation Principle

The project must be developed in controlled layers:

`Frontend → Backend → Security → Final Verification`

The objective is not to maximize the number of sessions.

The objective is to ensure that every session has a clear
responsibility, a clear boundary, and a clear owner when something needs
to be revised.

A session may contain multiple related tasks when they belong to the
same layer and responsibility.

Unrelated responsibilities must remain separated.
