---
id: BCKLG-9
title: Prepare public release and plugin listings for review
status: Done
assignee:
  - '@codex'
created_date: '2026-09-22 02:55'
updated_date: '2026-09-22 03:13'
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
- [x] #3 BB marketplace entry and awesome list PR are prepared and validated locally
- [x] #4 User approves publication before remote changes or PR submission
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

User approved publication. Published public repository StreamlinedStartup/bb-plugin-backlog with bb-plugin topic and v0.1.0 at 7176169b7a449f74edc4544018e9d0cc5bc9e076. Fresh public-tag clone passed production-only install and BB build. Registry-wide liveness passed using Bun info for registry lookups instead of npm view. Submitted marketplace PR https://github.com/get-bb/marketplace/pull/345 and awesome list PR https://github.com/MGrin/awesome-bb-plugins/pull/48. The release commit used a one-command hook bypass after reviewing UBS findings: request-generation counter misidentified as secret, handled async event, JSX key false positives and pre-existing style warnings; staged source changes were display-name strings only.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Published Backlog.MD 0.1.0 under MIT with non-affiliation acknowledgment, install docs, screenshot and overview. Verified 70 tests, typecheck, builds, installed-host behavior, public-tag production-only build, marketplace build/tests/v1 gate and registry-wide source liveness. Both requested PRs are open for maintainer review.
<!-- SECTION:FINAL_SUMMARY:END -->
