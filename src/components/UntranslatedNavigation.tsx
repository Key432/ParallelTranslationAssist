type Props = {
  hasUntranslatedRanges: boolean
  disabled: boolean
  onPrevious: () => void
  onNext: () => void
}

export function UntranslatedNavigation({ hasUntranslatedRanges, disabled, onPrevious, onNext }: Props) {
  const navigationDisabled = disabled || !hasUntranslatedRanges

  return (
    <div className="untranslated-navigation">
      <div className="untranslated-navigation-actions">
        <button type="button" disabled={navigationDisabled} onClick={onPrevious}>← 前の未翻訳</button>
        <button type="button" disabled={navigationDisabled} onClick={onNext}>次の未翻訳 →</button>
      </div>
      {!hasUntranslatedRanges && <span className="translation-complete" role="status">すべて翻訳済みです</span>}
    </div>
  )
}
