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

test('registers a translation from a source selection and updates progress', async ({ page }) => {
  const source = page.getByRole('textbox', { name: '翻訳する原文' })
  await source.fill('Hello world')
  await source.evaluate((element: HTMLTextAreaElement) => {
    element.focus()
    element.setSelectionRange(0, 5)
  })

  await page.getByRole('button', { name: '選択範囲を翻訳 →' }).click()
  await page.getByRole('textbox', { name: '訳文' }).fill('こんにちは')
  await page.getByRole('button', { name: '訳文を登録 ⌘↵' }).click()

  await expect(page.getByText('こんにちは', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'プロジェクト統計を表示' }).click()
  const dialog = page.getByRole('dialog', { name: '統計' })
  await expect(dialog.getByLabel('翻訳済み 50%')).toBeVisible()
  await expect(dialog.getByText('未翻訳 1語')).toBeVisible()
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
