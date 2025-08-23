// server.js
const express = require("express");
const multer = require("multer");
const fetch = require("node-fetch");
const path = require("path");

const app = express();
const upload = multer({ dest: "uploads/" });

const PORT = process.env.PORT || 3000;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY; // Set this in Render

// Serve frontend
app.use(express.static(path.join(__dirname, "frontend")));

// Upload & check copyright by title
app.post("/upload-check", upload.single("file"), async (req, res) => {
  try {
    const fileName = req.file.originalname; // using filename as query

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(fileName)}&key=${YOUTUBE_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.items && data.items.length > 0) {
      res.json({
        status: "Possible copyright match found",
        matches: data.items.map(item => ({
          title: item.snippet.title,
          channel: item.snippet.channelTitle,
          link: `https://www.youtube.com/watch?v=${item.id.videoId}`
        }))
      });
    } else {
      res.json({ status: "No match found, likely original content" });
    }
  } catch (error) {
    res.status(500).json({ error: "Upload check failed" });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
