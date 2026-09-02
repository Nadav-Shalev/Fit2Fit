/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare global {
  interface Window {
    /** Safari still exposes the prefixed constructor. */
    webkitAudioContext?: typeof AudioContext;
  }
}

export {};
