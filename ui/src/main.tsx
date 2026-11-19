import React from 'react'
import { createRoot } from 'react-dom/client'

import './styles.css'
import App from './App'
import { ParamProvider, TelemetryProvider } from './store'

const el = document.getElementById('root')
if (!el) throw new Error('missing #root')

createRoot(el).render(
  <React.StrictMode>
    <ParamProvider>
      <TelemetryProvider>
        <App />
      </TelemetryProvider>
    </ParamProvider>
  </React.StrictMode>,
)
