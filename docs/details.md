# Backlog.MD details

This page gives the technical details of Backlog.MD. For an overview, read
the [README](../README.md).

## Requirements

- BB 0.43 or later.
- BB Plugin SDK 0.5.9 or a later 0.5 version.
- A BB project with a [Backlog.md](https://github.com/MrLesk/Backlog.md)
  folder on an enrolled host.

You do not need the Backlog CLI, an external account, or an API key. The
plugin does not create a Backlog folder. The interface has a light theme only.
We tested the plugin on macOS. We did not test Windows host paths. The plugin
uses experimental BB host and provider APIs.

## Folder selection

The plugin finds the Backlog folder of the selected checkout in this order:

1. A custom folder from **Folder settings**.
2. The `backlog_directory` value in `backlog.config.yml` at the checkout root.
3. An existing `backlog/` or `.backlog/` folder.

If both default folders exist, select one in **Folder settings**. If a project
has more than one BB source, select one checkout. The plugin keeps the host ID
and the source path with your selection. A project without a source, or with
an offline host, stays in the project menu with an explanation.

**Folder settings** accepts a relative or an absolute path. The folder can be
outside the checkout, but it must be a real directory. **Browse on source
host** opens a folder picker on the host of the source. The plugin skips task,
document, and decision symlinks and reports them.

The root `backlog.config.yml` has priority over a `config.yml` in the task
folder. The plugin checks statuses, priorities, task types, and project names
against the configuration when you edit them. A task with an unknown status
shows in its own lane, so you can correct it.

## File safety

The Markdown files are the only source of truth. BB storage keeps only your
project and folder selections.

- A save changes only the edited value or the inside of the edited section.
  Other YAML fields, custom Markdown, section markers, comment data, and line
  endings stay the same. You cannot edit YAML values that use anchors.
- Before each save, the plugin reads the file again. It checks the task
  identity and the SHA-256 hash of the file. If the file changed, the plugin
  merges changes that do not overlap. For changes that overlap, it shows the
  current file next to your draft. There is no force-overwrite option.
- The plugin does not change a task that is deleted, malformed, duplicated, or
  not verified.
- Drafts stay in the browser session storage until you save or cancel. If you
  open the task or file again in the same session, the plugin restores the
  draft. The browser warns you before you leave a page with a draft.

The order of cards comes from numeric `ordinal` values. If cards in a lane have
no ordinal or have the same ordinal, the plugin gives them values in their
current order. Each of these writes is checked separately. Then the moved card
gets a value between its neighbors. If no value fits between two numbers, the
plugin shows an error.

Host watches send file changes to the board through BB realtime. A check every
five seconds catches missed changes. An idle watch closes after 35 seconds. The
plugin never runs task hooks or Git commands.

## Format and limits

We verified the task format against Backlog.md CLI 1.52.0 and upstream revision
`aded8e254e6a0205b878cf07e631d1a592782040` (2026-09-17).

You can edit these task fields: title, status, type, priority, assignee,
reporter, labels, milestone, due date, project, dependencies, references,
documentation, and modified files. ID fields and calculated fields are read
only.

You can edit these task sections: Description, Acceptance Criteria, Definition
of Done, Implementation Plan, Implementation Notes, Final Summary, and each
comment. Comment editing needs the Backlog comment markers. Custom sections
show in the preview. Edit custom sections with your own tools.

Limits:

- 512 KiB for each Markdown file.
- 5 MiB of task text for one board.
- 3000 task files, 1000 documents, and 1000 decisions.
- 100 directories and 16 directory levels.

When a task scan reaches a limit, the plugin blocks task writes. When a
document or decision scan reaches a limit, the file list shows a warning.
Remote images show as their alt text. The plugin does not run raw HTML. The
plugin supports POSIX host paths.

The plugin does not create, delete, archive, or restore tasks. It does not run
the Backlog CLI, Git commands, or status hooks. Standalone Backlog plans do not
have their own tab. Task implementation plans show on the task.

## Development

The project uses pnpm 12.4.2 for dependencies, Bun 1.4.2 for tests and
scripts, and Plugin SDK 0.5.29 for types. BB supplies React when the plugin
runs. The test dependencies supply React for local tests. For more details,
read [dependency management](development.md).

```sh
mise install
mise run install
mise run test
mise run typecheck
mise run build
bb plugin install . --yes
```

Start the development watcher in a named session:

```sh
tmux new-session -d -s backlog-dev 'mise run dev'
```

`mise run verify-live` tests the installed plugin with temporary files in
`.test-results/`. It changes the selection of this project for the test and
restores it at the end. Do not run it while you edit a task of this project.
The JSON report covers discovery, storage, guarded writes, conflict recovery,
and the speed of the host watch.

BB downloads a build toolchain on the first build. In a sandbox, set
`MISE_DATA_DIR`, `MISE_CACHE_DIR`, and `MISE_STATE_DIR` to writable
directories. An isolated `BB_DATA_DIR` can keep the build toolchain.

This repository uses the Backlog CLI to track plugin development. The rules are
in AGENTS.md.

## Troubleshooting

If tasks or files are missing, check **Folder settings** and the source host.
Then read the warning on the page. To read the runtime logs, run
`bb plugin logs backlog`.

Assignee badges show Codex and Claude, including Claude Code, with their BB
provider icons. Other assignees show their first two letters.
