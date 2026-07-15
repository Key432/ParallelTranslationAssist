import { fireEvent, render, screen } from '@testing-library/react'
import { ProjectSidebar } from './ProjectSidebar'

describe('ProjectSidebar', () => {
  test('creates a project with a trimmed title', () => {
    const onAdd = jest.fn()
    render(
      <ProjectSidebar
        projects={[]}
        open
        sidebarRef={null}
        activeProjectId={null}
        creating
        onCreatingChange={jest.fn()}
        onSelect={jest.fn()}
        onAdd={onAdd}
        onRename={jest.fn()}
        onDelete={jest.fn()}
      />,
    )

    fireEvent.change(screen.getByLabelText('新しいプロジェクト名'), { target: { value: '  新規翻訳  ' } })
    fireEvent.click(screen.getByRole('button', { name: '作成' }))
    expect(onAdd).toHaveBeenCalledWith('新規翻訳')
  })
})
