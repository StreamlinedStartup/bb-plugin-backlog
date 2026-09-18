---
id: BCKLG-2
title: Redesign task detail modal
status: Done
assignee:
  - '@codex'
created_date: '2026-09-18 04:26'
updated_date: '2026-09-18 04:34'
labels:
  - frontend
  - enhancement
dependencies: []
references:
  - >-
    /Users/vulture/.bb/thread-storage/thr_q7fywdfd2u/Attachments/CleanShot-2026-09-17-at-21.20.03-2x-1789705226304-0vbei9.png
  - >-
    /Users/vulture/.bb/thread-storage/thr_q7fywdfd2u/Attachments/CleanShot-2026-09-17-at-21.20.51-2x-1789705257818-tjl43a.png
modified_files:
  - src/TaskModal.tsx
  - src/Markdown.tsx
  - src/AssigneeAvatar.tsx
  - app.css
  - tests/task-modal.test.tsx
priority: medium
type: enhancement
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The current task detail modal exposes identity and additional fields as a separate block and repeats the task ID, which makes the modal feel like a raw record editor instead of a focused task manager. The researched redesign should improve hierarchy and scanability while retaining the existing preview-first editing and safety behavior. Reference screenshots are stored in the thread attachments; the current implementation is at the listed source files.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The modal no longer renders an Identity and additional fields section, and the task ID appears only in the header.
- [x] #2 Created and updated timestamps appear among the main task properties as read-only values without making them editable through task-format field authorization.
- [x] #3 Task properties use small icons, restrained status and priority colors, clear section dividers, and improved spacing while remaining light-only with no decorative or nonfunctional controls.
- [x] #4 Codex and Claude SDK assignee logos remain compact, and other assignees retain two-letter fallback avatars.
- [x] #5 Preview-first fields, double-click editing, Save and Cancel, draft recovery, concurrent-edit protection, Markdown rendering, custom content, and linked subtasks continue to work.
- [x] #6 Focused modal tests and the full project verification pass, and the installed plugin is manually checked at desktop and narrow widths.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a modal-only read-only property presentation that combines editable frontmatter fields with created_date and updated_date display values, keeping timestamps out of fieldLabels and edit authorization.
2. Remove the raw Identity and additional fields disclosure and repeated identity content, then add semantic property icons plus restrained status and priority treatments without introducing new controls.
3. Update modal styles for clearer hierarchy, dividers, spacing, and narrow layouts while retaining light-only styling and compact assignee/provider avatars.
4. Extend focused modal tests for the removed section, header-only ID, read-only timestamps, visual state hooks, and preserved existing behaviors.
5. Run focused and full mise verification, build/reload the installed plugin, and inspect the live modal at desktop and narrow widths with a fresh owned CDP tab.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Task was researched before creation from the current modal, parser, tests, and supplied reference screenshots. Timestamps are intentionally display-only and will not be added to task-format fieldLabels.

Verification evidence: focused modal suite passed 9/9; full mise test passed 59/59; typecheck and build passed in named tmux sessions. Reloaded the installed plugin and checked a fresh BB-owned CDP tab at desktop and 430px narrow widths: modal opened, raw-fields disclosure absent, timestamps rendered twice, modal width 412px within the 430px viewport, and no horizontal overflow. The owned lease and tab were released and closed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Redesigned the light-only task detail modal with header-only identity, read-only timestamps, semantic property icons, restrained state colors, clearer dividers and spacing, and responsive two-column narrow layout. Preserved preview-first editing, draft recovery, conflict handling, Markdown, custom sections, linked subtasks, and compact assignee avatars. Verified with 59 passing tests, typecheck, build, reload, and fresh owned-tab desktop/narrow checks.
<!-- SECTION:FINAL_SUMMARY:END -->
