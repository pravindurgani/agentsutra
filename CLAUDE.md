# AgentSutra Runtime v9.0.0 — frozen historical reference

> **Archive notice:** The Mac mini that hosted this Runtime was reset. This code is unsupported,
> receives no feature development and is not presented as a current operational system. The active
> flagship is the evidence-led publication in [`publication/`](publication/). The material below is
> retained for provenance and study only.

Single-user, self-hosted AI agent. Telegram-controlled. Mac Mini M2 (16GB).
Fixed 5-stage LangGraph pipeline: Classify → Plan → Execute → Audit → Deliver.
Sonnet generates, Opus audits. ~8,165 LOC / 23 files. ~829 tests (804 passing).
Full detail: cat REFERENCE.md

## Architecture

    [Telegram] → bot/handlers.py → brain/graph.py (LangGraph StateGraph)
                                        ↓
                  classify → plan → execute → audit → deliver
                                      ↑         |
                                      +- retry --+ (max 3)

## File Map (abbreviated)

| File                        | Purpose                                                                                |
| --------------------------- | -------------------------------------------------------------------------------------- |
| `main.py`                   | Entry point, env validation, DB init, SIGTERM handler                                  |
| `config.py`                 | All constants, paths, model names, budget caps                                         |
| `brain/state.py`            | AgentState TypedDict — 25 fields                                                       |
| `brain/graph.py`            | LangGraph wiring, run_task(), stage tracking                                           |
| `brain/nodes/classifier.py` | Fast path → slow path classify                                                         |
| `brain/nodes/planner.py`    | Task prompts, RAG injection, 7 templates                                               |
| `brain/nodes/executor.py`   | Code gen, sandbox execution, truncation detection                                      |
| `brain/nodes/auditor.py`    | Opus adversarial review, fabrication detection                                         |
| `brain/nodes/deliverer.py`  | Response formatting, credential filter, memory                                         |
| `tools/sandbox.py`          | AST scanner, subprocess allowlist, Docker, Tier 1-4                                    |
| `tools/deployer.py`         | GitHub Pages / Vercel / Firebase deploy; _git_with_askpass() for authenticated git ops |
| `tools/rag.py`              | LanceDB, Ollama embeddings, AST chunking                                               |
| `tools/model_router.py`     | Claude/Ollama routing by complexity + budget                                           |
| `tools/claude_client.py`    | Anthropic API wrapper, cost tracking                                                   |
| `storage/db.py`             | SQLite WAL, 5 tables, threading.Lock                                                   |
| `bot/handlers.py`           | 19 Telegram command handlers, auth                                                     |

## Core Invariants

1. Pipeline is FIXED at 5 stages. Never add or remove a stage.
2. Opus ALWAYS audits. Never route audit to Sonnet or Ollama.
3. Pipeline nodes are synchronous. No async inside nodes.
4. Every feature degrades gracefully. Nothing crashes delivery.
5. Workspace is sandboxed. Code only runs inside workspace/.
6. Path containment checks use Path.relative_to() in try/except ValueError — never
   str.startswith(). The latter has a prefix-collision bypass (e.g. /workspace_evil
   passes a /workspace check).
7. Git authenticated operations (clone, pull, push) use _git_with_askpass(). Token
   never appears in URLs or script bodies — passed via DEPLOY_TOKEN env var only.
   git add and git commit use bare env (local ops, no auth needed).
8. sandbox.py language scanner is fail-closed: only python, bash, and javascript are
   allowed. Unknown languages are BLOCKED, not skipped — they execute as Python at
   the interpreter fallback (sandbox.py:1402), making no-scan + full execution the
   worst combination.

## Historical roadmap — not active

- Former v9.1 proposal: project memory system (SQLite project_index table)
- Former v9.2 proposal: plan decomposition (structured task graph)
- Unscheduled historical ideas: per-task cost tracking, Ollama health check, audit feedback loop

These items are preserved as historical context only. The Runtime is frozen and unsupported.

## Test Gate

`pytest tests/ -v -k "not docker"` must pass before AUDIT. Use `gate` alias.

On a bare pyenv without the project venv, ~25 tests will fail to collect (missing
aiosqlite, langgraph, yaml). 5 asyncio tests in test_db.py fail due to missing
pytest-asyncio — pre-existing, confirmed via git stash round-trip. Install project
venv first.

## Pane Workflow

| Pane   | Model                   | Does                              | Never does                              |
| ------ | ----------------------- | --------------------------------- | --------------------------------------- |
| AUDIT  | Opus/high/plan          | Find defects in specified files   | Write code, edit files                  |
| IMPL   | Sonnet/high/acceptEdits | Write code, run tests             | Architectural decisions, schema changes |
| PLAN   | Sonnet/low              | Design decisions, task breakdowns | Write code, edit files                  |
| PROMPT | Sonnet/medium           | Write/audit prompts               | Write application code                  |

**Handoffs:** PLAN→IMPL: paste Section 4. IMPL→AUDIT: file list + gate pass. AUDIT→IMPL: findings verbatim, CRITICAL/HIGH only first pass.

## Session Log

Append to SESSION_LOG.md. Format: `### YYYY-MM-DD — task` / `Done:` / `Decisions:` / `Next:`

## Architecture Decisions

[PLAN outputs entries here — paste manually after each session]
