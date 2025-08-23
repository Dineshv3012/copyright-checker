// server.js
const express = require("express");
const fetch = require("node-fetch");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

if (!YOUTUBE_API_KEY) {
  console.warn("[WARN] YOUTUBE_API_KEY is not set. Set it in your Render dashboard > Environment.");
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "frontend")));

// Helpers
function extractYouTubeId(input) {
  // Matches youtu.be/<id> or youtube.com/watch?v=<id> or /shorts/<id>
  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{6,})/,
    /v=([A-Za-z0-9_-]{6,})/,
    /shorts\/([A-Za-z0-9_-]{6,})/
  ];
  for (const rx of patterns) {
    const m = input.match(rx);
    if (m && m[1]) return m[1];
  }
  return null;
}

app.post("/check", async (req, res) => {
  try {
    const { query } = req.body || {};
    if (!query || !String(query).trim()) {
      return res.status(400).json({ error: "No query provided" });
    }
    if (!YOUTUBE_API_KEY) {
      return res.status(500).json({ error: "Server missing YOUTUBE_API_KEY" });
    }

    const isUrl = /^https?:\/\//i.test(query);
    const videoId = isUrl ? extractYouTubeId(query) : null;

    if (videoId) {
      // Direct YouTube URL/ID provided → look up that video
      const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,status&id=${encodeURIComponent(videoId)}&key=${YOUTUBE_API_KEY}`;
      const r = await fetch(url);
      const data = await r.json();
      return res.json({
        mode: "videoId",
        exists: Array.isArray(data.items) && data.items.length > 0,
        items: data.items || []
      });
    } else {
      // Search by query
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}`;
      const r = await fetch(url);
      const data = await r.json();
      return res.json({
        mode: "search",
        items: data.items || []
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch from YouTube API" });
  }
});

// Fallback to index.html for root
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});