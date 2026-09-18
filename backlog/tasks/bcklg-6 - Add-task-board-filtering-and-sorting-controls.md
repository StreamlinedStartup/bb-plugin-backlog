---
id: BCKLG-6
title: Add task board filtering and sorting controls
status: Done
assignee:
  - '@codex'
created_date: '2026-09-18 05:17'
updated_date: '2026-09-18 06:15'
labels:
  - frontend
  - enhancement
dependencies: []
priority: medium
type: enhancement
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The main task board becomes difficult to scan as the task set grows; users need quick ways to narrow and order visible tasks without losing the board context or existing search and storage-scope behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Users can filter visible tasks by status, priority, assignee, and one or more labels, with the active filter state reflected in the controls.
- [x] #2 Users can sort visible tasks by title, priority, due date, and ordinal, with a deterministic order when values are equal or missing.
- [x] #3 Filtering and sorting compose correctly with the existing task search and storage filters without bypassing or resetting those scopes.
- [x] #4 Controls are responsive across supported board widths, keyboard accessible with visible focus, and provide a reset action that clears the board filters and sorting state.
- [x] #5 Focused automated tests cover each filter, each sort option, composition with search and storage filters, reset behavior, and keyboard-accessible control interaction.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add pure board filter/sort helpers with normalized field access and deterministic tie-breaking.
2. Add responsive, keyboard-accessible board controls for status, priority, assignee, labels, sort, and reset while preserving search and storage scopes.
3. Apply the helpers in Page and add focused unit and interaction tests for every filter/sort, composition, reset, and keyboard behavior.
4. Run the project test, typecheck, and build checks.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented board query helpers and native responsive controls for status, priority, assignee, label, and sort filters. Search, storage, and hide-completed scopes remain applied before the new filters. Added deterministic title/priority/due-date/ordinal ordering with missing values last and ID/path tie-breakers. Added focused helper and keyboard/reset control tests.

Verification: mise run test (68 pass), mise run typecheck (pass), mise run build (pass). Task remains In Progress pending review and any additional Page-level integration coverage.

Refined filter presentation after visual review: replaced tall multi-select boxes with compact disclosure menus, active-count triggers, compact sort control, and denser responsive wrapping aligned with the reference board toolbar. Rebuilt and reloaded the installed path plugin.

Final validation: compact filter menus expose active counts; CSS chevrons are centered with the trigger labels and placed to their right. Keyboard interaction and reset are covered by board-controls-ui.test.tsx. mise run test: 68 passed; mise run typecheck: passed; mise run build: passed; plugin reloaded successfully from /Users/vulture/Projects/bb-plugin-backlog.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Completed board filtering and sorting controls with compact responsive menus, active filter indicators, deterministic sorting, keyboard-accessible reset behavior, and preserved search/storage scope composition. Verified with 68 passing tests, typecheck, build, and plugin reload.
<!-- SECTION:FINAL_SUMMARY:END -->
