# YouTube Copyright Checker (Simple Search-Based)

This app lets users type a video/song title or paste a YouTube URL to see if matching videos already exist on YouTube. **It does not determine copyright legality**—it simply surfaces potential matches via the YouTube Data API v3.

## Features
- Clean, modern UI (static frontend).
- Search by title/keywords or paste a YouTube URL.
- Server calls YouTube API:
  - `videos.list` when you paste a YouTube URL (to verify existence).
  - `search.list` for keyword/title searches.
- No user sign-in required.

## Local Development
```bash
# 1) Install deps
npm install

# 2) Export your API key (macOS/Linux)
export YOUTUBE_API_KEY=YOUR_API_KEY

# 2b) On Windows (Powershell)
setx YOUTUBE_API_KEY "YOUR_API_KEY"

# 3) Start
npm start
# App runs at http://localhost:3000