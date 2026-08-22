import { cpus, freemem, platform, release, totalmem } from 'node:os'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const output = {
  capturedAt: new Date().toISOString(),
  platform: platform(),
  release: release(),
  cpuModel: cpus()[0]?.model ?? 'Unknown',
  logicalCpuCount: cpus().length,
  totalMemoryGb: totalmem() / 1073741824,
  freeMemoryGbAtCapture: freemem() / 1073741824,
  nodeVersion: process.version,
  architecture: process.arch,
}
const target = path.resolve('testing/results/summary/system.json')
await mkdir(path.dirname(target), { recursive: true })
await writeFile(target, JSON.stringify(output, null, 2), 'utf8')
console.log(JSON.stringify(output, null, 2))
