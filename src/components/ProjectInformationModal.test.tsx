import { fireEvent, render, screen } from '@testing-library/react'
import { ProjectInformationModal } from './ProjectInformationModal'
import type { Project } from '../types'

const project: Project = {
  id: 'project-1',
  title: 'Alice',
  author: 'Lewis Carroll',
  sourceUrl: 'https://example.com/alice',
  originalLanguage: 'ENGLISH',
  translatedLanguage: 'JAPANESE',
  status: '翻訳中',
  source: 'Alice was beginning...',
  translations: [],
  keywords: [],
  updatedAt: '2026-07-16T01:00:00.000Z',
}

describe('ProjectInformationModal', () => {
  test('loads and saves all project information', () => {
    const onSave = jest.fn()
    render(<ProjectInformationModal project={project} onClose={jest.fn()} onSave={onSave} />)

    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'Alice in Wonderland' } })
    fireEvent.change(screen.getByLabelText(/Author/), { target: { value: '  Carroll  ' } })
    fireEvent.change(screen.getByLabelText(/Source/), { target: { value: 'https://example.com/book' } })
    fireEvent.change(screen.getByLabelText('Original Language'), { target: { value: 'FRENCH' } })
    fireEvent.change(screen.getByLabelText('Translated Language'), { target: { value: 'KOREAN' } })
    fireEvent.click(screen.getByRole('button', { name: '情報を保存' }))

    expect(onSave).toHaveBeenCalledWith({
      title: 'Alice in Wonderland',
      author: 'Carroll',
      sourceUrl: 'https://example.com/book',
      originalLanguage: 'FRENCH',
      translatedLanguage: 'KOREAN',
    })
  })

  test('does not allow an empty title and permits empty optional fields', () => {
    const onSave = jest.fn()
    render(<ProjectInformationModal project={project} onClose={jest.fn()} onSave={onSave} />)

    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: '   ' } })
    expect(screen.getByRole('button', { name: '情報を保存' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'Alice' } })
    fireEvent.change(screen.getByLabelText(/Author/), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText(/Source/), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: '情報を保存' }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ author: '', sourceUrl: '' }))
  })

  test('focuses the title when opened from the workspace title', () => {
    render(<ProjectInformationModal project={project} focusTitle onClose={jest.fn()} onSave={jest.fn()} />)
    expect(screen.getByLabelText(/Title/)).toHaveFocus()
  })
})
