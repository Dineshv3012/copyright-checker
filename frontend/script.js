const resultEl = document.getElementById("result");
const queryEl = document.getElementById("query");
const btn = document.getElementById("checkBtn");

function renderItems(items) {
  if (!items || items.length === 0) {
    resultEl.innerHTML = `<div class="empty">No matching videos found.</div>`;
    return;
  }
  const html = items.map(item => {
    const vid = item.id?.videoId || item.id;
    const snip = item.snippet || {};
    const title = snip.title || "(no title)";
    const channel = snip.channelTitle || "Unknown channel";
    const published = snip.publishedAt ? new Date(snip.publishedAt).toDateString() : "";
    const thumb = snip.thumbnails?.medium?.url || snip.thumbnails?.default?.url || "";
    const url = `https://www.youtube.com/watch?v=${vid}`;
    return `
      <div class="result-item">
        <img class="thumb" src="${thumb}" alt="thumbnail">
        <div class="meta">
          <h3>${title}</h3>
          <p>${channel}${published ? " • " + published : ""}</p>
          <a class="btn" href="${url}" target="_blank" rel="noopener">Open on YouTube</a>
        </div>
      </div>
    `;
  }).join("");
  resultEl.innerHTML = html;
}

async function doCheck() {
  const q = queryEl.value.trim();
  if (!q) return alert("Please enter a title or URL");
  resultEl.innerHTML = `<div class="empty">Checking…</div>`;

  try {
    const r = await fetch("/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q })
    });
    const data = await r.json();
    if (data.error) {
      resultEl.innerHTML = `<div class="error">${data.error}</div>`;
      return;
    }
    if (data.mode === "videoId") {
      // items = videos.list format (array with full video object)
      const items = (data.items || []).map(v => ({
        id: v.id,
        snippet: v.snippet
      }));
      if (data.exists) {
        renderItems(items);
      } else {
        resultEl.innerHTML = `<div class="empty">That exact video was not found.</div>`;
      }
    } else {
      // search results
      renderItems(data.items || []);
    }
  } catch (e) {
    console.error(e);
    resultEl.innerHTML = `<div class="error">Something went wrong. Please try again.</div>`;
  }
}

btn.addEventListener("click", doCheck);
queryEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") doCheck();
});