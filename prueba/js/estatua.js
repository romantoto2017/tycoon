import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { texturaDeCanvas } from './texturas.js';

// Estatua griega en el patio de atrás (al lado de la pileta): la pose del Júpiter de mármol
// (parado, el brazo izquierdo levantado con el cetro corto en la mano, el manto colgando de ese
// hombro por la espalda, el otro brazo abajo y abierto, el tronco de apoyo al costado de la
// pierna derecha), en mármol marfil y con la cara de Santi (herramientas/santi.py). Hecha con
// formas redondeadas (no de bloques) y unida en una sola malla. Al acercarte: "Leer testamento".
export const ESTATUA = { x: -34, z: -64 };
const TESTAMENTO = '"La mesera está buena, y el que perdona camina por el agua, yo ni nadar se" - Santiago Scumburdi';
const PEDESTAL = 1.75;
const CERCA = 6.5;

const tmp = new THREE.Vector3();
const arriba = new THREE.Vector3(0, 1, 0);

// Elipsoide (radios) en (x, y, z).
function elip(rx, ry, rz, x, y, z, seg = 20) {
  return new THREE.SphereGeometry(1, seg, Math.round(seg * 0.7)).scale(rx, ry, rz).translate(x, y, z);
}
// Hueso redondeado de a a b (radio r0 en a, r1 en b), con las puntas en esfera.
function hueso(a, b, r0, r1) {
  const A = new THREE.Vector3(...a);
  const B = new THREE.Vector3(...b);
  const largo = A.distanceTo(B);
  const g = new THREE.CylinderGeometry(r1, r0, largo, 16, 1, true);
  const q = new THREE.Quaternion().setFromUnitVectors(arriba, tmp.copy(B).sub(A).normalize());
  g.applyQuaternion(q).translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  return [g, elip(r0, r0, r0, ...a, 14), elip(r1, r1, r1, ...b, 14)];
}

// La figura (pies en y = 0, mirando a +z). Devuelve las geometrías del mármol.
function figura() {
  const gs = [];
  const add = (...g) => gs.push(...g.flat());
  // Piernas: la derecha (−x) firme, la izquierda suelta con la rodilla un poco adelante.
  add(hueso([-0.55, 5.0, 0], [-0.58, 2.7, 0.08], 0.7, 0.46), hueso([-0.58, 2.7, 0.08], [-0.58, 0.45, 0], 0.46, 0.29));
  add(hueso([0.55, 5.0, 0], [0.66, 2.75, 0.36], 0.68, 0.46), hueso([0.66, 2.75, 0.36], [0.8, 0.48, 0.18], 0.46, 0.29));
  add(elip(0.38, 0.55, 0.4, -0.58, 3.9, 0.14), elip(0.38, 0.55, 0.4, 0.64, 3.95, 0.32)); // cuádriceps
  add(elip(0.3, 0.5, 0.32, -0.58, 1.95, -0.16), elip(0.3, 0.5, 0.32, 0.72, 1.95, 0.12)); // gemelos
  add(elip(0.3, 0.16, 0.62, -0.56, 0.16, 0.28), elip(0.3, 0.16, 0.62, 0.8, 0.17, 0.42)); // pies
  // Torso: cadera, abdomen marcado, pecho, pectorales, hombros y trapecio.
  add(elip(1.08, 0.66, 0.68, 0, 5.05, 0));
  add(elip(0.98, 0.95, 0.62, 0, 5.95, 0.04));
  add(elip(1.32, 1.1, 0.8, 0, 7.05, 0));
  for (const s of [-1, 1]) {
    add(elip(0.6, 0.4, 0.34, s * 0.5, 7.15, 0.56));
    add(elip(0.58, 0.56, 0.56, s * 1.3, 7.6, 0)); // deltoides
    add(elip(0.36, 0.85, 0.36, s * 0.95, 6.1, 0.16)); // oblicuos
    for (const y of [5.7, 6.12, 6.54]) add(elip(0.21, 0.18, 0.13, s * 0.22, y, 0.58, 12)); // abdominales
  }
  add(elip(1.05, 0.36, 0.52, 0, 7.88, -0.12));
  add(hueso([0, 7.85, 0], [0, 8.55, 0.04], 0.46, 0.4));
  // Brazo derecho (−x): abajo, separado del cuerpo, la mano abierta a la altura de la cadera.
  add(hueso([-1.34, 7.55, 0], [-1.66, 5.95, 0.05], 0.44, 0.34), elip(0.3, 0.55, 0.32, -1.52, 6.85, 0.12));
  add(hueso([-1.66, 5.95, 0.05], [-1.92, 4.55, 0.36], 0.34, 0.22));
  add(elip(0.14, 0.38, 0.3, -1.98, 4.18, 0.42, 14));
  for (let k = 0; k < 4; k++) add(hueso([-2.0, 3.95, 0.3 + k * 0.08], [-2.06 - k * 0.03, 3.55, 0.32 + k * 0.1], 0.06, 0.05));
  // Brazo izquierdo (+x): levantado, con el cetro corto en el puño.
  add(hueso([1.34, 7.6, 0], [2.25, 8.35, 0.1], 0.44, 0.34), elip(0.55, 0.3, 0.33, 1.8, 8.0, 0.08));
  add(hueso([2.25, 8.35, 0.1], [2.4, 9.85, 0.15], 0.34, 0.23));
  add(elip(0.26, 0.32, 0.27, 2.4, 10.12, 0.15, 14));
  add(hueso([2.4, 9.95, 0.15], [2.4, 10.95, 0.15], 0.13, 0.12));
  // La hoja de parra (como en los museos).
  add(elip(0.32, 0.36, 0.08, 0, 4.72, 0.6, 12));
  // El tronco de apoyo al costado de la pierna derecha, con algún nudo.
  add(hueso([-1.15, 0, -0.55], [-1.12, 3.3, -0.5], 0.48, 0.38), elip(0.2, 0.26, 0.2, -1.5, 1.6, -0.45, 10), elip(0.18, 0.2, 0.18, -0.8, 2.6, -0.7, 10));
  return gs;
}

// El manto: tela con pliegues que cuelga del hombro izquierdo por atrás hasta la rodilla.
function manto() {
  const g = new THREE.PlaneGeometry(1.25, 5.2, 10, 30);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const t = (2.6 - y) / 5.2; // 0 arriba, 1 abajo
    p.setZ(i, Math.sin(x * 9 + t * 2) * 0.09 * (0.4 + t) - t * 0.25);
    p.setX(i, x * (0.75 + t * 0.6) + t * 0.15);
  }
  g.computeVertexNormals();
  g.rotateY(Math.PI / 2 - 0.25).translate(1.62, 5.25, -0.32);
  // Por arriba del hombro, el paño doblado.
  return [g, elip(0.62, 0.24, 0.66, 1.4, 8.0, -0.05), elip(0.36, 0.95, 0.26, 1.68, 6.9, -0.46)];
}

// Cabeza: el óvalo, las orejas, la nariz y el pelo corto en rulitos de mármol.
const CAB = { y: 9.18, rx: 0.6, ry: 0.78, rz: 0.7 };
function cabeza() {
  const gs = [elip(CAB.rx, CAB.ry, CAB.rz, 0, CAB.y, 0, 28)];
  for (const s of [-1, 1]) gs.push(elip(0.1, 0.24, 0.16, s * 0.6, CAB.y - 0.05, -0.04, 10));
  // Rulitos: arriba y atrás de la cabeza (no adelante de la frente).
  const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  for (let i = 0; i < 160; i++) {
    const th = Math.acos(1 - rnd() * 1.25); // de arriba hacia el medio
    const ph = rnd() * Math.PI * 2;
    const x = Math.sin(th) * Math.cos(ph);
    const z = Math.sin(th) * Math.sin(ph);
    const y = Math.cos(th);
    if (z > 0.35 && y < 0.62) continue; // la cara
    if (y < 0.05 && z > -0.2) continue; // nada en las sienes bajas
    gs.push(elip(0.11, 0.08, 0.11, x * CAB.rx * 1.0, CAB.y + y * CAB.ry * 1.0, z * CAB.rz * 1.0, 8));
  }
  return gs;
}

// La cara de Santi (en mármol) sobre el frente del óvalo: un pedazo de la misma esfera, un
// pelito más grande, con la foto proyectada de frente.
function mascara(material) {
  const g = new THREE.SphereGeometry(1, 36, 30, Math.PI / 2 - 1.25, 2.5, 0.42, 2.25);
  const p = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    uv.setXY(i, 0.5 + p.getX(i) / 1.85, (p.getY(i) + 0.98) / 1.55);
  }
  g.scale(CAB.rx * 1.012, CAB.ry * 1.012, CAB.rz * 1.012).translate(0, CAB.y, 0);
  return new THREE.Mesh(g, material);
}

export class Estatua {
  constructor({ escena, colisiones }) {
    const g = new THREE.Group();
    g.position.set(ESTATUA.x, 0, ESTATUA.z);
    escena.add(g);
    const marmol = new THREE.MeshStandardMaterial({ color: '#f4eee2', roughness: 0.32, metalness: 0, emissive: '#2a2620' });
    const marmolBase = new THREE.MeshStandardMaterial({ color: '#ddd5c6', roughness: 0.6 });
    // Pedestal: zócalo cuadrado con molduras y la tapa redonda.
    const base = mergeGeometries([
      new THREE.BoxGeometry(4, 0.3, 4).translate(0, 0.15, 0),
      new THREE.BoxGeometry(3.5, 1.05, 3.5).translate(0, 0.82, 0),
      new THREE.BoxGeometry(3.8, 0.2, 3.8).translate(0, 1.42, 0),
      new THREE.CylinderGeometry(1.75, 1.85, 0.25, 32).translate(0, PEDESTAL - 0.12, 0),
    ]);
    g.add(new THREE.Mesh(base, marmolBase));
    const cuerpo = new THREE.Group();
    cuerpo.position.y = PEDESTAL;
    g.add(cuerpo);
    const piezas = [...figura(), ...manto(), ...cabeza()].map((x) => x.toNonIndexed());
    for (const x of piezas) { x.deleteAttribute('uv'); }
    const malla = new THREE.Mesh(mergeGeometries(piezas), marmol);
    malla.material.side = THREE.DoubleSide; // el manto se ve de los dos lados
    cuerpo.add(malla);
    // La cara (se carga la imagen; mientras tanto, la cabeza lisa).
    const img = new Image();
    img.onload = () => {
      const tex = texturaDeCanvas(img);
      tex.anisotropy = 4;
      const m = mascara(new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.32, emissive: '#2a2620', depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
      cuerpo.add(m);
    };
    img.src = 'assets/especiales/santi_marmol.png';
    const caja = new THREE.Box3(new THREE.Vector3(ESTATUA.x - 2, 0, ESTATUA.z - 2), new THREE.Vector3(ESTATUA.x + 2, PEDESTAL + 11, ESTATUA.z + 2));
    colisiones.push(caja);
    this.grupo = g;
    this.texto = TESTAMENTO;
  }

  accion(jugador) {
    return jugador.pos.y < 3 && Math.hypot(jugador.pos.x - ESTATUA.x, jugador.pos.z - ESTATUA.z) < CERCA ? 'Leer testamento (E)' : '';
  }
}
