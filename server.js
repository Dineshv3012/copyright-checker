const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');

const app = express();
const upload = multer({ dest: path.join(__dirname, 'uploads') });

const PORT = process.env.PORT || 3000;

// --- 1) Load OAuth client credentials ---
const secretsPath = path.join(__dirname, 'client_secret.json');
if (!fs.existsSync(secretsPath)) {
  console.error('Missing client_secret.json at project root.');
  process.exit(1);
}
const creds = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
const { client_id, client_secret, redirect_uris } =
  (creds.installed || creds.web);

// Use first redirect URI from your OAuth client
const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

// --- 2) Token storage helpers ---
const tokenPath = path.join(__dirname, 'token.json');
function haveToken() {
  return fs.existsSync(tokenPath);
}
function loadToken() {
  if (haveToken()) {
    const tokens = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
    oAuth2Client.setCredentials(tokens);
  }
}
loadToken();

// --- 3) Static frontend ---
app.use(express.static(path.join(__dirname, 'public')));

// --- 4) Routes ---
// Start OAuth consent
app.get('/auth', (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly'
    ]
  });
  res.redirect(authUrl);
});

// OAuth2 callback
app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('Missing ?code param');

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
    res.send('✅ Authorized! You can close this and go back to the app.');
  } catch (e) {
    console.error(e);
    res.status(500).send('Auth failed. Check server logs.');
  }
});

// Upload a file to YouTube (private)
app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  if (!haveToken()) return res.status(401).json({ error: 'Not authorized. Visit /auth first.' });

  try {
    loadToken();
    const youtube = google.youtube({ version: 'v3', auth: oAuth2Client });

    const { originalname, path: tempPath } = req.file;
    const title = `CopyrightCheck: ${originalname}`;

    const insertResp = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title,
          description: 'Temporary upload for copyright/status check',
          categoryId: '10' // Music; pick any valid category
        },
        status: {
          privacyStatus: 'private'
        }
      },
      media: {
        body: fs.createReadStream(tempPath)
      }
    });

    const videoId = insertResp.data.id;
    // Clean temp file (optional)
    setTimeout(() => fs.existsSync(tempPath) && fs.unlinkSync(tempPath), 5000);

    res.json({
      ok: true,
      videoId,
      message: 'Uploaded privately. YouTube will run Content ID in background. Use /status/:id to fetch status.'
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Upload failed', details: String(e) });
  }
});

// Check current video status/metadata
app.get('/status/:id', async (req, res) => {
  if (!haveToken()) return res.status(401).json({ error: 'Not authorized. Visit /auth first.' });
  const videoId = req.params.id;

  try {
    loadToken();
    const youtube = google.youtube({ version: 'v3', auth: oAuth2Client });

    const info = await youtube.videos.list({
      id: [videoId],
      part: ['status', 'contentDetails', 'snippet']
    });

    if (!info.data.items || info.data.items.length === 0) {
      return res.status(404).json({ error: 'Video not found (or access denied)' });
    }
    const v = info.data.items[0];

    // NOTE: Data API does not expose Content ID claim details.
    // We surface useful fields you can check:
    const payload = {
      videoId,
      title: v.snippet?.title,
      uploadStatus: v.status?.uploadStatus,      // uploaded | processed | rejected | failed
      privacyStatus: v.status?.privacyStatus,    // private (we set), etc.
      license: v.status?.license,                // youtube/creativeCommon
      embeddable: v.status?.embeddable,
      madeForKids: v.status?.madeForKids,
      rejectionReason: v.status?.rejectionReason || null,
      regionRestriction: v.contentDetails?.regionRestriction || null
    };

    res.json(payload);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Status check failed', details: String(e) });
  }
});

// Health check
app.get('/health', (_req, res) => res.send('OK'));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('If not authorized yet, open /auth to grant access.');
});
