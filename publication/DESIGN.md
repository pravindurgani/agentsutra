---
name: AgentSutra
description: An evidence-led editorial field laboratory organised by a continuous Thread.
colors:
  ink: '#f4f5f2'
  ink-muted: '#b7bdc8'
  ink-faint: '#8d95a3'
  canvas: '#07090e'
  surface: '#0d1119'
  surface-raised: '#141a25'
  line: '#323a49'
  line-strong: '#687387'
  violet: '#aa8eff'
  violet-field: '#211c3f'
  periwinkle: '#8eafff'
  cyan: '#64e8f3'
  cyan-field: '#092c32'
  mint: '#8de8c3'
  mint-field: '#102a25'
  amber: '#f4c979'
  amber-field: '#302714'
  rose: '#ff9fa8'
typography:
  display:
    fontFamily: "'Recursive AgentSutra', ui-sans-serif, system-ui, sans-serif"
    fontSize: 'clamp(3.5rem, 7.7vw, 6rem)'
    fontWeight: 760
    lineHeight: 0.98
    letterSpacing: '-0.035em'
    fontVariation: "'CASL' 0.24, 'MONO' 0"
  page-title:
    fontFamily: "'Recursive AgentSutra', ui-sans-serif, system-ui, sans-serif"
    fontSize: 'clamp(3rem, 8vw, 6rem)'
    fontWeight: 760
    lineHeight: 0.98
    letterSpacing: '-0.035em'
  headline:
    fontFamily: "'Recursive AgentSutra', ui-sans-serif, system-ui, sans-serif"
    fontSize: 'clamp(2rem, 4.5vw, 4.35rem)'
    fontWeight: 760
    lineHeight: 0.98
    letterSpacing: '-0.035em'
  title:
    fontFamily: "'Recursive AgentSutra', ui-sans-serif, system-ui, sans-serif"
    fontSize: 'clamp(1.2rem, 2.2vw, 1.7rem)'
    fontWeight: 760
    lineHeight: 1.08
    letterSpacing: '-0.035em'
  body:
    fontFamily: "'Recursive AgentSutra', ui-sans-serif, system-ui, sans-serif"
    fontSize: 'clamp(1rem, 0.98rem + 0.1vw, 1.075rem)'
    lineHeight: 1.65
    fontVariation: "'MONO' 0, 'CASL' 0.12, 'CRSV' 0"
  label:
    fontFamily: "'Recursive AgentSutra', ui-monospace, monospace"
    fontSize: '0.74rem'
    fontWeight: 720
    letterSpacing: '0.055em'
    fontVariation: "'MONO' 1"
  evidence-stamp:
    fontFamily: "'Recursive AgentSutra', ui-monospace, monospace"
    fontSize: '0.7rem'
    fontWeight: 850
    lineHeight: 1
    letterSpacing: '0.11em'
    fontVariation: "'MONO' 1"
spacing:
  space-1: '0.35rem'
  space-2: '0.65rem'
  space-3: '1rem'
  space-4: '1.5rem'
  space-5: '2.25rem'
  space-6: '3.5rem'
  space-7: 'clamp(4.5rem, 9vw, 9rem)'
components:
  button-default:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '0'
    padding: '0.7rem 1rem'
  button-primary:
    backgroundColor: '{colors.cyan}'
    textColor: '{colors.canvas}'
    rounded: '0'
    padding: '0.7rem 1rem'
  button-primary-hover:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.canvas}'
    rounded: '0'
    padding: '0.7rem 1rem'
  evidence-stamp:
    textColor: '{colors.cyan}'
    typography: '{typography.evidence-stamp}'
    rounded: '0'
    padding: '0.32rem 0.5rem 0.25rem'
---

# Design System: AgentSutra

## Overview

**Creative North Star: "Threaded Field Lab"**

AgentSutra is a reading interface before it is a landing page. A continuous Thread connects intent, reasoning, judgement, evidence and outcome across an ink-black field. Oversized editorial claims, compact folios, ledgers, square rules and code-native diagrams make the publication feel authored and inspectable without falling into a generic AI hero or card stack.

Threaded Field Lab is the selected production form from exploration seed `0ea21cef`.

The homepage tells one fixed story: prelaunch boundary → Thread Map → explicitly synthetic `FN-000` experiment → truthful publication state → The Sutra and the next useful depth. Its first viewport pairs a narrow status rail with the claim and keeps “Inspect FN-000” as the primary action. The reviewer disposition for this production baseline is ship; all five material findings are resolved across the implemented states.

Signal Workshop and Kinetic Manuscript remain unblended decision evidence. Signal Workshop's instrument chrome would pull the system toward a generic developer observability console; Kinetic Manuscript's typography and editorial drama would reduce repeatability for long technical records and small screens. Importing either metaphor would collapse the controlled comparison into a familiar editorial dashboard. Refine rhythm, scale, contrast, diagram semantics, density and export framing only inside Threaded Field Lab.

**Key Characteristics:**

- The Thread is navigation, reasoning model and identity—not decoration.
- Evidence state and limitation are visible before atmosphere or persuasion.
- Full-width fields, ledgers and rules replace floating card collections.
- One variable family shifts between editorial and technical registers.
- The site remains legible at 320px, without client JavaScript, in forced colours and in print.

The remaining design validation is human, not technical. Run the planned unlabelled study with at least five target readers: ask them to restate the claim, distinguish evidence from boundary, explain the Thread, find the practical action and say which system they would recognise a week later. Reopen the direction only for material comprehension or accessibility underperformance.

## Colors

The palette is an ink-and-paper dark field with accents assigned to epistemic roles rather than decoration.

### Primary

- **Evidence Cyan:** links, primary action, focus, outcome nodes, verified Thread endpoints and the default evidence stamp.

### Secondary

- **Judgement Violet:** publication status, intent, section folios and fields where a claim is being judged.
- **Reasoning Periwinkle:** intermediate Thread nodes and the transition between intent and evidence.

### Tertiary

- **Transfer Mint:** practical “use this today” guidance.
- **Boundary Amber:** declared limits and bounded claims.
- **Correction Rose:** corrected, withdrawn and unresolved states.

### Neutral

- **Paper Ink:** primary text on the dark canvas.
- **Muted and Faint Ink:** supporting explanation and metadata; never the only carrier of essential state.
- **Ink Canvas and Surfaces:** the base field and its two restrained tonal steps.
- **Rules and Strong Rules:** section divisions, ledgers, controls and diagram structure.

**The Evidence-Role Rule.** Cyan means supporting evidence or outcome; violet means intent or judgement; amber means boundary; rose means correction or withdrawal. Never reassign these accents merely to make a screen more colourful.

**The Text-First State Rule.** Every colour-coded state also has a visible word, shape or line treatment. Colour reinforces meaning and never carries it alone.

## Typography

- **Display font:** Recursive AgentSutra, with a system sans-serif fallback
- **Body font:** Recursive AgentSutra, with a system sans-serif fallback
- **Label/mono font:** Recursive AgentSutra, with a system monospace fallback

Recursive is self-hosted as `recursive-v1.085-latin-basic.woff2`, displayed with `swap`, and declared across weights 300–1000 and oblique angles 0–15 degrees. The implementation uses its `MONO`, `CASL` and `CRSV` settings to create editorial and technical voices without introducing a second family: body copy is lightly casual, the homepage display increases `CASL`, and folios, evidence labels, code and registers switch `MONO` on.

### Hierarchy

- **Display:** the homepage claim only; tight, balanced and deliberately oversized.
- **Page title:** primary titles on ordinary publication routes.
- **Headline:** major section turns and Field Note panels.
- **Title:** ledger entries and smaller section headings.
- **Body:** calm reading copy with a maximum measure of 72ch.
- **Label:** uppercase folios, metadata and register labels.
- **Evidence stamp:** the densest, highest-weight technical label.

**The One-Family Rule.** Change axis, weight, scale and spacing before adding another typeface. Technical tone comes from monospacing Recursive, not from a separate console font.

**The Editorial Compression Rule.** Large headings stay short and balanced; long mechanisms belong in body copy, ledgers or the visible Thread text equivalent.

## Layout

The main shell is capped at 90rem with 1rem side gutters, tightening to 0.625rem below 23rem. Reading text stops at 72ch. Desktop sections use asymmetric 3/9 or 2/7 divisions; the homepage first viewport uses 12 columns, placing the status rail in the opening columns and the claim across the centre while the Thread occupies the right edge.

The homepage sequence is structural and must remain intact: status and claim, Thread Map, `FN-000`, publication register, The Sutra. The page-spanning Thread sits on the shell's right boundary with a strong neutral rule, cyan overlay and semantic nodes at section transitions. At widths below 47.99rem, multi-column layouts become a single reading column, the navigation stops being sticky and the Thread diagram switches from the wide to the compact SVG. At 20rem/320px the document still reflows without horizontal scrolling.

Vertical rhythm uses the staged spacing scale, with the largest responsive step separating major fields. Dense records use rows, rules and aligned terms rather than isolated boxes.

**The Continuous Thread Rule.** Each major homepage section must read as one stage of the same route. Do not restart the Thread as a decorative motif inside unrelated cards.

**The Phone-First Ledger Rule.** Desktop alignment may clarify comparison, but every ledger must collapse into a clear label-then-value reading order on a narrow screen.

## Elevation & Depth

The system has no shadows. Depth comes from full-width tonal fields, line strength, foreground/background contrast and changes in information density. Surfaces stay flat at rest; hover changes colour or border emphasis without lift. Raised surface colour is reserved for code and Thread node bodies, not for creating a stack of floating panels.

**The Flat Evidence Rule.** A boundary, source register or correction record should look structurally attached to the publication. Never imply importance with a floating card or ambient shadow.

## Shapes

The default interface language is square: buttons, stamps, code fragments, ledgers and field panels have no corner rounding. One-pixel rules provide structure; evidence stamps use a two-pixel stroke. Geometry is semantic in the identity and Thread: squares identify states, diamonds identify decisions and circles identify outcomes.

The generated Thread SVG uses a 12-unit corner radius on node label bodies as a contained diagram treatment. Do not generalise that exception into rounded cards or pill controls. Circles and diamonds are reserved for their existing Thread meanings, not ornamental variety.

**The No-Card Rule.** Group content with fields, borders, folios, rows and whitespace. Do not wrap each idea in an independent rounded container.

## Components

### Header and Navigation

The desktop header is a flat sticky rule; on mobile it returns to document flow. The wordmark's vertical rule, violet square and cyan outcome circle compress the Thread identity. Navigation uses monospaced labels, muted text at rest and a cyan underline plus paper-white text for hover or the current page.

### Buttons and Links

Buttons are square, at least 3rem high and weighty without appearing inflated. The primary action is cyan on canvas and reverses to paper ink on hover. The default button uses the dark surface with a strong rule; hover turns that rule cyan. All interactive elements share a visible cyan focus outline (0.2rem) with a 0.3rem offset. Inline links remain underlined and increase underline weight on hover.

### Thread

`AgentThread` generates wide and compact SVG diagrams from typed nodes and edges. Violet, periwinkle and cyan gradients show movement between intent, reasoning and outcome; line pattern and visible edge text distinguish deterministic, iterative and unresolved routes. The SVG is hidden from assistive technology because a visible ordered text equivalent lists every step and its node/edge references. The diagram and its text are static HTML/SVG and require no client JavaScript.

The homepage's continuous cyan overlay performs one top-to-bottom draw over 1.65 seconds with `cubic-bezier(0.16, 1, 0.3, 1)` only when the reader has no reduced-motion preference. The full Thread and all stage nodes already exist in the static document, so motion never reveals required meaning. Reduced motion disables all animation and transition and restores automatic scrolling.

### Evidence Stamps and Truth States

The permitted reader-facing stamp vocabulary is `MEASURED`, `REPRODUCED`, `OBSERVED`, `BOUNDED`, `CORRECTED` and `WITHDRAWN`. The label is derived from the evidence record in that priority: withdrawal, correction, measurement, reproduced evidence, observation, then bounded fallback. Amber marks `BOUNDED`; rose marks `CORRECTED` and `WITHDRAWN`; other supporting states use cyan.

A stamp is a claim about publication state, never a decorative badge. It must agree with the central claim, source access, verification method, limitation, measurement record and correction status. Private evidence is described publicly without exposing its source; synthetic evidence stays labelled synthetic. `FN-000` must always state that it tests fixture contracts only and proves nothing about a real AI system, audience comprehension, security or public release.

### Ledgers, Panels and The Sutra

Folios and ledgers present notes, sources, measurements and corrections as records separated by rules. Boundary, transfer and memory panels are full-width tonal fields attached to the reading flow, not cards. “The Sutra” is the compressed takeaway: oversized, short and positioned after evidence and limits, never before them.

### Accessibility, No-JavaScript and Print States

Ordinary reading pages are complete as server-rendered static HTML. Semantic landmarks, headings, lists, skip link, visible focus, descriptive links and Thread text equivalents remain present without JavaScript or the custom font. Forced-colour mode maps the palette to system colours and preserves border/shape cues.

Print changes the system to black on white, removes site navigation, calls to action and the decorative homepage Thread, forces the wide diagram, avoids breaking material panels where possible and appends external URLs. Printed evidence retains its words, order and boundaries; it does not depend on dark-field colour.

## Do's and Don'ts

### Do:

- **Do** begin with the reader's problem and keep evidence, limitation and practical transfer in the same Thread.
- **Do** use folios, ledgers, square rules and semantic geometry to organise dense records.
- **Do** preserve the explicit prelaunch and synthetic status until real evidence passes its gates.
- **Do** verify every new pattern at 320px, with keyboard, reduced motion, forced colours, no JavaScript and print.
- **Do** keep the five-reader comprehension study as the remaining human validation boundary.

### Don't:

- **Don't** blend Signal Workshop's instrument chrome or Kinetic Manuscript's typography into the production world.
- **Don't** introduce generic AI gradients, generated decoration, glass panels, rounded card stacks or a fabricated author persona.
- **Don't** turn the Thread into wallpaper, a progress claim or an animation that carries required meaning.
- **Don't** use an evidence stamp unless the underlying record earns that exact word.
- **Don't** hide a limitation, correction or synthetic fixture behind visual confidence.
