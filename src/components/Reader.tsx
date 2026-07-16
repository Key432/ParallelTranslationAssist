import { buildReaderRows } from '../domain/translations'
import { projectLanguageFontFamily, projectLanguageLocale } from '../domain/projects'
import type { CSSProperties } from 'react'
import type { ProjectLanguage, Translation } from '../types'
import { FormattedTranslation } from './FormattedTranslation'

type Props = {
  title: string
  author: string
  sourceUrl: string
  source: string
  translations: Translation[]
  originalLanguage: ProjectLanguage
  translatedLanguage: ProjectLanguage
  onEdit: () => void
}

export function Reader({ title, author, sourceUrl, source, translations, originalLanguage, translatedLanguage, onEdit }: Props) {
  const languageFontStyle = {
    '--source-font-family': projectLanguageFontFamily(originalLanguage),
    '--translated-font-family': projectLanguageFontFamily(translatedLanguage),
  } as CSSProperties
  if (translations.length === 0) {
    return (
      <section className="reader empty-reader" style={languageFontStyle}>
        <p className="project-kicker">{title}</p>
        <p className="eyebrow">PARALLEL READING</p>
        <h1>まだ対訳がありません。</h1>
        <p>原文を選択し、最初の訳文を登録すると、ここに並んで表示されます。</p>
        <button className="primary" onClick={onEdit}>編集へ戻る →</button>
      </section>
    )
  }

  const rows = buildReaderRows(source, translations)
  return (
    <section className="reader" style={languageFontStyle}>
      <div className="reader-heading">
        <div>
          <p className="project-kicker">原文と訳文</p>
          <p className="eyebrow">PARALLEL READING</p>
          <h1>{title}</h1>
          {(author || sourceUrl) && (
            <div className="project-attribution">
              {author && <span className="project-author">by {author}</span>}
              {sourceUrl && <a href={sourceUrl} target="_blank" rel="noreferrer">🔗 Source</a>}
            </div>
          )}
        </div>
        <p className="reader-summary">{translations.length} 件の訳文 · 未訳部分も原文の流れに沿って表示</p>
      </div>
      <div className="reader-table">
        <div className="reader-label"><span>ORIGINAL · {originalLanguage}</span><span>TRANSLATION · {translatedLanguage}</span></div>
        {rows.map((row, index) => (
          <article className={row.translatedRow ? 'reader-row' : 'reader-row untranslated'} key={row.id}>
            <span className="row-number">{String(index + 1).padStart(2, '0')}</span>
            <p className="reader-source" lang={projectLanguageLocale(originalLanguage)}>{row.source}</p>
            <p className="reader-translation" lang={projectLanguageLocale(translatedLanguage)}><FormattedTranslation>{row.translated}</FormattedTranslation></p>
          </article>
        ))}
      </div>
    </section>
  )
}
