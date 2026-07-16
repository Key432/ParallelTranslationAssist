import { render, screen } from '@testing-library/react'
import { FormattedTranslation } from './FormattedTranslation'

describe('FormattedTranslation', () => {
  test('renders translation markup as semantic HTML without showing markers', () => {
    const { container } = render(
      <FormattedTranslation>**太字** _下線_ ~取消~ ｜漢字《かんじ》</FormattedTranslation>,
    )

    expect(screen.getByText('太字').tagName).toBe('STRONG')
    expect(screen.getByText('下線').tagName).toBe('SPAN')
    expect(screen.getByText('下線')).toHaveStyle({ textDecoration: 'underline' })
    expect(screen.getByText('取消').tagName).toBe('S')
    const ruby = container.querySelector('ruby')
    expect(ruby).toHaveTextContent('漢字かんじ')
    expect(ruby).toContainElement(screen.getByText('かんじ'))
    expect(container).not.toHaveTextContent('**')
  })
})
