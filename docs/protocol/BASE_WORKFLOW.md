# Base Workflow

This document defines the reusable collaboration workflow for the user, Codex, and Claude.

## Roles

- User: passes Markdown files between Codex and Claude, confirms whether to continue, pause, or change direction.
- Codex: reads project context, writes executable task specifications, reviews Claude's implementation, and gives acceptance or revision guidance.
- Claude: implements code according to Codex specifications, runs verification, and writes an implementation report for Codex review.

## Standard Loop

1. Codex reads the relevant project files and writes a task specification.
2. User sends the specification to Claude.
3. Claude implements the requested changes.
4. Claude writes an implementation report.
5. User sends the report back to Codex.
6. Codex reviews the implementation against the specification and decides whether it is accepted, needs small fixes, needs rework, or is ready for the next task.

## Desktop Handoff Files

- `C:\Users\hnlxd\Desktop\codex_check.md`: Claude-to-Codex instructions or implementation reports. This file may be overwritten each round.
- `C:\Users\hnlxd\Desktop\claude_check.md`: Codex-to-Claude specifications, reports, or review requests. This file may be overwritten each round.

Each handoff file should start with either "给 Codex 的提示词" or "给 Claude 的提示词".

## When Codex Writes Only Specifications

Codex should default to writing specifications, reviews, and acceptance criteria when the user is using the Claude implementation workflow.

Codex may edit code only when the user explicitly asks Codex to implement, fix, or verify something directly, or when the task is not part of the Claude handoff workflow.

## Moving To The Next Round

A round is complete only when Codex has reviewed Claude's report and marked the result accepted or clearly identified the next corrective task.

For Admin UI batch work, also follow `docs/admin-ui/ADMIN_UI_WORKFLOW.md`.
