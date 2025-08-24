const express = require('express');
const path = require('path');
const fs = require('fs');
const { google } = require('googleapis');
const multer = require('multer');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'frontend')));

const oauth2Client = new google.auth.OAuth2(
  'YOUR_CLIENT_ID',
  'YOUR_CLIENT_SECRET',
  'http://localhost:3000/oauth2callback'
);

let oauthTokens = null;

// OAuth routes
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

app.get('/oauth2callback', async (req, res) => {
  const { code } = req.query;
  const { tokens } = await oauth2Client.getToken(code);
  oauthTokens = tokens;
  oauth2Client.setCredentials(tokens);
  res.send('Authorization successful! You can now upload files.');
});

// File upload setup
const upload = multer({ dest: 'uploads/' });

// Upload + automatic Content ID check
app.post('/upload-check', upload.single('video'), async (req, res) => {
  if (!oauthTokens) return res.status(400).send('Authorize first!');
  oauth2Client.setCredentials(oauthTokens);

  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

  try {
    // Step 1: Upload video privately
    const uploadResponse = await youtube.videos.insert({
      part: 'snippet,status',
      requestBody: {
        snippet: { title: req.file.originalname },
        status: { privacyStatus: 'private' }
      },
      media: { body: fs.createReadStream(req.file.path) }
    });

    const videoId = uploadResponse.data.id;

    // Step 2: Check Content ID
    const claimResponse = await youtube.claims.list({
      videoId: videoId,
      maxResults: 10
      // onBehalfOfContentOwner: 'YOUR_CONTENT_OWNER_ID' // if partner
    });

    fs.unlinkSync(req.file.path); // clean temp file

    res.json({
      videoId,
      contentIdMatches: claimResponse.data.items || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Catch-all for frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
