/**
 * Test setup file - runs before all tests
 * Configures global mocks and environment
 */

// Mock window for Leaflet and other browser APIs
if (typeof globalThis.window === 'undefined') {
  // @ts-ignore
  globalThis.window = globalThis;
}

// Mock requestAnimationFrame for Leaflet
if (typeof window.requestAnimationFrame === 'undefined') {
  window.requestAnimationFrame = (callback: FrameRequestCallback): number => {
    return setTimeout(() => callback(Date.now()), 16) as unknown as number;
  };
}

if (typeof window.cancelAnimationFrame === 'undefined') {
  window.cancelAnimationFrame = (id: number): void => {
    clearTimeout(id);
  };
}

// Mock document if needed
if (typeof document === 'undefined') {
  // @ts-ignore
  globalThis.document = {
    createElement: () => ({}),
    createElementNS: () => ({}),
  };
}
