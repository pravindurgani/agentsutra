import { readdir, readFile } from 'node:fs/promises';
import { extname, relative } from 'node:path';

const TEXT_EXTENSIONS = new Set([
  '.astro',
  '.css',
  '.csv',
  '.html',
  '.js',
  '.json',
  '.jsonc',
  '.md',
  '.mdx',
  '.mjs',
  '.svg',
  '.txt',
  '.ts',
  '.xml',
  '.yaml',
  '.yml',
]);

/**
 * @param {string} directory
 * @returns {Promise<string[]>}
 */
export async function walkFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = `${directory}/${entry.name}`;
    if (entry.isSymbolicLink()) {
      throw new Error(`Refusing to scan symbolic link: ${path}`);
    }
    if (entry.isDirectory()) files.push(...(await walkFiles(path)));
    if (entry.isFile()) files.push(path);
  }

  return files;
}

/** @param {string} path */
export function isTextFile(path) {
  return TEXT_EXTENSIONS.has(extname(path).toLowerCase());
}

/** @param {string} path */
export async function readUtf8(path) {
  return readFile(path, 'utf8');
}

/** @param {string} root @param {string} path */
export function displayPath(root, path) {
  return relative(root, path) || '.';
}
