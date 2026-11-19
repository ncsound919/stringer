import { describe, test, expect } from 'bun:test'
import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { InstrumentCanvas } from './Instruments'

// P26: instrument canvas hotspots must be keyboard reachable and activate
// their part on Enter/Space.
describe('instrument canvas hotspots', () => {
  const renderCanvas = (instrument: number) => {
    const selected: string[] = []
    const focused: string[] = []
    const { container } = render(
      <InstrumentCanvas
        instrument={instrument}
        selected=""
        onSelect={(p) => selected.push(p)}
        onFocusPart={(p) => focused.push(p)}
        notes={[]}
      />,
    )
    return { container, selected, focused }
  }

  test('all hotspots are focusable and tagged with data-part', () => {
    for (const instrument of [0, 1, 2]) {
      const { container } = renderCanvas(instrument)
      const hotspots = container.querySelectorAll('g.hot')
      expect(hotspots.length).toBeGreaterThanOrEqual(3)
      hotspots.forEach((el) => {
        expect(el.getAttribute('tabindex')).toBe('0')
        expect(el.getAttribute('data-part')).toBeTruthy()
      })
    }
  })

  test('Enter activates the focused hotspot', () => {
    const { container, selected } = renderCanvas(1)
    const first = container.querySelector('g.hot') as Element
    fireEvent.keyDown(first, { key: 'Enter' })
    expect(selected[0]).toBe(first.getAttribute('data-part'))
  })

  test('focus reports the part for focus preservation on mode switch', () => {
    const { container, focused } = renderCanvas(0)
    const first = container.querySelector('g.hot') as Element
    fireEvent.focus(first)
    expect(focused[0]).toBe(first.getAttribute('data-part'))
  })
})
