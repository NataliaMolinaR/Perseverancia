import * as THREE from 'three';
import { SUN_DIR, FOG_COLOR } from './config.js';
import { heightAt, createTerrain } from './terrain.js';
import { createSky } from './sky.js';
import { createMoons } from './moons.js';
import { createRocks } from './rocks.js';
import { createDust } from './dust.js';

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.autoClear = false; // dos pasadas: cielo y mundo
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);

// ---------- Escena de cielo: degradado + sol + lunas, con luz propia para las lunas ----------
// (Aparte del mundo para que las lunas se vean bien iluminadas aunque el sol quede delante de ellas.)
const skyScene = new THREE.Scene();
const skyGroup = new THREE.Group(); // sigue a la cámara: parece infinitamente lejos
const moons = createMoons();
skyGroup.add(createSky(), moons.group);
skyScene.add(skyGroup);
const moonLight = new THREE.DirectionalLight(0xffdcb0, 3);
moonLight.position.set(-0.85, 0.25, 0.35);
skyScene.add(moonLight, new THREE.AmbientLight(0xd9a98a, 0.35));

// ---------- Escena del mundo: niebla de polvo, sol cálido bajo + relleno suave ----------
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(FOG_COLOR, 0.0065);

const sun = new THREE.DirectionalLight(0xffbf85, 3.5);
sun.position.copy(SUN_DIR).multiplyScalar(180);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -130, right: 130, top: 130, bottom: -130, near: 1, far: 420 });
sun.shadow.bias = -0.0003;
sun.shadow.normalBias = 0.15;
scene.add(sun, sun.target);
// Luz difusa del cielo polvoriento: en Marte las sombras nunca son negras.
scene.add(new THREE.HemisphereLight(0xeaa878, 0xa8644a, 1.5));

scene.add(createTerrain());
scene.add(createRocks(heightAt));
const dust = createDust(heightAt);
scene.add(dust.group);

// ---------- Resize ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Cámara lenta tipo película: vaivén en arco, siguiendo el relieve ----------
// Para depurar: ?cam=x,y,z,tx,ty,tz fija la cámara en un punto de vista.
const fixedCam = new URLSearchParams(location.search).get('cam')?.split(',').map(Number);
const R = 48;
let camY = heightAt(0, R) + 3.4;
function updateCamera(t) {
  if (fixedCam?.length === 6 && fixedCam.every(Number.isFinite)) {
    camera.position.set(fixedCam[0], fixedCam[1], fixedCam[2]);
    camera.lookAt(fixedCam[3], fixedCam[4], fixedCam[5]);
    return;
  }
  const a = 0.25 + Math.sin(t * 0.05) * 0.15;
  const x = Math.sin(a) * R;
  const z = Math.cos(a) * R;
  camY += (heightAt(x, z) + 3.4 - camY) * 0.05;
  camera.position.set(x, camY + Math.sin(t * 0.3) * 0.15, z);
  camera.lookAt(Math.sin(t * 0.11) * 1.5, camY + 7 + Math.sin(t * 0.17) * 0.5, 0);
}

const clock = new THREE.Clock();
function animate() {
  const dt = Math.min(clock.getDelta(), 0.1);
  const t = clock.elapsedTime;
  updateCamera(t);
  skyGroup.position.copy(camera.position);
  moons.update(t);
  dust.update(dt, t);

  renderer.clear();
  renderer.render(skyScene, camera);
  renderer.clearDepth();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
