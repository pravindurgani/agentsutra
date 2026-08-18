import { getCollection } from 'astro:content';

import type { Adaptation, EvidencePack, FieldNote, Interview, ThreadDiagram } from '../schemas';
import { validatePublicationGraph, type PublicationGraph } from './publication-graph';

export interface LoadPublicationGraphOptions {
  includeFixtures?: boolean;
}

export async function loadPublicationGraph(
  options: LoadPublicationGraphOptions = {},
): Promise<PublicationGraph> {
  const includeFixtures = options.includeFixtures ?? process.env.INCLUDE_FIXTURES === '1';
  const manifests = await getCollection('publicationGraph');
  const manifest = manifests.find((entry) => entry.id === 'manifest');
  if (!manifest) throw new Error('The validated AgentSutra publication manifest is missing.');
  if (manifest.data.fixtureMode !== includeFixtures) {
    throw new Error(
      'Fixture mode changed after content sync. Re-run Astro with a consistent INCLUDE_FIXTURES value.',
    );
  }

  // The publicationGraph loader has already parsed every source and rejected orphans.
  // Avoid querying intentionally empty pre-launch collections, which only emits noisy warnings.
  if (manifest.data.counts.fieldNotes === 0) {
    return validatePublicationGraph({
      fieldNotes: [],
      evidencePacks: [],
      threadDiagrams: [],
      adaptations: [],
      interviews: [],
    });
  }

  const [fieldNoteEntries, evidenceEntries, diagramEntries, adaptationEntries, interviewEntries] =
    await Promise.all([
      getCollection('fieldNotes'),
      getCollection('evidencePacks'),
      getCollection('threadDiagrams'),
      getCollection('adaptations'),
      getCollection('interviews'),
    ]);

  const select = <T extends { fieldNoteId?: string; id: string }>(entries: Array<{ data: T }>) =>
    entries
      .map((entry) => entry.data)
      .filter(
        (record) => includeFixtures || (record.id !== 'FN-000' && record.fieldNoteId !== 'FN-000'),
      );

  return validatePublicationGraph({
    fieldNotes: select(fieldNoteEntries as Array<{ data: FieldNote }>),
    evidencePacks: select(evidenceEntries as Array<{ data: EvidencePack }>),
    threadDiagrams: select(diagramEntries as Array<{ data: ThreadDiagram }>),
    adaptations: select(adaptationEntries as Array<{ data: Adaptation }>),
    interviews: select(interviewEntries as Array<{ data: Interview }>),
  });
}

export async function getVisibleFieldNotes(
  options: LoadPublicationGraphOptions = {},
): Promise<FieldNote[]> {
  const graph = await loadPublicationGraph(options);
  return graph.fieldNotes
    .filter((note) =>
      options.includeFixtures
        ? true
        : !note.fixture && (note.lifecycle === 'published' || note.lifecycle === 'corrected'),
    )
    .sort((left, right) => right.dates.created.localeCompare(left.dates.created));
}
