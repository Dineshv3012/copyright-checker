const fs = require('fs');
const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Load OAuth2 credentials
const credentials = JSON.parse(fs.readFileSync('client_secret.json'));
const { client_id, client_secret, redirect_uris } = credentials.web;

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
  res.send(`<h1>YouTube Copyright Checker</h1>
            <p><a href="${authUrl}">Authorize with Google</a></p>`);
});

// Step 2: Handle OAuth2 callback
app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('No code received from Google');

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    fs.writeFileSync('token.json', JSON.stringify(tokens));
    res.send('<h2>Authorization successful!</h2><p>You can now upload and check videos.</p>');
  } catch (error) {
    res.status(500).send('Error during OAuth: ' + error.message);
  }
});

// Step 3: Endpoint to upload a video (placeholder for copyright check)
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded');
  }
  res.send(`Video "${req.file.originalname}" uploaded successfully! Copyright checking feature coming soon.`);
});

app.listen(3000, () => console.log('Server running on port 3000'));
