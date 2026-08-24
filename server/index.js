require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

// Import db module (but don't init yet — we do that async)
const { initDb } = require('./db');
const { initEmail } = require('./services/email');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded photos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── API Routes ──────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api/notices', require('./routes/notices'));
app.use('/api/dashboard', require('./routes/dashboard'));

// ─── Health Check ────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Serve Frontend (production) ─────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ─── Error Handling ──────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File is too large. Max size is 5MB.' });
  }
  if (err.message && err.message.includes('Only JPEG')) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: 'Internal server error.' });
});

// ─── Start Server ────────────────────────────────────────────────────
async function start() {
  // Initialize database first (async for sql.js WASM loading)
  await initDb();
  console.log(' Database initialized');

  // Initialize email service
  await initEmail();

  app.listen(PORT, () => {
    console.log(`\n Society Maintenance Tracker`);
    console.log(`   Server running on http://localhost:${PORT}`);
    console.log(`   API base: http://localhost:${PORT}/api`);
    console.log(`   Uploads: http://localhost:${PORT}/uploads\n`);
  });
}

start();
