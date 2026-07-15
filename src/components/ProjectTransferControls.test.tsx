import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ProjectTransferControls, type TransferActions } from './ProjectTransferControls'

function createActions(): jest.Mocked<TransferActions> {
  return {
    importSource: jest.fn(),
    importProject: jest.fn(),
    exportProject: jest.fn(),
    exportTranslations: jest.fn(),
    exportParallelText: jest.fn(),
  }
}

describe('ProjectTransferControls', () => {
  test('reads supported source and project files', async () => {
    const actions = createActions()
    render(<ProjectTransferControls actions={actions} disabled={false} />)
    const sourceFile = new File(['Source'], 'source.md', { type: 'text/markdown' })
    const projectFile = new File(['{}'], 'project.json', { type: 'application/json' })
    Object.defineProperty(sourceFile, 'text', { value: () => Promise.resolve('Source') })
    Object.defineProperty(projectFile, 'text', { value: () => Promise.resolve('{}') })

    fireEvent.change(screen.getByTestId('source-file-input'), { target: { files: [sourceFile] } })
    fireEvent.change(screen.getByTestId('project-file-input'), { target: { files: [projectFile] } })

    await waitFor(() => expect(actions.importSource).toHaveBeenCalledWith('Source'))
    expect(actions.importProject).toHaveBeenCalledWith('{}')
  })

  test.each([
    ['プロジェクトをエクスポート', 'exportProject'],
    ['訳文をエクスポート', 'exportTranslations'],
    ['対訳をテキストでエクスポート', 'exportParallelText'],
  ] as const)('runs %s from the export menu', (label, actionName) => {
    const actions = createActions()
    render(<ProjectTransferControls actions={actions} disabled={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'エクスポート' }))
    fireEvent.click(screen.getByRole('menuitem', { name: label }))
    expect(actions[actionName]).toHaveBeenCalledTimes(1)
  })
})
