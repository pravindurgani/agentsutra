# ADR 0002: Keep Apple SHARP outside the production publication

- Status: accepted
- Date: 2026-08-17

## Context

AgentSutra is an experimental public field lab. Apple's SHARP project is an interesting candidate for a future Lab Note because it predicts a 3D Gaussian representation from a single photograph and exposes useful questions about inferred geometry, hidden viewpoints, hardware paths, delivery cost, and accessibility.

The published model-weight licence permits non-commercial scientific research and academic development and excludes product development and commercial products or services. The current project documentation also distinguishes prediction support through Apple hardware paths from a trajectory/video rendering workflow that requires CUDA.

Those boundaries make SHARP suitable for a carefully isolated research proposal, not for the AgentSutra identity, homepage, production navigation, required learning content, or general asset pipeline.

## Decision

- Do not add `ml-sharp`, its weights, or generated outputs to the production website.
- Do not use SHARP to create the AgentSutra logo, brand texture, homepage background, or an asset required to understand a Field Note.
- Do not download weights in this sprint.
- Keep any future experiment in an isolated local research branch and route it under `/labs/` only after a separate rights and release review.
- Provide a complete static image and text alternative before any interactive 3D enhancement.
- Treat a Lab Note as an investigation of the system's limits, not a showcase of a visual effect.

## Proposed bounded experiment

An original photograph of a deliberately constructed Thread object could be used to ask:

> What does a single-image 3D reconstruction invent when the unseen side matters?

The experiment would record:

- source-image rights and capture conditions;
- exact code, model, hardware, and environment versions;
- prediction and rendering paths used;
- geometry that survives a viewpoint change and geometry that collapses;
- output size, browser cost, and static fallback;
- the model-weight licence in force at the time of the run;
- a public boundary stating that plausible appearance is not measured geometric truth.

## Release conditions

No output may enter a public or career-facing surface until all of the following are true:

1. the current upstream code and model licences have been reviewed for the intended use;
2. the source photograph and every published asset are rights-cleared;
3. a reproducible local record exists;
4. the experience has a useful non-WebGL fallback and visible text explanation;
5. performance and device support are measured;
6. publication does not imply that SHARP is an AgentSutra dependency or product feature.

## Consequences

AgentSutra can explore an ambitious visual system without inheriting a research-only model licence or making a fragile 3D demo part of the reader's critical path. The proposal remains available when it can teach a real transferable lesson.

## Primary references

- [Apple SHARP README](https://github.com/apple/ml-sharp/blob/main/README.md)
- [Apple SHARP model licence](https://github.com/apple/ml-sharp/blob/main/LICENSE_MODEL)
