const resultEl = document.getElementById("result");
const fileInput = document.getElementById("file");
const uploadBtn = document.getElementById("uploadBtn");

// Render Content ID matches
function renderMatches(matches) {
  if (!matches || matches.length === 0) {
    resultEl.innerHTML = `<div class="empty">No copyright matches found.</div>`;
    return;
  }

  const html = matches.map(match => {
    const owner = match.owner || "Unknown";
    const action = match.action || "Unknown action";
    const type = match.type || "Unknown type";
    return `
      <div class="result-item">
        <h3>Owner: ${owner}</h3>
        <p>Type: ${type} • Action: ${action}</p>
      </div>
    `;
  }).join("");
  resultEl.innerHTML = html;
}

// Handle file upload & automatic copyright check
async function doUploadCheck() {
  if (fileInput.files.length === 0) return alert("Select a file first!");
  resultEl.innerHTML = `<div class="empty">Uploading and checking…</div>`;

  const fd = new FormData();
  fd.append("video", fileInput.files[0]);

  try {
    const res = await fetch("/upload-check", { method: "POST", body: fd });
    const data = await res.json();

    if (data.error) {
      resultEl.innerHTML = `<div class="error">${data.error}</div>`;
      return;
    }

    const videoId = data.videoId || "(unknown)";
    const matches = data.contentIdMatches || [];
    resultEl.innerHTML = `<div><b>Video ID:</b> ${videoId}</div>`;
    renderMatches(matches);
  } catch (e) {
    console.error(e);
    resultEl.innerHTML = `<div class="error">Something went wrong. Please try again.</div>`;
  }
}

uploadBtn.addEventListener("click", (e) => {
  e.preventDefault();
  doUploadCheck();
});
