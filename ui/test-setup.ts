import GlobalWindow from 'happy-dom/lib/window/GlobalWindow.js'
const window = new (GlobalWindow as any)()
// @ts-ignore
globalThis.window = window
// @ts-ignore
globalThis.document = window.document
// @ts-ignore
globalThis.navigator = window.navigator

// happy-dom does not expose rAF on the global in this setup. Run it as a no-op:
// the stores' rAF loops must not schedule work in unit tests (avoids act() churn
// and 5 s timeouts); assertions only read the initial render.
if (!(globalThis as any).requestAnimationFrame) {
  ;(globalThis as any).requestAnimationFrame = () => 0
  ;(globalThis as any).cancelAnimationFrame = () => {}
}
// @ts-ignore
if (!window.requestAnimationFrame) window.requestAnimationFrame = (globalThis as any).requestAnimationFrame
// @ts-ignore
if (!window.cancelAnimationFrame) window.cancelAnimationFrame = (globalThis as any).cancelAnimationFrame
