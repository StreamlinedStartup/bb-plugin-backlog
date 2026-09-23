---
id: BCKLG-11
title: Show delayed previews for Backlog mention suggestions
status: Done
assignee:
  - '@codex'
created_date: '2026-09-23 21:13'
updated_date: '2026-09-23 21:34'
labels:
  - mentions
dependencies: []
priority: medium
ordinal: 15000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Compact native mention rows truncate task descriptions. Let users pause on a suggestion to read a larger preview before selecting it, while preserving native search and selection.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Hovering a Backlog suggestion for 1.5 seconds shows its full title, status, optional priority and up to 420 characters of plain-text description.
- [x] #2 Keyboard highlight or focus can show the preview; changing rows, dismissing the menu, selecting a task, scrolling or pressing Escape clears stale previews without changing composer behavior.
- [x] #3 The preview fits the viewport, remains readable when hovered, uses only the selected row content, and cleans up listeners, timers and DOM on plugin reload or disable.
- [x] #4 Modifier keys and macOS screenshot shortcuts do not dismiss an open preview.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Use the public content-script registration to decorate Backlog suggestion rows; keep the native picker and reuse descriptionPreview() at its existing 420-character limit. No extra RPC or source lookup. Document the current BB title/class markup dependency. 2. Add one tooltip controller with a 1.5-second dwell, pointer/keyboard dismissal and lifecycle cleanup; use existing BB theme tokens. 3. Test delay, row changes, menu removal, safe text and teardown; run full tests/typecheck/SDK scan/build and verify hover, keyboard, narrow viewport and selection in live BB. 4. Document usage and compatibility limits and finalize against the evidence.

5. Fix screenshot capture: reproduce modifier-key dismissal, preserve modifier-only keys and Command-Shift-3/4/5, then verify ordinary typing/Escape still dismiss and reload the installed plugin.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented a public content-script prototype using existing native row text, with 1.5-second hover/keyboard dwell and full 420-character descriptionPreview output. No new RPC or private React access. Live pointer dwell measured 1503 ms; card stays open when hovered and Escape clears it without changing draft text. Keyboard highlight showed the intended BCKLG-10.2 preview; Enter inserted that native mention and removed the preview. Full suite: 86 pass; preview module has 100% line/function coverage after timer/resize cases. Typecheck, SDK sync/public-SDK scan and plugin build pass.

Live narrow viewport (320x720): preview bounds x=12..308, y=390.72..708, fully inside the viewport. Disable removed the tooltip and aria-describedby references; re-enable plus row re-entry produced exactly one preview. Browser error log and plugin log are clear. A backend reload with an identical frontend artifact keeps the active content-script generation; disposal was verified through plugin disable and unit teardown. Usage and BB markup compatibility limits are documented in docs/task-mentions.md and skills/backlog/SKILL.md.

User reported that pressing Command to start a screenshot dismisses the card. Root cause: the shared keydown handler clears on every key except ArrowUp/Down.

Screenshot-key fix: the shared keydown handler now ignores modifier-only keys and Command-Shift-3/4/5 without consuming them. Regression reproduced red before the fix; focused checks pass (6 tests, 40 expectations), and typecheck, public SDK scan, build, reload and diff check pass. Live composer hover remained visible after Command. Full shortcut automation was inconclusive because the browser runner also generated trusted Escape events; regression tests cover all three screenshot shortcut events and verify Escape still dismisses. Documentation updated; installed plugin reloaded.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added and installed a 1.5-second hover/keyboard preview for native Backlog suggestion rows, expanding the existing plain-text description to 420 characters without extra requests. Verified live timing (1503 ms), hover retention, Escape, keyboard selection, narrow viewport and disable/re-enable cleanup. All 86 tests, typecheck, SDK checks and plugin build pass; preview module coverage is 100%. Prototype uses the public content-script lifecycle but depends on BB 0.5.9 row markup, documented for future replacement by a native preview slot.

Fixed screenshot preparation dismissing previews: modifier keys and Command-Shift-3/4/5 now preserve the card. Focused regression tests and build/typecheck passed; Command retention verified live. Native OS screenshot capture itself was not verified.
<!-- SECTION:FINAL_SUMMARY:END -->
