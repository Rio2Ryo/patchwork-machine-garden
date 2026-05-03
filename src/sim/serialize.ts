import type { GardenState } from './types'

export function encodeState(state: GardenState): string {
  return btoa(encodeURIComponent(JSON.stringify(state)))
}

export function decodeState(encoded: string): GardenState | null {
  try {
    return JSON.parse(decodeURIComponent(atob(encoded))) as GardenState
  } catch {
    return null
  }
}

export function encodeStateNode(state: GardenState): string {
  return Buffer.from(JSON.stringify(state), 'utf8').toString('base64url')
}
