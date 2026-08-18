# AgentSutra.dev

AgentSutra.dev is the canonical public-learning surface for **AgentSutra**: accessible, evidence-bounded Field Notes that turn real AI-system observations into useful lessons for a broad technical audience.

The publication lives in the isolated `publication/` workspace of the AgentSutra repository. The historical Python Runtime remains frozen at the repository root, while Claude Code Multipane remains a separate project. Archived experiments can supply source material only when the original evidence remains reviewable; `publication/` owns the editorial system, public corpus, diagrams, static exports, and publication quality gates.

## Status

Private-pilot phase. The source is visible in the public AgentSutra repository, but the website remains pre-launch. `FN-000` is synthetic test content, not a public claim or finished lesson. The Runtime is frozen after its former Mac mini host was reset. No production deployment or DNS change is part of this phase.

## Product contract

- One substantial, independently useful Field Note per week after launch.
- One canonical, crawlable, accessible page per note.
- Static platform adaptations derived from the same validated source.
- Anonymous AgentSutra identity on Instagram and TikTok; pseudonymous, discussion-first participation on Reddit; selective personal attribution on LinkedIn and portfolio surfaces.
- Every note carries its own evidence boundary, limitations, correction state, and practical transfer.
- Every note also produces 30-second, 90-second, and 3-minute interview explanations.

## Architecture

```text
typed source records
  ├─ field note (Markdown)
  ├─ evidence pack (YAML)
  ├─ Thread diagram (YAML)
  ├─ platform adaptations (YAML)
  └─ interview distillation (YAML)
            │
            ▼
     validated publication graph
            │
      ┌─────┴──────────────┐
      ▼                    ▼
canonical static site   deterministic social exports
```

Astro produces static HTML. Ordinary Field Notes ship no client JavaScript. AgentSutra Thread diagrams use controlled SVG geometry and always include a visible ordered text equivalent. Cloudflare Workers Static Assets is the intended host, with no server runtime, CMS, database, user accounts, cookies, or behavioural analytics in the initial release.

The decision to preserve an independent publication boundary inside the AgentSutra monorepo is recorded in [ADR 0003](docs/adr/0003-agent-sutra-monorepo-publication-workspace.md). It supersedes the standalone-repository placement in [ADR 0001](docs/adr/0001-separate-static-publication.md).

## Local requirements

- Node `24.19.0`
- npm `11.17.0`

Both versions are pinned. This project uses exact dependency versions and a committed lockfile.

```sh
cd publication
npm ci
npm run dev
```

## Quality commands

| Command                  | Purpose                                                          |
| ------------------------ | ---------------------------------------------------------------- |
| `npm run check`          | Astro and TypeScript validation                                  |
| `npm test`               | Content-contract and unit tests                                  |
| `npm run privacy:scan`   | Reject private paths, topology, credentials, and unsafe fixtures |
| `npm run build`          | Production build; drafts and synthetic fixtures are excluded     |
| `npm run build:fixtures` | Local fixture build for test coverage                            |
| `npm run build:exports`  | Local-only export build                                          |
| `npm run verify:dist`    | Assert the generated public surface and zero-JS contract         |
| `npm run test:e2e`       | Cross-browser, responsive, and accessibility checks              |
| `npm run export:social`  | Generate native static social assets                             |
| `npm run export:verify`  | Prove native assets match across two clean builds                |
| `npm run deploy:dry-run` | Validate the Cloudflare artifact without publishing              |
| `npm run verify`         | Run the core local verification chain                            |

## Content workflow

1. Start from an audience problem, not an internal repository feature.
2. Define one central claim and up to five material supporting claims.
3. Classify the issue risk and provide the required evidence.
4. Write the canonical note and an accessible Thread diagram.
5. Add the practical “use this today” transfer and optional technical-depth door.
6. Generate native platform adaptations and interview explanations.
7. Run privacy, schema, accessibility, static-build, export, and human editorial review.
8. Publish only when that issue's evidence gate passes.

Repository-wide remediation continues in parallel and is not a blanket publication gate.

## Privacy boundary

The `publication/` workspace must never contain raw AgentSutra Node operations, machine identifiers, private topology, credentials, personal absolute paths, client or employer material, private logs, or unredacted screenshots. Public examples must be synthetic or explicitly sanitised and recorded as such.

See [AGENTS.md](AGENTS.md) for the enforced working rules.

## Identity

Use `AgentSutra` in camel case. The visual system uses a restrained violet-to-cyan progression for intent → reasoning → outcome and a consistent Thread grammar:

- square: state, input, or artifact
- diamond: decision or judgement
- circle: process or model
- arrow: deterministic transition
- loop: iteration
- ellipsis: unresolved uncertainty
- cross: failure
- check: verified outcome

The wordmark remains plain `AgentSutra`; the symbol carries the diagrammatic character.

## Themes

The publication has two expressions of the same Threaded Field Lab system:

- **Night Lab:** the dark inspection chamber used by the current production design;
- **Daylight Proof:** a warm mineral-paper light theme with dense printing inks.

The browser follows the reader's operating-system preference without client JavaScript. Social and document exports remain explicitly dark so automatic theme preference cannot alter deterministic artifacts.

## Deployment boundary

`wrangler deploy --dry-run` is allowed for validation. Creating a Cloudflare project, changing nameservers or DNS, connecting `agentsutra.dev`, or publishing the site requires a separate release decision after the private-pilot launch gate passes.
