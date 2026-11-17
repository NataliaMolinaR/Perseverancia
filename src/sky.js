import * as THREE from 'three';
import { SUN_DIR, SKY_HORIZON, SKY_PEACH, SKY_ZENITH, SKY_DUST } from './config.js';

// Cielo: horizonte caramelo → durazno → ocre alto, banda de polvo y halo solar.
export function createSky() {
  return new THREE.Mesh(
    new THREE.SphereGeometry(900, 48, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uSunDir: { value: SUN_DIR },
        uHorizon: { value: SKY_HORIZON },
        uPeach: { value: SKY_PEACH },
        uZenith: { value: SKY_ZENITH },
        uDust: { value: SKY_DUST },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uSunDir, uHorizon, uPeach, uZenith, uDust;
        varying vec3 vDir;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main() {
          vec3 d = normalize(vDir);
          float h = clamp(d.y, 0.0, 1.0);

          vec3 col = mix(uHorizon, uPeach, smoothstep(0.0, 0.18, h));
          col = mix(col, uZenith, smoothstep(0.12, 0.85, h));

          // Banda de polvo pegada al horizonte (coincide con el color de la niebla).
          col = mix(col, uDust, exp(-pow(h / 0.10, 2.0)) * 0.5);

          // Halo solar: difuso cálido, anillo azulado (típico de Marte) y disco.
          float sd = max(dot(d, uSunDir), 0.0);
          col += vec3(1.0, 0.65, 0.35) * pow(sd, 8.0) * 0.16;
          col += vec3(1.0, 0.75, 0.45) * pow(sd, 50.0) * 0.30;
          col += vec3(0.45, 0.62, 0.95) * pow(sd, 220.0) * 0.30;
          col = mix(col, vec3(1.6, 1.45, 1.2), smoothstep(0.99955, 0.99985, sd));

          col += (hash(gl_FragCoord.xy) - 0.5) / 255.0; // dither anti-banding
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    })
  );
}
