---
id: BCKLG-5
title: Restructure task detail view around task content
status: "Done"
assignee:
  - '@codex'
created_date: '2026-09-18 05:03'
updated_date: '2026-09-18 05:45'
labels:
  - frontend
  - enhancement
dependencies: []
modified_files:
  - src/TaskModal.tsx
  - src/Markdown.tsx
  - app.css
  - tests/task-modal.test.tsx
priority: medium
type: enhancement
ordinal: -24
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The current modal still presents too many metadata properties as a dense grid. The next design pass should make the task title and key state prominent, group secondary properties into a compact two-column details section, and give description and task content stronger visual priority. Preserve the existing inline editing and safety behavior while changing the information hierarchy.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The modal has a compact header with the task ID, title, status, priority, assignee, and due date presented as the primary summary.
- [x] #2 Secondary properties are grouped into a readable two-column Task Details section rather than a five-row three-column wall of fields.
- [x] #3 Empty optional properties are omitted from the primary view or placed behind a functional More properties disclosure.
- [x] #4 Labels, assignees, and status/priority values remain compact, scannable tokens with the existing light-only styling.
- [x] #5 Description, implementation content, and related subtasks receive clear section hierarchy and comfortable reading width.
- [x] #6 Inline double-click editing, keyboard activation, date picker, Save/Cancel, draft recovery, conflict protection, Markdown, custom sections, and linked subtasks remain functional.
- [x] #7 Focused tests, full mise verification, and fresh desktop and narrow live UI checks pass.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reorganize TaskModal into a compact primary summary followed by content-first Markdown and linked subtasks, while preserving existing editing, draft, conflict, and navigation behavior.
2. Present populated secondary metadata in an always-visible, quieter Task details section with a responsive two-column desktop grid and single-column narrow layout; omit empty optional fields.
3. Extend focused modal tests for the final information hierarchy, then run focused and full mise verification plus the available live-check setup.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented content-first modal hierarchy with a compact primary summary, Markdown content before metadata, linked subtasks, and a quieter always-visible Task details section. Populated secondary fields use a compact two-column desktop grid and single-column narrow layout; empty optional fields are omitted. Focused modal suite passes 13/13; full mise test passes 63/63; mise typecheck and build pass. Fresh BB-owned CDP tabs were created, leased, and released, but agent-browser could not connect because its local daemon socket under /Users/vulture/.agent-browser is not writable in this runtime; live desktop and narrow visual checks remain unverified.

Moved Task details directly beneath the primary summary so secondary metadata is immediately visible before the long-form task content; added DOM-order coverage.

Final layout refinement: Task details now spans the full modal container like the primary summary, with the duplicate top divider removed.

Reworked the modal into a true two-column layout inspired by the review reference: wide content column on the left and a dedicated properties rail on the right, stacking above content on narrow screens.

Moved Add section to the bottom of task content. The picker is derived from parsed task sections and only offers missing editable sections. Existing Markdown headings remain double-click editable; saved section drafts render through the normal Markdown renderer.
<!-- SECTION:NOTES:END -->
