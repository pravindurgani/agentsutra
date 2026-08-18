# AgentSutra

**First-hand AI experiments, failures and corrections—turned into lessons people can use and inspect.**

AgentSutra is now an evidence-led visual publication. It began as an attempt to push general-purpose AI towards persistent, useful work. The universal autonomous system did not arrive; the failures, revisions and practical questions became the more valuable material.

The flagship work lives in [`publication/`](publication/): an Astro-based public-learning system that produces accessible Field Notes, visible evidence boundaries, Thread diagrams, platform-native static adaptations and interview rehearsal material from one validated source graph.

## Current status

The publication is in private pilot. There are no public Field Notes, audience results or launch claims yet. `FN-000` is isolated engineering test data, not a lesson or evidence about a real AI system.

The public build fails closed until at least one real, reviewed Field Note passes its evidence, privacy, comprehension and accessibility gates. This repository does not currently deploy or connect `agentsutra.dev`.

## What a Field Note contains

```text
recognisable problem
  → what the system is doing
  → what was observed, repeated or measured
  → what the evidence cannot prove
  → one action to try
  → sources, versions and corrections for deeper inspection
```

Every real note is linked to:

- an evidence pack;
- an accessible AgentSutra Thread diagram;
- Instagram, TikTok, LinkedIn and Reddit adaptations;
- 30-second, 90-second and 3-minute interview explanations.

## Run the publication locally

Requirements: Node `24.19.0` and npm `11.17.0`.

```sh
cd publication
npm ci
npm run dev
```

Core verification:

```sh
cd publication
npm run verify
npm run test:e2e
npm run export:verify
npm run deploy:dry-run
```

See [`publication/README.md`](publication/README.md), [`publication/PRODUCT.md`](publication/PRODUCT.md), [`publication/DESIGN.md`](publication/DESIGN.md) and [`publication/EDITORIAL.md`](publication/EDITORIAL.md) for the complete system.

## Repository map

| Path                              | Status                        | Purpose                                                                                        |
| --------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------- |
| [`publication/`](publication/)    | Flagship · active · prelaunch | AgentSutra.dev source, editorial contracts, accessible site and deterministic platform exports |
| Runtime source at repository root | Frozen · unsupported          | Historical single-user Telegram agent preserved for study and provenance                       |
| [`AGENTSUTRA.md`](AGENTSUTRA.md)  | Historical reference          | Runtime architecture and operational documentation as last recorded before the Mac mini reset  |

## Legacy Runtime

AgentSutra Runtime is frozen after the Mac mini that hosted it was reset. It is not presented as a current operational system and receives no feature development. Its source and documentation remain in Git history so future Field Notes can cite an archived experiment only when the original evidence is still reviewable.

Do not follow the historical Runtime setup instructions as current product guidance. A namespaced final snapshot (`runtime-v9.0.0-final`) should be created from the last Runtime-only `main` commit as part of the repository’s post-merge archival housekeeping.

## Rights and licence map

The root [MIT licence](LICENSE) applies to the historical Runtime files outside `publication/`. The publication has separate code, editorial, identity and evidence-rights boundaries in [`publication/RIGHTS.md`](publication/RIGHTS.md), with third-party software and assets recorded in [`publication/THIRD_PARTY_NOTICES.md`](publication/THIRD_PARTY_NOTICES.md).

No deployment, DNS change or social publication is implied by source visibility.
