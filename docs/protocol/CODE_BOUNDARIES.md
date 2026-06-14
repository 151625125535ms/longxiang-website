# Code Boundaries

This document lists global project boundaries. Specialized task documents remain authoritative for their own areas.

## Global Boundaries

- Do not change the database schema unless the user explicitly approves it.
- Do not change public API response structures, including `GET /api/education`.
- Do not change the `education` `body_json` schema or introduce `_en`, `_ar`, or `_cn` fields.
- Do not add `education` schema conversion, mapping, or transform functions.
- Keep content block payload structures compatible.
- Do not modify public website pages unless the task explicitly requires it.
- Do not commit `node_modules/`, `.agents/`, `backups/`, or `.env` files.
- Do not use `--no-verify` and do not force push.

## Specialized Constraints

- CMS constraints: see `docs/cms/CMS_INVARIANTS.md`.
- Admin UI workflow and constraints: see `docs/admin-ui/ADMIN_UI_WORKFLOW.md`.
