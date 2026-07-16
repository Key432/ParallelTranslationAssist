import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'はじめてのプロジェクト' })).toBeVisible()
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
  await source.fill('Bonjour monde')
  await source.evaluate((element: HTMLTextAreaElement) => {
    element.focus()
    element.setSelectionRange(0, 7)
  })
  await page.getByRole('button', { name: '選択範囲を翻訳 →' }).click()
  await page.getByRole('textbox', { name: '訳文' }).fill('안녕하세요')
  await page.getByRole('button', { name: '訳文を登録 ⌘↵' }).click()
  await page.getByRole('button', { name: '閲覧' }).click()
  await expect(page.getByRole('heading', { name: 'Les Misérables' })).toBeVisible()
  await expect(page.getByText('原文と訳文')).toHaveClass(/project-kicker/)
  await expect(page.getByText('by Victor Hugo')).toBeVisible()
  await expect(page.getByRole('link', { name: '🔗 Source' })).toHaveAttribute('href', 'https://example.com/les-miserables')
  await expect(page.getByRole('button', { name: 'タイトルを編集: Les Misérables' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'プロジェクト情報を表示' })).toHaveCount(0)
  await expect(page.getByText('ORIGINAL · FRENCH')).toBeVisible()
  await expect(page.getByText('TRANSLATION · KOREAN')).toBeVisible()
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

  await source.evaluate((element: HTMLTextAreaElement) => { element.scrollTop = 0 })
  await page.getByRole('button', { name: 'この対訳を編集' }).click()

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
  await page.getByRole('button', { name: '訳文の記法を確認' }).click()
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
