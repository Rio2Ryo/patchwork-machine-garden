import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders garden and advances the simulation', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByRole('heading', { name: /Patchwork Machine Garden/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /advance 12 ticks/i }))
    expect(window.__APP_DEBUG__?.getSummary().tick).toBe(12)
    expect(document.body.textContent).toContain('Advanced 12 ticks')
  })

  it('can export state json to the import jar', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /export JSON/i }))
    const jar = screen.getByPlaceholderText(/Paste exported JSON/i) as HTMLTextAreaElement
    expect(jar.value).toContain('ryo-042')
  })
})
