---
id: BCKLG-13
title: Browse and edit Markdown documents and decisions
status: Done
assignee:
  - '@codex'
created_date: '2026-09-26 02:13'
updated_date: '2026-09-26 03:49'
labels:
  - frontend
  - markdown
dependencies: []
priority: medium
type: feature
ordinal: 17000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Users can currently browse and open tasks from the left sidebar, but project Documents and Decisions have no equivalent Markdown workflow. Users need to find these project records, read and make quick edits in context, and bring selected passages into BB chat while composing a message.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A user can select text in the preview and add that passage as context to the BB chat composer, then continue typing their message.
- [x] #2 Markdown parsing, file changes, empty or unavailable content, and switching between preview and editor are handled consistently with the existing project workflow.
- [x] #3 Documents and Decisions each have a section that lists the Markdown files available in the selected project (layout per BCKLG-14)
- [x] #4 Selecting a document or decision opens a readable Markdown preview and an editor mode for quick edits
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend the selected Backlog folder inventory with confined Markdown records from its Documents and Decisions directories, including revision data and safe read/write behavior. 2. Add RPC and model contracts for listing, reading, and conflict-safe saving of document and decision Markdown. 3. Add Documents and Decisions section navigation with a file-list pane and a right-hand preview/editor pane, retaining the task board and current project/source context. 4. Add a text-selection affordance that calls BB's composer addQuote API so the selected passage is inserted into chat and the user can continue typing. 5. Review changed files against the acceptance criteria and update the Backlog task with the implementation summary.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented Documents and Decisions navigation with Markdown file lists and a three-pane preview/editor workspace. Added confined host inventories, revision-guarded save/read RPCs, draft recovery/conflict handling, BB composer quote insertion from text selection, folder settings in the document workspace, narrow-screen navigation, and README guidance. Automated checks were not run.

Fixed: the Markdown preview rendered YAML front matter as a setext heading. splitFrontmatter (task-format.ts, same regex task parsing uses) separates it; RecordMeta renders it as a compact strip (hash icon for id, calendar for date/created_date, clock for updated_date, pill for status, plain key/value otherwise, title skipped since the toolbar shows it; invalid YAML shows a notice). Editor still shows the full file. Tests: tests/record-meta.test.tsx; verified in browser on sparky-learn decision-001 and doc-mcp-c7 doc-001.

List cards now show an excerpt (first prose paragraph as plain text, front matter/headings/code/tables skipped, ~160 chars) instead of the file path; the path stays in the tooltip and search also matches excerpt text. markdownRecords reads each file in batches of 12 to build it; an unreadable file keeps its card and adds a warning. Tests: markdownExcerpt cases and the markdownRecords server test; verified live via RPC on doc-mcp-c7 and screenshots at 1000px and 420px.

Verification before v1.0.0: browser check that selecting preview text and pressing + puts the passage in the BB composer (quote cleared afterwards); server tests for revision-guarded document saves (stale revision returns a conflict with no write), confinement to docs/, markdownRecords excerpts, and front matter parsing; Preview/Edit switching, empty decision lists and unreadable-file warnings checked in the browser. ACs 1 and 2 were reworded because BCKLG-14 replaced the sidebar and third-panel layout they described.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Documents and Decisions are browsable and editable Markdown sections with revision-guarded saves, a compact front matter strip, list excerpts, and quote-to-chat. Verified with 92 tests (including new save/conflict/confinement tests), typecheck, and live browser checks in BB.
<!-- SECTION:FINAL_SUMMARY:END -->
