import * as THREE from 'three';

// Una sola geometría de caja para todo el juego: cada bloque se escala.
export const GEO_CAJA = new THREE.BoxGeometry(1, 1, 1);

const materiales = new Map();

// Materiales compartidos por color (menos cambios de estado al dibujar).
export function mat(color) {
  let m = materiales.get(color);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color });
    materiales.set(color, m);
  }
  return m;
}

// Bloque de w x h x d centrado en (x, y, z).
export function caja(w, h, d, color, x = 0, y = 0, z = 0) {
  const material = color instanceof THREE.Material ? color : mat(color);
  const m = new THREE.Mesh(GEO_CAJA, material);
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  return m;
}

// Random con semilla, para que árboles y nubes salgan siempre igual.
export function aleatorio(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Formato abreviado: 950, 1.2K, 35.5K, 120K, 3.5M...
export function formato(n) {
  n = Math.floor(n);
  if (n < 1000) return String(n);
  const unidades = ['K', 'M', 'B', 'T', 'Qa', 'Qi'];
  let i = -1;
  let v = n;
  while (v >= 1000 && i < unidades.length - 1) { v /= 1000; i++; }
  let s = v < 100 ? (Math.floor(v * 10) / 10).toFixed(1) : String(Math.floor(v));
  if (s.endsWith('.0')) s = s.slice(0, -2);
  return s + unidades[i];
}
