---
name: backlog
description: Work with the Markdown tasks displayed by the BB Backlog.MD board.
---

# Backlog.MD board

Backlog.MD adds a Tasks Kanban page to BB navigation. It discovers `backlog/`,
`.backlog/`, and `backlog_directory` in root `backlog.config.yml`. A user may
select a different folder per BB project and checkout in Folder settings.

Task Markdown files are authoritative. The plugin does not require or invoke
the Backlog.md CLI. Agent-written changes are watched and refresh the board.
Follow the project task-management workflow when updating status, including
its CLI requirements. A changed YAML status moves the card. Starting an
agent alone does not change task status.

Read the current file before editing. Preserve IDs, unknown frontmatter,
structured section markers, comment metadata, and custom Markdown. Use the
project configured statuses in `backlog.config.yml` or the selected folder
`config.yml`. Preserve the original line endings. Avoid replacing another
writer’s changes. UI saves use hash guards and report conflicting fields.

`tasks/`, `completed/`, and `archive/tasks/` are separate storage locations.
Changing status does not restore archived tasks. The board provides storage
filters and numeric `ordinal` ordering, including keyboard move controls.

No task creation, deletion, archive/restore, status hooks, Git actions, or
Backlog CLI commands are exposed by this plugin. The Documents and Decisions
tabs read and edit Markdown in `docs/` and `decisions/` of the same folder;
their saves use the same hash guards. Standalone Plans have no tab.

A user can quote selected text from a task, document, or decision into the
project's latest thread draft. The quote ends with a `Source:` line holding
the file path relative to the checkout; read that file for full context.

## Composer mentions

Use `@` in a project composer to find active, completed and archived tasks by title, full ID or description
under **Backlog tasks**. Search uses the board's selected project source/folder;
no prefix knowledge is required. Select with arrow keys and Enter. Drafts retain
the reference; sending reads fresh metadata, body and project/source/file context.
Missing/duplicate/invalid tasks, incomplete scans, changed source/folder selection
and unavailable hosts block send. Restore the original reference and retry or
remove and reselect the mention. See `docs/task-mentions.md` for details.

Suggestions show status, optional priority and a short plain-text description.
Exact ID/title matches rank first, partial title/ID next, description-only last;
Storage (active first), then ID/path break ties and order empty queries. At most 20 suggestions are returned.

Historical suggestions label storage separately from status. Existing draft
references survive title/filename changes and moves among task directories in
the original folder. Changing the task ID, source, host/root or Backlog folder
requires restoring the original reference or selecting again. Retry after host
reconnection or task restoration reads current content. BB may require a
nonempty query before asking plugin providers for suggestions.

Pause over a Backlog suggestion, or leave it keyboard-highlighted, for 1.5
seconds to read a larger preview (up to 420 description characters). Escape or
selection dismisses it. This content-script prototype depends on BB 0.5.9's
suggestion-row markup; native preview support should replace that dependency
when available. It uses the row's existing text and adds no task fetch.
