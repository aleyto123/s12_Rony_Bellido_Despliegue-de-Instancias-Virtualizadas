const { pool } = require('../models/db');
const { recalculateAllScores } = require('./matchController');

async function createMatch(req, res) {
  const { home_team: homeTeam, away_team: awayTeam, kickoff_at: kickoffAt } = req.body;
  const stage = typeof req.body.stage === 'string' ? req.body.stage.trim() : 'Group stage';
  const groupName = typeof req.body.group_name === 'string' ? req.body.group_name.trim() : null;
  const stadium = typeof req.body.stadium === 'string' ? req.body.stadium.trim() : null;
  const city = typeof req.body.city === 'string' ? req.body.city.trim() : null;

  if (typeof homeTeam !== 'string' || typeof awayTeam !== 'string' || !homeTeam.trim() || !awayTeam.trim() || homeTeam.trim() === awayTeam.trim() || !Number.isFinite(Date.parse(kickoffAt))) {
    return res.status(400).json({ error: 'Indica dos selecciones distintas y una fecha de inicio válida.' });
  }

  const { rows } = await pool.query(
    `INSERT INTO matches (home_team, away_team, kickoff_at, stage, group_name, stadium, city)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [homeTeam.trim(), awayTeam.trim(), new Date(kickoffAt).toISOString(), stage, groupName, stadium, city]
  );
  return res.status(201).json(rows[0]);
}

async function updateMatchResult(req, res) {
  const matchId = Number(req.params.id);
  const { home_score, away_score } = req.body;

  if (!Number.isSafeInteger(matchId) || !Number.isInteger(home_score) || !Number.isInteger(away_score) || home_score < 0 || away_score < 0 || home_score > 99 || away_score > 99) {
    return res.status(400).json({ error: 'Indica un partido y marcadores enteros entre 0 y 99.' });
  }

  const result = await pool.query(
    `UPDATE matches SET home_score = $1, away_score = $2, status = 'completed'
     WHERE id = $3 RETURNING *`,
    [home_score, away_score, matchId]
  );
  if (!result.rowCount) return res.status(404).json({ error: 'Partido no encontrado.' });

  await recalculateAllScores();
  return res.json({ message: 'Resultado actualizado y puntuaciones recalculadas.', match: result.rows[0] });
}

async function updateMatchStatus(req, res) {
  const matchId = Number(req.params.id);
  const { status } = req.body;
  if (!Number.isSafeInteger(matchId) || !['scheduled', 'live', 'completed'].includes(status)) {
    return res.status(400).json({ error: 'Estado o identificador de partido inválido.' });
  }
  if (status === 'completed') {
    return res.status(400).json({ error: 'Para finalizar el partido, envía también su marcador final.' });
  }
  const result = await pool.query(
    'UPDATE matches SET status = $1, home_score = NULL, away_score = NULL WHERE id = $2 RETURNING *',
    [status, matchId]
  );
  if (!result.rowCount) return res.status(404).json({ error: 'Partido no encontrado.' });
  await recalculateAllScores();
  return res.json(result.rows[0]);
}

module.exports = { createMatch, updateMatchResult, updateMatchStatus };
