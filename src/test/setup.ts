import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

/**
 * jsdom implements neither of these, and both are touched during a normal
 * render: `matchMedia` by the theme and responsive hooks, `ResizeObserver` by
 * the charting library.
 */
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
