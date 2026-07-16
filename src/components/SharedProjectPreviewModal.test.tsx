import { fireEvent, render, screen } from '@testing-library/react'
import { SharedProjectPreviewModal } from './SharedProjectPreviewModal'

const shared = {
  v: 1 as const, t: 'Shared book', a: 'Author', u: 'https://example.com/source',
  ol: 'ENGLISH' as const, tl: 'JAPANESE' as const, st: '翻訳中' as const,
  s: 'Hello', tr: [[0, 5, 'こんにちは']] as [number, number, string][], k: [['Hello', '挨拶']] as [string, string][],
}

test('previews shared metadata without saving and exposes all decisions', () => {
  const onAdd = jest.fn()
  const onReadOnly = jest.fn()
  const onCancel = jest.fn()
  render(<SharedProjectPreviewModal shared={shared} onAdd={onAdd} onReadOnly={onReadOnly} onCancel={onCancel} />)
  const dialog = screen.getByRole('dialog', { name: '共有されたプロジェクト' })
  expect(dialog).toHaveTextContent('Shared book')
  expect(dialog).toHaveTextContent('Author')
  expect(dialog).toHaveTextContent('🇬🇧 ENGLISH')
  expect(dialog).toHaveTextContent('1 件')
  expect(dialog).toHaveTextContent('開いただけではこのブラウザへ保存されません')
  fireEvent.click(screen.getByRole('button', { name: '閲覧のみ' }))
  expect(onReadOnly).toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: '新しいプロジェクトとして追加' }))
  expect(onAdd).toHaveBeenCalled()
})
