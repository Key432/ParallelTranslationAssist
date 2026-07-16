import { expect, test } from '@playwright/test'

async function readWorkspace(page: import('@playwright/test').Page) {
  return page.evaluate(async () => await new Promise<{ projects: Array<{ id: string; title: string; source: string; translations: Array<{ id: string }>; keywords: Array<{ id: string }> }> }>((resolve, reject) => {
    const request = indexedDB.open('parallel-translation-assist', 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const database = request.result
      const transaction = database.transaction('workspace', 'readonly')
      const get = transaction.objectStore('workspace').get('current')
      get.onerror = () => reject(get.error)
      get.onsuccess = () => { resolve(get.result); database.close() }
    }
  }))
}

async function createProjectShareLink(page: import('@playwright/test').Page, context: import('@playwright/test').BrowserContext) {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:4173' })
  await page.getByRole('button', { name: 'プロジェクト情報を表示' }).click()
  const information = page.getByRole('dialog', { name: 'プロジェクト情報' })
  await information.getByLabel('Title 必須').fill('共有E2Eプロジェクト')
  await information.getByLabel('Original Language').selectOption('ENGLISH')
  await information.getByLabel('Translated Language').selectOption('JAPANESE')
  await information.getByRole('button', { name: '情報を保存' }).click()

  const source = page.getByRole('textbox', { name: '翻訳する原文' })
  await source.fill('Hello shared world')
  await source.evaluate((element: HTMLTextAreaElement) => { element.focus(); element.setSelectionRange(0, 5) })
  await page.getByRole('button', { name: '選択範囲を翻訳 →' }).click()
  await page.getByRole('textbox', { name: '訳文' }).fill('こんにちは')
  await page.getByRole('button', { name: '訳文を登録 ⌘↵' }).click()

  await page.getByRole('button', { name: 'キーワード追加' }).click()
  const keyword = page.getByRole('dialog', { name: '訳語キーワード' })
  await keyword.getByRole('textbox', { name: '原語', exact: true }).fill('world')
  await keyword.getByRole('textbox', { name: '訳語', exact: true }).fill('世界')
  await keyword.getByRole('button', { name: '登録' }).click()
  await keyword.getByRole('button', { name: '訳語キーワードを閉じる' }).click()

  await page.getByRole('button', { name: '共有', exact: true }).click()
  const share = page.getByRole('dialog', { name: 'プロジェクトを共有' })
  await expect(share).toContainText('18 文字')
  await expect(share).toContainText('1 件')
  await expect(share.getByRole('button', { name: 'リンクをコピー' })).toBeEnabled()
  await share.getByRole('button', { name: 'リンクをコピー' }).click()
  await expect(page.locator('.toast')).toContainText('共有リンクをコピーしました')
  return page.evaluate(() => navigator.clipboard.readText())
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'はじめてのプロジェクト' })).toBeVisible()
})

test('shares one project and safely adds it as a new project', async ({ page, context }) => {
  const shareUrl = await createProjectShareLink(page, context)
  expect(shareUrl).toContain('#share=v1.')
  expect(shareUrl).not.toContain('Hello shared world')
  await expect.poll(async () => (await readWorkspace(page)).projects[0].translations.length).toBe(1)
  const before = await readWorkspace(page)
  expect(before.projects).toHaveLength(1)

  const receivingPage = await context.newPage()
  await receivingPage.goto(shareUrl)
  const preview = receivingPage.getByRole('dialog', { name: '共有されたプロジェクト' })
  await expect(preview).toBeVisible()
  await expect(preview).toContainText('共有E2Eプロジェクト')
  await expect(preview).toContainText('🇬🇧 ENGLISH')
  await expect(preview).toContainText('🇯🇵 JAPANESE')
  await expect(preview).toContainText('18 文字')
  await expect(preview).toContainText('1 件')
  await expect.poll(() => receivingPage.evaluate(() => location.hash)).toBe('')
  expect((await readWorkspace(receivingPage)).projects).toHaveLength(1)

  await preview.getByRole('button', { name: '新しいプロジェクトとして追加' }).click()
  await expect(receivingPage.getByRole('heading', { name: '共有E2Eプロジェクト' })).toBeVisible()
  await expect(receivingPage.getByRole('textbox', { name: '翻訳する原文' })).toHaveValue('Hello shared world')
  await expect(receivingPage.getByText('こんにちは', { exact: true })).toBeVisible()
  await receivingPage.getByRole('button', { name: 'キーワード追加' }).click()
  const keywords = receivingPage.getByRole('dialog', { name: '訳語キーワード' })
  await keywords.getByRole('tab', { name: /一覧/ }).click()
  await expect(keywords.getByText('world', { exact: true })).toBeVisible()
  await expect(keywords.getByText('世界', { exact: true })).toBeVisible()

  await expect.poll(async () => (await readWorkspace(receivingPage)).projects.length).toBe(2)
  const after = await readWorkspace(receivingPage)
  expect(after.projects[0]).toMatchObject({ id: before.projects[0].id, source: before.projects[0].source })
  expect(after.projects[1].id).not.toBe(before.projects[0].id)
  expect(after.projects[1].translations[0].id).not.toBe(before.projects[0].translations[0].id)
  expect(after.projects[1].keywords[0].id).not.toBe(before.projects[0].keywords[0].id)
})

test('opens a shared project read-only without persisting it', async ({ page, context }) => {
  const shareUrl = await createProjectShareLink(page, context)
  const receivingPage = await context.newPage()
  await receivingPage.goto(shareUrl)
  await receivingPage.getByRole('dialog', { name: '共有されたプロジェクト' }).getByRole('button', { name: '閲覧のみ' }).click()
  await expect(receivingPage.getByLabel('一時閲覧')).toContainText('このプロジェクトは保存されていません')
  await expect(receivingPage.getByRole('heading', { name: '共有E2Eプロジェクト' })).toBeVisible()
  await expect(receivingPage.getByRole('button', { name: 'プロジェクトに追加' })).toBeVisible()
  expect((await readWorkspace(receivingPage)).projects).toHaveLength(1)

  await receivingPage.reload()
  await expect(receivingPage.getByLabel('一時閲覧')).toHaveCount(0)
  expect((await readWorkspace(receivingPage)).projects).toHaveLength(1)
})

test('rejects an invalid shared link without changing saved projects', async ({ page }) => {
  const before = await readWorkspace(page)
  await page.goto('/#share=v1.invalid-payload')
  await page.reload()
  await expect(page.getByRole('alertdialog', { name: '共有リンクを読み取れませんでした。' })).toBeVisible()
  await expect.poll(() => page.evaluate(() => location.hash)).toBe('')
  expect(await readWorkspace(page)).toEqual(before)
})

test('disables an oversized share link and remains usable at mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  let seed = 123456789
  const largeSource = Array.from({ length: 24_000 }, () => {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5
    return String.fromCharCode(33 + ((seed >>> 0) % 90))
  }).join('')
  await page.getByRole('textbox', { name: '翻訳する原文' }).fill(largeSource)
  await page.getByRole('button', { name: '共有', exact: true }).click()
  const share = page.getByRole('dialog', { name: 'プロジェクトを共有' })
  await expect(share).toBeVisible()
  await expect(share.getByText(/プロジェクトが大きいため共有リンクを作成できません/)).toBeVisible()
  await expect(share.getByRole('button', { name: 'リンクをコピー' })).toBeDisabled()
  await expect(share.getByRole('button', { name: 'プロジェクトファイルを保存' })).toBeVisible()
  await expect(share.getByRole('button', { name: '閉じる' })).toBeVisible()
})

test('uses only directives supported by a meta Content Security Policy', async ({ page }) => {
  const policy = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')
  expect(policy).toContain("connect-src 'self' https://api.openai.com")
  expect(policy).not.toContain('frame-ancestors')
})

test('opens the project statistics dashboard', async ({ page }) => {
  await page.getByRole('button', { name: 'プロジェクト統計を表示' }).click()

  const dialog = page.getByRole('dialog', { name: '統計' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('原文文字数')).toBeVisible()
  await expect(dialog.getByText('対訳件数')).toBeVisible()
  await expect(dialog.getByText('訳文合計文字数')).toBeVisible()
  await expect(dialog.getByLabel('翻訳済み 0%')).toBeVisible()

  await dialog.getByRole('button', { name: '統計を閉じる' }).click()
  await expect(dialog).toBeHidden()
})

test('creates a new project immediately with the default title', async ({ page }) => {
  await page.getByRole('button', { name: '新しいプロジェクトを作成' }).click()
  await expect(page.getByRole('heading', { name: 'New Project' })).toBeVisible()
  await expect(page.getByLabel('新しいプロジェクト名')).toHaveCount(0)
})

test('shows explanations for sidebar project action icons', async ({ page }) => {
  const openSidebar = page.getByRole('button', { name: 'プロジェクト一覧を開く' })
  if (await openSidebar.isVisible()) await openSidebar.click()
  const projectItem = page.locator('.project-item').filter({ hasText: 'はじめてのプロジェクト' })
  await projectItem.hover()

  const edit = projectItem.getByRole('button', { name: '「はじめてのプロジェクト」のタイトルを編集' })
  await edit.hover()
  await expect(edit.getByRole('tooltip')).toHaveText('タイトルを編集')

  const remove = projectItem.getByRole('button', { name: '「はじめてのプロジェクト」を削除' })
  await remove.hover()
  await expect(remove.getByRole('tooltip')).toHaveText('プロジェクトを削除')
})

test('edits project information and reflects languages in both views', async ({ page }) => {
  await page.getByRole('button', { name: 'プロジェクト情報を表示' }).click()
  const dialog = page.getByRole('dialog', { name: 'プロジェクト情報' })
  await dialog.getByLabel('Title 必須').fill('Les Misérables')
  await dialog.getByLabel('Author 任意').fill('Victor Hugo')
  await dialog.getByLabel('Source 任意').fill('https://example.com/les-miserables')
  await dialog.getByLabel('Original Language').selectOption('FRENCH')
  await dialog.getByLabel('Translated Language').selectOption('KOREAN')
  await expect.poll(() => dialog.getByLabel('Original Language').evaluate((element) => getComputedStyle(element).fontFamily)).toContain('Noto Color Emoji')
  await dialog.getByRole('button', { name: '情報を保存' }).click()

  await expect(page.getByRole('heading', { name: 'Les Misérables' })).toBeVisible()
  const author = page.getByText('by Victor Hugo')
  await expect(author).toBeVisible()
  await expect.poll(() => author.evaluate((element) => getComputedStyle(element).fontSize)).toBe('14px')
  await expect.poll(() => author.evaluate((element) => getComputedStyle(element).fontFamily)).toContain('Libre Caslon Text')
  const sourceLink = page.getByRole('link', { name: '🔗 Source' })
  await expect(sourceLink).toHaveAttribute('href', 'https://example.com/les-miserables')
  await expect(sourceLink).toHaveAttribute('target', '_blank')
  await expect(page.locator('.source-panel .lang')).toHaveText('FRENCH')
  await expect(page.locator('.translation-panel .lang')).toHaveText('KOREAN')

  const source = page.getByRole('textbox', { name: '翻訳する原文' })
  await expect.poll(() => source.evaluate((element) => getComputedStyle(element).fontFamily)).toContain('Noto Serif')
  await source.fill('Bonjour monde')
  await source.evaluate((element: HTMLTextAreaElement) => {
    element.focus()
    element.setSelectionRange(0, 7)
  })
  await page.getByRole('button', { name: '選択範囲を翻訳 →' }).click()
  const translatedInput = page.getByRole('textbox', { name: '訳文' })
  await expect.poll(() => translatedInput.evaluate((element) => getComputedStyle(element).fontFamily)).toContain('Noto Serif KR')
  await translatedInput.fill('안녕하세요')
  await page.getByRole('button', { name: '訳文を登録 ⌘↵' }).click()
  await expect.poll(() => page.locator('.pair-source').evaluate((element) => getComputedStyle(element).fontFamily)).toContain('Noto Serif')
  await expect.poll(() => page.locator('.pair-translation').evaluate((element) => getComputedStyle(element).fontFamily)).toContain('Noto Serif KR')
  await page.getByRole('button', { name: '閲覧' }).click()
  await expect(page.getByRole('heading', { name: 'Les Misérables' })).toBeVisible()
  await expect(page.getByText('原文と訳文')).toHaveClass(/project-kicker/)
  await expect(page.getByText('by Victor Hugo')).toBeVisible()
  await expect(page.getByRole('link', { name: '🔗 Source' })).toHaveAttribute('href', 'https://example.com/les-miserables')
  await expect(page.getByRole('button', { name: 'タイトルを編集: Les Misérables' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'プロジェクト情報を表示' })).toHaveCount(0)
  await expect(page.getByText('ORIGINAL · FRENCH')).toBeVisible()
  await expect(page.getByText('TRANSLATION · KOREAN')).toBeVisible()
  await expect.poll(() => page.locator('.reader-source').first().evaluate((element) => getComputedStyle(element).fontFamily)).toContain('Noto Serif')
  await expect.poll(() => page.locator('.reader-translation').first().evaluate((element) => getComputedStyle(element).fontFamily)).toContain('Noto Serif KR')
})

test('opens title editing from the workspace title', async ({ page }) => {
  await page.getByRole('button', { name: 'タイトルを編集: はじめてのプロジェクト' }).click()
  await expect(page.getByLabel('Title 必須')).toBeFocused()
})

test('registers a translation from a source selection and updates progress', async ({ page }) => {
  const source = page.getByRole('textbox', { name: '翻訳する原文' })
  await source.fill('Hello world')
  await source.evaluate((element: HTMLTextAreaElement) => {
    element.focus()
    element.setSelectionRange(0, 5)
  })

  await page.getByRole('button', { name: '選択範囲を翻訳 →' }).click()
  await expect(page.locator('.selected-source-range')).toHaveText('Hello')
  await expect.poll(() => page.locator('.selected-source-range').evaluate((element) => {
    const style = getComputedStyle(element)
    return `${style.outlineWidth} ${style.outlineColor}`
  })).toBe('1px rgb(228, 195, 172)')
  await page.getByRole('textbox', { name: '訳文' }).fill('こんにちは')
  await page.getByRole('button', { name: '訳文を登録 ⌘↵' }).click()

  await expect(page.getByText('こんにちは', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'プロジェクト統計を表示' }).click()
  const dialog = page.getByRole('dialog', { name: '統計' })
  await expect(dialog.getByLabel('翻訳済み 50%')).toBeVisible()
  await expect(dialog.getByText('未翻訳 1語')).toBeVisible()
})

test('navigates untranslated ranges in both directions, wraps, focuses input, and completes whitespace-only gaps', async ({ page }) => {
  const source = page.getByRole('textbox', { name: '翻訳する原文' })
  await source.fill('One Two Three Four')

  for (const pair of [
    { start: 4, end: 7, translated: '二' },
    { start: 14, end: 18, translated: '四' },
  ]) {
    await source.evaluate((element: HTMLTextAreaElement, range) => {
      element.focus()
      element.setSelectionRange(range.start, range.end)
    }, pair)
    await page.getByRole('button', { name: '選択範囲を翻訳 →' }).click()
    await page.getByRole('textbox', { name: '訳文' }).fill(pair.translated)
    await page.getByRole('button', { name: '訳文を登録 ⌘↵' }).click()
  }

  const previous = page.getByRole('button', { name: '← 前の未翻訳' })
  const next = page.getByRole('button', { name: '次の未翻訳 →' })
  const sourceFooter = page.locator('.source-footer')
  const footerBox = await sourceFooter.boundingBox()
  const previousBox = await previous.boundingBox()
  if (!footerBox || !previousBox) throw new Error('原文フッターの表示位置を取得できませんでした。')
  expect(previousBox.x - footerBox.x).toBeLessThan(50)

  await next.click()
  await expect(page.locator('.selected-source-range')).toHaveText('One')
  await expect(page.getByRole('textbox', { name: '訳文' })).toBeFocused()

  await next.click()
  await expect(page.locator('.selected-source-range')).toHaveText('Three')
  await previous.click()
  await expect(page.locator('.selected-source-range')).toHaveText('One')

  await page.getByRole('textbox', { name: '訳文' }).fill('一')
  await expect(next).toBeDisabled()
  await expect(previous).toBeDisabled()
  await page.getByRole('button', { name: '訳文を登録 ⌘↵' }).click()

  await next.click()
  await expect(page.locator('.selected-source-range')).toHaveText('Three')
  await page.getByRole('textbox', { name: '訳文' }).fill('三')
  await page.getByRole('button', { name: '訳文を登録 ⌘↵' }).click()

  const completeStatus = page.getByText('すべて翻訳済みです')
  await expect(completeStatus).toBeVisible()
  const completeBox = await completeStatus.boundingBox()
  if (!completeBox) throw new Error('翻訳完了表示の位置を取得できませんでした。')
  const completedNextBox = await next.boundingBox()
  if (!completedNextBox) throw new Error('未翻訳移動ボタンの位置を取得できませんでした。')
  expect(completeBox.x).toBeGreaterThan(completedNextBox.x + completedNextBox.width)
  await expect(next).toBeDisabled()
  await expect(previous).toBeDisabled()
})

test('creates an AI draft by sending only the selected source and matching glossary to mocked OpenAI endpoints', async ({ page }) => {
  let receivedRequest: Record<string, unknown> | null = null
  let receivedHeaders: Record<string, string> = {}
  let translationCalls = 0
  await page.route('https://api.openai.com/v1/**', async (route) => {
    const request = route.request()
    if (request.url().endsWith('/models')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ object: 'list', data: [{ id: 'gpt-5-mini' }] }) })
      return
    }
    translationCalls += 1
    receivedRequest = request.postDataJSON() as Record<string, unknown>
    receivedHeaders = request.headers()
    if (translationCalls === 1) {
      await route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: { code: 'insufficient_quota', message: 'quota exceeded' } }) })
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 120))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'x-request-id': 'mock-request' },
      body: JSON.stringify({ output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ translation: '選択された兎です。', warnings: ['前後関係がないため主語を特定できません。'] }) }] }] }),
    })
  })

  const aiButton = page.getByRole('button', { name: 'AIで下訳を作成' })
  const helpButton = page.getByRole('button', { name: '訳文の記法を確認' })
  const footerKeywordButton = page.getByRole('button', { name: 'キーワード追加' })
  await aiButton.hover()
  await expect(page.getByText('APIキーを設定して使用')).toBeVisible()
  const [helpBox, aiBox, keywordBox] = await Promise.all([helpButton.boundingBox(), aiButton.boundingBox(), footerKeywordButton.boundingBox()])
  if (!helpBox || !aiBox || !keywordBox) throw new Error('訳文フッターの操作ボタン位置を取得できませんでした。')
  expect(helpBox.x).toBeLessThan(aiBox.x)
  expect(aiBox.x).toBeLessThan(keywordBox.x)
  expect(Math.abs(helpBox.y - aiBox.y)).toBeLessThan(2)
  expect(Math.abs(aiBox.y - keywordBox.y)).toBeLessThan(2)

  await page.getByRole('button', { name: /AI翻訳支援/ }).click()
  const settings = page.getByRole('dialog', { name: 'AI翻訳支援' })
  await settings.getByLabel('OpenAI APIキー').fill('test-api-key')
  await settings.getByRole('button', { name: '接続を確認' }).click()
  await expect(settings.getByText(/接続状態: 利用可能/)).toBeVisible()
  await settings.getByRole('button', { name: 'AI翻訳支援の設定を閉じる' }).click()

  const addProject = page.getByRole('button', { name: '新しいプロジェクトを作成' })
  if (!await addProject.isVisible()) await page.getByRole('button', { name: 'プロジェクト一覧を開く' }).click()
  await addProject.click()
  await page.getByRole('button', { name: /AI翻訳支援/ }).click()
  await expect(page.getByLabel('OpenAI APIキー')).toHaveValue('test-api-key')
  await expect(page.getByText(/接続状態: 利用可能/)).toBeVisible()
  await page.getByRole('button', { name: 'AI翻訳支援の設定を閉じる' }).click()
  const firstProject = page.getByRole('button', { name: /はじめてのプロジェクト/ })
  if (!await firstProject.isVisible()) await page.getByRole('button', { name: 'プロジェクト一覧を開く' }).click()
  await firstProject.click()

  const sourceText = 'Before garden.\n\nSelected rabbit.\n\nAfter garden.'
  const selectedText = 'Selected rabbit.'
  const source = page.getByRole('textbox', { name: '翻訳する原文' })
  await source.fill(sourceText)

  const keywordButton = page.getByRole('button', { name: 'キーワード追加' })
  for (const keyword of [{ source: 'rabbit', translated: '兎' }, { source: 'garden', translated: '庭' }]) {
    await keywordButton.click()
    const dialog = page.getByRole('dialog', { name: '訳語キーワード' })
    await dialog.getByRole('textbox', { name: '原語', exact: true }).fill(keyword.source)
    await dialog.getByRole('textbox', { name: '訳語', exact: true }).fill(keyword.translated)
    await dialog.getByRole('button', { name: '登録' }).click()
    await dialog.getByRole('button', { name: '訳語キーワードを閉じる' }).click()
  }

  const start = sourceText.indexOf(selectedText)
  await source.evaluate((element: HTMLTextAreaElement, range) => {
    element.focus()
    element.setSelectionRange(range.start, range.end)
  }, { start, end: start + selectedText.length })
  await page.getByRole('button', { name: '選択範囲を翻訳 →' }).click()
  const translation = page.getByRole('textbox', { name: '訳文' })
  await translation.fill('入力中の訳文')

  await aiButton.click()
  await expect(page.getByRole('alert')).toHaveText('OpenAI APIの利用上限または残高を確認してください。')
  await expect(translation).toHaveValue('入力中の訳文')
  await expect(aiButton).toBeEnabled()
  await aiButton.click()
  await expect(page.getByText('下訳を作成しています…')).toBeVisible()
  await expect(page.getByLabel('AI翻訳支援').getByRole('button', { name: 'キャンセル' })).toBeVisible()
  await expect(page.getByRole('button', { name: '次の未翻訳 →' })).toBeDisabled()
  await expect(page.getByText('選択された兎です。')).toBeVisible()
  const sentInput = JSON.parse(receivedRequest?.input as string)
  expect(sentInput).toEqual({
    sourceText: selectedText,
    sourceLanguage: 'ENGLISH',
    targetLanguage: 'JAPANESE',
    glossary: [{ source: 'rabbit', translated: '兎' }],
  })
  expect(receivedRequest?.instructions).toContain('原語（source）と使用推奨訳語（translated）のセット')
  expect(JSON.stringify(sentInput)).not.toContain('Before garden')
  expect(JSON.stringify(sentInput)).not.toContain('After garden')
  expect(JSON.stringify(sentInput)).not.toContain('contextBefore')
  expect(JSON.stringify(sentInput)).not.toContain('contextAfter')
  expect(JSON.stringify(sentInput)).not.toContain('fullSource')
  expect(JSON.stringify(receivedRequest)).not.toContain('test-api-key')
  expect(receivedHeaders.authorization).toBe('Bearer test-api-key')
  await expect(page.getByText('前後関係がないため主語を特定できません。')).toBeVisible()

  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: '訳文欄へ反映' }).click()
  const replaceDialog = page.getByRole('alertdialog', { name: '入力中の訳文を置き換えますか？' })
  await replaceDialog.getByRole('button', { name: 'キャンセル' }).click()
  await expect(translation).toHaveValue('入力中の訳文')
  await page.getByRole('button', { name: '訳文欄へ反映' }).click()
  await page.getByRole('alertdialog', { name: '入力中の訳文を置き換えますか？' }).getByRole('button', { name: '置き換える' }).click()
  await expect(translation).toHaveValue('選択された兎です。')
  await translation.fill('確認して修正した訳文')
  await expect(page.getByRole('button', { name: 'この対訳を編集' })).toHaveCount(0)
  await page.getByRole('button', { name: '訳文を登録 ⌘↵' }).click()
  await expect(page.getByText('確認して修正した訳文', { exact: true })).toBeVisible()

  await page.reload()
  await page.getByRole('button', { name: 'プロジェクト一覧を開く' }).click()
  await page.getByRole('button', { name: /AI翻訳支援/ }).click()
  await expect(page.getByLabel('OpenAI APIキー')).toHaveValue('')
})

test('registers, updates, displays, and deletes a project keyword', async ({ page }) => {
  const source = page.getByRole('textbox', { name: '翻訳する原文' })
  await source.fill('Translation translates translation.')

  const addButton = page.getByRole('button', { name: 'キーワード追加' })
  await addButton.hover()
  await expect(addButton.locator('.translation-keyword-tooltip')).toBeVisible()
  await addButton.click()

  const dialog = page.getByRole('dialog', { name: '訳語キーワード' })
  await dialog.getByRole('textbox', { name: '原語', exact: true }).fill('translation')
  await dialog.getByRole('textbox', { name: '訳語', exact: true }).fill('翻訳')
  await dialog.getByRole('button', { name: '登録' }).click()
  await expect(dialog.getByText('translation', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: '訳語キーワードを閉じる' }).click()

  const markedKeyword = page.locator('.keyword-source')
  await expect(markedKeyword).toHaveCount(1)
  await expect.poll(() => markedKeyword.evaluate((element) => getComputedStyle(element).textDecorationStyle)).toBe('dashed')
  const bounds = await markedKeyword.boundingBox()
  if (!bounds) throw new Error('キーワードの表示位置を取得できませんでした。')
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
  await expect(page.getByRole('tooltip', { name: '翻訳' })).toBeVisible()

  await addButton.click()
  await dialog.getByRole('tab', { name: /一覧/ }).click()
  await dialog.getByRole('button', { name: 'translationを編集' }).click()
  await dialog.getByRole('textbox', { name: '訳語', exact: true }).fill('訳すこと')
  await dialog.getByRole('button', { name: '更新' }).click()
  await expect(dialog.getByText('訳すこと')).toBeVisible()
  await dialog.getByRole('button', { name: 'translationを削除' }).click()
  await expect(dialog.getByText('登録されたキーワードはありません。')).toBeVisible()
  await dialog.getByRole('button', { name: '訳語キーワードを閉じる' }).click()
  await expect(markedKeyword).toHaveCount(0)
})

test('filters registered translations by source and translated text', async ({ page }) => {
  const source = page.getByRole('textbox', { name: '翻訳する原文' })
  await source.fill('Hello world')

  for (const pair of [
    { start: 0, end: 5, translated: 'こんにちは' },
    { start: 6, end: 11, translated: '世界' },
  ]) {
    await source.evaluate((element: HTMLTextAreaElement, range) => {
      element.focus()
      element.setSelectionRange(range.start, range.end)
    }, pair)
    await page.getByRole('button', { name: '選択範囲を翻訳 →' }).click()
    await page.getByRole('textbox', { name: '訳文' }).fill(pair.translated)
    await page.getByRole('button', { name: '訳文を登録 ⌘↵' }).click()
  }

  const registered = page.getByRole('region', { name: '登録済みの対訳' })
  const search = registered.getByRole('textbox', { name: '検索文字列' })
  await search.fill('Hello')
  await registered.getByRole('button', { name: 'フィルター' }).click()
  await expect(registered.locator('.pair-card')).toHaveCount(1)
  await expect(registered.getByText('原文「Hello」: 1 / 2 件')).toBeVisible()

  await search.fill('world')
  await expect(registered.getByText('Hello', { exact: true })).toBeVisible()
  await registered.getByRole('button', { name: '訳文' }).click()
  await search.fill('世界')
  await registered.getByRole('button', { name: 'フィルター' }).click()
  await expect(registered.locator('.pair-card')).toHaveCount(1)
  await expect(registered.getByText('world', { exact: true })).toBeVisible()
  await expect(registered.getByText('訳文「世界」: 1 / 2 件')).toBeVisible()

  await registered.getByRole('button', { name: '解除' }).click()
  await expect(registered.locator('.pair-card')).toHaveCount(2)
  await expect(search).toHaveValue('')
})

test('highlights and scrolls to a registered source range when editing', async ({ page }) => {
  const lines = Array.from({ length: 60 }, (_, index) => `Line ${index + 1}`).join('\n')
  const sourceText = `${lines}\nTarget text`
  const targetStart = sourceText.indexOf('Target text')
  const source = page.getByRole('textbox', { name: '翻訳する原文' })
  await source.fill(sourceText)
  await source.evaluate((element: HTMLTextAreaElement, start) => {
    element.focus()
    element.setSelectionRange(start, start + 'Target text'.length)
  }, targetStart)
  await page.getByRole('button', { name: '選択範囲を翻訳 →' }).click()
  await expect(page.locator('.selected-source-range')).toHaveText('Target text')
  await page.getByRole('textbox', { name: '訳文' }).fill('対象')
  await page.getByRole('button', { name: '訳文を登録 ⌘↵' }).click()

  const pair = page.locator('.pair-card').filter({ hasText: '対象' })
  const edit = pair.getByRole('button', { name: 'この対訳を編集' })
  await edit.hover()
  await expect(edit.getByRole('tooltip')).toHaveText('編集')
  const remove = pair.getByRole('button', { name: 'この対訳を削除' })
  await remove.hover()
  await expect(remove.getByRole('tooltip')).toHaveText('削除')

  await source.evaluate((element: HTMLTextAreaElement) => { element.scrollTop = 0 })
  await edit.click()

  await expect(page.locator('.selected-source-range')).toHaveText('Target text')
  await expect.poll(() => source.evaluate((element: HTMLTextAreaElement) => element.scrollTop)).toBeGreaterThan(0)
})

test('keeps the source update strategy and caret until the source loses focus', async ({ page }) => {
  const source = page.getByRole('textbox', { name: '翻訳する原文' })
  await source.evaluate((element: HTMLTextAreaElement) => {
    element.focus()
    element.setSelectionRange(0, 5)
  })
  await page.getByRole('button', { name: '選択範囲を翻訳 →' }).click()
  await page.getByRole('textbox', { name: '訳文' }).fill('こんにちは')
  await page.getByRole('button', { name: '訳文を登録 ⌘↵' }).click()

  await source.fill('Hallo world')
  const dialog = page.getByRole('alertdialog', { name: 'この原文の更新は登録済みの対訳に影響します' })
  await dialog.getByRole('button', { name: '訳文を保持' }).click()
  await expect(source).toBeFocused()
  await expect.poll(() => source.evaluate((element: HTMLTextAreaElement) => element.selectionStart)).toBe('Hallo world'.length)

  await page.waitForTimeout(900)
  await source.evaluate((element: HTMLTextAreaElement) => element.setSelectionRange(0, 1))
  await page.keyboard.type('Y')
  await expect(source).toHaveValue('Yallo world')
  await expect(dialog).toBeHidden()

  await page.getByRole('heading', { name: 'はじめてのプロジェクト' }).click()
  await source.focus()
  await source.evaluate((element: HTMLTextAreaElement) => element.setSelectionRange(0, 1))
  await page.keyboard.type('H')
  await expect(dialog).toBeVisible()
})

test('shows translation markup help and renders semantic translation styles', async ({ page }) => {
  const helpButton = page.getByRole('button', { name: '訳文の記法を確認' })
  await helpButton.hover()
  await expect(helpButton.getByRole('tooltip')).toHaveText('訳文記法ヘルプ')
  await helpButton.click()
  const help = page.getByRole('dialog', { name: '訳文の記法' })
  await expect(help).toBeVisible()
  await expect(help.getByText('**テキスト**', { exact: true })).toBeVisible()
  await expect(help.locator('dt').filter({ hasText: '下線' })).toBeVisible()
  await expect(help.getByText('|漢字《かんじ》', { exact: true })).toBeVisible()
  await help.getByRole('button', { name: '訳文の記法を閉じる' }).click()

  const source = page.getByRole('textbox', { name: '翻訳する原文' })
  await source.fill('Semantic text')
  await source.evaluate((element: HTMLTextAreaElement) => {
    element.focus()
    element.setSelectionRange(0, element.value.length)
  })
  await page.getByRole('button', { name: '選択範囲を翻訳 →' }).click()
  await page.getByRole('textbox', { name: '訳文' }).fill('**太字** _下線_ ~取消~ ｜漢字《かんじ》')
  await page.getByRole('button', { name: '訳文を登録 ⌘↵' }).click()

  const registered = page.locator('.pair-translation')
  await expect(registered.locator('strong')).toHaveText('太字')
  await expect(registered.getByText('下線', { exact: true })).toHaveCSS('text-decoration-line', 'underline')
  await expect(registered.locator('s')).toHaveText('取消')
  await expect(registered.locator('ruby')).toHaveText('漢字かんじ')
  await expect(registered.locator('rt')).toHaveText('かんじ')

  await page.getByRole('button', { name: '閲覧' }).click()
  const readerTranslation = page.locator('.reader-translation')
  await expect(readerTranslation.locator('strong')).toHaveText('太字')
  await expect(readerTranslation.getByText('下線', { exact: true })).toHaveCSS('text-decoration-line', 'underline')
  await expect(readerTranslation.locator('s')).toHaveText('取消')
  await expect(readerTranslation.locator('rt')).toHaveText('かんじ')
})

test('excludes the application header and reader summary when printing', async ({ page }) => {
  const source = page.getByRole('textbox', { name: '翻訳する原文' })
  await source.fill('Hello')
  await source.evaluate((element: HTMLTextAreaElement) => {
    element.focus()
    element.setSelectionRange(0, 5)
  })
  await page.getByRole('button', { name: '選択範囲を翻訳 →' }).click()
  await page.getByRole('textbox', { name: '訳文' }).fill('こんにちは')
  await page.getByRole('button', { name: '訳文を登録 ⌘↵' }).click()
  await page.getByRole('button', { name: '閲覧' }).click()

  const header = page.locator('.topbar')
  const summary = page.getByText('1 件の訳文 · 未訳部分も原文の流れに沿って表示')
  await expect(header).toBeVisible()
  await expect(summary).toBeVisible()

  await page.emulateMedia({ media: 'print' })
  await expect(header).toBeHidden()
  await expect(summary).toBeHidden()
  await expect(page.getByText('こんにちは', { exact: true })).toBeVisible()
})

test('keeps undo history after reloading the browser', async ({ page }) => {
  const status = page.getByRole('combobox', { name: 'プロジェクトステータス' })
  await status.selectOption('完了')
  await expect(page.getByRole('button', { name: '変更を元に戻す' })).toBeEnabled()

  await page.reload()
  await expect(page.getByRole('heading', { name: 'はじめてのプロジェクト' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'プロジェクトステータス' })).toHaveValue('完了')

  await page.getByRole('button', { name: '変更を元に戻す' }).click()
  await expect(page.getByRole('combobox', { name: 'プロジェクトステータス' })).toHaveValue('未着手')
  await page.getByRole('button', { name: '変更をやり直す' }).click()
  await expect(page.getByRole('combobox', { name: 'プロジェクトステータス' })).toHaveValue('完了')
})
