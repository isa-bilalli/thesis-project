import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'

function loadEnvironment(filePath: string): Record<string, string> {
  const values: Record<string, string> = {}

  for (const rawLine of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const separator = line.indexOf('=')
    if (separator < 1) continue
    const key = line.slice(0, separator).trim()
    let value = line.slice(separator + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    values[key] = value
  }

  return values
}

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(currentDirectory, '..')
const backendRoot = path.join(projectRoot, 'backend')
const resultsRoot = path.join(projectRoot, 'testing', 'results', 'e2e')
const fileEnvironment = loadEnvironment(path.join(backendRoot, '.env'))

for (const [key, value] of Object.entries(fileEnvironment)) {
  process.env[key] ??= value
}

const serverEnvironment = {
  ...process.env,
  DB_NAME: process.env.PERF_DB_NAME ?? 'thesis_project_perf',
  NODE_ENV: 'production',
  PORT: '3000',
  ENABLE_PERFORMANCE_METRICS: 'false',
}

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: path.join(resultsRoot, 'artifacts'),
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  actionTimeout: 10_000,
  expect: { timeout: 10_000 },
  retries: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: path.join(resultsRoot, 'results.json') }],
    ['html', { outputFolder: path.join(resultsRoot, 'html'), open: 'never' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npm.cmd run start',
      cwd: backendRoot,
      env: serverEnvironment,
      url: 'http://127.0.0.1:3000/api/health',
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'npm.cmd run preview -- --host 127.0.0.1 --port 5173',
      cwd: path.join(projectRoot, 'frontend'),
      env: { ...process.env, VITE_API_PROXY_TARGET: 'http://127.0.0.1:3000' },
      url: 'http://127.0.0.1:5173/login',
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
})
