export const builtInPlugins = [
  {
    id: "seo-inspector",
    name: "SEO Inspector",
    icon: "S",
    description: "Score pages, snippets, headings, and metadata.",
  },
  {
    id: "ad-shield",
    name: "Ad Shield",
    icon: "A",
    description: "Block-pattern monitor for ads and trackers.",
  },
  {
    id: "ai-summarizer",
    name: "AI Summarizer",
    icon: "AI",
    description: "Summarize pages or ask a connected AI endpoint.",
  },
  {
    id: "reader-mode",
    name: "Reader Mode",
    icon: "R",
    description: "Build a readable view for blocked or noisy pages.",
  },
  {
    id: "dark-reader",
    name: "Dark Reader",
    icon: "D",
    description: "Apply dark visual treatment to pages.",
  },
  {
    id: "focus-guard",
    name: "Focus Guard",
    icon: "F",
    description: "Focus the viewport and hide side distractions.",
  },
];

export function pluginList(state) {
  return [...builtInPlugins, ...state.customPlugins].map((plugin) => ({
    ...plugin,
    enabled: Boolean(state.installedPlugins[plugin.id]?.enabled),
  }));
}

export function installCustomPlugin(state, manifest) {
  const plugin = JSON.parse(manifest);
  if (!plugin.id || !plugin.name) throw new Error("Plugin manifest needs id and name.");
  state.customPlugins = state.customPlugins.filter((item) => item.id !== plugin.id);
  state.customPlugins.push({
    id: plugin.id,
    name: plugin.name,
    icon: plugin.icon || plugin.name.slice(0, 2).toUpperCase(),
    description: plugin.description || "Custom MasterWeb plugin.",
    action: plugin.action || "message",
  });
  state.installedPlugins[plugin.id] = { enabled: true };
  return plugin;
}
