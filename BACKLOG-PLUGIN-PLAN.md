# Backlog board for BB

Build `bb-plugin-backlog`: a light-only Kanban page in BB's left navigation, with all BB projects in a right-hand rail, live filesystem updates, and task details in a modal. Operate directly on Backlog.md files without requiring its CLI.

## Product behavior

- Register a Backlog navigation entry using BB's `navPanel` surface. Let BB own its application shell.
- Use a white canvas, pale gray lane backgrounds, dark text, fine neutral borders, and restrained status colors. No gradients or dark theme. Scope styling to the plugin and its modal.
- Suggested tokens: canvas `#FFFFFF`, lanes `#F5F6F8`, border `#DDE1E6`, text `#20252B`, secondary text `#626B77`, selection `#235DC1`. Use the host sans-serif family, with 14px controls and 15px card titles. Keep task prose comfortably readable with a limited line length.
- Main layout: BB navigation | task board | project rail. Within the plugin, reserve a compact left section navigation area for future Tasks, Decisions, Docs, and Plans. Initially expose Tasks only.
- Board toolbar: project name, search, filters, and project-specific folder settings. Show every configured status, including empty columns. Preserve visibility of tasks with an unrecognized status and identify the configuration mismatch.
- Cards show ID, title, priority, assignees, labels, and checklist progress. Lane headers show counts. Avoid unnecessary card decoration.
- Drag between columns to persist status changes; drag within a column to persist Backlog's `ordinal` ordering. Include a keyboard-accessible move action.
- Clicking a card opens a modal in preview mode. Double-click an editable field to edit it. Also provide keyboard and touch-accessible edit controls. Save and Cancel are explicit; Escape cancels the active edit before closing the modal.
- Editable fields include title, status, type, priority, assignees, reporter, labels, milestone, due date, project classification, dependencies, references, documentation links, modified files, and supported task body sections. Treat IDs and derived relationships as identity/display data rather than casually editable text.
- Render description, acceptance criteria, definition of done, implementation plan, notes, comments, and final summary. Preserve comment metadata when editing. Task implementation plans are supported now; a separate Plans section is future scope.
- Reuse one safe Markdown renderer with headings, lists, tables, task lists, links, and syntax-highlighted code. Render unknown task content too, rather than silently hiding it.
- Board storage filter offers active tasks, completed storage, archived tasks, and all. Backlog's `completed/` and `archive/tasks/` are distinct. Archived cards remain inspectable/editable; changing status does not implicitly restore them to active storage.
- No task creation, deletion, archive/restore actions, CLI execution, Git commits, or Backlog status-hook execution in the initial scope. Preserve hook fields without executing embedded commands.

## Project and folder discovery

List BB projects including Personal. Projects without a usable source remain visible with a clear setup or unavailable state. Do not create backlog directories merely by viewing a project.

Resolve the selected project's folder in this order:

1. Explicit plugin folder override saved per BB project.
2. Backlog's root `backlog.config.yml` and its `backlog_directory` setting.
3. Existing `backlog/` or `.backlog/` at the project root, including legacy config inside that directory.

If both default folders exist, display a folder-selection state. Do not combine them or choose arbitrarily. Support folder browsing and manual paths on the source host. Persist host/source identity alongside the project-specific selection. For projects with multiple roots, show an explicit source selector and remember it; use a single selected checkout as the board's source of truth.

## Technical approach

- TypeScript server and React frontend, plus a BB host entry for watching files where the checkout lives. Verify exact signatures against installed SDK declarations before implementation.
- Scaffold with `bb plugin new backlog`. Pin Bun through mise before writing implementation code; define `dev`, `test`, and `build` tasks. Use Bun for dependencies. Run long-lived development processes in named tmux sessions.
- Use typed RPC for project discovery, board snapshots, task detail, settings, and field mutations. Store only plugin settings in BB storage; Markdown files remain authoritative for task data.
- Read/write through BB host-aware file APIs using explicit host identity, folder confinement, and `expectedSha256` conflict protection.
- Parse YAML using a document-preserving parser. Implement bounded patches for known Markdown sections rather than regenerating the whole task. Preserve unknown frontmatter, custom sections, comments, markers, and line endings.
- Validate structured values and project-configured choices. Detect malformed files, duplicate IDs, and ambiguous section markers; keep readable information visible and block unsafe mutations with a specific error.
- Watch selected task directories and config on their host. Handle creation, deletion, moves, and atomic-save renames. Coalesce bursts, publish changed snapshots through BB realtime, and reconcile on reconnect plus periodically for missed notifications.
- Target visible updates within one second after a stable filesystem change on a connected local host. Measure that target during verification; do not promise literal instantaneous delivery.
- External updates refresh cards and non-edited modal fields. Preserve active input drafts. On save conflicts, merge only provably disjoint field edits; otherwise show the current file value alongside the user's draft for resolution.
- If an agent changes the task's status to In Progress, the card moves after the file change. Starting an agent process alone is not evidence that task status changed.
- Dispose watchers, subscriptions, timers, and host resources on project changes, disconnects, plugin reload, and shutdown.

## Ordered implementation slices

### 1. Plugin page and project selection

Likely files: `package.json`, `mise.toml`, `server.ts`, `app.tsx`, `app.css`.

Acceptance: plugin builds; Backlog appears in BB navigation; right rail lists all projects and handles an empty project. Verify generated SDK types, type checking, build, and a live navigation check. Dependency: none.

### 2. Folder discovery and configuration

Likely files: `src/discovery.ts`, `src/settings.ts`, `src/FolderSettings.tsx`, `tests/discovery.test.ts`, `server.ts`.

Acceptance: both default directory conventions and root config work; explicit project overrides persist independently; ambiguous or unavailable sources have clear states. Verify with directory/config fixtures and switching between projects. Dependency: 1.

### 3. Task parsing and read-only board

Likely files: `src/task-format.ts`, `src/task-store.ts`, `src/Board.tsx`, `tests/task-format.test.ts`, `server.ts`.

Acceptance: representative upstream tasks parse correctly; configured columns and ordinal order render; storage/search filters distinguish active, completed, and archived tasks. Verify fixtures covering custom prefixes, subtask IDs, block/inline YAML, unknown content, and malformed records. Dependency: 2.

Checkpoint: install/build the page and verify real fixture data before enabling writes.

### 4. Task modal and Markdown preview

Likely files: `src/TaskModal.tsx`, `src/Markdown.tsx`, `src/TaskFields.tsx`, `app.css`, `tests/task-modal.test.tsx`.

Acceptance: all supported fields/sections are readable; Markdown renders tables, checklists, and code safely; focus, Escape, narrow layouts, and long content behave correctly. Verify component behavior and real browser screenshots. Dependency: 3.

### 5. Safe field editing

Likely files: `src/task-patch.ts`, `src/mutations.ts`, `src/TaskFields.tsx`, `tests/task-patch.test.ts`, `tests/mutations.test.ts`.

Acceptance: double-click editing saves compatible files; unrelated bytes survive; concurrent edits cannot silently overwrite another writer. Verify round-trip fixtures, CRLF, unknown sections, invalid input, changed/deleted files, comment metadata, and stale revisions. Dependencies: 3, 4.

### 6. Drag and ordering

Likely files: `src/Board.tsx`, `src/ordering.ts`, `src/mutations.ts`, `tests/ordering.test.ts`, `tests/board.test.tsx`.

Acceptance: moves persist status and ordinal; failed writes revert optimistic movement visibly; keyboard movement works. Verify reload persistence, ordering edge cases, filtered boards, and conflict recovery. Dependency: 5.

### 7. Live synchronization

Likely files: `host.ts`, `src/watch-service.ts`, `src/useBoard.ts`, `server.ts`, `tests/watch-service.test.ts`.

Acceptance: external status edits move cards without refresh; create/delete/rename and config edits reconcile; drafts survive external changes and reconnects. Verify latency target, burst writes, missed-event reconciliation, resource cleanup, and reload/disconnect behavior. Dependencies: 3, 5, 6.

### 8. Packaging and end-to-end verification

Likely files: `README.md`, `skills/backlog/SKILL.md`, `tests/backlog-flow.test.ts`, `package.json`.

Acceptance: mise test/build tasks pass; plugin installs and reloads; the full workflow works without Backlog CLI installed. Verify local and connected-host paths, light styling inside a dark BB shell, archive filtering, directory overrides, two simultaneous writers, and project switching. Document supported Backlog format revision, limitations, and troubleshooting. Dependencies: all preceding slices.

## Later sections

Add Decisions, Docs, and Plans as separate entries in the plugin's left section navigation. Reuse folder discovery, watching, Markdown rendering, and conflict-aware saves. Confirm how standalone Plans are stored before defining that format; current task implementation plans already have a known Backlog section format.

## Research references

- [Backlog CLI documentation](https://github.com/MrLesk/Backlog.md/blob/main/CLI-INSTRUCTIONS.md)
- [Example backlog](https://github.com/MrLesk/Backlog.md/tree/main/backlog)
- [Task parser](https://github.com/MrLesk/Backlog.md/blob/main/src/markdown/parser.ts)
- Installed BB plugin authoring references: navPanel, project listing including Personal, host entries, and hash-guarded file writes.

Implementation has not started. Exact installed SDK contracts and watcher transport remain implementation verification gates.
