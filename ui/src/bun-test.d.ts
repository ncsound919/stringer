// Minimal type shim so `tsc --noEmit` does not fail on bun:test imports when
// the project is checked outside the Bun runtime (bun-types is optional).
declare module 'bun:test' {
  export const describe: any
  export const test: any
  export const it: any
  export const expect: any
  export const beforeAll: any
  export const afterAll: any
  export const beforeEach: any
  export const afterEach: any
  export const mock: any
}
