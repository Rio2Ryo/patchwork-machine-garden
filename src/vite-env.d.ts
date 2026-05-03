/// <reference types="vite/client" />
/// <reference types="vitest" />

import type { DebugApi } from './sim/debug'

declare global {
  interface Window {
    __APP_DEBUG__?: DebugApi
  }
}
