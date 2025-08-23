const fs = require('fs');
const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');

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
    scope: ['https://www.googleapis.com/auth/youtube.readonly']
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

// Step 3: Endpoint to upload a video and check (future integration)
app.post('/upload', upload.single('file'), async (req, res) => {
  res.send('Video uploaded! Copyright checking feature coming next.');
});

app.listen(3000, () => console.log('Server running on port 3000'));
