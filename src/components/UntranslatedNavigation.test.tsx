import { fireEvent, render, screen } from '@testing-library/react'
import { UntranslatedNavigation } from './UntranslatedNavigation'

describe('UntranslatedNavigation', () => {
  test('moves in both directions when enabled', () => {
    const onPrevious = jest.fn()
    const onNext = jest.fn()
    render(<UntranslatedNavigation hasUntranslatedRanges disabled={false} onPrevious={onPrevious} onNext={onNext} />)
    fireEvent.click(screen.getByRole('button', { name: '← 前の未翻訳' }))
    fireEvent.click(screen.getByRole('button', { name: '次の未翻訳 →' }))
    expect(onPrevious).toHaveBeenCalledTimes(1)
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  test('disables navigation while input is unsaved', () => {
    render(<UntranslatedNavigation hasUntranslatedRanges disabled onPrevious={jest.fn()} onNext={jest.fn()} />)
    expect(screen.getByRole('button', { name: '← 前の未翻訳' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '次の未翻訳 →' })).toBeDisabled()
  })

  test('shows completion and disables navigation when no untranslated text remains', () => {
    render(<UntranslatedNavigation hasUntranslatedRanges={false} disabled={false} onPrevious={jest.fn()} onNext={jest.fn()} />)
    const previous = screen.getByRole('button', { name: '← 前の未翻訳' })
    const next = screen.getByRole('button', { name: '次の未翻訳 →' })
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('すべて翻訳済みです')
    expect(previous).toBeDisabled()
    expect(next).toBeDisabled()
    expect(previous.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(next.compareDocumentPosition(status) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
