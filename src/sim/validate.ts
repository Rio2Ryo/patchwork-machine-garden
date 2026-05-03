import type { GardenState, TileKind, AgentKind } from './types'

const tileKinds: TileKind[] = ['empty', 'root', 'gear', 'lens', 'pipe', 'bell', 'mirror', 'decay']
const agentKinds: AgentKind[] = ['pollinator', 'tinker', 'mite']

export function isGardenState(value: unknown): value is GardenState {
  if (!value || typeof value !== 'object') return false
  const state = value as Partial<GardenState>
  if (typeof state.seed !== 'string' || typeof state.width !== 'number' || typeof state.height !== 'number' || typeof state.tick !== 'number') return false
  if (!Array.isArray(state.tiles) || state.tiles.length !== state.width * state.height) return false
  if (!Array.isArray(state.agents) || !Array.isArray(state.history)) return false
  return state.tiles.every((tile) => tile && typeof tile === 'object' && tileKinds.includes((tile as { kind?: TileKind }).kind ?? 'empty')) &&
    state.agents.every((agent) => agent && typeof agent === 'object' && typeof (agent as { id?: unknown }).id === 'string' && agentKinds.includes((agent as { kind?: AgentKind }).kind ?? 'pollinator'))
}
