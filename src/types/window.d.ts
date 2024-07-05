interface Window {
  electron: {
    createFile: () => Promise<string>;
    readFile: (filePath: string) => string;
    writeFile: (filePath: string, content: string) => string;
    onStoreAppStatusRequest: ( callback: () => void ) => void;
    onOpenedAppStatus: ( callback: ( event, status) => void ) => void;
    openAppStatus: () => Promise<string>;
    sendAppStatus: (status: any) => void;
  },
  find: (searchTerm: string) => boolean;
  getSelection: () => Selection | null;
  execCommand: (command: string, showUI?: boolean, value?: string) => void;
}