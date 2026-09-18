---
id: BCKLG-7
title: Refine task detail context and board date sorting
status: Done
assignee:
  - '@codex'
created_date: '2026-09-18 06:18'
updated_date: '2026-09-18 06:19'
labels:
  - frontend
  - enhancement
dependencies: []
priority: medium
type: enhancement
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The task detail modal repeats the context heading even though the same information already appears under Task Details. The board also needs date-based ordering so users can scan recently created or recently updated work.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The task detail view no longer displays the redundant Additional context text while retaining Task Details.
- [x] #2 The board sort control offers Date created and Date updated options.
- [x] #3 Date sorting is deterministic and places missing dates consistently.
- [x] #4 Focused tests cover the detail-view cleanup and both new sort modes.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Remove the redundant Additional context label from the task details heading while keeping Task details.
2. Add created-date and updated-date sort modes with missing-last deterministic comparison.
3. Add focused tests for the modal cleanup and both date sort modes.
4. Run tests, typecheck, build, and reload the plugin.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Validation passed: TaskModal now retains Task details without the redundant Additional context label. Sort options include Date created and Date updated. Date comparator tests cover ascending values, missing dates last, and deterministic tie-breaks. mise run test: 69 passed; mise run typecheck: passed; mise run build: passed; plugin reloaded from /Users/vulture/Projects/bb-plugin-backlog.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Removed the redundant Additional context label from task details and added deterministic Date created and Date updated board sorting. Verified with 69 passing tests, typecheck, build, and plugin reload.
<!-- SECTION:FINAL_SUMMARY:END -->
