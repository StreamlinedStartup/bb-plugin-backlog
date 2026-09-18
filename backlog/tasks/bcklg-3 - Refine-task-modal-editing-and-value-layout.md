---
id: BCKLG-3
title: Refine task modal editing and value layout
status: Done
assignee:
  - '@codex'
created_date: '2026-09-18 04:37'
updated_date: '2026-09-18 04:43'
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
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The first modal redesign improved the property grid but retained visible Edit controls and still presents long list values as a dense wall of text. The reference direction calls for a cleaner task-manager surface: double-click should be the editing interaction, while dense metadata should be structured and long paths should remain readable without losing access to the original value.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Editable property cells no longer repeat visible Edit controls; double-clicking an editable field still starts editing, and the interaction remains keyboard and accessibility usable.
- [x] #2 Property values are structured for scanning with appropriate chips, compact list rows, or grouped content instead of a single undifferentiated text wall.
- [x] #3 Long file paths and similar path-like values are shortened in the modal while the full value remains available on hover and accessible to assistive technology.
- [x] #4 Read-only timestamps and the existing status, priority, assignee, draft, conflict, Markdown, custom section, and linked-subtask behavior remain intact.
- [x] #5 Focused tests, full mise verification, and fresh desktop and narrow live UI checks pass.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Replace visible property Edit buttons with a semantic editable-cell treatment that preserves double-click editing and adds keyboard activation without decorative controls.
2. Render property values through small presentation helpers: status and priority badges, labels and other list fields as compact chips or rows, and path-like values as shortened labels with full title and accessible text.
3. Refine modal spacing, value wrapping, and responsive property layout to create clear groups and reduce the wall-of-text effect while preserving the current light-only system.
4. Extend focused modal tests for hidden Edit controls, keyboard editing, structured list/path presentation, and preserved timestamps.
5. Run focused and full mise verification, reload the plugin, and inspect fresh owned desktop and narrow tabs before finalizing.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
The user reviewed BCKLG-2 in the installed UI and requested a stronger visual hierarchy matching the reference screenshots. This follow-up deliberately changes presentation and edit affordances only; parser authorization remains unchanged.

Verification evidence: focused modal suite passed 11/11; full mise test passed 61/61; typecheck and build passed in named tmux sessions. Reloaded the installed plugin and checked a fresh BB-owned CDP tab: zero visible .inline-edit controls, 13 keyboard-editable cells, 2 state badges, 5 compact chips, and a 430px viewport with a 412px modal and no horizontal overflow. The owned lease and tab were released and closed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Refined the task modal around implicit editing: removed repeated Edit labels while retaining double-click and keyboard activation, grouped list values into compact chips, shortened long paths with full accessible hover values, and kept the existing modal safety and rendering behavior intact. Verified with 61 passing tests, typecheck, build, reload, and fresh desktop/narrow owned-tab checks.
<!-- SECTION:FINAL_SUMMARY:END -->
