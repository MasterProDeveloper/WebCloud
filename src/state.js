export const STORAGE_KEY = "masterweb.state.v1";

export const state = {
  activeTabId: "",
  tabs: [],
  bookmarks: [],
  history: [],
  downloads: [],
  installedPlugins: {},
  customPlugins: [],
  activePanel: "ai",
  engine: "google",
  aiEndpoint: "",
  aiAnswer: "",
  searchFilters: {
    type: "web",
    time: "any",
    region: "us",
    safe: "moderate",
    exact: "",
    site: "",
    filetype: "",
    exclude: "",
  },
  privacy: {
    blockedAds: 0,
    blockedTrackers: 0,
  },
  ui: {
    focusMode: false,
    darkReader: false,
  },
};

export function uid(prefix = "mw") {
  return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`;
}

export function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return;
  Object.assign(state, JSON.parse(stored));
}

export function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function activeTab() {
  return state.tabs.find((tab) => tab.id === state.activeTabId) || state.tabs[0];
}

export function createTab(url = "master://newtab", title = "New Tab", activate = true) {
  const tab = {
    id: uid("tab"),
    title,
    url,
    displayUrl: url,
    history: [url],
    historyIndex: 0,
    loading: false,
    pinned: false,
    muted: false,
    createdAt: new Date().toISOString(),
  };
  state.tabs.push(tab);
  if (activate) state.activeTabId = tab.id;
  saveState();
  return tab;
}

export function closeTab(id) {
  const index = state.tabs.findIndex((tab) => tab.id === id);
  if (index === -1) return;
  state.tabs.splice(index, 1);
  if (!state.tabs.length) createTab();
  if (state.activeTabId === id) {
    state.activeTabId = state.tabs[Math.max(0, index - 1)].id;
  }
  saveState();
}

export function navigateTab(tab, url, title = "") {
  if (!tab) return;
  tab.url = url;
  tab.displayUrl = url;
  tab.title = title || deriveTitle(url);
  tab.history = tab.history.slice(0, tab.historyIndex + 1);
  tab.history.push(url);
  tab.historyIndex = tab.history.length - 1;
  tab.loading = true;
  state.history.unshift({
    id: uid("history"),
    title: tab.title,
    url,
    at: new Date().toISOString(),
  });
  state.history = state.history.slice(0, 200);
  saveState();
}

export function goBack(tab) {
  if (!tab || tab.historyIndex <= 0) return false;
  tab.historyIndex -= 1;
  tab.url = tab.history[tab.historyIndex];
  tab.displayUrl = tab.url;
  tab.title = deriveTitle(tab.url);
  saveState();
  return true;
}

export function goForward(tab) {
  if (!tab || tab.historyIndex >= tab.history.length - 1) return false;
  tab.historyIndex += 1;
  tab.url = tab.history[tab.historyIndex];
  tab.displayUrl = tab.url;
  tab.title = deriveTitle(tab.url);
  saveState();
  return true;
}

export function toggleBookmark(tab) {
  if (!tab) return;
  const existing = state.bookmarks.findIndex((item) => item.url === tab.url);
  if (existing >= 0) {
    state.bookmarks.splice(existing, 1);
  } else {
    state.bookmarks.unshift({
      id: uid("bookmark"),
      title: tab.title,
      url: tab.url,
      at: new Date().toISOString(),
    });
  }
  saveState();
}

export function ensureInitialState() {
  if (!state.tabs.length) createTab();
  if (!state.activeTabId) state.activeTabId = state.tabs[0].id;
  const defaults = ["seo-inspector", "ad-shield", "ai-summarizer", "reader-mode", "dark-reader", "focus-guard"];
  defaults.forEach((id) => {
    if (!state.installedPlugins[id]) state.installedPlugins[id] = { enabled: ["seo-inspector", "ai-summarizer"].includes(id) };
  });
  saveState();
}

export function deriveTitle(url) {
  if (url === "master://newtab") return "New Tab";
  if (url.startsWith("master://")) return url.replace("master://", "MasterWeb ");
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url.slice(0, 32) || "New Tab";
  }
}
