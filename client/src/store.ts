import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface Store {
  files: Record<string, string>;
  currentFile: string | null;
  fileContent: string;
  terminalOutput: string;
  socket: Socket | null;
  setFiles: (files: Record<string, string>) => void;
  addFile: (path: string, content: string) => void;
  removeFile: (path: string) => void;
  setCurrentFile: (file: string | null) => void;
  setFileContent: (content: string) => void;
  setTerminalOutput: (output: string) => void;
  executeCommand: (command: string) => void;
  initializeSocket: () => void;
}

const useStore = create<Store>((set, get) => ({
  files: {},
  currentFile: null,
  fileContent: '',
  terminalOutput: '',
  socket: null,
  setFiles: (files) => set({ files }),
  addFile: (path, content) => set((state) => ({ files: { ...state.files, [path]: content } })),
  removeFile: (path) => set((state) => {
    const newFiles = { ...state.files };
    delete newFiles[path];
    return { files: newFiles };
  }),
  setCurrentFile: (file) => set({ currentFile: file, fileContent: file ? state.files[file] ?? '' : '' }),
  setFileContent: (content) => set((state) => {
    const newFiles = state.currentFile
      ? { ...state.files, [state.currentFile]: content }
      : state.files;
    return { files: newFiles, fileContent: content };
  }),
  setTerminalOutput: (output) => set({ terminalOutput: output }),
  executeCommand: (command) => {
    const socket = get().socket;
    if (!socket) return;
    // Clear current output
    set({ terminalOutput: '' });
    socket.emit('execute-command', { command });
  },
  initializeSocket: () => {
    // Avoid initializing multiple times
    const { socket } = get();
    if (socket) return socket;
    const newSocket = io(import.meta.env.VITE_SOCKET_URL || window.location.origin);
    set({ socket: newSocket });
    // Listen for file operations from other clients
    newSocket.on('fileCreated', (path: string, content: string) => {
      get().addFile(path, content);
    });
    newSocket.on('fileDeleted', (path: string) => {
      get().removeFile(path);
    });
    newSocket.on('fileRenamed', (oldPath: string, newPath: string, content: string) => {
      get().removeFile(oldPath);
      get().addFile(newPath, content);
    });
    // Listen for command output
    newSocket.on('command-output', ({ data, done, code }) => {
      get().setTerminalOutput((prev) => prev + data);
      // If done, we can optionally add a newline or prompt
      if (done) {
        get().setTerminalOutput((prev) => prev + '\n');
      }
    });
    return newSocket;
  },
}));

export default useStore;