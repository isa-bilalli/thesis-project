import http from 'k6/http'
import { check } from 'k6'
import { Counter } from 'k6/metrics'
import { authenticate, authHeaders, baseUrl, jsonBody } from './lib/session.js'

const successes = new Counter('reservation_successes')
const conflicts = new Counter('reservation_conflicts')

export const options = {
  scenarios: { collision: { executor: 'shared-iterations', vus: 20, iterations: 20, maxDuration: '30s' } },
  thresholds: {
    http_req_failed: ['rate<0.96'],
    reservation_successes: ['count==1'],
    reservation_conflicts: ['count==19'],
  },
}

export function setup() {
  const session = authenticate()
  const headers = authHeaders(session.token)
  const location = jsonBody(http.get(`${baseUrl}/api/tenant/locations`, headers)).locations[0]
  const marker = Date.now()
  const customerResponse = http.post(`${baseUrl}/api/tenant/customers`, JSON.stringify({
    customerType: 'INDIVIDUAL', firstName: 'Concurrency', lastName: `Buyer ${marker}`,
    email: `reservation.${marker}@example.test`, phone: `+362${String(marker).slice(-8)}`,
  }), headers)
  const customer = jsonBody(customerResponse).customer
  const vehicleResponse = http.post(`${baseUrl}/api/tenant/vehicles`, JSON.stringify({
    locationId: location.id, stockNumber: `LOCK-R-${marker}`, condition: 'USED',
    make: 'Lock', model: 'Reservation', modelYear: 2026, mileageKm: 1,
    purchasePrice: '18000', askingPrice: '24000', minimumPrice: '21000',
  }), headers)
  const vehicle = jsonBody(vehicleResponse).vehicle
  http.patch(`${baseUrl}/api/tenant/vehicles/${vehicle.id}/status`, JSON.stringify({ status: 'AVAILABLE' }), headers)
  return { token: session.token, vehicleId: vehicle.id, customerId: customer.id }
}

export default function (data) {
  const response = http.post(`${baseUrl}/api/tenant/vehicles/${data.vehicleId}/reservation`, JSON.stringify({
    customerId: data.customerId, agreedPrice: '23500',
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    notes: 'Simultaneous reservation benchmark',
  }), { ...authHeaders(data.token), tags: { endpoint: 'reservation_contention' } })
  if (response.status === 201) successes.add(1)
  if (response.status === 409) conflicts.add(1)
  check(response, { 'reservation was serialized': (result) => result.status === 201 || result.status === 409 })
}
