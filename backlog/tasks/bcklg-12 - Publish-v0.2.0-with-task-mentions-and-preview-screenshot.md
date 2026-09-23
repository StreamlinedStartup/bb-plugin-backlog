---
id: BCKLG-12
title: Publish v0.2.0 with task mentions and preview screenshot
status: Done
assignee:
  - '@codex'
created_date: '2026-09-23 21:40'
updated_date: '2026-09-23 21:43'
labels: []
dependencies: []
type: chore
ordinal: 16000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The user requested a new GitHub tag and plain-English release notes with the verified hover-preview screenshot. Package the current mention feature and pnpm setup as v0.2.0.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Version, installation docs and release notes describe v0.2.0 and include the existing preview screenshot.
- [x] #2 Tests, typecheck, SDK checks and a clean production install/build pass before publishing.
- [x] #3 GitHub has the v0.2.0 tag and a published release with matching notes and screenshot.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Review the changes and existing verification gaps; update version and release documentation with the captured screenshot; run release checks; commit tooling, feature and release changes separately; push main and the new immutable tag; publish and verify the GitHub release. Preserve unfinished BCKLG-10 live verification as open task work.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Prepared v0.2.0 notes with the existing 1280x577 live hover-preview screenshot, updated README and plugin overview, and selected v0.2.0 as the new feature release. Reviewed mention search/resolution and tooltip lifecycle against tests. Full suite: 86 pass, 506 expectations, 98.62% line coverage; typecheck, public SDK scan, SDK pins and build pass. Production dependency audit reports no known vulnerabilities. BCKLG-10 live send-error/retry and historical-send gaps remain explicitly open and are disclosed in the release notes.

Clean v0.2.0 copy with no node_modules: pnpm install --prod --frozen-lockfile --ignore-scripts installed the five runtime dependencies and bb plugin build produced server, app and host artifacts successfully. No dev dependencies were installed. Existing screenshot inspected and copied unchanged into docs/screenshots/task-mention-preview.png.

Published annotated tag v0.2.0 at b180bad7cc8f021996505ffd54ce2cda4558a37f and GitHub release https://github.com/StreamlinedStartup/bb-plugin-backlog/releases/tag/v0.2.0. Verified release is published (not draft or prerelease), notes match docs/releases/v0.2.0.md, screenshot asset is uploaded, and the tag-linked inline screenshot downloads with the exact local SHA-256. Original v0.1.0 tag was not changed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Published v0.2.0 with native task mentions, delayed previews, pnpm setup, plain-English release notes and the live screenshot. Verified 86 passing tests, typecheck/SDK checks, production dependency audit and clean production install/build. GitHub tag, published release and screenshot integrity verified. Unfinished BCKLG-10 live verification remains tracked separately.
<!-- SECTION:FINAL_SUMMARY:END -->
