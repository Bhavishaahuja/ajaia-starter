// Runs the browser tests against a local API and a local frontend, with the seeded users.
// Usage (from frontend/): node e2e/run-e2e.mjs
// Set PYTHON to your backend python if it is not on PATH, and CHROME_PATH for a custom browser.
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runTests } from './tests.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const frontendDir = path.resolve(here, '..')
const backendDir = path.resolve(frontendDir, '..', 'backend')
const python = process.env.PYTHON ?? 'python'
const dbFile = path.join(mkdtempSync(path.join(tmpdir(), 'docs-e2e-')), 'e2e.db').replaceAll('\\', '/')

const children = []
function start(name, cmd, args, options) {
  const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32', ...options })
  child.stdout.on('data', (d) => process.env.E2E_VERBOSE && process.stdout.write(`[${name}] ${d}`))
  child.stderr.on('data', (d) => process.env.E2E_VERBOSE && process.stdout.write(`[${name}] ${d}`))
  children.push(child)
  return child
}

async function waitFor(url, label) {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(url)
      if (res.status < 500) return
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`${label} did not start at ${url}`)
}

function stopAll() {
  for (const child of children) child.kill()
}

try {
  start('api', python, ['-m', 'uvicorn', 'app.main:app', '--port', '8000'], {
    cwd: backendDir,
    env: {
      ...process.env,
      DATABASE_URL: `sqlite:///${dbFile}`,
      CORS_ORIGINS: 'http://localhost:5173',
    },
  })
  start('web', process.execPath, [path.join(frontendDir, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', '5173', '--strictPort'], {
    cwd: frontendDir,
    env: {
      ...process.env,
      VITE_API_URL: 'http://localhost:8000',
    },
  })

  await waitFor('http://localhost:8000/health', 'API')
  await waitFor('http://localhost:5173/', 'web')

  const failures = await runTests({ baseUrl: 'http://localhost:5173', chromePath: process.env.CHROME_PATH })
  stopAll()
  process.exit(failures ? 1 : 0)
} catch (err) {
  console.error(err)
  stopAll()
  process.exit(1)
}
