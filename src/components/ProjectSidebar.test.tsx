import { fireEvent, render, screen } from '@testing-library/react'
import { ProjectSidebar } from './ProjectSidebar'

describe('ProjectSidebar', () => {
  test('shows the project status opposite its title', () => {
    render(
      <ProjectSidebar
        projects={[{ id: 'project-1', title: 'Alice', author: '', sourceUrl: '', originalLanguage: 'ENGLISH', translatedLanguage: 'JAPANESE', status: '翻訳中', source: 'Text', translations: [], keywords: [], updatedAt: '2026-07-16T01:00:00.000Z' }]}
        open
        sidebarRef={null}
        activeProjectId="project-1"
        onSelect={jest.fn()}
        onAdd={jest.fn()}
        onRename={jest.fn()}
        onDelete={jest.fn()}
      />,
    )

    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('翻訳中')).toHaveClass('project-status')
  })

  test('creates a project immediately from the add button', () => {
    const onAdd = jest.fn()
    render(
      <ProjectSidebar
        projects={[]}
        open
        sidebarRef={null}
        activeProjectId={null}
        onSelect={jest.fn()}
        onAdd={onAdd}
        onRename={jest.fn()}
        onDelete={jest.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '新しいプロジェクトを作成' }))
    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(screen.queryByLabelText('新しいプロジェクト名')).not.toBeInTheDocument()
  })
})
