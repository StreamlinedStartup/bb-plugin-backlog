---
id: BCKLG-14
title: Replace three-column layout with a shared top bar
status: Done
assignee:
  - '@claude'
created_date: '2026-09-26 03:07'
updated_date: '2026-09-26 03:32'
labels:
  - frontend
dependencies:
  - BCKLG-13
type: enhancement
ordinal: 18000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The plugin spreads navigation across three places: a section column on the left, a project rail on the right edge of the task board, and a project dropdown inside the document reader. The Documents and Decisions views end up with three columns (sections, file list, reader), and the project choice moves depending on the view, which users found confusing. Concept A from the Stitch exploration (project 5046040882685813552, screen d700607cd12b45eb878e43015a3b6738) puts project choice and section switching in one top bar, so each view keeps at most two content panes. This supersedes the left-sidebar and third-panel layout described in BCKLG-13 criteria 1 and 2.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A single top bar on every view shows the project switcher on the left, followed by Tasks, Documents and Decisions tabs
- [x] #2 The task board fills the width under the top bar with no project rail on the right
- [x] #3 Documents and Decisions show only a file list and a reader or editor, with no project selector inside the reader
- [x] #4 Folder settings and refresh are reachable from the top bar and behave the same in every view
- [x] #5 Changing project keeps the existing safeguards: blocked while a task is open, clears stale errors, settings and records
- [x] #6 The layout stays usable at narrow widths down to 720px and below
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. app.tsx: add an app header (wordmark, project select, folder path, section tabs, live status, Folder settings, Refresh); remove section-nav aside and project-rail aside; render FolderSettings once under the header; drop the board toolbar h1/connection that the header now covers; unify project change in one handler. 2. MarkdownRecordPanel: remove the record-project row and the projects, onProjectChange, onRefresh, onOpenSettings and settingsPanel props. 3. app.css: switch .backlog-root to a flex column; add header and tab styles; delete section-nav, project-rail, records/tasks layout grid variants and record-project rules; rewrite the 1050px and 720px media rules for the new structure. 4. Typecheck, tests, build, reload, and screenshot each view in BB.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented concept A: app-header with project select (sized to content), Tasks/Documents/Decisions tabs, live status, Folder settings and Refresh; FolderSettings renders once under the header for every view; removed section-nav, project-rail, board toolbar and the reader's record-project row plus their CSS; MarkdownRecordPanel lost its project/settings/refresh props. Validation: tsc clean, bun test 87 pass, bb plugin build + reload, agent-browser screenshots of Tasks and Documents at 1280px and Tasks with settings open at 700px, DOM check that the project select is disabled while a task modal is open and re-enabled after Escape. Observed pre-existing issue outside scope: document YAML front matter renders as a heading in the preview.

Split-view fix: narrow-layout rules keyed off the window width, so a narrow plugin pane in a wide BB window overlapped the project select with the tabs. .backlog-root is now an inline-size container and the layout breakpoints use @container (modal rules stay @media since the dialog sizes against the viewport); the header also wraps at any width instead of overlapping. Verified at a 1400px window with the plugin at 620px and 900px: screenshots plus a bounding-box check showing no overlap between the project select and any tab.

User-requested addition: the Documents/Decisions file list can be collapsed from an icon in its own header and reopened from a 44px strip left in its place; the hidden state lives in Page so it survives switching files and sections. Verified in the browser at 1000px (reader 760px open, 1000px hidden) and 620px, with screenshots of both states and the Show/Hide aria labels.

Narrow (horizontal) file list: vertical mouse wheel now scrolls the row sideways via a non-passive wheel listener that only acts when the row is display:flex and overflowing; trackpad sideways swipes and the wide vertical list are untouched. Rows became one-line chips (ellipsis, full path in tooltip) with no vertical scroll, a thin visible scrollbar, and the strip sizes to content. Verified at 420px with dispatched wheel events (0 to 60px) and screenshots; agent-browser's own wheel command fires at (0,0) so could not be used.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Replaced the three-column layout with one shared top bar holding the project switcher and section tabs, so Tasks shows a full-width board and Documents/Decisions show only list and reader. Verified with typecheck, the full test suite, a rebuilt and reloaded plugin, browser screenshots at desktop and narrow widths, and a DOM check of the project-switch guard.
<!-- SECTION:FINAL_SUMMARY:END -->
