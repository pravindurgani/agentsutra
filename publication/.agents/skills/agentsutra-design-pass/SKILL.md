---
name: agentsutra-design-pass
description: Run AgentSutra's repeatable design, render, critique, accessibility, and anti-slop workflow for canonical Field Notes, Thread diagrams, homepage/archive surfaces, evidence panels, corrections, static social adaptations, and print. Use when creating, redesigning, polishing, or reviewing any AgentSutra public-facing surface.
---

# AgentSutra design pass

Improve one coherent public experience while preserving its evidence contract. Treat the website and every platform adaptation as views of the same validated lesson, not independent marketing assets.

## 1. Load authority in order

1. Read `PRODUCT.md`, `DESIGN.md`, `EDITORIAL.md`, and `AGENTS.md` completely. If `DESIGN.md` is absent, stop before UI edits: use Impeccable's `document` and `new-work` routing to establish one approved thesis, then write `DESIGN.md` before implementation.
2. Require a concrete route, component, record ID, or export surface. Resolve its lesson graph before editing:
   - Field Note: `src/content/field-notes/**/*.md`;
   - evidence: `src/data/evidence-packs.yaml` or `src/data/fixtures/evidence-packs.yaml`;
   - Thread: `src/data/thread-diagrams.yaml` or `src/data/fixtures/thread-diagrams.yaml`;
   - adaptations: `src/data/adaptations.yaml` or `src/data/fixtures/adaptations.yaml`;
   - interview: `src/data/interviews.yaml` or `src/data/fixtures/interviews.yaml`.
     Use the linked IDs and `src/lib/publication-graph.ts`; never guess a sibling record. For a non-lesson route with no linked record IDs, record `lesson graph: not applicable` and proceed without attaching an unrelated graph. If the target is still ambiguous, ask for the target and do not edit.
3. Use Impeccable when it is installed locally according to [`.agents/README.md`](../../README.md). If it is present, run `node .agents/skills/impeccable/scripts/context.mjs --target <path>` exactly once, then read `.agents/skills/impeccable/SKILL.md` and exactly one owning playbook: `new-work` for a new thesis/surface, `polish` for refinement, `critique` or `audit` for diagnosis, `animate` for motion, and `document` for design-system recording. Read `craft-floor` only immediately before UI edits. If Impeccable is absent, stop before UI edits and report the missing optional capability; never download or vendor it automatically.
   If no surface brief exists for a narrow pass, inherit the production quality bar from `PRODUCT.md` and `DESIGN.md`, state that assumption, and create no placeholder brief. Ask only when positioning, audience, scope, or functionality would materially change.
4. Use UI UX Pro Max only as an optional pattern/accessibility reference. If it is unavailable, report that and continue; it cannot override AgentSutra truth or `DESIGN.md`.
5. Use Humanizer only when an approved local installation is available and after claims are locked. If unavailable, report that and continue. Never let prose editing change facts, numbers, quotations, sources, evidence states, qualifiers, uncertainty, or correction status.

## 2. Establish the surface contract

State before editing:

- the reader, situation, and question;
- the central claim and visible boundary;
- the practical transfer and optional depth door;
- the selected visual thesis and at most one memorable Thread motion motif;
- what functionality, privacy, evidence, and brand commitments must remain unchanged.

Do not invent proof, customers, performance figures, publication history, or audience response. Label synthetic material where a reader could mistake it for real evidence.

## 3. Design at system level

- Make the Thread organize reading order, causality, state, and continuation across frames.
- Give cover, problem, naive model, mechanism, evidence, boundary, transfer, Sutra, and depth-door roles distinct compositions.
- Use evidence states as plain language: OBSERVED, REPRODUCED, MEASURED, BOUNDED, CORRECTED, WITHDRAWN.
- Preserve a complete semantic HTML and text-equivalent experience without client JavaScript.
- Use at most one motion motif for orientation or causal continuity. Keep content visible by default and make reduced motion immediate and stable.
- Reject repeated generic cards, gradient text, decorative tech mono, arbitrary glows, cultural costume, and motion that carries no information.

## 4. Render and inspect

Run the real application with `npm run dev`. In one batched round inspect:

- 320, 390, 768, and 1440 pixel widths;
- keyboard and visible focus;
- reduced motion and forced colours;
- no JavaScript;
- print;
- long words, long titles, dense evidence, empty states, and correction states;
- platform-native export sizes and file types;
- the visible diagram and its full semantic text equivalent.

Capture valid desktop and mobile screenshots from the document top. Inspect the rendered result, not source code alone.

## 5. Correct once, then verify

Fix material findings together at the design-system or composition level. Rebuild and capture one confirmation round. Do not continue an open-ended polish loop.

Run the relevant gate, using the repository commands rather than invented equivalents:

- `npm run format:check`, `npm run check`, and `npm test`;
- `npm run build:prelaunch`, `npm run privacy:scan`, and `npm run verify:dist`;
- `npm run test:e2e` for browser, accessibility, reflow, reduced-motion, forced-colour, print, and no-JavaScript coverage;
- `npm run export:verify` for native artifact and cross-build determinism checks;
- `npm run verify` as the minimum full local handoff gate.

Run `npm run export:verify` whenever shared layouts, typography, global styles, Thread rendering, adaptation records, or export code changes. A route-only markup/copy change may omit it only when the handoff states why the export surface cannot change.

Run `node .agents/skills/impeccable/scripts/detect.mjs --json <changed-ui-targets...>` exactly once after the changed web UI is complete. Never deploy as part of a design pass.

## 6. Independent finish review

Give a fresh reviewer the original request, surface contract, changed-file list, artifact paths, screenshot paths, exact test results, and detector findings. Require this response shape:

```text
findings:
- severity: critical | high | medium | low
  target: <file, route, or artifact>
  evidence: <specific rendered or contract evidence>
  correction: <bounded required change>
remaining: clear | <specific unresolved risk>
disposition: ship | fix | block
```

`ship` means no material finding remains; `fix` requires one bounded correction batch and confirmation; `block` means the evidence/brand/accessibility contract cannot currently be satisfied. Record the final built system in `DESIGN.md` only after accepted corrections land.

Report the selected direction, concrete contract fixes, screenshots and exported artifacts, exact verification results, remaining human decisions, and confirmation that no push, deployment, DNS change, or public release occurred unless separately authorized.
