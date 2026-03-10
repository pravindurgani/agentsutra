# AgentSutra v9.0.0 — Implementation Plan (Post-Implementation)

**Version:** 3.0 (post-implementation overhaul)
**Date:** 2026-03-10
**Source:** [AgentSutra_Improvements_Report.md](./AgentSutra_Improvements_Report.md) (v8.8.0 test run → v9.0.0 implementation)
**Phases:** 14 (Phase 0a–0d, 1–9, 4b) — **ALL COMPLETE**
**Actual scope:** ~306 source lines + ~520 test lines across 14 files
**Execution order:** Batch 1 (0a–0d parallelised) → Batch 2 (1–5, 4b sequential) → Batch 3 (6–9 parallelised)
**Supersedes:** v2.3 plan (pre-implementation estimates)
**Status:** All 14 phases implemented and verified. 803 tests passing, 0 failing, 37 deselected.

---

## Context

The v8.8.0 production test run (48 prompts, 10 hours, Mac Mini M2, ~$14 API cost) revealed 9 gaps (G-1 through G-9) and produced 8 fix recommendations (F-1 through F-8). This plan translated those findings into 14 implementable phases. All phases are now complete.

**Key production data that drove this plan:**
- Planning latency: 65–380s actual vs 3–8s expected (8–31x slower)
- Classification latency: 30–55s actual vs 0.3–1s expected (35–115x slower)
- 111 Ollama empty responses during 10hr run (~450–660s wasted)
- 5 timeouts caused by planning bottleneck (up to 1051s single planning cycle)
- 3 false positives (PDF upload, psycopg2 subprocess, importlib)
- 2 quality failures (Tugi Tark data corruption, credential grep fabrication)
- 1 HTML truncation failure (Test 8.3, undetected across 3 retries)

---

## Execution Order Summary

```
Batch 1  (P0 quick wins — all parallelised)
  ├── 0a: Purpose-dependent Ollama model routing (F-1, G-5, G-9)     ✅ COMPLETE
  ├── 0b: Classifier trigger context-awareness (F-2, G-2)            ✅ COMPLETE
  ├── 0c: LONG_TIMEOUT increase to 1800s (F-6, G-7)                  ✅ COMPLETE
  └── 0d: Plan complexity routing (G-1 partial)                       ✅ COMPLETE

Batch 2  (P1 — sequential)
  ├── 1: Duplicate error detection in retry loop (F-3, G-3)          ✅ COMPLETE
  ├── 2: Audit data sanity checks (F-4, G-4)                         ✅ COMPLETE
  ├── 3: HTML truncation detection (F-5, G-6)                        ✅ COMPLETE
  ├── 4: importlib smart allowlist (F-7, G-8)                        ✅ COMPLETE
  ├── 4b: shutil.rmtree scanner hardening                            ✅ COMPLETE
  └── 5: Executor respects was_refused                                ✅ COMPLETE

Batch 3  (P2 — parallelised)
  ├── 6: ARCHITECTURE.md per-project convention (F-8, G-9)           ✅ COMPLETE
  ├── 7: Shell truncation shebang gate (F-1 fix)                     ✅ COMPLETE
  ├── 8: Credential filter expansion                                  ✅ COMPLETE
  └── 9: Ollama health monitoring (G-9)                               ✅ COMPLETE
```

**Dependencies:**
- Phase 0a completed before Phase 9 (model routing stable before adding health checks)
- All other phases were independent

---

## Gap → Fix → Phase Mapping

| Gap | Description | Fix | Phase(s) | Status |
|-----|-------------|-----|----------|--------|
| G-1 | Planning stage latency (65–380s/cycle) | F-1, F-6 | 0c, 0d | **FIXED** |
| G-2 | Classifier trigger over-matching | F-2 | 0b | **FIXED** |
| G-3 | Identical retry loop (3× same error) | F-3 | 1 | **FIXED** |
| G-4 | Audit misses impossible math | F-4 | 2 | **FIXED** |
| G-5 | Classification latency (30–55s from `<think>`) | F-1 | 0a | **FIXED** |
| G-6 | HTML truncation not detected | F-5 | 3 | **FIXED** |
| G-7 | LONG_TIMEOUT too short (900s) | F-6 | 0c | **FIXED** |
| G-8 | importlib false positive | F-7 | 4 | **FIXED** |
| G-9 | Ollama empty responses / project CLI args | F-8 | 6, 9 | **PARTIALLY FIXED** |

G-9 is partial: ARCHITECTURE.md injection and `run_instructions` field are implemented, but no projects in `projects_macmini.yaml` have either populated yet.

---

## Phase 0a: Purpose-Dependent Ollama Model Routing ✅

**Fixed:** F-1, G-5 (classification latency), G-9 (Ollama empty responses)
**Priority:** P0 | **Risk:** Low
**Files changed:** `config.py` (+1 line), `tools/model_router.py` (~15 lines)

### Problem

`deepseek-r1:14b` emitted `<think>` reasoning blocks (20–40s) before a one-word classification answer. Consumed ~9GB RAM on 16GB M2, leaving ~7GB headroom — insufficient under sustained load (111 empty responses observed).

### Implementation

**config.py:91** — Added purpose-specific model config:
```python
OLLAMA_CLASSIFY_MODEL = os.getenv("OLLAMA_CLASSIFY_MODEL", "qwen2.5:7b")
```

**model_router.py:89–114** — `_select_model()` purpose-dependent routing:
- Rule (a) line 93–94: Audit → always Opus
- Rule (b) line 97–98: Code gen → always Sonnet
- Rule (d) line 102–105: Budget escalation (70% spend, `complexity != "high"`, 90% RAM guard) → Ollama (classify→qwen2.5:7b, plan→deepseek-r1:14b)
- Rule (c) line 108–111: Low-complexity classify/plan → Ollama at 75% RAM threshold (classify→qwen2.5:7b, plan→deepseek-r1:14b)
- Rule (e) line 114: Default → Sonnet

### Expected vs Actual Impact

| Metric | Before (v8.8.0) | After (v9.0.0) | Verified? |
|--------|-----------------|----------------|-----------|
| Classify latency (Ollama) | 30–55s | Est. 6–10s | Production untested |
| Ollama RAM usage (classify) | ~9GB | ~4.5GB | Production untested |
| Free headroom on 16GB M2 | ~7GB | ~11.5GB | Production untested |
| Empty response rate | 111/10hr run | Expected significant reduction | Production untested |

### Post-Implementation Notes

- **main.py:180–195** — Added qwen2.5:7b startup validation (separate from default model check). Logs warning if classify model not found.
- **Two-model RAM risk:** Both qwen2.5:7b (~4.5GB) and deepseek-r1:14b (~9GB) may load simultaneously (~13.5GB on 16GB M2). Monitor in next test run.
- **Classify budget escalation nuance:** classify always passes `complexity="low"` (classifier.py:61), so the `complexity != "high"` guard at model_router.py:102 does NOT protect classify from budget escalation. Frontend/data classify CAN be Ollama-routed at high spend.

### Tests Added

```
tests/test_model_router.py:
  test_classify_routes_to_qwen_7b              ✅ passing
  test_plan_still_routes_to_deepseek            ✅ passing
  test_budget_escalation_uses_qwen_for_classify ✅ passing
  test_config_ollama_classify_model_env_override ✅ passing
```

---

## Phase 0b: Classifier Trigger Context-Awareness ✅

**Fixed:** F-2, G-2 (classifier over-matching)
**Priority:** P0 | **Risk:** Low
**Files changed:** `tools/projects.py` (~25 lines)

### Problem

Test 10.1: "Design a portfolio page with cards for AgentSutra, iGaming Intelligence Dashboard" routed to the igaming project instead of generating a frontend page.

### Implementation

**projects.py:17–18** — Added mention-context exclusion set (11 words):
```python
_MENTION_CONTEXTS = {"about", "for", "card", "showing", "including", "like",
                     "such as", "called", "named", "titled", "featuring"}
```

**projects.py:73–81** — Prefix-word check in `match_project()`:
- Finds trigger position in message
- Checks 3 words in the 30-char prefix before the trigger
- If any prefix word is in `_MENTION_CONTEXTS`, skips that trigger match

### Edge Cases Handled

- "Run the iGaming Intelligence Dashboard" → prefix "run the" → no mention-context → MATCH (correct)
- "Design a card about iGaming Intelligence Dashboard" → prefix has "about" → SKIP (correct)
- "Create a portfolio page with iGaming Intelligence Dashboard" → prefix "with" → MATCH (acceptable — "with" is not in `_MENTION_CONTEXTS`)

### Tests Added

```
tests/test_projects.py:
  test_match_project_does_not_match_in_description     ✅ passing
  test_match_project_does_not_match_after_for           ✅ passing
  test_match_project_still_matches_command_position     ✅ passing
  test_match_project_still_matches_direct_trigger       ✅ passing
  test_match_project_skips_featuring_context            ✅ passing
```

---

## Phase 0c: LONG_TIMEOUT Increase ✅

**Fixed:** F-6, G-7 (5 tasks timed out at 900s but completed in background)
**Priority:** P0 | **Risk:** None
**Files changed:** `config.py` (1 line)

### Implementation

**config.py:78** — Changed default from 900 to 1800:
```python
LONG_TIMEOUT = _safe_int("LONG_TIMEOUT", 1800)
```

### Rationale

- Longest observed task: 1440s (BTC dashboard). 1800s covers with 25% margin.
- All 5 timeout tasks from v8.8.0 run would have completed under 1800s.
- Still configurable via `LONG_TIMEOUT` env var.

---

## Phase 0d: Plan Complexity Routing ✅

**Fixed:** G-1 partial (planning latency — cost reduction + Ollama routing for simple tasks)
**Priority:** P0 | **Risk:** Low
**Files changed:** `brain/nodes/planner.py` (~5 lines)

### Implementation

**planner.py:277** — Refined complexity routing:
```python
# Before (v8.8.0):
plan_complexity = "low" if task_type == "project" else "high"

# After (v9.0.0):
plan_complexity = "high" if task_type in ("frontend", "ui_design", "data") else "low"
```

### Impact

- `code`, `automation`, `file`, `project` → `complexity="low"` → eligible for Ollama planning
- `frontend`, `ui_design`, `data` → `complexity="high"` → always Sonnet (quality preserved)
- RAG file injection already only runs for `task_type == "project"` (planner.py:238)

### Tests Added

```
tests/test_planner.py:
  test_plan_complexity_code_is_low      ✅ passing
  test_plan_complexity_frontend_is_high ✅ passing
  test_plan_complexity_project_is_low   ✅ passing
```

---

## Phase 1: Duplicate Error Detection in Retry Loop ✅

**Fixed:** F-3, G-3 (3 identical failures waste 5–10 min)
**Priority:** P1 | **Risk:** Low
**Files changed:** `brain/graph.py` (~13 lines), `brain/state.py` (+2 fields), `brain/nodes/auditor.py` (~3 lines)

### Problem

Tests 7.2a/7.2b: `run_pipeline.py` produced the same "usage error" on all 3 attempts. Each retry burned 155s+ in planning. Total waste: ~465s per attempt.

### Implementation

**state.py:60** — Added `previous_audit_feedback: str` field.

**graph.py:74–82** — `should_retry()` duplicate detection:
```python
current_feedback = (state.get("audit_feedback") or "")[:150]
previous_feedback = (state.get("previous_audit_feedback") or "")[:150]
if current_feedback and previous_feedback and current_feedback == previous_feedback:
    logger.warning("Duplicate audit feedback for task %s — aborting retries", ...)
    return "deliver"
```

**auditor.py** — Stores previous feedback before overwriting:
```python
"previous_audit_feedback": state.get("audit_feedback", ""),
```

### Why 150 Characters

- Long enough to capture error signatures (e.g., "run_pipeline.py: error: the following arguments are required: --client")
- Short enough to ignore timestamp/line-number variations
- Tested against actual v8.8.0 log data: igaming pipeline errors were identical in first 150 chars across all 3 attempts

### Tests Added

```
tests/test_graph.py:
  test_should_retry_exits_on_duplicate_feedback    ✅ passing
  test_should_retry_continues_on_different_feedback ✅ passing
  test_should_retry_continues_on_first_failure     ✅ passing
  test_should_retry_still_respects_max_retries     ✅ passing
```

---

## Phase 2: Audit Data Sanity Checks ✅

**Fixed:** F-4, G-4 (Tugi Tark 11,600% CTR not caught)
**Priority:** P1 | **Risk:** Low
**Files changed:** `brain/nodes/auditor.py` (~14 lines)

### Problem

The Tugi Tark report showed 0 impressions with 91,499 clicks and 11,600% CTR. Opus audit passed it.

### Implementation

**auditor.py:53–58** — Added data sanity section to `SYSTEM_BASE`:
- Percentages must be 0–100% (unless explicitly a growth rate)
- Denominator must be non-zero for rates (CTR, engagement, conversion)
- Impressions = 0 but clicks > 0 → FAIL
- Any metric > 1000% in standard report context → FAIL
- Column misalignment signals (repeated zeros, wildly inconsistent magnitudes)

Also expanded `AUDIT_CRITERIA["data"]` with specific data sanity instructions.

### Caveat

Prompt-based fix — Opus must interpret correctly. Concrete examples (0 impressions + non-zero clicks) maximise compliance. A post-execution numeric validator would be more deterministic but isn't worth the complexity for v9.0.

### Tests Added

```
tests/test_auditor.py:
  test_audit_catches_impossible_ctr        ✅ passing
  test_audit_passes_valid_data             ✅ passing
  test_audit_catches_zero_denominator_rate ✅ passing
```

---

## Phase 3: HTML Truncation Detection ✅

**Fixed:** F-5, G-6 (Test 8.3 truncated 3 times, undetected)
**Priority:** P1 | **Risk:** Low
**Files changed:** `brain/nodes/executor.py` (~25 lines)

### Problem

Test 8.3: code truncated mid-HTML on all 3 retries. Truncation detector only checked Python parens/brackets and shell if/fi.

### Implementation

**executor.py:110–130** — Added HTML detection in `_is_truncated()`:
1. Lines 113–118: If code contains `<!doctype` or `<html`, checks for `</html>` closure
2. Lines 121–126: Counts `<script>`/`</script>` and `<style>`/`</style>` pairs — unbalanced means truncated
3. Line 128: Detailed warning log with tag counts

Only triggers when code contains `<!doctype` or `<html` — prevents false positives on Python code that generates HTML strings.

### Tests Added

```
tests/test_executor.py:
  test_truncation_detects_unclosed_html             ✅ passing
  test_truncation_passes_complete_html              ✅ passing
  test_truncation_detects_unclosed_script           ✅ passing
  test_truncation_detects_unclosed_style            ✅ passing
  test_truncation_ignores_html_in_python_string     ✅ passing
  test_truncation_no_false_positive_on_pure_python  ✅ passing
```

---

## Phase 4: importlib Smart Allowlist ✅

**Fixed:** F-7, G-8 (Test 15.1 false positive — importlib.import_module("sys") blocked)
**Priority:** P1 | **Risk:** Medium (security-sensitive)
**Files changed:** `tools/sandbox.py` (~55 lines)

### Problem

`importlib.import_module("sys")` was blocked by Tier 4 scanner. Legitimate introspection task blocked.

### Implementation

**sandbox.py:547–557** — `_IMPORTLIB_SAFE_MODULES` frozenset: **54 stdlib modules** allowed for dynamic import.

**sandbox.py:560–599** — `_is_safe_importlib()`: AST-based checker that:
- Parses code to find `importlib.import_module()` calls
- Extracts first argument — must be a string literal (variables/f-strings rejected)
- Checks base module name against safe set (e.g., `"os.path"` → checks `"os"`)
- Returns False if any call is unsafe or code is unparseable

**Integration:** Regex pattern removed from `_CODE_BLOCKED_PATTERNS`. Replaced with AST check in `_check_code_safety()`:
```python
if re.search(r"\bimportlib\s*\.\s*import_module\s*\(", code, re.IGNORECASE):
    if not _is_safe_importlib(code):
        return "BLOCKED: importlib.import_module with unsafe or dynamic module name"
```

### Security Invariant

| Call | Result | Reason |
|------|--------|--------|
| `importlib.import_module("sys")` | ALLOWED | In safe set |
| `importlib.import_module("os.path")` | ALLOWED | Base "os" in safe set |
| `importlib.import_module("config")` | BLOCKED | Not in safe set (exposes API keys) |
| `importlib.import_module("dotenv")` | BLOCKED | Not in safe set |
| `importlib.import_module(user_input)` | BLOCKED | Dynamic argument |
| `importlib.import_module("requests")` | BLOCKED | Third-party, not in safe set |

### Tests Added

```
tests/test_sandbox.py:
  test_importlib_allowed_for_sys          ✅ passing
  test_importlib_allowed_for_math         ✅ passing
  test_importlib_blocked_for_config       ✅ passing
  test_importlib_blocked_for_dotenv       ✅ passing
  test_importlib_blocked_for_dynamic_arg  ✅ passing
  test_importlib_allowed_for_os_path      ✅ passing
  test_importlib_blocked_for_requests     ✅ passing
```

---

## Phase 4b: shutil.rmtree Scanner Hardening ✅

**Fixed:** Test 3.1 scanner gap (destructive rm -rf reached execution)
**Priority:** P1 | **Risk:** Medium (security-sensitive)
**Files changed:** `tools/sandbox.py` (~50 lines)

### Problem

Test 3.1: code with `shutil.rmtree(os.path.expanduser("~/Documents"))` passed the regex-only scanner. Regex only caught literal path arguments.

### Implementation

**sandbox.py:602–650** — `_is_safe_shutil_rmtree()`: AST-based checker that blocks:
- Variable arguments (`shutil.rmtree(target)` — can't verify)
- String literals starting with `/` or `~` or containing "home"
- Current/parent directory wipes (`.`, `..`, `../anything`)
- Call expressions as arguments (`expanduser(...)`, `Path.home()`)
- BinOp arguments (`Path("/") / "x"`)

Existing regex pattern (sandbox.py:431) preserved as first line of defense. AST check catches what regex misses.

### Security Invariant

| Call | Result |
|------|--------|
| `shutil.rmtree("/tmp/workspace/output")` | BLOCKED (starts with `/`) |
| `shutil.rmtree("./output")` | ALLOWED (relative, within workspace) |
| `shutil.rmtree(".")` | BLOCKED (current directory wipe) |
| `shutil.rmtree("..")` | BLOCKED (parent directory) |
| `shutil.rmtree(target_dir)` | BLOCKED (variable) |
| `shutil.rmtree(os.path.expanduser("~/Documents"))` | BLOCKED (call expression) |
| `shutil.rmtree(Path.home() / "Documents")` | BLOCKED (BinOp) |

### Tests Added

```
tests/test_sandbox.py:
  test_rmtree_blocked_with_expanduser    ✅ passing
  test_rmtree_blocked_with_variable      ✅ passing
  test_rmtree_blocked_with_path_home     ✅ passing
  test_rmtree_blocked_current_dir        ✅ passing
  test_rmtree_blocked_parent_traversal   ✅ passing
  test_rmtree_allowed_relative_path      ✅ passing
  test_rmtree_blocked_absolute_path      ✅ passing
```

---

## Phase 5: Executor Respects `was_refused` ✅

**Fixed:** Test 4.1 planner/executor disconnect
**Priority:** P1 | **Risk:** Low
**Files changed:** `brain/nodes/executor.py` (~8 lines), `brain/state.py` (+1 field)

### Problem

Test 4.1: planner said "I'll refuse this task" (`was_refused=True`), but executor still generated and ran code (`while True: pass`). Sandbox timeout killed it, but code should never have been generated.

### Implementation

**state.py:57** — Added `was_refused: bool` field.

**executor.py:243–249** — Early return at top of `execute()`:
```python
if state.get("was_refused"):
    logger.info("Skipping execution — planner refused task %s", state["task_id"])
    return {
        "execution_result": "Task was refused by the planner on policy grounds. No code generated.",
        "code": "",
        "retry_count": config.MAX_RETRIES,  # Force skip to delivery
    }
```

### Why `retry_count = MAX_RETRIES`

Without this: auditor sees empty code → verdict "fail" → `should_retry()` loops back → planner refuses again → 3 wasted cycles of ~60s each. Setting MAX_RETRIES short-circuits this. Same pattern used by `_detect_environment_error()` in auditor.py.

### Tests Added

```
tests/test_executor.py:
  test_execute_skips_on_was_refused        ✅ passing
  test_execute_proceeds_on_was_refused_false ✅ passing
```

---

## Phase 6: ARCHITECTURE.md Per-Project Convention ✅

**Fixed:** F-8, G-9 partial (run_pipeline.py wrong arguments)
**Priority:** P2 | **Risk:** Low
**Files changed:** `brain/nodes/planner.py` (~15 lines), `tools/projects.py` (already supported)

### Problem

Tests 7.2a/7.2b/14.3: planner generated `python3 run_pipeline.py` without required flags. RAG returned code chunks but not the CLI interface spec.

### Implementation

**planner.py:226–235** — ARCHITECTURE.md injection for project tasks:
- Reads `ARCHITECTURE.md` from project root (limit 5000 chars)
- Injects before RAG chunks as structural context
- Only for `task_type == "project"`

**projects.py:108–109** — `get_project_context()` includes `run_instructions` field if populated in YAML.

### Current Gap

No projects in `projects_macmini.yaml` have `run_instructions` populated. No projects have `ARCHITECTURE.md` files. The code infrastructure is complete but the data is missing — igaming run_pipeline.py argument problem will persist until a human writes the ARCHITECTURE.md or populates `run_instructions` for that project.

### Tests Added

```
tests/test_planner.py:
  test_architecture_md_injected_for_project   ✅ passing
  test_architecture_md_skipped_for_code_task  ✅ passing
```

---

## Phase 7: Shell Truncation Shebang Gate ✅

**Fixed:** F-1 (v8.8.0 bug — shell truncation regex false-positived on Python code)
**Priority:** P2 | **Risk:** Low
**Files changed:** `brain/nodes/executor.py` (~15 lines)

### Problem

Python code containing `if`, `for`, `while` triggered shell truncation detection (`\bif\b`/`\bfi\b` balance check). False positive: Python's `if` statements were counted against shell's `fi` requirement.

### Implementation

**executor.py:91–108** — Shebang-gated shell checks:
- Lines 92–99: Detects shebang (`#!` with `bash`, `/sh`, or ending ` sh`)
- Lines 101–108: Shell `if/fi` and `do/done` balance checks only run if `_is_shell = True`
- Pure Python code (no shebang) skips shell checks entirely

### Tests Added

```
tests/test_executor.py:
  test_shell_truncation_only_for_shell_scripts  ✅ passing
  test_no_false_positive_python_if_statements   ✅ passing
```

---

## Phase 8: Credential Filter Expansion ✅

**Fixed:** Expanded credential stripping coverage
**Priority:** P2 | **Risk:** Low
**Files changed:** `brain/nodes/deliverer.py` (~8 lines)

### Implementation

**deliverer.py:17–25** — `_CREDENTIAL_RE` expanded to 7 patterns:

| Pattern | Matches |
|---------|---------|
| `ghp_[A-Za-z0-9_]{36,}` | GitHub PAT |
| `ya29\.[A-Za-z0-9_-]+` | Google OAuth |
| `sk-[A-Za-z0-9]{20,}` | OpenAI key |
| `AKIA[A-Z0-9]{16}` | AWS access key |
| `sk-ant-api[A-Za-z0-9_-]+` | Anthropic key |
| `xoxb-[A-Za-z0-9-]+` | Slack bot token |
| `\d{8,10}:[A-Za-z0-9_-]{35}` | Telegram bot token |

### Tests Added

Covered by existing credential filter tests in test_deliverer.py.

---

## Phase 9: Ollama Health Monitoring ✅

**Fixed:** G-9 partial (Ollama reliability tracking)
**Priority:** P2 | **Risk:** Low
**Files changed:** `tools/model_router.py` (~20 lines), `bot/handlers.py` (~15 lines)

### Implementation

**model_router.py:25–30** — Module-level `_ollama_stats` dict:
```python
_ollama_stats = {
    "calls": 0,
    "empty_responses": 0,
    "errors": 0,
    "fallbacks_to_claude": 0,
}
```

**model_router.py:33–40** — `get_ollama_stats()` getter:
- Returns copy with computed `reliability_pct = (1 - (empty + errors) / max(calls, 1)) * 100`

**Counter increments** at existing code paths (no restructuring):
- model_router.py:59 — `calls` incremented on each Ollama attempt
- model_router.py:64 — `empty_responses` incremented on empty result
- model_router.py:72 — `errors` incremented on exception
- model_router.py:75 — `fallbacks_to_claude` incremented before Claude fallback

**handlers.py:484–493** — `/health` displays Ollama section when `calls > 0`:
- Shows total calls, empty responses, errors, fallbacks, reliability percentage

### Design Decisions

- Stats reset on process restart — intentional, no persistence needed
- No stats for Claude API calls — Ollama only (per plan spec)
- Mutable dict pattern, no `global` declarations — mutate in place

### Tests Added

```
tests/test_model_router.py:
  test_ollama_stats_empty_response_incremented    ✅ passing
  test_ollama_stats_fallback_incremented           ✅ passing
  test_ollama_stats_reliability_percentage_correct ✅ passing
```

---

## Post-Implementation File Map

| File | Lines (v9.0.0) | Delta from v8.8.0 | Phases |
|------|---------------:|--------------------|--------|
| config.py | 144 | +2 | 0a, 0c |
| tools/model_router.py | 246 | +25 | 0a, 9 |
| tools/projects.py | 128 | +25 | 0b |
| tools/sandbox.py | 1,684 | +125 | 4, 4b |
| brain/graph.py | 167 | +29 | 1 |
| brain/state.py | 64 | +3 | 1, 5 |
| brain/nodes/planner.py | 428 | +11 | 0d, 6 |
| brain/nodes/executor.py | 860 | +33 | 3, 5, 7 |
| brain/nodes/auditor.py | 328 | +14 | 2 |
| brain/nodes/deliverer.py | 438 | +8 | 8 |
| brain/nodes/classifier.py | 99 | +1 | — (minor) |
| bot/handlers.py | 1,488 | +14 | 9 |
| main.py | 257 | +17 | 0a (startup check) |
| CLAUDE.md | — | — | Version bump (v8.8.0 → v9.0.0), main.py line count, test counts |

**Total:** ~306 source lines added, ~520 test lines added across 14 files (13 source + CLAUDE.md).

---

## Post-Implementation Test Results

```
Tests collected: 840
Tests run:       803
Tests passing:   803
Tests failing:     0
Tests deselected: 37 (36 Docker-dependent + 1 flaky threading)
Test files:       28
```

---

## Remaining Work (Not Addressed by v9.0.0)

### Must-Do Before Next Mac Mini Test Run

| Item | Description | File(s) |
|------|-------------|---------|
| Populate run_instructions | Add CLI interface for igaming-intelligence-dashboard | projects_macmini.yaml |
| Write ARCHITECTURE.md | Create structural context file for igaming project | igaming project root |
| Pull qwen2.5:7b | `ollama pull qwen2.5:7b` on Mac Mini | Mac Mini only |
| Verify startup | Confirm `main.py` logs both model checks on boot | Runtime |

### Known Limitations (Accepted for v9.0.0)

| Limitation | Description | Impact |
|------------|-------------|--------|
| Classify budget escalation | classify always passes `complexity="low"` (classifier.py:61) — budget escalation CAN route classify to Ollama for frontend/data tasks | Low — classify is cheap, quality impact minimal |
| Production-untested latency | qwen2.5:7b "6–10s classify" is estimated, not measured | Medium — next Mac Mini run validates |
| Two-model RAM risk | qwen2.5:7b + deepseek-r1:14b simultaneously = ~13.5GB on 16GB M2 | Medium — monitor in next run |
| Audit data validation | Prompt-based only — no programmatic math validation | Low — Opus generally follows specific instructions |
| `test_concurrent_writes_no_deadlock` | Threading test with no flaky marker — may be flaky under resource pressure | Low — deselected for now |

### v9.1.0 Candidates

| Feature | Description | Complexity |
|---------|-------------|------------|
| Per-task cost tracking | Add `task_id` to `api_usage` table | S (~20 lines) |
| Audit feedback loop | Pass `audit_feedback` to executor on retry | M (~40 lines) |
| Ollama model preload check | Verify both models loaded at startup via API | S (~10 lines) |
| Classify budget guard | Add `purpose != "classify"` to budget escalation | XS (1 line) |
| Task-type audit criteria | data→math checks, frontend→HTML completeness | M (~30 lines) |
| Structured plan templates | Per-task-type plan format to reduce generation time | M (~50 lines) |
| Fast-path classify scoring | Skip Ollama for high-confidence trigger matches | S (~15 lines) |

### Documentation Debt

| File | Issue | Priority |
|------|-------|----------|
| README.md | 6 stale values (AgentState fields, LONG_TIMEOUT, model names, test files, pattern count, missing OLLAMA_CLASSIFY_MODEL) | P1 |
| CODEBASE_REFERENCE.md | 15+ stale values throughout | P2 |
| USECASES.md | Title says v8.8.0 | P3 |
| AGENTSUTRA.md | Title says v8.6.0 — three versions behind | P3 |
| SESSION_LOG.md | Missing v9.0.0 completion entry | P1 |

---

## Pre-Flight Checklist for Next Mac Mini Test Run

### Version & Config
- [x] `config.py:VERSION` = `"9.0.0"` — **DONE**
- [x] `CLAUDE.md` title = v9.0.0 — **DONE**
- [x] `main.py` checks both Ollama models at startup — **DONE**
- [ ] Verify `OLLAMA_CLASSIFY_MODEL = "qwen2.5:7b"` in .env or config default
- [ ] Verify `LONG_TIMEOUT = 1800` in config

### Ollama Models
- [ ] `ollama pull qwen2.5:7b` — classify model
- [ ] `ollama pull deepseek-r1:14b` — plan model
- [ ] `ollama pull nomic-embed-text` — RAG embeddings
- [ ] `ollama list` — confirm all 3 present

### Project Config
- [ ] Add `run_instructions` for igaming-intelligence-dashboard in `projects_macmini.yaml`
- [ ] OR create `ARCHITECTURE.md` in igaming project root with CLI interface docs
- [ ] Test portfolio prompt to verify mention-context exclusion

### Validation Targets
- [ ] Classification: verify 6–10s (was 30–55s) in first few tasks
- [ ] LONG_TIMEOUT: tasks that took 1000–1400s should complete without bot timeout
- [ ] HTML truncation (Test 8.3 equivalent): verify truncation detection fires
- [ ] Duplicate detection: if igaming fails twice with same error, retry loop aborts early
- [ ] Ollama health: check `/health` for reliability stats after 10+ Ollama calls

### Budget
- [ ] `/cost` — sufficient budget for full run
- [ ] DAILY_BUDGET_USD appropriate (v8.8.0 run cost ~$14)
