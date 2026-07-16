import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { IDBFactory } from 'fake-indexeddb'
import App from './App'
import { loadWorkspaceState, saveWorkspaceState } from './services/workspaceStorage'
import { serializeProject } from './services/projectTransfer'
import type { ProjectHistory, WorkspaceState } from './types'

type WorkspaceFixture = Omit<WorkspaceState, 'histories'> & { histories?: Record<string, ProjectHistory> }

const defaultWorkspace: WorkspaceFixture = {
  projects: [{
    id: 'project-1',
    title: 'Project',
    status: '翻訳中',
    source: 'Hello world',
    translations: [{ id: 'translation-1', start: 0, end: 5, source: 'Hello', translated: 'こんにちは' }],
  }],
  activeProjectId: 'project-1',
}

async function renderApp(state: WorkspaceFixture = defaultWorkspace) {
  await saveWorkspaceState({ ...state, histories: state.histories ?? {} })
  const result = render(<App />)
  await screen.findByRole('textbox', { name: '翻訳する原文' })
  return result
}

describe('App translation editing', () => {
  beforeEach(() => {
    localStorage.clear()
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      value: new IDBFactory(),
    })
  })

  test('loads an existing translation into the workspace and updates it', async () => {
    await renderApp()

    fireEvent.click(screen.getByRole('button', { name: 'この対訳を編集' }))
    const translatedText = screen.getByRole('textbox', { name: '訳文' })
    expect(translatedText).toHaveValue('こんにちは')

    fireEvent.change(translatedText, { target: { value: 'やあ' } })
    fireEvent.click(screen.getByRole('button', { name: /訳文を登録/ }))

    expect(screen.getByText('やあ')).toBeInTheDocument()
    expect(screen.queryByText('こんにちは')).not.toBeInTheDocument()
    await waitFor(async () => {
      expect((await loadWorkspaceState()).projects[0].translations[0].translated).toBe('やあ')
    })
  })

  test('automatically edits a translation when the selected range matches exactly', async () => {
    await renderApp()
    const sourceText = screen.getByRole('textbox', { name: '翻訳する原文' }) as HTMLTextAreaElement
    sourceText.setSelectionRange(0, 5)

    fireEvent.click(screen.getByRole('button', { name: /選択範囲を翻訳/ }))

    expect(screen.getByRole('textbox', { name: '訳文' })).toHaveValue('こんにちは')
    expect(screen.getByText('編集中の原文')).toBeInTheDocument()
  })

  test('confirms before discarding a partially overlapping translation', async () => {
    await renderApp()
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

  test('keeps and merges registered translation text for a new overlapping range', async () => {
    await renderApp({
      projects: [{
        id: 'project-1', title: 'Project', status: '翻訳中', source: 'Hello world',
        translations: [
          { id: 'translation-1', start: 0, end: 5, source: 'Hello', translated: 'こんにちは' },
          { id: 'translation-2', start: 6, end: 11, source: 'world', translated: '世界' },
        ],
      }],
      activeProjectId: 'project-1',
    })
    const sourceText = screen.getByRole('textbox', { name: '翻訳する原文' }) as HTMLTextAreaElement
    sourceText.setSelectionRange(0, 11)

    fireEvent.click(screen.getByRole('button', { name: /選択範囲を翻訳/ }))
    fireEvent.click(screen.getByRole('button', { name: '訳文を保持' }))

    expect(screen.getByRole('textbox', { name: '訳文' })).toHaveValue('こんにちは\n\n世界')
    expect(screen.queryByRole('button', { name: 'この対訳を編集' })).not.toBeInTheDocument()
  })

  test('updates the source range in edit mode and discards another overlapping translation after confirmation', async () => {
    await renderApp({
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
    })

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

  test('merges other registered text into the current translation while editing', async () => {
    await renderApp({
      projects: [{
        id: 'project-1', title: 'Project', status: '翻訳中', source: 'Hello world',
        translations: [
          { id: 'translation-1', start: 0, end: 5, source: 'Hello', translated: 'こんにちは' },
          { id: 'translation-2', start: 6, end: 11, source: 'world', translated: '世界' },
        ],
      }],
      activeProjectId: 'project-1',
    })
    fireEvent.click(screen.getAllByRole('button', { name: 'この対訳を編集' })[0])
    const sourceText = screen.getByRole('textbox', { name: '翻訳する原文' }) as HTMLTextAreaElement
    sourceText.setSelectionRange(0, 11)

    fireEvent.click(screen.getByRole('button', { name: /選択範囲を翻訳/ }))
    fireEvent.click(screen.getByRole('button', { name: '訳文を保持' }))

    expect(screen.getByRole('textbox', { name: '訳文' })).toHaveValue('こんにちは\n\n世界')
    const remainingEditButton = screen.getByRole('button', { name: 'この対訳を編集' })
    expect(remainingEditButton.closest('.pair-card')).toHaveTextContent('Hello world')
  })

  test('updates source outside translations without confirmation and preserves translated ranges', async () => {
    await renderApp()
    const sourceText = screen.getByRole('textbox', { name: '翻訳する原文' })

    fireEvent.change(sourceText, { target: { value: 'XHello world' } })

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(sourceText).toHaveValue('XHello world')
    expect(screen.getByRole('button', { name: 'この対訳を編集' }).closest('.pair-card')).toHaveTextContent('Hello')
  })

  test('cancels a source update that would split a registered translation', async () => {
    await renderApp()
    const sourceText = screen.getByRole('textbox', { name: '翻訳する原文' })
    fireEvent.change(sourceText, { target: { value: 'Hallo world' } })

    const dialog = screen.getByRole('alertdialog')
    expect(within(dialog).getByRole('heading', { name: 'この原文の更新は登録済みの対訳に影響します' })).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'キャンセル' }))

    expect(sourceText).toHaveValue('Hello world')
    expect(screen.getByRole('button', { name: 'この対訳を編集' })).toBeInTheDocument()
  })

  test('discards only split translations while preserving unaffected translations', async () => {
    await renderApp({
      projects: [{
        id: 'project-1', title: 'Project', status: '翻訳中', source: 'Hello world',
        translations: [
          { id: 'translation-1', start: 0, end: 5, source: 'Hello', translated: 'こんにちは' },
          { id: 'translation-2', start: 6, end: 11, source: 'world', translated: '世界' },
        ],
      }],
      activeProjectId: 'project-1',
    })
    const sourceText = screen.getByRole('textbox', { name: '翻訳する原文' })
    fireEvent.change(sourceText, { target: { value: 'Hallo world' } })

    const dialog = screen.getByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: '破棄して続ける' }))

    expect(sourceText).toHaveValue('Hallo world')
    const remainingCard = screen.getByRole('button', { name: 'この対訳を編集' }).closest('.pair-card')
    expect(remainingCard).toHaveTextContent('world')
    expect(remainingCard).toHaveTextContent('世界')
  })

  test('keeps translation text while updating its registered source', async () => {
    await renderApp()
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

  test('appends an imported text file while preserving translations', async () => {
    await renderApp()
    const file = new File(['Imported'], 'source.md', { type: 'text/markdown' })
    Object.defineProperty(file, 'text', { value: () => Promise.resolve('Imported') })
    fireEvent.change(screen.getByTestId('source-file-input'), { target: { files: [file] } })

    const dialog = await screen.findByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: '続きとして追加' }))

    expect(screen.getByRole('textbox', { name: '翻訳する原文' })).toHaveValue('Hello world\nImported')
    expect(screen.getByRole('button', { name: 'この対訳を編集' })).toBeInTheDocument()
  })

  test('overwrites source from an imported text file and removes translations', async () => {
    await renderApp()
    const file = new File(['Imported'], 'source.txt', { type: 'text/plain' })
    Object.defineProperty(file, 'text', { value: () => Promise.resolve('Imported') })
    fireEvent.change(screen.getByTestId('source-file-input'), { target: { files: [file] } })

    const dialog = await screen.findByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: '上書き' }))

    expect(screen.getByRole('textbox', { name: '翻訳する原文' })).toHaveValue('Imported')
    expect(screen.queryByRole('button', { name: 'この対訳を編集' })).not.toBeInTheDocument()
  })

  test('imports a complete project after overwrite confirmation', async () => {
    await renderApp()
    const importedProject = {
      id: 'imported', title: 'Imported project', status: '完了' as const, source: 'Imported source',
      translations: [{ id: 'imported-translation', start: 0, end: 8, source: 'Imported', translated: 'インポート済み' }],
    }
    const file = new File([serializeProject(importedProject)], 'project.json', { type: 'application/json' })
    Object.defineProperty(file, 'text', { value: () => Promise.resolve(serializeProject(importedProject)) })
    fireEvent.change(screen.getByTestId('project-file-input'), { target: { files: [file] } })

    const dialog = await screen.findByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: '続ける' }))

    expect(screen.getByRole('heading', { name: 'Imported project' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'プロジェクトステータス' })).toHaveValue('完了')
    expect(screen.getByRole('textbox', { name: '翻訳する原文' })).toHaveValue('Imported source')
    expect(screen.getByText('インポート済み')).toBeInTheDocument()
  })

  test('undoes and redoes a project change', async () => {
    await renderApp()
    const status = screen.getByRole('combobox', { name: 'プロジェクトステータス' })
    const undo = screen.getByRole('button', { name: '変更を元に戻す' })
    const redo = screen.getByRole('button', { name: '変更をやり直す' })
    expect(undo).toBeDisabled()
    expect(redo).toBeDisabled()

    fireEvent.change(status, { target: { value: '完了' } })
    expect(undo).toBeEnabled()
    fireEvent.click(undo)
    expect(status).toHaveValue('翻訳中')
    expect(screen.getByRole('status')).toHaveTextContent('変更を元に戻しました')
    expect(redo).toBeEnabled()

    fireEvent.click(redo)
    expect(status).toHaveValue('完了')
    expect(screen.getByRole('status')).toHaveTextContent('変更をやり直しました')
  })

  test('resets translation editing state when undoing', async () => {
    await renderApp()
    fireEvent.change(screen.getByRole('combobox', { name: 'プロジェクトステータス' }), { target: { value: '完了' } })
    fireEvent.click(screen.getByRole('button', { name: 'この対訳を編集' }))
    expect(screen.getByRole('textbox', { name: '訳文' })).toHaveValue('こんにちは')

    fireEvent.click(screen.getByRole('button', { name: '変更を元に戻す' }))

    expect(screen.queryByRole('textbox', { name: '訳文' })).not.toBeInTheDocument()
    expect(screen.queryByText('編集中の原文')).not.toBeInTheDocument()
  })

  test('groups consecutive source input into one history entry', async () => {
    await renderApp()
    const sourceText = screen.getByRole('textbox', { name: '翻訳する原文' })
    fireEvent.change(sourceText, { target: { value: 'Hello world1' } })
    fireEvent.change(sourceText, { target: { value: 'Hello world12' } })

    fireEvent.click(screen.getByRole('button', { name: '変更を元に戻す' }))

    expect(sourceText).toHaveValue('Hello world')
    expect(screen.getByRole('button', { name: '変更を元に戻す' })).toBeDisabled()
  })

  test('starts a new source history entry after 800 milliseconds', async () => {
    await renderApp()
    jest.useFakeTimers()
    try {
      const sourceText = screen.getByRole('textbox', { name: '翻訳する原文' })
      fireEvent.change(sourceText, { target: { value: 'Hello world1' } })
      act(() => { jest.advanceTimersByTime(800) })
      fireEvent.change(sourceText, { target: { value: 'Hello world12' } })

      fireEvent.click(screen.getByRole('button', { name: '変更を元に戻す' }))

      expect(sourceText).toHaveValue('Hello world1')
      expect(screen.getByRole('button', { name: '変更を元に戻す' })).toBeEnabled()
    } finally {
      jest.useRealTimers()
    }
  })

  test('ends a source history entry when the source field loses focus', async () => {
    await renderApp()
    const sourceText = screen.getByRole('textbox', { name: '翻訳する原文' })
    fireEvent.change(sourceText, { target: { value: 'Hello world1' } })
    fireEvent.blur(sourceText)
    fireEvent.change(sourceText, { target: { value: 'Hello world12' } })

    fireEvent.click(screen.getByRole('button', { name: '変更を元に戻す' }))

    expect(sourceText).toHaveValue('Hello world1')
  })

  test('does not record a canceled source update', async () => {
    await renderApp()
    fireEvent.change(screen.getByRole('textbox', { name: '翻訳する原文' }), { target: { value: 'Hallo world' } })
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'キャンセル' }))
    expect(screen.getByRole('button', { name: '変更を元に戻す' })).toBeDisabled()
  })

  test('restores persisted history after reloading the app', async () => {
    const firstRender = await renderApp()
    fireEvent.change(screen.getByRole('combobox', { name: 'プロジェクトステータス' }), { target: { value: '完了' } })
    await waitFor(async () => {
      expect((await loadWorkspaceState()).histories['project-1'].past).toHaveLength(1)
    })
    firstRender.unmount()

    render(<App />)
    await screen.findByRole('textbox', { name: '翻訳する原文' })
    fireEvent.click(screen.getByRole('button', { name: '変更を元に戻す' }))
    expect(screen.getByRole('combobox', { name: 'プロジェクトステータス' })).toHaveValue('翻訳中')
  })

  test('restores persisted redo history after reloading the app', async () => {
    const firstRender = await renderApp()
    fireEvent.change(screen.getByRole('combobox', { name: 'プロジェクトステータス' }), { target: { value: '完了' } })
    fireEvent.click(screen.getByRole('button', { name: '変更を元に戻す' }))
    await waitFor(async () => {
      expect((await loadWorkspaceState()).histories['project-1'].future).toHaveLength(1)
    })
    firstRender.unmount()

    render(<App />)
    await screen.findByRole('textbox', { name: '翻訳する原文' })
    const redo = screen.getByRole('button', { name: '変更をやり直す' })
    expect(redo).toBeEnabled()
    fireEvent.click(redo)
    expect(screen.getByRole('combobox', { name: 'プロジェクトステータス' })).toHaveValue('完了')
  })

  test('removes project history when deleting the project', async () => {
    await renderApp()
    fireEvent.change(screen.getByRole('combobox', { name: 'プロジェクトステータス' }), { target: { value: '完了' } })
    await waitFor(async () => {
      expect((await loadWorkspaceState()).histories['project-1'].past).toHaveLength(1)
    })
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true)

    fireEvent.click(screen.getByRole('button', { name: '「Project」を削除' }))

    await waitFor(async () => {
      expect(await loadWorkspaceState()).toMatchObject({ projects: [], histories: {} })
    })
    confirm.mockRestore()
  })

  test('does not show the removed local save indicator', async () => {
    await renderApp()
    expect(screen.queryByText('端末内に保存')).not.toBeInTheDocument()
  })
})
