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
        source: 'Hello',
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
})
