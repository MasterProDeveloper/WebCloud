export function analyzeSeo({ url, title, description, html = "", keyword = "" }) {
  const cleanTitle = title || deriveTitleFromUrl(url);
  const cleanDescription = description || "";
  const h1Count = countMatches(html, /<h1[\s>]/gi);
  const imageCount = countMatches(html, /<img[\s>]/gi);
  const imageAltCount = countMatches(html, /<img[^>]+alt=/gi);
  const canonical = /rel=["']canonical["']/i.test(html);
  const robots = /name=["']robots["']/i.test(html);
  const scores = [
    scoreRange(cleanTitle.length, 30, 60),
    scoreRange(cleanDescription.length, 120, 160),
    h1Count === 1 ? 100 : h1Count === 0 ? 30 : 62,
    imageCount === 0 ? 80 : Math.round((imageAltCount / imageCount) * 100),
    canonical ? 100 : 72,
    keyword ? keywordScore(`${cleanTitle} ${cleanDescription}`, keyword) : 78,
  ];
  const score = Math.round(scores.reduce((sum, item) => sum + item, 0) / scores.length);

  return {
    score,
    title: cleanTitle,
    titleLength: cleanTitle.length,
    description: cleanDescription,
    descriptionLength: cleanDescription.length,
    h1Count,
    imageCount,
    imageAltCount,
    canonical,
    robots,
    keyword,
    recommendations: recommendations({ cleanTitle, cleanDescription, h1Count, imageCount, imageAltCount, canonical, robots, keyword }),
  };
}

export function generateSnippet(url, title, description) {
  let host = "masterweb.local";
  try {
    host = new URL(url).hostname;
  } catch {
    host = "masterweb.local";
  }
  return {
    host,
    title: (title || host).slice(0, 68),
    description: description || "Add a focused meta description so searchers understand why this page is worth opening.",
  };
}

function recommendations(data) {
  const list = [];
  if (data.cleanTitle.length < 30) list.push("Make the title more descriptive, ideally 30 to 60 characters.");
  if (data.cleanTitle.length > 60) list.push("Shorten the title so it is less likely to truncate in search results.");
  if (data.cleanDescription.length < 120) list.push("Write a meta description around 120 to 160 characters.");
  if (data.h1Count !== 1) list.push("Use exactly one H1 that matches the page intent.");
  if (data.imageCount && data.imageAltCount < data.imageCount) list.push("Add alt text to every important image.");
  if (!data.canonical) list.push("Add a canonical URL to prevent duplicate-content confusion.");
  if (!data.robots) list.push("Add a robots meta tag when launch behavior should be explicit.");
  if (data.keyword && !`${data.cleanTitle} ${data.cleanDescription}`.toLowerCase().includes(data.keyword.toLowerCase())) list.push("Include the primary keyword naturally in the title or description.");
  if (!list.length) list.push("The core SEO signals look strong. Check schema, internal links, and Core Web Vitals next.");
  return list;
}

function scoreRange(value, min, max) {
  if (value >= min && value <= max) return 100;
  if (value < min) return Math.max(25, Math.round((value / min) * 100));
  return Math.max(30, 100 - (value - max) * 3);
}

function keywordScore(text, keyword) {
  return text.toLowerCase().includes(keyword.toLowerCase()) ? 100 : 55;
}

function countMatches(text, regex) {
  return (text.match(regex) || []).length;
}

function deriveTitleFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Untitled page";
  }
}
