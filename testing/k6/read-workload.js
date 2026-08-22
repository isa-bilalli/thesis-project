import http from 'k6/http'
import { check, sleep } from 'k6'
import { authenticate, authHeaders, baseUrl } from './lib/session.js'

const profile = (__ENV.PROFILE || 'smoke').toLowerCase()
const profiles = {
  smoke: { executor: 'constant-vus', vus: 1, duration: '30s' },
  baseline: {
    executor: 'ramping-vus', startVUs: 1,
    stages: [{ duration: '1m', target: 1 }, { duration: '2m', target: 5 }, { duration: '2m', target: 10 }, { duration: '30s', target: 0 }],
  },
  average: { executor: 'constant-vus', vus: 20, duration: '10m' },
  stress: {
    executor: 'ramping-vus', startVUs: 5,
    stages: [{ duration: '1m', target: 10 }, { duration: '2m', target: 25 }, { duration: '2m', target: 50 }, { duration: '2m', target: 100 }, { duration: '1m', target: 0 }],
  },
  spike: {
    executor: 'ramping-vus', startVUs: 5,
    stages: [{ duration: '1m', target: 5 }, { duration: '15s', target: 100 }, { duration: '45s', target: 100 }, { duration: '1m', target: 5 }, { duration: '30s', target: 0 }],
  },
  soak: { executor: 'constant-vus', vus: 20, duration: '30m' },
  breakpoint: {
    executor: 'ramping-vus', startVUs: 10,
    stages: [{ duration: '1m', target: 25 }, { duration: '1m', target: 50 }, { duration: '1m', target: 100 }, { duration: '1m', target: 150 }, { duration: '1m', target: 200 }, { duration: '30s', target: 0 }],
  },
}

if (!profiles[profile]) throw new Error(`Unknown PROFILE ${profile}`)

export const options = {
  scenarios: { read_workload: profiles[profile] },
  thresholds: profile === 'breakpoint' ? {} : {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    'http_req_duration{endpoint:dashboard}': ['p(95)<500'],
    'http_req_duration{endpoint:inventory}': ['p(95)<500'],
  },
}

const endpoints = [
  ['/api/tenant/dashboard', 'dashboard', 18],
  ['/api/tenant/vehicles?page=1&limit=25', 'inventory', 18],
  ['/api/tenant/customers?page=1&limit=25', 'customers', 14],
  ['/api/tenant/leads?page=1&limit=25', 'leads', 14],
  ['/api/tenant/test-drives?page=1&limit=25', 'test_drives', 9],
  ['/api/tenant/offers?page=1&limit=25', 'offers', 9],
  ['/api/tenant/reservations?page=1&limit=25', 'reservations', 9],
  ['/api/tenant/sales?page=1&limit=25', 'sales', 9],
]
const weighted = endpoints.flatMap((endpoint) => Array(endpoint[2]).fill(endpoint))
let session

export default function () {
  if (!session || Date.now() >= session.expiresAt) session = authenticate()
  const [path, name] = weighted[Math.floor(Math.random() * weighted.length)]
  const response = http.get(`${baseUrl}${path}`, {
    ...authHeaders(session.token),
    tags: { endpoint: name },
  })
  check(response, { [`${name} returned 200`]: (result) => result.status === 200 })
  sleep(0.15 + Math.random() * 0.35)
}
