import { createRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { TranslationWorkspace } from './TranslationWorkspace'

const informationProps = {
  author: '',
  sourceUrl: '',
  originalLanguage: 'ENGLISH' as const,
  translatedLanguage: 'JAPANESE' as const,
  keywords: [],
  onAddKeyword: jest.fn(),
  onUpdateKeyword: jest.fn(),
  onDeleteKeyword: jest.fn(),
}

describe('TranslationWorkspace', () => {
  test('shows the project title and changes its status', () => {
    const onStatusChange = jest.fn()
    const onOpenStatistics = jest.fn()
    const onOpenInformation = jest.fn()
    render(
      <TranslationWorkspace
        title="文学作品A"
        {...informationProps}
        status="翻訳中"
        source="Source"
        translations={[]}
        selection={null}
        editingTranslationId={null}
        draft=""
        sourceRef={createRef<HTMLTextAreaElement>()}
        translationRef={createRef<HTMLTextAreaElement>()}
        onSourceChange={jest.fn()}
        onStatusChange={onStatusChange}
        canUndo={false}
        canRedo={false}
        onUndo={jest.fn()}
        onRedo={jest.fn()}
        onOpenStatistics={onOpenStatistics}
        onOpenInformation={onOpenInformation}
        onCaptureSelection={jest.fn()}
        onDraftChange={jest.fn()}
        onSaveTranslation={jest.fn()}
        onCancelSelection={jest.fn()}
        onEditTranslation={jest.fn()}
        onDeleteTranslation={jest.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: '文学作品A' })).toBeInTheDocument()
    const status = screen.getByRole('combobox', { name: 'プロジェクトステータス' })
    expect(status).toHaveValue('翻訳中')
    fireEvent.change(status, { target: { value: '初稿完了' } })
    expect(onStatusChange).toHaveBeenCalledWith('初稿完了')
    fireEvent.click(screen.getByRole('button', { name: 'プロジェクト統計を表示' }))
    expect(onOpenStatistics).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'プロジェクト情報を表示' }))
    expect(onOpenInformation).toHaveBeenCalledWith()
    fireEvent.click(screen.getByRole('button', { name: 'タイトルを編集: 文学作品A' }))
    expect(onOpenInformation).toHaveBeenCalledWith(true)
    expect(screen.queryByText(/原文から一文/)).not.toBeInTheDocument()
  })

  test('starts editing an existing translation from its edit button', () => {
    const onEditTranslation = jest.fn()
    const translation = { id: 't1', start: 0, end: 6, source: 'Source', translated: '訳文' }
    const { rerender } = render(
      <TranslationWorkspace
        title="Project"
        {...informationProps}
        status="翻訳中"
        source="Source"
        translations={[translation]}
        selection={null}
        editingTranslationId={null}
        draft=""
        sourceRef={createRef<HTMLTextAreaElement>()}
        translationRef={createRef<HTMLTextAreaElement>()}
        onSourceChange={jest.fn()}
        onStatusChange={jest.fn()}
        canUndo={false}
        canRedo={false}
        onUndo={jest.fn()}
        onRedo={jest.fn()}
        onOpenStatistics={jest.fn()}
        onOpenInformation={jest.fn()}
        onCaptureSelection={jest.fn()}
        onDraftChange={jest.fn()}
        onSaveTranslation={jest.fn()}
        onCancelSelection={jest.fn()}
        onEditTranslation={onEditTranslation}
        onDeleteTranslation={jest.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'この対訳を編集' }))
    expect(onEditTranslation).toHaveBeenCalledWith('t1')

    rerender(
      <TranslationWorkspace
        title="Project"
        {...informationProps}
        status="翻訳中"
        source="Source"
        translations={[translation]}
        selection={{ start: 0, end: 6, text: 'Source' }}
        editingTranslationId="t1"
        draft="訳文"
        sourceRef={createRef<HTMLTextAreaElement>()}
        translationRef={createRef<HTMLTextAreaElement>()}
        onSourceChange={jest.fn()}
        onStatusChange={jest.fn()}
        canUndo={false}
        canRedo={false}
        onUndo={jest.fn()}
        onRedo={jest.fn()}
        onOpenStatistics={jest.fn()}
        onOpenInformation={jest.fn()}
        onCaptureSelection={jest.fn()}
        onDraftChange={jest.fn()}
        onSaveTranslation={jest.fn()}
        onCancelSelection={jest.fn()}
        onEditTranslation={onEditTranslation}
        onDeleteTranslation={jest.fn()}
      />,
    )
    expect(screen.getByText('編集中の原文')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'この対訳を編集' }).closest('.pair-card')).toHaveClass('editing')
  })

  test('renders translation markup and opens its notation help', () => {
    render(
      <TranslationWorkspace
        title="Project"
        {...informationProps}
        status="翻訳中"
        source="Source"
        translations={[{ id: 't1', start: 0, end: 6, source: 'Source', translated: '**太字**と｜漢字《かんじ》' }]}
        selection={null}
        editingTranslationId={null}
        draft=""
        sourceRef={createRef<HTMLTextAreaElement>()}
        translationRef={createRef<HTMLTextAreaElement>()}
        onSourceChange={jest.fn()}
        onStatusChange={jest.fn()}
        canUndo={false}
        canRedo={false}
        onUndo={jest.fn()}
        onRedo={jest.fn()}
        onOpenStatistics={jest.fn()}
        onOpenInformation={jest.fn()}
        onCaptureSelection={jest.fn()}
        onDraftChange={jest.fn()}
        onSaveTranslation={jest.fn()}
        onCancelSelection={jest.fn()}
        onEditTranslation={jest.fn()}
        onDeleteTranslation={jest.fn()}
      />,
    )

    expect(screen.getByText('太字').tagName).toBe('STRONG')
    expect(screen.getByText('かんじ').tagName).toBe('RT')

    fireEvent.click(screen.getByRole('button', { name: '訳文の記法を確認' }))
    expect(screen.getByRole('dialog', { name: '訳文の記法' })).toBeInTheDocument()
    expect(screen.getByText('下線', { selector: 'dt' })).toBeInTheDocument()
    expect(screen.getByText('|漢字《かんじ》', { selector: 'code' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '訳文の記法を閉じる' }))
    expect(screen.queryByRole('dialog', { name: '訳文の記法' })).not.toBeInTheDocument()
  })
})
