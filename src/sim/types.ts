export type TileKind = 'empty' | 'root' | 'gear' | 'lens' | 'pipe' | 'bell' | 'mirror' | 'decay'
export type Signal = 'amber' | 'blue' | 'violet' | 'decay'
export type AgentKind = 'pollinator' | 'tinker' | 'mite'

export interface Tile {
  kind: TileKind
  rot: number
  energy: number
  signal?: Signal
}

export interface Agent {
  id: string
  kind: AgentKind
  x: number
  y: number
  goal: string
  carrying?: Signal
  mood: number
}

export interface EventLog {
  tick: number
  text: string
  tone: 'good' | 'warn' | 'weird' | 'info'
}

export interface GardenState {
  seed: string
  width: number
  height: number
  tick: number
  tiles: Tile[]
  agents: Agent[]
  selected: TileKind
  paused: boolean
  focus?: string
  history: EventLog[]
  urge: string
}

export type Action =
  | { type: 'place'; x: number; y: number; kind: TileKind }
  | { type: 'rotate'; x: number; y: number }
  | { type: 'inject'; x: number; y: number; signal: Signal; amount?: number }
  | { type: 'step'; ticks: number }
  | { type: 'select'; kind: TileKind }
  | { type: 'reset'; seed: string }
  | { type: 'pause'; paused: boolean }
  | { type: 'scent'; x: number; y: number; signal: Signal }
  | { type: 'import'; state: GardenState }

export interface Summary {
  hash: string
  tick: number
  amber: number
  blue: number
  violet: number
  decay: number
  occupiedAgents: number
  urgeScore: number
}
