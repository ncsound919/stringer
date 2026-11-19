import { describe, test, expect } from 'bun:test'
import React from 'react'
import { render, screen } from '@testing-library/react'
import App from './App'
import { ParamProvider, TelemetryProvider } from './store'

describe('App', () => {
  test('renders without crashing', () => {
    render(
      <ParamProvider>
        <TelemetryProvider>
          <App />
        </TelemetryProvider>
      </ParamProvider>,
    )
    expect(screen.getByText(/FORM/)).toBeTruthy()
  })

  test('shows Instrument nav tabs', () => {
    render(
      <ParamProvider>
        <TelemetryProvider>
          <App />
        </TelemetryProvider>
      </ParamProvider>,
    )
    expect(screen.getAllByText('Instrument').length).toBeGreaterThan(0)
    expect(screen.getByText('Performance')).toBeTruthy()
    expect(screen.getByText('Output')).toBeTruthy()
  })
})