# Ultimate Test Suite Audit — Freshness & Benchmark Assessment

**Date:** 2026-03-10
**Suite version:** v9.0.0 (89 tests across 18 tiers)
**Audited against:** AgentSutra codebase at commit 22b3570 (post-Batch 2)

---

## Part 1: Is It Up-to-Date?

**Overall: 83% accurate.** 89 tests, mostly correct, with 8 discrepancies found.

### Discrepancies Found

| # | Location | Claim | Actual | Severity |
|---|----------|-------|--------|----------|
| 1 | Header (line 15) | "90 tests" | 89 test entries (Test 1.1–18.10) | Low |
| 2 | Test 9.2 (line 518) | "routes classify/plan to local model" at 70% budget | Post-Batch 1: only **plan** is budget-escalated, not classify | **Medium** — stale after Batch 1 fix |
| 3 | Test 18.4 (line 897) | "~40 safe stdlib modules" in importlib allowlist | Actual: **54 modules** in `_IMPORTLIB_SAFE_MODULES` | Low |
| 4 | Test 3.9 (line 228) | Safe commands: "pip, python, python3, git, ls, cat, echo, npm, node, head, tail, wc" | Actual also includes **pip3** and **ollama** (14 total) | Low |
| 5 | Test 17.11 (line 850) | `was_refused` counted at `handlers.py:1175` | Actual line: **1189** | Low |
| 6 | Test 12.1 (line 605) | Logs show `VISUAL VERIFICATION: Page loads: True` | Actual log format: `Visual check for {id}: loads={bool}, status={int}`. The "VISUAL VERIFICATION" string is in the audit prompt, not the log. | Low |
| 7 | Strengths §2 (line 1034) | "nine distinct layers" of security | Lists 9 but the count is a summary claim — accurate | None |
| 8 | Test 9.2 (line 520) | "70% triggers automatic Ollama routing for low-complexity tasks" | Correct for plan, but says "classify/plan" which is stale | Same as #2 |

**Only #2 is functionally wrong** — Test 9.2's description still says classify is budget-escalated. This was fixed in Batch 1.

---

## Part 2: Realistic Performance Benchmark

Based on codebase analysis against all 89 tests.

### Expected Results Summary

| Tier | Tests | Expected Pass | Expected Fail | Conditional |
|------|------:|:-------------:|:-------------:|:-----------:|
| 1 — Pipeline Fundamentals | 5 | 4 | 0 | 1 |
| 2 — v8.0–v8.4 Features | 7 | 6 | 0 | 1 |
| 3 — Security Hardening | 10 | 10 | 0 | 0 |
| 4 — Resilience & Error Handling | 5 | 4 | 0 | 1 |
| 5 — System Commands | 6 | 6 | 0 | 0 |
| 6 — /retry Command | 3 | 3 | 0 | 0 |
| 7 — Context & Memory | 3 | 2 | 0 | 1 |
| 8 — Web Access & APIs | 3 | 2 | 0 | 1 |
| 9 — Budget & Resources | 3 | 3 | 0 | 0 |
| 10 — Deployment Pipeline | 4 | 3 | 0 | 1 |
| 11 — Server Management | 4 | 4 | 0 | 0 |
| 12 — Visual Verification | 3 | 2 | 0 | 1 |
| 13 — Docker Isolation | 2 | 2 | 0 | 0 |
| 14 — Real-World Projects | 3 | 1 | 1 | 1 |
| 15 — Stress & Edge Cases | 4 | 3 | 0 | 1 |
| 16 — Ceiling Tests | 3 | 1 | 1 | 1 |
| 17 — v8.7–v8.8 Features | 11 | 10 | 0 | 1 |
| 18 — v9.0.0 Features | 10 | 9 | 0 | 1 |
| **TOTAL** | **89** | **75** | **2** | **12** |

**Projected: 75 PASS, 2 FAIL, 12 CONDITIONAL (depend on runtime factors)**

### Likely Failures

| Test | Why It Will Likely Fail | Root Cause |
|------|------------------------|------------|
| **14.3** — Chain with Real Project | Step 1 runs igaming project. Without `run_instructions` in YAML (Batch 3 not done yet), planner generates `python run_pipeline.py` without required CLI flags → step fails → chain halts. | Missing `run_instructions` field — Batch 3 Phase 3b prerequisite |
| **16.2** — Multi-Step Full-Stack Build | 3-step chain: FastAPI → pytest → run tests. Step 3 almost always fails because tests don't exactly match the API contract from step 1. The test suite itself acknowledges this: "If it passes cleanly, that's remarkable." | LLM consistency across chain steps — architectural limitation |

### Conditional Tests (Runtime-Dependent)

| Test | Condition | Pass If... | Fail If... |
|------|-----------|-----------|-----------|
| **1.3** | Frontend complexity | Drag-and-drop + dark mode + stats all work | Retry loop exhausts on drag-and-drop JS |
| **2.6** | Ollama availability | Ollama running + RAM < 75% | Ollama down → falls back to Claude (still passes, different routing) |
| **4.4** | Auto-install | All 5 packages have binary wheels | `--only-binary :all:` rejects a source-only package |
| **7.2** | Project memory | Second run within 2hr window | First run fails → no memory stored |
| **8.3** | External APIs | All 3 APIs (CoinDesk, Open-Meteo, HN) respond | Any API down or changed |
| **10.1** | Deploy infra | Firebase/Vercel token valid + service up | Invalid token → deploy fails (task still completes) |
| **12.3** | Chart.js CDN | CDN loads in headless Chromium | CDN blocked or timeout |
| **14.1** | Project setup | Work Reports Generator properly registered | Project path wrong on Mac Mini |
| **15.3** | Memory pressure | 1M rows × 20 cols fits in 16GB | OOM or timeout at 120s |
| **16.1** | Frontend ceiling | Bookmark manager under ~500 lines, all features work | Drag-and-drop + keyboard shortcuts half-implemented |
| **17.7** | Timeout config | Progress messages visible during 60s sleep | Default 120s timeout fires before 300s checkpoint |
| **18.3** | Ollama + RAM | Ollama available for low-complexity plan routing | Ollama down → both route to Claude |

### What To Watch For During Testing

**High-Risk Areas (most likely to surprise you):**

1. **Ollama empty responses** — qwen2.5:7b is untested in production. Monitor `/health` Ollama stats after first few tasks. If empty response rate > 10%, the model may need warming or the retry logic will be tested hard.

2. **RAM pressure with dual models** — qwen2.5:7b (~4.5GB) + deepseek-r1:14b (~9GB) = ~13.5GB on 16GB M2. If a classify call is immediately followed by a plan call, both models may be loaded simultaneously. Watch `vm_stat` during Tests 18.1 and 18.3.

3. **Chain artifact passing** — Tests 2.2 and 14.3 depend on `{output}` substitution working across steps. If step 1 produces unexpected artifact paths, step 2's `{output}` reference breaks silently.

4. **External API fragility** — Tests 8.1, 8.2, 8.3, 16.3 hit live APIs (HN, Wikipedia, CoinDesk, Open-Meteo, GitHub). Any API change, rate limit, or downtime causes a test failure that's not AgentSutra's fault.

5. **HTML truncation edge** — Test 18.7 intentionally pushes close to max_tokens. If the model generates >400 lines, truncation detection fires. The retry with shorter prompt may produce a simpler app. Watch for quality degradation on retry.

---

## Part 3: Strengths & Limitations

### Strengths (Code-Verified)

| # | Strength | Evidence | Confidence |
|---|----------|----------|:----------:|
| 1 | **Cross-model adversarial auditing works** | Every task goes through Sonnet→Opus with XML-delimited prompts. Fabrication detection, data sanity checks, visual context. Tests 1.4, 4.2, 4.3 validate this. | Very High |
| 2 | **Security is genuinely deep** | 9 distinct layers verified in code: Tier 1 (39 patterns), Tier 1+ (full-text scan), AST folding, smart subprocess (14 cmds), smart importlib (54 modules), shutil.rmtree AST, written-file scan, credential strip, Opus gate. All 10 Tier 3 security tests should pass. | Very High |
| 3 | **Honest failure reporting** | `was_refused` executor guard skips code gen entirely (`executor.py:243-249`). Deliverer enforces "if FAILED, say FAILED". Fabrication detection in auditor. Tests 4.2, 4.3, 17.9, 18.8. | Very High |
| 4 | **Graceful degradation everywhere** | RAG falls back to legacy file selector. Ollama falls back to Claude. Deploy failure doesn't crash task. Budget exceeds don't crash. Every `try/except` logs and continues. | Very High |
| 5 | **Partial state preservation** | Plan, audit verdict, stage timings all persisted per node (`graph.py`). `/status` shows full diagnostic chain on failure. Test 15.4. | High |
| 6 | **Duplicate retry detection** | `should_retry()` compares first 150 chars of audit feedback (`graph.py:75-76`). Saves 60-120s on unrecoverable failures. Test 18.6. | High |
| 7 | **Purpose-dependent model routing** | Classify → qwen2.5:7b (fast, no think overhead), Plan → deepseek-r1:14b (reasoning quality). Budget escalation only for plan, never classify. | High |
| 8 | **Trigger context-awareness** | Mention-context words ("about", "for", "featuring") suppress project triggers. Prevents false routing. Test 18.2. | High |

### Limitations (Honest Assessment)

| # | Limitation | Impact | Mitigation |
|---|-----------|--------|------------|
| 1 | **No audit feedback injection on retry** | Executor regenerates blind — doesn't receive Opus's critique. Duplicate detection prevents *wasted* retries but doesn't help the executor *learn*. | Highest-ROI roadmap item |
| 2 | **Single-file frontend ceiling ~500 lines** | Beyond 500 lines, Claude loses coherence: half-implemented features, conflicting event handlers. Test 16.1 is at the boundary. | Use chains to build incrementally |
| 3 | **Context evaporates between sessions** | Project memory stores success/failure patterns but no architectural understanding. Restart the bot and the planner loses everything. | Start sessions with context-setting preamble |
| 4 | **RAG is Python-only** | AST chunking only works for `.py` files. JS/TS/Go files are injected whole, no function-level semantic search. | Tree-sitter chunking planned for v9.x |
| 5 | **Opus audit tax is unavoidable** | 60-75% of cost is Opus audit. Every task pays it regardless of complexity. No cost-aware audit routing exists. | Batch more work per task, not more tasks |
| 6 | **No rollback for project file writes** | Agent can modify real codebases. No undo, no pre/post file state tracking. Relies entirely on git. | Always work on git branches |
| 7 | **Auto-install fragility** | `--only-binary :all:` rejects source-only packages. pip name mapping misses edge cases (`cv2` → `opencv-python`). | Pre-install common packages |
| 8 | **qwen2.5:7b untested in production** | Zero production data on classify quality, empty response rate, or latency. The 111 empty responses from deepseek-r1:14b may or may not recur. | Monitor `/health` Ollama stats closely during first week |

### Key Risk: First Production Run of qwen2.5:7b

This is the **single biggest unknown**. The v8.8.0 test run showed 111 empty Ollama responses in 10 hours with deepseek-r1:14b (mostly from `<think>` blocks). qwen2.5:7b doesn't use `<think>` blocks, which should eliminate that failure mode. But:

- No production latency data yet
- No classification accuracy comparison vs Claude
- RAM coexistence with deepseek-r1:14b untested on 16GB M2
- Ollama model-switching latency unknown (loading qwen → unloading → loading deepseek)

**Recommendation:** Run the smoke test (Batch 3 Phase 3d) with extra logging. Check `/health` after every 5 tasks for the first day. If empty response rate > 5%, investigate whether qwen2.5:7b needs a different Ollama configuration.

---

## Discrepancies to Fix in Ultimate_Test_Suite.md

| Priority | Fix |
|----------|-----|
| **Medium** | Test 9.2 line 518: "routes classify/plan to local model" → "routes plan to local model" (classify excluded in Batch 1) |
| Low | Header line 15: "90 tests" → "89 tests" |
| Low | Test 18.4 line 897: "~40 safe stdlib modules" → "54 safe stdlib modules" |
| Low | Test 3.9 line 228: Add `pip3` and `ollama` to safe commands list |
| Low | Test 17.11 line 850: `handlers.py:1175` → `handlers.py:1189` |
| Low | Test 12.1 line 605: Clarify log format vs audit prompt format |
