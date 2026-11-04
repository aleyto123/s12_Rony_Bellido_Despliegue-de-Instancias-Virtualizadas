const db = require('../models/db');
const { calculatePoints, calculateStreakBonus } = require('../services/scoringService');

function getMatches(req, res) {
  const matches = db.prepare('SELECT * FROM matches ORDER BY kickoff_at ASC').all();
  res.json(matches);
}

function createPrediction(req, res) {
  const userId = req.user.id;
  const matchId = Number(req.params.id);
  const { home_score, away_score } = req.body;

  if (home_score === undefined || away_score === undefined) {
    return res.status(400).json({ error: 'Debe indicar home_score y away_score' });
  }

  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
  if (!match) {
    return res.status(404).json({ error: 'Partido no encontrado' });
  }

  if (match.home_score !== null && match.away_score !== null) {
    return res.status(400).json({ error: 'Este partido ya tiene resultado real' });
  }

  const existing = db.prepare('SELECT id FROM predictions WHERE user_id = ? AND match_id = ?').get(userId, matchId);
  if (existing) {
    return res.status(409).json({ error: 'Ya existe una predicción para este partido' });
  }

  const predictedAt = new Date().toISOString();
  const prediction = {
    user_id: userId,
    match_id: matchId,
    home_score: Number(home_score),
    away_score: Number(away_score),
    predicted_at: predictedAt
  };

  const result = db.prepare('INSERT INTO predictions (user_id, match_id, home_score, away_score, predicted_at) VALUES (?, ?, ?, ?, ?)')
    .run(prediction.user_id, prediction.match_id, prediction.home_score, prediction.away_score, prediction.predicted_at);

  res.status(201).json({ id: result.lastInsertRowid, ...prediction });
}

function getUserPredictions(req, res) {
  const userId = req.user.id;
  const rows = db.prepare(`
    SELECT p.*, m.home_team, m.away_team, m.kickoff_at
    FROM predictions p
    INNER JOIN matches m ON m.id = p.match_id
    WHERE p.user_id = ?
    ORDER BY m.kickoff_at ASC
  `).all(userId);
  res.json(rows);
}

function getLeaderboardGlobal(req, res) {
  const rows = db.prepare(`
    SELECT u.username, COALESCE(SUM(p.points), 0) AS total_points
    FROM users u
    LEFT JOIN predictions p ON p.user_id = u.id
    GROUP BY u.id, u.username
    ORDER BY total_points DESC, u.username ASC
  `).all();
  res.json(rows);
}

function recalculateAllScores() {
  const matches = db.prepare('SELECT * FROM matches ORDER BY kickoff_at ASC').all();
  const predictions = db.prepare('SELECT * FROM predictions').all();
  const users = db.prepare('SELECT * FROM users').all();

  for (const user of users) {
    const userPredictions = predictions.filter((p) => p.user_id === user.id);
    let total = 0;

    for (const prediction of userPredictions) {
      const match = matches.find((m) => m.id === prediction.match_id);
      if (!match || match.home_score === null || match.away_score === null) continue;

      const basePoints = calculatePoints(prediction, match, prediction.predicted_at, match.kickoff_at);
      const streakBonus = calculateStreakBonus(userPredictions, matches);
      const finalPoints = basePoints + streakBonus;

      db.prepare('UPDATE predictions SET points = ? WHERE id = ?').run(finalPoints, prediction.id);
      total += finalPoints;
    }

    db.prepare('INSERT INTO scores (user_id, group_id, total_points, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, group_id) DO UPDATE SET total_points = excluded.total_points, updated_at = excluded.updated_at')
      .run(user.id, null, total, new Date().toISOString());
  }
}

module.exports = {
  getMatches,
  createPrediction,
  getUserPredictions,
  getLeaderboardGlobal,
  recalculateAllScores
};
