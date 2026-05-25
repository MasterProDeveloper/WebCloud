import React, { useState, useEffect, useRef, MouseEvent } from 'react';
import { useStore } from '../store';
import { io, Socket } from 'socket.io-client';
import {
  TreeView,
  useTree,
  getTreeItemProps,
  getToggleProps,
  getLabelProps,
  ReactComplexTreeProps,
} from 'react-complex-tree';
import {
  FaFile,
  FaFolder,
  FaFileCode,
  FaFileImage,
  FaFilePdf,
  FaFileZip,
  FaFileAudio,
  FaFileVideo,
  FaFileExcel,
  FaFilePowerpoint,
  FaFileWord,
  FaFileAlt,
  FaRegFile,
  FaRegFolder,
} from 'react-icons/fa';
import { MdOutlineDeleteForever, MdOutlineRename, MdOutlineAdd } from 'react-icons/md';
import { BiDotsThreeVertical } from 'react-icons/bi';
import './FileExplorer.css';

// Icon mapping based on file extension
const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
    case 'html':
    case 'css':
    case 'scss':
    case 'json':
      return FaFileCode;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
    case 'webp':
      return FaFileImage;
    case 'pdf':
      return FaFilePdf;
    case 'zip':
    case 'rar':
    case '7z':
      return FaFileZip;
    case 'mp3':
    case 'wav':
    case 'ogg':
      return FaFileAudio;
    case 'mp4':
    case 'avi':
    case 'mov':
    case 'mkv':
      return FaFileVideo;
    case 'xls':
    case 'xlsx':
      return FaFileExcel;
    case 'ppt':
    case 'pptx':
      return FaFilePowerpoint;
    case 'doc':
    case 'docx':
      return FaFileWord;
    default:
      return FaFile;
  }
};

// Type for our tree node
type FileNode = {
  id: string; // full path
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
};

// Convert flat file map to tree
const filesToTree = (files: Record<string, string>): FileNode[] => {
  const root: FileNode = { id: '', name: 'root', type: 'folder', children: [] };
  const nodes: Record<string, FileNode> = { '': root };

  Object.keys(files).forEach((path) => {
    if (path === '') return; // skip root if exists
    const parts = path.split('/').filter((p) => p);
    let currentId = '';
    let currentParent = root;

    parts.forEach((part, index) => {
      currentId = currentId ? `${currentId}/${part}` : part;
      if (!nodes[currentId]) {
        const isLast = index === parts.length - 1;
        const node: FileNode = {
          id: currentId,
          name: part,
          type: isLast ? 'file' : 'folder',
          children: isLast ? undefined : [],
        };
        nodes[currentId] = node;
        if (!currentParent.children) currentParent.children = [];
        currentParent.children.push(node);
        currentParent = node;
      } else {
        currentParent = nodes[currentId];
      }
    });
  });

  // Return root's children
  return root.children || [];
};

const FileExplorer: React.FC = () => {
  const { files, currentFile, setCurrentFile, addFile, removeFile } = useStore();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(
    null
  );
  const [contextMenuItemId, setContextMenuItemId] = useState<string | null>(null);
  const [renameInputValue, setRenameInputValue] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState<'file' | 'folder'>('file');
  const [isRenaming, setIsRenaming] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Initialize socket connection
  useEffect(() => {
    const socketIO = io(import.meta.env.VITE_SOCKET_URL || window.location.origin);
    setSocket(socketIO);

    // Listen for file operations from other clients
    socketIO.on('fileCreated', (path: string, content: string) => {
      addFile(path, content);
    });

    socketIO.on('fileDeleted', (path: string) => {
      removeFile(path);
    });

    socketIO.on('fileRenamed', (oldPath: string, newPath: string, content: string) => {
      // Remove old file, add new file with same content
      removeFile(oldPath);
      addFile(newPath, content);
    });

    return () => {
      socketIO.disconnect();
    };
  }, [addFile, removeFile]);

  // Handle creating a new file or folder
  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    const parentPath = contextMenuItemId ? contextMenuItemId : '';
    const newPath = parentPath
      ? `${parentPath}/${newItemName}`
      : newItemName;
    const content = newItemType === 'file' ? '' : undefined; // folders have no content
    // Optimistically add to store
    addFile(newPath, content);
    // Emit to server
    if (socket) {
      socket.emit('createItem', { path: newPath, type: newItemType, content });
    }
    // Reset form
    setNewItemName('');
    setContextMenuPosition(null);
    setContextMenuItemId(null);
  };

  // Handle deleting an item
  const handleDeleteItem = () => {
    if (!contextMenuItemId) return;
    // Optimistically remove from store
    removeFile(contextMenuItemId);
    // Emit to server
    if (socket) {
      socket.emit('deleteItem', { path: contextMenuItemId });
    }
    setContextMenuPosition(null);
    setContextMenuItemId(null);
  };

  // Handle renaming an item (start renaming)
  const handleStartRename = (e: MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.stopPropagation();
    setIsRenaming(true);
    // We'll set the input value after the rename UI is rendered
  };

  // Handle renaming an item (submit)
  const handleSubmitRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contextMenuItemId || !renameInputValue.trim() || renameInputValue === getItemName(contextMenuItemId)) {
      setIsRenaming(false);
      setRenameInputValue('');
      return;
    }
    const oldPath = contextMenuItemId;
    const newName = renameInputValue.trim();
    const newPath = getParentPath(oldPath) ? `${getParentPath(oldPath)}/${newName}` : newName;
    // Get current content from store
    const content = files[oldPath] ?? '';
    // Optimistically rename in store
    removeFile(oldPath);
    addFile(newPath, content);
    // Emit to server
    if (socket) {
      socket.emit('renameItem', { oldPath, newPath, content });
    }
    setIsRenaming(false);
    setRenameInputValue('');
    setContextMenuPosition(null);
    setContextMenuItemId(null);
  };

  // Helper to get item name from path
  const getItemName = (path: string) => {
    return path.split('/').pop() || path;
  };

  // Helper to get parent path
  const getParentPath = (path: string) => {
    const parts = path.split('/');
    parts.pop();
    return parts.length > 0 ? parts.join('/') : '';
  };

  // Handle context menu (right-click)
  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, itemId: string) => {
    e.preventDefault();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setContextMenuItemId(itemId);
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuPosition) {
        setContextMenuPosition(null);
        setContextMenuItemId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [contextMenuPosition]);

  // Get tree data
  const treeData = filesToTree(files);

  // Use the hook from react-complex-tree
  const {
    getTreeProps,
    getTreeItemProps,
    getToggleProps,
    getLabelProps,
    dragAndDrop: { getDragProps, getDropProps },
  } = useTree({
    treeData,
    // We don't implement drag and drop for now, but we can add later
    // We'll just use the props for selection and expansion
    getNodeId: (node) => node.id,
    getNodeChildren: (node) => node.children ?? [],
  });

  return (
    <div className="file-explorer">
      <div className="toolbar">
        <button onClick={() => setContextMenuPosition({ x: 10, y: 40 })}>
          <MdOutlineAdd /> New Item
        </button>
      </div>
      <TreeView {...getTreeProps()}>
        {treeData.map((node) => (
          <TreeItem
            key={node.id}
            itemData={node}
            getTreeItemProps={getTreeItemProps}
            getToggleProps={getToggleProps}
            getLabelProps={getLabelProps}
          >
            {(itemProps) => {
              const isSelected = currentFile === itemProps.itemData.id;
              const isFolder = itemProps.itemData.type === 'folder';
              const Icon = isFolder ? FaFolder : getFileIcon(itemProps.itemData.name);
              return (
                <div
                  ref={itemProps.ref}
                  {...itemProps.props}
                  className={`tree-item ${isSelected ? 'selected' : ''} ${isFolder ? 'folder' : 'file'}`}
                  onContextMenu={(e) => handleContextMenu(e, itemProps.itemData.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isFolder) {
                      setCurrentFile(itemProps.itemData.id);
                    }
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (!isFolder) {
                      setCurrentFile(itemProps.itemData.id);
                    }
                  }}
                >
                  <div className="tree-item-content">
                    <Icon className="tree-item-icon" />
                    <span className="tree-item-label">{itemProps.itemData.name}</span>
                  </div>
                  {/* Rename input (shown when renaming) */}
                  {isRenaming &&
                    contextMenuItemId === itemProps.itemData.id && (
                      <form
                        onSubmit={handleSubmitRename}
                        className="rename-form"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSubmitRename(e as React.FormEvent);
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            setIsRenaming(false);
                            setRenameInputValue('');
                          }
                        }}
                      >
                        <input
                          ref={renameInputRef}
                          type="text"
                          value={renameInputValue}
                          onChange={(e) => setRenameInputValue(e.target.value)}
                          autoFocus
                          defaultValue={getItemName(itemProps.itemData.id)}
                        />
                        <button type="submit">Save</button>
                        <button type="button" onClick={() => {
                          setIsRenaming(false);
                          setRenameInputValue('');
                        }}>
                          Cancel
                        </button>
                      </form>
                    )}
                </div>
              );
            }}
          </TreeItem>
        ))}
      </TreeView>

      {/* Context Menu */}
      {contextMenuPosition && (
        <div
          className="context-menu"
          style={{
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={handleStartRename}>
            <MdOutlineRename /> Rename
          </button>
          <button onClick={handleDeleteItem} className="danger">
            <MdOutlineDeleteForever /> Delete
          </button>
          <hr />
          <form onSubmit={handleCreateItem} className="new-item-form">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Name"
              required
            />
            <select
              value={newItemType}
              onChange={(e) => setNewItemType(e.target.value as 'file' | 'folder')}
            >
              <option value="file">File</option>
              <option value="folder">Folder</option>
            </select>
            <button type="submit">Create</button>
            <button type="button" onClick={() => {
              setNewItemName('');
              setContextMenuPosition(null);
              setContextMenuItemId(null);
            }}>Cancel</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default FileExplorer;