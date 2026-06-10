# Agent Instructions

Before working in this repository, read and follow [WORKFLOW.md](WORKFLOW.md).

Key rules:

- Treat `D:\Projects\longxiang-website` as the primary development workspace.
- Treat GitHub `origin/main` as the backup and synchronization source.
- Treat `longxiang:/home/ubuntu/longxiang-website` as the deployment/server working copy.
- Do not modify both local and server copies independently.
- Before changes, check `git status` and sync from `origin/main`.
- After changes, commit and push to `origin/main`; deploy by pulling on the server.
- Do not commit `node_modules/`, `.agents/`, `backups/`, or `.env` files.
