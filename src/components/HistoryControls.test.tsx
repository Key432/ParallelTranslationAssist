import { fireEvent, render, screen } from '@testing-library/react'
import { HistoryControls } from './HistoryControls'

describe('HistoryControls', () => {
  test('disables unavailable history actions', () => {
    render(<HistoryControls canUndo={false} canRedo={false} onUndo={jest.fn()} onRedo={jest.fn()} />)
    expect(screen.getByRole('button', { name: '変更を元に戻す' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '変更をやり直す' })).toBeDisabled()
  })

  test('runs enabled undo and redo actions', () => {
    const onUndo = jest.fn()
    const onRedo = jest.fn()
    render(<HistoryControls canUndo canRedo onUndo={onUndo} onRedo={onRedo} />)
    fireEvent.click(screen.getByRole('button', { name: '変更を元に戻す' }))
    fireEvent.click(screen.getByRole('button', { name: '変更をやり直す' }))
    expect(onUndo).toHaveBeenCalledTimes(1)
    expect(onRedo).toHaveBeenCalledTimes(1)
  })
})
