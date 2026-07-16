import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ProjectShareModal } from './ProjectShareModal'
import { buildProjectShareUrl } from '../services/shareLinkCodec'
import type { Project } from '../types'

jest.mock('../services/shareLinkCodec', () => ({
  buildProjectShareUrl: jest.fn(),
  supportsShareLinks: () => true,
}))

const buildUrl = buildProjectShareUrl as jest.MockedFunction<typeof buildProjectShareUrl>
const project: Project = {
  id: 'project', title: 'Shared title', author: '', sourceUrl: '', originalLanguage: 'ENGLISH',
  translatedLanguage: 'JAPANESE', status: '翻訳中', source: 'Hello',
  translations: [{ id: 'translation', start: 0, end: 5, source: 'Hello', translated: 'こんにちは' }],
  keywords: [{ id: 'keyword', source: 'Hello', translated: '挨拶' }], updatedAt: '2026-07-16T00:00:00.000Z',
}

describe('ProjectShareModal', () => {
  test('shows counts, privacy information, and copies an available link', async () => {
    buildUrl.mockResolvedValue({ url: 'https://example.com/#share=v1.payload', length: 45, status: 'available' })
    const writeText = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    const copied = jest.fn()
    render(<ProjectShareModal project={project} onClose={jest.fn()} onCopied={copied} onSaveFile={jest.fn()} />)

    expect(screen.getByRole('dialog', { name: 'プロジェクトを共有' })).toHaveTextContent('Shared title')
    expect(screen.getByRole('dialog')).toHaveTextContent('1 件')
    expect(screen.getByText(/圧縮されていますが暗号化はされていません/)).toBeInTheDocument()
    expect(screen.getByText(/APIキー、AI候補、AI警告は含まれません/)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'リンクをコピー' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'リンクをコピー' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('https://example.com/#share=v1.payload'))
    expect(copied).toHaveBeenCalled()
  })

  test('offers manual copying when the clipboard fails', async () => {
    buildUrl.mockResolvedValue({ url: 'https://example.com/#share=v1.manual', length: 44, status: 'warning' })
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: jest.fn().mockRejectedValue(new Error('denied')) } })
    render(<ProjectShareModal project={project} onClose={jest.fn()} onCopied={jest.fn()} onSaveFile={jest.fn()} />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'リンクをコピー' })).toBeEnabled())
    expect(screen.getByText(/途中までしか送信されない/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'リンクをコピー' }))
    expect(await screen.findByLabelText('共有URLを手動でコピー')).toHaveValue('https://example.com/#share=v1.manual')
  })

  test('disables URL sharing when the completed URL is too large', async () => {
    buildUrl.mockResolvedValue({ url: 'https://example.com/#share=v1.large', length: 12001, status: 'too_large' })
    render(<ProjectShareModal project={project} onClose={jest.fn()} onCopied={jest.fn()} onSaveFile={jest.fn()} />)
    await waitFor(() => expect(screen.getByText(/プロジェクトが大きいため/)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'リンクをコピー' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'プロジェクトファイルを保存' })).toBeEnabled()
  })
})
