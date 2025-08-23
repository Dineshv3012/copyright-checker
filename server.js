const fs = require('fs');
const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Load OAuth2 credentials
const credentials = JSON.parse(fs.readFileSync('client_secret.json'));
const { client_id, client_secret, redirect_uris } = credentials.installed;

const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

// Step 1: Generate Auth URL
app.get('/auth', (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly']
  });
  res.send(`<a href="${authUrl}">Authorize App</a>`);
});

// Step 2: Handle OAuth2 callback
app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
  fs.writeFileSync('token.json', JSON.stringify(tokens));
  res.send('Authorization successful! You can now upload and check videos.');
});

// Step 3: Serve frontend (index.html)
app.use(express.static(path.join(__dirname)));

// Step 4: Video upload + copyright check
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    // Load OAuth2 tokens
    const tokens = JSON.parse(fs.readFileSync('token.json'));
    oAuth2Client.setCredentials(tokens);

    // Upload to YouTube
    const youtube = google.youtube({ version: 'v3', auth: oAuth2Client });
    const videoPath = req.file.path;

    const response = await youtube.videos.insert({
      part: 'snippet,status',
      requestBody: {
        snippet: {
          title: req.body.title || 'Test Video',
          description: 'Uploaded for copyright checking'
        },
        status: {
          privacyStatus: 'private'
        }
      },
      media: {
        body: fs.createReadStream(videoPath)
      }
    });

    fs.unlinkSync(videoPath); // remove local file after upload

    res.send(`Video uploaded successfully! Video ID: ${response.data.id}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error uploading video.');
  }
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
