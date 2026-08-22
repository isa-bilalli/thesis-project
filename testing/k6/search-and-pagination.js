import http from 'k6/http'
import { check, sleep } from 'k6'
import { authenticate, authHeaders, baseUrl } from './lib/session.js'

export const options = {
  scenarios: { search: { executor: 'constant-vus', vus: 10, duration: __ENV.DURATION || '3m' } },
  thresholds: { http_req_failed: ['rate<0.01'], http_req_duration: ['p(95)<750'] },
}

const requests = [
  ['/api/tenant/vehicles?page=1&limit=25&search=Performance', 'inventory_common_search'],
  ['/api/tenant/vehicles?page=1&limit=25&search=PERF-0000001', 'inventory_selective_search'],
  ['/api/tenant/vehicles?page=20&limit=25', 'inventory_deep_page'],
  ['/api/tenant/customers?page=1&limit=25&search=Performance', 'customer_common_search'],
  ['/api/tenant/customers?page=1&limit=25&search=perf.customer.0000001', 'customer_selective_search'],
  ['/api/tenant/customers?page=40&limit=25', 'customer_deep_page'],
  ['/api/tenant/leads?page=40&limit=25', 'lead_deep_page'],
  ['/api/tenant/sales?page=20&limit=25', 'sale_deep_page'],
]
let session

export default function () {
  if (!session || Date.now() >= session.expiresAt) session = authenticate()
  const [path, endpoint] = requests[Math.floor(Math.random() * requests.length)]
  const response = http.get(`${baseUrl}${path}`, { ...authHeaders(session.token), tags: { endpoint } })
  check(response, { [`${endpoint} HTTP 200`]: (result) => result.status === 200 })
  sleep(0.15)
}
