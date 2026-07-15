import { createRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { useOutsideClick } from './useOutsideClick'

function Harness({ active, onOutside }: { active: boolean; onOutside: () => void }) {
  const ref = createRef<HTMLDivElement>()
  useOutsideClick(ref, onOutside, active, '[data-toggle]')
  return (
    <>
      <div ref={ref}>inside</div>
      <button>outside</button>
      <button data-toggle>toggle</button>
    </>
  )
}

describe('useOutsideClick', () => {
  test('calls the handler only for clicks outside the target', () => {
    const onOutside = jest.fn()
    render(<Harness active onOutside={onOutside} />)

    fireEvent.pointerDown(screen.getByText('inside'))
    fireEvent.pointerDown(screen.getByText('toggle'))
    expect(onOutside).not.toHaveBeenCalled()

    fireEvent.pointerDown(screen.getByText('outside'))
    expect(onOutside).toHaveBeenCalledTimes(1)
  })

  test('does not listen while inactive', () => {
    const onOutside = jest.fn()
    render(<Harness active={false} onOutside={onOutside} />)
    fireEvent.pointerDown(screen.getByText('outside'))
    expect(onOutside).not.toHaveBeenCalled()
  })
})
