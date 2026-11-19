import React, { useCallback, useState } from 'react'

import { Footer, Header, Nav, type Page } from './components/Chrome'
import { resetAll } from './bridge'
import { useParams } from './store'
import { InstrumentWorkspace } from './workspaces/Instrument'
import { PerformanceWorkspace } from './workspaces/Performance'
import { OutputWorkspace } from './workspaces/Output'

const INSTRUMENT_THEMES = [
  {
    ia: '#b99d75',
    iaHot: '#e6d3b0',
    iaDim: 'rgba(185,157,117,0.14)',
    iaLine: 'rgba(185,157,117,0.34)',
    tint: 'rgba(185,157,117,0.05)',
  },
  {
    ia: '#8babb3',
    iaHot: '#c2d6db',
    iaDim: 'rgba(139,171,179,0.14)',
    iaLine: 'rgba(139,171,179,0.34)',
    tint: 'rgba(139,171,179,0.05)',
  },
  {
    ia: '#ad866e',
    iaHot: '#d4b39f',
    iaDim: 'rgba(173,134,110,0.14)',
    iaLine: 'rgba(173,134,110,0.34)',
    tint: 'rgba(173,134,110,0.05)',
  },
]

export default function App() {
  const { values } = useParams()
  const instrument = Math.max(0, Math.min(2, Math.round(values.instrument ?? 1)))
  const [page, setPage] = useState<Page>('instrument')
  const theme = INSTRUMENT_THEMES[instrument]

  const reset = useCallback(() => {
    resetAll()
  }, [])

  return (
    <div
      className="app"
      data-instrument={instrument}
      style={
        {
          '--ia': theme.ia,
          '--ia-hot': theme.iaHot,
          '--ia-dim': theme.iaDim,
          '--ia-line': theme.iaLine,
          '--instrument-tint': theme.tint,
        } as React.CSSProperties
      }
    >
      <Header instrument={instrument} onReset={reset} />
      <Nav page={page} onPage={setPage} />

      <main className="workspace">
        {page === 'instrument' && <InstrumentWorkspace instrument={instrument} />}
        {page === 'performance' && <PerformanceWorkspace instrument={instrument} />}
        {page === 'output' && <OutputWorkspace instrument={instrument} />}
      </main>

      <Footer />
    </div>
  )
}
