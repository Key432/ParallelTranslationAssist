import { fireEvent, render, screen, within } from '@testing-library/react'
import { TranslationKeywordModal } from './TranslationKeywordModal'

describe('TranslationKeywordModal', () => {
  test('registers a keyword and prevents duplicate source terms', () => {
    const onAdd = jest.fn()
    const { rerender } = render(
      <TranslationKeywordModal keywords={[]} onClose={jest.fn()} onAdd={onAdd} onUpdate={jest.fn()} onDelete={jest.fn()} />,
    )
    fireEvent.change(screen.getByLabelText('原語'), { target: { value: 'translation' } })
    fireEvent.change(screen.getByLabelText('訳語'), { target: { value: '翻訳' } })
    fireEvent.click(screen.getByRole('button', { name: '登録' }))
    expect(onAdd).toHaveBeenCalledWith('translation', '翻訳')

    rerender(
      <TranslationKeywordModal keywords={[{ id: 'one', source: 'translation', translated: '翻訳' }]} onClose={jest.fn()} onAdd={onAdd} onUpdate={jest.fn()} onDelete={jest.fn()} />,
    )
    fireEvent.click(screen.getByRole('tab', { name: '登録' }))
    fireEvent.change(screen.getByLabelText('原語'), { target: { value: 'translation' } })
    fireEvent.change(screen.getByLabelText('訳語'), { target: { value: '訳すこと' } })
    fireEvent.click(screen.getByRole('button', { name: '登録' }))
    expect(screen.getByRole('alert')).toHaveTextContent('すでに登録')
  })

  test('opens an existing keyword for editing and deletes it from the list', () => {
    const keyword = { id: 'one', source: 'source', translated: '原文' }
    const onUpdate = jest.fn()
    const onDelete = jest.fn()
    render(<TranslationKeywordModal keywords={[keyword]} onClose={jest.fn()} onAdd={jest.fn()} onUpdate={onUpdate} onDelete={onDelete} />)
    fireEvent.click(screen.getByRole('tab', { name: /一覧/ }))
    const item = screen.getByText('source').closest('.keyword-item') as HTMLElement
    fireEvent.click(within(item).getByRole('button', { name: 'sourceを編集' }))
    fireEvent.change(screen.getByLabelText('訳語'), { target: { value: '出典' } })
    fireEvent.click(screen.getByRole('button', { name: '更新' }))
    expect(onUpdate).toHaveBeenCalledWith('one', 'source', '出典')

    fireEvent.click(screen.getByRole('tab', { name: /一覧/ }))
    fireEvent.click(screen.getByRole('button', { name: 'sourceを削除' }))
    expect(onDelete).toHaveBeenCalledWith('one')
  })
})
