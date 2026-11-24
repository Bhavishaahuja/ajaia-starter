// Browser tests for the editor, using the seeded users and the switcher.
// Covers: create, rename, edit, format, save, reopen, autosave, import, sharing,
// removing access, delete, and the blocked stranger.
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright'

const AVA = 'Ava Chen'
const BEN = 'Ben Ortiz'
const CARA = 'Cara Singh'

// wait until a condition is true, polling every 200 ms
async function waitUntil(check, label) {
  const deadline = Date.now() + 10000
  while (Date.now() < deadline) {
    const value = await check()
    if (value) return value
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error(`timed out waiting for ${label}`)
}

async function open(page, baseUrl, userName) {
  await page.goto(baseUrl)
  await pickUser(page, userName)
}

async function pickUser(page, userName) {
  const select = page.locator('select')
  await select.waitFor({ timeout: 10000 })
  await select.selectOption({ label: userName })
  await page.getByText('Owned by you', { exact: false }).first().waitFor({ timeout: 10000 })
}

async function newDocument(page) {
  await page.getByRole('button', { name: 'New document' }).click()
  await page.getByLabel('Document title').waitFor({ timeout: 10000 })
}

async function openRow(page, title) {
  await page.getByRole('button', { name: new RegExp(title) }).first().click()
  await page.getByLabel('Document title').waitFor({ timeout: 10000 })
}

async function editorHtml(page, pattern) {
  await page.locator('.ProseMirror').waitFor({ timeout: 10000 })
  return waitUntil(async () => {
    const html = await page.locator('.ProseMirror').innerHTML()
    return pattern && !pattern.test(html) ? null : html
  }, `editor to show ${pattern ?? 'content'}`)
}

async function titleValue(page) {
  return page.getByLabel('Document title').inputValue()
}

async function waitStatus(page, text) {
  await page.getByRole('status').filter({ hasText: text }).waitFor({ timeout: 10000 })
}

const tests = []
function test(name, fn) {
  tests.push({ name, fn })
}

test('create, rename, format, save and reopen', async (page, baseUrl) => {
  await open(page, baseUrl, AVA)
  await newDocument(page)
  const docUrl = page.url()

  await page.getByLabel('Document title').fill('Q3 plan')
  await page.getByLabel('Document title').blur()

  await page.locator('.ProseMirror').click()
  await page.keyboard.type('Big title')
  await page.getByRole('button', { name: 'H1', exact: true }).click()
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'B', exact: true }).click()
  await page.keyboard.type('bold')
  await page.getByRole('button', { name: 'B', exact: true }).click()
  await page.keyboard.type(' plain ')
  await page.getByRole('button', { name: 'I', exact: true }).click()
  await page.keyboard.type('ital')
  await page.getByRole('button', { name: 'I', exact: true }).click()
  await page.getByRole('button', { name: 'U', exact: true }).click()
  await page.keyboard.type('under')
  await page.getByRole('button', { name: 'U', exact: true }).click()
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Bullets', exact: true }).click()
  await page.keyboard.type('item one')

  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await waitStatus(page, 'All changes saved')

  await page.reload()
  assert.equal(page.url(), docUrl, 'reload keeps the same document in the URL')
  await waitUntil(async () => (await titleValue(page)) === 'Q3 plan', 'title Q3 plan')
  const html = await editorHtml(page, /item one/)
  assert.match(html, /<h1>Big title<\/h1>/)
  assert.match(html, /<strong>bold<\/strong>/)
  assert.match(html, /<em>ital<\/em>/)
  assert.match(html, /<u>under<\/u>/)
  assert.match(html, /<ul>.*item one/s)
})

test('autosave keeps text without pressing Save', async (page, baseUrl) => {
  await open(page, baseUrl, CARA)
  await newDocument(page)
  await page.locator('.ProseMirror').click()
  await page.keyboard.type('autosaved line')
  await waitStatus(page, 'All changes saved')
  await page.reload()
  assert.match(await editorHtml(page, /autosaved line/), /autosaved line/)
})

test('import a .txt file as a new document', async (page, baseUrl) => {
  await open(page, baseUrl, BEN)
  const dir = mkdtempSync(path.join(tmpdir(), 'docs-upload-'))
  const file = path.join(dir, 'meeting.txt')
  writeFileSync(file, 'Agenda\n\nFirst item <script>bad()</script>')
  await page.locator('input[type=file]').setInputFiles(file)
  await page.getByLabel('Document title').waitFor({ timeout: 10000 })
  await waitUntil(async () => (await titleValue(page)) === 'meeting', 'title meeting')
  const html = await editorHtml(page, /First item/)
  assert.doesNotMatch(html, /<script/)
})

test('a file type we do not accept shows an error', async (page, baseUrl) => {
  await open(page, baseUrl, BEN)
  const dir = mkdtempSync(path.join(tmpdir(), 'docs-upload-'))
  const file = path.join(dir, 'photo.png')
  writeFileSync(file, 'not really an image')
  await page.locator('input[type=file]').setInputFiles(file)
  await page.getByText('Only .txt, .md and .docx files are supported.').waitFor({ timeout: 10000 })
})

test('share with a seeded user, they edit, stranger is blocked', async (page, baseUrl) => {
  await open(page, baseUrl, AVA)
  await newDocument(page)
  await page.getByLabel('Document title').fill('Shared plan')
  await page.getByLabel('Document title').blur()
  await page.locator('.ProseMirror').click()
  await page.keyboard.type('Ava wrote this')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await waitStatus(page, 'All changes saved')
  const docUrl = page.url()

  // an email that is not a seeded user is refused
  await page.getByPlaceholder('ben@example.com').fill('nobody@example.com')
  await page.getByRole('button', { name: 'Share', exact: true }).click()
  await page.getByText('No user with that email').waitFor({ timeout: 10000 })

  await page.getByPlaceholder('ben@example.com').fill('ben@example.com')
  await page.getByRole('button', { name: 'Share', exact: true }).click()
  await page.getByText(`Shared with ${BEN}`).waitFor({ timeout: 10000 })

  // Ben sees it under shared, opens it and edits it
  await pickUser(page, BEN)
  await page.getByText('Shared with you (1)').waitFor({ timeout: 10000 })
  await page.getByText('Owner: Ava Chen').waitFor({ timeout: 10000 })
  await openRow(page, 'Shared plan')
  await page.locator('.ProseMirror').click()
  await page.keyboard.press('End')
  await page.keyboard.type(' Ben too')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await waitStatus(page, 'All changes saved')
  // Ben has no share box on a doc he does not own
  assert.equal(await page.getByPlaceholder('ben@example.com').count(), 0)

  // Ava sees Ben's edit
  await pickUser(page, AVA)
  await page.goto(docUrl)
  await page.reload()
  assert.match(await editorHtml(page, /Ben too/), /Ben too/)

  // Cara has no access: not in her list, and the URL gives "not found"
  await pickUser(page, CARA)
  await page.getByText('Nothing shared with this user yet.').waitFor({ timeout: 10000 })
  await page.goto(docUrl)
  await page.getByText('Document not found.').waitFor({ timeout: 10000 })
})

test('owner removes edit access', async (page, baseUrl) => {
  await open(page, baseUrl, AVA)
  await openRow(page, 'Shared plan')
  await page.getByRole('button', { name: 'Remove access' }).first().click()
  await page.getByText(`${BEN} can no longer open this document.`).waitFor({ timeout: 10000 })

  await pickUser(page, BEN)
  await page.getByText('Nothing shared with this user yet.').waitFor({ timeout: 10000 })
})

test('owner deletes a document with two clicks', async (page, baseUrl) => {
  await open(page, baseUrl, AVA)
  await openRow(page, 'Shared plan')
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await page.getByRole('button', { name: 'Click again to delete' }).waitFor({ timeout: 5000 })
  await page.getByRole('button', { name: 'Click again to delete' }).click()
  await page.getByText('Owned by you', { exact: false }).first().waitFor({ timeout: 10000 })
  assert.equal(await page.getByRole('button', { name: /Shared plan/ }).count(), 0)
})

export async function runTests({ baseUrl, chromePath }) {
  const browser = await chromium.launch({
    headless: true,
    executablePath: chromePath || undefined,
    args: ['--no-sandbox'],
  })
  let failures = 0
  try {
    for (const t of tests) {
      // fresh browser storage per test, so the saved user does not leak between tests
      const context = await browser.newContext({ baseURL: baseUrl })
      const page = await context.newPage()
      try {
        await t.fn(page, baseUrl)
        console.log(`PASS ${t.name}`)
      } catch (err) {
        failures++
        console.log(`FAIL ${t.name}\n  ${String(err.message).split('\n').slice(0, 4).join('\n  ')}`)
      } finally {
        await context.close()
      }
    }
  } finally {
    await browser.close()
  }
  console.log(failures ? `${failures} test(s) failed` : `all ${tests.length} tests passed`)
  return failures
}
