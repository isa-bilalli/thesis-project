import { expect, test } from '@playwright/test'
import { adminEmail, adminPassword, salespersonEmail } from './helpers'

async function tokenFor(request: Parameters<Parameters<typeof test>[1]>[0]['request'], email: string) {
  const response = await request.post('/api/auth/login', { data: { email, password: adminPassword } })
  expect(response.status()).toBe(200)
  return (await response.json()).accessToken as string
}

test('returns stable errors for unauthenticated, invalid, and missing resources', async ({ request }) => {
  expect((await request.get('/api/tenant/vehicles')).status()).toBe(401)
  const token = await tokenFor(request, adminEmail)
  const headers = { Authorization: `Bearer ${token}` }
  expect((await request.get('/api/tenant/vehicles?page=0', { headers })).status()).toBe(400)
  expect((await request.get('/api/tenant/vehicles/2147483647', { headers })).status()).toBe(404)
})

test('returns 403 when a valid role lacks the required permission', async ({ request }) => {
  const token = await tokenFor(request, salespersonEmail)
  const response = await request.get('/api/users', { headers: { Authorization: `Bearer ${token}` } })
  expect(response.status()).toBe(403)
})
