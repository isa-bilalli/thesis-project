import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(process.cwd())
const k6Directory = path.join(root, 'testing', 'results', 'k6')
const outputDirectory = path.join(root, 'testing', 'results', 'summary')

function metricValues(metric = {}) {
  const values = metric.values ?? metric
  return {
    avg: values.avg ?? null,
    med: values.med ?? null,
    p90: values['p(90)'] ?? null,
    p95: values['p(95)'] ?? null,
    p99: values['p(99)'] ?? null,
    max: values.max ?? null,
    rate: values.rate ?? null,
    count: values.count ?? null,
  }
}

const k6 = {}
for (const filename of (await readdir(k6Directory)).filter((name) => name.endsWith('.json')).sort()) {
  const data = JSON.parse(await readFile(path.join(k6Directory, filename), 'utf8'))
  const metrics = data.metrics ?? {}
  k6[path.basename(filename, '.json')] = {
    http: metricValues(metrics.http_req_duration),
    dashboard: metricValues(metrics['http_req_duration{endpoint:dashboard}']),
    inventory: metricValues(metrics['http_req_duration{endpoint:inventory}']),
    failureRate: metricValues(metrics.http_req_failed).rate,
    requests: metricValues(metrics.http_reqs),
    iterations: metricValues(metrics.iterations),
    droppedIterations: metricValues(metrics.dropped_iterations).count,
    reservationSuccesses: metricValues(metrics.reservation_successes).count,
    reservationConflicts: metricValues(metrics.reservation_conflicts).count,
    saleSuccesses: metricValues(metrics.sale_completion_successes).count,
    saleConflicts: metricValues(metrics.sale_completion_conflicts).count,
  }
}

const csvPath = path.join(root, 'testing', 'results', 'runtime', 'monolith-process.csv')
const csvLines = (await readFile(csvPath, 'utf8')).trim().split(/\r?\n/)
const headers = csvLines.shift().split(',')
const samples = csvLines.map((line) => {
  const values = line.split(',')
  return Object.fromEntries(headers.map((header, index) => [header, header === 'timestamp' ? values[index] : Number(values[index])]))
})
const soakSamples = samples.slice(-1800)
const average = (rows, field) => rows.reduce((sum, row) => sum + row[field], 0) / Math.max(1, rows.length)
const maximum = (rows, field) => Math.max(...rows.map((row) => row[field]))
const firstWindow = soakSamples.slice(0, 300)
const lastWindow = soakSamples.slice(-300)
const cpuSamples = soakSamples.slice(1).map((row, index) => {
  const elapsedMicros = Math.max(
    1,
    (Date.parse(row.timestamp) - Date.parse(soakSamples[index].timestamp)) * 1000,
  )
  return { value: ((row.cpu_user_micros + row.cpu_system_micros) / elapsedMicros) * 100 }
})

const runtime = {
  sampleCount: samples.length,
  soakSampleCount: soakSamples.length,
  rssMb: {
    firstFiveMinuteAverage: average(firstWindow, 'rss_bytes') / 1048576,
    lastFiveMinuteAverage: average(lastWindow, 'rss_bytes') / 1048576,
    maximum: maximum(soakSamples, 'rss_bytes') / 1048576,
  },
  heapUsedMb: {
    firstFiveMinuteAverage: average(firstWindow, 'heap_used_bytes') / 1048576,
    lastFiveMinuteAverage: average(lastWindow, 'heap_used_bytes') / 1048576,
    maximum: maximum(soakSamples, 'heap_used_bytes') / 1048576,
  },
  cpuPercent: {
    average: average(cpuSamples, 'value'),
    maximum: maximum(cpuSamples, 'value'),
  },
  eventLoopMs: {
    p95SampleAverage: average(soakSamples, 'event_loop_p95_ms'),
    p99SampleAverage: average(soakSamples, 'event_loop_p99_ms'),
    maximum: maximum(soakSamples, 'event_loop_max_ms'),
  },
}

await mkdir(outputDirectory, { recursive: true })
await writeFile(
  path.join(outputDirectory, 'monolith-summary.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), k6, runtime }, null, 2),
  'utf8',
)
console.log(JSON.stringify({ k6Runs: Object.keys(k6).length, runtime }, null, 2))
