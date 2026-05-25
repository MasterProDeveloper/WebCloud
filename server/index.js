const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"],
    methods: ["GET", "POST"]
  }
});

// Serve static files from the project directory
app.use('/project', express.static(path.join(__dirname, '..', 'project')));

// Ensure project directory exists
const projectDir = path.join(__dirname, '..', 'project');
if (!fs.existsSync(projectDir)) {
  fs.mkdirSync(projectDir, { recursive: true });
}

io.on('connection', (socket) => {
  console.log('a user connected');

  // List files in the project directory
  socket.on('list-files', (callback) => {
    const dirTree = getDirTree(projectDir);
    callback(dirTree);
  });

  // Read a file
  socket.on('read-file', ({ filePath }, callback) => {
    const fullPath = path.join(projectDir, filePath);
    fs.readFile(fullPath, 'utf8', (err, data) => {
      if (err) {
        callback({ error: err.message });
      } else {
        callback({ content: data });
      }
    });
  });

  // Write to a file
  socket.on('write-file', ({ filePath, content }, callback) => {
    const fullPath = path.join(projectDir, filePath);
    // Ensure the directory exists
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFile(fullPath, content, 'utf8', (err) => {
      if (err) {
        callback({ error: err.message });
      } else {
        callback({ success: true });
      }
    });
  });

  // Delete a file or folder
  socket.on('delete-file', ({ filePath }, callback) => {
    const fullPath = path.join(projectDir, filePath);
    fs.rm(fullPath, { recursive: true, force: true }, (err) => {
      if (err) {
        callback({ error: err.message });
      } else {
        callback({ success: true });
      }
    });
  });

  // Create a new file
  socket.on('create-file', ({ filePath, content = '' }, callback) => {
    const fullPath = path.join(projectDir, filePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFile(fullPath, content, 'utf8', (err) => {
      if (err) {
        callback({ error: err.message });
      } else {
        callback({ success: true });
      }
    });
  });

  // Create a new folder
  socket.on('create-folder', ({ folderPath }, callback) => {
    const fullPath = path.join(projectDir, folderPath);
    fs.mkdir(fullPath, { recursive: true }, (err) => {
      if (err) {
        callback({ error: err.message });
      } else {
        callback({ success: true });
      }
    });
  });

  // Execute a shell command in the project directory and stream the output
  socket.on('execute-command', ({ command }, callback) => {
    const child = exec(command, { cwd: projectDir, maxBuffer: 1024 * 1024 });
    let output = '';
    child.stdout.on('data', (data) => {
      output += data;
      socket.emit('command-output', { data: output, done: false });
    });
    child.stderr.on('data', (data) => {
      output += data;
      socket.emit('command-output', { data: output, done: false });
    });
    child.on('close', (code) => {
      socket.emit('command-output', { data: output, done: true, code });
      callback({ success: true });
    });
    child.on('error', (err) => {
      socket.emit('command-output', { data: err.message, done: true, code: 1 });
      callback({ error: err.message });
    });
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

function getDirTree(dir) {
  const tree = { name: path.basename(dir), type: 'directory', children: [] };
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      tree.children.push(getDirTree(fullPath));
    } else {
      tree.children.push({ name: item, type: 'file' });
    }
  }
  return tree;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});