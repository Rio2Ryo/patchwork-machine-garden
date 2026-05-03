import { describe, expect, it } from 'vitest'
import { createGarden, inject, place, rotate, step, summarize } from './engine'
import { reduceGarden } from './reducer'

describe('patchwork machine garden simulation', () => {
  it('is deterministic for the same seed and actions', () => {
    const actions = [
      { type: 'place' as const, x: 2, y: 2, kind: 'root' as const },
      { type: 'inject' as const, x: 2, y: 2, signal: 'amber' as const, amount: 5 },
      { type: 'step' as const, ticks: 25 },
    ]
    const run = () => actions.reduce(reduceGarden, createGarden('same-seed'))
    expect(summarize(run()).hash).toBe(summarize(run()).hash)
  })

  it('records meaningful logs for tactile operations', () => {
    let state = createGarden('logs')
    state = place(state, 1, 1, 'mirror')
    state = rotate(state, 1, 1)
    state = inject(state, 1, 1, 'violet', 4)
    state = step(state, 10)
    expect(state.history.map((entry) => entry.text).join('\n')).toContain('mirror')
    expect(summarize(state).violet).toBeGreaterThanOrEqual(0)
  })

  it('handles weird out-of-bounds input without crashing', () => {
    let state = createGarden('edge')
    state = place(state, -99, 999, 'gear')
    state = inject(state, Number.NaN, 3, 'decay', 99)
    state = step(state, 9999)
    expect(state.tick).toBe(500)
    expect(state.history[0].text).toContain('Advanced 500')
  })
})
