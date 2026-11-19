import { describe, test, expect } from 'bun:test'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { ParamProvider, useParams, useParam, TelemetryProvider, useTelemetry } from './store'

function ParamConsumer() {
  const { values } = useParams()
  return <div data-testid="v">{values.instrument}</div>
}

describe('store', () => {
  test('ParamProvider provides defaults', async () => {
    render(
      <ParamProvider>
        <ParamConsumer />
      </ParamProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('v').textContent).toBe('1'))
  })

  test('useParam returns param info', () => {
    function C() {
      const { p, v } = useParam('decay')
      return <div data-testid="d">{p.name}:{v}</div>
    }
    render(
      <ParamProvider>
        <C />
      </ParamProvider>,
    )
    expect(screen.getByTestId('d').textContent).toBe('Sustain:0.55')
  })

  test('TelemetryProvider default', () => {
    function C() {
      const t = useTelemetry()
      return <div data-testid="t">{t.voices}</div>
    }
    render(
      <TelemetryProvider>
        <C />
      </TelemetryProvider>,
    )
    expect(screen.getByTestId('t').textContent).toBe('0')
  })
})