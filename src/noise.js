// Ruido simplex 2D + fbm, con semilla determinista.
const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;
const GRAD = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

export function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const perm = new Uint8Array(512);
(function initPerm(seed = 7) {
  const rand = mulberry32(seed);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
})();

export function simplex2(x, y) {
  const s = (x + y) * F2;
  const i = Math.floor(x + s);
  const j = Math.floor(y + s);
  const t = (i + j) * G2;
  const x0 = x - (i - t);
  const y0 = y - (j - t);
  const i1 = x0 > y0 ? 1 : 0;
  const j1 = x0 > y0 ? 0 : 1;
  const x1 = x0 - i1 + G2;
  const y1 = y0 - j1 + G2;
  const x2 = x0 - 1 + 2 * G2;
  const y2 = y0 - 1 + 2 * G2;
  const ii = i & 255;
  const jj = j & 255;

  let n = 0;
  const corner = (cx, cy, gi) => {
    let t = 0.5 - cx * cx - cy * cy;
    if (t < 0) return 0;
    t *= t;
    const g = GRAD[gi & 7];
    return t * t * (g[0] * cx + g[1] * cy);
  };
  n += corner(x0, y0, perm[ii + perm[jj]]);
  n += corner(x1, y1, perm[ii + i1 + perm[jj + j1]]);
  n += corner(x2, y2, perm[ii + 1 + perm[jj + 1]]);
  return 70 * n; // ~[-1, 1]
}

export function fbm(x, y, octaves = 5, lacunarity = 2, gain = 0.5) {
  let amp = 1, freq = 1, sum = 0, norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * simplex2(x * freq, y * freq);
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}
