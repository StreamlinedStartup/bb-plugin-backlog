## Track work across projects

Open Backlog.MD from BB navigation to see your project's Backlog.md tasks in
configured status lanes. Switch projects and checkouts, search task content,
filter by status, priority, assignee or label, and sort in either direction.
Cards show description previews, labels, assignees and checklist progress.

## Edit the task where you read it

Open a card for rendered Markdown, linked subtasks and task properties.
Double-click an editable property or section heading, then Save or Cancel.
Keyboard users can activate the same editors. Move cards between lanes or
reorder them by dragging or using keyboard shortcuts.

Task Markdown stays authoritative. Writes preserve unrelated fields and
sections, merge disjoint edits, and show conflicts when edits overlap.
Live refresh follows file changes while keeping active drafts open.

## Mention tasks in chat

Type `@` and words from a task title or description in BB's composer. Choose
from Backlog tasks in the current project's selected source and folder,
including completed and archived work. Suggestions show status, priority when
set, and a description. Pause for 1.5 seconds to read a larger preview.
Sending reads the task again to give the agent its current content.

## Requirements and limits

Requires BB 0.43 or later with Plugin SDK 0.5.9 through 0.5.x, and an existing
Backlog.md task folder on an enrolled host. No Backlog CLI, external account,
API key or paid service is required. The plugin reads and edits task files
through BB and stores project selections in BB storage.

The interface is light-only. macOS has been tested; Windows host paths have
not been verified. The plugin uses experimental BB host and provider APIs.
Task creation, deletion, archive and restore actions are not included.
It does not run task hooks or Git commands.

## Acknowledgments

This is an independent BB plugin, not affiliated with or endorsed by the
official [Backlog.md project](https://github.com/MrLesk/Backlog.md).
We are grateful to its maintainers and contributors for their work.
