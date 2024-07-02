interface Window {
  electron: {
    createFile: () => Promise<string>;
    readFile: (filePath: string) => string;
    writeFile: (filePath: string, content: string) => string;
  },
  find: (searchTerm: string) => boolean;
  getSelection: () => Selection | null;
  execCommand: (command: string, showUI?: boolean, value?: string) => void;
}