---
id: BCKLG-10.2
title: Identify task mentions through previews and description search
status: In Progress
assignee:
  - '@codex'
created_date: '2026-09-23 20:41'
updated_date: '2026-09-23 21:00'
labels:
  - mentions
dependencies:
  - BCKLG-10.1
references:
  - server.ts
  - src/task-relations.ts
  - tests/server.test.ts
parent_task_id: BCKLG-10
priority: medium
type: enhancement
ordinal: 13000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Users may remember what a task is about rather than its exact title, and similarly named tasks are hard to distinguish in a compact picker. Enrich the working mention flow with description search, useful previews, and predictable result ordering while retaining the native BB picker.

The plugin already has descriptionPreview() for board cards. The native mention API documents title and subtitle fields; use the supported presentation and verify what is actually visible before considering additional UI. Custom hover cards, a new search dependency, and speculative indexing are outside this slice.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Each suggestion shows task title and ID plus the configured status, priority when present, and a bounded plain-text description preview when present; long or missing descriptions do not obscure task identity or show Backlog markers/raw HTML.
- [ ] #2 Case-insensitive search matches title, full ID, and description without requiring a prefix; exact ID/title matches rank ahead of partial title matches, which rank ahead of description-only matches. An empty query offers deterministic suggestions and results remain capped at 20.
- [ ] #3 Users can distinguish similarly named tasks, select either result by keyboard, and send the intended task through the existing fresh-context flow; representative local and available remote-project searches complete within BB's documented two-second search window.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Automated checks cover description-only matches, ranking/ties, empty queries, result limits, missing optional fields, and long/Markdown descriptions; new functionality meets the project coverage requirement.
- [x] #2 Run relevant tests, typecheck, public-SDK check, and plugin build; live-check preview legibility and keyboard selection in BB and record search timing with the task count and host type used.
- [x] #3 Update docs/task-mentions.md and skills/backlog/SKILL.md with supported search fields, result ordering, and preview behavior.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend the working active-task provider with full description search and exact-ID/title, partial title/ID, then description relevance tiers; use deterministic ID/path ties and the existing 20-result cap. 2. Reuse descriptionPreview() for bounded native subtitles with status and optional priority; strip HTML in the shared preview helper. 3. Cover ranking, full descriptions beyond the preview, missing metadata, HTML/Markdown, ties and limits; run tests, typecheck, SDK check and build. 4. Live-check preview legibility and keyboard selection, record local/available remote timing, and update usage docs.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
The first slice implementation, automated checks and live selection/persistence pass. Its successful delivery check is pending permission for one shared test thread; that verification will be completed before finalizing either slice.

Full suite: 77 tests pass, typecheck/public SDK/build pass. Live description-only query selected BCKLG-10.2 by Enter. Screenshot showed IDs could be truncated after long titles, so suggestion titles now put the ID first. Live HTTP searches over 14 local tasks: title 45 ms, description-only 40 ms. Only one local host is enrolled; no remote project is available for timing. BB 0.5.9 host search endpoint returns no provider groups for an empty query; provider-level empty-query ordering is covered by tests.

Live similar-name fixture results displayed both IDs, status, high/low priority and different descriptions legibly. ArrowDown + Enter selected PROBE-2 instead of PROBE-1. Native host suppresses provider searches for empty queries; documented this host limitation and verified deterministic empty-query results directly through the public test harness. Actual delivered-context check is still pending test-thread approval.
<!-- SECTION:NOTES:END -->
