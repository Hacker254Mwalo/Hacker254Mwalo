# CONTEXT.md — Project Rules

These rules apply to every task performed on this repository.

## 1. src/lib/db.js — Never Delete or Alter Exports

Never delete, alter, or overwrite any existing `export` in `src/lib/db.js`. All new functions must be **appended to the bottom** of the file. Do not refactor, rename, or modify existing function bodies.

## 2. Be Extremely Concise

All responses must be brief and direct. No conversational filler, no long explanations, no unnecessary repository scans. State what was done in one or two sentences.

## 3. Build Failures — Stop and Ask

If a Vercel or other build fails, **stop immediately** and ask the user for guidance. Do not enter a trial-and-error loop of fixes and re-pushes.

## 4. Never Force-Push Without Explicit Permission

Never use `git reset --hard` or `git push --force` unless the user explicitly requests it.
