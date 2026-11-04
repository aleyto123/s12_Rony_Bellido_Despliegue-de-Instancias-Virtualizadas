const { pool } = require('../models/db');
const { calculateScores } = require('../services/scoring');

async function getMatches(req, res) {
  const { rows } = await pool.query('SELECT * FROM matches ORDER BY kickoff_at ASC, id ASC');
  res.json(rows);
}

async function createPrediction(req, res) {
  const userId = req.user.id;
  const matchId = Number(req.params.id);
  const { home_score, away_score } = req.body;

  if (!Number.isInteger(home_score) || !Number.isInteger(away_score) || home_score < 0 || away_score < 0 || home_score > 99 || away_score > 99) {
    return res.status(400).json({ error: 'Los marcadores deben ser enteros entre 0 y 99.' });
  }

  const matchResult = await pool.query('SELECT * FROM matches WHERE id = $1', [matchId]);
  const match = matchResult.rows[0];
  if (!match) {
    return res.status(404).json({ error: 'Partido no encontrado' });
  }

  if (match.status !== 'scheduled' || new Date(match.kickoff_at).getTime() <= Date.now() + 10 * 60 * 1000) {
    return res.status(400).json({ error: 'El periodo para pronosticar este partido ya cerró.' });
  }

  const result = await pool.query(
    `INSERT INTO predictions (user_id, match_id, home_score, away_score)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, match_id) DO NOTHING
     RETURNING id, user_id, match_id, home_score, away_score, predicted_at, points`,
    [userId, matchId, home_score, away_score]
  );
  if (result.rowCount === 0) {
    return res.status(409).json({ error: 'Ya existe un pronóstico para este partido.' });
  }

  res.status(201).json(result.rows[0]);
}

async function getUserPredictions(req, res) {
  const { rows } = await pool.query(`
    SELECT p.*, m.home_team, m.away_team, m.kickoff_at
    FROM predictions p
    INNER JOIN matches m ON m.id = p.match_id
    WHERE p.user_id = $1
    ORDER BY m.kickoff_at ASC
  `, [req.user.id]);
  res.json(rows);
}

async function getLeaderboardGlobal(req, res) {
  const { rows } = await pool.query(`
    SELECT u.id AS user_id, u.username,
      COALESCE(SUM(p.points), 0)::int AS total_points,
      COUNT(p.id)::int AS total_predictions,
      COUNT(p.id) FILTER (WHERE p.exact_hit)::int AS exact_hits,
      COUNT(p.id) FILTER (WHERE p.winner_hit AND NOT p.exact_hit)::int AS winner_hits,
      COUNT(p.id) FILTER (WHERE p.goal_difference_hit)::int AS goal_difference_hits
    FROM users u
    LEFT JOIN predictions p ON p.user_id = u.id
    GROUP BY u.id, u.username
    ORDER BY total_points DESC, u.username ASC
  `);
  res.json(rows);
}

async function recalculateAllScores() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const [matchResult, predictionResult] = await Promise.all([
      client.query('SELECT id, kickoff_at, home_score, away_score, status FROM matches ORDER BY kickoff_at, id'),
      client.query('SELECT id, user_id, match_id, home_score, away_score, predicted_at FROM predictions ORDER BY user_id, predicted_at, id')
    ]);
    const scores = calculateScores(predictionResult.rows, matchResult.rows);
    for (const prediction of predictionResult.rows) {
      const score = scores.get(prediction.id);
      await client.query(
        `UPDATE predictions SET points = $1, exact_hit = $2, winner_hit = $3, goal_difference_hit = $4 WHERE id = $5`,
        [score?.points || 0, score?.exact || false, score?.winnerCorrect || false, score?.differenceCorrect || false, prediction.id]
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  getMatches,
  createPrediction,
  getUserPredictions,
  getLeaderboardGlobal,
  recalculateAllScores
};
