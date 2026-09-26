# Changelog

This file lists the changes in each version of Backlog.MD.

## 1.0.0 (2026-09-25)

### Added

- A **Documents** tab and a **Decisions** tab. They list the Markdown files in
  `docs/` and `decisions/`, show each file, and let you edit it.
- File cards show the start of the first paragraph. Search also looks at this
  text.
- The front matter of a document or decision shows as one row of small items
  with icons.
- A **+** button adds selected text from a task, a document, or a decision to
  the draft of the latest thread of the project. The quote gives the path of
  the source file. The plugin never sends the message.
- A panel icon hides and shows the file list.

### Changed

- The interface uses one top bar with the project menu, the section tabs,
  **Folder settings**, and **Refresh**. The project list on the right side of
  the board is gone.
- The layout follows the width of the plugin, so it works in BB split view.
  In a narrow plugin, the file list is one row that scrolls sideways with the
  mouse wheel.
- The editor for documents and decisions wraps long lines.
- The development types use Plugin SDK 0.5.29. The plugin still needs Plugin
  SDK 0.5.9 or a later 0.5 version.

## 0.2.0 (2026-09-23)

### Added

- Mention a Backlog task in the BB composer with `@` and words from its title
  or its description. Sending the message gives the agent the current task.
- A larger preview of a task suggestion after a 1.5 second pause.

### Changed

- The plugin needs Plugin SDK 0.5.9 or a later 0.5 version.
- Dependency installation uses pnpm. Bun runs the tests and scripts.

## 0.1.0 (2026-09-21)

### Added

- A live Kanban board for the Backlog.md tasks of each BB project.
- A task view with rendered Markdown, subtasks, and inline editing of
  properties and sections.
- Drag and keyboard controls to change the status and the order of cards.
- Search, filters, and sorting for the board.
- Folder settings for each project and checkout.
