import { fireEvent, render, screen, within } from '@testing-library/react'
import { RegisteredTranslations } from './RegisteredTranslations'

const translations = [
  { id: 'hello', start: 0, end: 9, source: '**Hello**', translated: 'こんにちは' },
  { id: 'world', start: 6, end: 11, source: 'world', translated: '世界' },
  { id: 'hello-again', start: 12, end: 23, source: 'Hello again', translated: 'また会いました' },
]

function renderList() {
  return render(
    <RegisteredTranslations
      translations={translations}
      originalLanguage="ENGLISH"
      translatedLanguage="JAPANESE"
      editingTranslationId={null}
      onEditTranslation={jest.fn()}
      onDeleteTranslation={jest.fn()}
    />,
  )
}

describe('RegisteredTranslations', () => {
  test('renders markup in registered source text', () => {
    renderList()
    expect(screen.getByText('Hello').tagName).toBe('STRONG')
    expect(screen.queryByText('**Hello**')).not.toBeInTheDocument()
  })

  test('labels edit and delete icon buttons with hover explanations', () => {
    renderList()
    expect(within(screen.getAllByRole('button', { name: 'この対訳を編集' })[0]).getByRole('tooltip')).toHaveTextContent('編集')
    expect(within(screen.getAllByRole('button', { name: 'この対訳を削除' })[0]).getByRole('tooltip')).toHaveTextContent('削除')
  })

  test('applies, updates, and clears a source filter', () => {
    const { container } = renderList()
    const search = screen.getByRole('textbox', { name: '検索文字列' })
    fireEvent.change(search, { target: { value: 'Hello' } })
    fireEvent.click(screen.getByRole('button', { name: 'フィルター' }))
    expect(container.querySelectorAll('.pair-card')).toHaveLength(2)
    expect(screen.getByText('原文「Hello」: 2 / 3 件')).toBeInTheDocument()

    fireEvent.change(search, { target: { value: 'world' } })
    expect(container.querySelectorAll('.pair-card')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'フィルター' }))
    expect(container.querySelectorAll('.pair-card')).toHaveLength(1)
    expect(screen.getByText('world', { exact: true })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '解除' }))
    expect(search).toHaveValue('')
    expect(container.querySelectorAll('.pair-card')).toHaveLength(3)
    expect(screen.queryByRole('button', { name: '解除' })).not.toBeInTheDocument()
  })

  test('filters translated text and reports an empty result', () => {
    const { container } = renderList()
    fireEvent.click(screen.getByRole('button', { name: '訳文' }))
    expect(screen.getByRole('button', { name: '訳文' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.change(screen.getByRole('textbox', { name: '検索文字列' }), { target: { value: '世界' } })
    fireEvent.click(screen.getByRole('button', { name: 'フィルター' }))
    expect(container.querySelectorAll('.pair-card')).toHaveLength(1)
    expect(screen.getByText('訳文「世界」: 1 / 3 件')).toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: '検索文字列' }), { target: { value: '該当なし' } })
    fireEvent.click(screen.getByRole('button', { name: 'フィルター' }))
    expect(screen.getByText('条件に一致する対訳はありません。')).toBeInTheDocument()
  })
})
