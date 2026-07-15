import { useEffect, type RefObject } from 'react'

export function useOutsideClick<T extends HTMLElement>(
  ref: RefObject<T | null>,
  onOutsideClick: () => void,
  active: boolean,
  ignoredSelector?: string,
) {
  useEffect(() => {
    if (!active) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node) || ref.current?.contains(target)) return
      if (target instanceof Element && ignoredSelector && target.closest(ignoredSelector)) return
      onOutsideClick()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [active, ignoredSelector, onOutsideClick, ref])
}
