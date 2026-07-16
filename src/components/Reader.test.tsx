import { fireEvent, render, screen } from '@testing-library/react'
import { Reader } from './Reader'

describe('Reader', () => {
  test('shows the empty state and returns to editing', () => {
    const onEdit = jest.fn()
    render(<Reader title="Project" author="" sourceUrl="" source="Hello" translations={[]} originalLanguage="ENGLISH" translatedLanguage="JAPANESE" onEdit={onEdit} />)

    expect(screen.getByRole('heading', { name: 'まだ対訳がありません。' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /編集へ戻る/ }))
    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  test('renders original, translation, and untranslated text', () => {
    render(
      <Reader
        title="Project"
        author="Author Name"
        sourceUrl="https://example.com/source"
        source="Hello world"
        translations={[{ id: 't1', start: 0, end: 5, source: 'Hello', translated: '**こんにちは**' }]}
        originalLanguage="FRENCH"
        translatedLanguage="KOREAN"
        onEdit={jest.fn()}
      />,
    )

    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('こんにちは').tagName).toBe('STRONG')
    expect(screen.getByText('world')).toBeInTheDocument()
    expect(screen.getByText('ORIGINAL · FRENCH')).toBeInTheDocument()
    expect(screen.getByText('TRANSLATION · KOREAN')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Project' })).toBeInTheDocument()
    expect(screen.getByText('原文と訳文')).toHaveClass('project-kicker')
    expect(screen.getByText('by Author Name')).toHaveClass('project-author')
    expect(screen.getByRole('link', { name: '🔗 Source' })).toHaveAttribute('href', 'https://example.com/source')
    expect(screen.getByText('1 件の訳文 · 未訳部分も原文の流れに沿って表示')).toHaveClass('reader-summary')
    expect(screen.queryByRole('button', { name: 'タイトルを編集: Project' })).not.toBeInTheDocument()
  })
})
