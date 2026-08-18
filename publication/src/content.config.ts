import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

import {
  adaptationSchema,
  evidencePackSchema,
  fieldNoteSchema,
  interviewSchema,
  threadDiagramSchema,
} from './schemas';
import { publicationDataFiles, publicationGraphLoader } from './lib/publication-graph-files';
import { yamlRecordFilesLoader } from './lib/yaml-loader';

const includeFixtures = process.env.INCLUDE_FIXTURES === '1';
const dataFiles = publicationDataFiles(includeFixtures);

const fieldNotes = defineCollection({
  loader: glob({
    base: './src/content/field-notes',
    pattern: includeFixtures ? '**/*.md' : ['**/*.md', '!fixtures/**'],
  }),
  schema: fieldNoteSchema,
});

const evidencePacks = defineCollection({
  loader: yamlRecordFilesLoader({ name: 'evidence packs', files: dataFiles.evidencePacks }),
  schema: evidencePackSchema,
});

const threadDiagrams = defineCollection({
  loader: yamlRecordFilesLoader({ name: 'Thread diagrams', files: dataFiles.threadDiagrams }),
  schema: threadDiagramSchema,
});

const adaptations = defineCollection({
  loader: yamlRecordFilesLoader({ name: 'adaptations', files: dataFiles.adaptations }),
  schema: adaptationSchema,
});

const interviews = defineCollection({
  loader: yamlRecordFilesLoader({ name: 'interview records', files: dataFiles.interviews }),
  schema: interviewSchema,
});

const publicationGraph = defineCollection({
  loader: publicationGraphLoader(includeFixtures),
  schema: z
    .object({
      schemaVersion: z.literal('1.0'),
      fixtureMode: z.boolean(),
      noteIds: z.array(z.string().regex(/^FN-\d{3}$/)),
      counts: z
        .object({
          fieldNotes: z.number().int().nonnegative(),
          evidencePacks: z.number().int().nonnegative(),
          threadDiagrams: z.number().int().nonnegative(),
          adaptations: z.number().int().nonnegative(),
          interviews: z.number().int().nonnegative(),
        })
        .strict(),
    })
    .strict(),
});

export const collections = {
  fieldNotes,
  evidencePacks,
  threadDiagrams,
  adaptations,
  interviews,
  publicationGraph,
};
