import http from 'k6/http'
import { check } from 'k6'
import { Counter } from 'k6/metrics'
import { authenticate, authHeaders, baseUrl, jsonBody } from './lib/session.js'

const successes = new Counter('sale_completion_successes')
const conflicts = new Counter('sale_completion_conflicts')

export const options = {
  scenarios: { collision: { executor: 'shared-iterations', vus: 20, iterations: 20, maxDuration: '30s' } },
  thresholds: {
    http_req_failed: ['rate<0.96'],
    sale_completion_successes: ['count==1'],
    sale_completion_conflicts: ['count==19'],
  },
}

export function setup() {
  const session = authenticate()
  const headers = authHeaders(session.token)
  const me = jsonBody(http.get(`${baseUrl}/api/auth/me`, headers)).user
  const location = jsonBody(http.get(`${baseUrl}/api/tenant/locations`, headers)).locations[0]
  const marker = Date.now()
  const customer = jsonBody(http.post(`${baseUrl}/api/tenant/customers`, JSON.stringify({
    customerType: 'INDIVIDUAL', firstName: 'Concurrent', lastName: `Sale ${marker}`,
    email: `sale.${marker}@example.test`, phone: `+363${String(marker).slice(-8)}`,
  }), headers)).customer
  const vehicle = jsonBody(http.post(`${baseUrl}/api/tenant/vehicles`, JSON.stringify({
    locationId: location.id, stockNumber: `LOCK-S-${marker}`, condition: 'USED',
    make: 'Lock', model: 'Sale', modelYear: 2026, mileageKm: 1,
    purchasePrice: '18000', askingPrice: '24000', minimumPrice: '21000',
  }), headers)).vehicle
  http.patch(`${baseUrl}/api/tenant/vehicles/${vehicle.id}/status`, JSON.stringify({ status: 'AVAILABLE' }), headers)
  const sale = jsonBody(http.post(`${baseUrl}/api/tenant/sales`, JSON.stringify({
    locationId: location.id, customerId: customer.id, vehicleId: vehicle.id,
    salespersonUserId: me.id, saleDate: new Date().toISOString(), vehiclePrice: '24000',
    discountAmount: '0', taxAmount: '4800', feeAmount: '200', paymentMethod: 'CASH',
  }), headers)).sale
  return { token: session.token, saleId: sale.id }
}

export default function (data) {
  const requestOptions = authHeaders(data.token)
  requestOptions.headers['Idempotency-Key'] = `sale-${__VU}-${Date.now()}`
  const response = http.patch(`${baseUrl}/api/tenant/sales/${data.saleId}/status`, JSON.stringify({ status: 'COMPLETED' }), {
    ...requestOptions, tags: { endpoint: 'sale_contention' },
  })
  if (response.status === 200) successes.add(1)
  if (response.status === 409) conflicts.add(1)
  check(response, { 'sale completion was serialized': (result) => result.status === 200 || result.status === 409 })
}
