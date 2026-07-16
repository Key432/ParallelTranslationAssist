import { fireEvent, render, screen } from '@testing-library/react'
import { AiApiKeySettings } from './AiApiKeySettings'

describe('AiApiKeySettings', () => {
  test('starts with a password field and supports checking and clearing', () => {
    const onCheck = jest.fn()
    const onClear = jest.fn()
    render(<AiApiKeySettings apiKey="temporary" status="unchecked" model="" onApiKeyChange={jest.fn()} onCheckConnection={onCheck} onClearApiKey={onClear} onClose={jest.fn()} />)
    expect(screen.getByRole('dialog', { name: 'AI翻訳支援' })).toBeInTheDocument()
    const input = screen.getByLabelText('OpenAI APIキー')
    expect(input).toHaveAttribute('type', 'password')
    fireEvent.click(screen.getByRole('button', { name: '接続を確認' }))
    fireEvent.click(screen.getByRole('button', { name: 'APIキーを消去' }))
    expect(onCheck).toHaveBeenCalledTimes(1)
    expect(onClear).toHaveBeenCalledTimes(1)
    expect(screen.getByText(/前後にある原文やプロジェクト全体は送信しません/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'こちら' })).toHaveAttribute('href', 'https://platform.openai.com/usage')
    expect(screen.getByRole('link', { name: 'こちら' })).toHaveAttribute('target', '_blank')
  })
})
