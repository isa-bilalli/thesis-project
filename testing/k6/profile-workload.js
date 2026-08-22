import http from 'k6/http'
import { check, sleep } from 'k6'
import { authenticate, authHeaders, baseUrl } from './lib/session.js'

export const options = {
  scenarios: {
    mixed_reads: { executor: 'constant-vus', vus: 10, duration: '2m', exec: 'mixedReads' },
    serial_login: { executor: 'constant-vus', vus: 1, duration: '2m', exec: 'serialLogin' },
  },
}

const paths = [
  '/api/tenant/dashboard',
  '/api/tenant/vehicles?page=1&limit=25&search=Performance',
  '/api/tenant/customers?page=1&limit=25&search=Performance',
  '/api/tenant/leads?page=20&limit=25',
  '/api/tenant/sales?page=20&limit=25',
]
let session

export function mixedReads() {
  if (!session || Date.now() >= session.expiresAt) session = authenticate()
  const response = http.get(`${baseUrl}${paths[Math.floor(Math.random() * paths.length)]}`, authHeaders(session.token))
  check(response, { 'profile read succeeded': (result) => result.status === 200 })
  sleep(0.1)
}

export function serialLogin() {
  const response = http.post(`${baseUrl}/api/auth/login`, JSON.stringify({
    email: __ENV.TEST_EMAIL,
    password: __ENV.TEST_PASSWORD,
  }), { headers: { 'Content-Type': 'application/json' } })
  check(response, { 'profile login succeeded': (result) => result.status === 200 })
  sleep(0.2)
}
