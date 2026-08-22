import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(process.cwd())
const profiles = path.join(root, 'testing', 'results', 'profiles')
const outputDirectory = path.join(root, 'testing', 'results', 'summary')

const cpu = JSON.parse(await readFile(path.join(profiles, 'monolith-load.cpuprofile'), 'utf8'))
const nodes = new Map(cpu.nodes.map((node) => [node.id, node.callFrame]))
const timeByNode = new Map()
for (let index = 0; index < (cpu.samples?.length ?? 0); index += 1) {
  const nodeId = cpu.samples[index]
  timeByNode.set(nodeId, (timeByNode.get(nodeId) ?? 0) + (cpu.timeDeltas?.[index] ?? 0))
}
const totalMicros = [...timeByNode.values()].reduce((sum, value) => sum + value, 0)
const cpuTop = [...timeByNode.entries()]
  .map(([nodeId, micros]) => {
    const frame = nodes.get(nodeId) ?? {}
    return {
      functionName: frame.functionName || '(anonymous)',
      url: frame.url || '',
      lineNumber: (frame.lineNumber ?? -1) + 1,
      milliseconds: micros / 1000,
      percent: totalMicros ? (micros / totalMicros) * 100 : 0,
    }
  })
  .filter((item) => !['(idle)', '(program)'].includes(item.functionName))
  .sort((left, right) => right.milliseconds - left.milliseconds)
  .slice(0, 25)

const heap = JSON.parse(await readFile(path.join(profiles, 'monolith-load.heapprofile'), 'utf8'))
const heapByFrame = new Map()
function visitHeap(node) {
  const frame = node.callFrame ?? {}
  const key = `${frame.functionName || '(anonymous)'}|${frame.url || ''}|${(frame.lineNumber ?? -1) + 1}`
  heapByFrame.set(key, (heapByFrame.get(key) ?? 0) + (node.selfSize ?? 0))
  for (const child of node.children ?? []) visitHeap(child)
}
visitHeap(heap.head)
const heapTop = [...heapByFrame.entries()]
  .map(([key, bytes]) => {
    const [functionName, url, lineNumber] = key.split('|')
    return { functionName, url, lineNumber: Number(lineNumber), bytes, megabytes: bytes / 1048576 }
  })
  .sort((left, right) => right.bytes - left.bytes)
  .slice(0, 25)

await mkdir(outputDirectory, { recursive: true })
await writeFile(
  path.join(outputDirectory, 'profile-summary.json'),
  JSON.stringify({ totalCpuProfileMilliseconds: totalMicros / 1000, cpuTop, heapTop }, null, 2),
  'utf8',
)
console.log(JSON.stringify({ cpuTop: cpuTop.slice(0, 10), heapTop: heapTop.slice(0, 10) }, null, 2))
