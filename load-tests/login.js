import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const loginDuration = new Trend('login_duration', true);

// --- Config ---
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

// Use real credentials from your staging DB
const USERS = [
  { email: 'dinesh@gmail.com', password: '123456789' },
  { email: 'john@gmail.com', password: '123456789' },
  { email: 'fac@gmail.com', password: '123456789' },
  { email: 'diptesh@gmail.com', password: '123456789' },
];

export const options = {
  scenarios: {
    ramp_up: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 }, // ramp up to 20 users
        { duration: '1m', target: 50 }, // hold at 50 (classroom size)
        { duration: '30s', target: 100 }, // spike
        { duration: '30s', target: 0 }, // ramp down
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    errors: ['rate<0.05'], // less than 5% error rate
  },
};

export default function () {
  const user = USERS[Math.floor(Math.random() * USERS.length)];

  const res = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ email: user.email, password: user.password }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'has token': (r) => JSON.parse(r.body)?.token !== undefined,
  });

  errorRate.add(!success);
  loginDuration.add(res.timings.duration);

  sleep(1); // 1s think time between requests
}
