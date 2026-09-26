---
id: BCKLG-16
title: Send quotes to the project's latest thread with their source
status: Done
assignee:
  - '@claude'
created_date: '2026-09-26 03:58'
updated_date: '2026-09-26 03:58'
labels:
  - frontend
dependencies:
  - BCKLG-13
type: feature
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Quoting selected text used the BB composer of whatever surface was active, which from the Backlog.MD panel is the generic new-thread draft, so passages lost their project and file context. The user wants quotes to go to the selected BB project's latest thread, or a new thread in that project when none exists, without sending, and to name the file they came from. Tasks need the same selection affordance as documents and decisions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Quoting from a document, decision or task adds the passage and its source path to the draft of the project's most recent non-archived root thread
- [x] #2 When the project has no thread, the quote goes to a new-thread draft with that project selected
- [x] #3 The message is never sent automatically
- [x] #4 Task previews offer the same select-and-add control as documents and decisions
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Shared src/quote.tsx: Quotable selection wrapper, useSendQuote (threads.list, newest root non-archived thread, pending quote in sessionStorage, toThread; otherwise addQuote on the new-thread draft plus toProject), and a PendingQuoteReceiver in the thread header slot that adds the pending quote to that thread's own draft. Source path relative to the selected checkout.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Tests: tests/quote.test.tsx (source path, latest-thread choice, routing to toThread plus receiver delivery exactly once, new-thread fallback) via the SDK app test runtime. Live: no-thread path on sparky-learn opened the new-thread composer with sparky-learn selected and the quote plus Source line; left idle 25s, no thread was created. The existing-thread path was not exercised live because the only projects with threads have no Backlog content or are the active working thread; it rests on the unit test and the SDK contract that useComposer inside a thread surface writes to that thread's draft. Two stray threads were sent during earlier testing by scripted execCommand clearing of BB's editor (not the plugin, which has no submit path); the sparky-learn one was stopped after 20s with no file changes and both were archived.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Quotes from documents, decisions and tasks now go to the project's latest thread draft (or a new-thread draft for that project) with a Source path, and are never sent. Verified with unit tests and a live no-thread check; existing-thread routing is unit-tested only.
<!-- SECTION:FINAL_SUMMARY:END -->
