function calculatePoints(prediction, actualResult, predictedAt, kickoffAt) {
  const predictedHome = Number(prediction.home_score);
  const predictedAway = Number(prediction.away_score);
  const actualHome = Number(actualResult.home_score);
  const actualAway = Number(actualResult.away_score);

  let totalPoints = 0;

  if (predictedHome === actualHome && predictedAway === actualAway) {
    totalPoints += 5;
  }

  const predictedWinner = predictedHome === predictedAway ? 'draw' : predictedHome > predictedAway ? 'home' : 'away';
  const actualWinner = actualHome === actualAway ? 'draw' : actualHome > actualAway ? 'home' : 'away';

  if (predictedWinner === actualWinner) {
    totalPoints += 3;
  }

  const predictedDiff = Math.abs(predictedHome - predictedAway);
  const actualDiff = Math.abs(actualHome - actualAway);
  if (predictedWinner === actualWinner && predictedDiff === actualDiff) {
    totalPoints += 2;
  }

  const predictedTime = new Date(predictedAt).getTime();
  const kickoffTime = new Date(kickoffAt).getTime();
  const hoursAhead = (kickoffTime - predictedTime) / (1000 * 60 * 60);
  if (hoursAhead > 24) {
    totalPoints += 1;
  }

  return totalPoints;
}

function getWinner(teamA, teamB) {
  if (teamA === teamB) return 'draw';
  return teamA > teamB ? 'home' : 'away';
}

function calculateStreakBonus(userPredictions, matches) {
  const sorted = userPredictions
    .map((prediction) => {
      const actual = matches.find((match) => match.id === prediction.match_id);
      return { ...prediction, actual };
    })
    .filter((item) => item.actual && item.actual.home_score !== null && item.actual.away_score !== null)
    .sort((a, b) => new Date(a.actual.kickoff_at) - new Date(b.actual.kickoff_at));

  let streak = 0;
  let bonus = 0;

  for (const item of sorted) {
    const predictedWinner = getWinner(item.home_score, item.away_score);
    const actualWinner = getWinner(item.actual.home_score, item.actual.away_score);
    if (predictedWinner === actualWinner) {
      streak += 1;
      if (streak % 3 === 0) {
        bonus += 2;
      }
    } else {
      streak = 0;
    }
  }

  return bonus;
}

module.exports = {
  calculatePoints,
  calculateStreakBonus
};
