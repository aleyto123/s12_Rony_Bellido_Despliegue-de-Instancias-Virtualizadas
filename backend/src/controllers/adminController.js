const db = require('../models/db');
const { recalculateAllScores } = require('./matchController');

function updateMatchResult(req, res) {
  const { id } = req.params;
  const { home_score, away_score } = req.body;

  if (home_score === undefined || away_score === undefined) {
    return res.status(400).json({ error: 'Se requieren home_score y away_score' });
  }

  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(id);
  if (!match) {
    return res.status(404).json({ error: 'Partido no encontrado' });
  }

  db.prepare('UPDATE matches SET home_score = ?, away_score = ?, status = ? WHERE id = ?')
    .run(Number(home_score), Number(away_score), 'completed', id);

  recalculateAllScores();
  res.json({ message: 'Resultado actualizado y puntuaciones recalculadas', match: { ...match, home_score: Number(home_score), away_score: Number(away_score) } });
}

module.exports = { updateMatchResult };
