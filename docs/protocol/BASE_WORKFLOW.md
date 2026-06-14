# Base Workflow

This document defines the reusable collaboration workflow for the user, Codex, and Claude.

## Roles

- User: passes Markdown files between Codex and Claude, confirms whether to continue, pause, or change direction.
- Codex: reads project context, writes executable task specifications, reviews Claude's implementation, and gives acceptance or revision guidance.
- Claude: implements code according to Codex specifications, runs verification, and writes an implementation report for Codex review.

## Standard Loop

1. Codex reads the relevant project files and writes a task specification.
2. For any task that will span multiple conversation rounds, Codex writes the
   full specification to `docs/tasks/{task-id}-spec.md` and commits it before
   sending the handoff file to the user. This file is the authoritative source
   for the task. If the desktop handoff file is overwritten in a later round,
   Claude reads `docs/tasks/{task-id}-spec.md` to recover the original spec.
3. User sends the specification to Claude via the desktop handoff file.
4. Claude reads `docs/tasks/{task-id}-spec.md` at the start of each new
   conversation turn to confirm the task scope before implementing.
5. Claude implements the requested changes.
6. Claude writes an implementation report.
7. User sends the report back to Codex.
8. Codex reviews the implementation against the specification and decides
   whether it is accepted, needs small fixes, needs rework, or is ready for
   the next task.

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

## Task Spec Persistence

For single-round tasks (straightforward, no context risk), the desktop handoff
file alone is sufficient.

For multi-round tasks (complex, spans multiple conversation turns, or involves
more than one implementation-review cycle), Codex must:

1. Write the full task specification to `docs/tasks/{task-id}-spec.md`.
2. Commit that file before sending the handoff to the user.
3. Include a "必读文档" line in the handoff pointing Claude to this file.

Claude must:

1. Read `docs/tasks/{task-id}-spec.md` at the start of each new conversation
   turn.
2. If the file is missing, ask the user to confirm the task scope before
   proceeding.

When the task is complete and accepted, the spec file may be deleted or
archived per `docs/tasks/README.md`.

## Spec Issue Escalation

If Claude finds a specification is not executable, contradicts a code boundary,
or has a critical ambiguity during implementation, Claude must:

1. Stop implementation immediately — do not guess or infer intent.
2. Write the specific issue to `C:\Users\hnlxd\Desktop\codex_check.md` using
   the REVIEW_TEMPLATE format, with the issue clearly marked in
   "已知风险/待确认点".
3. Ask the user to forward it to Codex for clarification before resuming.

Codex must respond with either a corrected specification or an explicit
decision on how Claude should handle the ambiguity.
