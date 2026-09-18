---
id: BCKLG-4
title: Add inline task field editing and date picker
status: Done
assignee:
  - '@codex'
created_date: '2026-09-18 04:45'
updated_date: '2026-09-18 04:49'
labels:
  - frontend
  - enhancement
dependencies: []
modified_files:
  - src/TaskModal.tsx
  - app.css
  - tests/task-modal.test.tsx
priority: medium
type: enhancement
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The refined modal now uses double-click correctly, but the active editor still appears in a distant shared editor area. Editing should happen at the point of interaction so the draft, conflict message, and Save/Cancel controls remain associated with the selected property. Date fields should use a native date picker.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Double-clicking the task title or an editable property opens its editor in that same title or property cell.
- [x] #2 Inline editors retain draft recovery, Save and Cancel, concurrent-edit protection, validation, and the existing keyboard activation path.
- [x] #3 The editable due date uses a date input with a native date picker and saves a valid YYYY-MM-DD value.
- [x] #4 Read-only created and updated timestamps remain non-editable, and Markdown, custom sections, linked subtasks, chips, paths, and assignee avatars remain intact.
- [x] #5 Focused tests, full mise verification, and fresh desktop and narrow live UI checks pass.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extract the existing field editor controls, conflict state, and Save/Cancel actions into a reusable inline field-editor renderer.
2. Render that editor in the title header or matching property cell when the active draft is a field, while keeping the shared editor only for Markdown section drafts.
3. Use an input type=date for due_date drafts and normalize the displayed draft to YYYY-MM-DD without changing read-only timestamp authorization.
4. Add focused tests for editor placement, keyboard activation, date input type/value, save payload, and preserved conflict/draft behavior.
5. Run focused and full mise verification, reload the plugin, and inspect fresh owned desktop and narrow layouts before finalizing.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
The user requested that double-click editing stay next to the clicked field and that dates use a date picker. This is an interaction/layout refinement on top of BCKLG-3.

Verification evidence: focused modal suite passed 12/12, including inline property placement and date input type/value; full mise test passed 62/62; typecheck and build passed in named tmux session. Reloaded the installed plugin and checked a fresh BB-owned CDP tab: title double-click produced a textarea inside #task-modal-title with no distant .field-editor, and the narrow modal remained within the 430px viewport. The owned lease and tab were released and closed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Moved field editors into the clicked title or property cell, preserved local Save/Cancel and conflict handling, and added a native date picker for due dates. Verified with 62 passing tests, typecheck, build, reload, and fresh owned-tab desktop/narrow checks.
<!-- SECTION:FINAL_SUMMARY:END -->
