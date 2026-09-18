---
id: BCKLG-8
title: Add ascending and descending board sorting
status: Done
assignee:
  - '@codex'
created_date: '2026-09-18 06:22'
updated_date: '2026-09-18 06:25'
labels:
  - frontend
  - enhancement
dependencies: []
priority: medium
type: enhancement
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The board exposes sortable fields but every selection is currently ascending, so users cannot switch between oldest/newest or lowest/highest views.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Users can choose ascending or descending direction for every board sort field.
- [x] #2 Changing direction preserves the selected sort field and updates visible task order.
- [x] #3 Missing values remain consistently placed and deterministic in either direction.
- [x] #4 Focused tests cover direction control interaction and ascending/descending ordering for all sort fields.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add ascending/descending direction to board sort state and the compact sort controls.
2. Update every sort comparator to reverse populated values while keeping missing values last and tie-breaks deterministic.
3. Add unit and control interaction tests for both directions across all sort fields.
4. Run tests, typecheck, build, and reload the plugin.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Validation passed: sort direction is a separate accessible control and preserves the selected field. Unit tests cover ascending and descending behavior for ordinal, title, priority, due date, created date, and updated date, with missing values last. mise run test: 70 passed; mise run typecheck: passed; mise run build: passed; plugin reloaded from /Users/vulture/Projects/bb-plugin-backlog.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added independent Ascending and Descending board sort direction control while preserving selected fields and deterministic missing-value handling. Verified with 70 passing tests, typecheck, build, and plugin reload.
<!-- SECTION:FINAL_SUMMARY:END -->
