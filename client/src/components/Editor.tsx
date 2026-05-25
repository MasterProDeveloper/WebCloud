import React, { useEffect } from 'react';
import { useStore } from '../store';
import MonacoEditor from '@monaco-editor/react';

const Editor: React.FC<{ 
  fileContent: string; 
  onContentChange: (content: string) => void; 
  currentFile: string | null 
}> = ({ fileContent, onContentChange, currentFile }) => {
  const [editorOptions] = useState(() => ({
    theme: 'vs-dark',
    language: 'javascript',
    automaticLayout: true,
  }));

  useEffect(() => {
    // Update language based on file extension
    // This is a simple version; you can extend it
  }, [currentFile]);

  return (
    <div className="editor-container">
      {currentFile ? (
        <MonacoEditor
          height="100%"
          width="100%"
          defaultLanguage="javascript"
          defaultValue={fileContent}
          options={editorOptions}
          onChange={onContentChange}
        />
      ) : (
        <div className="editor-placeholder">
          Select a file to edit
        </div>
      )}
    </div>
  );
};

export default Editor;