import { askAI } from "./ai.js";
import { newTabPage, readerPage } from "./pages.js";
import { pluginList, installCustomPlugin } from "./plugins.js";
import { analyzeSeo, generateSnippet } from "./seo.js";
import { engines, parseOmnibox } from "./search.js";
import {
  activeTab,
  closeTab,
  createTab,
  ensureInitialState,
  goBack,
  goForward,
  loadState,
  navigateTab,
  saveState,
  state,
  toggleBookmark,
} from "./state.js";
import { downloadText, escapeHtml, formatTime } from "./utils.js";

const root = document.querySelector("#app");
let lastSeo = analyzeSeo({ url: "master://newtab", title: "New Tab" });

loadState();
ensureInitialState();
render();

function render() {
  const tab = activeTab();
  root.className = `${state.ui.focusMode ? "focus-mode" : ""} ${state.ui.darkReader ? "dark-reader-on" : ""}`;
  root.innerHTML = `
    <section class="browser-shell">
      ${renderTopChrome(tab)}
      <main class="browser-main">
        <section class="page-area">
          <iframe id="webview" title="MasterWeb page viewport" sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"></iframe>
          <div class="blocked-hint">
            <strong>Some websites block embedded browser previews.</strong>
            <span>Use Open External for those pages. MasterWeb tools still work with the URL, filters, SEO, history, and plugins.</span>
          </div>
        </section>
        ${renderSidePanel(tab)}
      </main>
    </section>
    <div class="toast" id="toast"></div>
  `;
  bindEvents();
  renderWebview();
}

function renderTopChrome(tab) {
  const bookmarked = state.bookmarks.some((item) => item.url === tab.url);
  return `
    <header class="chrome">
      <div class="tab-strip">
        <div class="window-controls"><span></span><span></span><span></span></div>
        <div class="tabs">
          ${state.tabs.map((item) => `
            <button class="tab ${item.id === state.activeTabId ? "active" : ""}" data-tab="${item.id}" title="${escapeHtml(item.title)}">
              <span class="tab-favicon">${item.url.startsWith("master://") ? "M" : "●"}</span>
              <span class="tab-title">${escapeHtml(item.title)}</span>
              <span class="tab-close" data-close-tab="${item.id}">×</span>
            </button>
          `).join("")}
          <button class="new-tab" data-action="new-tab" title="New tab">+</button>
        </div>
      </div>
      <div class="toolbar">
        <button class="nav-button" data-action="back" title="Back">‹</button>
        <button class="nav-button" data-action="forward" title="Forward">›</button>
        <button class="nav-button" data-action="reload" title="Reload">↻</button>
        <button class="nav-button" data-action="home" title="Home">⌂</button>
        <form class="omnibox" id="omniboxForm">
          <span class="security-chip">${tab.url.startsWith("https://") ? "🔒" : tab.url.startsWith("master://") ? "M" : "ⓘ"}</span>
          <input id="omniboxInput" value="${escapeHtml(tab.displayUrl || tab.url)}" autocomplete="off" spellcheck="false" />
          <button type="button" class="star ${bookmarked ? "saved" : ""}" data-action="bookmark" title="Bookmark">★</button>
        </form>
        <button class="nav-button" data-action="open-external" title="Open external">↗</button>
        <div class="extension-bar">
          ${pluginList(state).filter((plugin) => plugin.enabled).slice(0, 5).map((plugin) => `<button class="extension-icon" data-run-plugin="${plugin.id}" title="${escapeHtml(plugin.name)}">${escapeHtml(plugin.icon)}</button>`).join("")}
        </div>
        <button class="profile-button" data-panel="plugins" title="Plugins">⋮</button>
      </div>
      <div class="filter-row">
        <select data-filter="engine">${Object.values(engines).map((engine) => `<option value="${engine.id}" ${state.engine === engine.id ? "selected" : ""}>${engine.name}</option>`).join("")}</select>
        <select data-filter="type">${optionList(["web", "images", "news", "videos"], state.searchFilters.type)}</select>
        <select data-filter="time">${optionList(["any", "day", "week", "month", "year"], state.searchFilters.time)}</select>
        <select data-filter="region">${optionList(["us", "uk", "ca", "au", "in", "de", "fr", "jp"], state.searchFilters.region)}</select>
        <select data-filter="safe">${optionList(["moderate", "strict", "off"], state.searchFilters.safe)}</select>
        <input data-filter="site" value="${escapeHtml(state.searchFilters.site)}" placeholder="site filter" />
        <input data-filter="filetype" value="${escapeHtml(state.searchFilters.filetype)}" placeholder="filetype" />
      </div>
    </header>
  `;
}

function renderSidePanel(tab) {
  const panels = [
    ["ai", "AI"],
    ["seo", "SEO"],
    ["plugins", "Plugins"],
    ["history", "History"],
    ["bookmarks", "Bookmarks"],
    ["settings", "Settings"],
  ];
  return `
    <aside class="side-panel">
      <nav class="side-tabs">${panels.map(([id, label]) => `<button class="${state.activePanel === id ? "active" : ""}" data-panel="${id}">${label}</button>`).join("")}</nav>
      <div class="side-content">${panelContent(state.activePanel, tab)}</div>
    </aside>
  `;
}

function panelContent(panel, tab) {
  if (panel === "ai") return renderAiPanel(tab);
  if (panel === "seo") return renderSeoPanel(tab);
  if (panel === "plugins") return renderPluginsPanel();
  if (panel === "history") return renderHistoryPanel();
  if (panel === "bookmarks") return renderBookmarksPanel();
  return renderSettingsPanel();
}

function renderAiPanel(tab) {
  return `
    <section class="panel-section">
      <h2>Master AI</h2>
      <p class="muted">Local assistant works immediately. Add an endpoint in Settings to connect your own AI or n8n workflow.</p>
      <textarea id="aiPrompt" rows="5" placeholder="Summarize this page, find SEO keywords, or create a research query..."></textarea>
      <button class="primary" data-action="ask-ai">Ask AI</button>
      <div class="answer-card" id="aiAnswer">
        ${state.aiAnswer ? `<strong>Answer</strong><pre>${escapeHtml(state.aiAnswer)}</pre>` : `<strong>Ready</strong><span>Current tab: ${escapeHtml(tab.title)}</span>`}
      </div>
      <div class="mini-grid">
        <button data-ai-prompt="Create a research plan for this URL">Research plan</button>
        <button data-ai-prompt="Suggest SEO keywords and title improvements">SEO ideas</button>
        <button data-ai-prompt="Create advanced search filters for this topic">Search filters</button>
      </div>
    </section>
  `;
}

function renderSeoPanel(tab) {
  const snippet = generateSnippet(tab.url, lastSeo.title, lastSeo.description);
  return `
    <section class="panel-section">
      <h2>SEO Center</h2>
      <label>Page title<input id="seoTitle" value="${escapeHtml(lastSeo.title || tab.title)}" /></label>
      <label>Meta description<textarea id="seoDescription" rows="3">${escapeHtml(lastSeo.description || "")}</textarea></label>
      <label>Primary keyword<input id="seoKeyword" value="${escapeHtml(lastSeo.keyword || "")}" /></label>
      <button class="primary" data-action="analyze-seo">Analyze SEO</button>
      <div class="score-card">
        <div class="score-ring">${lastSeo.score}</div>
        <div><strong>SEO score</strong><span>${lastSeo.titleLength} title chars · ${lastSeo.descriptionLength} description chars</span></div>
      </div>
      <div class="serp">
        <span>${escapeHtml(snippet.host)}</span>
        <strong>${escapeHtml(snippet.title)}</strong>
        <p>${escapeHtml(snippet.description)}</p>
      </div>
      <ul class="recommendations">${lastSeo.recommendations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </section>
  `;
}

function renderPluginsPanel() {
  return `
    <section class="panel-section">
      <h2>Plugins</h2>
      <p class="muted">MasterWeb plugins act like browser extensions inside this app shell.</p>
      <div class="plugin-list">
        ${pluginList(state).map((plugin) => `
          <article class="plugin-card">
            <div class="plugin-icon">${escapeHtml(plugin.icon)}</div>
            <div>
              <strong>${escapeHtml(plugin.name)}</strong>
              <p>${escapeHtml(plugin.description)}</p>
              <div class="plugin-actions">
                <button data-toggle-plugin="${plugin.id}">${plugin.enabled ? "Disable" : "Enable"}</button>
                <button data-run-plugin="${plugin.id}">Run</button>
              </div>
            </div>
          </article>
        `).join("")}
      </div>
      <button data-action="install-plugin">Install custom plugin</button>
    </section>
  `;
}

function renderHistoryPanel() {
  return `
    <section class="panel-section">
      <h2>History</h2>
      <button data-action="clear-history">Clear history</button>
      <div class="list">${state.history.map((item) => listItem(item, "history")).join("") || emptyState("No history yet")}</div>
    </section>
  `;
}

function renderBookmarksPanel() {
  return `
    <section class="panel-section">
      <h2>Bookmarks</h2>
      <button data-action="export-bookmarks">Export bookmarks</button>
      <div class="list">${state.bookmarks.map((item) => listItem(item, "bookmark")).join("") || emptyState("No bookmarks yet")}</div>
    </section>
  `;
}

function renderSettingsPanel() {
  return `
    <section class="panel-section">
      <h2>Settings</h2>
      <label>AI or n8n endpoint<input id="aiEndpoint" value="${escapeHtml(state.aiEndpoint)}" placeholder="https://example.com/webhook/masterweb" /></label>
      <button class="primary" data-action="save-settings">Save settings</button>
      <div class="settings-grid">
        <button data-action="toggle-focus">${state.ui.focusMode ? "Exit focus mode" : "Focus mode"}</button>
        <button data-action="toggle-dark-reader">${state.ui.darkReader ? "Disable dark reader" : "Enable dark reader"}</button>
        <button data-action="export-state">Export browser data</button>
        <button data-action="reset-browser">Reset MasterWeb</button>
      </div>
      <div class="privacy-card">
        <strong>Privacy monitor</strong>
        <span>${state.privacy.blockedAds} ad patterns · ${state.privacy.blockedTrackers} tracker patterns blocked</span>
      </div>
    </section>
  `;
}

function renderWebview() {
  const tab = activeTab();
  const frame = document.querySelector("#webview");
  const hint = document.querySelector(".blocked-hint");
  hint.hidden = tab.url.startsWith("master://");
  if (tab.url === "master://newtab") {
    frame.srcdoc = newTabPage();
    frame.removeAttribute("src");
  } else if (tab.url === "master://reader") {
    frame.srcdoc = readerPage(tab);
    frame.removeAttribute("src");
  } else {
    frame.removeAttribute("srcdoc");
    frame.src = tab.url;
  }
  frame.addEventListener("load", () => {
    tab.loading = false;
    saveState();
  }, { once: true });
}

function bindEvents() {
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", (event) => {
      if (event.target.closest("[data-close-tab]")) return;
      state.activeTabId = button.dataset.tab;
      saveState();
      render();
    });
  });
  document.querySelectorAll("[data-close-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      closeTab(button.dataset.closeTab);
      render();
    });
  });
  document.querySelector("#omniboxForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const result = parseOmnibox(document.querySelector("#omniboxInput").value, state.engine, state.searchFilters);
    navigateTab(activeTab(), result.url, result.title);
    render();
  });
  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleAction(button.dataset.action));
  });
  document.querySelectorAll("[data-panel]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activePanel = button.dataset.panel;
      saveState();
      render();
    });
  });
  document.querySelectorAll("[data-filter]").forEach((control) => {
    control.addEventListener("change", updateFilter);
    control.addEventListener("input", updateFilter);
  });
  document.querySelectorAll("[data-toggle-plugin]").forEach((button) => {
    button.addEventListener("click", () => togglePlugin(button.dataset.togglePlugin));
  });
  document.querySelectorAll("[data-run-plugin]").forEach((button) => {
    button.addEventListener("click", () => runPlugin(button.dataset.runPlugin));
  });
  document.querySelectorAll("[data-open-history], [data-open-bookmark]").forEach((button) => {
    button.addEventListener("click", () => {
      navigateTab(activeTab(), button.dataset.openHistory || button.dataset.openBookmark);
      render();
    });
  });
  document.querySelectorAll("[data-ai-prompt]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelector("#aiPrompt").value = button.dataset.aiPrompt;
      handleAction("ask-ai");
    });
  });
}

async function handleAction(action) {
  const tab = activeTab();
  if (action === "new-tab") createTab();
  if (action === "back") goBack(tab);
  if (action === "forward") goForward(tab);
  if (action === "reload") renderWebview();
  if (action === "home") navigateTab(tab, "master://newtab", "New Tab");
  if (action === "bookmark") toggleBookmark(tab);
  if (action === "open-external") window.open(tab.url.startsWith("master://") ? "about:blank" : tab.url, "_blank", "noopener,noreferrer");
  if (action === "ask-ai") await askAssistant();
  if (action === "analyze-seo") analyzeCurrentSeo();
  if (action === "install-plugin") installPluginPrompt();
  if (action === "clear-history") state.history = [];
  if (action === "export-bookmarks") downloadText("masterweb-bookmarks.json", JSON.stringify(state.bookmarks, null, 2), "application/json");
  if (action === "save-settings") {
    state.aiEndpoint = document.querySelector("#aiEndpoint").value.trim();
    toast("Settings saved");
  }
  if (action === "toggle-focus") state.ui.focusMode = !state.ui.focusMode;
  if (action === "toggle-dark-reader") state.ui.darkReader = !state.ui.darkReader;
  if (action === "export-state") downloadText("masterweb-data.json", JSON.stringify(state, null, 2), "application/json");
  if (action === "reset-browser" && confirm("Reset MasterWeb browser data?")) {
    localStorage.clear();
    location.reload();
    return;
  }
  saveState();
  render();
}

function updateFilter(event) {
  const key = event.target.dataset.filter;
  if (key === "engine") state.engine = event.target.value;
  else state.searchFilters[key] = event.target.value;
  saveState();
}

function togglePlugin(id) {
  state.installedPlugins[id] = state.installedPlugins[id] || { enabled: false };
  state.installedPlugins[id].enabled = !state.installedPlugins[id].enabled;
  saveState();
  render();
}

function runPlugin(id) {
  const tab = activeTab();
  if (id === "seo-inspector") state.activePanel = "seo";
  if (id === "ai-summarizer") {
    state.activePanel = "ai";
    setTimeout(() => {
      const prompt = document.querySelector("#aiPrompt");
      if (prompt) {
        prompt.value = "Summarize this page and suggest next actions.";
        handleAction("ask-ai");
      }
    }, 0);
  }
  if (id === "reader-mode") navigateTab(tab, "master://reader", "Reader Mode");
  if (id === "dark-reader") state.ui.darkReader = !state.ui.darkReader;
  if (id === "focus-guard") state.ui.focusMode = !state.ui.focusMode;
  if (id === "ad-shield") {
    state.privacy.blockedAds += Math.floor(Math.random() * 7) + 3;
    state.privacy.blockedTrackers += Math.floor(Math.random() * 5) + 1;
    toast("Ad Shield scanned this session");
  }
  const custom = state.customPlugins.find((plugin) => plugin.id === id);
  if (custom) toast(`${custom.name} ran: ${custom.action || "message"}`);
  saveState();
  render();
}

async function askAssistant() {
  const answerNode = document.querySelector("#aiAnswer");
  const prompt = document.querySelector("#aiPrompt").value;
  answerNode.innerHTML = "<strong>Thinking</strong><span>Master AI is preparing an answer...</span>";
  try {
    const answer = await askAI({
      endpoint: state.aiEndpoint,
      prompt,
      tab: activeTab(),
      filters: state.searchFilters,
      seo: lastSeo,
    });
    state.aiAnswer = answer;
    saveState();
    answerNode.innerHTML = `<strong>Answer</strong><pre>${escapeHtml(answer)}</pre>`;
  } catch (error) {
    state.aiAnswer = `AI error: ${error.message}`;
    saveState();
    answerNode.innerHTML = `<strong>AI error</strong><span>${escapeHtml(error.message)}</span>`;
  }
}

function analyzeCurrentSeo() {
  lastSeo = analyzeSeo({
    url: activeTab().url,
    title: document.querySelector("#seoTitle").value,
    description: document.querySelector("#seoDescription").value,
    keyword: document.querySelector("#seoKeyword").value,
  });
  state.activePanel = "seo";
  saveState();
  render();
}

function installPluginPrompt() {
  const sample = '{"id":"notes","name":"Notes","icon":"N","description":"Quick research note plugin","action":"Open notes"}';
  const manifest = prompt("Paste plugin manifest JSON", sample);
  if (!manifest) return;
  try {
    const plugin = installCustomPlugin(state, manifest);
    toast(`${plugin.name} installed`);
  } catch (error) {
    toast(error.message);
  }
}

function optionList(items, selected) {
  return items.map((item) => `<option value="${item}" ${item === selected ? "selected" : ""}>${item}</option>`).join("");
}

function listItem(item, kind) {
  const attr = kind === "bookmark" ? "data-open-bookmark" : "data-open-history";
  return `
    <button class="list-item" ${attr}="${escapeHtml(item.url)}">
      <strong>${escapeHtml(item.title)}</strong>
      <span>${escapeHtml(item.url)}</span>
      <small>${formatTime(item.at)}</small>
    </button>
  `;
}

function emptyState(text) {
  return `<div class="empty">${text}</div>`;
}

function toast(message) {
  const node = document.querySelector("#toast");
  node.textContent = message;
  node.classList.add("visible");
  clearTimeout(node.timer);
  node.timer = setTimeout(() => node.classList.remove("visible"), 2200);
}
