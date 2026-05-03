import { createGarden, exportMarkdown, summarize } from '../sim/engine'
import { reduceGarden } from '../sim/reducer'
import type { Action, Signal, TileKind } from '../sim/types'

function arg(name: string, fallback: string): string {
  const found = process.argv.find((value) => value.startsWith(`--${name}=`))
  return found ? found.split('=').slice(1).join('=') : fallback
}

function numberArg(name: string, fallback: number): number {
  const value = Number(arg(name, String(fallback)))
  return Number.isFinite(value) ? value : fallback
}

const seed = arg('seed', 'ryo-042')
const ticks = numberArg('ticks', 40)
const weird = arg('weird', '')

let state = createGarden(seed)
const actions: Action[] = [
  { type: 'place', x: 2, y: 2, kind: 'root' },
  { type: 'place', x: 3, y: 2, kind: 'gear' },
  { type: 'inject', x: 2, y: 2, signal: 'amber', amount: 5 },
  { type: 'rotate', x: 3, y: 2 },
  { type: 'step', ticks },
]

if (weird) {
  const [kind = 'mirror', rawX = '-1', rawY = '999', signal = 'violet'] = weird.split(',')
  actions.push({ type: 'place', x: Number(rawX), y: Number(rawY), kind: kind as TileKind })
  actions.push({ type: 'inject', x: Number(rawX), y: Number(rawY), signal: signal as Signal, amount: 99 })
}

for (const action of actions) state = reduceGarden(state, action)

const result = { summary: summarize(state), recent: state.history.slice(0, 6), markdown: exportMarkdown(state) }
console.log(JSON.stringify(result, null, 2))
