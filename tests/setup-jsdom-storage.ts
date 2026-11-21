/**
 * Use jsdom's actual Web Storage in component tests.
 *
 * Node.js 25+ defines native localStorage/sessionStorage globals. Without
 * --localstorage-file they can be undefined, and Vitest's jsdom environment
 * will not overwrite properties that Node already defines.
 *
 * Scope this repair to jsdom test workers; node tests and production code
 * retain their normal globals. No in-memory fake Storage is introduced.
 */
const jsdom = (globalThis as typeof globalThis & {
  jsdom?: { window: Window };
}).jsdom;

if (jsdom) {
  for (const key of ['localStorage', 'sessionStorage'] as const) {
    const storage = jsdom.window[key];
    if (typeof storage?.setItem !== 'function') {
      throw new Error(`Vitest jsdom did not supply working ${key}`);
    }
    Object.defineProperty(globalThis, key, {
      configurable: true,
      enumerable: true,
      value: storage,
      writable: true,
    });
  }
}
