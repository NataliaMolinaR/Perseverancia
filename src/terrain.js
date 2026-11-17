import * as THREE from 'three';
import { fbm, simplex2 } from './noise.js';

// Viento hacia +along. Las dunas tienen cara suave a barlovento y cara de deslizamiento empinada.
const WIND = 0.35;
const CW = Math.cos(WIND);
const SW = Math.sin(WIND);

export function heightAt(x, z) {
  const along = x * CW + z * SW;
  const across = -x * SW + z * CW;

  const macro = fbm(x * 0.0035 + 11, z * 0.0035 + 5, 3) * 9;      // relieve de fondo
  const mask = 0.6 + 0.4 * fbm(x * 0.006 + 40, z * 0.006 + 7, 2);    // zonas más/menos dunosas
  const warp = fbm(x * 0.01 + 3, z * 0.01 + 9, 3) * 1.6;

  // Cresta en media luna: |sin| produce arcos encadenados con los "cuernos" hacia sotavento.
  const s = Math.sin(across * 0.027 + warp * 2);
  const bend = Math.sqrt(s * s + 0.15) * 1.15;

  const u = along * 0.03 + warp + bend;
  const p = u - Math.floor(u);
  // Perfil asimétrico: subida suave a barlovento, caída empinada a sotavento; cresta redondeada con un mínimo suave.
  const rise = Math.pow(p / 0.72, 1.7);
  const fall = Math.pow((1 - p) / 0.28, 1.3);
  const k = 0.5;
  const hh = Math.max(k - Math.abs(rise - fall), 0) / k;
  const profile = Math.min(rise, fall) - hh * hh * k * 0.25;

  const dunes = profile * 7 * mask;
  const ripples = fbm(x * 0.09, z * 0.09, 2) * 0.22 + simplex2(x * 0.25, z * 0.25) * 0.05;
  return macro + dunes + ripples;
}

const C = {
  rust: new THREE.Color(0xa94524),
  ochre: new THREE.Color(0xc9814a),
  sand: new THREE.Color(0xe0a66c),
  mauve: new THREE.Color(0x6e3b46),
  basalt: new THREE.Color(0x4a2e2e),
};

// Grano de arena: ruido blanco suavizado (3x3 con wrap → tileable), usado como bump.
function grainTexture(n = 256) {
  const raw = new Float32Array(n * n).map(() => Math.random());
  const data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      let sum = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) sum += raw[((y + dy + n) % n) * n + ((x + dx + n) % n)];
      const v = Math.min(255, Math.max(0, ((sum / 9 - 0.5) * 3 + 0.5) * 255));
      data.set([v, v, v, 255], (y * n + x) * 4);
    }
  }
  const tex = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  tex.repeat.set(70, 70);
  tex.needsUpdate = true;
  return tex;
}

export function createTerrain(size = 700, seg = 500) {
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
  geo.computeVertexNormals();

  // Color por altura, pendiente y manchas de arena oscura (basáltica).
  const nor = geo.attributes.normal;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const ss = THREE.MathUtils.smoothstep;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const slope = 1 - nor.getY(i);
    const hN = THREE.MathUtils.clamp((y + 6) / 22, 0, 1);

    c.copy(C.rust).lerp(C.ochre, ss(hN, 0.15, 0.6)).lerp(C.sand, ss(hN, 0.55, 0.95) * 0.7);
    c.multiplyScalar(0.9 + (simplex2(x * 0.15, z * 0.15) * 0.5 + 0.5) * 0.2);
    c.lerp(C.basalt, ss(fbm(x * 0.02 + 50, z * 0.02 + 20, 3), 0.1, 0.5) * 0.55 * (1 - hN * 0.6));
    c.lerp(C.mauve, ss(slope, 0.03, 0.2) * 0.55);

    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 1, metalness: 0,
      bumpMap: grainTexture(), bumpScale: 0.45,
    })
  );
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  // Sombra con caras traseras: evita el "acné" en el terminador de las crestas (luz rasante).
  mesh.material.shadowSide = THREE.BackSide;
  return mesh;
}
