import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import './App.css'
import { createGarden, exportMarkdown, summarize } from './sim/engine'
import { makeDebugApi } from './sim/debug'
import { reduceGarden } from './sim/reducer'
import { isGardenState } from './sim/validate'
import type { Action, Signal, TileKind } from './sim/types'

const tileKinds: TileKind[] = ['root', 'gear', 'lens', 'pipe', 'bell', 'mirror', 'decay']
const signals: Signal[] = ['amber', 'blue', 'violet', 'decay']
const icons: Record<TileKind, string> = { empty: '·', root: '〽', gear: '⚙', lens: '◌', pipe: '═', bell: '◍', mirror: '◇', decay: '✕' }

function init() {
  const params = new URLSearchParams(location.search)
  const seed = params.get('seed') || 'ryo-042'
  return createGarden(seed.slice(0, 40) || 'ryo-042')
}

function App() {
  const [state, rawDispatch] = useReducer(reduceGarden, undefined, init)
  const stateRef = useRef(state)
  const [json, setJson] = useState('')
  const [copied, setCopied] = useState('')
  const summary = useMemo(() => summarize(state), [state])

  useEffect(() => { stateRef.current = state }, [state])

  const dispatch = (action: Action) => rawDispatch(action)

  useEffect(() => {
    window.__APP_DEBUG__ = makeDebugApi(() => stateRef.current, (action) => {
      const predicted = reduceGarden(stateRef.current, action)
      stateRef.current = predicted
      rawDispatch(action)
      return predicted
    })
    return () => { delete window.__APP_DEBUG__ }
  }, [])

  const share = async () => {
    const url = new URL(location.href)
    url.searchParams.set('seed', state.seed)
    url.hash = `tick-${state.tick}-${summary.hash}`
    try {
      await navigator.clipboard.writeText(url.toString())
      setCopied('share URL copied')
    } catch {
      setCopied(url.toString())
    }
  }

  const copyBrief = async () => {
    const brief = exportMarkdown(state)
    try {
      await navigator.clipboard.writeText(brief)
      setCopied('brief copied')
    } catch {
      setCopied(brief)
    }
  }

  const importState = () => {
    try {
      const parsed: unknown = JSON.parse(json)
      if (!isGardenState(parsed)) throw new Error('invalid garden state')
      rawDispatch({ type: 'import', state: parsed })
      setCopied('imported garden state')
    } catch {
      setCopied('import failed: the jar rejected that JSON')
    }
  }

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">autonomous garden / debug toy / seeded replay</p>
          <h1>Patchwork Machine Garden</h1>
          <p className="subtitle">A tiny inspectable ecology where agents reroute amber, steal violet, repair gears, and leave an evidence trail Hermes can operate.</p>
        </div>
        <div className="scoreCard" aria-label="garden summary">
          <span>urge score</span><strong>{summary.urgeScore}</strong><small>hash {summary.hash}</small>
        </div>
      </section>

      <section className="workspace">
        <aside className="panel tray" aria-label="tile tray">
          <h2>1. Pick a machine organ</h2>
          <div className="tiles">
            {tileKinds.map((kind) => <button aria-pressed={state.selected === kind} className={state.selected === kind ? 'active' : ''} key={kind} onClick={() => dispatch({ type: 'select', kind })}>{icons[kind]} {kind}</button>)}
          </div>
          <h2>2. Inject signal</h2>
          <div className="tiles signals">
            {signals.map((signal) => <button key={signal} onClick={() => dispatch({ type: 'inject', x: 4, y: 3, signal, amount: signal === 'decay' ? 2 : 5 })}>{signal}</button>)}
          </div>
          <div className="controls">
            <button onClick={() => dispatch({ type: 'step', ticks: 12 })}>advance 12 ticks</button>
            <button onClick={() => dispatch({ type: 'step', ticks: 80 })}>let agents argue ×80</button>
            <button onClick={() => dispatch({ type: 'reset', seed: `${state.seed}-fork` })}>fork seed</button>
          </div>
        </aside>

        <section className="gardenWrap" aria-label="interactive garden grid">
          <div className="gardenMeta">
            <span>seed <b>{state.seed}</b></span><span>tick <b>{state.tick}</b></span><span>amber {summary.amber}</span><span>blue {summary.blue}</span><span>violet {summary.violet}</span><span>decay {summary.decay}</span>
          </div>
          <div className="garden" style={{ gridTemplateColumns: `repeat(${state.width}, minmax(34px, 1fr))` }}>
            {state.tiles.map((tile, i) => {
              const x = i % state.width
              const y = Math.floor(i / state.width)
              const agent = state.agents.find((a) => a.x === x && a.y === y)
              return <button key={`${x}-${y}`} className={`cell ${tile.kind} ${tile.signal ?? ''}`} onClick={(event) => event.shiftKey ? dispatch({ type: 'rotate', x, y }) : dispatch({ type: 'place', x, y, kind: state.selected })} aria-label={`cell ${x},${y} ${tile.kind} ${tile.signal ?? 'no signal'}`}>
                <span className="glyph" style={{ transform: `rotate(${tile.rot * 90}deg)` }}>{agent ? (agent.kind === 'pollinator' ? '🐝' : agent.kind === 'tinker' ? '🛠' : '🕷') : icons[tile.kind]}</span>
                <i style={{ height: `${Math.min(100, tile.energy * 8)}%` }} />
              </button>
            })}
          </div>
          <p className="hint">Click places the selected tile. Shift-click rotates. Agents move after “advance” and write the log.</p>
        </section>

        <aside className="panel inspector">
          <h2>Agent intentions</h2>
          {state.agents.map((agent) => <article key={agent.id} className="agent"><b>{agent.id}</b><span>{agent.goal}</span><small>at {agent.x},{agent.y} mood {agent.mood}</small></article>)}
          <h2>Debug/API surface</h2>
          <code>window.__APP_DEBUG__.step(25)</code>
          <code>window.__APP_DEBUG__.dispatch({`{type:'place',x:1,y:1,kind:'mirror'}`})</code>
          <code>window.__APP_DEBUG__.exportMarkdown()</code>
          <div className="controls"><button onClick={share}>copy share URL</button><button onClick={copyBrief}>copy brief</button></div>
          {copied && <p className="copied">{copied}</p>}
        </aside>
      </section>

      <section className="lower">
        <section className="panel log"><h2>Event trail</h2>{state.history.slice(0, 10).map((event) => <p key={`${event.tick}-${event.text}`} className={event.tone}>t{event.tick}: {event.text}</p>)}</section>
        <section className="panel export"><h2>Import / export jar</h2><textarea aria-label="Import or export garden JSON" value={json} onChange={(event) => setJson(event.target.value)} placeholder="Paste exported JSON here, or press Export JSON." /><div className="controls"><button onClick={() => setJson(JSON.stringify(state, null, 2))}>export JSON</button><button onClick={importState}>import JSON</button></div></section>
      </section>
    </main>
  )
}

export default App
