import http from 'k6/http';
import { check, fail } from 'k6';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
const VUS = Number.parseInt(__ENV.VUS || '100', 10);
const PASSWORD = __ENV.LOAD_TEST_PASSWORD || 'Load-Test-2026!';

export const options = {
  scenarios: {
    concurrent_predictions: {
      executor: 'per-vu-iterations',
      vus: VUS,
      iterations: 1,
      maxDuration: '2m'
    }
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<1500'],
    checks: ['rate>0.98']
  }
};

export default function () {
  const username = `k6_${Date.now().toString(36)}_${__VU}`;
  const headers = { 'Content-Type': 'application/json' };
  const registration = http.post(
    `${BASE_URL}/api/auth/register`,
    JSON.stringify({ username, password: PASSWORD }),
    { headers, tags: { action: 'register' } }
  );
  if (!check(registration, { 'registration created': (response) => response.status === 201 })) {
    fail(`Registration failed for virtual user ${__VU}: ${registration.status}`);
  }

  const token = registration.json('token');
  if (!token) fail('Registration response did not contain a token');
  const authorized = { ...headers, Authorization: `Bearer ${token}` };
  const matchesResponse = http.get(`${BASE_URL}/api/matches`, { headers: authorized, tags: { action: 'list_matches' } });
  if (!check(matchesResponse, { 'matches loaded': (response) => response.status === 200 })) {
    fail(`Could not load matches: ${matchesResponse.status}`);
  }

  const matches = matchesResponse.json();
  const now = Date.now();
  const requestedMatchId = __ENV.MATCH_ID;
  const match = requestedMatchId
    ? matches.find((item) => String(item.id) === requestedMatchId)
    : matches.find((item) => item.status !== 'completed' && new Date(item.kickoff_at).getTime() > now + 10 * 60 * 1000);
  if (!match) fail('No open match found. Set MATCH_ID to an upcoming match.');

  const prediction = http.post(
    `${BASE_URL}/api/matches/${match.id}/predictions`,
    JSON.stringify({ home_score: __VU % 4, away_score: (__VU + 1) % 4 }),
    { headers: authorized, tags: { action: 'submit_prediction' } }
  );
  check(prediction, { 'prediction accepted': (response) => response.status === 201 });
}
