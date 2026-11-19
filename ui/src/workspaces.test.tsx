import { describe, test, expect } from 'bun:test'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { ParamProvider, TelemetryProvider } from './store'
import { InstrumentWorkspace } from './workspaces/Instrument'
import { PerformanceWorkspace } from './workspaces/Performance'
import { OutputWorkspace } from './workspaces/Output'

const wrap = (node: React.ReactNode) => (
  <ParamProvider>
    <TelemetryProvider>{node}</TelemetryProvider>
  </ParamProvider>
)

describe('workspaces', () => {
  test('Instrument renders', () => {
    render(wrap(<InstrumentWorkspace instrument={1} />))
    expect(screen.getAllByText(/Instrument/).length).toBeGreaterThan(0)
  })
  test('Performance renders', () => {
    render(wrap(<PerformanceWorkspace instrument={0} />))
    expect(screen.getAllByText(/Contact/).length).toBeGreaterThan(0)
  })
  test('Output renders', () => {
    render(wrap(<OutputWorkspace instrument={1} />))
    expect(screen.getAllByText(/Output/).length).toBeGreaterThan(0)
  })
})