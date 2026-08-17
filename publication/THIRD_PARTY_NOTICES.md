# Third-party notices

AgentSutra uses third-party software under the licences declared by its locked dependencies. `package-lock.json` is the authoritative dependency inventory for a given revision.

## Development capabilities

The following project-local capabilities support development but are not shipped as website runtime code:

- **Impeccable** — optional design workflow installed locally from the `impeccable` npm package. It is not vendored in this repository. See <https://impeccable.style/>.
- **Humanizer** — optional prose-review skill sourced from `blader/humanizer`. It is not vendored in this repository, and any suggestions remain subject to the evidence-preserving rules in [EDITORIAL.md](EDITORIAL.md).

UI UX Pro Max was consulted from a pinned temporary package as a pattern reference. It is not vendored in this workspace because its published package and repository licensing signals require clarification before redistribution.

## Apple SHARP

Apple SHARP is not a dependency, asset source, or production capability in this workspace. Its research boundary is recorded in [ADR 0002](docs/adr/0002-ml-sharp-research-boundary.md).

## Fonts and identity assets

### Recursive

- Family: Recursive Sans & Mono
- Version: 1.085
- Designer and publisher: Arrow Type
- Source: `https://github.com/arrowtype/recursive/tree/v1.085`
- Local webfont: `public/fonts/recursive-v1.085-latin-basic.woff2`
- Webfont SHA-256: `7af699706ba1d2a1947f4755d177927597b24c168f8d46585dabdb080e4d113c`
- Licence: SIL Open Font License 1.1
- Local licence: `licenses/Recursive-OFL-1.1.txt`
- Licence SHA-256: `f9f539cf7549bd417159dbdb9c400943a5b60a7366c2c6fbde9f095173d82479`

Recursive is self-hosted so the canonical site and deterministic export renderer use the same licensed font asset without a third-party runtime request.

Any additional font or third-party identity asset must be listed here with its exact version, source URL, licence, local file path, and integrity hash before it is committed or used for deterministic exports.
