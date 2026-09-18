---
id: BCKLG-1.1
title: Verify richer cards and linked subtasks in the installed board
status: Done
assignee:
  - '@codex'
created_date: '2026-09-18 04:07'
updated_date: '2026-09-18 04:17'
labels:
  - ui
dependencies: []
parent_task_id: BCKLG-1
priority: medium
type: task
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The user wants the board to convey more task context without opening every modal. Use the supplied reference for compact descriptions, labels and progress, with related tasks presented as task-manager rows.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Cards show a short description, labels and a progress bar without a move menu.
- [x] #2 Parent task shows a linked subtask row with title, status, assignee and completion summary.
- [x] #3 Browser verification confirms readable desktop and narrow layouts and preserves editing drafts.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add card previews and progress styles. 2. Resolve child relationships from explicit IDs and numbered task IDs. 3. Render linked subtask rows and task-list styling. 4. Verify components and the installed browser.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Verified rich cards and linked subtask rows in installed BB browser screenshots. SDK provider badges use 14px artwork inside 24px circles; Codex and Claude aliases and two-letter fallback covered by tests. Browser report verifies narrow layout, drag/drop and draft preservation. All 58 tests, typecheck and build pass.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented compact descriptions, labels, checklist progress, structured linked subtasks and SDK assignee logos. Verified through component tests, installed browser inspection and browser interaction report.
<!-- SECTION:FINAL_SUMMARY:END -->
