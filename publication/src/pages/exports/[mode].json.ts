import type { APIRoute } from 'astro';

import { loadPublicationGraph } from '../../lib/content';
import { getPublicEvidencePresentation } from '../../lib/public-evidence';

export const prerender = true;

export function getStaticPaths() {
  const enabled = process.env.INCLUDE_FIXTURES === '1' && process.env.EXPORT_MODE === '1';
  return enabled ? [{ params: { mode: 'manifest' } }] : [];
}

export const GET: APIRoute = async () => {
  const graph = await loadPublicationGraph({ includeFixtures: true });
  const evidencePacks = new Map(graph.evidencePacks.map((pack) => [pack.id, pack]));
  const diagrams = new Map(graph.threadDiagrams.map((diagram) => [diagram.id, diagram]));
  const adaptations = graph.adaptations.map((adaptation) => {
    const evidencePack = evidencePacks.get(adaptation.evidencePackId);
    if (!evidencePack) throw new Error(`${adaptation.id} has no linked evidence pack.`);
    const frames = adaptation.frames.map((frame) => {
      const diagram = frame.diagramId ? diagrams.get(frame.diagramId) : undefined;
      return {
        ...frame,
        ...(diagram
          ? { diagramTextEquivalent: diagram.textSteps.map((step) => step.summary).join(' ') }
          : {}),
      };
    });
    return {
      ...adaptation,
      frames,
      evidence: getPublicEvidencePresentation(evidencePack),
    };
  });
  return new Response(`${JSON.stringify({ schemaVersion: 2, adaptations }, null, 2)}\n`, {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
};
