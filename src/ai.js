import { buildFilteredQuery } from "./search.js";

export async function askAI({ endpoint, prompt, tab, filters, seo }) {
  const payload = {
    prompt,
    tab,
    filters,
    seo,
    browser: "MasterWeb",
    at: new Date().toISOString(),
  };
  if (endpoint) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.text();
  }
  return localAnswer(prompt, tab, filters, seo);
}

export function localAnswer(prompt, tab, filters, seo) {
  const task = prompt.trim() || "Help me browse smarter.";
  const query = buildFilteredQuery(task, filters);
  const tips = [
    `Use this refined query: ${query}`,
    `Current tab: ${tab.title} (${tab.url})`,
    `SEO score estimate: ${seo.score}/100`,
    seo.recommendations[0],
  ];
  if (/seo|rank|traffic|keyword/i.test(task)) {
    tips.push("Open the SEO panel, set a primary keyword, then compare the snippet against top-ranking pages.");
  }
  if (/plugin|extension/i.test(task)) {
    tips.push("Install custom plugins from the Plugins panel using a JSON manifest with id, name, icon, description, and action.");
  }
  if (/private|safe|security/i.test(task)) {
    tips.push("Enable Ad Shield and avoid entering credentials into framed pages because some sites block embedding for security.");
  }
  return tips.join("\n");
}
