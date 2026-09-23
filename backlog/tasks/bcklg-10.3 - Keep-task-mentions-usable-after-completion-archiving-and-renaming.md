---
id: BCKLG-10.3
title: 'Keep task mentions usable after completion, archiving, and renaming'
status: In Progress
assignee:
  - '@codex'
created_date: '2026-09-23 20:42'
updated_date: '2026-09-23 21:00'
labels:
  - mentions
dependencies:
  - BCKLG-10.2
references:
  - server.ts
  - host.ts
  - src/discovery.ts
  - src/model.ts
  - tests/server.test.ts
parent_task_id: BCKLG-10
priority: medium
type: enhancement
ordinal: 14000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Tasks remain useful conversation context after their files are renamed or moved into completed or archived storage. Users should be able to reference historical work and send an existing draft after ordinary task lifecycle changes without reselecting the task or accidentally attaching a different one.

Extend the established mention flow across the task storage locations already supported by the board. Keep task identity scoped to the original project/source/folder and metadata ID. Source/folder reconfiguration is an identity boundary, not a reason to silently redirect a mention. Changing the task ID itself is outside reference-preservation guarantees.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Search includes active, completed, and archived storage with completed/archived results clearly labeled separately from configured status; empty-query suggestions prioritize active storage, while an exact historical ID/title match still outranks weaker active matches.
- [ ] #2 An existing draft mention still resolves the same task after a title/filename change or a move among tasks/, completed/, and archive/tasks/ within the original Backlog folder; the sent context contains its latest status, content, and file location.
- [ ] #3 Duplicate IDs across storage locations, deletion, task-ID changes, source/folder reconfiguration, or unavailable hosts never redirect a mention or send stale context; an actionable resolution error blocks send, and retry succeeds once the original referenced task becomes available again.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Automated checks cover historical search/ranking, custom statuses, rename/move sequences between selection and send, cross-storage duplicates, changed IDs, source boundaries, and unavailable-host recovery; new functionality meets the project coverage requirement.
- [ ] #2 Run relevant tests, typecheck, public-SDK check, and plugin build; live-check selecting a historical task and sending a saved draft after a task rename or storage move, plus the visible failure and retry flow.
- [ ] #3 Update docs/task-mentions.md and skills/backlog/SKILL.md with historical-task behavior and reference-preservation limits; verify the parent feature criteria after all slices are complete.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Include tasks/, completed/ and archive/tasks/ using the existing inventory and ID-based references; label historical storage separately from configured status. 2. Rank relevance before storage, with active then completed then archived for ties/empty queries. Detect duplicate IDs case-insensitively in the shared inventory. 3. Test rename/move sequences, cross-storage duplicates, changed IDs, source/host boundaries and recovery; run full checks and coverage. 4. Live-check historical selection and persisted draft behavior using isolated CLI-created fixtures, verify visible failures/retry and delivered current context when test-thread permission arrives. Update docs and finalize all tasks only against verified evidence.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented historical storage search, relevance-first/active-first ties, explicit storage labels, and case-insensitive duplicate detection. Saved identities resolve by exact metadata ID across filename/title/storage changes. Full suite: 81 pass, 0 fail; 98.53% line coverage overall, 89.71% server, all new mention lines covered. Typecheck, installed SDK sync check, public-SDK test and build pass. Live CLI fixtures: selected PROBE-2, renamed its title, marked Done and moved to completed via CLI; browser reload retained its original persistent mention identity.

Live historical picker showed active, completed and archived rows, with storage labeled independently of Done/To Do; keyboard selected archived PROBE-3. Preserved the saved PROBE-2/PROBE-3 resources in .test-results/mentions-draft.json. Original project folder selection restored. Automated resolution covers latest content/path after all storage moves and error recovery; live send/error/retry awaits test-thread approval.
<!-- SECTION:NOTES:END -->
