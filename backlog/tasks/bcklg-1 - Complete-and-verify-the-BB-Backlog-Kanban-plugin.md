---
id: BCKLG-1
title: Complete and verify the BB Backlog Kanban plugin
status: Done
assignee:
  - '@codex'
created_date: '2026-09-18 03:50'
updated_date: '2026-09-18 04:17'
labels: []
dependencies: []
references:
  - BACKLOG-PLUGIN-PLAN.md
priority: high
type: feature
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The approved Backlog plugin plan is implemented in this checkout and locally installed. Finish the remaining format compatibility, browser verification, lifecycle checks, and documentation so the plugin is usable for real BB project tasks without requiring the Backlog CLI at runtime.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Light-only board appears in BB navigation with all projects and configured task lanes; modal, filters, drag and keyboard moves work in the installed UI.
- [x] #2 Markdown edits preserve unknown YAML, custom content, markers, comment metadata and line endings; overlapping edits keep the user draft.
- [x] #3 Discovery supports both folder conventions, root config and project-specific host/source overrides.
- [x] #4 Native file changes refresh tasks within one second locally; watcher resources are cleaned up and reconnects reconcile.
- [x] #5 Mise test, typecheck and build pass; installed plugin is running and README documents supported format and limits.
- [x] #6 Cards show a clamped description preview, label chips and progress bar; actual subtasks render as structured linked rows with status and assignee.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Finish UI and format edge cases against current installed SDK and upstream format. 2. Verify with unit, integration and installed-host checks. 3. Exercise isolated BB browser, inspect screenshots and task interactions. 4. Document supported behavior and limits, reload installation and finalize verified criteria.

5. Enrich cards with two-to-three-line description previews, labels, and checklist progress bars. Render linked child tasks as structured task rows and give acceptance checklists a task-manager presentation.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Initial implementation is installed and running. 46 tests currently pass. Live host workflow verified active/completed/archived storage, CAS conflicts, disjoint merge and persisted movement. Measured native host watch signal latency: 139 ms. Browser inspection is in progress through an isolated BB automation profile.

User requested hiding HTML comments and Backlog section markers in the task preview. Enabled Markdown skipHtml so markers stay on disk but are absent from rendered task text; added a regression test.

Removed the visible Move task card menu at the user request. Cards retain drag/drop and focus-based Alt+Arrow keyboard movement without extra card controls.

User supplied a reference board and requested richer cards plus a structured subtasks presentation. Keeping the established light palette and drag-only card controls.

Final verification: 58 tests passed, typecheck and build passed, local plugin reloaded and running. Live report records 139ms native watch latency, guarded writes, disjoint merges and overlapping conflict rejection. Browser report verifies filters, native drag, keyboard moves, conflict drafts, Escape and narrow/light layouts. Updated desktop screenshots confirm rich cards, subtask rows and SDK logos. Separate remote-host end-to-end verification is unavailable and documented in README.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented and locally installed the Backlog Kanban plugin with file-preserving edits, concurrency protection, live filesystem refresh, project discovery, filters, draggable rich cards, structured subtasks and Codex/Claude SDK icons. Verified with 58 tests, typecheck, build, enrolled-host integration checks and isolated BB browser workflows. Remote-machine end-to-end behavior remains unverified.
<!-- SECTION:FINAL_SUMMARY:END -->
