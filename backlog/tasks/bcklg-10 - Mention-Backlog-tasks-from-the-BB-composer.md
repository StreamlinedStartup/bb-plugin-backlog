---
id: BCKLG-10
title: Mention Backlog tasks from the BB composer
status: In Progress
assignee:
  - '@codex'
created_date: '2026-09-23 20:40'
updated_date: '2026-09-23 21:05'
labels:
  - mentions
dependencies: []
references:
  - server.ts
  - src/model.ts
  - src/task-relations.ts
priority: medium
type: feature
ordinal: 11000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Users can currently mention task Markdown files, but finding them often requires remembering a configurable task prefix or filename. Add a Backlog tasks group to the native BB @ picker so users can identify tasks by name and preview, then give the agent current task context when sending.

Scope: the current BB project and the source/folder selected for that project in this plugin. Task prefixes and status names belong to user data. Deliver through ordered vertical slices, each usable and verified end to end. Cross-project search, custom hover cards, board Add to chat actions, and new configuration are outside this feature.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Users can find and select a Backlog task by title or description without knowing its configured ID prefix, and see its title, ID, status, optional priority, and a short description preview.
- [ ] #2 Sending a selected mention gives the agent fresh context from the correct project/source/task, with explicit failures for missing, ambiguous, or unavailable references.
- [ ] #3 Ordered child slices deliver active-task mentions, richer discovery, and completed/archived task references; each includes automated verification, a live composer check, and usage documentation.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Implement BCKLG-10.1, then 10.2, then 10.3. For each slice: verify the public SDK contract, implement the native mention flow, run focused tests and live composer checks, update documentation, and finalize against objective evidence.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
All three implementation slices and their tests/docs are present; 81 tests pass with 98.53% line coverage, typecheck/public-SDK check/build pass, and plugin is installed locally. Live search, previews, keyboard selection, persistence, rename/move draft retention and historical labels verified. Successful agent delivery and visible send-error/retry remain pending explicit test-thread permission required by BB instructions. Tasks remain In Progress until those checks pass. Host-level empty-query suppression and absence of remote hosts are documented.

The user sent a native BCKLG-10 mention in this thread and its resolved context reached the agent successfully, with the correct project/source/file identity and current task content. Successful live delivery is now verified. Historical send-after-move and visible failure/retry checks remain outstanding; no separate test thread has been created.
<!-- SECTION:NOTES:END -->
