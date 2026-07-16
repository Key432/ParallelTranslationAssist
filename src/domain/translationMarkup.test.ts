import { parseTranslationMarkup } from './translationMarkup'

describe('translation markup', () => {
  test('parses semantic styles and both ruby markers', () => {
    expect(parseTranslationMarkup('**太字** _斜体_ ~取消~ |漢字《かんじ》 ｜言葉《ことば》')).toEqual([
      { type: 'strong', children: [{ type: 'text', value: '太字' }] },
      { type: 'text', value: ' ' },
      { type: 'underline', children: [{ type: 'text', value: '斜体' }] },
      { type: 'text', value: ' ' },
      { type: 'strikethrough', children: [{ type: 'text', value: '取消' }] },
      { type: 'text', value: ' ' },
      { type: 'ruby', base: '漢字', reading: 'かんじ' },
      { type: 'text', value: ' ' },
      { type: 'ruby', base: '言葉', reading: 'ことば' },
    ])
  })

  test('supports nested underline and preserves incomplete markup as text', () => {
    expect(parseTranslationMarkup('**強い _強調_** と **未完')).toEqual([
      {
        type: 'strong',
        children: [
          { type: 'text', value: '強い ' },
          { type: 'underline', children: [{ type: 'text', value: '強調' }] },
        ],
      },
      { type: 'text', value: ' と **未完' },
    ])
  })
})
