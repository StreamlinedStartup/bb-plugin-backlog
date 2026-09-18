---
id: BCKLG-6
title: Add task board filtering and sorting controls
status: To Do
assignee: []
created_date: '2026-09-18 05:17'
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
- [ ] #1 Users can filter visible tasks by status, priority, assignee, and one or more labels, with the active filter state reflected in the controls.
- [ ] #2 Users can sort visible tasks by title, priority, due date, and ordinal, with a deterministic order when values are equal or missing.
- [ ] #3 Filtering and sorting compose correctly with the existing task search and storage filters without bypassing or resetting those scopes.
- [ ] #4 Controls are responsive across supported board widths, keyboard accessible with visible focus, and provide a reset action that clears the board filters and sorting state.
- [ ] #5 Focused automated tests cover each filter, each sort option, composition with search and storage filters, reset behavior, and keyboard-accessible control interaction.
<!-- AC:END -->
