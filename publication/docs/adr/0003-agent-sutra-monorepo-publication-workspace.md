# ADR 0003: AgentSutra monorepo with an isolated publication workspace

- Status: accepted
- Date: 2026-08-17
- Supersedes: ADR 0001 repository placement only

## Context

ADR 0001 placed AgentSutra.dev in a standalone repository to protect its privacy boundary, release rhythm and TypeScript toolchain from the Python runtime. The owner prefers one AgentSutra GitHub repository so the runtime and public learning system are discoverable as one body of work.

Simply mixing the publication into the runtime root would weaken both systems: CI triggers would become ambiguous, dependencies would collide, generated output could be mistaken for runtime state, and a website release could accidentally imply a runtime release.

## Decision

Keep the existing Python runtime at the repository root and place the complete publication in `publication/`.

The imported lineage was reviewed from standalone AgentSutra.dev snapshot `56b9069172cf1fdb2e3245f3b2324a7e12f5c947`. Generated outputs and third-party agent capabilities were excluded from the monorepo import.

The workspace boundary is structural:

- `publication/package.json` and `publication/package-lock.json` own the Node toolchain;
- `publication/AGENTS.md`, `publication/PRODUCT.md`, `publication/DESIGN.md`, and `publication/EDITORIAL.md` own publication decisions;
- `.github/workflows/publication-ci.yml` runs publication checks with `publication/` as its working directory;
- fixture, export and deployable build outputs remain isolated and ignored;
- Cloudflare configuration remains under `publication/` and deployment stays dry-run only;
- runtime evidence enters the publication only through reviewed public records or opaque private-evidence identifiers.

AgentSutra Runtime and AgentSutra.dev may link to each other, but neither imports the other's dependencies, operational configuration, generated state, claims, or release status.

## Consequences

- GitHub presents one AgentSutra project with two clearly named products.
- Runtime and publication history can be reviewed in one place.
- Publication CI and Cloudflare packaging remain independently executable.
- Contributors must run runtime commands from the repository root and publication commands from `publication/`.
- A public-site release does not constitute a runtime release, and a runtime tag does not publish the website.
- Reversing this decision later remains possible by splitting `publication/` history with standard Git subtree tooling.
