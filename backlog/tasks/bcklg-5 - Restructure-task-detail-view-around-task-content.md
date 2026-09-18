---
id: BCKLG-5
title: Restructure task detail view around task content
status: To Do
assignee: []
created_date: '2026-09-18 05:03'
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
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The current modal still presents too many metadata properties as a dense grid. The next design pass should make the task title and key state prominent, group secondary properties into a compact two-column details section, and give description and task content stronger visual priority. Preserve the existing inline editing and safety behavior while changing the information hierarchy.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The modal has a compact header with the task ID, title, status, priority, assignee, and due date presented as the primary summary.
- [ ] #2 Secondary properties are grouped into a readable two-column Task Details section rather than a five-row three-column wall of fields.
- [ ] #3 Empty optional properties are omitted from the primary view or placed behind a functional More properties disclosure.
- [ ] #4 Labels, assignees, and status/priority values remain compact, scannable tokens with the existing light-only styling.
- [ ] #5 Description, implementation content, and related subtasks receive clear section hierarchy and comfortable reading width.
- [ ] #6 Inline double-click editing, keyboard activation, date picker, Save/Cancel, draft recovery, conflict protection, Markdown, custom sections, and linked subtasks remain functional.
- [ ] #7 Focused tests, full mise verification, and fresh desktop and narrow live UI checks pass.
<!-- AC:END -->
