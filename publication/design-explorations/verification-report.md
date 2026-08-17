# Verification Report

- Run: 17 August 2026
- Command: `node design-explorations/verify.mjs` using the pinned Node 24.19.0 toolchain
- Result: **pass**

## Browser coverage

Each prototype passed its semantic contract, console/page-error check and 390px overflow check in:

- Chromium
- Firefox
- WebKit

## Responsive and accessibility coverage

All three prototypes passed:

- no horizontal document overflow at 320, 390, 768 and 1440 CSS pixels;
- exactly one `h1`, one `main`, and present Thread, evidence, boundary, Sutra and platform sections;
- a visible ordered text equivalent for the diagram;
- zero serious or critical Axe violations in Chromium;
- zero external runtime requests;
- no active animation or transition above the verifier threshold with reduced motion enabled;
- a rendered forced-colours capture at 390px;
- an A4 print PDF generated with print media styles.

The generated evidence is in `screenshots/`. This verifies implementation properties, not reader comprehension or aesthetic preference.
