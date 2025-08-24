// server.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const { google } = require('googleapis');
const multer = require('multer');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend folder
app.use(express.static(path.join(__dirname, 'frontend')));

// ----------------------
// YouTube OAuth Setup
// ----------------------
const oauth2Client = new google.auth.OAuth2(
  'YOUR_CLIENT_ID',       // Replace with your OAuth client ID
  'YOUR_CLIENT_SECRET',   // Replace with your OAuth client secret
  'http://localhost:3000/oauth2callback' // Redirect URI
);

let oauthTokens = null;

// Redirect user to authorize
app.get('/authorize', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtubepartner'
    ]
  });
  res.redirect(url);
});

// OAuth callback
app.get('/oauth2callback', async (req, res) => {
  const { code } = req.query;
  const { tokens } = await oauth2Client.getToken(code);
  oauthTokens = tokens;
  oauth2Client.setCredentials(tokens);
  res.send('Authorization successful! You can now upload videos.');
});

// ----------------------
// File Upload Setup
// ----------------------
const upload = multer({ dest: 'uploads/' });

// Upload video and get Video ID
app.post('/upload', upload.single('video'), async (req, res) => {
  if (!oauthTokens) return res.status(400).send('Authorize first!');
  oauth2Client.setCredentials(oauthTokens);

  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

  try {
    const response = await youtube.videos.insert({
      part: 'snippet,status',
      requestBody: {
        snippet: { title: req.file.originalname },
        status: { privacyStatus: 'private' }
      },
      media: { body: fs.createReadStream(req.file.path) }
    });

    fs.unlinkSync(req.file.path); // remove temp file
    res.json({ videoId: response.data.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check Content ID (if partner account)
app.get('/check/:videoId', async (req, res) => {
  if (!oauthTokens) return res.status(400).send('Authorize first!');
  oauth2Client.setCredentials(oauthTokens);

  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

  try {
    const response = await youtube.claims.list({
      videoId: req.params.videoId,
      maxResults: 10
      // onBehalfOfContentOwner: 'YOUR_CONTENT_OWNER_ID' // only if partner
    });
    res.json(response.data.items || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Catch-all route for frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
