export type TranslationMarkupNode =
  | { type: 'text'; value: string }
  | { type: 'strong' | 'emphasis' | 'strikethrough'; children: TranslationMarkupNode[] }
  | { type: 'ruby'; base: string; reading: string }

const MARKUP_PATTERN = /\*\*([\s\S]+?)\*\*|_([\s\S]+?)_|~([\s\S]+?)~|[|｜]([^《》|\n]+?)《([^《》\n]+?)》/g

export function parseTranslationMarkup(value: string): TranslationMarkupNode[] {
  const nodes: TranslationMarkupNode[] = []
  let cursor = 0

  for (const match of value.matchAll(MARKUP_PATTERN)) {
    const index = match.index ?? 0
    if (index > cursor) nodes.push({ type: 'text', value: value.slice(cursor, index) })

    if (match[1] !== undefined) {
      nodes.push({ type: 'strong', children: parseTranslationMarkup(match[1]) })
    } else if (match[2] !== undefined) {
      nodes.push({ type: 'emphasis', children: parseTranslationMarkup(match[2]) })
    } else if (match[3] !== undefined) {
      nodes.push({ type: 'strikethrough', children: parseTranslationMarkup(match[3]) })
    } else {
      nodes.push({ type: 'ruby', base: match[4], reading: match[5] })
    }

    cursor = index + match[0].length
  }

  if (cursor < value.length) nodes.push({ type: 'text', value: value.slice(cursor) })
  return nodes
}
