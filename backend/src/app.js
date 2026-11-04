const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./models/db');
const authRoutes = require('./routes/authRoutes');
const matchRoutes = require('./routes/matchRoutes');
const groupRoutes = require('./routes/groupRoutes');
const adminRoutes = require('./routes/adminRoutes');
const aiRoutes = require('./routes/aiRoutes');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.resolve(__dirname, '../../frontend/public')));

app.locals.db = db;

const initDb = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'player',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      home_team TEXT NOT NULL,
      away_team TEXT NOT NULL,
      kickoff_at TEXT NOT NULL,
      home_score INTEGER,
      away_score INTEGER,
      status TEXT DEFAULT 'scheduled',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      match_id INTEGER NOT NULL,
      home_score INTEGER NOT NULL,
      away_score INTEGER NOT NULL,
      predicted_at TEXT NOT NULL,
      points INTEGER DEFAULT 0,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(match_id) REFERENCES matches(id)
    );

    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      invite_code TEXT UNIQUE NOT NULL,
      created_by INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS group_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(group_id, user_id),
      FOREIGN KEY(group_id) REFERENCES groups(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      group_id INTEGER,
      total_points INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, group_id),
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(group_id) REFERENCES groups(id)
    );
  `);

  const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!existingAdmin) {
    const bcrypt = require('bcryptjs');
    const passwordHash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('admin', passwordHash, 'admin');
  }

  const matchCount = db.prepare('SELECT COUNT(*) as count FROM matches').get().count;
  if (matchCount === 0) {
    const sampleMatches = [
      ['Argentina', 'Arabia Saudita', '2026-11-06T18:00:00Z', null, null],
      ['Brasil', 'Serbia', '2026-11-07T15:00:00Z', null, null],
      ['Francia', 'Australia', '2026-11-08T18:00:00Z', null, null],
      ['Alemania', 'Japón', '2026-11-09T15:00:00Z', null, null],
      ['España', 'Costa Rica', '2026-11-10T18:00:00Z', null, null],
      ['Inglaterra', 'México', '2026-11-11T15:00:00Z', null, null],
      ['Portugal', 'Ghana', '2026-11-12T18:00:00Z', null, null],
      ['Uruguay', 'Corea del Sur', '2026-11-13T15:00:00Z', null, null],
      ['Argentina', 'México', '2026-11-18T18:00:00Z', null, null],
      ['Brasil', 'Suiza', '2026-11-19T15:00:00Z', null, null]
    ];

    const stmt = db.prepare('INSERT INTO matches (home_team, away_team, kickoff_at, home_score, away_score, status) VALUES (?, ?, ?, ?, ?, ?)');
    for (const match of sampleMatches) {
      stmt.run(match[0], match[1], match[2], match[3], match[4], 'scheduled');
    }
  }
};

initDb();

app.get('/health', (req, res) => {
  res.json({ ok: true, message: 'API funcionando' });
});

app.use('/api/auth', authRoutes);
app.use('/api', matchRoutes);
app.use('/api', groupRoutes);
app.use('/api', adminRoutes);
app.use('/api', aiRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(port, () => {
  console.log(`Servidor corriendo en puerto ${port}`);
});
