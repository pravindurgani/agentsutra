import { existsSync, promises as fs } from 'node:fs';
import { relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import type { Loader } from 'astro/loaders';
import { parse } from 'yaml';

type UnknownRecord = Record<string, unknown>;

function asRecordList(value: unknown, fileName: string): UnknownRecord[] {
  if (Array.isArray(value)) {
    return value.map((entry, index) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        throw new TypeError(`${fileName}[${index}] must be an object.`);
      }
      return entry as UnknownRecord;
    });
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as UnknownRecord).map(([id, entry]) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        throw new TypeError(`${fileName}.${id} must be an object.`);
      }
      return { id, ...(entry as UnknownRecord) };
    });
  }

  throw new TypeError(`${fileName} must contain an array or object of records.`);
}

export async function readYamlRecordFiles(
  root: string | URL,
  files: readonly string[],
): Promise<Array<{ data: UnknownRecord; filePath: string }>> {
  const rootUrl =
    root instanceof URL ? root : pathToFileURL(root.endsWith('/') ? root : `${root}/`);
  const records: Array<{ data: UnknownRecord; filePath: string }> = [];

  for (const file of files) {
    const fileUrl = new URL(file, rootUrl);
    const filePath = fileURLToPath(fileUrl);
    if (!existsSync(filePath)) throw new Error(`Required YAML source is missing: ${file}.`);
    const source = await fs.readFile(filePath, 'utf8');
    const parsed = parse(source) as unknown;
    for (const data of asRecordList(parsed, file)) records.push({ data, filePath });
  }

  return records;
}

export function yamlRecordFilesLoader(options: { name: string; files: readonly string[] }): Loader {
  return {
    name: `agentsutra-yaml:${options.name}`,
    load: async (context) => {
      const { config, generateDigest, logger, parseData, store, watcher } = context;
      const rootPath = fileURLToPath(config.root);
      const absoluteFiles = options.files.map((file) => fileURLToPath(new URL(file, config.root)));

      const synchronise = async () => {
        const records = await readYamlRecordFiles(config.root, options.files);
        const seen = new Set<string>();
        store.clear();

        for (const { data, filePath } of records) {
          const idValue = data.id;
          if (typeof idValue !== 'string' || idValue.trim() === '') {
            throw new Error(`${filePath} contains a record without a string id.`);
          }
          if (seen.has(idValue)) {
            throw new Error(`Duplicate ${options.name} ID: ${idValue}.`);
          }
          seen.add(idValue);
          const parsedData = await parseData({ id: idValue, data, filePath });
          const normalizedPath = relative(rootPath, filePath).split(sep).join('/');
          store.set({
            id: idValue,
            data: parsedData,
            filePath: normalizedPath,
            digest: generateDigest(`${normalizedPath}\n${JSON.stringify(data)}`),
          });
        }
        logger.debug(`Loaded ${records.length} ${options.name} record(s).`);
      };

      await synchronise();
      watcher?.add(absoluteFiles);
      watcher?.on('change', async (changedPath) => {
        if (absoluteFiles.includes(changedPath)) await synchronise();
      });
    },
  };
}
