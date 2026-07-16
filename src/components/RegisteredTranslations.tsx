import { useMemo, useState, type FormEvent } from 'react'
import { projectLanguageLocale } from '../domain/projects'
import type { ProjectLanguage, Translation } from '../types'
import { FormattedTranslation } from './FormattedTranslation'

type SearchTarget = 'source' | 'translated'

type Props = {
  translations: Translation[]
  originalLanguage: ProjectLanguage
  translatedLanguage: ProjectLanguage
  editingTranslationId: string | null
  onEditTranslation: (id: string) => void
  onDeleteTranslation: (id: string) => void
}

export function RegisteredTranslations({
  translations,
  originalLanguage,
  translatedLanguage,
  editingTranslationId,
  onEditTranslation,
  onDeleteTranslation,
}: Props) {
  const [query, setQuery] = useState('')
  const [target, setTarget] = useState<SearchTarget>('source')
  const [filter, setFilter] = useState<{ query: string; target: SearchTarget } | null>(null)
  const visibleTranslations = useMemo(() => translations
    .map((translation, index) => ({ translation, index }))
    .filter(({ translation }) => !filter || translation[filter.target].includes(filter.query)), [filter, translations])

  const applyFilter = (event: FormEvent) => {
    event.preventDefault()
    const trimmedQuery = query.trim()
    setFilter(trimmedQuery ? { query: trimmedQuery, target } : null)
  }

  const clearFilter = () => {
    setQuery('')
    setFilter(null)
  }

  return (
    <section className="recent" aria-labelledby="registered-translations-title">
      <div className="registered-heading">
        <div className="section-title"><p className="eyebrow">REGISTERED PAIRS</p><h2 id="registered-translations-title">登録済みの対訳</h2></div>
        <form className="translation-search" onSubmit={applyFilter} aria-label="登録済み対訳を検索">
          <label className="translation-search-field">
            <span className="visually-hidden">検索文字列</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="対訳を検索…" />
          </label>
          <div className="translation-search-target" role="group" aria-label="検索対象">
            <button type="button" aria-pressed={target === 'source'} onClick={() => setTarget('source')}>原文</button>
            <button type="button" aria-pressed={target === 'translated'} onClick={() => setTarget('translated')}>訳文</button>
          </div>
          <button type="submit" className="filter-button">フィルター</button>
          {filter && <button type="button" className="clear-filter-button" onClick={clearFilter}>解除</button>}
        </form>
      </div>
      {filter && (
        <p className="translation-filter-status" aria-live="polite">
          {filter.target === 'source' ? '原文' : '訳文'}「{filter.query}」: {visibleTranslations.length} / {translations.length} 件
        </p>
      )}
      <div className="pair-list">
        {visibleTranslations.map(({ translation: item, index }) => (
          <article className={`pair-card ${editingTranslationId === item.id ? 'editing' : ''}`} key={item.id}>
            <span className="pair-number">{String(index + 1).padStart(2, '0')}</span>
            <p className="pair-source" lang={projectLanguageLocale(originalLanguage)}>{item.source}</p>
            <p className="pair-translation" lang={projectLanguageLocale(translatedLanguage)}><FormattedTranslation>{item.translated}</FormattedTranslation></p>
            <div className="pair-actions">
              <button className="icon-tooltip-button" aria-label="この対訳を編集" onClick={() => onEditTranslation(item.id)}>
                <span aria-hidden="true">✎</span><span className="icon-button-tooltip" role="tooltip">編集</span>
              </button>
              <button className="icon-tooltip-button" aria-label="この対訳を削除" onClick={() => onDeleteTranslation(item.id)}>
                <span aria-hidden="true">×</span><span className="icon-button-tooltip" role="tooltip">削除</span>
              </button>
            </div>
          </article>
        ))}
        {visibleTranslations.length === 0 && <p className="translation-search-empty">条件に一致する対訳はありません。</p>}
      </div>
    </section>
  )
}
