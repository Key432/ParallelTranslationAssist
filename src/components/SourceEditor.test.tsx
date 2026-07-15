import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
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
})
