import * as THREE from 'three';
import { CIUDAD as C, AUTOPISTA as AU } from './constantes.js';
import { crearPersonaje } from './personaje.js';
import { cargarCabeza, cargarImagen, crearEtiqueta } from './texturas.js';
import { TIENDAS } from '../data/ropa.js';
import { vestido, cabezaManiqui, MANIQUI } from './vestir.js';
import { crearZapatilla } from './zapatillas.js';
import { aleatorio } from './util.js';
import { sfx } from './sfx.js';

// Ciudad Vecibanda: a ~20 km del barrio, al final de la autopista. Pensada como una ciudad
// de verdad: primero la cuadrícula de calles (avenidas anchas en el medio, calles comunes),
// rascacielos de vidrio en el centro, alrededor edificios de 3 a 7 pisos con negocios
// alineados sobre la vereda, y en las afueras casas con jardín. Plaza con fuente frente al
// Banco Vecibanda, canchas de fútbol y básquet que se pueden jugar, parques, estación de
// servicio, semáforos, faroles, autos estacionados y gente caminando por las veredas.
//
// Liviana para la Chromebook: cada manzana es una sola malla por material (se descarta sola
// cuando no se ve), los choques están en una grilla (solo se miran los de alrededor) y la
// ciudad se arma de a una manzana por cuadro cuando vas para ese lado.

// ---------- Cuadrícula ----------
const S = 80; // de calle a calle
const N = 8; // manzanas por lado
const MEDIO = (N * S) / 2;
const linea = (k) => -MEDIO + k * S; // eje de cada calle (k = 0..N), en coordenadas de la ciudad
const mediaCalle = (k) => (k === N / 2 ? 10 : 7); // las del medio son avenidas
const VEREDA = 4;
const PISO = 0.25; // alto de la vereda
export const RADIO_CIUDAD = MEDIO + 40;
const PEATONES = 48;
const VER_GENTE = 190; // más lejos que esto, la gente ni se dibuja ni se mueve

// Vuelta a la plaza (por la vereda), en coordenadas del mundo: el paseo de Dufre en la ciudad.
export function paseoCiudad() {
  const m = manzana(N / 2 - 1, N / 2 - 1);
  const d = 2.8;
  return { y: PISO, puntos: [[m.x0 + d, m.z1 - d], [m.x1 - d, m.z1 - d], [m.x1 - d, m.z0 + d], [m.x0 + d, m.z0 + d]].map(([x, z]) => [C.x + x, C.z + z]) };
}

// Bordes de la manzana (i, j) (con vereda) en coordenadas de la ciudad.
function manzana(i, j) {
  return { x0: linea(i) + mediaCalle(i), x1: linea(i + 1) - mediaCalle(i + 1), z0: linea(j) + mediaCalle(j), z1: linea(j + 1) - mediaCalle(j + 1) };
}
const ajustar4 = (v) => Math.round(v / 4) * 4;

// ---------- Texturas ----------
function lienzo(w, h, dibujar) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  dibujar(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}
// Fachada con ventanas: un módulo de 4 x 4 (un piso, una ventana). La pared es blanca (la
// tiñe el color de cada edificio).
const texVentanas = () => lienzo(128, 128, (g) => {
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#d9d9d9';
  g.fillRect(0, 118, 128, 10);
  g.fillStyle = '#e6e6e6';
  g.fillRect(18, 22, 92, 80);
  const v = g.createLinearGradient(0, 26, 0, 98);
  v.addColorStop(0, '#5f7a91');
  v.addColorStop(1, '#2c3d4e');
  g.fillStyle = v;
  g.fillRect(23, 27, 82, 70);
  g.fillStyle = 'rgba(255,255,255,0.18)';
  g.beginPath(); g.moveTo(23, 27); g.lineTo(60, 27); g.lineTo(23, 70); g.fill();
  g.fillStyle = '#e6e6e6';
  g.fillRect(62, 27, 4, 70);
  g.fillStyle = '#bdbdbd';
  g.fillRect(14, 100, 100, 6);
});
// Muro cortina de vidrio (rascacielos): vidrio celeste con parantes y la losa de cada piso.
const texVidrio = () => lienzo(128, 128, (g) => {
  const v = g.createLinearGradient(0, 0, 128, 128);
  v.addColorStop(0, '#e9f4fb');
  v.addColorStop(0.5, '#a7c3d6');
  v.addColorStop(1, '#d8e8f2');
  g.fillStyle = v;
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#6f8494';
  g.fillRect(0, 0, 5, 128);
  g.fillRect(0, 112, 128, 16);
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.fillRect(8, 4, 30, 104);
});
// Carteles de los negocios, todos en una imagen (lugares de 256 x 64, de a 4 por fila).
const CARTELES = [
  ['BANCO VECIBANDA', '#1b3a63'], ['FARMACIA', '#1f9d55'], ['PIZZERÍA', '#c62828'], ['KIOSCO', '#f57c00'],
  ['CAFÉ', '#6d4c41'], ['PANADERÍA', '#b8860b'], ['HELADERÍA', '#ec407a'], ['BARBERÍA', '#263238'],
  ['FERRETERÍA', '#e65100'], ['LIBRERÍA', '#5e35b1'], ['SUPER VECIBANDA', '#d32f2f'], ['HOTEL VB', '#283593'],
  ['NAFTA VB', '#1565c0'], ['CIUDAD VECIBANDA', '#2e7d32'], ['PLAZA VECIBANDA', '#455a64'], ['ROPA', '#ad1457'],
  ['VERDULERÍA', '#2e7d32'],
];
const FILAS = Math.ceil(CARTELES.length / 4);
const NEGOCIOS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 15];
const texCarteles = () => lienzo(1024, 64 * FILAS, (g) => {
  CARTELES.forEach(([texto, fondo], i) => {
    const x = (i % 4) * 256;
    const y = Math.floor(i / 4) * 64;
    g.fillStyle = fondo;
    g.fillRect(x + 2, y + 2, 252, 60);
    g.strokeStyle = 'rgba(255,255,255,0.85)';
    g.lineWidth = 3;
    g.strokeRect(x + 6, y + 6, 244, 52);
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    let t = 40;
    g.font = `900 ${t}px Arial, sans-serif`;
    while (g.measureText(texto).width > 226 && t > 14) { t -= 2; g.font = `900 ${t}px Arial, sans-serif`; }
    g.fillText(texto, x + 128, y + 34);
  });
});
// Asfalto de la autopista: 24 de ancho (v) y 20 de largo por repetición (u), con banquinas,
// doble línea amarilla en el medio y las líneas cortadas de los carriles.
const texAutopista = () => lienzo(128, 256, (g, w, h) => {
  g.fillStyle = '#45474c';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) {
    const c = 55 + Math.random() * 30;
    g.fillStyle = `rgb(${c},${c},${c + 3})`;
    g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
  const z = (u) => (u / 24) * h; // de unidades a píxeles a lo ancho
  g.fillStyle = '#f2f2f2';
  g.fillRect(0, z(0.7), w, z(0.25));
  g.fillRect(0, z(23.05), w, z(0.25));
  g.fillStyle = '#f5c518';
  g.fillRect(0, z(11.6), w, z(0.18));
  g.fillRect(0, z(12.22), w, z(0.18));
  g.fillStyle = '#f2f2f2';
  for (const c of [6.1, 17.9]) g.fillRect(0, z(c), w * 0.45, z(0.2));
});

// ---------- Constructor de mallas ----------
// Junta cajas y formas en pocas mallas (una por material) con colores por vértice. Las caras
// de los costados llevan UV en unidades del mundo (/4): las fachadas repiten un piso cada 4.
class Constructor {
  constructor() { this.cubos = {}; }
  cubo(nombre) { return (this.cubos[nombre] ??= { pos: [], nor: [], uv: [], col: [], idx: [] }); }
  cara(nombre, v, n, uvs, color) {
    const b = this.cubo(nombre);
    const base = b.pos.length / 3;
    const c = tmpColor.set(color);
    for (let i = 0; i < 4; i++) {
      b.pos.push(v[i][0], v[i][1], v[i][2]);
      b.nor.push(n[0], n[1], n[2]);
      b.uv.push(uvs[i][0], uvs[i][1]);
      b.col.push(c.r, c.g, c.b);
    }
    b.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  // Caja con los costados en `lados` (liso, ventanas, vidrio) y la tapa en liso.
  caja(x0, y0, z0, x1, y1, z1, color, { lados = 'liso', arriba = color, base = y0, abajo = false } = {}) {
    const v = (y) => (y - base) / 4;
    this.cara(lados, [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], [1, 0, 0], [[-z1 / 4, v(y0)], [-z0 / 4, v(y0)], [-z0 / 4, v(y1)], [-z1 / 4, v(y1)]], color);
    this.cara(lados, [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], [-1, 0, 0], [[z0 / 4, v(y0)], [z1 / 4, v(y0)], [z1 / 4, v(y1)], [z0 / 4, v(y1)]], color);
    this.cara(lados, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1], [[x0 / 4, v(y0)], [x1 / 4, v(y0)], [x1 / 4, v(y1)], [x0 / 4, v(y1)]], color);
    this.cara(lados, [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], [0, 0, -1], [[-x1 / 4, v(y0)], [-x0 / 4, v(y0)], [-x0 / 4, v(y1)], [-x1 / 4, v(y1)]], color);
    this.cara('liso', [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], [0, 1, 0], [[0, 0], [0, 0], [0, 0], [0, 0]], arriba);
    if (abajo) this.cara('liso', [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], [0, -1, 0], [[0, 0], [0, 0], [0, 0], [0, 0]], color);
  }
  // Solo la cara de arriba (líneas pintadas, pisos finos): 4 vértices en vez de 20.
  piso(x0, z0, x1, z1, y, color) {
    this.cara('liso', [[x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0]], [0, 1, 0], [[0, 0], [0, 0], [0, 0], [0, 0]], color);
  }
  // Una forma cualquiera de three (cilindro, cono, ...) ya ubicada.
  forma(nombre, geo, color) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (!g.attributes.normal) g.computeVertexNormals();
    const b = this.cubo(nombre);
    const base = b.pos.length / 3;
    const p = g.attributes.position;
    const n = g.attributes.normal;
    const c = tmpColor.set(color);
    for (let i = 0; i < p.count; i++) {
      b.pos.push(p.getX(i), p.getY(i), p.getZ(i));
      b.nor.push(n.getX(i), n.getY(i), n.getZ(i));
      b.uv.push(0, 0);
      b.col.push(c.r, c.g, c.b);
      b.idx.push(base + i);
    }
  }
  cil(r0, r1, h, color, x, y, z, seg = 10, nombre = 'liso') {
    const g = new THREE.CylinderGeometry(r0, r1, h, seg);
    g.translate(x, y + h / 2, z);
    this.forma(nombre, g, color);
  }
  // Cartel del atlas (slot) en un plano vertical que mira a `mira` (+x, -x, +z, -z).
  cartel(slot, x, y, z, mira, w, h) {
    const u0 = (slot % 4) / 4;
    const u1 = u0 + 0.25;
    const v1 = 1 - Math.floor(slot / 4) / FILAS;
    const v0 = v1 - 1 / FILAS;
    const a = w / 2;
    const uvs = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
    const c = '#ffffff';
    if (mira === '+z') this.cara('carteles', [[x - a, y, z], [x + a, y, z], [x + a, y + h, z], [x - a, y + h, z]], [0, 0, 1], uvs, c);
    if (mira === '-z') this.cara('carteles', [[x + a, y, z], [x - a, y, z], [x - a, y + h, z], [x + a, y + h, z]], [0, 0, -1], uvs, c);
    if (mira === '+x') this.cara('carteles', [[x, y, z + a], [x, y, z - a], [x, y + h, z - a], [x, y + h, z + a]], [1, 0, 0], uvs, c);
    if (mira === '-x') this.cara('carteles', [[x, y, z - a], [x, y, z + a], [x, y + h, z + a], [x, y + h, z - a]], [-1, 0, 0], uvs, c);
  }
  armar(materiales) {
    const g = new THREE.Group();
    for (const [nombre, b] of Object.entries(this.cubos)) {
      if (!b.idx.length) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
      geo.setIndex(b.idx);
      geo.computeBoundingSphere();
      g.add(new THREE.Mesh(geo, materiales[nombre]));
    }
    return g;
  }
}
const tmpColor = new THREE.Color();

// ---------- Choques en grilla ----------
class Grilla {
  constructor(tam = 32) { this.tam = tam; this.celdas = new Map(); this.marca = 0; this.salida = []; }
  agregar(b) {
    const t = this.tam;
    for (let x = Math.floor(b.min.x / t); x <= Math.floor(b.max.x / t); x++) {
      for (let z = Math.floor(b.min.z / t); z <= Math.floor(b.max.z / t); z++) {
        const k = `${x},${z}`;
        if (!this.celdas.has(k)) this.celdas.set(k, []);
        this.celdas.get(k).push(b);
      }
    }
  }
  cerca(x, z, extra) {
    const t = this.tam;
    const cx = Math.floor(x / t);
    const cz = Math.floor(z / t);
    this.marca++;
    const out = this.salida;
    out.length = 0;
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const lista = this.celdas.get(`${cx + i},${cz + j}`);
        if (!lista) continue;
        for (const b of lista) if (b.marca !== this.marca) { b.marca = this.marca; out.push(b); }
      }
    }
    for (const b of extra) if (b) out.push(b);
    return out;
  }
}

// ---------- Paleta ----------
const PARED = ['#e8dcc4', '#d9b99b', '#c97b63', '#b5523b', '#e6d3a3', '#a9c6d9', '#f0e6d8', '#cfc7bd', '#e8c07d', '#9fb8a2', '#d7a9a9'];
const VIDRIO = ['#cfe6f7', '#bfe3dc', '#d6d9e6', '#f0f2f5', '#bcd3ea'];
const TOLDO = ['#c62828', '#1565c0', '#2e7d32', '#f9a825', '#6a1b9a', '#ef6c00'];
const CASA = ['#f4e1c1', '#cfe3f0', '#f2d0c9', '#e3efd0', '#fff2b8', '#e8d6f0', '#d8d2c8'];
const TECHO = ['#8d3b2f', '#455a64', '#6d4c41', '#37474f', '#a1543a'];
const AUTOS = ['#c62828', '#1565c0', '#f5f5f5', '#212121', '#9e9e9e', '#2e7d32', '#f9a825', '#6a1b9a'];

export class Ciudad {
  constructor(escena, ui) {
    this.escena = escena;
    this.ui = ui;
    this.grupo = new THREE.Group();
    this.grupo.position.set(C.x, 0, C.z);
    escena.add(this.grupo);
    this.grilla = new Grilla();
    this.materiales = {
      liso: new THREE.MeshLambertMaterial({ vertexColors: true }),
      ventanas: new THREE.MeshLambertMaterial({ vertexColors: true, map: texVentanas() }),
      vidrio: new THREE.MeshLambertMaterial({ vertexColors: true, map: texVidrio() }),
      luz: new THREE.MeshBasicMaterial({ vertexColors: true }),
      carteles: new THREE.MeshBasicMaterial({ map: texCarteles(), side: THREE.DoubleSide }),
      cristal: new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.28, depthWrite: false }),
    };
    this.pendientes = null; // manzanas que faltan armar
    this.lista = false;
    this.peatones = [];
    this.figuras = []; // maniquíes y vendedores (quietos)
    this.estuvo = false;
    this.crearAutopista();
  }

  // ---------- Dónde estás ----------
  local(p) { return { x: p.x - C.x, z: p.z - C.z }; }
  adentro(p) {
    const l = this.local(p);
    return Math.abs(l.x) < RADIO_CIUDAD && Math.abs(l.z) < RADIO_CIUDAD;
  }
  enAutopista(p) {
    return p.x > AU.x0 - 30 && p.x < AU.x1 && Math.abs(p.z - AU.z) < AU.medioAncho + 2;
  }
  // Los choques de alrededor (en la ciudad); fuera de ella, null (se usan los de siempre).
  choquesCerca(p, ...extra) {
    if (!this.adentro(p)) return null;
    return this.grilla.cerca(p.x, p.z, extra);
  }

  // Agrega un choque en coordenadas de la ciudad.
  solido(x0, y0, z0, x1, y1, z1) {
    const b = new THREE.Box3(new THREE.Vector3(C.x + x0, y0, C.z + z0), new THREE.Vector3(C.x + x1, y1, C.z + z1));
    this.grilla.agregar(b);
    return b;
  }

  // ---------- Autopista ----------
  crearAutopista() {
    const tex = texAutopista();
    const mat = new THREE.MeshLambertMaterial({ map: tex });
    const rnd = aleatorio(31);
    const largoTramo = 1000;
    const troncos = [];
    const copas = [];
    for (let x0 = AU.x0; x0 < AU.x1; x0 += largoTramo) {
      const x1 = Math.min(AU.x1, x0 + largoTramo);
      const largo = x1 - x0;
      const geo = new THREE.PlaneGeometry(largo, AU.medioAncho * 2);
      geo.rotateX(-Math.PI / 2);
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setX(i, (uv.getX(i) * largo + x0) / 20);
      const m = new THREE.Mesh(geo, mat);
      m.position.set((x0 + x1) / 2, 0.05, AU.z);
      this.escena.add(m);
      // Barandas, faroles cada 120 y árboles a los costados.
      const c = new Constructor();
      for (const lado of [-1, 1]) {
        const z = lado * (AU.medioAncho + 1.2);
        c.caja(0, 0.6, z - 0.12, largo, 1.0, z + 0.12, '#c9ced3');
        for (let x = 0; x < largo; x += 8) c.caja(x - 0.1, 0, z - 0.1, x + 0.1, 0.8, z + 0.1, '#8d949b');
        for (let x = 60; x < largo; x += 120) {
          const zf = lado * (AU.medioAncho + 2.4);
          c.caja(x - 0.18, 0, zf - 0.18, x + 0.18, 10, zf + 0.18, '#5f6368');
          c.caja(x - 0.12, 9.7, zf - lado * 3, x + 0.12, 9.95, zf, '#5f6368');
          c.caja(x - 0.35, 9.4, zf - lado * 3.2, x + 0.35, 9.7, zf - lado * 2.2, '#fff3c4', { lados: 'luz', arriba: '#5f6368' });
        }
      }
      for (let n = 0; n < 34; n++) {
        const x = rnd() * largo;
        const lado = rnd() < 0.5 ? -1 : 1;
        const z = lado * (AU.medioAncho + 12 + rnd() * 110);
        const s = 0.9 + rnd() * 0.7;
        const t = new THREE.BoxGeometry(1.1 * s, 4 * s, 1.1 * s);
        t.translate(x + x0, 2 * s, z + AU.z);
        troncos.push(t);
        const k = new THREE.ConeGeometry(3.2 * s, 7 * s, 6);
        k.translate(x + x0, 6.5 * s, z + AU.z);
        copas.push(k);
      }
      const g = c.armar(this.materiales);
      g.position.set(x0, 0, AU.z);
      this.escena.add(g);
    }
    // Árboles de la ruta: por tramos (así se descartan los que no se ven).
    for (let i = 0; i < troncos.length; i += 34) {
      const a = new Constructor();
      for (let j = i; j < Math.min(troncos.length, i + 34); j++) {
        a.forma('liso', troncos[j], '#7a5230');
        a.forma('liso', copas[j], ['#2e7d32', '#388e3c', '#43a047'][j % 3]);
      }
      this.escena.add(a.armar(this.materiales));
    }
    // Carteles verdes con la distancia, cada 2 km, y el de la entrada a la autopista.
    const cartelRuta = (x, lineas) => {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 192;
      const g = c.getContext('2d');
      g.fillStyle = '#0b6b3a';
      g.fillRect(0, 0, 512, 192);
      g.strokeStyle = '#ffffff';
      g.lineWidth = 6;
      g.strokeRect(8, 8, 496, 176);
      g.fillStyle = '#ffffff';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      lineas.forEach((t, i) => { g.font = `800 ${i ? 52 : 46}px Arial, sans-serif`; g.fillText(t, 256, 60 + i * 72); });
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      const placa = new THREE.Mesh(new THREE.PlaneGeometry(16, 6), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
      placa.position.set(x, 13, AU.z);
      placa.rotation.y = Math.PI / 2; // mira hacia el barrio (de donde venís)
      this.escena.add(placa);
      const p = new Constructor();
      for (const lado of [-1, 1]) p.caja(-0.3, 0, lado * 13 - 0.3, 0.3, 16.3, lado * 13 + 0.3, '#8d949b');
      p.caja(-0.3, 15.8, -13, 0.3, 16.4, 13, '#8d949b');
      const gp = p.armar(this.materiales);
      gp.position.set(x, 0, AU.z);
      this.escena.add(gp);
    };
    cartelRuta(AU.x1 - 40, ['AUTOPISTA', `CIUDAD VECIBANDA ${Math.round((AU.x1 - AU.x0) / 1000)} km`]);
    for (let x = AU.x1 - 2000; x > AU.x0 + 1000; x -= 2000) cartelRuta(x, ['CIUDAD VECIBANDA', `${Math.round((x - AU.x0) / 1000)} km`]);
    cartelRuta(AU.x0 + 120, ['BIENVENIDOS A', 'CIUDAD VECIBANDA']);
  }

  // ---------- La ciudad ----------
  // Prepara la lista de manzanas; se arman de a una por cuadro (actualizar).
  empezar() {
    if (this.pendientes) return;
    this.pendientes = [{ calles: true }];
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) this.pendientes.push({ i, j });
  }

  armarUna() {
    const t = this.pendientes.shift();
    if (t.calles) this.armarCalles();
    else this.armarManzana(t.i, t.j);
    if (!this.pendientes.length) {
      this.lista = true;
      this.crearJuegos();
      this.crearPeatones();
    }
  }

  armarCalles() {
    const c = new Constructor();
    const borde = MEDIO + 10;
    // Asfalto de toda la ciudad (las manzanas van arriba, con la vereda).
    c.caja(-borde, 0, -borde, borde, 0.04, borde, '#3e4046');
    // Líneas: amarilla cortada en el medio de cada calle y senda peatonal en cada esquina.
    for (let k = 0; k <= N; k++) {
      const e = linea(k);
      const h = mediaCalle(k);
      for (let m = 0; m < N; m++) {
        const a = linea(m) + mediaCalle(m) + 4;
        const b = linea(m + 1) - mediaCalle(m + 1) - 4;
        for (let s = a; s < b - 3; s += 8) {
          c.piso(s, e - 0.15, s + 4, e + 0.15, 0.06, '#f5c518');
          c.piso(e - 0.15, s, e + 0.15, s + 4, 0.06, '#f5c518');
        }
        if (h > 7) {
          // Avenida: además, líneas blancas de carril.
          for (let s = a; s < b - 3; s += 8) {
            for (const d of [-5, 5]) {
              c.piso(s, e + d - 0.12, s + 3, e + d + 0.12, 0.06, '#e8e8e8');
              c.piso(e + d - 0.12, s, e + d + 0.12, s + 3, 0.06, '#e8e8e8');
            }
          }
        }
      }
      // Sendas peatonales a los cuatro lados de cada cruce de esta calle.
      for (let m = 0; m <= N; m++) {
        const cruce = linea(m);
        const hm = mediaCalle(m);
        for (const lado of [-1, 1]) {
          for (let w = -h + 0.6; w < h - 0.6; w += 1.6) {
            const z0 = cruce + lado * (hm + 0.8);
            c.piso(e + w, Math.min(z0, z0 + lado * 2.6), e + w + 0.8, Math.max(z0, z0 + lado * 2.6), 0.06, '#f2f2f2');
            c.piso(Math.min(z0, z0 + lado * 2.6), e + w, Math.max(z0, z0 + lado * 2.6), e + w + 0.8, 0.06, '#f2f2f2');
          }
        }
      }
    }
    // Semáforos en los cruces de las avenidas.
    for (let m = 1; m < N; m++) {
      for (const [kx, kz] of [[N / 2, m], [m, N / 2]]) {
        for (const [sx, sz] of [[1, 1], [-1, -1]]) {
          const px = linea(kx) + sx * (mediaCalle(kx) + 1.2);
          const pz = linea(kz) + sz * (mediaCalle(kz) + 1.2);
          c.caja(px - 0.15, 0, pz - 0.15, px + 0.15, 8, pz + 0.15, '#2b2d30');
          c.caja(px - 0.4, 6, pz - 0.4, px + 0.4, 8.4, pz + 0.4, '#1b1c1e');
          const encendida = (m + sx) % 3;
          ['#ff3b30', '#ffcc00', '#34c759'].forEach((col, n) => {
            c.caja(px - 0.25, 7.8 - n * 0.7, pz - 0.42, px + 0.25, 8.15 - n * 0.7, pz + 0.42, n === encendida ? col : '#3a3a3a', { lados: n === encendida ? 'luz' : 'liso' });
          });
        }
      }
    }
    const g = c.armar(this.materiales);
    this.grupo.add(g);
  }

  armarManzana(i, j) {
    const rnd = aleatorio(1000 + i * 31 + j * 7);
    const c = new Constructor();
    const m = manzana(i, j);
    // Vereda (se camina arriba) y cordón.
    c.caja(m.x0, 0, m.z0, m.x1, PISO, m.z1, '#cfcfca');
    this.solido(m.x0, 0, m.z0, m.x1, PISO, m.z1);
    const lote = { x0: m.x0 + VEREDA, x1: m.x1 - VEREDA, z0: m.z0 + VEREDA, z1: m.z1 - VEREDA };
    const anillo = Math.max(Math.abs(i - 3.5), Math.abs(j - 3.5));
    const clave = `${i},${j}`;
    const especial = {
      '3,3': 'plaza', '4,3': 'banco', '1,6': 'futbol', '6,6': 'basquet', '6,1': 'nafta', '1,1': 'parque', '2,3': 'super', '5,4': 'hotel', '5,3': 'verdu', '3,4': 'kicks', '4,4': 'drip', '2,4': 'futbolera',
    }[clave];
    if (especial === 'plaza') this.plaza(c, lote, rnd);
    else if (especial === 'banco') this.banco(c, lote, rnd);
    else if (especial === 'futbol') this.canchaFutbol(c, lote);
    else if (especial === 'basquet') this.canchaBasquet(c, lote, rnd);
    else if (especial === 'nafta') this.estacion(c, lote, rnd);
    else if (especial === 'parque') this.parque(c, lote, rnd);
    else if (especial === 'super') this.super(c, lote, rnd);
    else if (especial === 'verdu') this.verduleria(c, lote, rnd);
    else if (TIENDAS.some((t) => t.id === especial)) this.tienda(c, lote, rnd, TIENDAS.find((t) => t.id === especial));
    else if (especial === 'hotel') this.torre(c, lote.x0 + 6, lote.z0 + 6, lote.x1 - 6, lote.z1 - 6, 76, rnd, { cartel: 11 });
    else if (anillo < 1) this.centro(c, lote, rnd);
    else if (anillo < 2) this.comercial(c, lote, rnd, 3, 7);
    else if (anillo < 3 && rnd() < 0.5) this.comercial(c, lote, rnd, 2, 4);
    else this.casas(c, lote, rnd);
    // Faroles y árboles en la vereda, y autos estacionados.
    this.vereda(c, m, rnd, anillo);
    this.grupo.add(c.armar(this.materiales));
  }

  vereda(c, m, rnd, anillo) {
    const lados = [
      { a: m.x0, b: m.x1, fijo: m.z0 + 0.6, eje: 'x', calle: -1 },
      { a: m.x0, b: m.x1, fijo: m.z1 - 0.6, eje: 'x', calle: 1 },
      { a: m.z0, b: m.z1, fijo: m.x0 + 0.6, eje: 'z', calle: -1 },
      { a: m.z0, b: m.z1, fijo: m.x1 - 0.6, eje: 'z', calle: 1 },
    ];
    for (const l of lados) {
      for (let s = l.a + 6; s < l.b - 4; s += 18) {
        const [x, z] = l.eje === 'x' ? [s, l.fijo] : [l.fijo, s];
        c.caja(x - 0.14, PISO, z - 0.14, x + 0.14, 8.6, z + 0.14, '#3a3d42');
        const dx = l.eje === 'z' ? l.calle * 1.6 : 0;
        const dz = l.eje === 'x' ? l.calle * 1.6 : 0;
        c.caja(Math.min(x, x + dx) - 0.1, 8.4, Math.min(z, z + dz) - 0.1, Math.max(x, x + dx) + 0.1, 8.6, Math.max(z, z + dz) + 0.1, '#3a3d42');
        c.caja(x + dx - 0.35, 8.05, z + dz - 0.35, x + dx + 0.35, 8.4, z + dz + 0.35, '#fff1c4', { lados: 'luz', arriba: '#3a3d42' });
        this.solido(x - 0.2, 0, z - 0.2, x + 0.2, 8.6, z + 0.2);
        // Árbol entre farol y farol (más en las afueras).
        if (rnd() < (anillo >= 2 ? 0.75 : 0.35)) {
          const t = s + 9;
          if (t < l.b - 4) {
            const [tx, tz] = l.eje === 'x' ? [t, l.fijo - l.calle * 0.3] : [l.fijo - l.calle * 0.3, t];
            c.caja(tx - 0.9, PISO, tz - 0.9, tx + 0.9, PISO + 0.05, tz + 0.9, '#6b4f36');
            c.caja(tx - 0.25, PISO, tz - 0.25, tx + 0.25, 3.4, tz + 0.25, '#7a5230');
            const k = new THREE.SphereGeometry(1.9, 7, 5);
            k.scale(1, 1.2, 1);
            k.translate(tx, 6, tz);
            c.forma('liso', k, ['#3f8f3a', '#4fa64a', '#2e7d32'][Math.floor(rnd() * 3)]);
            this.solido(tx - 0.3, 0, tz - 0.3, tx + 0.3, 3.4, tz + 0.3);
          }
        }
      }
      // Autos estacionados sobre la calle, pegados al cordón.
      if (rnd() < 0.6) {
        for (let s = l.a + 10; s < l.b - 10; s += 12 + rnd() * 10) {
          if (rnd() < 0.45) continue;
          const off = l.calle * 2.4;
          const [x, z] = l.eje === 'x' ? [s, (l.calle < 0 ? m.z0 : m.z1) + off] : [(l.calle < 0 ? m.x0 : m.x1) + off, s];
          this.autoEstacionado(c, x, z, l.eje, AUTOS[Math.floor(rnd() * AUTOS.length)]);
        }
      }
    }
  }

  autoEstacionado(c, x, z, eje, color) {
    const [hx, hz] = eje === 'x' ? [2.4, 1.1] : [1.1, 2.4];
    c.caja(x - hx, 0.55, z - hz, x + hx, 1.55, z + hz, color);
    const [cx, cz] = eje === 'x' ? [1.4, 1.0] : [1.0, 1.4];
    c.caja(x - cx, 1.55, z - cz, x + cx, 2.45, z + cz, '#2a3642', { arriba: color });
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const [wx, wz] = eje === 'x' ? [x + sx * 1.6, z + sz * 1.05] : [x + sx * 1.05, z + sz * 1.6];
        const r = new THREE.CylinderGeometry(0.55, 0.55, 0.4, 10);
        r.rotateZ(eje === 'x' ? 0 : Math.PI / 2);
        r.rotateX(eje === 'x' ? Math.PI / 2 : 0);
        r.translate(wx, 0.55, wz);
        c.forma('liso', r, '#161616');
      }
    }
    c.caja(x - (eje === 'x' ? hx + 0.02 : 0.6), 1.05, z - (eje === 'x' ? 0.6 : hz + 0.02), x + (eje === 'x' ? hx + 0.02 : 0.6), 1.3, z + (eje === 'x' ? 0.6 : hz + 0.02), '#fff6d6', { lados: 'luz', arriba: color });
    this.solido(x - hx, 0, z - hz, x + hx, 2.45, z + hz);
  }

  // Edificio de departamentos/oficinas con negocio abajo (toldo y, a veces, cartel).
  edificio(c, x0, z0, x1, z1, pisos, rnd, frente, conCartel) {
    const color = PARED[Math.floor(rnd() * PARED.length)];
    const alto = PISO + 4.5 + pisos * 4;
    // Planta baja: vidriera oscura con el negocio.
    c.caja(x0, PISO, z0, x1, PISO + 4.5, z1, '#30363d', { arriba: color });
    c.caja(x0, PISO + 4.5, z0, x1, alto, z1, color, { lados: 'ventanas', base: PISO + 4.5, arriba: '#9e9e9e' });
    c.caja(x0 - 0.15, alto, z0 - 0.15, x1 + 0.15, alto + 0.7, z1 + 0.15, color); // parapeto
    if (rnd() < 0.5) c.caja(x0 + 1, alto + 0.7, z0 + 1, x0 + 4, alto + 2.5, z0 + 3, '#9aa0a6'); // máquinas
    this.solido(x0, 0, z0, x1, alto + 0.7, z1);
    // Toldo y cartel sobre la vereda.
    const toldo = TOLDO[Math.floor(rnd() * TOLDO.length)];
    const { eje, lado } = frente;
    if (eje === 'z') {
      const z = lado > 0 ? z1 : z0;
      c.caja(x0 + 0.6, PISO + 3.9, Math.min(z, z + lado * 1.6), x1 - 0.6, PISO + 4.2, Math.max(z, z + lado * 1.6), toldo);
      if (conCartel) c.cartel(NEGOCIOS[Math.floor(rnd() * NEGOCIOS.length)], (x0 + x1) / 2, PISO + 4.4, z + lado * 0.05, lado > 0 ? '+z' : '-z', Math.min(10, x1 - x0 - 1.5), Math.min(2.5, (x1 - x0 - 1.5) / 4));
    } else {
      const x = lado > 0 ? x1 : x0;
      c.caja(Math.min(x, x + lado * 1.6), PISO + 3.9, z0 + 0.6, Math.max(x, x + lado * 1.6), PISO + 4.2, z1 - 0.6, toldo);
      if (conCartel) c.cartel(NEGOCIOS[Math.floor(rnd() * NEGOCIOS.length)], x + lado * 0.05, PISO + 4.4, (z0 + z1) / 2, lado > 0 ? '+x' : '-x', Math.min(10, z1 - z0 - 1.5), Math.min(2.5, (z1 - z0 - 1.5) / 4));
    }
  }

  // Manzana comercial: edificios pegados alineados sobre la vereda, patio adentro.
  comercial(c, lote, rnd, minPisos, maxPisos) {
    const fondo = 16;
    c.piso(lote.x0, lote.z0, lote.x1, lote.z1, PISO + 0.02, '#9e9a90');
    let carteles = 0;
    const tira = (a, b, fijo0, fijo1, eje, lado) => {
      let s = Math.ceil(a / 4) * 4;
      while (s < b - 6) {
        const ancho = Math.min(b - s, ajustar4(12 + rnd() * 10));
        const pisos = minPisos + Math.floor(rnd() * (maxPisos - minPisos + 1));
        const conCartel = carteles < 3 && rnd() < 0.6;
        if (conCartel) carteles++;
        if (eje === 'z') this.edificio(c, s, fijo0, s + ancho, fijo1, pisos, rnd, { eje, lado }, conCartel);
        else this.edificio(c, fijo0, s, fijo1, s + ancho, pisos, rnd, { eje, lado }, conCartel);
        s += ancho;
      }
    };
    tira(lote.x0, lote.x1, lote.z1 - fondo, lote.z1, 'z', 1);
    tira(lote.x0, lote.x1, lote.z0, lote.z0 + fondo, 'z', -1);
    tira(lote.z0 + fondo, lote.z1 - fondo, lote.x1 - fondo, lote.x1, 'x', 1);
    tira(lote.z0 + fondo, lote.z1 - fondo, lote.x0, lote.x0 + fondo, 'x', -1);
  }

  // Rascacielos (centro y hotel): base, cuerpo de vidrio, retranqueos y antena.
  torre(c, x0, z0, x1, z1, alto, rnd, { cartel = -1 } = {}) {
    x0 = ajustar4(x0); x1 = ajustar4(x1); z0 = ajustar4(z0); z1 = ajustar4(z1);
    const vidrio = VIDRIO[Math.floor(rnd() * VIDRIO.length)];
    const estilo = rnd() < 0.7 ? 'vidrio' : 'ventanas';
    const color = estilo === 'vidrio' ? vidrio : PARED[Math.floor(rnd() * PARED.length)];
    // Lobby.
    c.caja(x0 - 0.4, PISO, z0 - 0.4, x1 + 0.4, PISO + 6, z1 + 0.4, '#3b4148', { arriba: '#7d8288' });
    const corte = alto * (0.55 + rnd() * 0.2);
    c.caja(x0, PISO + 6, z0, x1, corte, z1, color, { lados: estilo, base: PISO + 6, arriba: '#7d8288' });
    const m = 2.5 + rnd() * 2;
    c.caja(x0 + m, corte, z0 + m, x1 - m, alto, z1 - m, color, { lados: estilo, base: PISO + 6, arriba: '#6b7076' });
    c.caja(x0 + m + 2, alto, z0 + m + 2, x0 + m + 7, alto + 3, z0 + m + 6, '#9aa0a6');
    if (rnd() < 0.6) c.caja((x0 + x1) / 2 - 0.2, alto, (z0 + z1) / 2 - 0.2, (x0 + x1) / 2 + 0.2, alto + 12, (z0 + z1) / 2 + 0.2, '#c9ced3');
    if (cartel >= 0) {
      c.cartel(cartel, (x0 + x1) / 2, alto - 7, z1 - m + 0.1, '+z', 14, 3.5);
      c.cartel(cartel, (x0 + x1) / 2, alto - 7, z0 + m - 0.1, '-z', 14, 3.5);
    }
    this.solido(x0 - 0.4, 0, z0 - 0.4, x1 + 0.4, alto, z1 + 0.4);
  }

  centro(c, lote, rnd) {
    c.piso(lote.x0, lote.z0, lote.x1, lote.z1, PISO + 0.03, '#b9b6ae');
    const xm = (lote.x0 + lote.x1) / 2;
    if (rnd() < 0.5) {
      this.torre(c, lote.x0 + 3, lote.z0 + 3, xm - 2, lote.z1 - 3, 70 + rnd() * 70, rnd);
      this.torre(c, xm + 2, lote.z0 + 3, lote.x1 - 3, lote.z1 - 3, 50 + rnd() * 60, rnd);
    } else {
      this.torre(c, lote.x0 + 6, lote.z0 + 6, lote.x1 - 6, lote.z1 - 6, 100 + rnd() * 60, rnd);
    }
  }

  // Casas con jardín, cerca y techo de dos aguas, mirando a las calles de ±z.
  casas(c, lote, rnd) {
    c.piso(lote.x0, lote.z0, lote.x1, lote.z1, PISO + 0.02, '#7cbf55');
    const zm = (lote.z0 + lote.z1) / 2;
    for (const lado of [-1, 1]) {
      const n = 3;
      const ancho = (lote.x1 - lote.x0) / n;
      for (let k = 0; k < n; k++) {
        const x0 = lote.x0 + k * ancho;
        const frente = lado > 0 ? lote.z1 : lote.z0;
        this.casa(c, x0 + 2.5, x0 + ancho - 2.5, frente - lado * 4, frente - lado * 15, lado, rnd);
        // Cerquita baja al frente (con el portón abierto) y entre lotes.
        const zf = frente - lado * 0.3;
        c.caja(x0 + 0.2, PISO, Math.min(zf, zf - lado * 0.2), x0 + ancho / 2 - 1.2, PISO + 1.2, Math.max(zf, zf - lado * 0.2), '#f5f5f5');
        c.caja(x0 + ancho / 2 + 1.2, PISO, Math.min(zf, zf - lado * 0.2), x0 + ancho - 0.2, PISO + 1.2, Math.max(zf, zf - lado * 0.2), '#f5f5f5');
        c.caja(x0 + ancho / 2 - 1.2, PISO, Math.min(frente, frente - lado * 4), x0 + ancho / 2 + 1.2, PISO + 0.04, Math.max(frente, frente - lado * 4), '#bdbab3');
        if (k > 0) c.caja(x0 - 0.1, PISO, Math.min(frente, zm), x0 + 0.1, PISO + 1.2, Math.max(frente, zm), '#f5f5f5');
      }
    }
  }

  casa(c, x0, x1, zFrente, zFondo, lado, rnd) {
    const z0 = Math.min(zFrente, zFondo);
    const z1 = Math.max(zFrente, zFondo);
    const pared = CASA[Math.floor(rnd() * CASA.length)];
    const techo = TECHO[Math.floor(rnd() * TECHO.length)];
    const alto = PISO + (rnd() < 0.35 ? 9 : 5);
    c.caja(x0, PISO, z0, x1, alto, z1, pared);
    // Techo de dos aguas (prisma).
    const w = x1 - x0;
    const forma = new THREE.Shape();
    forma.moveTo(-(z1 - z0) / 2 - 0.6, 0);
    forma.lineTo((z1 - z0) / 2 + 0.6, 0);
    forma.lineTo(0, 3.2);
    forma.closePath();
    const t = new THREE.ExtrudeGeometry(forma, { depth: w + 1.2, bevelEnabled: false });
    t.rotateY(Math.PI / 2);
    t.translate(x0 - 0.6, alto, (z0 + z1) / 2);
    c.forma('liso', t, techo);
    // Puerta y ventanas al frente.
    const zf = zFrente + lado * 0.06;
    const xm = (x0 + x1) / 2;
    const plano = (a, b, y0, y1, col, sale = 0.05) => c.caja(a, y0, Math.min(zf, zf + lado * sale), b, y1, Math.max(zf, zf + lado * sale), col);
    plano(xm - 0.9, xm + 0.9, PISO, PISO + 3.4, '#6d4c41');
    for (const dx of [-w / 2 + 1.6, w / 2 - 3.6]) {
      plano(xm + dx - 0.15, xm + dx + 2.15, PISO + 1.6, PISO + 3.6, '#f5f5f5');
      plano(xm + dx, xm + dx + 2, PISO + 1.75, PISO + 3.45, '#3c556b', 0.12);
      if (alto > PISO + 6) {
        plano(xm + dx - 0.15, xm + dx + 2.15, PISO + 5.6, PISO + 7.6, '#f5f5f5');
        plano(xm + dx, xm + dx + 2, PISO + 5.75, PISO + 7.45, '#3c556b', 0.12);
      }
    }
    this.solido(x0, 0, z0, x1, alto + 3.2, z1);
  }

  plaza(c, lote, rnd) {
    c.piso(lote.x0, lote.z0, lote.x1, lote.z1, PISO + 0.03, '#d8cfbf');
    const xm = (lote.x0 + lote.x1) / 2;
    const zm = (lote.z0 + lote.z1) / 2;
    // Canteros de pasto en las esquinas y caminos en cruz.
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const a = sx < 0 ? lote.x0 + 2 : xm + 5;
      const b = sx < 0 ? xm - 5 : lote.x1 - 2;
      const d = sz < 0 ? lote.z0 + 2 : zm + 5;
      const e = sz < 0 ? zm - 5 : lote.z1 - 2;
      c.caja(a, PISO, d, b, PISO + 0.35, e, '#7cbf55', { arriba: '#7cbf55' });
      const tx = (a + b) / 2;
      const tz = (d + e) / 2;
      c.caja(tx - 0.3, PISO, tz - 0.3, tx + 0.3, 4, tz + 0.3, '#7a5230');
      const k = new THREE.SphereGeometry(3, 7, 5);
      k.translate(tx, 6, tz);
      c.forma('liso', k, '#3f8f3a');
      this.solido(tx - 0.35, 0, tz - 0.35, tx + 0.35, 4, tz + 0.35);
    }
    // Fuente con la moneda VB gigante arriba.
    c.cil(7, 7, 1.2, '#bdbdbd', xm, PISO, zm, 24);
    c.cil(6.3, 6.3, 0.06, '#4fc3f7', xm, PISO + 1.1, zm, 24, 'luz');
    c.cil(1, 1.4, 4, '#bdbdbd', xm, PISO, zm, 12);
    const moneda = new THREE.CylinderGeometry(2.4, 2.4, 0.5, 24);
    moneda.rotateX(Math.PI / 2);
    moneda.translate(xm, PISO + 6.6, zm);
    c.forma('liso', moneda, '#f2b51e');
    this.solido(xm - 6.5, 0, zm - 6.5, xm + 6.5, PISO + 1.2, zm + 6.5);
    this.solido(xm - 1.4, 0, zm - 1.4, xm + 1.4, PISO + 9, zm + 1.4);
    // Bancos alrededor.
    for (const [bx, bz, eje] of [[xm, zm - 9.5, 'x'], [xm, zm + 9.5, 'x'], [xm - 9.5, zm, 'z'], [xm + 9.5, zm, 'z']]) this.banquito(c, bx, bz, eje);
    c.cartel(14, xm, PISO + 0.4, lote.z1 + 0.05, '+z', 10, 2.5);
  }

  banquito(c, x, z, eje) {
    const [hx, hz] = eje === 'x' ? [1.8, 0.5] : [0.5, 1.8];
    c.caja(x - hx, PISO + 1, z - hz, x + hx, PISO + 1.25, z + hz, '#8d5a35');
    for (const s of [-1, 1]) {
      const [px, pz] = eje === 'x' ? [x + s * (hx - 0.3), z] : [x, z + s * (hz - 0.3)];
      c.caja(px - 0.15, PISO, pz - 0.4, px + 0.15, PISO + 1, pz + 0.4, '#3a3d42');
    }
    this.solido(x - hx, 0, z - hz, x + hx, PISO + 1.25, z + hz);
  }

  // Banco Vecibanda: edificio clásico con escalinata, columnas y frontón (como el de la foto).
  banco(c, lote, rnd) {
    c.piso(lote.x0, lote.z0, lote.x1, lote.z1, PISO + 0.03, '#e3dfd5');
    const x0 = lote.x0 + 8;
    const x1 = lote.x1 - 8;
    const z0 = lote.z0 + 8;
    const zf = lote.z1 - 12; // frente de las columnas (mira a la avenida, +z)
    const piedra = '#ece8de';
    // Escalones (se suben caminando) y el piso del pórtico.
    for (let n = 0; n < 4; n++) {
      c.caja(x0 - 2 + n * 0.6, PISO + n * 0.5, zf - 2, x1 + 2 - n * 0.6, PISO + (n + 1) * 0.5, zf + 4 - n * 1.3, piedra);
      this.solido(x0 - 2 + n * 0.6, 0, zf - 2, x1 + 2 - n * 0.6, PISO + (n + 1) * 0.5, zf + 4 - n * 1.3);
    }
    const base = PISO + 2;
    c.caja(x0, PISO, z0, x1, base, zf - 2, piedra);
    this.solido(x0, 0, z0, x1, base, zf - 2);
    c.caja(x0 + 2, base, z0, x1 - 2, base + 14, zf - 5, '#e3ded2', { lados: 'ventanas', base, arriba: '#bdb8ac' });
    // Columnas y dintel.
    const n = 8;
    for (let k = 0; k < n; k++) {
      const x = x0 + 1.5 + (k * (x1 - x0 - 3)) / (n - 1);
      c.cil(0.9, 1.05, 12, '#f4f1e8', x, base, zf - 2.5, 14);
      this.solido(x - 1, 0, zf - 3.5, x + 1, base + 12, zf - 1.5);
    }
    c.caja(x0, base + 12, z0, x1, base + 14, zf - 1, piedra);
    const forma = new THREE.Shape();
    forma.moveTo(-(x1 - x0) / 2, 0);
    forma.lineTo((x1 - x0) / 2, 0);
    forma.lineTo(0, 5);
    forma.closePath();
    const fr = new THREE.ExtrudeGeometry(forma, { depth: zf - 1 - z0, bevelEnabled: false });
    fr.translate((x0 + x1) / 2, base + 14, z0);
    c.forma('liso', fr, piedra);
    // Puerta grande y el cartel.
    const xm = (x0 + x1) / 2;
    c.caja(xm - 3, base, zf - 5.1, xm + 3, base + 8, zf - 4.95, '#3b4a57');
    c.cartel(0, xm, base + 12.4, zf - 0.95, '+z', 16, 1.4);
    this.solido(x0, 0, z0, x1, base + 14, zf - 5);
  }

  canchaFutbol(c, lote) {
    c.piso(lote.x0, lote.z0, lote.x1, lote.z1, PISO + 0.02, '#5aa646');
    const xm = (lote.x0 + lote.x1) / 2;
    const zm = (lote.z0 + lote.z1) / 2;
    const L = 24;
    const A = 15;
    for (let n = -L; n < L; n += 6) c.caja(xm + n, PISO + 0.02, zm - A, xm + n + 3, PISO + 0.03, zm + A, '#4f9a3d');
    const lineaB = (a, b, d, e) => c.piso(a, d, b, e, PISO + 0.05, '#ffffff');
    lineaB(xm - L, xm + L, zm - A, zm - A + 0.25);
    lineaB(xm - L, xm + L, zm + A - 0.25, zm + A);
    lineaB(xm - L, xm - L + 0.25, zm - A, zm + A);
    lineaB(xm + L - 0.25, xm + L, zm - A, zm + A);
    lineaB(xm - 0.12, xm + 0.12, zm - A, zm + A);
    for (const s of [-1, 1]) {
      const xg = xm + s * L;
      c.caja(xg - 0.15, PISO, zm - 3.6, xg + 0.15, PISO + 3, zm - 3.3, '#ffffff');
      c.caja(xg - 0.15, PISO, zm + 3.3, xg + 0.15, PISO + 3, zm + 3.6, '#ffffff');
      c.caja(xg - 0.15, PISO + 2.8, zm - 3.6, xg + 0.15, PISO + 3.1, zm + 3.6, '#ffffff');
      c.caja(Math.min(xg, xg + s * 2), PISO + 2.85, zm - 3.4, Math.max(xg, xg + s * 2), PISO + 2.95, zm + 3.4, '#dfe6ec');
      this.solido(xg - 0.15, 0, zm - 3.6, xg + 0.15, PISO + 3, zm - 3.3);
      this.solido(xg - 0.15, 0, zm + 3.3, xg + 0.15, PISO + 3, zm + 3.6);
    }
    this.futbol = { xm, zm, L, A };
  }

  canchaBasquet(c, lote, rnd) {
    c.piso(lote.x0, lote.z0, lote.x1, lote.z1, PISO + 0.02, '#7cbf55');
    const xm = (lote.x0 + lote.x1) / 2;
    const zm = (lote.z0 + lote.z1) / 2;
    const L = 15;
    const A = 9;
    c.caja(xm - L - 2, PISO, zm - A - 2, xm + L + 2, PISO + 0.05, zm + A + 2, '#3d6fb0');
    c.caja(xm - L, PISO + 0.05, zm - A, xm + L, PISO + 0.07, zm + A, '#d8743c');
    const lineaB = (a, b, d, e) => c.piso(a, d, b, e, PISO + 0.09, '#ffffff');
    lineaB(xm - L, xm + L, zm - A, zm - A + 0.2);
    lineaB(xm - L, xm + L, zm + A - 0.2, zm + A);
    lineaB(xm - L, xm - L + 0.2, zm - A, zm + A);
    lineaB(xm + L - 0.2, xm + L, zm - A, zm + A);
    lineaB(xm - 0.1, xm + 0.1, zm - A, zm + A);
    const aros = [];
    for (const s of [-1, 1]) {
      const xp = xm + s * (L + 1);
      c.caja(xp - 0.2, PISO, zm - 0.2, xp + 0.2, PISO + 9, zm + 0.2, '#3a3d42');
      c.caja(Math.min(xp, xp - s * 1.2), PISO + 8.5, zm - 0.15, Math.max(xp, xp - s * 1.2), PISO + 8.8, zm + 0.15, '#3a3d42');
      const xt = xp - s * 1.25; // tablero
      c.caja(xt - 0.1, PISO + 7.2, zm - 1.8, xt + 0.1, PISO + 9.8, zm + 1.8, '#f5f5f5');
      c.caja(xt - s * 0.12, PISO + 7.6, zm - 0.6, xt - s * 0.08, PISO + 8.6, zm + 0.6, '#d32f2f');
      const xa = xt - s * 1.0;
      const aro = new THREE.TorusGeometry(0.75, 0.07, 6, 18);
      aro.rotateX(Math.PI / 2);
      aro.translate(xa, PISO + 7.5, zm);
      c.forma('liso', aro, '#ff6d00');
      this.solido(xp - 0.25, 0, zm - 0.25, xp + 0.25, PISO + 9, zm + 0.25);
      aros.push({ x: xa, y: PISO + 7.5, z: zm, tablero: xt, s });
    }
    // Rejita alrededor (baja, para que no se escape la pelota) y un par de bancos.
    this.banquito(c, xm, zm + A + 4.5, 'x');
    this.basquet = { xm, zm, L, A, aros };
  }

  estacion(c, lote, rnd) {
    c.piso(lote.x0, lote.z0, lote.x1, lote.z1, PISO + 0.03, '#9e9a90');
    const xm = (lote.x0 + lote.x1) / 2;
    const zm = (lote.z0 + lote.z1) / 2;
    // Techo grande sobre los surtidores.
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      c.caja(xm + sx * 9 - 0.4, PISO, zm + sz * 6 - 0.4, xm + sx * 9 + 0.4, PISO + 7, zm + sz * 6 + 0.4, '#f5f5f5');
      this.solido(xm + sx * 9 - 0.4, 0, zm + sz * 6 - 0.4, xm + sx * 9 + 0.4, PISO + 7, zm + sz * 6 + 0.4);
    }
    c.caja(xm - 13, PISO + 7, zm - 9, xm + 13, PISO + 8.4, zm + 9, '#1565c0', { arriba: '#e0e0e0' });
    c.caja(xm - 13.05, PISO + 7.2, zm - 9.05, xm + 13.05, PISO + 7.6, zm + 9.05, '#fdd835');
    c.cartel(12, xm, PISO + 7.05, zm + 9.06, '+z', 9, 1.3);
    for (const sx of [-1, 1]) {
      c.caja(xm + sx * 4 - 0.8, PISO, zm - 0.6, xm + sx * 4 + 0.8, PISO + 2.6, zm + 0.6, '#eceff1');
      c.caja(xm + sx * 4 - 0.6, PISO + 1.6, zm - 0.62, xm + sx * 4 + 0.6, PISO + 2.3, zm + 0.62, '#263238');
      this.solido(xm + sx * 4 - 0.8, 0, zm - 0.6, xm + sx * 4 + 0.8, PISO + 2.6, zm + 0.6);
    }
    // Minimercado.
    c.caja(lote.x0 + 2, PISO, lote.z0 + 2, lote.x0 + 18, PISO + 5, lote.z0 + 12, '#f5f5f5', { arriba: '#9e9e9e' });
    c.caja(lote.x0 + 4, PISO, lote.z0 + 12, lote.x0 + 16, PISO + 3.6, lote.z0 + 12.05, '#3c556b');
    this.solido(lote.x0 + 2, 0, lote.z0 + 2, lote.x0 + 18, PISO + 5, lote.z0 + 12);
  }

  parque(c, lote, rnd) {
    c.piso(lote.x0, lote.z0, lote.x1, lote.z1, PISO + 0.03, '#7cbf55');
    const xm = (lote.x0 + lote.x1) / 2;
    const zm = (lote.z0 + lote.z1) / 2;
    c.caja(xm - 1.5, PISO + 0.03, lote.z0, xm + 1.5, PISO + 0.05, lote.z1, '#d8cfbf');
    c.caja(lote.x0, PISO + 0.03, zm - 1.5, lote.x1, PISO + 0.05, zm + 1.5, '#d8cfbf');
    for (let n = 0; n < 18; n++) {
      const x = lote.x0 + 3 + rnd() * (lote.x1 - lote.x0 - 6);
      const z = lote.z0 + 3 + rnd() * (lote.z1 - lote.z0 - 6);
      if (Math.abs(x - xm) < 3 || Math.abs(z - zm) < 3) continue;
      c.caja(x - 0.3, PISO, z - 0.3, x + 0.3, 4, z + 0.3, '#7a5230');
      const k = new THREE.ConeGeometry(2.6, 6, 7);
      k.translate(x, 6.6, z);
      c.forma('liso', k, ['#2e7d32', '#388e3c', '#43a047'][n % 3]);
      this.solido(x - 0.35, 0, z - 0.35, x + 0.35, 4, z + 0.35);
    }
    // Juegos: tobogán y hamacas.
    const tx = xm + 10;
    const tz = zm + 10;
    c.caja(tx - 1, PISO, tz - 1, tx + 1, PISO + 3.4, tz + 1, '#e53935');
    const rampa = new THREE.BoxGeometry(1.4, 0.2, 6);
    rampa.rotateX(-0.5);
    rampa.translate(tx, PISO + 1.8, tz + 3.4);
    c.forma('liso', rampa, '#fdd835');
    this.solido(tx - 1, 0, tz - 1, tx + 1, PISO + 3.4, tz + 1);
    const hx = xm - 10;
    const hz = zm - 10;
    for (const s of [-1, 1]) c.caja(hx + s * 3 - 0.15, PISO, hz - 0.15, hx + s * 3 + 0.15, PISO + 5, hz + 0.15, '#1e88e5');
    c.caja(hx - 3.2, PISO + 5, hz - 0.15, hx + 3.2, PISO + 5.3, hz + 0.15, '#1e88e5');
    for (const s of [-1.3, 1.3]) {
      c.caja(hx + s - 0.6, PISO + 1.2, hz - 0.4, hx + s + 0.6, PISO + 1.4, hz + 0.4, '#3a3d42');
      c.caja(hx + s - 0.03, PISO + 1.4, hz - 0.03, hx + s + 0.03, PISO + 5, hz + 0.03, '#9aa0a6');
    }
    this.banquito(c, xm + 6, zm - 4, 'x');
    this.banquito(c, xm - 6, zm + 4, 'x');
  }

  super(c, lote, rnd) {
    c.piso(lote.x0, lote.z0, lote.x1, lote.z1, PISO + 0.03, '#55585e');
    for (let x = lote.x0 + 4; x < lote.x1 - 4; x += 5) c.caja(x, PISO + 0.03, lote.z1 - 18, x + 0.2, PISO + 0.05, lote.z1 - 6, '#f2f2f2');
    const x0 = lote.x0 + 3;
    const x1 = lote.x1 - 3;
    const z0 = lote.z0 + 3;
    const z1 = lote.z1 - 22;
    c.caja(x0, PISO, z0, x1, PISO + 9, z1, '#eeeeee', { arriba: '#9e9e9e' });
    c.caja(x0, PISO + 7.4, z1, x1, PISO + 9, z1 + 0.2, '#d32f2f');
    c.caja((x0 + x1) / 2 - 6, PISO, z1, (x0 + x1) / 2 + 6, PISO + 4, z1 + 0.06, '#3c556b');
    c.cartel(10, (x0 + x1) / 2, PISO + 7.5, z1 + 0.25, '+z', 14, 1.6);
    this.solido(x0, 0, z0, x1, PISO + 9, z1);
    for (let n = 0; n < 5; n++) this.autoEstacionado(c, lote.x0 + 6.5 + n * 10, lote.z1 - 12, 'z', AUTOS[Math.floor(rnd() * AUTOS.length)]);
  }

  // Verdulería: un local abierto al frente, sobre la avenida, con toldo a rayas, cajones de
  // verdura en la vereda y el verdulero atrás del mostrador. Atrás, edificios comunes.
  verduleria(c, lote, rnd) {
    const fondo = lote.z1 - 22;
    this.comercial(c, { ...lote, z1: fondo }, rnd, 2, 4);
    c.piso(lote.x0, fondo, lote.x1, lote.z1, PISO + 0.02, '#c9c2b4');
    const xm = Math.round((lote.x0 + lote.x1) / 2);
    const x0 = xm - 11;
    const x1 = xm + 11;
    const z0 = lote.z1 - 19;
    const z1 = lote.z1 - 8;
    const alto = PISO + 8;
    const pared = '#f3ead7';
    c.caja(x0, PISO, z0, x1, alto, z0 + 0.6, pared);
    c.caja(x0, PISO, z0 + 0.6, x0 + 0.6, alto, z1, pared);
    c.caja(x1 - 0.6, PISO, z0 + 0.6, x1, alto, z1, pared);
    c.caja(x0, PISO + 6.2, z1 - 0.4, x1, alto, z1, pared);
    c.caja(x0 - 0.4, alto, z0 - 0.2, x1 + 0.4, alto + 0.5, z1 + 0.2, '#6b7d4a');
    c.piso(x0 + 0.6, z0 + 0.6, x1 - 0.6, z1, PISO + 0.05, '#d9cfbf');
    this.solido(x0, 0, z0, x1, alto, z0 + 0.6);
    this.solido(x0, 0, z0, x0 + 0.6, alto, z1);
    this.solido(x1 - 0.6, 0, z0, x1, alto, z1);
    this.solido(x0, PISO + 6.2, z1 - 0.4, x1, alto + 0.5, z1);
    this.solido(x0 - 0.4, alto, z0 - 0.2, x1 + 0.4, alto + 0.5, z1 + 0.2);
    // Toldo a rayas y cartel arriba.
    for (let k = 0; k < 11; k++) c.caja(x0 + k * 2, PISO + 6, z1, x0 + k * 2 + 2, PISO + 6.25, z1 + 3, k % 2 ? '#f5f5f5' : '#2e7d32');
    c.cartel(16, xm, PISO + 6.35, z1 + 0.03, '+z', 13, 1.4);
    // Verduras: bolitas de pocos polígonos (lechugas, tomates, naranjas, papas, zanahorias).
    const bola = (r, color, x, y, z, sy = 1) => {
      const g = new THREE.IcosahedronGeometry(r, 0);
      g.scale(1, sy, 1);
      g.translate(x, y, z);
      c.forma('liso', g, color);
    };
    const tipos = [
      ['#5ea935', 0.5, 0.85], ['#e53935', 0.3, 1], ['#fb8c00', 0.32, 1], ['#a1887f', 0.3, 0.8],
      ['#f57c00', 0.22, 2.2], ['#fdd835', 0.24, 1.8], ['#7b1fa2', 0.3, 1.1], ['#4caf50', 0.32, 1],
    ];
    const llenar = (a, b, y, z, ancho, t) => {
      const [color, r, sy] = tipos[t % tipos.length];
      for (let x = a + r + 0.1; x < b - r; x += r * 2.1) {
        for (let k = 0; k < Math.max(1, Math.floor(ancho / (r * 2.1))); k++) {
          bola(r, color, x + (rnd() - 0.5) * 0.1, y + r * sy * 0.8, z + r + k * r * 2.1, sy);
        }
      }
    };
    // Mostrador y estantes del fondo.
    c.caja(x0 + 2, PISO, z1 - 4.5, x1 - 2, PISO + 1.8, z1 - 3.5, '#8d6e63', { arriba: '#c8a27a' });
    this.solido(x0 + 2, 0, z1 - 4.5, x1 - 2, PISO + 1.8, z1 - 3.5);
    for (const [y, t0] of [[PISO + 1.6, 0], [PISO + 3.4, 3]]) {
      c.caja(x0 + 1, y - 0.15, z0 + 0.6, x1 - 1, y, z0 + 2, '#795548');
      for (let n = 0; n < 5; n++) llenar(x0 + 1 + n * 4, x0 + 1 + n * 4 + 3.8, y, z0 + 0.65, 1.3, t0 + n);
    }
    c.caja(x0 + 1, PISO, z0 + 0.6, x1 - 1, PISO + 1.45, z0 + 2, '#6d4c41');
    this.solido(x0 + 1, 0, z0 + 0.6, x1 - 1, PISO + 3.6, z0 + 2);
    // Cajones afuera, a los dos lados de la entrada (los de lechuga, adelante de todo).
    let t = 0;
    for (const [a, b] of [[x0 + 0.5, xm - 3], [xm + 3, x1 - 0.5]]) {
      for (let x = a; x < b - 1.9; x += 2.1) {
        c.caja(x, PISO, z1 + 0.4, x + 2, PISO + 1.3, z1 + 2.4, '#b07a45', { arriba: '#5d3d1e' });
        llenar(x, x + 2, PISO + 1.3, z1 + 0.45, 1.9, t === 0 || t === 5 ? 0 : t);
        t++;
      }
      this.solido(a, 0, z1 + 0.4, b, PISO + 1.6, z1 + 2.4);
    }
    this.verdu = { x: xm, z: z1 - 2.2, xVerdulero: xm, zVerdulero: z1 - 6.5 };
  }

  // Tienda de ropa sobre la avenida (el frente mira a -z): vidriera con maniquíes vestidos con
  // la ropa de la tienda, percheros, mostrador al fondo con el que atiende y el cartel arriba.
  // Atrás, un edificio. Las personas (maniquíes y vendedor) se ponen en crearPeatones().
  tienda(c, lote, rnd, T) {
    c.piso(lote.x0, lote.z0, lote.x1, lote.z1, PISO + 0.02, '#b9b4aa');
    this.edificio(c, lote.x0, lote.z0 + 30, lote.x1, lote.z1, 4 + Math.floor(rnd() * 3), rnd, { eje: 'z', lado: 1 }, true);
    const xm = Math.round((lote.x0 + lote.x1) / 2);
    const x0 = xm - 16;
    const x1 = xm + 16;
    const zf = lote.z0 + 2; // vidriera
    const zb = lote.z0 + 26; // pared del fondo
    const alto = PISO + 9;
    const pared = T.pared;
    c.piso(x0, zf, x1, zb, PISO + 0.05, T.id === 'drip' ? '#3a3a40' : '#ecebe7');
    c.caja(x0, PISO, zb - 0.6, x1, alto, zb, pared);
    c.caja(x0, PISO, zf, x0 + 0.6, alto, zb, pared);
    c.caja(x1 - 0.6, PISO, zf, x1, alto, zb, pared);
    c.caja(x0 - 0.3, alto, zf - 0.3, x1 + 0.3, alto + 0.6, zb + 0.3, '#2b2b2b');
    c.caja(x0 + 0.6, alto - 0.05, zf + 0.2, x1 - 0.6, alto, zb - 0.6, T.id === 'drip' ? '#1c1c20' : '#fafafa', { abajo: true }); // cielorraso
    // Luces del techo (paneles).
    for (let x = x0 + 5; x < x1 - 3; x += 7) for (let z = zf + 5; z < zb - 3; z += 7) c.caja(x - 1.2, alto - 0.12, z - 0.4, x + 1.2, alto - 0.05, z + 0.4, '#fffbe8', { lados: 'luz', abajo: true });
    this.solido(x0, 0, zb - 0.6, x1, alto, zb);
    this.solido(x0, 0, zf, x0 + 0.6, alto, zb);
    this.solido(x1 - 0.6, 0, zf, x1, alto, zb);
    this.solido(x0 - 0.3, alto, zf - 0.3, x1 + 0.3, alto + 0.6, zb + 0.3);
    // Vidriera con la puerta en el medio, y el frente de arriba (donde va el cartel).
    const puerta = 3;
    for (const [a, b] of [[x0 + 0.6, xm - puerta], [xm + puerta, x1 - 0.6]]) {
      c.caja(a, PISO, zf, b, PISO + 6, zf + 0.12, '#cfe6f5', { lados: 'cristal' });
      this.solido(a, 0, zf, b, PISO + 6, zf + 0.12);
      for (let x = a; x <= b; x += (b - a) / 3) c.caja(x - 0.08, PISO, zf - 0.04, x + 0.08, PISO + 6, zf + 0.16, '#222222');
    }
    c.caja(x0, PISO + 6, zf - 0.1, x1, alto, zf + 0.3, T.fondo);
    this.solido(x0, PISO + 6, zf - 0.1, x1, alto, zf + 0.3);
    // Pedestales de los maniquíes (adentro, contra la vidriera).
    const maniquies = [xm - 11, xm - 6.5, xm + 6.5, xm + 11];
    for (const x of maniquies.slice(0, 3)) {
      c.caja(x - 1.4, PISO, zf + 2.2, x + 1.4, PISO + 0.6, zf + 4.8, '#f2f2f2', { arriba: '#d9d9de' });
      this.solido(x - 1.4, 0, zf + 2.2, x + 1.4, PISO + 0.6, zf + 4.8);
    }
    // Percheros a los costados con prendas colgadas de los colores de la tienda.
    const colores = this.coloresTienda(T.id);
    for (const lado of [-1, 1]) {
      const x = lado < 0 ? x0 + 2.2 : x1 - 2.2;
      c.caja(x - 0.08, PISO, zf + 8, x + 0.08, PISO + 5, zf + 8.16, '#9e9e9e');
      c.caja(x - 0.08, PISO, zf + 18, x + 0.08, PISO + 5, zf + 18.16, '#9e9e9e');
      c.caja(x - 0.06, PISO + 4.9, zf + 8, x + 0.06, PISO + 5.02, zf + 18.16, '#bdbdbd');
      for (let k = 0; k < 14; k++) {
        const z = zf + 8.6 + k * 0.68;
        c.caja(x - 0.9, PISO + 2.2, z, x + 0.9, PISO + 4.8, z + 0.18, colores[k % colores.length]);
      }
      this.solido(x - 1, 0, zf + 8, x + 1, PISO + 5, zf + 18.2);
    }
    // Mostrador al fondo.
    c.caja(xm - 5, PISO, zb - 6.5, xm + 5, PISO + 2.2, zb - 5.3, '#ffffff', { arriba: '#2b2b2b' });
    this.solido(xm - 5, 0, zb - 6.5, xm + 5, PISO + 2.2, zb - 5.3);
    // Estantes en la pared del fondo (en Kicks, con zapatillas de verdad arriba).
    for (const y of [PISO + 2.5, PISO + 4.3, PISO + 6.1]) {
      c.caja(x0 + 2, y - 0.1, zb - 1.3, xm - 6, y, zb - 0.6, '#e0e0e0');
      c.caja(xm + 6, y - 0.1, zb - 1.3, x1 - 2, y, zb - 0.6, '#e0e0e0');
    }
    this.tiendas ??= {};
    this.tiendas[T.id] = { T, xm, zf, zb, maniquies, estantes: [[x0 + 2, xm - 6], [xm + 6, x1 - 2]] };
  }

  coloresTienda(id) {
    return { kicks: ['#1b1b1b', '#e8e8e8', '#c62828', '#9e9e9e'], drip: ['#111111', '#8eb4f1', '#f2f2f2', '#54472b', '#2a2a2a'], futbolera: ['#0d47a1', '#f2f2f4', '#111111', '#f6c90e', '#202e5a'] }[id];
  }

  // Cartel con el nombre (o el logo) y lo que va adentro de la tienda: maniquíes, vendedor y,
  // en Kicks, zapatillas en los estantes.
  async armarTienda(t) {
    const { T, xm, zf, zb, maniquies, estantes } = t;
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = T.fondo;
    g.fillRect(0, 0, 1024, 256);
    const logo = T.logo ? await cargarImagen(T.logo) : null;
    if (logo) {
      // El logo es negro sobre blanco: se recorta al centro.
      g.drawImage(logo, logo.width * 0.12, logo.height * 0.3, logo.width * 0.76, logo.height * 0.4, 262, 28, 500, 200);
    } else {
      g.fillStyle = T.letras;
      g.font = '900 150px Arial, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(T.nombre, 512, 136, 960);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const cartel = new THREE.Mesh(new THREE.PlaneGeometry(24, 6), new THREE.MeshBasicMaterial({ map: tex }));
    cartel.position.set(xm, PISO + 7.5, zf - 0.12);
    cartel.rotation.y = Math.PI;
    this.grupo.add(cartel);
    // Maniquíes con la ropa de la tienda.
    for (let i = 0; i < T.maniquies.length; i++) {
      const m = crearPersonaje(MANIQUI, cabezaManiqui(), await vestido(T.maniquies[i]));
      m.grupo.position.set(maniquies[i], PISO + 0.6, zf + 3.5);
      m.grupo.rotation.y = Math.PI;
      m.animar(0.016, 0, true);
      this.grupo.add(m.grupo);
      this.figuras.push(m);
    }
    // El que atiende, vestido con ropa de la tienda.
    const v = T.vendedor;
    const p = { id: `vendedor_${T.id}`, nombre: ' ', sinFoto: true, piel: v.piel, pelo: v.pelo, peinado: v.peinado, remera: v.remera, pantalon: v.pantalon };
    const cab = await cargarCabeza(p);
    if (!cab.dibujada) {
      dibujarCara(cab.frente, p.piel, p.pelo);
      cab.dibujada = true;
    }
    const mod = crearPersonaje(p, cab, await vestido(v.ropa));
    mod.grupo.position.set(xm, PISO, zb - 3.4);
    mod.grupo.rotation.y = Math.PI;
    this.grupo.add(mod.grupo);
    t.vendedor = mod;
    t.cara = cab.frente;
    t.etiqueta = crearEtiqueta([{ texto: v.nombre, tam: 60, color: '#ffffff' }], 6);
    t.etiqueta.sprite.position.y = 7;
    mod.grupo.add(t.etiqueta.sprite);
    t.globo = 0;
    this.figuras.push(mod);
    if (T.id === 'kicks') {
      const ids = ['jordan1', 'jordanbalvin', 'nikeshox', 'nikeshoxr4', 'niketn', 'jordan1'];
      let k = 0;
      for (const [a, b] of estantes) {
        for (const y of [PISO + 2.5, PISO + 4.3]) {
          for (let n = 0; n < 2; n++) {
            const z = crearZapatilla(ids[k++ % ids.length]);
            z.scale.setScalar(0.75);
            z.rotation.y = Math.PI / 2 * (n ? 1 : -1);
            z.position.set(a + (b - a) * (0.3 + n * 0.4), y, zb - 0.95);
            this.grupo.add(z);
          }
        }
      }
    }
  }

  // El que atiende dice algo (arriba de la cabeza, unos segundos).
  decir(t, texto) {
    t.etiqueta.actualizar([{ texto: t.T.vendedor.nombre, tam: 60, color: '#ffffff' }, { texto, tam: 40 }]);
    t.globo = 5;
  }

  // ---------- Canchas jugables ----------
  crearJuegos() {
    const pelota = (r, color, x, z, raya) => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), new THREE.MeshLambertMaterial({ color })));
      if (raya) {
        const t = new THREE.Mesh(new THREE.TorusGeometry(r * 1.002, r * 0.06, 4, 20), new THREE.MeshLambertMaterial({ color: raya }));
        g.add(t);
        const t2 = t.clone();
        t2.rotation.y = Math.PI / 2;
        g.add(t2);
      }
      g.position.set(C.x + x, PISO + r, C.z + z);
      this.escena.add(g);
      return { m: g, r, vel: new THREE.Vector3(), x0: x, z0: z };
    };
    const F = this.futbol;
    this.pelotaFutbol = pelota(0.9, '#fafafa', F.xm, F.zm, '#212121');
    const B = this.basquet;
    this.pelotaBasquet = pelota(0.6, '#e8701a', B.xm, B.zm + 2, '#3a1c06');
    this.puntos = 0;
  }

  empujar(p, jugador, fuerzaBase) {
    const b = p.m.position;
    const dx = b.x - jugador.pos.x;
    const dz = b.z - jugador.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < p.r + 0.9 && jugador.pos.y < b.y + 1) {
      const fuerza = fuerzaBase + Math.hypot(jugador.vel.x, jugador.vel.z) * 0.6;
      p.vel.set((dx / (d || 1)) * fuerza, fuerzaBase * 0.35, (dz / (d || 1)) * fuerza);
    }
  }

  fisica(p, dt, x0, x1, z0, z1) {
    const b = p.m.position;
    p.vel.y -= 30 * dt;
    b.addScaledVector(p.vel, dt);
    const suelo = PISO + p.r;
    if (b.y < suelo) {
      b.y = suelo;
      p.vel.y = Math.abs(p.vel.y) > 2 ? -p.vel.y * 0.6 : 0;
      p.vel.x *= 1 - dt * 1.1;
      p.vel.z *= 1 - dt * 1.1;
    }
    if (b.x < C.x + x0 || b.x > C.x + x1) { b.x = THREE.MathUtils.clamp(b.x, C.x + x0, C.x + x1); p.vel.x *= -0.6; }
    if (b.z < C.z + z0 || b.z > C.z + z1) { b.z = THREE.MathUtils.clamp(b.z, C.z + z0, C.z + z1); p.vel.z *= -0.6; }
    p.m.rotation.x += (p.vel.z * dt) / p.r;
    p.m.rotation.z -= (p.vel.x * dt) / p.r;
  }

  futbolActualizar(dt, jugador) {
    const p = this.pelotaFutbol;
    const F = this.futbol;
    this.empujar(p, jugador, 10);
    this.fisica(p, dt, F.xm - F.L - 3, F.xm + F.L + 3, F.zm - F.A, F.zm + F.A);
    const b = p.m.position;
    const lx = b.x - C.x - F.xm;
    if (Math.abs(lx) > F.L && Math.abs(b.z - C.z - F.zm) < 3.3 && b.y < PISO + 3) {
      sfx.gol();
      this.ui.toast('¡¡GOOOOL!!', 'plata');
      b.set(C.x + F.xm, PISO + 4, C.z + F.zm);
      p.vel.set(0, 0, 0);
    }
  }

  // Tiro al aro: la pelota sale en parábola hacia el aro más cerca; de lejos se erra más.
  tirar(jugador) {
    const p = this.pelotaBasquet;
    const B = this.basquet;
    const b = p.m.position;
    const aro = B.aros.reduce((a, r) => (Math.abs(C.x + r.x - jugador.pos.x) < Math.abs(C.x + a.x - jugador.pos.x) ? r : a));
    const destino = new THREE.Vector3(C.x + aro.x, aro.y + 0.15, C.z + aro.z);
    const desde = new THREE.Vector3(jugador.pos.x, jugador.pos.y + 5.2, jugador.pos.z);
    const d = Math.hypot(destino.x - desde.x, destino.z - desde.z);
    const probabilidad = THREE.MathUtils.clamp(1.05 - d / 26, 0.22, 0.9);
    const entra = Math.random() < probabilidad;
    if (!entra) {
      const a = Math.random() * Math.PI * 2;
      destino.x += Math.cos(a) * (0.9 + Math.random() * 0.7);
      destino.z += Math.sin(a) * (0.9 + Math.random() * 0.7);
    }
    const T = 0.85 + d * 0.035;
    b.copy(desde);
    p.vel.set((destino.x - desde.x) / T, (destino.y - desde.y) / T + 0.5 * 30 * T, (destino.z - desde.z) / T);
    p.tiro = { aro, triple: d > 12, contado: false };
    sfx.salto();
  }

  basquetActualizar(dt, jugador) {
    const p = this.pelotaBasquet;
    const B = this.basquet;
    if (!p.tiro) this.empujar(p, jugador, 6);
    const b = p.m.position;
    const yAntes = b.y;
    this.fisica(p, dt, B.xm - B.L - 2.5, B.xm + B.L + 2.5, B.zm - B.A - 2, B.zm + B.A + 2);
    // Tablero: rebota.
    for (const aro of B.aros) {
      const xt = C.x + aro.tablero;
      const lado = Math.sign(b.x - xt);
      if (Math.abs(b.x - xt) < p.r && Math.abs(b.z - C.z - aro.z) < 1.8 && b.y > PISO + 7.2 && b.y < PISO + 9.8 && lado === -aro.s) {
        b.x = xt - aro.s * p.r;
        p.vel.x = -p.vel.x * 0.6;
      }
    }
    // ¿Pasó por el aro bajando?
    const t = p.tiro;
    if (t && !t.contado) {
      const ay = t.aro.y;
      if (yAntes >= ay && b.y < ay && p.vel.y < 0) {
        const h = Math.hypot(b.x - (C.x + t.aro.x), b.z - (C.z + t.aro.z));
        t.contado = true;
        if (h < 0.75) {
          t.adentro = true;
          const pts = t.triple ? 3 : 2;
          this.puntos += pts;
          sfx.gol();
          this.ui.toast(`¡Canasta! +${pts} (llevás ${this.puntos})`, 'plata');
          p.vel.x *= 0.2;
          p.vel.z *= 0.2;
        } else if (h < 1.3) {
          // Pegó en el aro: rebota para afuera.
          p.vel.x = (b.x - (C.x + t.aro.x)) * 4;
          p.vel.z = (b.z - (C.z + t.aro.z)) * 4;
          p.vel.y = 6;
        }
      }
    }
    if (t && b.y <= PISO + p.r + 0.01 && Math.abs(p.vel.y) < 0.5) {
      if (!t.adentro) this.ui.toast('Uh, no entró. ¡Probá más cerca del aro!', 'info');
      p.tiro = null;
    }
  }

  cercaVerdu(jugador) {
    const v = this.verdu;
    return v && jugador.pos.y < 3 && Math.hypot(jugador.pos.x - (C.x + v.x), jugador.pos.z - (C.z + v.z)) < 4.5;
  }

  // La tienda en cuyo mostrador estás (o null).
  tiendaCerca(jugador) {
    if (!this.tiendas || jugador.pos.y > 3) return null;
    for (const t of Object.values(this.tiendas)) {
      if (t.vendedor && Math.hypot(jugador.pos.x - (C.x + t.xm), jugador.pos.z - (C.z + t.zb - 8)) < 4.5) return t;
    }
    return null;
  }

  accion(jugador) {
    if (!this.lista || !this.adentro(jugador.pos)) return '';
    if (this.cercaVerdu(jugador)) return `Comprar lechuga $${this.precioLechuga} (E)`;
    if (this.tiendaCerca(jugador)) return 'Ver la ropa (E)';
    const p = this.pelotaBasquet;
    if (p.tiro) return '';
    const d = p.m.position.distanceTo(jugador.pos.clone().setY(p.m.position.y));
    return d < 3.5 ? 'Tirar al aro (E)' : '';
  }

  hacer(jugador) {
    const t = this.tiendaCerca(jugador);
    if (t) this.alTienda?.(t);
    else if (this.cercaVerdu(jugador)) this.alComprarLechuga?.();
    else if (this.accion(jugador)) this.tirar(jugador);
  }

  // ---------- Gente caminando ----------
  async crearPeatones() {
    const rnd = aleatorio(77);
    const pieles = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac', '#f3d3bd'];
    const pelos = ['#1b1411', '#3e2723', '#6d4c41', '#c8a165', '#2b2b2b', '#8d6e63'];
    const ropa = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#fb8c00', '#00acc1', '#6d4c41', '#f5f5f5', '#212121', '#ec407a'];
    const pantalones = ['#1e3a8a', '#37474f', '#212121', '#5d4037', '#795548', '#455a64'];
    // Más gente en el centro que en las afueras.
    for (let n = 0; n < PEATONES; n++) {
      const cerca = n % 3 !== 2;
      const i = cerca ? 2 + Math.floor(rnd() * 4) : Math.floor(rnd() * N);
      const j = cerca ? 2 + Math.floor(rnd() * 4) : Math.floor(rnd() * N);
      const m = manzana(i, j);
      const p = {
        id: `peaton${n % 10}`, nombre: ' ', sinFoto: true, piel: pieles[n % pieles.length], pelo: pelos[(n * 3) % pelos.length], peinado: ['liso', 'ondulado', 'rulos'][n % 3],
        remera: ropa[Math.floor(rnd() * ropa.length)], pantalon: pantalones[Math.floor(rnd() * pantalones.length)], cuerpo: rnd() < 0.15 ? 'gordo' : undefined,
      };
      const cab = await cargarCabeza(p);
      if (!cab.dibujada) {
        dibujarCara(cab.frente, p.piel, p.pelo);
        cab.dibujada = true;
      }
      const mod = crearPersonaje(p, cab);
      mod.grupo.scale.setScalar(0.92 + rnd() * 0.16);
      // Recorre la vereda alrededor de su manzana, por el medio de la vereda.
      const r = { x0: m.x0 + 2.8, x1: m.x1 - 2.8, z0: m.z0 + 2.8, z1: m.z1 - 2.8 };
      const perimetro = 2 * (r.x1 - r.x0 + r.z1 - r.z0);
      const peaton = { mod, r, perimetro, s: rnd() * perimetro, vel: (3.2 + rnd() * 2.2) * (rnd() < 0.5 ? 1 : -1), pausa: 0 };
      this.grupo.add(mod.grupo);
      this.peatones.push(peaton);
      this.moverPeaton(peaton, 0);
    }
    for (const t of Object.values(this.tiendas || {})) await this.armarTienda(t);
    // El verdulero, parado atrás del mostrador.
    const v = this.verdu;
    if (v) {
      const p = { id: 'verdulero', nombre: ' ', sinFoto: true, piel: '#e0ac69', pelo: '#3e2723', peinado: 'liso', remera: '#f5f5f5', pantalon: '#5d4037', cuerpo: 'gordo' };
      const cab = await cargarCabeza(p);
      if (!cab.dibujada) {
        dibujarCara(cab.frente, p.piel, p.pelo);
        cab.dibujada = true;
      }
      this.verdulero = crearPersonaje(p, cab);
      this.verdulero.grupo.position.set(v.xVerdulero, PISO, v.zVerdulero);
      this.grupo.add(this.verdulero.grupo);
    }
  }

  moverPeaton(p, dt) {
    if (p.pausa > 0) {
      p.pausa -= dt;
      p.mod.animar(dt, 0, true);
      return;
    }
    if (Math.random() < dt * 0.04) p.pausa = 2 + Math.random() * 4;
    p.s = THREE.MathUtils.euclideanModulo(p.s + p.vel * dt, p.perimetro);
    const { r } = p;
    const a = r.x1 - r.x0;
    const b = r.z1 - r.z0;
    let x;
    let z;
    let dir;
    let s = p.s;
    if (s < a) { x = r.x0 + s; z = r.z0; dir = Math.PI / 2; } else if ((s -= a) < b) { x = r.x1; z = r.z0 + s; dir = 0; } else if ((s -= b) < a) { x = r.x1 - s; z = r.z1; dir = -Math.PI / 2; } else { s -= a; x = r.x0; z = r.z1 - s; dir = Math.PI; }
    if (p.vel < 0) dir += Math.PI;
    const g = p.mod.grupo;
    g.position.set(x, PISO, z);
    let d = dir - g.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    g.rotation.y += d * Math.min(1, dt * 8 || 1);
    p.mod.animar(dt, Math.abs(p.vel), true);
  }

  // ---------- Cada cuadro ----------
  actualizar(dt, jugador, jugando) {
    // Se empieza a armar cuando te vas acercando por la autopista (una manzana por cuadro).
    if (!this.pendientes && jugador.pos.x < AU.x0 + 9000) this.empezar();
    if (this.pendientes && this.pendientes.length) this.armarUna();
    if (!this.lista) return;
    const adentro = this.adentro(jugador.pos);
    if (adentro && !this.estuvo && jugando) this.ui.toast('¡Bienvenido a Ciudad Vecibanda!', 'plata');
    this.estuvo = adentro;
    if (Math.abs(jugador.pos.x - C.x) > RADIO_CIUDAD + 400) return;
    // Solo se mueve (y se dibuja) la gente de alrededor.
    const l = this.local(jugador.pos);
    for (const p of this.peatones) {
      const g = p.mod.grupo.position;
      const ver = Math.abs(g.x - l.x) < VER_GENTE && Math.abs(g.z - l.z) < VER_GENTE;
      p.mod.grupo.visible = ver;
      if (ver) this.moverPeaton(p, dt);
    }
    this.verdulero?.animar(dt, 0, true);
    for (const t of Object.values(this.tiendas || {})) {
      t.vendedor?.animar(dt, 0, true);
      if (t.globo > 0 && (t.globo -= dt) <= 0) t.etiqueta.actualizar([{ texto: t.T.vendedor.nombre, tam: 60, color: '#ffffff' }]);
    }
    this.futbolActualizar(dt, jugador);
    this.basquetActualizar(dt, jugador);
  }
}

// Cara simple (estilo Roblox) para la gente de la ciudad: ojos, cejas y sonrisa.
function dibujarCara(canvas, piel, pelo) {
  const g = canvas.getContext('2d');
  const s = canvas.width;
  g.fillStyle = piel;
  g.fillRect(0, 0, s, s);
  g.fillStyle = pelo;
  g.fillRect(0, 0, s, s * 0.2);
  g.fillRect(0, 0, s * 0.08, s * 0.4);
  g.fillRect(s * 0.92, 0, s * 0.08, s * 0.4);
  g.fillStyle = '#1b1b1b';
  for (const x of [0.34, 0.66]) {
    g.beginPath();
    g.ellipse(s * x, s * 0.47, s * 0.045, s * 0.07, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.lineWidth = s * 0.03;
  g.strokeStyle = '#1b1b1b';
  for (const x of [0.34, 0.66]) {
    g.beginPath();
    g.moveTo(s * (x - 0.08), s * 0.35);
    g.lineTo(s * (x + 0.08), s * 0.34);
    g.stroke();
  }
  g.beginPath();
  g.arc(s * 0.5, s * 0.6, s * 0.16, 0.15 * Math.PI, 0.85 * Math.PI);
  g.stroke();
}
