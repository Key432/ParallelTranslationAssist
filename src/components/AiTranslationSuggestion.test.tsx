import { fireEvent, render, screen } from '@testing-library/react'
import { AiTranslationButton, AiTranslationSuggestion } from './AiTranslationSuggestion'

test('explains that an API key is required when none is configured', () => {
  render(<AiTranslationButton loading={false} error="" canGenerate={false} hasApiKey={false} onGenerate={jest.fn()} />)
  expect(screen.getByText('APIキーを設定して使用')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'AIで下訳を作成' })).toBeDisabled()
})

test('allows the footer AI button to retry after an error', () => {
  const onGenerate = jest.fn()
  render(<AiTranslationButton loading={false} error="選択範囲が長すぎます。" canGenerate hasApiKey onGenerate={onGenerate} />)
  expect(screen.getByText('AI翻訳を再試行')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'AIで下訳を作成' }))
  expect(onGenerate).toHaveBeenCalledTimes(1)
})

test('keeps the request cancel action in the suggestion area', () => {
  const onCancel = jest.fn()
  render(<AiTranslationSuggestion loading suggestion={null} error="" onCancel={onCancel} onApply={jest.fn()} onRegenerate={jest.fn()} onClose={jest.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }))
  expect(onCancel).toHaveBeenCalledTimes(1)
})
