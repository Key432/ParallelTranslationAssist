import { useEffect, useMemo, useRef, useState, type MouseEvent, type RefObject, type UIEvent } from 'react'
import { buildSourceSegments } from '../domain/translations'
import type { Selection, TextSelectionRange, Translation, TranslationKeyword } from '../types'

type Props = {
  source: string
  translations: Translation[]
  keywords?: TranslationKeyword[]
  selection?: Selection | null
  sourceRef: RefObject<HTMLTextAreaElement | null>
  onSourceChange: (source: string, selection: TextSelectionRange) => void
  onBlur?: () => void
  readOnly?: boolean
}

export function SourceEditor({ source, translations, keywords = [], selection = null, sourceRef, onSourceChange, onBlur, readOnly = false }: Props) {
  const editorRef = useRef<HTMLDivElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null)
  const segments = useMemo(() => buildSourceSegments(source, translations, selection, keywords), [source, translations, selection, keywords])

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

  const updateKeywordTooltip = (event: MouseEvent<HTMLTextAreaElement>) => {
    const editor = editorRef.current
    if (!editor) return
    const match = [...editor.querySelectorAll<HTMLElement>('.keyword-source')].find((element) => (
      [...element.getClientRects()].some((rect) => event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom)
    ))
    if (!match?.dataset.translation) {
      setTooltip(null)
      return
    }
    const editorRect = editor.getBoundingClientRect()
    setTooltip({ text: match.dataset.translation, x: event.clientX - editorRect.left, y: event.clientY - editorRect.top })
  }

  return (
    <div className="source-editor" ref={editorRef}>
      <div className="source-highlight" ref={highlightRef} aria-hidden="true">
        <div className="source-highlight-content">
          {segments.map((segment) => (
            <span
              className={[segment.translated ? 'translated-source' : '', segment.selected ? 'selected-source-range' : '', segment.keyword ? 'keyword-source' : ''].filter(Boolean).join(' ') || undefined}
              data-translation={segment.keyword?.translated}
              title={segment.keyword?.translated}
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
        onMouseMove={updateKeywordTooltip}
        onMouseLeave={() => setTooltip(null)}
        onBlur={onBlur}
        readOnly={readOnly}
        placeholder="翻訳したい英文をここに貼り付けます…"
        aria-label="翻訳する原文"
        spellCheck
      />
      {tooltip && <span className="keyword-tooltip" role="tooltip" style={{ left: tooltip.x, top: tooltip.y }}>{tooltip.text}</span>}
    </div>
  )
}
