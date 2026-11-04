function getAIInsights(req, res) {
  const mockStats = [
    { team: 'Argentina', winProbability: 87, form: 'Excelente', confidence: 'Alta' },
    { team: 'Brasil', winProbability: 79, form: 'Muy buena', confidence: 'Alta' },
    { team: 'Francia', winProbability: 74, form: 'Estable', confidence: 'Media' },
    { team: 'España', winProbability: 72, form: 'Buena', confidence: 'Media' },
    { team: 'Alemania', winProbability: 68, form: 'Buena', confidence: 'Media' }
  ];

  res.json({ insights: mockStats });
}

module.exports = { getAIInsights };
