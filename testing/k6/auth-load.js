import http from 'k6/http'
import { check, sleep } from 'k6'
import { baseUrl } from './lib/session.js'

export const options = {
  scenarios: {
    login_load: {
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1s',
      preAllocatedVUs: 20,
      maxVUs: 100,
      stages: [
        { duration: '1m', target: 1 },
        { duration: '1m', target: 5 },
        { duration: '1m', target: 10 },
        { duration: '1m', target: 20 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
    dropped_iterations: ['count==0'],
  },
}

export default function () {
  const response = http.post(
    `${baseUrl}/api/auth/login`,
    JSON.stringify({ email: __ENV.TEST_EMAIL, password: __ENV.TEST_PASSWORD }),
    { headers: { 'Content-Type': 'application/json' }, tags: { endpoint: 'auth_login' } },
  )
  check(response, { 'login HTTP 200': (result) => result.status === 200 })
  sleep(0.05)
}
