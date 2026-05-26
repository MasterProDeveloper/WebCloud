export function newTabPage() {
  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fff;font-family:Arial, sans-serif;color:#202124}
      .wrap{width:min(760px,calc(100% - 32px));text-align:center}
      .logo{font-size:72px;font-weight:500;letter-spacing:-3px}
      .logo span:nth-child(1){color:#4285f4}.logo span:nth-child(2){color:#ea4335}.logo span:nth-child(3){color:#fbbc05}.logo span:nth-child(4){color:#4285f4}.logo span:nth-child(5){color:#34a853}.logo span:nth-child(6){color:#ea4335}.logo span:nth-child(7){color:#4285f4}.logo span:nth-child(8){color:#34a853}.logo span:nth-child(9){color:#fbbc05}
      .search{margin:30px auto 26px;height:46px;border:1px solid #dfe1e5;border-radius:24px;display:flex;align-items:center;padding:0 18px;box-shadow:0 1px 6px rgba(32,33,36,.16);color:#5f6368}
      .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:28px}
      .tile{border:1px solid #dadce0;border-radius:12px;padding:18px;background:#f8fafd}
      .tile strong{display:block;margin-bottom:8px}
      @media(max-width:720px){.logo{font-size:48px}.grid{grid-template-columns:1fr 1fr}}
    </style>
  </head>
  <body>
    <main class="wrap">
      <div class="logo"><span>M</span><span>a</span><span>s</span><span>t</span><span>e</span><span>r</span><span>W</span><span>e</span><span>b</span></div>
      <div class="search">Search or type a URL in the MasterWeb omnibox above</div>
      <section class="grid">
        <article class="tile"><strong>AI Browse</strong><span>Ask the right panel to summarize, plan, or optimize.</span></article>
        <article class="tile"><strong>SEO Tools</strong><span>Score titles, descriptions, snippets, and keywords.</span></article>
        <article class="tile"><strong>Filters</strong><span>Search by type, region, time, site, and file type.</span></article>
        <article class="tile"><strong>Plugins</strong><span>Turn browser extensions on and off from the toolbar.</span></article>
      </section>
    </main>
  </body>
</html>`;
}

export function readerPage(tab) {
  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body{margin:0;background:#f8fafd;color:#202124;font:18px/1.72 Georgia,serif}
      main{max-width:780px;margin:auto;padding:72px 28px}
      h1{font:700 42px/1.08 Arial,sans-serif;margin:0 0 18px}
      .url{font:14px Arial,sans-serif;color:#5f6368;margin-bottom:34px;word-break:break-all}
      p{margin:0 0 22px}
    </style>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(tab.title)}</h1>
      <div class="url">${escapeHtml(tab.url)}</div>
      <p>Reader Mode is active. If the original site blocks embedded browser frames, use the external open button in MasterWeb to view the page in a real tab.</p>
      <p>The AI panel can still reason about this URL, generate search filters, prepare SEO checks, and create notes for research.</p>
    </main>
  </body>
</html>`;
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
