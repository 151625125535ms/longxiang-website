# Base Workflow

This document defines the reusable collaboration workflow for the user, Codex, and Claude.

## Roles

- User: publishes tasks, passes Markdown files between Codex and Claude, and decides whether to continue, pause, or change direction.
- Codex: reads project context, writes executable plans/specifications, revises them from Claude's review feedback, and executes only after the plan is approved or the user explicitly asks Codex to proceed.
- Claude: reviews Codex plans/specifications, identifies risks, contradictions, missing details, and implementation concerns, then writes structured feedback for Codex. Claude implements only when the user explicitly chooses that branch.

## Standard Loop

1. User publishes a task to Codex.
2. Codex reads the relevant project files and writes an executable plan or task
   specification.
3. For any task that will span multiple conversation rounds, Codex writes the
   full plan/specification to `docs/tasks/{task-id}-spec.md` and commits it
   before sending the handoff file to the user. This file is the authoritative
   source for the task. If the desktop handoff file is overwritten in a later
   round, Claude and Codex read `docs/tasks/{task-id}-spec.md` to recover the
   original plan.
4. Codex writes `C:\Users\hnlxd\Desktop\claude_check.md` asking Claude to
   review the plan, not implement it by default.
5. User sends `claude_check.md` to Claude.
6. Claude reviews the plan/specification and writes feedback to
   `C:\Users\hnlxd\Desktop\codex_check.md`.
7. User sends `codex_check.md` back to Codex.
8. Codex responds with one of the following:
   - a revised plan/specification for another Claude review round;
   - an execution plan for Codex to carry out;
   - a clarification request for the user;
   - a decision that the task is blocked or should be split.
9. Codex executes only after the plan is approved by Claude or the user
   explicitly asks Codex to proceed despite open review comments.

## Desktop Handoff Files

- `C:\Users\hnlxd\Desktop\codex_check.md`: Claude-to-Codex review feedback, questions, or risk reports. This file may be overwritten each round.
- `C:\Users\hnlxd\Desktop\claude_check.md`: Codex-to-Claude plans/specifications and review requests. This file may be overwritten each round.

Each handoff file should start with either "给 Codex 的提示词" or "给 Claude 的提示词".

## Execution Branches

The default branch is:

```text
User task -> Codex plan -> Claude review -> Codex revision or execution
```

Codex may execute code/data changes when:

- Claude has reviewed and approved the plan; or
- Claude's feedback has been incorporated and the user asks Codex to proceed; or
- the user explicitly asks Codex to skip Claude review for a simple task.

Claude may implement only when the user explicitly chooses a Claude
implementation branch for that task.

## Moving To The Next Round

A round is complete only when Codex has processed Claude's review feedback and
produced one of these outcomes:

- revised plan for another Claude review;
- approved execution plan;
- completed Codex execution with verification;
- clear blocker or user decision request.

For Admin UI batch work, also follow `docs/admin-ui/ADMIN_UI_WORKFLOW.md`.

## Task Spec Persistence

For single-round tasks (straightforward, no context risk), the desktop handoff
file alone is sufficient unless the user asks for persistence.

For multi-round tasks (complex, spans multiple conversation turns, or involves
more than one review/revision/execution cycle), Codex must:

1. Write the full task plan/specification to `docs/tasks/{task-id}-spec.md`.
2. Commit that file before sending the review request to the user.
3. Include a "必读文档" line in the handoff pointing Claude to this file.

Claude must:

1. Read `docs/tasks/{task-id}-spec.md` at the start of each new conversation
   turn before reviewing or implementing.
2. If the file is missing, ask the user to confirm the task scope before
   proceeding.

When the task is complete and accepted, the spec file may be deleted or
archived per `docs/tasks/README.md`.

## Spec Issue Escalation

If Claude finds a plan/specification is not executable, contradicts a code
boundary, or has a critical ambiguity during review or implementation, Claude
must:

1. Stop review/implementation at the blocked point — do not guess or infer
   intent.
2. Write the specific issue to `C:\Users\hnlxd\Desktop\codex_check.md` using
   the REVIEW_TEMPLATE format, with the issue clearly marked in
   "已知风险/待确认点".
3. Ask the user to forward it to Codex for clarification before resuming.

Codex must respond with either a corrected specification or an explicit
decision on how Claude should handle the ambiguity.
