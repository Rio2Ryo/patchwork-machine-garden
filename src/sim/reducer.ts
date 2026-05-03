import { createGarden, inject, place, rotate, step } from './engine'
import type { Action, GardenState } from './types'
import { isGardenState } from './validate'

export function reduceGarden(state: GardenState, action: Action): GardenState {
  switch (action.type) {
    case 'place': return place(state, action.x, action.y, action.kind)
    case 'rotate': return rotate(state, action.x, action.y)
    case 'inject': return inject(state, action.x, action.y, action.signal, action.amount)
    case 'step': return step(state, action.ticks)
    case 'select': return { ...state, selected: action.kind }
    case 'reset': return createGarden(action.seed)
    case 'pause': return { ...state, paused: action.paused }
    case 'scent': return inject(state, action.x, action.y, action.signal, 2)
    case 'import': return isGardenState(action.state) ? action.state : state
    default: return state
  }
}
