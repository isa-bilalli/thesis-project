import http from 'k6/http'
import { check, fail } from 'k6'

export const baseUrl = __ENV.BASE_URL || 'http://127.0.0.1:3000'
const email = __ENV.TEST_EMAIL || ''
const password = __ENV.TEST_PASSWORD || ''

export function authenticate() {
  const response = http.post(
    `${baseUrl}/api/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { 'Content-Type': 'application/json' }, tags: { endpoint: 'auth_login' } },
  )
  const valid = check(response, { 'login succeeded': (result) => result.status === 200 })
  if (!valid) fail(`Login failed with HTTP ${response.status}`)
  const body = response.json()
  return {
    token: body.accessToken,
    expiresAt: Date.now() + Math.max(30, body.expiresInSeconds - 60) * 1000,
  }
}

export function authHeaders(token) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  }
}

export function jsonBody(response) {
  try {
    return response.json()
  } catch (_) {
    return null
  }
}
