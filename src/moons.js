import * as THREE from 'three';
import { simplex2, mulberry32 } from './noise.js';
import { skyDir } from './config.js';

// Texturas procedurales (color + relieve) con cráteres, en formato equirectangular.
function craterTextures(seed, base, craters, bigCrater) {
  const W = 1024, H = 512;
  const rand = mulberry32(seed);
  const make = () => {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    return [c, c.getContext('2d')];
  };
  const [colCanvas, col] = make();
  const [bumpCanvas, bump] = make();

  col.fillStyle = base; col.fillRect(0, 0, W, H);
  bump.fillStyle = '#808080'; bump.fillRect(0, 0, W, H);

  // Grano de fondo
  for (let i = 0; i < 4000; i++) {
    const v = rand() * 255;
    col.fillStyle = `rgba(${v},${v},${v},0.06)`;
    col.beginPath(); col.arc(rand() * W, rand() * H, 2 + rand() * 10, 0, 7); col.fill();
  }

  const drawCrater = (x, y, r) => {
    for (const dx of [-W, 0, W]) {
      const cx = x + dx;
      let g = col.createRadialGradient(cx, y, 0, cx, y, r * 1.25);
      g.addColorStop(0, 'rgba(0,0,0,0.20)');
      g.addColorStop(0.7, 'rgba(0,0,0,0.10)');
      g.addColorStop(0.88, 'rgba(255,255,255,0.18)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      col.fillStyle = g; col.fillRect(cx - r * 1.3, y - r * 1.3, r * 2.6, r * 2.6);

      g = bump.createRadialGradient(cx, y, 0, cx, y, r * 1.25);
      g.addColorStop(0, 'rgba(70,70,70,0.7)');
      g.addColorStop(0.75, 'rgba(105,105,105,0.4)');
      g.addColorStop(0.88, 'rgba(200,200,200,0.7)');
      g.addColorStop(1, 'rgba(128,128,128,0)');
      bump.fillStyle = g; bump.fillRect(cx - r * 1.3, y - r * 1.3, r * 2.6, r * 2.6);
    }
  };
  if (bigCrater) drawCrater(W * 0.3, H * 0.5, bigCrater);
  for (let i = 0; i < craters; i++) drawCrater(rand() * W, H * 0.12 + rand() * H * 0.76, 4 + Math.pow(rand(), 2.2) * 55);

  const map = new THREE.CanvasTexture(colCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return { map, bump: new THREE.CanvasTexture(bumpCanvas) };
}

// Esfera irregular: ruido sobre la superficie + escalado no uniforme.
function createMoon({ radius, scale, base, craters, bigCrater, seed, bumpScale }) {
  const geo = new THREE.SphereGeometry(1, 64, 32);
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = simplex2(v.x * 2.1 + v.z * 1.3 + seed, v.y * 2.1 - v.z * 1.7 + seed) * 0.12;
    v.multiplyScalar(1 + n);
    p.setXYZ(i, v.x, v.y, v.z);
  }

  const { map, bump } = craterTextures(seed, base, craters, bigCrater);
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      map, bumpMap: bump, bumpScale,
      roughness: 1, metalness: 0,
      emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 0.25, // luz difusa del cielo polvoriento
      fog: false,
    })
  );
  mesh.scale.set(radius * scale[0], radius * scale[1], radius * scale[2]);
  return mesh;
}

// Fobos (mayor, irregular, gris parduzca) y Deimos (menor, más clara y lisa).
export function createMoons(distance = 700) {
  const group = new THREE.Group();

  const phobos = createMoon({
    radius: 30, scale: [1.25, 1.0, 0.9], base: '#9a8570', craters: 70, bigCrater: 110, seed: 5, bumpScale: 1.5,
  });
  phobos.position.copy(skyDir(-0.28, 0.40).multiplyScalar(distance));

  const deimos = createMoon({
    radius: 14, scale: [1.0, 0.85, 0.8], base: '#c6ad8e', craters: 30, bigCrater: 0, seed: 11, bumpScale: 1,
  });
  deimos.position.copy(skyDir(0.10, 0.52).multiplyScalar(distance));

  group.add(phobos, deimos);
  return {
    group,
    update(t) {
      phobos.rotation.y = t * 0.02;
      deimos.rotation.y = t * 0.01;
    },
  };
}
