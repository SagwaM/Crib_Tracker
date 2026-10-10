// Minimal bun:test typings — pulling in full @types/bun breaks the generated
// Supabase clients (Bun's fetch type lacks `preconnect`).
declare module "bun:test" {
  export function describe(name: string, fn: () => void): void;
  export function test(name: string, fn: () => void | Promise<void>): void;
  export function expect(actual: unknown): {
    toBe(expected: unknown): void;
    toEqual(expected: unknown): void;
    toHaveLength(expected: number): void;
  };
}
