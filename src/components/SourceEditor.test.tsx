import { createRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { SourceEditor } from './SourceEditor'

describe('SourceEditor', () => {
  test('highlights only source ranges with registered translations', () => {
    const { container, rerender } = render(
      <SourceEditor
        source="Hello world"
        translations={[{ id: 't1', start: 0, end: 5, source: 'Hello', translated: 'こんにちは' }]}
        sourceRef={createRef<HTMLTextAreaElement>()}
        onSourceChange={jest.fn()}
      />,
    )

    expect(container.querySelector('.translated-source')).toHaveTextContent('Hello')
    expect(screen.getByLabelText('翻訳する原文')).toHaveValue('Hello world')

    rerender(
      <SourceEditor
        source="Hello world"
        translations={[]}
        sourceRef={createRef<HTMLTextAreaElement>()}
        onSourceChange={jest.fn()}
      />,
    )
    expect(container.querySelector('.translated-source')).not.toBeInTheDocument()
  })

  test('mirrors a trailing newline with one extra newline for caret alignment', () => {
    const { container, rerender } = render(
      <SourceEditor
        source={'Hello\n'}
        translations={[]}
        sourceRef={createRef<HTMLTextAreaElement>()}
        onSourceChange={jest.fn()}
      />,
    )

    expect(container.querySelector('.source-highlight-content')).toHaveTextContent('Hello', { normalizeWhitespace: false })
    expect(container.querySelector('.source-highlight-content')?.textContent).toBe('Hello\n\n')

    rerender(
      <SourceEditor
        source="Hello"
        translations={[]}
        sourceRef={createRef<HTMLTextAreaElement>()}
        onSourceChange={jest.fn()}
      />,
    )
    expect(container.querySelector('.source-highlight-content')?.textContent).toBe('Hello')
  })

  test('draws a border marker around the active source selection', () => {
    const { container } = render(
      <SourceEditor
        source="Hello world"
        translations={[]}
        selection={{ start: 0, end: 5, text: 'Hello' }}
        sourceRef={createRef<HTMLTextAreaElement>()}
        onSourceChange={jest.fn()}
      />,
    )

    expect(container.querySelector('.selected-source-range')).toHaveTextContent('Hello')
  })

  test('marks matching registered keywords and exposes their translation', () => {
    const { container } = render(
      <SourceEditor
        source="A cat and a concatenate"
        translations={[]}
        keywords={[{ id: 'cat', source: 'cat', translated: '猫' }]}
        sourceRef={createRef<HTMLTextAreaElement>()}
        onSourceChange={jest.fn()}
      />,
    )

    const keyword = container.querySelector('.keyword-source')
    expect(keyword).toHaveTextContent('cat')
    expect(keyword).toHaveAttribute('title', '猫')
    expect(container.querySelectorAll('.keyword-source')).toHaveLength(1)
  })

  test('reports the caret position after a source edit', () => {
    const onSourceChange = jest.fn()
    render(
      <SourceEditor
        source="Hello"
        translations={[]}
        sourceRef={createRef<HTMLTextAreaElement>()}
        onSourceChange={onSourceChange}
      />,
    )

    fireEvent.change(screen.getByLabelText('翻訳する原文'), {
      target: { value: 'Hello!', selectionStart: 6, selectionEnd: 6 },
    })

    expect(onSourceChange).toHaveBeenCalledWith('Hello!', { start: 6, end: 6 })
  })
})
