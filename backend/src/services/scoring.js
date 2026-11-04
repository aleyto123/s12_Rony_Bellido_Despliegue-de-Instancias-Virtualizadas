function getOutcome(homeScore, awayScore) {
  if (homeScore === awayScore) return 'draw';
  return homeScore > awayScore ? 'home' : 'away';
}

function calculateBasePoints(prediction, match) {
  const predictedHome = Number(prediction.home_score);
  const predictedAway = Number(prediction.away_score);
  const actualHome = Number(match.home_score);
  const actualAway = Number(match.away_score);
  const exact = predictedHome === actualHome && predictedAway === actualAway;
  const winnerCorrect = getOutcome(predictedHome, predictedAway) === getOutcome(actualHome, actualAway);
  const differenceCorrect = !exact && winnerCorrect
    && Math.abs(predictedHome - predictedAway) === Math.abs(actualHome - actualAway);

  const basePoints = exact ? 5 : winnerCorrect ? 3 + (differenceCorrect ? 2 : 0) : 0;
  const anticipated = Date.parse(match.kickoff_at) - Date.parse(prediction.predicted_at) > 24 * 60 * 60 * 1000;

  return {
    points: basePoints + (anticipated ? 1 : 0),
    exact,
    winnerCorrect,
    differenceCorrect,
    anticipated
  };
}

function calculateScores(predictions, matches) {
  const completedMatches = matches
    .filter((match) => match.home_score !== null && match.away_score !== null)
    .sort((left, right) => Date.parse(left.kickoff_at) - Date.parse(right.kickoff_at));
  const predictionsByUser = new Map();
  for (const prediction of predictions) {
    const userPredictions = predictionsByUser.get(prediction.user_id) || new Map();
    userPredictions.set(prediction.match_id, prediction);
    predictionsByUser.set(prediction.user_id, userPredictions);
  }

  const scoreByPredictionId = new Map();
  for (const userPredictions of predictionsByUser.values()) {
    let correctWinnerStreak = 0;

    for (const match of completedMatches) {
      const prediction = userPredictions.get(match.id);
      if (!prediction) {
        correctWinnerStreak = 0;
        continue;
      }

      const result = calculateBasePoints(prediction, match);
      correctWinnerStreak = result.winnerCorrect ? correctWinnerStreak + 1 : 0;
      const streakBonus = result.winnerCorrect && correctWinnerStreak % 3 === 0 ? 2 : 0;
      scoreByPredictionId.set(prediction.id, {
        ...result,
        points: result.points + streakBonus,
        streakBonus
      });
    }
  }

  return scoreByPredictionId;
}

module.exports = { calculateBasePoints, calculateScores, getOutcome };
