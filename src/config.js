import * as THREE from 'three';

// Dirección hacia el sol (sol bajo de tarde, ~18° de elevación, a la izquierda de la vista inicial).
export const SUN_DIR = new THREE.Vector3(-0.532, 0.309, -0.788).normalize();

// Colores del cielo/polvo. FOG_COLOR coincide con el color del cielo justo en el horizonte.
export const SKY_HORIZON = new THREE.Color(0xdd8f55); // caramelo
export const SKY_PEACH = new THREE.Color(0xe8a070);   // durazno
export const SKY_ZENITH = new THREE.Color(0xa5602f);  // ocre alto
export const SKY_DUST = new THREE.Color(0xeaa874);    // banda de polvo
export const FOG_COLOR = SKY_HORIZON.clone().lerp(SKY_DUST, 0.5);

// Dirección en el cielo a partir de azimut (rad, hacia la izquierda desde -Z) y elevación (rad).
export function skyDir(az, el) {
  return new THREE.Vector3(-Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
}
