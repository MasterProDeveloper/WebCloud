export const engines = {
  google: { id: "google", name: "Google", base: "https://www.google.com/search", query: "q" },
  bing: { id: "bing", name: "Bing", base: "https://www.bing.com/search", query: "q" },
  duckduckgo: { id: "duckduckgo", name: "DuckDuckGo", base: "https://duckduckgo.com/", query: "q" },
  brave: { id: "brave", name: "Brave", base: "https://search.brave.com/search", query: "q" },
  yahoo: { id: "yahoo", name: "Yahoo", base: "https://search.yahoo.com/search", query: "p" },
};

export function parseOmnibox(input, engineId, filters) {
  const value = input.trim();
  if (!value) return { type: "internal", url: "master://newtab", title: "New Tab" };
  if (value.startsWith("master://")) return { type: "internal", url: value, title: value.replace("master://", "") };
  if (isLikelyUrl(value)) {
    const url = /^[a-z]+:\/\//i.test(value) ? value : `https://${value}`;
    return { type: "url", url, title: url };
  }
  return {
    type: "search",
    url: buildSearchUrl(value, engineId, filters),
    title: value,
    query: value,
  };
}

export function buildSearchUrl(query, engineId, filters) {
  const engine = engines[engineId] || engines.google;
  const url = new URL(engine.base);
  const finalQuery = buildFilteredQuery(query, filters);
  url.searchParams.set(engine.query, finalQuery);
  applyEngineFilters(url, engine.id, filters);
  return url.toString();
}

export function buildFilteredQuery(query, filters) {
  const parts = [];
  if (filters.exact) parts.push(`"${filters.exact}"`);
  parts.push(query);
  if (filters.site) parts.push(`site:${filters.site.replace(/^https?:\/\//, "")}`);
  if (filters.filetype) parts.push(`filetype:${filters.filetype.replace(/^\./, "")}`);
  if (filters.exclude) {
    filters.exclude
      .split(",")
      .map((term) => term.trim())
      .filter(Boolean)
      .forEach((term) => parts.push(`-${term}`));
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function applyEngineFilters(url, engineId, filters) {
  const type = filters.type;
  if (engineId === "google") {
    if (type === "images") url.searchParams.set("tbm", "isch");
    if (type === "news") url.searchParams.set("tbm", "nws");
    if (type === "videos") url.searchParams.set("tbm", "vid");
    if (filters.time !== "any") url.searchParams.set("tbs", `qdr:${googleTime(filters.time)}`);
    url.searchParams.set("safe", filters.safe === "off" ? "off" : "active");
    url.searchParams.set("gl", filters.region);
  }
  if (engineId === "bing") {
    if (type === "images") url.pathname = "/images/search";
    if (type === "news") url.pathname = "/news/search";
    if (type === "videos") url.pathname = "/videos/search";
    if (filters.time !== "any") url.searchParams.set("filters", bingTime(filters.time));
    url.searchParams.set("cc", filters.region);
  }
  if (engineId === "duckduckgo") {
    if (type !== "web") url.searchParams.set("ia", type === "images" ? "images" : type);
    if (filters.safe === "off") url.searchParams.set("kp", "-2");
    if (filters.time !== "any") url.searchParams.set("df", duckTime(filters.time));
  }
  if (engineId === "brave") {
    if (type !== "web") url.searchParams.set("source", type);
    if (filters.time !== "any") url.searchParams.set("tf", filters.time);
  }
}

function isLikelyUrl(value) {
  if (/^[a-z]+:\/\//i.test(value)) return true;
  if (value.includes(" ")) return false;
  return /^localhost(:\d+)?/i.test(value) || /^[\w-]+(\.[\w-]+)+/.test(value);
}

function googleTime(time) {
  return { day: "d", week: "w", month: "m", year: "y" }[time] || "d";
}

function bingTime(time) {
  return {
    day: "ex1%3a%22ez1%22",
    week: "ex1%3a%22ez2%22",
    month: "ex1%3a%22ez3%22",
    year: "ex1%3a%22ez5_20000_30000%22",
  }[time] || "";
}

function duckTime(time) {
  return { day: "d", week: "w", month: "m", year: "y" }[time] || "";
}
