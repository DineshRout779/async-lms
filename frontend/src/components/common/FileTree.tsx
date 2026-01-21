type FileNode = {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
};

type PlaygroundFile = {
  path: string; // e.g. "src/app.py"
  content: string;
};

export function buildFileTree(files: PlaygroundFile[]): FileNode[] {
  const root: FileNode[] = [];

  for (const file of files) {
    const parts = file.path.split('/');
    let currentLevel = root;
    let currentPath = '';

    parts.forEach((part, index) => {
      currentPath += (currentPath ? '/' : '') + part;

      let node = currentLevel.find((n) => n.name === part);

      if (!node) {
        node = {
          name: part,
          path: currentPath,
          type: index === parts.length - 1 ? 'file' : 'folder',
          children: [],
        };
        currentLevel.push(node);
      }

      if (node.type === 'folder') {
        currentLevel = node.children!;
      }
    });
  }

  return root;
}

function FileTree({
  nodes,
  activePath,
  onSelect,
}: {
  nodes: FileNode[];
  activePath: string | null;
  onSelect: (path: string) => void;
}) {
  return (
    <ul className='ml-2'>
      {nodes.map((node) => (
        <li key={node.path}>
          {node.type === 'folder' ? (
            <details open>
              <summary className='cursor-pointer text-slate-300'>
                📁 {node.name}
              </summary>
              <FileTree
                nodes={node.children!}
                activePath={activePath}
                onSelect={onSelect}
              />
            </details>
          ) : (
            <div
              onClick={() => onSelect(node.path)}
              className={`cursor-pointer pl-4 ${
                node.path === activePath ? 'text-blue-400' : 'text-slate-400'
              }`}
            >
              📄 {node.name}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export default FileTree;
