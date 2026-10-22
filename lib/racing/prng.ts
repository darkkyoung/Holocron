// FNV-1a UTF-16 code-unit seed expansion + Mulberry32. Integer-only state.
// Reproducible, not cryptographically secure: production seed commitments are a
// later server/persistence concern; this prototype exposes its seed deliberately.
export function randomStream(seed: string, domain: string) {
  let state = 2166136261;
  for (const c of `${seed}|${domain}`) state = Math.imul(state ^ c.charCodeAt(0), 16777619) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function qualifying(seed: string, version: string, ids: readonly string[]) {
  const random = randomStream(seed, `${version}:qualifying`), grid = [...ids];
  for (let i = grid.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [grid[i], grid[j]] = [grid[j], grid[i]];
  }
  return grid;
}
