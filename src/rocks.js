import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { fbm, simplex2, mulberry32 } from './noise.js';

// Icosaedro deformado con ruido (determinista por posición → sin grietas entre caras).
function rockGeometry(seed, flatten) {
  // Vértices soldados → normales suaves (sin el aspecto de "papel arrugado" del flat shading).
  let g = new THREE.IcosahedronGeometry(1, 4);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n =
      simplex2(v.x * 1.2 + v.z * 0.8 + seed, v.y * 1.2 - v.z * 1.0 + seed * 1.7) * 0.26 +
      simplex2(v.x * 3.2 - v.y * 1.3 + seed * 3, v.z * 3.2 + v.y * 0.7) * 0.07 -
      Math.abs(simplex2(v.x * 1.8 + seed * 2, v.y * 1.8 + v.z * 1.1 - seed)) * 0.26 - // aristas
      Math.abs(simplex2(v.x * 3.4 - seed, v.y * 3.4 + v.z * 2.2 + seed * 2)) * 0.08;   // grietas finas
    v.multiplyScalar(1 + n);
    v.y *= flatten;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

const DARK = new THREE.Color(0x5e4036);
const RUST = new THREE.Color(0xa86444);

// Rocas sembradas con más probabilidad en pendientes y en manchones; más densas cerca de la cámara.
export function createRocks(heightAt, total = 1100) {
  const rand = mulberry32(1234);
  const geos = [rockGeometry(3, 0.7), rockGeometry(20, 0.55), rockGeometry(37, 0.85)];
  const buckets = [[], [], []];
  const ss = THREE.MathUtils.smoothstep;

  let placed = 0;
  for (let tries = 0; placed < total && tries < total * 60; tries++) {
    const x = (rand() * 2 - 1) * 100;
    const z = -150 + rand() * 210;
    const d = Math.hypot(x - 11, z - 46);
    if (d < 16) continue; // zona libre alrededor de la cámara
    if (rand() > 1 / (1 + (d / 65) ** 2)) continue;

    const hx = heightAt(x + 1, z) - heightAt(x - 1, z);
    const hz = heightAt(x, z + 1) - heightAt(x, z - 1);
    const slope = Math.hypot(hx, hz) / 2;
    const cluster = ss(fbm(x * 0.03 + 90, z * 0.03 + 12, 2), -0.15, 0.45);
    if (rand() > Math.min(1, 0.3 + slope * 1.8) * (0.25 + 0.75 * cluster)) continue;

    buckets[placed % 3].push({ x, z, y: heightAt(x, z), s: 0.2 + 1.7 * Math.pow(rand(), 3), r: rand() });
    placed++;
  }

  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0 });
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const col = new THREE.Color();

  buckets.forEach((list, k) => {
    const mesh = new THREE.InstancedMesh(geos[k], mat, list.length);
    list.forEach((o, i) => {
      e.set(rand() * 0.5, rand() * Math.PI * 2, rand() * 0.5);
      q.setFromEuler(e);
      const sx = o.s * (0.8 + rand() * 0.5);
      const sz = o.s * (0.8 + rand() * 0.5);
      m.compose(new THREE.Vector3(o.x, o.y - o.s * 0.3, o.z), q, new THREE.Vector3(sx, o.s, sz));
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, col.copy(DARK).lerp(RUST, o.r).multiplyScalar(0.8 + rand() * 0.4));
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  });
  return group;
}
