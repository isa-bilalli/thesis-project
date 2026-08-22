import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import lighthouse from 'lighthouse'
import { chromium } from 'playwright'

function parseEnvironment(source) {
  return Object.fromEntries(
    source.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const separator = line.indexOf('=')
        return [line.slice(0, separator), line.slice(separator + 1).replace(/^['"]|['"]$/g, '')]
      }),
  )
}

const projectRoot = path.resolve(process.cwd(), '..')
const environment = parseEnvironment(await readFile(path.join(projectRoot, 'backend', '.env'), 'utf8'))
const outputDirectory = path.join(projectRoot, 'testing', 'results', 'lighthouse')
await mkdir(outputDirectory, { recursive: true })

const port = 9222
const browser = await chromium.launch({ headless: true, args: [`--remote-debugging-port=${port}`] })

async function audit(name, url) {
  const result = await lighthouse(url, {
    port,
    logLevel: 'error',
    output: ['json', 'html'],
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
  })
  await writeFile(path.join(outputDirectory, `${name}.json`), result.report[0], 'utf8')
  await writeFile(path.join(outputDirectory, `${name}.html`), result.report[1], 'utf8')
  return Object.fromEntries(Object.entries(result.lhr.categories).map(([key, category]) => [key, Math.round((category.score ?? 0) * 100)]))
}

try {
  const login = await audit('login', 'http://127.0.0.1:5173/login')
  const page = await browser.newPage()
  await page.goto('http://127.0.0.1:5173/login')
  await page.getByPlaceholder('Email').fill(environment.SEED_TENANT_ADMIN_EMAIL)
  await page.getByPlaceholder('Password').fill(environment.SEED_TENANT_ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/dashboard$/)
  const dashboard = await audit('dashboard', 'http://127.0.0.1:5173/dashboard')
  await writeFile(path.join(outputDirectory, 'scores.json'), JSON.stringify({ login, dashboard }, null, 2), 'utf8')
  console.log(JSON.stringify({ login, dashboard }, null, 2))
} finally {
  await browser.close()
}
