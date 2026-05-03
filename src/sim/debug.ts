import type { Action, GardenState } from './types'
import { exportMarkdown, summarize } from './engine'

export interface DebugApi {
  getState: () => GardenState
  getSummary: () => ReturnType<typeof summarize>
  dispatch: (action: Action) => GardenState
  step: (ticks: number) => GardenState
  exportJSON: () => string
  exportMarkdown: () => string
  importJSON: (json: string) => GardenState
  reset: (seed?: string) => GardenState
}

export function makeDebugApi(getState: () => GardenState, dispatch: (action: Action) => GardenState): DebugApi {
  return {
    getState,
    getSummary: () => summarize(getState()),
    dispatch,
    step: (ticks: number) => dispatch({ type: 'step', ticks }),
    exportJSON: () => JSON.stringify(getState(), null, 2),
    exportMarkdown: () => exportMarkdown(getState()),
    importJSON: (json: string) => dispatch({ type: 'import', state: JSON.parse(json) as GardenState }),
    reset: (seed = 'ryo-042') => dispatch({ type: 'reset', seed }),
  }
}
