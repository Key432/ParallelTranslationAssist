import { fireEvent, render, screen } from '@testing-library/react'
import { ProjectStatisticsModal } from './ProjectStatisticsModal'
import type { Project } from '../types'

const project: Project = {
  id: 'project-1',
  title: 'Sample',
  author: '',
  sourceUrl: '',
  originalLanguage: 'ENGLISH',
  translatedLanguage: 'JAPANESE',
  status: '翻訳中',
  source: 'Hello brave world',
  translations: [{ id: 'one', start: 0, end: 5, source: 'Hello', translated: 'こんにちは' }],
  updatedAt: '2026-07-16T01:30:00.000Z',
}

describe('ProjectStatisticsModal', () => {
  test('shows the complete project statistics', () => {
    render(<ProjectStatisticsModal project={project} onClose={jest.fn()} />)

    expect(screen.getByRole('dialog', { name: '統計' })).toBeInTheDocument()
    expect(screen.getByLabelText('翻訳済み 33.3%')).toBeInTheDocument()
    expect(screen.getByText('3 語')).toBeInTheDocument()
    expect(screen.getByText('原文文字数')).toBeInTheDocument()
    expect(screen.getByText('対訳件数')).toBeInTheDocument()
    expect(screen.getByText('訳文合計文字数')).toBeInTheDocument()
    expect(screen.getByText(/2026年7月16日/)).toBeInTheDocument()
  })

  test('closes from the close button and Escape key', () => {
    const onClose = jest.fn()
    render(<ProjectStatisticsModal project={project} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: '統計を閉じる' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
