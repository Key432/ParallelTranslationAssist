import { useEffect, useRef, useState } from 'react'
import { PROJECT_LANGUAGES } from '../domain/projects'
import type { Project, ProjectInformation, ProjectLanguage } from '../types'

type Props = {
  project: Project
  focusTitle?: boolean
  onClose: () => void
  onSave: (information: ProjectInformation) => void
}

export function ProjectInformationModal({ project, focusTitle = false, onClose, onSave }: Props) {
  const [title, setTitle] = useState(project.title)
  const [author, setAuthor] = useState(project.author)
  const [sourceUrl, setSourceUrl] = useState(project.sourceUrl)
  const [originalLanguage, setOriginalLanguage] = useState(project.originalLanguage)
  const [translatedLanguage, setTranslatedLanguage] = useState(project.translatedLanguage)
  const titleRef = useRef<HTMLInputElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (focusTitle) titleRef.current?.focus()
    else closeRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [focusTitle, onClose])

  const submit = () => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return
    onSave({
      title: trimmedTitle,
      author: author.trim(),
      sourceUrl: sourceUrl.trim(),
      originalLanguage,
      translatedLanguage,
    })
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}>
      <section className="information-modal" role="dialog" aria-modal="true" aria-labelledby="information-dialog-title">
        <header className="information-heading">
          <div><p className="eyebrow">PROJECT INFORMATION</p><h2 id="information-dialog-title">プロジェクト情報</h2></div>
          <button ref={closeRef} className="statistics-close" onClick={onClose} aria-label="プロジェクト情報を閉じる">×</button>
        </header>
        <form onSubmit={(event) => { event.preventDefault(); submit() }}>
          <label>
            <span>Title <small>必須</small></span>
            <input ref={titleRef} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} required />
          </label>
          <label>
            <span>Author <small>任意</small></span>
            <input value={author} onChange={(event) => setAuthor(event.target.value)} maxLength={160} placeholder="原文の著者" />
          </label>
          <label>
            <span>Source <small>任意</small></span>
            <input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://example.com/source" />
          </label>
          <div className="information-language-grid">
            <label>
              <span>Original Language</span>
              <select value={originalLanguage} onChange={(event) => setOriginalLanguage(event.target.value as ProjectLanguage)}>
                {PROJECT_LANGUAGES.map((language) => <option value={language.value} key={language.value}>{language.flag} {language.value}</option>)}
              </select>
            </label>
            <label>
              <span>Translated Language</span>
              <select value={translatedLanguage} onChange={(event) => setTranslatedLanguage(event.target.value as ProjectLanguage)}>
                {PROJECT_LANGUAGES.map((language) => <option value={language.value} key={language.value}>{language.flag} {language.value}</option>)}
              </select>
            </label>
          </div>
          <div className="modal-actions information-actions">
            <button type="button" className="text-button" onClick={onClose}>キャンセル</button>
            <button type="submit" className="primary" disabled={!title.trim()}>情報を保存</button>
          </div>
        </form>
      </section>
    </div>
  )
}
