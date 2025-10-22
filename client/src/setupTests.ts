import '@testing-library/jest-dom/vitest';
import { beforeEach, vi } from 'vitest';

beforeEach(() => {
  vi.clearAllMocks();
});

// jsdom in vitest may not provide matchMedia; provide a minimal polyfill used by some UI libs
if (typeof window !== 'undefined' && !('matchMedia' in window)) {
  // @ts-expect-error - test environment
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
