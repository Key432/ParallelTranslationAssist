import { useEffect, useMemo, useRef, type RefObject, type UIEvent } from 'react'
import { buildSourceSegments } from '../domain/translations'
import type { Selection, TextSelectionRange, Translation } from '../types'

type Props = {
  source: string
  translations: Translation[]
  selection?: Selection | null
  sourceRef: RefObject<HTMLTextAreaElement | null>
  onSourceChange: (source: string, selection: TextSelectionRange) => void
  onBlur?: () => void
}

export function SourceEditor({ source, translations, selection = null, sourceRef, onSourceChange, onBlur }: Props) {
  const highlightRef = useRef<HTMLDivElement>(null)
  const segments = useMemo(() => buildSourceSegments(source, translations, selection), [source, translations, selection])

  useEffect(() => {
    if (!selection || !highlightRef.current || !sourceRef.current) return
    const selectedRange = highlightRef.current.querySelector<HTMLElement>('.selected-source-range')
    if (!selectedRange) return
    const targetScrollTop = Math.max(0, selectedRange.offsetTop - (highlightRef.current.clientHeight / 2))
    highlightRef.current.scrollTop = targetScrollTop
    sourceRef.current.scrollTop = targetScrollTop
  }, [selection, sourceRef])

  const syncScroll = (event: UIEvent<HTMLTextAreaElement>) => {
    if (!highlightRef.current) return
    highlightRef.current.scrollTop = event.currentTarget.scrollTop
    highlightRef.current.scrollLeft = event.currentTarget.scrollLeft
  }

  return (
    <div className="source-editor">
      <div className="source-highlight" ref={highlightRef} aria-hidden="true">
        <div className="source-highlight-content">
          {segments.map((segment) => (
            <span
              className={[segment.translated ? 'translated-source' : '', segment.selected ? 'selected-source-range' : ''].filter(Boolean).join(' ') || undefined}
              key={segment.id}
            >{segment.text}</span>
          ))}
          {source.endsWith('\n') ? '\n' : null}
        </div>
      </div>
      <textarea
        ref={sourceRef}
        value={source}
        onChange={(event) => onSourceChange(event.target.value, {
          start: event.target.selectionStart,
          end: event.target.selectionEnd,
        })}
        onScroll={syncScroll}
        onBlur={onBlur}
        placeholder="翻訳したい英文をここに貼り付けます…"
        aria-label="翻訳する原文"
        spellCheck
      />
    </div>
  )
}
