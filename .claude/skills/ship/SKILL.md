---
name: ship
description: Tidy the project (file layout, code structure, .gitignore), update README.md, then commit and push to Git end to end. Use when the user says "ship", "/ship", "จัดระเบียบแล้ว push", "update readme and push", or wants a full organize + document + push pass. Requires a branch; requires a repo URL on the first push.
argument-hint: "--branch <name> [--repo <url>] [--message <commit message>]"
disable-model-invocation: true
---

# ship — organize, document, push

Arguments: `--branch <name>` (always required) and `--repo <url>` (required only when the project has no `origin` yet, i.e. the first push). `--message` is optional.

## 0. Preconditions (stop and ask if any fails)

1. **Branch**: if `--branch` is missing, ask the user which branch. Never default to `main` silently.
2. **Repo**: run `git remote -v`.
   - No git repo / no `origin` → `--repo` is mandatory; if missing, ask. Then `git init -b <branch>` (if needed) and `git remote add origin <url>`.
   - `origin` exists → ignore `--repo` unless it differs from origin; if it differs, ask before changing anything.
3. Run `git ls-remote origin` (when a remote exists). If it errors with auth/not found, report it and stop.
4. Branch handling: if `<branch>` exists locally, check it out; if it exists only on the remote, check it out tracking it; otherwise create it from the current HEAD. If the working tree has changes that would be lost by switching, stop and ask.

## 1. Organize files and code structure

Look first (`git status`, directory tree, imports) and write a short plan **before moving anything**. Show the plan to the user and wait for approval when it moves or deletes tracked files. Safe, no-approval actions: adding `.gitignore` entries, adding `.gitkeep` to empty folders, removing `__pycache__`/`*.pyc` from the index.

Project conventions (keep them, do not invent new layers):
- `Data_Preprocess/` pre-labeling → Label Studio; `Data_Pipeline/` export → YOLO-pose dataset; `Train/`; `Evaluate/`; `Inference/`; `docs/`.
- One script = one job; shared helpers stay in the package that owns them; no duplicated copies of a module.
- Use `git mv` so history follows; after any move, grep for the old path (imports, README, notebooks, configs, tests) and fix every reference.
- Never delete files the user did not create or that you have not read.

**Never commit** (add to `.gitignore` and untrack if needed): `.env` (keep `.env.example`), raw photos / datasets / `output*/` folders / zip files, model weights (`*.pt`), `mlruns/`, `mlartifacts/`, `mlflow.db`, `__pycache__/`, logs, notebook checkpoints, any file > 50 MB, anything that looks like a token or credential (grep the staged diff for `token`, `secret`, `api_key`, `password`). If something sensitive is already tracked, tell the user — do not rewrite history yourself.

Then verify nothing broke: run the project's own checks that exist and are cheap (e.g. `python Data_Pipeline/test_pipeline.py`, `python Train/test_train.py`, `python -m py_compile` on changed files). Report failures; do not push on red.

## 2. Update README.md

- Update the layout tree, the usage commands, and any section describing what changed (new scripts, moved files, new config keys, new results/versions). Read the code or config rather than trusting the old README.
- Keep the README's language and tone; do not rewrite sections that are still correct.
- Never put secrets, tokens, local absolute paths, or personal data in it.
- If `Train/README.md` or other sub-READMEs mention changed behaviour, update them too.

## 3. Commit

1. `git status` and `git diff --stat`; stage **explicit paths** (no blind `git add -A` when untracked data folders exist). Re-check `git diff --cached --name-only` for large or sensitive files.
2. Commit message: `--message` if given, else a concise summary of what changed (imperative, one line, optional short body). Split into logical commits when the change mixes a restructure with feature work. End the message with the attribution line from the session's system reminder, if one is present.
3. Never use `--no-verify`. If a hook fails, fix the cause.

## 4. Push

- First push: `git push -u origin <branch>`.
- Later pushes: `git push origin <branch>`.
- **Never** `--force`, never push to a branch other than the one given, never rewrite remote history. If the push is rejected (non-fast-forward), `git pull --rebase origin <branch>`, resolve conflicts carefully (or stop and ask), re-run the checks, and push again.
- Confirm with `git ls-remote origin <branch>` that the remote tip equals local `HEAD`.

## 5. Report

Final message, short: branch, repo, commit hash(es), what was moved/ignored/updated in the README, the checks that ran and their result, and anything skipped or risky (large files left untracked, sensitive files found, failing checks).
