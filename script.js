const STORAGE_KEY = "forgeai.projects.v1";
const WEBHOOK_KEY = "forgeai.n8nWebhook";

const starters = {
  saas: {
    "index.html": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>NovaFlow</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <header class="nav">
      <strong>NovaFlow</strong>
      <nav><a href="#features">Features</a><a href="#pricing">Pricing</a><a href="#contact">Contact</a></nav>
      <button>Start Free</button>
    </header>
    <main>
      <section class="hero">
        <p>AI operations platform</p>
        <h1>Ship faster with one command center for your entire team.</h1>
        <a href="#pricing">See plans</a>
      </section>
      <section id="features" class="grid">
        <article><h2>Automate</h2><p>Turn repeat work into reliable workflows.</p></article>
        <article><h2>Analyze</h2><p>Understand every launch with live metrics.</p></article>
        <article><h2>Scale</h2><p>Coordinate teams, permissions, and releases.</p></article>
      </section>
    </main>
  </body>
</html>`,
    "styles.css": `body{margin:0;background:#0d1117;color:#f8fafc;font-family:Inter,system-ui,sans-serif}.nav{display:flex;align-items:center;justify-content:space-between;padding:22px 7vw}.nav nav{display:flex;gap:18px}.nav a{color:#cbd5e1;text-decoration:none}.nav button,.hero a{border:0;border-radius:8px;background:#8b5cf6;color:white;padding:12px 18px;font-weight:800}.hero{min-height:72vh;display:grid;align-content:center;padding:0 7vw;background:radial-gradient(circle at 75% 20%,#2563eb55,transparent 28rem)}.hero p{color:#67e8f9;text-transform:uppercase;font-weight:900;letter-spacing:.12em}.hero h1{max-width:850px;font-size:clamp(3rem,8vw,7rem);line-height:.92;margin:0 0 28px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;padding:70px 7vw}.grid article{border:1px solid #334155;border-radius:8px;padding:26px;background:#111827}@media(max-width:760px){.grid{grid-template-columns:1fr}.nav nav{display:none}}`,
    "script.js": `console.log("NovaFlow ready");`,
    "netlify.toml": `[build]
  publish = "."
`,
  },
  portfolio: {
    "index.html": `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Aria Vale</title><link rel="stylesheet" href="styles.css"></head><body><main><section class="hero"><p>Independent designer</p><h1>Elegant identities and websites for culture-driven brands.</h1></section><section class="work"><article>Editorial system</article><article>Gallery launch</article><article>Retail refresh</article></section></main></body></html>`,
    "styles.css": `body{margin:0;background:#f7f1e8;color:#18140f;font-family:Georgia,serif}.hero{min-height:80vh;display:grid;align-content:end;padding:8vw;background:linear-gradient(#0001,#0004),url(https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=85);background-size:cover;color:white}.hero p{text-transform:uppercase;letter-spacing:.15em}.hero h1{max-width:900px;font-size:clamp(3rem,8vw,7rem);line-height:.95}.work{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#18140f}.work article{min-height:220px;background:#f7f1e8;padding:30px;font-size:2rem}@media(max-width:760px){.work{grid-template-columns:1fr}}`,
    "script.js": `console.log("Portfolio loaded");`,
    "netlify.toml": `[build]
  publish = "."
`,
  },
  store: {
    "index.html": `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Oak & Alloy</title><link rel="stylesheet" href="styles.css"></head><body><header><strong>Oak & Alloy</strong><button>Cart</button></header><main><section class="hero"><h1>Objects for rooms with character.</h1></section><section class="products"><article>Stone lamp</article><article>Walnut chair</article><article>Linen throw</article></section></main></body></html>`,
    "styles.css": `body{margin:0;background:#101214;color:#f8fafc;font-family:Inter,system-ui,sans-serif}header{display:flex;justify-content:space-between;padding:24px 7vw}button{border:0;border-radius:8px;padding:10px 16px;background:#f59e0b;color:#111827;font-weight:800}.hero{min-height:65vh;display:grid;place-items:center;text-align:center;background:linear-gradient(#0004,#0008),url(https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1600&q=85);background-size:cover}.hero h1{font-size:clamp(3rem,8vw,7rem);max-width:900px}.products{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;padding:70px 7vw}.products article{min-height:260px;border-radius:8px;background:#1f2937;padding:24px}@media(max-width:760px){.products{grid-template-columns:1fr}}`,
    "script.js": `console.log("Store ready");`,
    "netlify.toml": `[build]
  publish = "."
`,
  },
};

let state = {
  projects: [],
  activeProjectId: "",
  activeFile: "index.html",
  activeTool: "generate",
};

const $ = (selector) => document.querySelector(selector);
const projectList = $("#projectList");
const fileTree = $("#fileTree");
const editor = $("#codeEditor");
const preview = $("#sitePreview");
const filePreview = $("#filePreview");
const previewStage = $("#previewStage");
const messageLog = $("#messageLog");
const toast = $("#toast");

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    state = { ...state, ...JSON.parse(saved) };
  }
  if (!state.projects.length) {
    createProject("Launch Site", "saas", false);
  }
  $("#webhookInput").value = localStorage.getItem(WEBHOOK_KEY) || "";
  updateAgentStatus();
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function activeProject() {
  return state.projects.find((project) => project.id === state.activeProjectId) || state.projects[0];
}

function createProject(name, starter, announce = true) {
  const project = {
    id: uid(),
    name: name.trim() || "Untitled Project",
    createdAt: new Date().toISOString(),
    files: clone(starters[starter] || starters.saas),
    logs: [],
  };
  state.projects.unshift(project);
  state.activeProjectId = project.id;
  state.activeFile = "index.html";
  saveState();
  render();
  if (announce) log("Project created", `${project.name} is ready in the dashboard.`);
}

function render() {
  const project = activeProject();
  if (!project) return;
  $("#projectTitle").textContent = project.name;
  renderProjects();
  renderFiles();
  renderEditor();
  renderPreview();
  renderLogs();
}

function renderProjects() {
  projectList.innerHTML = "";
  state.projects.forEach((project) => {
    const button = document.createElement("button");
    button.className = `project-item${project.id === state.activeProjectId ? " is-active" : ""}`;
    button.type = "button";
    button.innerHTML = `<span>${escapeHtml(project.name)}</span><span>${Object.keys(project.files).length}</span>`;
    button.addEventListener("click", () => {
      state.activeProjectId = project.id;
      state.activeFile = Object.keys(project.files)[0] || "index.html";
      saveState();
      render();
    });
    projectList.appendChild(button);
  });
}

function renderFiles() {
  const project = activeProject();
  fileTree.innerHTML = "";
  Object.keys(project.files)
    .sort()
    .forEach((fileName) => {
      const button = document.createElement("button");
      button.className = `file-row${fileName === state.activeFile ? " is-active" : ""}`;
      button.type = "button";
      button.innerHTML = `<span>${escapeHtml(fileName)}</span><span class="file-kind">${fileKind(fileName)}</span>`;
      button.addEventListener("click", () => {
        saveActiveFile();
        state.activeFile = fileName;
        saveState();
        render();
      });
      fileTree.appendChild(button);
    });
}

function renderEditor() {
  const project = activeProject();
  if (!project.files[state.activeFile]) {
    state.activeFile = Object.keys(project.files)[0] || "index.html";
  }
  $("#activeFileName").textContent = state.activeFile;
  $("#activeFileMeta").textContent = `${fileKind(state.activeFile)} file`;
  editor.value = project.files[state.activeFile] || "";
}

function renderPreview() {
  const project = activeProject();
  const file = state.activeFile;
  const html = project.files["index.html"] || "";
  const css = project.files["styles.css"] || "";
  const js = project.files["script.js"] || "";
  const isWeb = file.endsWith(".html") || file.endsWith(".css") || file.endsWith(".js");

  if (isWeb && html) {
    preview.hidden = false;
    filePreview.hidden = true;
    $("#previewMode").textContent = "Live browser preview";
    preview.srcdoc = html
      .replace(/<link[^>]+href=["']styles\.css["'][^>]*>/i, `<style>${css}</style>`)
      .replace(/<script[^>]+src=["']script\.js["'][^>]*><\/script>/i, `<script>${js}<\/script>`);
  } else {
    preview.hidden = true;
    filePreview.hidden = false;
    $("#previewMode").textContent = "Raw file preview";
    filePreview.textContent = project.files[file] || "";
  }
}

function renderLogs() {
  const project = activeProject();
  messageLog.innerHTML = "";
  project.logs.slice(-20).reverse().forEach((item) => {
    const row = document.createElement("div");
    row.className = "message";
    row.innerHTML = `<strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.body)}</span>`;
    messageLog.appendChild(row);
  });
}

function saveActiveFile() {
  const project = activeProject();
  project.files[state.activeFile] = editor.value;
  saveState();
}

function addFile() {
  const project = activeProject();
  const name = prompt("File path, for example components/card.html or assets/data.json");
  if (!name) return;
  const clean = name.trim().replace(/^\/+/, "");
  if (!clean) return;
  if (project.files[clean] !== undefined && !confirm(`${clean} exists. Replace it?`)) return;
  project.files[clean] = starterContent(clean);
  state.activeFile = clean;
  saveState();
  render();
  toastMessage(`Added ${clean}`);
}

function deleteFile() {
  const project = activeProject();
  if (Object.keys(project.files).length <= 1) {
    toastMessage("A project needs at least one file.");
    return;
  }
  if (!confirm(`Delete ${state.activeFile}?`)) return;
  delete project.files[state.activeFile];
  state.activeFile = Object.keys(project.files)[0];
  saveState();
  render();
}

function starterContent(fileName) {
  if (fileName.endsWith(".html")) return "<!doctype html>\n<html>\n  <body>\n    <h1>New page</h1>\n  </body>\n</html>\n";
  if (fileName.endsWith(".css")) return "body {\n  margin: 0;\n}\n";
  if (fileName.endsWith(".js")) return 'console.log("Ready");\n';
  if (fileName.endsWith(".json")) return "{\n  \"name\": \"value\"\n}\n";
  if (fileName.endsWith(".md")) return "# Notes\n";
  return "";
}

function fileKind(fileName) {
  const ext = fileName.split(".").pop() || "file";
  return ext.length > 8 ? "file" : ext;
}

function formatActiveFile() {
  const file = state.activeFile;
  try {
    if (file.endsWith(".json")) {
      editor.value = JSON.stringify(JSON.parse(editor.value), null, 2);
    } else {
      editor.value = editor.value.replace(/[ \t]+$/gm, "").trim() + "\n";
    }
    saveActiveFile();
    renderPreview();
    toastMessage("Formatted");
  } catch (error) {
    toastMessage(`Format failed: ${error.message}`);
  }
}

async function sendAgentEvent(type, extra = {}) {
  saveActiveFile();
  const url = localStorage.getItem(WEBHOOK_KEY);
  const project = activeProject();
  const payload = {
    type,
    tool: state.activeTool,
    instruction: $("#agentPrompt").value,
    command: $("#commandInput").value,
    project: {
      id: project.id,
      name: project.name,
      files: project.files,
    },
    ...extra,
  };

  if (!url) {
    log("Webhook missing", "Save your n8n webhook URL before sending agent requests.");
    toastMessage("Add your n8n webhook URL first.");
    return;
  }

  log("Request sent", `${type} payload sent to n8n.`);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await response.text();
    applyAgentResponse(text);
    log("n8n response", text || `Status ${response.status}`);
    toastMessage("n8n responded");
  } catch (error) {
    log("n8n error", error.message);
    toastMessage("n8n request failed. Check webhook and CORS.");
  }
}

function applyAgentResponse(text) {
  if (!text) return;
  try {
    const data = JSON.parse(text);
    if (data.files && typeof data.files === "object") {
      const project = activeProject();
      project.files = { ...project.files, ...data.files };
      if (data.activeFile) state.activeFile = data.activeFile;
      saveState();
      render();
    }
  } catch {
    // Plain text responses are logged only.
  }
}

function deployNetlify() {
  sendAgentEvent("deploy-netlify", {
    deploy: {
      provider: "netlify",
      publishDirectory: ".",
      requiredFiles: ["index.html", "styles.css", "script.js", "netlify.toml"],
    },
  });
}

function exportProject() {
  saveActiveFile();
  const project = activeProject();
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.forgeai.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  log("Project exported", "Downloaded a JSON package containing every project file.");
}

function saveWebhook() {
  localStorage.setItem(WEBHOOK_KEY, $("#webhookInput").value.trim());
  updateAgentStatus();
  toastMessage("Webhook saved");
}

function updateAgentStatus() {
  $("#agentStatus").classList.toggle("is-ready", Boolean(localStorage.getItem(WEBHOOK_KEY)));
}

function log(title, body) {
  const project = activeProject();
  project.logs.push({ title, body, at: new Date().toISOString() });
  saveState();
  renderLogs();
}

function toastMessage(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]);
}

$("#newProjectBtn").addEventListener("click", () => {
  $("#projectModal").hidden = false;
  $("#projectNameInput").focus();
});

$("#cancelProjectBtn").addEventListener("click", () => {
  $("#projectModal").hidden = true;
});

$("#projectForm").addEventListener("submit", (event) => {
  event.preventDefault();
  createProject($("#projectNameInput").value, $("#starterSelect").value);
  $("#projectModal").hidden = true;
});

$("#saveFileBtn").addEventListener("click", () => {
  saveActiveFile();
  renderPreview();
  toastMessage("File saved");
});

editor.addEventListener("input", () => {
  saveActiveFile();
  renderPreview();
});

$("#addFileBtn").addEventListener("click", addFile);
$("#deleteFileBtn").addEventListener("click", deleteFile);
$("#formatBtn").addEventListener("click", formatActiveFile);
$("#saveWebhookBtn").addEventListener("click", saveWebhook);
$("#sendToAgentBtn").addEventListener("click", () => sendAgentEvent("agent-build"));
$("#runCommandBtn").addEventListener("click", () => sendAgentEvent("terminal-command"));
$("#deployBtn").addEventListener("click", deployNetlify);
$("#exportProjectBtn").addEventListener("click", exportProject);
$("#clearLogBtn").addEventListener("click", () => {
  activeProject().logs = [];
  saveState();
  renderLogs();
});

document.querySelectorAll(".ai-tool").forEach((button) => {
  button.addEventListener("click", () => {
    state.activeTool = button.dataset.tool;
    document.querySelectorAll(".ai-tool").forEach((tool) => tool.classList.remove("is-active"));
    button.classList.add("is-active");
    saveState();
  });
});

document.querySelectorAll("[data-viewport]").forEach((button) => {
  button.addEventListener("click", () => {
    previewStage.classList.toggle("mobile", button.dataset.viewport === "mobile");
    previewStage.classList.toggle("desktop", button.dataset.viewport === "desktop");
  });
});

loadState();
render();
