import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import App from './App'

describe('App', () => {
  it('renders dashboard headline', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>,
    )

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /incident overview/i,
    )
  })
})
