import type { WebContainer, FileSystemTree } from '@webcontainer/api';
import type { FileNode } from '@/components/common/FileTree';

const IGNORED = new Set(['node_modules', '.git', 'dist', '.vite', '.next', '.cache']);

/**
 * Converts a flat array of { path, content } into the nested FileSystemTree
 * format expected by WebContainer.mount().
 *
 * e.g. [{ path: 'src/App.jsx', content: '...' }]
 * becomes { src: { directory: { 'App.jsx': { file: { contents: '...' } } } } }
 */
export function buildWCFiles(files: { path: string; content: string }[]): FileSystemTree {
  const root: FileSystemTree = {};

  for (const { path, content } of files) {
    const parts = path.replace(/^\//, '').split('/').filter(Boolean);
    let node = root as Record<string, any>;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!node[parts[i]]) node[parts[i]] = { directory: {} };
      node = node[parts[i]].directory;
    }

    node[parts[parts.length - 1]] = { file: { contents: content } };
  }

  return root;
}

/**
 * Recursively reads the WebContainer file system into a FileNode[] tree,
 * skipping ignored directories (node_modules, .git, dist, etc.).
 */
export async function readWCTree(
  wc: WebContainer,
  dir = '/',
): Promise<FileNode[]> {
  const entries = await wc.fs.readdir(dir, { withFileTypes: true });
  const nodes: FileNode[] = [];

  for (const entry of entries) {
    if (IGNORED.has(entry.name)) continue;

    const fullPath = (dir === '/' ? '' : dir) + '/' + entry.name;

    if (entry.isDirectory()) {
      const children = await readWCTree(wc, fullPath);
      nodes.push({ name: entry.name, path: fullPath, type: 'folder', children });
    } else {
      nodes.push({ name: entry.name, path: fullPath, type: 'file' });
    }
  }

  return nodes;
}
