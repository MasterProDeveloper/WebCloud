import { create } from 'zustand'

interface StoreState {
  files: Record<string, string>
  currentFile: string | null
  fileContent: string
  terminalOutput: string
  setFiles: (files: Record<string, string>) => void
  setCurrentFile: (path: string | null) => void
  setFileContent: (content: string) => void
  addFile: (path: string, content?: string) => void
  removeFile: (path: string) => void
  setTerminalOutput: (output: string) => void
}

export const useStore = create<StoreState>((set) => ({
  files: {},
  currentFile: null,
  fileContent: '',
  terminalOutput: '',

  setFiles: (files) => set({ files }),

  setCurrentFile: (path) =>
    set((state) => ({
      currentFile: path,
      fileContent: path ? state.files[path] ?? '' : '',
    })),

  setFileContent: (content) =>
    set((state) => {
      const newFiles = state.currentFile
        ? { ...state.files, [state.currentFile]: content }
        : state.files
      return { files: newFiles, fileContent: content }
    }),

  addFile: (path, content = '') =>
    set((state) => ({
      files: { ...state.files, [path]: content },
    })),

  removeFile: (path) =>
    set((state) => {
      const newFiles = { ...state.files }
      delete newFiles[path]
      const newCurrentFile = state.currentFile === path ? null : state.currentFile
      const newFileContent = state.currentFile === path ? '' : state.fileContent
      return {
        files: newFiles,
        currentFile: newCurrentFile,
        fileContent: newFileContent,
      }
    }),

  setTerminalOutput: (output) => set({ terminalOutput: output }),
}))