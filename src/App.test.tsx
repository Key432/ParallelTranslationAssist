import { fireEvent, render, screen, within } from '@testing-library/react'
import App from './App'
import { STORAGE_KEY } from './services/workspaceStorage'

describe('App translation editing', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      projects: [{
        id: 'project-1',
        title: 'Project',
        status: '翻訳中',
        source: 'Hello world',
        translations: [{ id: 'translation-1', start: 0, end: 5, source: 'Hello', translated: 'こんにちは' }],
      }],
      activeProjectId: 'project-1',
    }))
  })

  test('loads an existing translation into the workspace and updates it', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'この対訳を編集' }))
    const translatedText = screen.getByRole('textbox', { name: '訳文' })
    expect(translatedText).toHaveValue('こんにちは')

    fireEvent.change(translatedText, { target: { value: 'やあ' } })
    fireEvent.click(screen.getByRole('button', { name: /訳文を登録/ }))

    expect(screen.getByText('やあ')).toBeInTheDocument()
    expect(screen.queryByText('こんにちは')).not.toBeInTheDocument()
  })

  test('automatically edits a translation when the selected range matches exactly', () => {
    render(<App />)
    const sourceText = screen.getByRole('textbox', { name: '翻訳する原文' }) as HTMLTextAreaElement
    sourceText.setSelectionRange(0, 5)

    fireEvent.click(screen.getByRole('button', { name: /選択範囲を翻訳/ }))

    expect(screen.getByRole('textbox', { name: '訳文' })).toHaveValue('こんにちは')
    expect(screen.getByText('編集中の原文')).toBeInTheDocument()
  })

  test('confirms before discarding a partially overlapping translation', () => {
    render(<App />)
    const sourceText = screen.getByRole('textbox', { name: '翻訳する原文' }) as HTMLTextAreaElement
    sourceText.setSelectionRange(0, 6)

    fireEvent.click(screen.getByRole('button', { name: /選択範囲を翻訳/ }))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'この対訳を編集' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /選択範囲を翻訳/ }))
    fireEvent.click(screen.getByRole('button', { name: '破棄して続ける' }))
    expect(screen.queryByRole('button', { name: 'この対訳を編集' })).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: '訳文' })).toHaveValue('')
  })

  test('keeps and merges registered translation text for a new overlapping range', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      projects: [{
        id: 'project-1', title: 'Project', status: '翻訳中', source: 'Hello world',
        translations: [
          { id: 'translation-1', start: 0, end: 5, source: 'Hello', translated: 'こんにちは' },
          { id: 'translation-2', start: 6, end: 11, source: 'world', translated: '世界' },
        ],
      }],
      activeProjectId: 'project-1',
    }))
    render(<App />)
    const sourceText = screen.getByRole('textbox', { name: '翻訳する原文' }) as HTMLTextAreaElement
    sourceText.setSelectionRange(0, 11)

    fireEvent.click(screen.getByRole('button', { name: /選択範囲を翻訳/ }))
    fireEvent.click(screen.getByRole('button', { name: '訳文を保持' }))

    expect(screen.getByRole('textbox', { name: '訳文' })).toHaveValue('こんにちは\n\n世界')
    expect(screen.queryByRole('button', { name: 'この対訳を編集' })).not.toBeInTheDocument()
  })

  test('updates the source range in edit mode and discards another overlapping translation after confirmation', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      projects: [{
        id: 'project-1',
        title: 'Project',
        status: '翻訳中',
        source: 'Hello world',
        translations: [
          { id: 'translation-1', start: 0, end: 5, source: 'Hello', translated: 'こんにちは' },
          { id: 'translation-2', start: 6, end: 11, source: 'world', translated: '世界' },
        ],
      }],
      activeProjectId: 'project-1',
    }))
    render(<App />)

    const editButtons = screen.getAllByRole('button', { name: 'この対訳を編集' })
    fireEvent.click(editButtons[0])
    const sourceText = screen.getByRole('textbox', { name: '翻訳する原文' }) as HTMLTextAreaElement
    sourceText.setSelectionRange(6, 11)
    fireEvent.click(screen.getByRole('button', { name: /選択範囲を翻訳/ }))

    const discardDialog = screen.getByRole('alertdialog')
    expect(discardDialog).toBeInTheDocument()
    fireEvent.click(within(discardDialog).getByRole('button', { name: 'キャンセル' }))
    expect(screen.getAllByRole('button', { name: 'この対訳を編集' })).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: /選択範囲を翻訳/ }))
    fireEvent.click(screen.getByRole('button', { name: '破棄して続ける' }))

    const remainingEditButton = screen.getByRole('button', { name: 'この対訳を編集' })
    expect(remainingEditButton.closest('.pair-card')).toHaveTextContent('world')
    expect(remainingEditButton.closest('.pair-card')).toHaveTextContent('こんにちは')
    expect(screen.queryByText('世界')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: '訳文' })).toHaveValue('こんにちは')
  })

  test('merges other registered text into the current translation while editing', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      projects: [{
        id: 'project-1', title: 'Project', status: '翻訳中', source: 'Hello world',
        translations: [
          { id: 'translation-1', start: 0, end: 5, source: 'Hello', translated: 'こんにちは' },
          { id: 'translation-2', start: 6, end: 11, source: 'world', translated: '世界' },
        ],
      }],
      activeProjectId: 'project-1',
    }))
    render(<App />)
    fireEvent.click(screen.getAllByRole('button', { name: 'この対訳を編集' })[0])
    const sourceText = screen.getByRole('textbox', { name: '翻訳する原文' }) as HTMLTextAreaElement
    sourceText.setSelectionRange(0, 11)

    fireEvent.click(screen.getByRole('button', { name: /選択範囲を翻訳/ }))
    fireEvent.click(screen.getByRole('button', { name: '訳文を保持' }))

    expect(screen.getByRole('textbox', { name: '訳文' })).toHaveValue('こんにちは\n\n世界')
    const remainingEditButton = screen.getByRole('button', { name: 'この対訳を編集' })
    expect(remainingEditButton.closest('.pair-card')).toHaveTextContent('Hello world')
  })

  test('updates source outside translations without confirmation and preserves translated ranges', () => {
    render(<App />)
    const sourceText = screen.getByRole('textbox', { name: '翻訳する原文' })

    fireEvent.change(sourceText, { target: { value: 'XHello world' } })

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(sourceText).toHaveValue('XHello world')
    expect(screen.getByRole('button', { name: 'この対訳を編集' }).closest('.pair-card')).toHaveTextContent('Hello')
  })

  test('cancels a source update that would split a registered translation', () => {
    render(<App />)
    const sourceText = screen.getByRole('textbox', { name: '翻訳する原文' })
    fireEvent.change(sourceText, { target: { value: 'Hallo world' } })

    const dialog = screen.getByRole('alertdialog')
    expect(within(dialog).getByRole('heading', { name: '原文の更新により対訳が分断されます' })).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'キャンセル' }))

    expect(sourceText).toHaveValue('Hello world')
    expect(screen.getByRole('button', { name: 'この対訳を編集' })).toBeInTheDocument()
  })

  test('discards only split translations while preserving unaffected translations', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      projects: [{
        id: 'project-1', title: 'Project', status: '翻訳中', source: 'Hello world',
        translations: [
          { id: 'translation-1', start: 0, end: 5, source: 'Hello', translated: 'こんにちは' },
          { id: 'translation-2', start: 6, end: 11, source: 'world', translated: '世界' },
        ],
      }],
      activeProjectId: 'project-1',
    }))
    render(<App />)
    const sourceText = screen.getByRole('textbox', { name: '翻訳する原文' })
    fireEvent.change(sourceText, { target: { value: 'Hallo world' } })

    const dialog = screen.getByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: '破棄して続ける' }))

    expect(sourceText).toHaveValue('Hallo world')
    const remainingCard = screen.getByRole('button', { name: 'この対訳を編集' }).closest('.pair-card')
    expect(remainingCard).toHaveTextContent('world')
    expect(remainingCard).toHaveTextContent('世界')
  })

  test('keeps translation text while updating its registered source', () => {
    render(<App />)
    const sourceText = screen.getByRole('textbox', { name: '翻訳する原文' })
    fireEvent.change(sourceText, { target: { value: 'Hallo world' } })

    const dialog = screen.getByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: '訳文を保持' }))

    expect(sourceText).toHaveValue('Hallo world')
    const keptCard = screen.getByRole('button', { name: 'この対訳を編集' }).closest('.pair-card')
    expect(keptCard).toHaveTextContent('Hallo')
    expect(keptCard).toHaveTextContent('こんにちは')

    fireEvent.change(sourceText, { target: { value: 'Hullo world' } })
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(keptCard).toHaveTextContent('Hullo')
  })
})
