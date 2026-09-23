# Mention Backlog tasks

In a BB composer with a project selected, type `@` and part of a task title
or full ID, or words from its description. Choose a row under **Backlog tasks** with the arrow keys and Enter.
The native composer saves the mention with the draft. Suggestions show the
original title, ID and configured status, with at most 20 matches. Any task
prefix or status is supported. Search includes `tasks/`, `completed/` and `archive/tasks/` storage.

Search uses the same project source and Backlog folder as the board, including
Folder settings and automatic discovery. An unselected/ambiguous source or
folder offers no tasks. It does not search other projects or start watches.

Sending resolves the reference again. The agent receives current task metadata,
body, project, source, host and file location, including edits made after
selection. A reference binds to the project, source ID, host, checkout root,
resolved Backlog folder and metadata ID, not its search-time content.

Missing or invalid tasks, duplicate IDs, incomplete scans, unavailable hosts,
and changed source/folder selection block send with a visible error. Repair or
restore the original task/source and retry, or remove the mention and select
it again. Search failures/timeouts contribute no results to BB's picker.

The public `bb.ui.registerMentionProvider` contract was verified against SDK
0.5.9: native title/subtitle rows, a two-second search window, persistent plugin
mentions, and send-time resolution whose errors block submission.

## Description search and previews

Search is case-insensitive across title, full ID and the entire Description
section (including text beyond the preview). Exact ID/title matches precede
partial title/ID matches, then description-only matches. Ties and empty queries
prefer active storage, then completed, then archived, followed by ID and file path. Results are capped at 20.

Each row shows title and ID, followed by the configured status, optional priority,
and up to 420 characters of description. The shared board preview helper removes
Backlog comments, code fences, common Markdown formatting and HTML tags. Missing
descriptions or priorities add no placeholder text. BB may visually truncate long
rows to fit the native picker; identity and status appear before the preview.

## Historical tasks and durable references

Completed and archived suggestions carry an explicit `Storage: completed` or
`Storage: archived` label separately from the task's configured status. An exact
historical title/ID match ranks ahead of a weaker active match.

Draft references survive changes to title, filename, status and moves among all
three task directories inside the original selected Backlog folder. Sending
finds the current file by metadata ID and supplies its latest path and content.
Changing the metadata ID itself, selecting another source/folder, or replacing
the source host/root requires restoring the original identity or reselecting.
Duplicate IDs, including case variants across storage directories, are ambiguous
and block resolution. Once the original task/host is available again, retry the
same draft; no cached task content is used.

BB controls when provider searches run. In the verified host version, an empty
query does not invoke plugin providers; type a word after `@` to show Backlog
results. The provider supplies deterministic active-first results if called
with an empty query.

## Delayed larger preview

Pause over a Backlog suggestion for 1.5 seconds to show a larger card with its
full title, status, optional priority and up to 420 characters of description.
The same delay applies to keyboard-highlighted or focused Backlog rows. Move
into the card to keep reading; Escape, selecting a task or leaving dismisses it.
Modifier keys and macOS screenshot shortcuts (Command-Shift-3/4/5) keep the
preview open. The card uses the suggestion already shown, so opening it adds no task request.
Sending still resolves the task afresh.

This is a plugin prototype using BB's public content-script lifecycle. BB 0.5.9
has no native mention-preview slot: the script recognizes the current
`Backlog tasks: …` button title and `bg-state-active` keyboard-highlight class.
That row markup is not a versioned SDK contract and may need adjustment after a
BB update. It never reads private React state or replaces the native picker.
