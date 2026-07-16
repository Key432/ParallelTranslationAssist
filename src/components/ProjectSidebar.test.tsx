import { fireEvent, render, screen } from '@testing-library/react'
import { ProjectSidebar } from './ProjectSidebar'

describe('ProjectSidebar', () => {
  test('shows the project status opposite its title', () => {
    render(
      <ProjectSidebar
        projects={[{ id: 'project-1', title: 'Alice', status: '翻訳中', source: 'Text', translations: [], updatedAt: '2026-07-16T01:00:00.000Z' }]}
        open
        sidebarRef={null}
        activeProjectId="project-1"
        creating={false}
        onCreatingChange={jest.fn()}
        onSelect={jest.fn()}
        onAdd={jest.fn()}
        onRename={jest.fn()}
        onDelete={jest.fn()}
      />,
    )

    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('翻訳中')).toHaveClass('project-status')
  })

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
