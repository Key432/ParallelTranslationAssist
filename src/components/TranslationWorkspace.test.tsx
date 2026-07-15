import { createRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { TranslationWorkspace } from './TranslationWorkspace'

describe('TranslationWorkspace', () => {
  test('shows the project title and changes its status', () => {
    const onStatusChange = jest.fn()
    render(
      <TranslationWorkspace
        title="文学作品A"
        status="翻訳中"
        source="Source"
        translations={[]}
        selection={null}
        draft=""
        sourceRef={createRef<HTMLTextAreaElement>()}
        translationRef={createRef<HTMLTextAreaElement>()}
        onSourceChange={jest.fn()}
        onStatusChange={onStatusChange}
        onCaptureSelection={jest.fn()}
        onDraftChange={jest.fn()}
        onSaveTranslation={jest.fn()}
        onCancelSelection={jest.fn()}
        onDeleteTranslation={jest.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: '文学作品A' })).toBeInTheDocument()
    const status = screen.getByRole('combobox', { name: 'プロジェクトステータス' })
    expect(status).toHaveValue('翻訳中')
    fireEvent.change(status, { target: { value: '初稿完了' } })
    expect(onStatusChange).toHaveBeenCalledWith('初稿完了')
  })
})
