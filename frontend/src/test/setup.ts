import '@testing-library/jest-dom/vitest'

// jsdom lacks ResizeObserver — the canvas components use it for responsive redraw.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!('ResizeObserver' in globalThis)) {
  ;(globalThis as Record<string, unknown>).ResizeObserver = ResizeObserverStub
}

if (!('requestAnimationFrame' in globalThis)) {
  ;(globalThis as Record<string, unknown>).requestAnimationFrame = (cb: FrameRequestCallback) =>
    window.setTimeout(() => cb(performance.now()), 16)
}
