import { Fragment, type ReactNode } from 'react'
import { parseTranslationMarkup, type TranslationMarkupNode } from '../domain/translationMarkup'

type Props = {
  children: string
}

function renderNode(node: TranslationMarkupNode, key: string): ReactNode {
  if (node.type === 'text') return <Fragment key={key}>{node.value}</Fragment>
  if (node.type === 'ruby') return <ruby key={key}>{node.base}<rt>{node.reading}</rt></ruby>

  const children = node.children.map((child, index) => renderNode(child, `${key}-${index}`))
  if (node.type === 'strong') return <strong key={key}>{children}</strong>
  if (node.type === 'underline') return <span key={key} style={{ textDecoration: 'underline' }}>{children}</span>
  return <s key={key}>{children}</s>
}

export function FormattedTranslation({ children }: Props) {
  return (
    <span className="formatted-translation">
      {parseTranslationMarkup(children).map((node, index) => renderNode(node, String(index)))}
    </span>
  )
}
