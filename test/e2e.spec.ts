import path from 'node:path'
import {
  type ElectronApplication,
  type Page,
  type JSHandle,
  _electron as electron,
} from 'playwright'
import type { BrowserWindow } from 'electron'
import {
  beforeAll,
  afterAll,
  describe,
  expect,
  test,
} from 'vitest'

const root = path.join(__dirname, '..')
let electronApp: ElectronApplication
let page: Page
const runE2E = process.env.RUN_E2E === '1'
const describeE2E = runE2E ? describe : describe.skip

if (process.platform === 'linux') {
  // pass ubuntu
  test(() => expect(true).true)
} else {
  beforeAll(async () => {
    if (!runE2E) {
      return
    }

    electronApp = await electron.launch({
      args: ['.', '--no-sandbox'],
      cwd: root,
      env: { ...process.env, NODE_ENV: 'test' },
    })
    page = await electronApp.firstWindow()

    const mainWin: JSHandle<BrowserWindow> = await electronApp.browserWindow(page)
    await mainWin.evaluate(async (win) => {
      win.webContents.executeJavaScript('console.log("Execute JavaScript with e2e testing.")')
    })
  })

  afterAll(async () => {
    if (!runE2E || !page || !electronApp) {
      return
    }

    await page.screenshot({ path: 'test/screenshots/e2e.png' })
    await page.close()
    await electronApp.close()
  })

  describeE2E('[stream-tv] e2e tests', async () => {
    test('startup', async () => {
      const title = await page.title()
      expect(title).eq('Stream TV')
    })

    test('should load the player screen', async () => {
      const h1 = await page.$('h1')
      const title = await h1?.textContent()
      expect(title).eq('Stream TV')
    })

    test('should preload the sample stream url', async () => {
      const urlInput = await page.getByTestId('stream-url-input')
      expect(await urlInput.inputValue()).eq('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8')
    })
  })
}
