import { fireEvent, render, screen } from '@testing-library/react'
import { Reader } from './Reader'

describe('Reader', () => {
  test('shows the empty state and returns to editing', () => {
    const onEdit = jest.fn()
    render(<Reader title="Project" source="Hello" translations={[]} originalLanguage="ENGLISH" translatedLanguage="JAPANESE" onEdit={onEdit} />)

    expect(screen.getByRole('heading', { name: 'まだ対訳がありません。' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /編集へ戻る/ }))
    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  test('renders original, translation, and untranslated text', () => {
    render(
      <Reader
        title="Project"
        source="Hello world"
        translations={[{ id: 't1', start: 0, end: 5, source: 'Hello', translated: 'こんにちは' }]}
        originalLanguage="FRENCH"
        translatedLanguage="KOREAN"
        onEdit={jest.fn()}
      />,
    )

    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('こんにちは')).toBeInTheDocument()
    expect(screen.getByText('world')).toBeInTheDocument()
    expect(screen.getByText('ORIGINAL · FRENCH')).toBeInTheDocument()
    expect(screen.getByText('TRANSLATION · KOREAN')).toBeInTheDocument()
  })
})
