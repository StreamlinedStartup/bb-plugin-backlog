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
Backlog CLI commands are exposed by this plugin. Decisions, Docs, and Plans
are future sections; task implementation-plan sections are supported today.
