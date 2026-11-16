// A tiny seeded random source (mulberry32) so a screenshot scene and a
// replay always draw the same world from the same seed.

export function makeRandom(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickRandom(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

export function shuffleCopy(rng, list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

// A point on the arena's rim, just outside the view, for spawning shades.
export function rimPoint(rng, width, height, margin) {
  const side = Math.floor(rng() * 4);
  if (side === 0) return { x: rng() * width, y: -margin };
  if (side === 1) return { x: width + margin, y: rng() * height };
  if (side === 2) return { x: rng() * width, y: height + margin };
  return { x: -margin, y: rng() * height };
}
