import { render, screen } from '@testing-library/react'
import { FormattedTranslation } from './FormattedTranslation'

describe('FormattedTranslation', () => {
  test('renders translation markup as semantic HTML without showing markers', () => {
    const { container } = render(
      <FormattedTranslation>**太字** _強調_ ~取消~ ｜漢字《かんじ》</FormattedTranslation>,
    )

    expect(screen.getByText('太字').tagName).toBe('STRONG')
    expect(screen.getByText('強調').tagName).toBe('EM')
    expect(screen.getByText('取消').tagName).toBe('S')
    const ruby = container.querySelector('ruby')
    expect(ruby).toHaveTextContent('漢字かんじ')
    expect(ruby).toContainElement(screen.getByText('かんじ'))
    expect(container).not.toHaveTextContent('**')
  })
})
