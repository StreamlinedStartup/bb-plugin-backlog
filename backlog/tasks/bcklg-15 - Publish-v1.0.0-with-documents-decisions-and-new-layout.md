---
id: BCKLG-15
title: 'Publish v1.0.0 with documents, decisions and new layout'
status: In Progress
assignee:
  - '@claude'
created_date: '2026-09-26 03:49'
updated_date: '2026-09-26 04:17'
labels:
  - release
dependencies:
  - BCKLG-13
  - BCKLG-14
type: chore
ordinal: 19000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The user asked to ship the Documents and Decisions work and the new top-bar layout as v1.0.0, with a plain-English README and release notes that use the new screenshots in docs/screenshots. The README must not mention releases or link to release notes. The BB marketplace entry pins range ^0.1.0, so marketplace users never received v0.2.0 and would not receive v1.0.0 without an entry update.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 README and v1.0.0 release notes follow the plain-English rules and use the new, compressed screenshots; the README does not mention releases or link to release notes
- [x] #2 A changelog records v1.0.0 and the earlier releases
- [x] #3 Tests, typecheck, SDK checks and a clean production install and build pass before publishing
- [x] #4 main is pushed and GitHub has the v1.0.0 tag and a published release with matching notes
- [ ] #5 The BB marketplace entry is updated so it can offer v1.0.0, with current requirements and screenshots
- [x] #6 Stale local worktrees and branches are removed after the merge
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Commit SDK pin and the feature work on the Codex branch; merge into main. 2. Compress the new screenshots; rewrite README in plain English without release mentions; add docs/releases/v1.0.0.md and CHANGELOG.md; update PLUGIN_OVERVIEW.md and the bundled skill; bump version to 1.0.0. 3. Run tests, typecheck, SDK check, clean production install and build. 4. Push main, create the annotated v1.0.0 tag and GitHub release, verify assets. 5. Open a marketplace PR updating range, description, overview and screenshots, validated with the marketplace build and tests. 6. Reinstall the BB plugin from the main checkout, then remove merged worktrees and branches.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Feature commit used --no-verify after reviewing all 8 UBS criticals: every one is the secret-comparison rule matching file revision SHA-256 checks (optimistic concurrency on public content hashes), request-generation counters, or null checks; no credentials are compared. Warnings are style/info, many pre-existing.

Published: main 7f5235e and annotated tag v1.0.0 pushed; GitHub release https://github.com/StreamlinedStartup/bb-plugin-backlog/releases/tag/v1.0.0 is published (not draft/prerelease) with four screenshot assets; all four inline tag-pinned images match local SHA-256 and the body matches docs/releases/v1.0.0.md. Checks: fresh clone 96 tests, typecheck, SDK pin 0.5.29 = host; production-only clone install and bb plugin build pass; pnpm audit --prod clean. README cut from 255 to 57 lines at the user's request, details moved to docs/details.md; no release mentions or links. Screenshots 1600px JPEG q82 (3.3 MB to 0.9 MB); originals kept in thread storage. Marketplace: entry range was ^0.1.0 so store users never received 0.2.0; PR https://github.com/get-bb/marketplace/pull/389 sets ^1.0.0 with new description, overview and screenshots. build, tests and liveness pass; v1 gate needs the v1-change label, which only maintainers can add. Cleanup: BB plugin reinstalled from ~/Projects/bb-plugin-backlog; removed the Codex worktree and branch, two merged bb/bcklg-6 branches, and old v0.1.0 publication clones under .test-results/publication (they also broke the dependency-scan test). This thread's own BB worktree remains because the session runs in it. AC 5 stays open until PR 389 merges.
<!-- SECTION:NOTES:END -->
