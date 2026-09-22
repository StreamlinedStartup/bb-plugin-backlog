---
id: BCKLG-9
title: Prepare public release and plugin listings for review
status: In Progress
assignee:
  - '@codex'
created_date: '2026-09-22 02:55'
updated_date: '2026-09-22 03:08'
labels: []
dependencies: []
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Publish the existing plugin so BB users can discover and install it. The user must review the release and both listing submissions before remote publication.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Release metadata, license and install documentation are ready for review
- [x] #2 Tests, type checks and a production-only dependency build pass
- [ ] #3 BB marketplace entry and awesome list PR are prepared and validated locally
- [ ] #4 User approves publication before remote changes or PR submission
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Inspect listing contracts and release contents; prepare metadata and screenshots; validate plugin and listing checkouts; present exact release and PR changes for review.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Prepared MIT license, public repository metadata, SDK range ^0.4.87, installation instructions, overview draft and a 1200x681 JPEG screenshot. Plugin checks: 70 tests, typecheck, normal build, isolated production-only build and installed-host checks passed (33ms native watch signal). Marketplace build, 35 tests, retry tests and frozen-v1 gate passed. Both PR drafts and local listing checkouts are under .test-results/publication. User review, overview approval, release commit, public repository/tag/topic, remote source checks and PR submissions are pending. No remote mutations performed.

User requested display name Backlog.MD. Updated manifest name, navigation labels, documentation, bundled skill and both publication drafts. Package/repository bb-plugin-backlog and plugin ID backlog stay stable. Publication still awaits review.

Added user-requested non-affiliation and non-endorsement disclaimer near the top of the README and in the marketplace overview, linking to MrLesk/Backlog.md and thanking its maintainers and contributors. Marketplace build passes with the updated overview. Display-name update also passed typecheck/build and the installed plugin was reloaded.
<!-- SECTION:NOTES:END -->
