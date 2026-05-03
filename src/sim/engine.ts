import type { Agent, GardenState, Signal, Summary, Tile, TileKind } from './types'
import { hashString, mulberry32, pick } from './rng'

export const width = 9
export const height = 7

const tileKinds: readonly TileKind[] = ['root', 'gear', 'lens', 'pipe', 'bell', 'mirror', 'decay']
const signals: readonly Signal[] = ['amber', 'blue', 'violet', 'decay']

export function idx(x: number, y: number, w = width): number {
  return y * w + x
}

export function inBounds(x: number, y: number, state: GardenState): boolean {
  return x >= 0 && y >= 0 && x < state.width && y < state.height
}

export function createGarden(seed = 'ryo-042'): GardenState {
  const rng = mulberry32(hashString(seed))
  const tiles: Tile[] = Array.from({ length: width * height }, () => ({ kind: 'empty', rot: 0, energy: 0 }))
  const planted = 14 + Math.floor(rng() * 6)
  for (let i = 0; i < planted; i += 1) {
    const x = Math.floor(rng() * width)
    const y = Math.floor(rng() * height)
    tiles[idx(x, y)] = { kind: pick(rng, tileKinds), rot: Math.floor(rng() * 4), energy: Math.floor(rng() * 5), signal: pick(rng, signals) }
  }
  tiles[idx(4, 3)] = { kind: 'bell', rot: 0, energy: 6, signal: 'amber' }
  const agents: Agent[] = [
    { id: 'pollinator-1', kind: 'pollinator', x: 1, y: 1, goal: 'find amber loop', mood: 4 },
    { id: 'tinker-1', kind: 'tinker', x: 7, y: 2, goal: 'repair quiet gears', mood: 5 },
    { id: 'mite-1', kind: 'mite', x: 3, y: 5, goal: 'steal violet surplus', mood: 6 },
  ]
  return {
    seed,
    width,
    height,
    tick: 0,
    tiles,
    agents,
    selected: 'gear',
    paused: true,
    urge: 'Keep amber loops alive, blue cooled, violet surprising, and decay below 18%.',
    history: [{ tick: 0, text: `Garden woke from seed “${seed}”. Three agents began arguing with the plumbing.`, tone: 'weird' }],
  }
}

function addLog(state: GardenState, text: string, tone: GardenState['history'][number]['tone'] = 'info'): GardenState {
  const history = [{ tick: state.tick, text, tone }, ...state.history].slice(0, 80)
  return { ...state, history }
}

function neighborToward(state: GardenState, agent: Agent): { x: number; y: number } {
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [0, 0]]
  let best = { x: agent.x, y: agent.y, score: -999 }
  for (const [dx, dy] of dirs) {
    const x = agent.x + dx
    const y = agent.y + dy
    if (!inBounds(x, y, state)) continue
    const tile = state.tiles[idx(x, y, state.width)]
    let score = tile.energy + hashString(`${state.seed}:${state.tick}:${agent.id}:${x}:${y}`) % 3
    if (agent.kind === 'pollinator' && tile.signal === 'amber') score += 8
    if (agent.kind === 'tinker' && (tile.kind === 'gear' || tile.energy < 2)) score += 5
    if (agent.kind === 'mite' && tile.signal === 'violet') score += 9
    if (tile.kind === 'decay' && agent.kind !== 'mite') score -= 8
    if (score > best.score) best = { x, y, score }
  }
  return best
}

export function stepOnce(state: GardenState): GardenState {
  let next: GardenState = { ...state, tick: state.tick + 1, tiles: state.tiles.map((t) => ({ ...t })), agents: state.agents.map((a) => ({ ...a })) }
  const rng = mulberry32(hashString(`${next.seed}:${next.tick}`))

  next.tiles = next.tiles.map((tile, i) => {
    if (tile.kind === 'empty') return tile
    let energy = Math.max(0, Math.min(12, tile.energy + (tile.kind === 'root' || tile.kind === 'bell' ? 1 : 0) - (tile.kind === 'decay' ? 0 : 0.25)))
    let signal = tile.signal
    if (tile.kind === 'lens' && tile.signal === 'amber' && next.tick % 3 === 0) signal = 'blue'
    if (tile.kind === 'gear' && tile.energy > 6 && next.tick % 4 === 0) signal = 'amber'
    if (tile.kind === 'mirror' && tile.signal === 'blue' && rng() > 0.7) signal = 'violet'
    if (tile.kind === 'decay') energy = Math.min(12, energy + 0.35)
    if (tile.kind === 'pipe' && tile.signal && next.tick % 2 === 0) {
      const x = i % next.width
      const y = Math.floor(i / next.width)
      const nx = x + (tile.rot === 1 ? 1 : tile.rot === 3 ? -1 : 0)
      const ny = y + (tile.rot === 2 ? 1 : tile.rot === 0 ? -1 : 0)
      if (inBounds(nx, ny, next)) {
        const n = next.tiles[idx(nx, ny, next.width)]
        next.tiles[idx(nx, ny, next.width)] = { ...n, signal: tile.signal, energy: Math.min(12, n.energy + 1) }
      }
    }
    return { ...tile, energy, signal }
  })

  const logs: string[] = []
  next.agents = next.agents.map((agent) => {
    const pos = neighborToward(next, agent)
    const tileIndex = idx(pos.x, pos.y, next.width)
    const tile = next.tiles[tileIndex]
    const moved = { ...agent, x: pos.x, y: pos.y }
    if (agent.kind === 'pollinator' && tile.signal === 'amber') {
      next.tiles[tileIndex] = { ...tile, energy: Math.min(12, tile.energy + 2) }
      moved.goal = 'amplify amber route'
      moved.mood += 1
      logs.push(`${agent.id} braided amber through ${tile.kind}.`)
    }
    if (agent.kind === 'tinker' && tile.kind !== 'empty' && tile.kind !== 'decay') {
      next.tiles[tileIndex] = { ...next.tiles[tileIndex], energy: Math.min(12, next.tiles[tileIndex].energy + 1) }
      moved.goal = 'tighten the humming machine'
    }
    if (agent.kind === 'mite' && tile.signal === 'violet') {
      next.tiles[tileIndex] = { ...tile, signal: undefined, energy: Math.max(0, tile.energy - 2) }
      moved.carrying = 'violet'
      moved.goal = 'hide stolen violet under roots'
      logs.push(`${agent.id} pocketed a violet surplus.`)
    }
    return moved
  })

  if (next.tick % 9 === 0) {
    const empties = next.tiles.map((t, i) => [t, i] as const).filter(([t]) => t.kind === 'empty')
    if (empties.length > 0 && rng() > 0.55) {
      const [, i] = pick(rng, empties)
      next.tiles[i] = { kind: 'root', rot: 0, energy: 1, signal: 'amber' }
      logs.push('A brass root self-installed where nobody filed a request.')
    }
  }
  logs.slice(0, 2).forEach((text) => { next = addLog(next, text, 'weird') })
  return next
}

export function step(state: GardenState, ticks: number): GardenState {
  const safeTicks = Math.max(0, Math.min(500, Math.floor(Number.isFinite(ticks) ? ticks : 0)))
  let next = state
  for (let i = 0; i < safeTicks; i += 1) next = stepOnce(next)
  return addLog(next, `Advanced ${safeTicks} ticks. Hash ${summarize(next).hash}.`, safeTicks > 100 ? 'warn' : 'info')
}

export function place(state: GardenState, x: number, y: number, kind: TileKind): GardenState {
  if (!inBounds(x, y, state) || kind === 'empty') return addLog(state, `Rejected placement ${kind} at ${x},${y}; outside the trellis.`, 'warn')
  const tiles = state.tiles.map((t) => ({ ...t }))
  tiles[idx(x, y, state.width)] = { kind, rot: 0, energy: kind === 'decay' ? 5 : 3, signal: kind === 'root' || kind === 'bell' ? 'amber' : kind === 'lens' ? 'blue' : kind === 'mirror' ? 'violet' : undefined }
  return addLog({ ...state, tiles, selected: kind }, `Placed ${kind} at ${x},${y}; agents replanned without asking permission.`, 'good')
}

export function rotate(state: GardenState, x: number, y: number): GardenState {
  if (!inBounds(x, y, state)) return addLog(state, `Could not rotate ${x},${y}; no such screw exists.`, 'warn')
  const tiles = state.tiles.map((t) => ({ ...t }))
  const tile = tiles[idx(x, y, state.width)]
  tiles[idx(x, y, state.width)] = { ...tile, rot: (tile.rot + 1) % 4, energy: Math.min(12, tile.energy + 0.5) }
  return addLog({ ...state, tiles }, `Rotated ${tile.kind} at ${x},${y} to ${tiles[idx(x, y, state.width)].rot}.`, 'info')
}

export function inject(state: GardenState, x: number, y: number, signal: Signal, amount = 3): GardenState {
  if (!inBounds(x, y, state)) return addLog(state, `Signal ${signal} splashed outside the jar at ${x},${y}.`, 'warn')
  const tiles = state.tiles.map((t) => ({ ...t }))
  const tile = tiles[idx(x, y, state.width)]
  tiles[idx(x, y, state.width)] = { ...tile, signal, energy: Math.min(12, tile.energy + Math.max(1, Math.min(12, amount))) }
  return addLog({ ...state, tiles }, `Injected ${signal} signal at ${x},${y}; ${tile.kind} started humming.`, signal === 'decay' ? 'warn' : 'good')
}

export function summarize(state: GardenState): Summary {
  const counts = { amber: 0, blue: 0, violet: 0, decay: 0 }
  let energy = 0
  state.tiles.forEach((tile) => {
    energy += tile.energy
    if (tile.signal) counts[tile.signal] += 1
    if (tile.kind === 'decay') counts.decay += 1
  })
  const urgeScore = Math.max(0, Math.min(100, Math.round(counts.amber * 8 + counts.blue * 5 + counts.violet * 3 + state.agents.length * 6 + energy / 4 - counts.decay * 7)))
  const digest = hashString(JSON.stringify({ seed: state.seed, tick: state.tick, tiles: state.tiles, agents: state.agents.map(({ id, x, y, goal }) => ({ id, x, y, goal })) })).toString(36)
  return { hash: digest, tick: state.tick, ...counts, occupiedAgents: state.agents.filter((a) => a.goal.length > 0).length, urgeScore }
}

export function exportMarkdown(state: GardenState): string {
  const s = summarize(state)
  return `# Patchwork Machine Garden Brief\n\n- seed: ${state.seed}\n- tick: ${state.tick}\n- hash: ${s.hash}\n- urge score: ${s.urgeScore}\n- signals: amber ${s.amber}, blue ${s.blue}, violet ${s.violet}, decay ${s.decay}\n\n## Agent intentions\n${state.agents.map((a) => `- ${a.id}: ${a.goal} at ${a.x},${a.y}`).join('\n')}\n\n## Recent log\n${state.history.slice(0, 8).map((e) => `- t${e.tick}: ${e.text}`).join('\n')}\n`
}
