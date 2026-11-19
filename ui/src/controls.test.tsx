import { describe, test, expect } from 'bun:test'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { parseEntry } from './components/Controls'
import { ParamProvider } from './store'

describe('parseEntry', () => {
  test('numeric plain', () => {
    const p: any = { min: 0, max: 1, unit: '' }
    expect(parseEntry(p, '0.5')).toBe(0.5)
  })
  test('choices by prefix', () => {
    const p: any = { min: 0, max: 2, unit: '', choices: ['Acoustic', 'Strat', 'P Bass'] }
    expect(parseEntry(p, 'str')).toBe(1)
  })
  test('choices by number', () => {
    const p: any = { min: 0, max: 2, unit: '', choices: ['Acoustic', 'Strat', 'P Bass'] }
    expect(parseEntry(p, '2')).toBe(2)
  })
  test('dB small value snaps to 0', () => {
    const p: any = { min: -24, max: 12, unit: 'dB' }
    expect(parseEntry(p, '0.1')).toBe(0)
  })
  test('m unit converts', () => {
    const p: any = { min: 0, max: 1, unit: 'm' }
    // v=0.2075m? input meters -> (m-0.05)/0.45; input 0.5 m -> (0.5-0.05)/0.45=1.0
    expect(parseEntry(p, '0.5')).toBeCloseTo(1, 5)
  })
  test('invalid returns null', () => {
    const p: any = { min: 0, max: 1, unit: '' }
    expect(parseEntry(p, '!!!')).toBeNull()
  })
})

describe('Controls components', () => {
  test('Segmented renders choices', () => {
    render(
      <ParamProvider>
        {/* @ts-ignore */}
        <div />
      </ParamProvider>,
    )
  })

  test('Readout renders', async () => {
    const { Readout } = await import('./components/Controls')
    render(<Readout k="Peak" v="0 dB" />)
    expect(screen.getByText('Peak')).toBeTruthy()
    expect(screen.getByText('0 dB')).toBeTruthy()
  })
})