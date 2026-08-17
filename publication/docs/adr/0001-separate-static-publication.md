# ADR 0001: Separate static AgentSutra publication

- Status: superseded by ADR 0003
- Date: 2026-08-17

## Context

AgentSutra currently includes a Python runtime, private node operations, a public-learning programme, and adjacent evidence from Claude Code Multipane. The publication needs its own release rhythm, privacy boundary, content schema, accessible visual system, and deployment lifecycle.

Putting the website inside the Python runtime would couple unrelated toolchains and increase the chance that operational material leaks into public builds. Putting it inside Multipane would misrepresent Multipane as an AgentSutra subsystem.

## Decision

Create `agentsutra.dev` as a dedicated AgentSutra publication repository and canonical corpus. This placement was later superseded by ADR 0003 after the owner chose one AgentSutra repository with an isolated `publication/` workspace.

Use:

- Astro static output and strict TypeScript;
- build-time validated content and evidence records;
- semantic HTML, CSS and controlled SVG Thread diagrams;
- deterministic static social exports;
- Cloudflare Workers Static Assets without a Worker runtime or Astro server adapter;
- Git history as the initial editorial audit trail.

Do not add a CMS, database, accounts, comments, runtime rendering, client application shell, analytics, automated social posting, or AI search during Foundation Sprint 1.

## Consequences

- The publication can deploy independently without changing Runtime or Multipane releases.
- Private evidence remains outside the public repository.
- A small amount of cross-repository linking is required, but claims remain bounded by public evidence records.
- If dynamic capabilities become necessary later, they require evidence and a new ADR.
