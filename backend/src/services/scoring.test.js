const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateBasePoints, calculateScores } = require('./scoring');

const match = { id: 1, home_score: 2, away_score: 0, kickoff_at: '2026-07-01T18:00:00.000Z' };
const prediction = (overrides = {}) => ({
  id: 1,
  user_id: 7,
  match_id: 1,
  home_score: 2,
  away_score: 0,
  predicted_at: '2026-06-30T18:00:00.000Z',
  ...overrides
});

test('exact score gives five base points, not duplicate winner/difference points', () => {
  assert.equal(calculateBasePoints(prediction(), match).points, 5);
});

test('correct winner gives three points when goal difference is wrong', () => {
  const result = calculateBasePoints(prediction({ home_score: 3, away_score: 0 }), match);
  assert.equal(result.points, 3);
  assert.equal(result.winnerCorrect, true);
  assert.equal(result.differenceCorrect, false);
});

test('correct winner and difference give five points when score is not exact', () => {
  const result = calculateBasePoints(prediction({ home_score: 3, away_score: 1 }), match);
  assert.equal(result.points, 5);
  assert.equal(result.exact, false);
  assert.equal(result.differenceCorrect, true);
});

test('anticipation bonus requires strictly more than 24 hours', () => {
  const exactly24Hours = prediction({ predicted_at: '2026-06-30T18:00:00.000Z' });
  assert.equal(calculateBasePoints(exactly24Hours, match).points, 5);
  const moreThan24Hours = prediction({ predicted_at: '2026-06-30T17:59:00.000Z' });
  assert.equal(calculateBasePoints(moreThan24Hours, match).points, 6);
});

test('streak bonus is awarded only on each third consecutive correct outcome', () => {
  const matches = [1, 2, 3, 4].map((id) => ({
    id,
    home_score: 1,
    away_score: 0,
    kickoff_at: `2026-07-0${id}T18:00:00.000Z`
  }));
  const predictions = matches.map((item, index) => ({
    ...prediction(),
    id: index + 1,
    match_id: item.id,
    predicted_at: `2026-07-0${item.id}T00:00:00.000Z`,
    home_score: 1,
    away_score: 0
  }));
  const scores = calculateScores(predictions, matches);
  assert.equal(scores.get(2).streakBonus, 0);
  assert.equal(scores.get(3).streakBonus, 2);
  assert.equal(scores.get(4).streakBonus, 0);
});

test('a completed match without a prediction breaks the winner streak', () => {
  const matches = [1, 2, 3, 4].map((id) => ({
    id,
    home_score: 1,
    away_score: 0,
    kickoff_at: `2026-07-0${id}T18:00:00.000Z`
  }));
  const predictions = [1, 3, 4].map((matchId, index) => ({
    ...prediction(),
    id: index + 1,
    match_id: matchId,
    predicted_at: `2026-07-0${matchId}T00:00:00.000Z`,
    home_score: 1,
    away_score: 0
  }));
  const scores = calculateScores(predictions, matches);
  assert.equal(scores.get(2).streakBonus, 0);
  assert.equal(scores.get(3).streakBonus, 0);
});
