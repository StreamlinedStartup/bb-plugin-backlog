---
id: BCKLG-10.1
title: Find active tasks by name and send them as mentions
status: In Progress
assignee:
  - '@codex'
created_date: '2026-09-23 20:41'
updated_date: '2026-09-23 21:05'
labels:
  - mentions
dependencies: []
references:
  - server.ts
  - src/discovery.ts
  - src/model.ts
  - tests/server.test.ts
parent_task_id: BCKLG-10
priority: medium
type: feature
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
First usable slice of task mentions: a user who remembers a task title can attach its current content to a BB message without locating its Markdown file or knowing the task prefix. Cover the complete search, selection, and send flow for tasks in active storage, including tasks with any configured status.

Use the current project and the same selected source/folder as the board; without a project or an unambiguous configured source, offer no unrelated tasks. The plugin already exposes parsed task metadata and source discovery. BB documents a native mention provider with server-side search and send-time resolution; exact installed SDK behavior must be confirmed before implementation. No frontend picker replacement is required by this scope.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The native @ picker exposes a Backlog tasks group for the current project; case-insensitive title or full-ID search returns at most 20 selectable active-storage tasks showing title, ID, and verbatim configured status, regardless of prefix.
- [x] #2 Selecting a result inserts a persistent mention; sending reads the current task and supplies title, ID, status, metadata, body, and project/source/file location as agent context, including changes made after selection.
- [ ] #3 Mentions are scoped to the selected project, source, folder, and task ID; missing tasks, duplicate IDs, malformed reference identities, unavailable sources, or changed source/folder selection cannot attach another task or silently omit context. Resolution failures block send with an actionable error.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Automated checks cover custom prefixes/statuses, same task ID in two projects, no selected project/source, updates between selection and send, malformed identities, duplicates, deletion, and unavailable hosts; new functionality meets the project coverage requirement.
- [x] #2 Confirm installed public SDK support and run typecheck, relevant tests, public-SDK check, and plugin build; live-check keyboard selection, draft persistence, and fresh agent context in the native BB composer.
- [x] #3 Document the delivered mention flow, current-project scope, and resolution errors in docs/task-mentions.md and skills/backlog/SKILL.md.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Register a native Backlog tasks provider using the installed public SDK. Reuse resolve() and tasksFor() without board watches. 2. Search active storage by title/full ID and encode project/source/host/root/folder/task identity in persistent mention IDs. Resolve fresh metadata/body with explicit boundary and inventory errors. 3. Add behavioral tests including isolation, freshness and failure cases; measure coverage, typecheck, public-SDK scan and build. 4. Exercise keyboard selection, draft persistence and send-time context in live BB; document the flow and record evidence.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented active-task mentions. Focused verification: 19 tests pass; server line coverage 89.27%, new mention lines covered. SDK 0.5.9 declarations confirmed; typecheck, public-SDK scan and plugin build pass. Live freshness probe: context should include this note added after keyboard selection.

Live native composer: title query returned the correct Backlog tasks row; Enter inserted a persistent plugin mention; page reload retained the same project/source/host/root/folder/task identity. Final dispatch was intercepted pending permission for a test thread. Full suite: 75 pass, 0 fail; 98.50% overall line coverage.

Finalization review: automated checks and live selection/persistence are verified. DoD 2 and send-related acceptance criteria remain open until the authorized test-thread question is answered and actual delivered context is checked.

Live successful delivery confirmed in the implementation thread: the user selected and sent BCKLG-10 through the native composer. The agent received plugin-resolved title, ID, current In Progress status, metadata, full task body and correct project/source/host/folder/file location, including the latest implementation notes. This complements the earlier keyboard/persistence checks and automated update-between-selection-and-resolution test. Visible failure/retry verification remains outstanding for the feature.
<!-- SECTION:NOTES:END -->
