# SparklingKit (personal fork)

This is MovieMaker93's fork of stevibe/SparklingKit, run on one DGX Spark (`ssh spark`). Branch
`polish-ui` is PR #1 on https://github.com/MovieMaker93/SparklingKit.

Start every session by reading the docs:

- **`docs/plan.md`:** decisions, what is done, the remaining steps (the GPU-window validation on the
  Spark) and the backlog.
- **`docs/fork.md`:** what this fork adds and how to run it.

## Rules

- Commit as `git -c user.name=MovieMaker93 -c user.email=fortunato.alfonso93@gmail.com commit ...`, with
  no Co-Authored-By trailer and no "Generated with Claude Code" line.
- Push, open or edit PRs, and post comments only after the user's explicit OK for that action. Never
  open PRs against stevibe/SparklingKit unless asked.
- Never stop the Spark's always-on LLM (`qwen38-flash-next-tf`, :8888) without asking. Switch stacks with
  `scripts/spark-switch.sh`, which checks it is idle and confirms first.
- `gh` exists only on the Spark: `~/.local/share/codex-tools/gh-2.96.0/gh_2.96.0_linux_arm64/bin/gh`.

## Checks

- `npm run typecheck`
- `npx vitest run`. On Windows, 8 tests in `src/server/dgx-update.test.ts` fail before any change (GNU
  tar reads `C:` as a host).
- Python adapter tests (no GPU needed): see "Development notes" in `docs/plan.md`.
- UI changes:
  - Run `node scripts/seed-dev-data.mjs`, then `npm run dev` with Redis on :6379.
  - Check pages in both themes at 1440 and 375 px.

## Gotchas

- This checkout lives in OneDrive. `git status` may list unchanged files; trust `git diff`.
- Line endings are LF (`core.autocrlf=false`).
- Don't put regex backslashes inside `node -e` or heredoc one-liners; they get eaten. Write the script to
  a file or use the Edit tool.
