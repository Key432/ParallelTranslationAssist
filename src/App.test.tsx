import { fireEvent, render, screen } from '@testing-library/react'
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
})
