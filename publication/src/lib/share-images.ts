import type { ShareImage } from '../schemas';

export const defaultShareImage = {
  src: '/social/agentsutra-default.png',
  alt: 'AgentSutra default share artwork with a vertical Thread and the words Push the model, inspect the failure, keep the lesson.',
  width: 1200,
  height: 630,
} as const satisfies ShareImage;

export const defaultShareImageProvenance = {
  source: '/social/agentsutra-default.svg',
  sourceSha256: 'eca5c14b913d6c2c76c74510cb134048d70bac1e7c0c9aea172750a1dad167c1',
  rasterSha256: 'beda11c0635fea7dcb1e309cbb5b955fe3997c9d3fa8ef0d130b4883580def36',
  scope:
    'These hashes bind the committed editable SVG and PNG. Dimensions and accessible text are checked separately; this record does not claim pixel-level render equivalence.',
} as const;
