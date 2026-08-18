import { promises as fs } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import type { Loader } from 'astro/loaders';
import { parse } from 'yaml';

import {
  adaptationSchema,
  evidencePackSchema,
  fieldNoteSchema,
  interviewSchema,
  threadDiagramSchema,
} from '../schemas';
import { validatePublicationGraph, type PublicationGraph } from './publication-graph';
import { readYamlRecordFiles } from './yaml-loader';

const productionDataFiles = {
  evidencePacks: ['./src/data/evidence-packs.yaml'],
  threadDiagrams: ['./src/data/thread-diagrams.yaml'],
  adaptations: ['./src/data/adaptations.yaml'],
  interviews: ['./src/data/interviews.yaml'],
} as const;

const fixtureDataFiles = {
  evidencePacks: ['./src/data/fixtures/evidence-packs.yaml'],
  threadDiagrams: ['./src/data/fixtures/thread-diagrams.yaml'],
  adaptations: ['./src/data/fixtures/adaptations.yaml'],
  interviews: ['./src/data/fixtures/interviews.yaml'],
} as const;

export function publicationDataFiles(includeFixtures: boolean) {
  return Object.fromEntries(
    Object.entries(productionDataFiles).map(([key, files]) => [
      key,
      includeFixtures
        ? [...files, ...fixtureDataFiles[key as keyof typeof fixtureDataFiles]]
        : [...files],
    ]),
  ) as Record<keyof typeof productionDataFiles, string[]>;
}

function parseFrontmatter(source: string, filePath: string): unknown {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw new Error(`${filePath} must begin with YAML frontmatter.`);
  return parse(match[1]!);
}

async function loadFieldNotes(rootPath: string, includeFixtures: boolean) {
  const base = join(rootPath, 'src/content/field-notes');
  const names = await fs.readdir(base, { recursive: true });
  const files = names
    .filter((name) => name.endsWith('.md'))
    .filter((name) => includeFixtures || !name.split(sep).includes('fixtures'))
    .sort();

  return Promise.all(
    files.map(async (name) => {
      const filePath = join(base, name);
      const source = await fs.readFile(filePath, 'utf8');
      return fieldNoteSchema.parse(parseFrontmatter(source, filePath));
    }),
  );
}

async function parseRecords<T>(
  root: URL,
  files: readonly string[],
  schema: { parse: (value: unknown) => T },
): Promise<T[]> {
  const records = await readYamlRecordFiles(root, files);
  return records.map(({ data }) => schema.parse(data));
}

export async function loadPublicationGraphFromDisk(options: {
  root: string | URL;
  includeFixtures?: boolean;
}): Promise<PublicationGraph> {
  const rootUrl =
    options.root instanceof URL
      ? options.root
      : pathToFileURL(options.root.endsWith('/') ? options.root : `${options.root}/`);
  const rootPath = fileURLToPath(rootUrl);
  const files = publicationDataFiles(options.includeFixtures === true);
  const [fieldNotes, evidencePacks, threadDiagrams, adaptations, interviews] = await Promise.all([
    loadFieldNotes(rootPath, options.includeFixtures === true),
    parseRecords(rootUrl, files.evidencePacks, evidencePackSchema),
    parseRecords(rootUrl, files.threadDiagrams, threadDiagramSchema),
    parseRecords(rootUrl, files.adaptations, adaptationSchema),
    parseRecords(rootUrl, files.interviews, interviewSchema),
  ]);

  return validatePublicationGraph({
    fieldNotes,
    evidencePacks,
    threadDiagrams,
    adaptations,
    interviews,
  });
}

export function publicationGraphLoader(includeFixtures: boolean): Loader {
  return {
    name: 'agentsutra-publication-graph',
    load: async ({ config, generateDigest, logger, store, watcher }) => {
      const rootPath = fileURLToPath(config.root);
      const synchronise = async () => {
        const graph = await loadPublicationGraphFromDisk({
          root: config.root,
          includeFixtures,
        });
        const data = {
          schemaVersion: '1.0' as const,
          fixtureMode: includeFixtures,
          noteIds: graph.fieldNotes.map((note) => note.id).sort(),
          counts: {
            fieldNotes: graph.fieldNotes.length,
            evidencePacks: graph.evidencePacks.length,
            threadDiagrams: graph.threadDiagrams.length,
            adaptations: graph.adaptations.length,
            interviews: graph.interviews.length,
          },
        };
        store.clear();
        store.set({ id: 'manifest', data, digest: generateDigest(JSON.stringify(data)) });
        logger.debug('Validated the AgentSutra cross-reference graph.');
      };

      await synchronise();
      const watchedDirectories = [
        join(rootPath, 'src/content/field-notes'),
        join(rootPath, 'src/data'),
      ];
      watcher?.add(watchedDirectories);
      watcher?.on('change', async (changedPath) => {
        const isPublicationSource =
          watchedDirectories.some((directory) => changedPath.startsWith(directory)) &&
          /\.(md|ya?ml)$/.test(changedPath);
        if (isPublicationSource) await synchronise();
      });
    },
  };
}

export function relativePublicationPath(root: string, filePath: string): string {
  return relative(root, filePath).split(sep).join('/');
}
