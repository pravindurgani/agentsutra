# AgentSutra agent map

Read these authorities before changing the publication:

1. [`PRODUCT.md`](PRODUCT.md) — audience, product truth, scope, capabilities and brand commitments.
2. [`DESIGN.md`](DESIGN.md) — the selected Threaded Field Lab system and production rules.
3. [`EDITORIAL.md`](EDITORIAL.md) — reader order, evidence language, voice, corrections and claim discipline.
4. [`docs/adr/0003-agent-sutra-monorepo-publication-workspace.md`](docs/adr/0003-agent-sutra-monorepo-publication-workspace.md) — why the publication is an isolated monorepo workspace.
5. [`docs/adr/0002-ml-sharp-research-boundary.md`](docs/adr/0002-ml-sharp-research-boundary.md) — the research and ML boundary.

## Non-negotiable scope

- This `publication/` workspace is the active flagship AgentSutra learning publication. It shares a
  monorepo with the frozen, unsupported AgentSutra Runtime but keeps separate dependencies, CI,
  evidence, release gates and deployment state. Claude Code Multipane and private operations remain
  separate.
- Never add client names, credentials, hostnames, IP addresses, personal filesystem paths, private runbooks, raw topology or other private operational evidence. Public material may reference only an opaque private evidence ID.
- Do not revive, delete or rewrite the frozen Runtime, or change Multipane, portfolio, CV, DNS,
  Cloudflare or social accounts without explicit authorisation for that system.
- Use `AgentSutra` camel case. Preserve the S, Thread and fixed decision-node semantics; the Thread must organise information, not decorate it.
- Ordinary Field Note pages must remain complete without client JavaScript. Every material diagram needs a visible semantic text equivalent.
- Every material claim needs its truthful reader-facing evidence boundary. Drafts, fixtures, rehearsal material and private references must not enter production routes or `dist/`.
- Platform adaptations may shorten or reorder a lesson, but must preserve its central claim, evidence status, limitation and correction state.

## Engineering and release

- Use Node 24.19.0 and the exact dependency versions in `package.json`.
- Keep Astro in static-output mode. Do not add SSR, React, Tailwind, a CMS, database, authentication, analytics, comments or automated posting without a measured requirement and accepted ADR.
- Prefer semantic HTML, Astro components, controlled SVG and CSS cascade layers. Maintain WCAG 2.2 AA, keyboard access, 320px reflow, reduced motion, forced colours, print and no-JavaScript reading.
- Preserve strict content contracts and fail closed for fixtures, unresolved high-risk claims, private evidence and unsafe corrections.
- Run relevant checks before handoff; `npm run verify` is the minimum full local gate.
- Cloudflare commands remain dry-run only until release approval. Do not push, deploy, change DNS or publish unless separately authorised.
