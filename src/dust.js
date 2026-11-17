import * as THREE from 'three';
import { mulberry32 } from './noise.js';

const X0 = -90, X1 = 90, Z0 = -150, Z1 = 70;
const WIND = new THREE.Vector2(0.9, 0.35);

function softSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// Polvo flotante: dos capas de Points (grano fino brillante + neblina grande y tenue) que derivan con el viento
// y siguen el relieve del terreno.
export function createDust(heightAt) {
  const rand = mulberry32(99);
  const sprite = softSprite();
  const group = new THREE.Group();

  const layers = [
    { count: 3200, size: 0.45, opacity: 0.7, color: 0xd99562, speed: 1.0, maxH: 9 },
    { count: 300, size: 7, opacity: 0.13, color: 0xd9935f, speed: 0.6, maxH: 6 },
  ].map((cfg) => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(cfg.count * 3);
    const off = new Float32Array(cfg.count);
    const phase = new Float32Array(cfg.count);
    for (let i = 0; i < cfg.count; i++) {
      pos[i * 3] = X0 + rand() * (X1 - X0);
      pos[i * 3 + 2] = Z0 + rand() * (Z1 - Z0);
      off[i] = 0.3 + rand() * cfg.maxH;
      phase[i] = rand() * Math.PI * 2;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        map: sprite, color: cfg.color, size: cfg.size, opacity: cfg.opacity,
        transparent: true, depthWrite: false, sizeAttenuation: true,
      })
    );
    pts.frustumCulled = false;
    group.add(pts);
    return { cfg, pos, off, phase, geo };
  });

  return {
    group,
    update(dt, t) {
      for (const { cfg, pos, off, phase, geo } of layers) {
        for (let i = 0; i < cfg.count; i++) {
          const k = i * 3;
          const ph = phase[i];
          let x = pos[k] + (WIND.x + Math.sin(t * 0.7 + ph) * 0.3) * dt * cfg.speed;
          let z = pos[k + 2] + (WIND.y + Math.cos(t * 0.5 + ph) * 0.3) * dt * cfg.speed;
          if (x > X1) x -= X1 - X0; else if (x < X0) x += X1 - X0;
          if (z > Z1) z -= Z1 - Z0; else if (z < Z0) z += Z1 - Z0;
          pos[k] = x;
          pos[k + 2] = z;
          pos[k + 1] = heightAt(x, z) + off[i] + Math.sin(t * 0.5 + ph) * 0.2;
        }
        geo.attributes.position.needsUpdate = true;
      }
    },
  };
}
