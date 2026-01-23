export type Language = {
  label: string;
  value: string;
  monaco: string;
};

export const languages: Language[] = [
  { label: 'JavaScript', value: 'javascript', monaco: 'javascript' },
  { label: 'Python', value: 'python', monaco: 'python' },
];

export const getLanguageFromPath = (path: string): string => {
  const ext = path.split('.').pop();
  switch (ext) {
    case 'js':
      return 'javascript';
    case 'ts':
      return 'typescript';
    case 'json':
      return 'json';
    case 'py':
      return 'python';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    default:
      return 'plaintext';
  }
};
