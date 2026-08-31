/** Vite/vitest lets a test read a file verbatim with the `?raw` suffix. */
declare module "*?raw" {
  const content: string;
  export default content;
}
