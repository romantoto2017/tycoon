import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { AUTOS, AUTO_DEPORTIVO } from '../data/objetos.js';
import { mat, formato } from './util.js';
import { LIMITE_MAPA, CONCESIONARIO as CO, AUTOPISTA as AU, GALPON_LUGARES, AUTOS_DESDE, TALLER as TA } from './constantes.js';
import { crearEtiqueta } from './texturas.js';
import { CATEGORIAS, PINTURA, COLORES, PRECIO_DEPORTIVO } from '../data/taller.js';
import { sfx } from './sfx.js';

const RADIO = 2.3;
export const VEL_MAX = 34; // tope en el barrio y en la ciudad para el Auto Deportivo (unos 50 km/h)
const VEL_ATRAS = -10;
const M = 2.47; // 1 m en unidades del juego
const G = 9.8 * M; // 1 g

// ---------- Física de verdad ----------
// Cada auto con sus números reales (data/objetos.js): velocidad máxima, 0 a 100 km/h y agarre.
// La aceleración baja a medida que se acerca a la máxima: a = a0 · (1 − v / vmax), con a0 sacado
// del 0 a 100. Frena con el agarre (≈ 1 g) y, a más velocidad, menos puede doblar: el giro se
// limita a agarre / velocidad (la aceleración lateral de verdad), así hay que frenar para las curvas.
//
// mejoras: los niveles del taller ({ motor, turbo, gomas, frenos }, de 0 a 4; data/taller.js).
export function efectoMejora(cat, nivel) {
  const c = CATEGORIAS.find((k) => k.id === cat);
  return nivel > 0 && c ? c.niveles[Math.min(nivel, c.niveles.length) - 1].efecto : 0;
}
export function specsAuto(def, mejoras = {}) {
  const m = (cat) => 1 + efectoMejora(cat, mejoras[cat] || 0);
  const v = (def.vmax / 3.6) * M * m('motor');
  const v100 = (100 / 3.6) * M;
  return {
    v, // velocidad máxima (unidades por segundo)
    a0: (-v * Math.log(1 - v100 / v)) / (def.cero100 / m('turbo')),
    freno: def.agarre * G * m('frenos'),
    lateral: def.agarre * G * m('gomas'),
    // En el barrio y la ciudad hay un tope (como si fuera la velocidad permitida), más alto para los rápidos.
    barrio: Math.min(v, VEL_MAX * Math.sqrt(def.vmax / AUTO_DEPORTIVO.vmax)),
  };
}

// Un paso de manejo (sin choques), igual para el jugador y para la simulación del autódromo.
// a: { pos: {x, z}, angulo, vel, direccion, velMax, specs }; ejes: { x: doblar, y: acelerar,
// freno: el botón de saltar (frena a fondo, para adelante o para atrás), derrape: Shift o el
// botón de derrapar }.
//
// Derrapar: la cola se suelta. La trompa gira más rápido que la trayectoria (a.deriva es el
// ángulo entre para dónde mira el auto y para dónde va) y el auto se va de costado, perdiendo
// velocidad según cuánto cruce. Al soltar, las ruedas agarran de nuevo y el auto se endereza.
export function pasoAuto(a, ejes, dt) {
  const sp = a.specs;
  const tope = Math.min(a.velMax || sp.barrio, sp.v);
  const acel = ejes.y;
  a.frenando = !!ejes.freno || (acel < 0 && a.vel > 0.3) || (acel > 0 && a.vel < -0.3);
  if (ejes.freno) {
    const f = sp.freno * 1.15 * dt;
    a.vel = Math.abs(a.vel) <= f ? 0 : a.vel - Math.sign(a.vel) * f;
  } else if (acel > 0 && a.vel >= 0) {
    if (a.vel < tope) a.vel = Math.min(tope, a.vel + sp.a0 * (1 - a.vel / sp.v) * acel * dt);
  } else if (acel < 0 && a.vel > 0.3) {
    a.vel = Math.max(0, a.vel + sp.freno * acel * dt); // frena
  } else if (acel > 0 && a.vel < 0) {
    a.vel = Math.min(0, a.vel + sp.freno * acel * dt);
  } else if (acel < 0) {
    a.vel = Math.max(VEL_ATRAS, a.vel + sp.a0 * 0.5 * acel * dt); // marcha atrás
  } else {
    // Sin acelerar: freno motor, rozamiento y el aire (que pesa mucho más a alta velocidad).
    const s = Math.sign(a.vel);
    a.vel -= s * Math.min(Math.abs(a.vel), (3 + 0.00029 * a.vel * a.vel) * dt);
  }
  // Al pasar a una zona más lenta (de la autopista al barrio) frena de a poco hasta el tope.
  if (a.vel > tope) a.vel = Math.max(tope, a.vel - 70 * dt);
  a.direccion += (ejes.x * 0.45 - a.direccion) * Math.min(1, dt * 8);
  const derrapa = !!ejes.derrape && a.vel > 6;
  let giro = a.direccion * 3.6 * Math.max(-1, Math.min(1, a.vel / 10)) * (derrapa ? 1.6 : 1);
  const maxGiro = (sp.lateral / Math.max(Math.abs(a.vel), 1)) * (derrapa ? 1.35 : 1);
  giro = Math.max(-maxGiro, Math.min(maxGiro, giro));
  a.angulo -= giro * dt;
  let deriva = a.deriva || 0;
  if (derrapa) deriva -= giro * dt * 0.7; // la cola se va para afuera
  deriva *= Math.exp(-(derrapa ? 0.9 : 6) * dt); // las ruedas vuelven a agarrar
  deriva = Math.max(-1.1, Math.min(1.1, deriva));
  if (Math.abs(deriva) < 0.002) deriva = 0;
  a.deriva = deriva;
  // De costado frena (el rozamiento de las gomas cruzadas).
  if (deriva) a.vel -= Math.sign(a.vel) * Math.min(Math.abs(a.vel), Math.abs(Math.sin(deriva)) * sp.freno * dt);
  const rumbo = a.angulo - deriva; // para dónde va de verdad
  a.pos.x = Math.max(LIMITE_MAPA.x0, Math.min(LIMITE_MAPA.x1, a.pos.x + Math.sin(rumbo) * a.vel * dt));
  a.pos.z = Math.max(LIMITE_MAPA.z0, Math.min(LIMITE_MAPA.z1, a.pos.z + Math.cos(rumbo) * a.vel * dt));
}

// "Auto Deportivo" (en el juego se llama así para trollear): en realidad es un BYD F0
// plateado, el "auto papa" (ver assets/especiales/byd*.jpeg). Medidas del de verdad
// (3,46 x 1,62 x 1,46 m) a la escala del juego: 1 m = 2,47 unidades.
//
// La carrocería es una sola superficie curva: a lo largo (z) cada corte es una
// superelipse (redondeada como una papa) que va del piso (B) al techo (T) del perfil
// lateral, y en las puntas se achica para cerrar la trompa y la cola. Los vidrios, faros,
// ópticas, parrilla, manijas y pasaruedas son "calcos" que siguen esa misma superficie.

const APAGADA = '#7c0b12'; // ópticas traseras apagadas y prendidas (al frenar)
const PRENDIDA = '#ff2a1c';
const L = 4.25; // medio largo
const ANCHO = 2.02; // medio ancho
const N_ARRIBA = 3.2; // exponente de la superelipse arriba (más redondo: la papa)
const N_ABAJO = 4.2; // y abajo (más cuadrado)
const RUEDA = { r: 0.72, ancho: 0.55, x: 1.6, adelante: 2.65, atras: -3.09 };

// Interpolación monótona (Fritsch-Carlson): curva suave que pasa por los puntos sin pasarse.
function curva(puntos) {
  const xs = puntos.map((p) => p[0]);
  const ys = puntos.map((p) => p[1]);
  const n = xs.length;
  const d = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  const m = [d[0]];
  for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
  m.push(d[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

// Perfil lateral del F0 (z: atrás -4,25 a adelante +4,25): techo alto y largo, parabrisas
// largo y muy acostado, capot cortito; la cola casi vertical.
const T = curva([[-4.25, 3.3], [-3.4, 3.48], [-2.2, 3.58], [-0.8, 3.62], [0.3, 3.58], [0.75, 3.48], [1.6, 2.98], [2.5, 2.46], [3.3, 2.3], [4.25, 2.12]]);
const B = curva([[-4.25, 0.85], [-3.6, 0.6], [-2.6, 0.45], [2.4, 0.45], [3.6, 0.5], [4.25, 0.62]]);
const cintura = (z) => 2.4 + (2.3 - z) * 0.035; // línea de las ventanas: sube hacia atrás
// Redondeo de las puntas visto desde arriba: la trompa más redonda, la cola más cortada.
const punta = (zn) => Math.pow(Math.max(0, 1 - Math.pow(Math.abs(zn), zn > 0 ? 4.2 : 5.5)), zn > 0 ? 1 / 4.2 : 1 / 5.5);

// Corte de la carrocería en zn (-1 a 1): centro, medio alto y medio ancho.
function corte(zn) {
  const z = zn * L;
  const t = T(z);
  const b = B(z);
  const f = punta(zn);
  return { z, yc: (t + b) / 2, h: ((t - b) / 2) * f, w: (zn > 0.6 ? ANCHO - 0.07 * (zn - 0.6) / 0.4 : ANCHO) * f };
}
const sp = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);

// Punto de la carrocería en (zn, a): a es el ángulo alrededor del corte (0 = costado
// derecho, PI/2 = arriba, -PI/2 = abajo).
function punto(zn, a, out = new THREE.Vector3()) {
  const c = corte(zn);
  const s = Math.sin(a);
  const n = s >= 0 ? N_ARRIBA : N_ABAJO;
  return out.set(c.w * sp(Math.cos(a), 2 / n), c.yc + c.h * sp(s, 2 / n), c.z);
}

const pA = new THREE.Vector3();
const pB = new THREE.Vector3();
const pC = new THREE.Vector3();
// Normal hacia afuera en (zn, a).
function normal(zn, a, out = new THREE.Vector3()) {
  punto(zn + 1e-3, a, pA).sub(punto(zn - 1e-3, a, pB));
  punto(zn, a + 1e-3, pC).sub(punto(zn, a - 1e-3, pB));
  out.crossVectors(pC, pA).normalize();
  const p = punto(zn, a, pB);
  if (out.dot(pA.set(p.x, p.y - corte(zn).yc, p.z)) < 0) out.negate();
  return out;
}

// ---------- Del dibujo a la superficie ----------
// Costado (z, y) -> (zn, a). lado: 1 derecho, -1 izquierdo.
function delCostado(z, y, lado) {
  const zn = z / L;
  const c = corte(zn);
  const r = THREE.MathUtils.clamp((y - c.yc) / c.h, -0.999, 0.999);
  const a = Math.asin(sp(r, (r >= 0 ? N_ARRIBA : N_ABAJO) / 2));
  return [zn, lado > 0 ? a : Math.PI - a];
}
// Visto de frente o de atrás (x, y) -> (zn, a): busca el corte donde ese punto queda en el
// borde (de adelante: el más adelantado). desde/hasta: rango de zn donde buscar.
function delFrente(x, y, desde, hasta) {
  const adentro = (zn) => {
    const c = corte(zn);
    const n = y >= c.yc ? N_ARRIBA : N_ABAJO;
    return Math.pow(Math.abs(x) / c.w, n) + Math.pow(Math.abs(y - c.yc) / c.h, n) <= 1;
  };
  let lo = desde;
  let hi = hasta;
  if (!adentro(lo)) return null;
  for (let i = 0; i < 26; i++) {
    const m = (lo + hi) / 2;
    if (adentro(m)) lo = m; else hi = m;
  }
  const c = corte(lo);
  const n = y >= c.yc ? N_ARRIBA : N_ABAJO;
  return [lo, Math.atan2(sp((y - c.yc) / c.h, n / 2), sp(x / c.w, n / 2))];
}
// Visto de arriba (x, z) -> (zn, a) en la mitad de arriba.
function deArriba(x, z) {
  const zn = z / L;
  const c = corte(zn);
  return [zn, Math.acos(THREE.MathUtils.clamp(sp(x / c.w, N_ARRIBA / 2), -1, 1))];
}

// Calco: grilla entre las curvas abajo(s) y arriba(s) para s de s0 a s1, llevada a la
// superficie con aSup(s, t) -> [zn, a], y separada un poquito hacia afuera.
function calco(s0, s1, abajo, arriba, aSup, separacion = 0.014, ns = 18, nt = 6) {
  const pos = [];
  const idx = [];
  const p = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  const ok = [];
  for (let i = 0; i <= ns; i++) {
    const s = s0 + ((s1 - s0) * i) / ns;
    const lo = abajo(s);
    const hi = arriba(s);
    for (let j = 0; j <= nt; j++) {
      const t = lo + ((hi - lo) * j) / nt;
      const q = aSup(s, t);
      ok.push(!!q);
      if (!q) { pos.push(0, 0, 0); continue; }
      punto(q[0], q[1], p).addScaledVector(normal(q[0], q[1], nrm), separacion);
      pos.push(p.x, p.y, p.z);
    }
  }
  for (let i = 0; i < ns; i++) {
    for (let j = 0; j < nt; j++) {
      const a = i * (nt + 1) + j;
      const b = a + nt + 1;
      if (ok[a] && ok[b] && ok[a + 1] && ok[b + 1]) idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}
// Formas para los calcos: elipse (centro y medios) y rectángulo con puntas redondeadas.
const elipse = (cs, ct, rs, rt) => [cs - rs, cs + rs, (s) => ct - rt * Math.sqrt(Math.max(0, 1 - ((s - cs) / rs) ** 2)), (s) => ct + rt * Math.sqrt(Math.max(0, 1 - ((s - cs) / rs) ** 2))];
const pastilla = (s0, s1, ct, rt, e = 6) => [s0, s1, (s) => ct - rt * Math.pow(Math.max(0, 1 - Math.abs((2 * s - s0 - s1) / (s1 - s0)) ** e), 1 / e), (s) => ct + rt * Math.pow(Math.max(0, 1 - Math.abs((2 * s - s0 - s1) / (s1 - s0)) ** e), 1 / e)];

// Taza de las ruedas: plateada con 10 rayos y el centro con el logo (como la de la foto).
function texturaTaza() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const m = 128;
  g.fillStyle = '#202225';
  g.fillRect(0, 0, 256, 256);
  const plata = g.createRadialGradient(m - 30, m - 30, 10, m, m, m);
  plata.addColorStop(0, '#f1f3f5');
  plata.addColorStop(1, '#a9aeb3');
  g.fillStyle = plata;
  g.beginPath(); g.arc(m, m, 122, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#2b2e32';
  for (let i = 0; i < 10; i++) {
    g.save();
    g.translate(m, m);
    g.rotate((i / 10) * Math.PI * 2);
    g.beginPath();
    g.moveTo(-9, -46); g.lineTo(9, -46); g.lineTo(17, -104); g.lineTo(-17, -104);
    g.closePath(); g.fill();
    g.restore();
  }
  g.strokeStyle = '#8d9298';
  g.lineWidth = 5;
  g.beginPath(); g.arc(m, m, 112, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#d7dbdf';
  g.beginPath(); g.arc(m, m, 34, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#7d8288';
  g.lineWidth = 3;
  g.beginPath(); g.ellipse(m, m, 20, 12, 0, 0, Math.PI * 2); g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Auto {
  constructor(escena, x, z, angulo = 0) {
    this.pos = new THREE.Vector3(x, 0, z);
    this.angulo = angulo;
    this.vel = 0;
    this.direccion = 0;
    this.def = AUTO_DEPORTIVO;
    this.specs = specsAuto(AUTO_DEPORTIVO);
    this.alto = 3.6;
    this.grupo = new THREE.Group();
    this.ruedas = [];
    this.delanteras = [];
    this.armar();
    escena.add(this.grupo);
    // Caja de choque para el jugador a pie (la cámara la ignora).
    this.caja = new THREE.Box3();
    this.caja.camara = false;
    this.colocar();
  }

  armar() {
    const g = this.grupo;
    // Plata con brillo (el único material con reflejo del juego: es el auto).
    const plata = new THREE.MeshPhongMaterial({ color: '#b9bec3', specular: '#7d858c', shininess: 35 });
    this.partes = { carroceria: [plata], llantas: [] }; // lo que se pinta en el taller
    const calcoMat = (color, brillo = false) => new THREE.MeshPhongMaterial({
      color, specular: brillo ? '#ffffff' : '#222222', shininess: brillo ? 90 : 10, side: THREE.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    const luz = (color) => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    const vidrio = calcoMat('#1b2229', true);
    const polarizado = calcoMat('#101317', true);
    const negro = calcoMat('#141517');
    const gris = calcoMat('#2c2f33');
    const cromo = calcoMat('#e3e7ea', true);
    const plataOscura = calcoMat('#a3a9af', true);
    const pon = (geo, m) => { const malla = new THREE.Mesh(geo, m); g.add(malla); return malla; };

    // ---------- Carrocería ----------
    const NU = 72;
    const NV = 56;
    const pos = [];
    const idx = [];
    const p = new THREE.Vector3();
    for (let i = 0; i <= NU; i++) {
      const t = -1 + (2 * i) / NU;
      const zn = Math.sin((t * Math.PI) / 2); // más anillos cerca de las puntas
      for (let j = 0; j <= NV; j++) {
        punto(zn, -Math.PI / 2 + (2 * Math.PI * j) / NV, p);
        pos.push(p.x, p.y, p.z);
      }
    }
    for (let i = 0; i < NU; i++) {
      for (let j = 0; j < NV; j++) {
        const a = i * (NV + 1) + j;
        const b = a + NV + 1;
        idx.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
    const cuerpo = new THREE.BufferGeometry();
    cuerpo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    cuerpo.setIndex(idx);
    cuerpo.computeVertexNormals();
    pon(cuerpo, plata);

    // ---------- Costados (los dos) ----------
    for (const lado of [1, -1]) {
      const cos = (s, t) => delCostado(s, t, lado);
      // Pasaruedas.
      for (const zc of [RUEDA.adelante, RUEDA.atras]) {
        const r = 0.9;
        pon(calco(zc - r, zc + r, (s) => B(s) + 0.2, (s) => RUEDA.r + Math.sqrt(Math.max(0, r * r - (s - zc) ** 2)), cos, 0.012, 24, 5), negro);
      }
      // Ventanilla de adelante (con el borde delantero siguiendo el parante del parabrisas).
      pon(calco(-0.2, 2.2, cintura, (s) => Math.max(cintura(s), Math.min(T(s) - 0.33, 2.3 + (2.2 - s) * 0.95)), cos, 0.014, 22, 6), vidrio);
      // Parante del medio negro y ventanilla de atrás polarizada.
      pon(calco(-0.64, -0.2, cintura, (s) => T(s) - 0.24, cos, 0.016, 4, 6), negro);
      pon(calco(-2.62, -0.64, cintura, (s) => Math.max(cintura(s), T(s) - 0.33 - Math.max(0, -2.15 - s) * 1.7), cos, 0.014, 20, 6), polarizado);
      // Juntas de las puertas.
      const junta = (z, y0, y1) => pon(calco(z - 0.025, z + 0.025, () => y0, (s) => Math.min(y1, cintura(s)), cos, 0.016, 2, 10), gris);
      junta(2.2, 1.64, 9);
      junta(-0.42, 0.72, 9);
      junta(-2.62, 1.62, 9);
      pon(calco(-2.05, 1.6, () => 0.77, () => 0.81, cos, 0.016, 16, 1), gris);
      // Manijas (hueco oscuro y la manija plateada encima).
      for (const zm of [0.05, -2.3]) {
        const y = cintura(zm) - 0.17;
        pon(calco(...pastilla(zm, zm + 0.48, y, 0.08), cos, 0.016, 8, 3), gris);
        pon(calco(...pastilla(zm + 0.04, zm + 0.44, y + 0.01, 0.045), cos, 0.03, 8, 3), plataOscura);
      }
      // Giro naranja en el guardabarros de adelante.
      pon(calco(...elipse(2.42, 2.02, 0.13, 0.065), cos, 0.02, 8, 3), luz('#ff9a1f'));
      // Tapa del tanque (solo del lado derecho).
      if (lado > 0) pon(calco(...elipse(-3.35, 2.15, 0.23, 0.23), cos, 0.016, 12, 4), plataOscura);
      // Espejo: cáscara plateada con base negra, pegado al parante.
      const yE = 2.48;
      const zE = 1.95;
      const xE = punto(...delCostado(zE, yE, 1)).x;
      const casco = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), plata);
      casco.scale.set(0.2, 0.25, 0.36);
      casco.position.set(lado * (xE + 0.32), yE + 0.05, zE - 0.12);
      g.add(casco);
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.24), mat('#141517'));
      base.position.set(lado * (xE + 0.12), yE - 0.05, zE);
      g.add(base);
      const espejo = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.36), mat('#3d4650'));
      espejo.rotation.y = Math.PI;
      espejo.position.set(lado * (xE + 0.34), yE + 0.05, zE - 0.47);
      g.add(espejo);
    }

    // ---------- Trompa ----------
    const frente = (s, t) => delFrente(s, t, 0.72, 1);
    for (const lado of [1, -1]) {
      const fr = (s, t) => delFrente(lado * s, t, 0.72, 1);
      // Faro grande, estirado para atrás y para arriba (gota).
      const c = (s) => 1.66 + 0.16 * ((s - 0.45) / 1.35);
      const h = (s) => { const t = THREE.MathUtils.clamp((s - 0.45) / 1.35, 0, 1); return 0.04 + 0.32 * Math.sqrt(t) * Math.sqrt(Math.max(0, 1 - t ** 8)); };
      pon(calco(0.45, 1.8, (s) => c(s) - h(s) - 0.05, (s) => c(s) + h(s) + 0.05, fr, 0.016, 22, 6), negro);
      pon(calco(0.5, 1.76, (s) => c(s) - h(s), (s) => c(s) + h(s), fr, 0.026, 22, 6), calcoMat('#5d666e', true));
      pon(calco(...elipse(1.2, 1.7, 0.24, 0.2), fr, 0.034, 12, 4), cromo);
      pon(calco(...elipse(1.2, 1.7, 0.13, 0.11), fr, 0.042, 8, 3), luz('#fffdf0'));
      pon(calco(...pastilla(1.48, 1.74, 1.86, 0.06), fr, 0.034, 6, 2), luz('#ffb347'));
      // Antiniebla en su hueco negro.
      pon(calco(...elipse(1.38, 0.9, 0.22, 0.2), fr, 0.016, 10, 4), negro);
      pon(calco(...elipse(1.38, 0.9, 0.12, 0.11), fr, 0.03, 8, 3), calcoMat('#d9dde1', true));
    }
    // Parrilla chiquita con el logo ovalado, y la toma de abajo.
    pon(calco(...pastilla(-0.6, 0.6, 1.42, 0.17, 4), frente, 0.016, 14, 4), negro);
    pon(calco(...elipse(0, 1.43, 0.21, 0.13), frente, 0.03, 10, 4), cromo);
    pon(calco(...elipse(0, 1.43, 0.15, 0.08), frente, 0.04, 8, 3), gris);
    pon(calco(...pastilla(-1.0, 1.0, 0.86, 0.17), frente, 0.016, 18, 4), negro);

    // ---------- Cola ----------
    const cola = (s, t) => delFrente(s, t, -0.8, -1);
    pon(calco(-1.25, 1.25, (s) => 2.32 + 0.12 * (s / 1.25) ** 4, (s) => 3.08 - 0.3 * (s / 1.25) ** 4, cola, 0.014, 18, 6), vidrio);
    // Las ópticas rojas (y la tercera luz de arriba) se prenden al frenar (luzFreno).
    const freno = luz(APAGADA);
    this.frenoMats = [freno];
    pon(calco(...pastilla(-0.28, 0.28, 3.2, 0.035), cola, 0.02, 6, 2), freno);
    for (const lado of [1, -1]) {
      const co = (s, t) => delFrente(lado * s, t, -0.8, -1);
      // Ópticas altas y verticales en las esquinas (con la parte blanca abajo).
      pon(calco(1.32, 1.82, () => 1.55, (s) => 2.95 - 0.3 * ((s - 1.32) / 0.5) ** 2, co, 0.016, 8, 10), freno);
      pon(calco(1.38, 1.76, () => 1.62, () => 1.92, co, 0.03, 6, 3), calcoMat('#e9ecef', true));
      pon(calco(...elipse(1.55, 0.95, 0.12, 0.05), co, 0.02, 6, 2), luz('#a50d14'));
    }
    pon(calco(-0.7, 0.7, () => 1.48, () => 1.95, cola, 0.016, 8, 4), gris);
    pon(calco(-0.6, 0.6, () => 1.54, () => 1.89, cola, 0.03, 8, 4), calcoMat('#f2f2ee'));
    pon(calco(...pastilla(-0.38, 0.38, 2.31, 0.035), cola, 0.02, 6, 2), negro);
    pon(calco(...pastilla(-1.7, 1.7, 0.77, 0.06), cola, 0.016, 18, 2), negro);
    const escape = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.5, 10), mat('#3a3d41'));
    escape.rotation.x = Math.PI / 2;
    escape.position.set(-0.9, 0.5, -3.95);
    g.add(escape);

    // ---------- Arriba: parabrisas, limpiaparabrisas y antena ----------
    const ancho = (z) => corte(z / L).w * 0.79;
    pon(calco(0.8, 2.42, (s) => -ancho(s), (s) => ancho(s), (s, t) => deArriba(t, s), 0.014, 18, 10), vidrio);
    for (const [x0, x1] of [[-1.35, -0.12], [0.12, 1.35]]) {
      pon(calco(x0, x1, (s) => 2.3 + (s - x0) * 0.05 - 0.025, (s) => 2.3 + (s - x0) * 0.05 + 0.025, (s, t) => deArriba(s, t), 0.03, 8, 1), negro);
    }
    const antena = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 1.1, 6), mat('#141517'));
    const top = punto(-3.1 / L, Math.PI / 2);
    antena.position.set(0, top.y + 0.45, top.z - 0.25);
    antena.rotation.x = -0.5;
    g.add(antena);

    // ---------- Ruedas ----------
    // El giro de avance va en un grupo interior; las de adelante doblan.
    const geoGoma = new THREE.CylinderGeometry(RUEDA.r, RUEDA.r, RUEDA.ancho, 20);
    const geoTaza = new THREE.CylinderGeometry(0.5, 0.5, 0.04, 20);
    const goma = mat('#17181a');
    const taza = new THREE.MeshPhongMaterial({ map: texturaTaza(), specular: '#ffffff', shininess: 60 });
    this.partes.llantas.push(taza);
    const lisa = mat('#9ba1a7');
    for (const [x, z] of [[-RUEDA.x, RUEDA.adelante], [RUEDA.x, RUEDA.adelante], [-RUEDA.x, RUEDA.atras], [RUEDA.x, RUEDA.atras]]) {
      const soporte = new THREE.Group();
      soporte.position.set(x, RUEDA.r, z);
      const giro = new THREE.Group();
      const neumatico = new THREE.Mesh(geoGoma, goma);
      neumatico.rotation.z = Math.PI / 2;
      // La taza va del lado de afuera: la tapa de arriba del cilindro queda mirando para afuera.
      const tapa = new THREE.Mesh(geoTaza, [lisa, taza, lisa]);
      tapa.rotation.z = -Math.sign(x) * Math.PI / 2;
      tapa.position.x = Math.sign(x) * (RUEDA.ancho / 2 + 0.01);
      giro.add(neumatico, tapa);
      soporte.add(giro);
      g.add(soporte);
      this.ruedas.push(giro);
      if (z > 0) this.delanteras.push(soporte);
    }
  }

  // Luces de freno: se prenden las ópticas de atrás de cada auto (las del Auto Deportivo, que
  // están en armar, o la capa roja que cargarAuto arma encima de las de cada modelo).
  luzFreno(prendida) {
    if (this.frenoPrendido === prendida) return;
    this.frenoPrendido = prendida;
    for (const m of this.frenoMats || []) m.color.set(prendida ? PRENDIDA : APAGADA);
    if (this.capaFreno) this.capaFreno.visible = prendida;
  }

  // Lo del taller (estado.taller[id]: niveles de las mejoras y colores): la física y la pintura.
  aplicarTaller(datos = {}) {
    this.mejoras = datos;
    this.specs = specsAuto(this.def, datos);
    for (const parte of ['carroceria', 'llantas']) this.pintar(parte, datos[parte] || null);
  }

  // Pinta una parte (null: el color de fábrica). Los materiales de cada parte son de este auto.
  pintar(parte, color) {
    const mats = this.materialesDe(parte);
    this.colorFabrica ??= {};
    for (const m of mats) {
      this.colorFabrica[m.uuid] ??= m.color.getHex();
      m.color.set(color || this.colorFabrica[m.uuid]);
    }
  }

  materialesDe(parte) {
    return this.partes?.[parte] || [];
  }

  // Color que se ve ahora en esa parte (para arrancar el selector).
  colorDe(parte) {
    const m = this.materialesDe(parte)[0];
    return m ? `#${m.color.getHexString()}` : '#ffffff';
  }

  colocar() {
    this.grupo.position.copy(this.pos);
    this.grupo.rotation.y = this.angulo;
    const c = Math.abs(Math.cos(this.angulo));
    const s = Math.abs(Math.sin(this.angulo));
    const [mx, mz] = this.medio || [2.1, 4.35]; // medio ancho y medio largo
    const hx = c * mx + s * mz;
    const hz = s * mx + c * mz;
    this.caja.min.set(this.pos.x - hx, 0, this.pos.z - hz);
    this.caja.max.set(this.pos.x + hx, 3.6, this.pos.z + hz);
  }

  // ejes: { x: doblar (+ derecha), y: acelerar (+ adelante) }.
  actualizar(dt, ejes, colisiones) {
    // velMax lo pone main.js según la zona: en la autopista y el autódromo, la máxima de verdad.
    const p = this.pos;
    const antesX = p.x;
    const antesZ = p.z;
    pasoAuto(this, ejes, dt);
    this.luzFreno(this.frenando);
    let choque = false;
    for (const b of colisiones) {
      if (b === this.caja || b.max.y < 0.35 || b.min.y > 2.5) continue;
      const ox1 = p.x + RADIO - b.min.x;
      const ox2 = b.max.x - (p.x - RADIO);
      if (ox1 <= 0 || ox2 <= 0) continue;
      const oz1 = p.z + RADIO - b.min.z;
      const oz2 = b.max.z - (p.z - RADIO);
      if (oz1 <= 0 || oz2 <= 0) continue;
      if (Math.min(ox1, ox2) < Math.min(oz1, oz2)) p.x += ox1 < ox2 ? -ox1 : ox2;
      else p.z += oz1 < oz2 ? -oz1 : oz2;
      choque = true;
    }
    // El auto no sube la montaña: choca contra el pie.
    if (this.terreno && this.terreno(p.x, p.z) > 0.8) {
      p.x = antesX;
      p.z = antesZ;
      choque = true;
    }
    if (choque) this.vel *= 0.4;

    for (const r of this.ruedas) r.rotation.x += (this.vel * dt) / RUEDA.r;
    for (const d of this.delanteras) d.rotation.y = -this.direccion;
    this.colocar();
  }

  // Punto al costado del conductor, para bajarse.
  puntoBajada(salida) {
    return salida.set(this.pos.x + Math.cos(this.angulo) * 3.6, 0, this.pos.z - Math.sin(this.angulo) * 3.6);
  }
}

// ======================= Vecibanda Motors y los autos del galpón =======================
// Vecibanda Motors (el concesionario a la salida de la ciudad, como la foto de referencia:
// caja de paneles gris oscuro con la vidriera de punta a punta, el nombre en la franja de
// arriba, cielorraso blanco con tiras de luz, escalones con luces y canteros con plantas) y
// los autos que se compran ahí, que quedan en el Galpón Vecibanda y se pueden manejar.

export const ESCALA_AUTO = 2.47; // 1 m (la misma escala que el Auto Deportivo)
export const AUTOS_POR_ID = Object.fromEntries(AUTOS.map((a) => [a.id, a]));

// ---------- Modelos ----------
// Se cargan una sola vez (y recién cuando hacen falta); cada uso es un clon que comparte la
// geometría y los materiales. Los materiales pasan a Lambert (más livianos que los PBR del
// archivo) y la pintura a Phong, para que brille como un auto.
const cargador = new GLTFLoader();
cargador.setMeshoptDecoder(MeshoptDecoder);
const plantillas = new Map();

function aliviar(m) {
  const brilla = /paint|body|carpaint|chrome|glass/i.test(m.name) || (m.metalness > 0.5 && !m.map);
  const opts = {
    color: m.color, map: m.map, transparent: m.transparent, opacity: m.opacity,
    side: m.side, alphaTest: m.alphaTest, depthWrite: !m.transparent,
  };
  const nuevo = brilla ? new THREE.MeshPhongMaterial({ ...opts, specular: '#ffffff', shininess: 70 }) : new THREE.MeshLambertMaterial(opts);
  if (m.emissive && m.emissive.getHex()) nuevo.emissive = m.emissive;
  nuevo.name = m.name;
  return nuevo;
}

// Las ópticas traseras de cada modelo (por el nombre del material). Al frenar se les pone
// encima una capa roja que brilla con la misma forma: los triángulos de esas piezas que están
// en la cola, copiados un poquito más afuera. La Ferrari tiene las cuatro luces redondas
// dibujadas en la tapa de la cola: ahí la capa lleva esa textura teñida de rojo (se prenden
// los círculos y la rejilla queda oscura).
const OPTICAS = {
  miata: /^RLA_miata_brakelight$/,
  bmw_e36: /^(E36_lights\.001|BMWE36_signal_L\.003|BMWE36_brakelight)$/,
  golf_gti: /^vwphong5SG1$/,
  gtr: /^(r35_taillight_2017|r35_glass\.001)$/,
  mclaren_p1: /^Taillights$/,
  ferrari_f40: /^material_7$/,
};
const CON_TEXTURA = { ferrari_f40: true };
const matCapa = (map) => new THREE.MeshBasicMaterial({
  color: map ? '#ff3a2a' : PRENDIDA, map, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
});

function capaFreno(modelo, def, medioLargo) {
  const nombre = OPTICAS[def.id];
  if (!nombre) return null;
  const textura = CON_TEXTURA[def.id];
  const puntos = [];
  const uvs = [];
  let map = null;
  const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const n = new THREE.Vector3();
  const lado = new THREE.Vector3();
  modelo.traverse((o) => {
    if (!o.isMesh) return;
    const mat = (Array.isArray(o.material) ? o.material : [o.material]).find((m) => nombre.test(m.name));
    if (!mat) return;
    if (textura) map = mat.map;
    const pos = o.geometry.attributes.position;
    const uv = o.geometry.attributes.uv;
    const ind = o.geometry.index;
    const cant = ind ? ind.count : pos.count;
    for (let i = 0; i < cant; i += 3) {
      const k = [0, 1, 2].map((j) => (ind ? ind.getX(i + j) : i + j));
      k.forEach((x, j) => v[j].fromBufferAttribute(pos, x).applyMatrix4(o.matrixWorld));
      if (Math.max(v[0].z, v[1].z, v[2].z) > -medioLargo * 0.72) continue; // solo lo de la cola
      // Un poco hacia afuera (por la normal que mira para atrás), así no titila con la pieza.
      n.subVectors(v[2], v[1]).cross(lado.subVectors(v[1], v[0])).normalize();
      if (n.z > 0) n.negate();
      n.multiplyScalar(0.012);
      for (const p of v) puntos.push(p.x + n.x, p.y + n.y, p.z + n.z);
      if (textura && uv) for (const x of k) uvs.push(uv.getX(x), uv.getY(x));
    }
  });
  if (!puntos.length) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(puntos, 3));
  if (map && uvs.length) geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  const capa = new THREE.Mesh(geo, matCapa(map && uvs.length ? map : null));
  capa.name = 'capaFreno';
  capa.visible = false;
  return capa;
}

export function cargarAuto(def) {
  if (!plantillas.has(def.id)) {
    plantillas.set(def.id, cargador.loadAsync(`assets/autos/${def.archivo}`).then((gltf) => {
      const modelo = gltf.scene;
      const cambiados = new Map();
      modelo.traverse((o) => {
        if (!o.isMesh) return;
        // El script que los achica les saca las normales a las piezas sin textura: se
        // recalculan respetando los bordes duros.
        if (!o.geometry.attributes.normal) o.geometry = toCreasedNormals(o.geometry, 0.6);
        const lista = Array.isArray(o.material) ? o.material : [o.material];
        const nuevos = lista.map((m) => {
          if (!cambiados.has(m)) cambiados.set(m, aliviar(m));
          return cambiados.get(m);
        });
        o.material = Array.isArray(o.material) ? nuevos : nuevos[0];
      });
      // A la escala del juego: el largo de verdad, centrado, apoyado en el piso, trompa a +z.
      modelo.updateMatrixWorld(true);
      const caja = new THREE.Box3().setFromObject(modelo, true);
      const tam = caja.getSize(new THREE.Vector3());
      const k = (def.largo * ESCALA_AUTO) / tam.z;
      const g = new THREE.Group();
      modelo.scale.multiplyScalar(k);
      const centro = caja.getCenter(new THREE.Vector3()).multiplyScalar(k);
      modelo.position.set(-centro.x, -caja.min.y * k, -centro.z);
      g.add(modelo);
      g.updateMatrixWorld(true);
      const capa = capaFreno(modelo, def, (tam.z * k) / 2);
      if (capa) g.add(capa);
      g.userData.medio = [(tam.x * k) / 2, (tam.z * k) / 2];
      g.userData.alto = tam.y * k;
      return g;
    }));
  }
  return plantillas.get(def.id).then((g) => {
    const copia = g.clone();
    copia.userData.medio = g.userData.medio;
    copia.userData.alto = g.userData.alto;
    return copia;
  });
}

// ---------- Auto comprado (manejable) ----------
// Igual que el Auto Deportivo (arriba), pero con el modelo del concesionario y sus números.
export class AutoComprado extends Auto {
  constructor(escena, def, x, z, angulo = 0) {
    super(escena, x, z, angulo);
    this.def = def;
    this.specs = specsAuto(def);
    // Hasta que carga el modelo, la caja se estima con el largo.
    this.medio = [def.largo * ESCALA_AUTO * 0.23, (def.largo * ESCALA_AUTO) / 2];
    this.colocar();
    this.listo = cargarAuto(def).then((m) => {
      this.grupo.add(m);
      this.modelo = m;
      this.medio = m.userData.medio;
      this.alto = m.userData.alto;
      if (this.mejoras) this.aplicarTaller(this.mejoras); // los colores, ahora que hay modelo
      this.capaFreno = m.getObjectByName('capaFreno');
      this.frenoPrendido = undefined;
      this.colocar();
    }).catch(() => {});
  }

  armar() {} // el modelo llega después (cargarAuto); sus luces de freno, también

  // Los materiales de la carrocería o las llantas (PARTES), copiados para este auto la primera vez
  // (los modelos comparten materiales entre copias: si no, se pintarían todos).
  materialesDe(parte) {
    this.propios ??= {};
    if (this.propios[parte]) return this.propios[parte];
    const re = PARTES[this.def.id]?.[parte];
    if (!re || !this.modelo) return [];
    const copias = new Map();
    this.modelo.traverse((o) => {
      if (!o.isMesh) return;
      const lista = Array.isArray(o.material) ? o.material : [o.material];
      const nuevos = lista.map((m) => {
        if (!re.test(m.name) && !re.test(o.name)) return m;
        if (!copias.has(m)) copias.set(m, m.clone());
        return copias.get(m);
      });
      o.material = Array.isArray(o.material) ? nuevos : nuevos[0];
    });
    this.propios[parte] = [...copias.values()];
    return this.propios[parte];
  }
}

// Lo que se pinta en el taller de cada modelo: la carrocería y las llantas (por el nombre del
// material o, si es uno genérico, por el de la pieza).
const PARTES = {
  miata: { carroceria: /^RRpbrPaintPrimary$/, llantas: /^RRpbrAluminumSemiPolish$/ },
  bmw_e36: { carroceria: /^BMWE36_paint$/, llantas: /^BMWE36_felgen$/ },
  golf_gti: { carroceria: /^vwphong2SG1$/, llantas: /^vwphong2[12]SG1$/ },
  gtr: { carroceria: /^r35_paint$/, llantas: /^r35_wheel_05a$/ },
  mclaren_p1: { carroceria: /^Carpaint$/, llantas: /^Rim_/ },
  ferrari_f40: { carroceria: /^Metallic$/, llantas: /^Object_32$/ },
};

// Los autos que tenés, estacionados en el galpón (uno por lugar, en el orden en que se compraron).
export class Flota {
  constructor(escena, colisiones, estado) {
    this.escena = escena;
    this.colisiones = colisiones;
    this.estado = estado;
    this.autos = [];
  }

  // Crea los que falten (al cargar la partida o al comprar uno). Sin galpón no hay dónde ponerlos.
  actualizar() {
    if (!this.estado.compras.includes('galpon')) return;
    const tengo = this.estado.autos || [];
    for (let i = this.autos.length; i < tengo.length; i++) {
      const def = AUTOS_POR_ID[tengo[i]];
      if (!def) continue;
      const lugar = GALPON_LUGARES[i % GALPON_LUGARES.length];
      // Si hay más autos que lugares, los que sobran van adelante, cerca de la boca.
      const fila = Math.floor(i / GALPON_LUGARES.length);
      const auto = new AutoComprado(this.escena, def, lugar.x, lugar.z + fila * 14, 0);
      auto.aplicarTaller(this.estado.taller?.[def.id]);
      this.colisiones.push(auto.caja);
      this.autos.push(auto);
    }
  }
}

// ---------- Concesionario ----------
const LOCAL = { x: CO.x0, z: CO.z0 }; // las medidas de adentro van desde la esquina de adelante
const ANCHO_SALON = CO.x1 - CO.x0;
const FONDO_SALON = CO.z1 - CO.z0;
// Lugar de cada auto en el salón (u: de izquierda a derecha, v: hacia el fondo) y hacia dónde
// mira. El más caro, adelante en el medio, sobre la plataforma que gira.
const EXHIBICION = [[12, 27, 0.5], [30, 27, 0], [48, 27, -0.5], [12, 11.5, 0.6], [48, 11.5, -0.6], [30, 12, 0]];
const PUERTA = [17, 24]; // hueco de la vidriera para entrar
const CERCA = 7.5; // a cuánto se puede comprar

// Puerta de vidrio cerrada (con la manija) en el hueco de la vidriera, hasta que abre el local.
function puertaCerrada(k, x0, z, x1) {
  const malla = new THREE.Group();
  malla.add(k.cajaDe(x0, 0.3, z - 0.08, x1, 9.5, z + 0.08, k.vidrio));
  malla.add(k.cajaDe((x0 + x1) / 2 - 0.08, 0.3, z - 0.12, (x0 + x1) / 2 + 0.08, 9.5, z + 0.12, '#16171a'));
  for (const dx of [-0.5, 0.5]) malla.add(k.cajaDe((x0 + x1) / 2 + dx - 0.06, 3.2, z - 0.3, (x0 + x1) / 2 + dx + 0.06, 5.2, z - 0.15, '#c9ccd0'));
  return { malla, caja: new THREE.Box3(new THREE.Vector3(x0, 0, z - 0.3), new THREE.Vector3(x1, 9.5, z + 0.3)) };
}

export class Concesionario {
  constructor({ escena, colisiones, kit, estado, ui, guardar, progreso }) {
    this.escena = escena;
    this.kit = kit;
    this.estado = estado;
    this.ui = ui;
    this.guardar = guardar;
    this.progreso = progreso; // () => progreso de la mansión: abre al AUTOS_DESDE (60%)
    this.colisiones = colisiones;
    this.abierto = null;
    this.grupo = new THREE.Group();
    this.grupo.visible = false;
    escena.add(this.grupo);
    this.choques = [];
    this.armar(this.choques);
    // Los autos, ordenados del más barato al más caro (el último va en la plataforma).
    const corrido = EXHIBICION.length - Math.min(AUTOS.length, EXHIBICION.length);
    this.exhibidos = [...AUTOS].sort((a, b) => a.precio - b.precio).slice(-EXHIBICION.length).map((def, i) => {
      const [u, v, a] = EXHIBICION[i + corrido];
      const x = LOCAL.x + u;
      const z = LOCAL.z + v;
      const soporte = new THREE.Group();
      soporte.position.set(x, 0.3, z);
      soporte.rotation.y = Math.PI + a; // mirando a la vidriera
      this.grupo.add(soporte);
      const etiqueta = crearEtiqueta(this.lineas(def), 7);
      etiqueta.sprite.position.set(x, 8.2, z);
      this.grupo.add(etiqueta.sprite);
      // Caja de choque (para no atravesarlo caminando).
      const m = (def.largo * ESCALA_AUTO) / 2;
      const caja = new THREE.Box3(new THREE.Vector3(x - m * 0.75, 0, z - m * 0.75), new THREE.Vector3(x + m * 0.75, 3.4, z + m * 0.75));
      caja.camara = false;
      this.choques.push(caja);
      return { def, x, z, soporte, etiqueta, cargado: false, gira: i + corrido === EXHIBICION.length - 1 };
    });
    this.plataforma = this.exhibidos.find((e) => e.gira);
    // El local está desde el principio (se ve y es sólido), pero abre al 60%: hasta entonces la
    // puerta está cerrada y arriba dice a qué % abre.
    colisiones.push(...this.choques);
    const [p0, p1] = PUERTA;
    this.puerta = puertaCerrada(this.kit, LOCAL.x + p0, LOCAL.z, LOCAL.x + p1);
    this.grupo.add(this.puerta.malla);
    colisiones.push(this.puerta.caja);
    this.aviso = crearEtiqueta([{ texto: `CERRADO · ABRE AL ${Math.round(AUTOS_DESDE * 100)}%`, tam: 60, color: '#ffd23f' }], 14);
    this.aviso.sprite.position.set(LOCAL.x + (p0 + p1) / 2, 7, LOCAL.z - 5);
    this.grupo.add(this.aviso.sprite);
  }

  cercaDeLaPuerta(jugador) {
    return Math.hypot(jugador.pos.x - (LOCAL.x + (PUERTA[0] + PUERTA[1]) / 2), jugador.pos.z - LOCAL.z) < 9 && jugador.pos.y < 3;
  }

  lineas(def) {
    const tuyo = (this.estado.autos || []).includes(def.id);
    return [
      { texto: def.nombre, tam: 52, color: '#ffffff' },
      tuyo ? { texto: '¡Es tuyo! (en el galpón)', tam: 44, color: '#8dff6a' } : { texto: formato(def.precio), tam: 58, color: '#8dff6a', moneda: true },
      { texto: `De verdad: ${def.real}`, tam: 34, color: '#cfd8dc' },
    ];
  }

  // Coordenadas de adentro (u desde la izquierda de la vidriera, v hacia el fondo) al mundo.
  armar(colisiones) {
    const k = this.kit;
    const g = new THREE.Group();
    const X = (u) => LOCAL.x + u;
    const Z = (v) => LOCAL.z + v;
    const A = CO.alto;
    const caja = (u0, y0, v0, u1, y1, v1, c, solido = true) => {
      const m = k.cajaDe(X(u0), y0, Z(v0), X(u1), y1, Z(v1), c);
      g.add(m);
      if (solido) colisiones.push(new THREE.Box3().setFromObject(m));
      return m;
    };
    const panel = k.tex('panel', '#3d4045', 3);
    const oscuro = '#26282c';
    const blanco = '#f3f3f1';
    const negro = '#16171a';
    const luz = k.brillo('#fbfdff');
    // Explanada de adoquines desde la autopista y el piso del salón (un poco más alto).
    const explanada = AU.z + AU.medioAncho + 1.6;
    caja(-8, 0, explanada - LOCAL.z, ANCHO_SALON + 8, 0.06, 0, k.tex('baldosa', '#8e9196', 3), false);
    caja(0, 0, 0, ANCHO_SALON, 0.3, FONDO_SALON, k.tex('baldosa', '#e9e9e7', 4), false);
    // Escalones con luz abajo, a todo lo ancho de la vidriera.
    caja(4, 0, -2.2, ANCHO_SALON - 4, 0.1, 0, '#d9d9d6', false);
    caja(4, 0.1, -1.1, ANCHO_SALON - 4, 0.2, 0, '#e2e2df', false);
    caja(4, 0.02, -2.25, ANCHO_SALON - 4, 0.08, -2.15, luz, false);
    caja(4, 0.12, -1.15, ANCHO_SALON - 4, 0.18, -1.05, luz, false);
    // Fondo y costado izquierdo: paneles oscuros. Costado derecho: vidrio, como la esquina de la foto.
    caja(0, 0, FONDO_SALON - 0.5, ANCHO_SALON, A, FONDO_SALON, panel);
    caja(0, 0, 0, 0.6, A, FONDO_SALON, panel);
    caja(ANCHO_SALON - 0.3, 0, 0, ANCHO_SALON, 0.6, FONDO_SALON, negro);
    caja(ANCHO_SALON - 0.25, 0.6, 0.5, ANCHO_SALON - 0.05, 9.5, FONDO_SALON - 0.5, k.vidrio);
    for (let v = 0; v <= FONDO_SALON; v += FONDO_SALON / 4) caja(ANCHO_SALON - 0.4, 0, v - 0.15, ANCHO_SALON, 9.5, v + 0.15, negro, false);
    // Vidriera de adelante con parantes negros y el hueco de la puerta.
    caja(0.6, 0.3, -0.1, PUERTA[0], 9.5, 0.1, k.vidrio);
    caja(PUERTA[1], 0.3, -0.1, ANCHO_SALON - 0.3, 9.5, 0.1, k.vidrio);
    for (let u = 0.6; u <= ANCHO_SALON; u += 6.5) caja(u - 0.15, 0.3, -0.2, u + 0.15, 9.5, 0.2, negro, false);
    for (const u of PUERTA) caja(u - 0.2, 0.3, -0.25, u + 0.2, 9.5, 0.25, negro);
    caja(0.6, 0.3, -0.2, ANCHO_SALON, 0.55, 0.2, negro, false);
    // Franja de arriba (paneles gris oscuro con juntas) y techo.
    caja(-1, 9.5, -1.2, ANCHO_SALON + 1, A, 0.4, panel);
    caja(-1, A - 0.4, -1.2, ANCHO_SALON + 1, A, FONDO_SALON + 0.6, oscuro, false);
    // Portal curvo de la izquierda (en la foto, con el logo): una pared inclinada de paneles.
    const portal = k.cajaDe(-1.6, 0, -0.6, 1.6, A + 0.6, 0.6, panel);
    portal.position.set(X(-1.2), (A + 0.6) / 2, Z(1));
    portal.rotation.z = 0.18;
    g.add(k.noSolido(portal));
    colisiones.push(new THREE.Box3(new THREE.Vector3(X(-2.6), 0, Z(0)), new THREE.Vector3(X(0.6), A, Z(2))));
    // Cielorraso blanco con tiras de luz en diagonal (como en la foto).
    caja(0.6, A - 0.6, 0.4, ANCHO_SALON - 0.3, A - 0.4, FONDO_SALON - 0.5, blanco, false);
    for (let u = 4; u < ANCHO_SALON - 2; u += 5) {
      const tira = k.cajaDe(-0.15, -0.06, -FONDO_SALON * 0.42, 0.15, 0, FONDO_SALON * 0.42, luz);
      tira.position.set(X(u), A - 0.62, Z(FONDO_SALON / 2));
      tira.rotation.y = 0.35;
      g.add(k.noSolido(tira));
    }
    // Nombre en la franja y el logo grande en el portal.
    const cartel = k.cartel('VECIBANDA MOTORS', 17, 2.2, '#ffffff', '#3d4045');
    cartel.position.set(X(ANCHO_SALON - 12), 11.3, Z(-1.25));
    cartel.rotation.y = Math.PI;
    g.add(cartel);
    const logo = k.cartel('VM', 3.4, 2, '#ffffff', '#3d4045');
    logo.position.set(X(3.6), 6.5, Z(-0.66));
    logo.rotation.y = Math.PI;
    g.add(logo);
    // Plataforma que gira (el auto más caro) y alfombra de la entrada.
    const [pu, pv] = EXHIBICION[EXHIBICION.length - 1];
    this.disco = k.cilindro(7.4, 7.4, 0.3, '#cfd2d6', X(pu), 0.45, Z(pv), 40);
    g.add(this.disco);
    g.add(k.cilindro(7.6, 7.6, 0.06, luz, X(pu), 0.32, Z(pv), 40));
    caja(PUERTA[0], 0.3, 0.2, PUERTA[1], 0.34, 4, '#2b2d31', false);
    // Mostrador del vendedor, al fondo.
    caja(ANCHO_SALON / 2 - 5, 0.3, FONDO_SALON - 6, ANCHO_SALON / 2 + 5, 3.4, FONDO_SALON - 4.2, blanco);
    caja(ANCHO_SALON / 2 - 5.2, 3.4, FONDO_SALON - 6.2, ANCHO_SALON / 2 + 5.2, 3.6, FONDO_SALON - 4, negro, false);
    // Canteros con plantas adelante y una palmera a la izquierda (como en la foto).
    for (const [u0, u1] of [[-7, 3], [ANCHO_SALON - 3, ANCHO_SALON + 7]]) {
      caja(u0, 0, -6.5, u1, 0.9, -3, '#5d6168');
      for (let u = u0 + 1.2; u < u1 - 0.5; u += 2.2) g.add(k.noSolido(k.esfera(1.1, '#2e7d32', X(u), 1.5, Z(-4.75))));
    }
    g.add(k.cilindro(0.45, 0.6, 9, '#8d6e4f', X(-5), 4.5, Z(-8)));
    colisiones.push(new THREE.Box3(new THREE.Vector3(X(-5.6), 0, Z(-8.6)), new THREE.Vector3(X(-4.4), 9, Z(-7.4))));
    for (let i = 0; i < 7; i++) {
      const hoja = k.cajaDe(-0.35, -0.08, 0, 0.35, 0.08, 4.2, '#388e3c');
      hoja.position.set(X(-5), 9, Z(-8));
      hoja.rotation.set(-0.5, (i / 7) * Math.PI * 2, 0, 'YXZ');
      g.add(k.noSolido(hoja));
    }
    this.grupo.add(g);
  }

  cerca(jugador) {
    if (!this.abierto || jugador.pos.y > 3) return null;
    let mejor = null;
    let dMejor = CERCA;
    for (const e of this.exhibidos) {
      const d = Math.hypot(jugador.pos.x - e.x, jugador.pos.z - e.z);
      if (d < dMejor) { dMejor = d; mejor = e; }
    }
    return mejor;
  }

  accion(jugador) {
    if (!this.abierto) return this.cercaDeLaPuerta(jugador) ? `Vecibanda Motors cerrado: abre al ${Math.round(AUTOS_DESDE * 100)}%` : '';
    const e = this.cerca(jugador);
    if (!e || (this.estado.autos || []).includes(e.def.id)) return '';
    return `Comprar ${e.def.nombre} (E)`;
  }

  hacer(jugador) {
    if (!this.abierto) {
      if (!this.cercaDeLaPuerta(jugador)) return;
      sfx.error();
      this.ui.toast(`Vecibanda Motors abre cuando la mansión llegue al ${Math.round(AUTOS_DESDE * 100)}%`, 'error');
      return;
    }
    const e = this.cerca(jugador);
    if (!e || (this.estado.autos || []).includes(e.def.id)) return;
    if (!this.estado.compras.includes('galpon')) {
      sfx.error();
      this.ui.toast('Primero comprá el Galpón Vecibanda (al lado de la mansión): ahí se guardan los autos', 'error');
      return;
    }
    if (this.estado.plata < e.def.precio) {
      sfx.error();
      this.ui.toast(`Te falta plata: el ${e.def.nombre} sale ${formato(e.def.precio)}`, 'error');
      return;
    }
    this.estado.plata -= e.def.precio;
    this.estado.autos = [...(this.estado.autos || []), e.def.id];
    e.etiqueta.actualizar(this.lineas(e.def));
    sfx.comprar();
    this.ui.toast(`¡${e.def.nombre}! Te espera en el Galpón Vecibanda`, 'ok');
    this.alComprar?.(e.def);
    this.guardar();
  }

  actualizar(dt, jugador) {
    // Antes del 60% está cerrado; al llegar, abre la puerta (y avisa si estabas jugando).
    if (!this.abierto) {
      if (this.progreso() < AUTOS_DESDE) this.abierto = false;
      else {
        if (this.abierto === false) {
          sfx.brillo();
          this.ui.toast('¡Abrió Vecibanda Motors, a la salida de la ciudad! Y ya podés comprar el Galpón Vecibanda', 'plata');
        }
        this.abierto = true;
        this.grupo.remove(this.puerta.malla);
        const i = this.colisiones.indexOf(this.puerta.caja);
        if (i >= 0) this.colisiones.splice(i, 1);
        this.aviso.sprite.visible = false;
      }
    }
    const d = Math.hypot(jugador.pos.x - (CO.x0 + CO.x1) / 2, jugador.pos.z - (CO.z0 + CO.z1) / 2);
    // Solo se dibuja de cerca (está a 20 km de la mansión); los autos se cargan al acercarse.
    this.grupo.visible = d < 900;
    if (d < 600) {
      for (const e of this.exhibidos) {
        if (e.cargado) continue;
        e.cargado = true;
        cargarAuto(e.def).then((m) => e.soporte.add(m)).catch(() => {});
      }
    }
    // Si cambiaron tus autos (o es la primera vez que se ve), se redibujan todas las etiquetas:
    // precio o "¡Es tuyo!".
    const clave = (this.estado.autos || []).join();
    if (this.grupo.visible && clave !== this.autosDibujados) {
      this.autosDibujados = clave;
      for (const e of this.exhibidos) e.etiqueta.actualizar(this.lineas(e.def));
    }
    if (this.grupo.visible) {
      this.disco.rotation.y += dt * 0.3;
      if (this.plataforma) this.plataforma.soporte.rotation.y += dt * 0.3;
    }
  }
}

// ======================= El Taller =======================
// Al lado de Vecibanda Motors (abre al 60%, igual que el concesionario; antes, el portón está
// bajo y el cartel dice a qué % abre). Galpón de chapa naranja con el portón levantado, franjas
// amarillas y negras, el cartel de neón "TALLER" y lámparas colgando con luz cálida. Llegás
// manejando: cerca del portón aparece la "E" y, al entrar, el auto queda en el box (las líneas
// amarillas, adelante de la pared con las herramientas) y la cámara lo mira desde arriba. Las
// mejoras y los colores (data/taller.js) se guardan en estado.taller[id del auto].
const PORTON = { x: (TA.x0 + TA.x1) / 2, z: TA.z0 };
const BOX = { x: PORTON.x, z: TA.z0 + 16 };
const CERCA_TALLER = 8; // a cuánto del portón aparece la "E" (unos 3 m)
const ALTO_PORTON = 7;

// Chapa acanalada: franjas verticales claras y oscuras, con un poco de óxido.
function texChapa(color) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = color;
  g.fillRect(0, 0, 128, 128);
  for (let x = 0; x < 128; x += 16) {
    const lado = g.createLinearGradient(x, 0, x + 16, 0);
    lado.addColorStop(0, 'rgba(0,0,0,0.28)');
    lado.addColorStop(0.45, 'rgba(255,255,255,0.18)');
    lado.addColorStop(1, 'rgba(0,0,0,0.28)');
    g.fillStyle = lado;
    g.fillRect(x, 0, 16, 128);
  }
  let a = 7;
  const rnd = () => { a = (a * 9301 + 49297) % 233280; return a / 233280; };
  for (let i = 0; i < 60; i++) {
    g.fillStyle = `rgba(110,45,15,${0.1 + rnd() * 0.2})`;
    g.fillRect(rnd() * 128, rnd() * 128, 2 + rnd() * 5, 2 + rnd() * 9);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Franjas amarillas y negras (marco del portón y bordes del elevador).
function texPeligro() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#f6c200';
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#151515';
  for (let i = -64; i < 128; i += 32) {
    g.beginPath();
    g.moveTo(i, 0); g.lineTo(i + 16, 0); g.lineTo(i + 80, 64); g.lineTo(i + 64, 64);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Panel perforado con las herramientas colgadas (siluetas): llaves, martillo, destornilladores,
// pinzas y una sierra, y abajo la mesada.
function canvasHerramientas() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#8b6f4e';
  g.fillRect(0, 0, 1024, 256);
  g.fillStyle = 'rgba(40,28,18,0.55)';
  for (let y = 10; y < 256; y += 18) for (let x = 10; x < 1024; x += 18) { g.beginPath(); g.arc(x, y, 2.4, 0, Math.PI * 2); g.fill(); }
  const gris = '#2b2e33';
  const llave = (x, y, l) => {
    g.fillStyle = gris;
    g.fillRect(x - 5, y, 10, l);
    g.beginPath(); g.arc(x, y, 13, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(x, y + l, 10, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#8b6f4e';
    g.fillRect(x - 4, y - 14, 8, 12);
  };
  for (let i = 0; i < 7; i++) llave(40 + i * 34, 40, 70 + i * 14);
  // Martillo.
  g.fillStyle = '#7a4a22'; g.fillRect(310, 60, 12, 130);
  g.fillStyle = gris; g.fillRect(285, 48, 62, 26);
  // Destornilladores (mango rojo, amarillo, azul).
  ['#d32f2f', '#f9a825', '#1e88e5', '#d32f2f', '#43a047'].forEach((col, i) => {
    const x = 380 + i * 30;
    g.fillStyle = col; g.fillRect(x - 7, 40, 14, 46);
    g.fillStyle = '#c9ccd0'; g.fillRect(x - 2, 86, 4, 70);
  });
  // Pinzas.
  g.strokeStyle = gris; g.lineWidth = 9; g.lineCap = 'round';
  for (const x of [560, 610]) { g.beginPath(); g.moveTo(x - 14, 190); g.lineTo(x + 6, 70); g.moveTo(x + 14, 190); g.lineTo(x - 6, 70); g.stroke(); }
  // Sierra.
  g.fillStyle = '#c9ccd0';
  g.beginPath(); g.moveTo(660, 60); g.lineTo(860, 60); g.lineTo(860, 100); g.lineTo(700, 110); g.closePath(); g.fill();
  g.fillStyle = '#d84315'; g.fillRect(860, 50, 40, 70);
  // Llaves de cruz y un rollo de cinta.
  g.lineWidth = 10;
  for (const x of [940, 990]) { g.beginPath(); g.moveTo(x - 30, 60); g.lineTo(x + 30, 160); g.moveTo(x + 30, 60); g.lineTo(x - 30, 160); g.stroke(); }
  g.fillStyle = '#c62828'; g.beginPath(); g.arc(470, 205, 24, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#8b6f4e'; g.beginPath(); g.arc(470, 205, 10, 0, Math.PI * 2); g.fill();
  return c;
}

// El cartel de neón: TALLER en naranja con brillo, en una caja negra con borde celeste.
function canvasNeon(texto, color, borde) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#0d0f12';
  g.fillRect(0, 0, 1024, 256);
  g.strokeStyle = borde;
  g.lineWidth = 10;
  g.shadowColor = borde;
  g.shadowBlur = 24;
  g.strokeRect(22, 22, 980, 212);
  g.font = '900 170px Arial Black, Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = color;
  g.shadowBlur = 40;
  g.fillStyle = color;
  g.fillText(texto, 512, 136);
  g.shadowBlur = 0;
  g.fillStyle = '#fff3d6';
  g.globalAlpha = 0.55;
  g.fillText(texto, 512, 136);
  return c;
}

export class Taller {
  constructor({ escena, colisiones, kit, estado, ui, guardar, progreso, tycoon, flota }) {
    this.escena = escena;
    this.colisiones = colisiones;
    this.kit = kit;
    this.estado = estado;
    this.ui = ui;
    this.guardar = guardar;
    this.progreso = progreso;
    this.tycoon = tycoon;
    this.flota = flota;
    this.abierto = null;
    this.auto = null; // el auto que está adentro (con el menú abierto)
    this.grupo = new THREE.Group();
    this.grupo.visible = false;
    escena.add(this.grupo);
    this.armar();
    // El "E" que aparece arriba del portón cuando llegás con el auto.
    this.indicador = crearEtiqueta([{ texto: 'E · Entrar al taller', tam: 60, color: '#ffd23f' }], 8);
    this.indicador.sprite.position.set(PORTON.x, ALTO_PORTON - 1.2, PORTON.z - 3.5);
    this.indicador.sprite.visible = false;
    this.grupo.add(this.indicador.sprite);
    this.aviso = crearEtiqueta([{ texto: `CERRADO · ABRE AL ${Math.round(AUTOS_DESDE * 100)}%`, tam: 60, color: '#ffd23f' }], 10);
    this.aviso.sprite.position.set(PORTON.x, 4.2, PORTON.z - 4);
    this.grupo.add(this.aviso.sprite);
  }

  armar() {
    const k = this.kit;
    const g = this.grupo;
    const solido = (m) => { g.add(m); this.colisiones.push(new THREE.Box3().setFromObject(m)); return m; };
    const chapa = (color, rx, ry) => {
      const t = texChapa(color);
      t.repeat.set(rx, ry);
      return new THREE.MeshLambertMaterial({ map: t });
    };
    const { x0, x1, z0, z1, alto } = TA;
    const mitad = TA.porton / 2;
    const pared = chapa('#d4581f', 6, 2);
    const paredFondo = chapa('#d4581f', 6, 2);
    // Piso de cemento y la explanada hasta la autopista.
    g.add(k.noSolido(k.cajaDe(x0, 0, z0, x1, 0.12, z1, k.tex('baldosa', '#6d7076', 4))));
    g.add(k.noSolido(k.cajaDe(x0 - 4, 0, AU.z + AU.medioAncho + 1.6, x1 + 4, 0.07, z0, k.tex('baldosa', '#8e9196', 3))));
    // Paredes de chapa (adelante, con el hueco del portón).
    solido(k.cajaDe(x0, 0, z1 - 0.4, x1, alto, z1, paredFondo));
    solido(k.cajaDe(x0, 0, z0, x0 + 0.4, alto, z1, pared));
    solido(k.cajaDe(x1 - 0.4, 0, z0, x1, alto, z1, pared));
    solido(k.cajaDe(x0, 0, z0, PORTON.x - mitad, alto, z0 + 0.4, pared));
    solido(k.cajaDe(PORTON.x + mitad, 0, z0, x1, alto, z0 + 0.4, pared));
    g.add(k.noSolido(k.cajaDe(PORTON.x - mitad, ALTO_PORTON, z0, PORTON.x + mitad, alto, z0 + 0.4, pared)));
    // Techo de chapa gris a dos aguas (bajo) con alero sobre el portón.
    const techo = chapa('#8d949b', 8, 2);
    g.add(k.noSolido(k.cajaDe(x0 - 0.6, alto, z0 - 2.4, x1 + 0.6, alto + 0.35, z1 + 0.6, techo)));
    g.add(k.noSolido(k.cajaDe(x0 - 0.6, alto + 0.35, (z0 + z1) / 2 - 3, x1 + 0.6, alto + 1.4, (z0 + z1) / 2 + 3, techo)));
    // Marco del portón con franjas amarillas y negras.
    const peligro = texPeligro();
    const franja = (rx, ry) => { const t = peligro.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return new THREE.MeshLambertMaterial({ map: t }); };
    for (const s of [-1, 1]) g.add(k.noSolido(k.cajaDe(PORTON.x + s * mitad - 0.35, 0, z0 - 0.15, PORTON.x + s * mitad + 0.35, ALTO_PORTON, z0 + 0.45, franja(1, 10))));
    g.add(k.noSolido(k.cajaDe(PORTON.x - mitad - 0.35, ALTO_PORTON, z0 - 0.15, PORTON.x + mitad + 0.35, ALTO_PORTON + 0.6, z0 + 0.45, franja(18, 1))));
    // Portón levantado: la chapa enrollada arriba del hueco.
    const rollo = k.noSolido(k.cilindro(0.55, 0.55, TA.porton, '#9aa1a8', PORTON.x, ALTO_PORTON - 0.2, z0 + 0.9, 14));
    rollo.rotation.z = Math.PI / 2;
    g.add(rollo);
    g.add(k.noSolido(k.cajaDe(PORTON.x - mitad, ALTO_PORTON - 0.9, z0 + 0.6, PORTON.x + mitad, ALTO_PORTON - 0.4, z0 + 0.7, chapa('#aab1b8', 8, 1))));
    // Portón bajo (cerrado), hasta que abre.
    this.cerrado = k.cajaDe(PORTON.x - mitad, 0, z0 + 0.1, PORTON.x + mitad, ALTO_PORTON, z0 + 0.3, chapa('#aab1b8', 8, 3));
    this.cajaCerrado = new THREE.Box3().setFromObject(this.cerrado);
    g.add(this.cerrado);
    this.colisiones.push(this.cajaCerrado);
    // Cartel de neón TALLER arriba del portón (se ve de día y de noche).
    const neon = new THREE.CanvasTexture(canvasNeon('TALLER', '#ff8a1f', '#4dd0ff'));
    neon.colorSpace = THREE.SRGBColorSpace;
    neon.anisotropy = 4;
    const cartel = new THREE.Mesh(new THREE.PlaneGeometry(14, 3.5), new THREE.MeshBasicMaterial({ map: neon }));
    cartel.position.set(PORTON.x, alto + 0.1, z0 - 2.7); // adelante del alero y de la tira de neón
    cartel.rotation.y = Math.PI;
    g.add(k.noSolido(cartel));
    // Cartel alto al costado de la autopista (se ve de lejos, de los dos lados).
    const xt = x1 + 4;
    const zt = z0 - 7;
    solido(k.cajaDe(xt - 0.3, 0, zt - 0.3, xt + 0.3, 13, zt + 0.3, '#2b2e33'));
    for (const lado of [-1, 1]) {
      const placa = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.25), new THREE.MeshBasicMaterial({ map: neon }));
      placa.position.set(xt + lado * 0.35, 14, zt);
      placa.rotation.y = lado * Math.PI / 2;
      g.add(k.noSolido(placa));
    }
    g.add(k.noSolido(k.cajaDe(xt - 0.3, 12.8, zt - 4.6, xt + 0.3, 15.2, zt + 4.6, '#0d0f12')));
    // Tira de neón naranja a lo largo del alero.
    g.add(k.noSolido(k.cajaDe(x0, alto - 0.12, z0 - 2.45, x1, alto + 0.02, z0 - 2.3, k.brillo('#ff8a1f'))));
    // Adentro: lámparas colgando con luz cálida (y su manchón de luz en el piso).
    const manchon = new THREE.MeshBasicMaterial({ color: '#ffb54a', transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending });
    for (const [dx, dz] of [[-6, 7], [6, 7], [-6, 17], [6, 17], [0, 25]]) {
      const x = PORTON.x + dx;
      const z = z0 + dz;
      g.add(k.noSolido(k.cajaDe(x - 0.04, 8.3, z - 0.04, x + 0.04, alto, z + 0.04, '#222')));
      const pantalla = k.noSolido(k.cono(0.8, 0.6, '#2b2e33', x, 8.1, z, 10));
      pantalla.rotation.x = Math.PI; // abierta para abajo
      g.add(pantalla);
      g.add(k.noSolido(k.esfera(0.28, k.brillo('#ffd27a'), x, 7.75, z)));
      const luz = new THREE.Mesh(new THREE.CircleGeometry(3.2, 20), manchon);
      luz.rotation.x = -Math.PI / 2;
      luz.position.set(x, 0.14, z);
      g.add(k.noSolido(luz));
    }
    // El box: líneas amarillas en el piso y el elevador (plano, con bordes de franjas).
    const amarillo = k.brillo('#f6c200');
    const [bw, bl] = [8, 14];
    for (const s of [-1, 1]) {
      g.add(k.noSolido(k.cajaDe(BOX.x + s * bw / 2 - 0.12, 0.12, BOX.z - bl / 2, BOX.x + s * bw / 2 + 0.12, 0.15, BOX.z + bl / 2, amarillo)));
      g.add(k.noSolido(k.cajaDe(BOX.x - bw / 2, 0.12, BOX.z + s * bl / 2 - 0.12, BOX.x + bw / 2, 0.15, BOX.z + s * bl / 2 + 0.12, amarillo)));
      // Columnas del elevador.
      g.add(k.noSolido(k.cajaDe(BOX.x + s * (bw / 2 + 0.9) - 0.35, 0, BOX.z + 5.2, BOX.x + s * (bw / 2 + 0.9) + 0.35, 6, BOX.z + 5.9, '#c62828')));
    }
    g.add(k.noSolido(k.cajaDe(BOX.x - 3, 0.12, BOX.z - 5.8, BOX.x + 3, 0.16, BOX.z + 5.8, '#3b3f45')));
    g.add(k.noSolido(k.cajaDe(BOX.x - 3.1, 0.12, BOX.z - 5.9, BOX.x + 3.1, 0.14, BOX.z + 5.9, franja(1, 12))));
    // La pared del fondo: panel con las herramientas, banco de trabajo, carro de herramientas
    // rojo, gomas apiladas y un tambor.
    const panelTex = new THREE.CanvasTexture(canvasHerramientas());
    panelTex.colorSpace = THREE.SRGBColorSpace;
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(20, 5), new THREE.MeshLambertMaterial({ map: panelTex }));
    panel.position.set(PORTON.x, 4.6, z1 - 0.42);
    panel.rotation.y = Math.PI;
    g.add(k.noSolido(panel));
    solido(k.cajaDe(PORTON.x - 8, 0, z1 - 2.2, PORTON.x + 8, 1.9, z1 - 0.4, '#5d4037'));
    g.add(k.noSolido(k.cajaDe(PORTON.x - 8.2, 1.9, z1 - 2.3, PORTON.x + 8.2, 2.05, z1 - 0.4, '#9aa1a8')));
    solido(k.cajaDe(x0 + 1.5, 0, z1 - 6, x0 + 4, 3.2, z1 - 4.2, '#c62828'));
    for (let i = 1; i < 5; i++) g.add(k.noSolido(k.cajaDe(x0 + 1.45, i * 0.62, z1 - 6.05, x0 + 4.05, i * 0.62 + 0.05, z1 - 4.15, '#8e1b1b')));
    for (let i = 0; i < 4; i++) {
      const goma = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.85, 16), k.material('#1b1b1d'));
      goma.position.set(x1 - 2.4, 0.43 + i * 0.86, z1 - 3);
      g.add(k.noSolido(goma));
    }
    this.colisiones.push(new THREE.Box3(new THREE.Vector3(x1 - 3.6, 0, z1 - 4.2), new THREE.Vector3(x1 - 1.2, 3.5, z1 - 1.8)));
    solido(k.cilindro(0.8, 0.8, 2.4, '#1565c0', x1 - 2.4, 1.2, z0 + 3, 14));
  }

  // ---------- Cada cuadro ----------
  actualizar(dt, jugador, vehiculo) {
    if (!this.abierto) {
      if (this.progreso() < AUTOS_DESDE) this.abierto = false;
      else {
        this.abierto = true;
        this.grupo.remove(this.cerrado);
        const i = this.colisiones.indexOf(this.cajaCerrado);
        if (i >= 0) this.colisiones.splice(i, 1);
        this.aviso.sprite.visible = false;
      }
    }
    this.grupo.visible = Math.hypot(jugador.pos.x - PORTON.x, jugador.pos.z - PORTON.z) < 900;
    this.indicador.sprite.visible = !this.auto && !!this.cercaDelPorton(vehiculo);
  }

  // Un auto (no el helicóptero) cerca del portón, de afuera.
  cercaDelPorton(vehiculo) {
    if (!vehiculo?.specs || !vehiculo.def || !this.abierto) return false;
    return Math.hypot(vehiculo.pos.x - PORTON.x, vehiculo.pos.z - (PORTON.z - 2)) < CERCA_TALLER && vehiculo.pos.z < PORTON.z + 2;
  }

  accion(jugador, vehiculo) {
    if (this.auto) return '';
    if (vehiculo && !this.abierto && Math.hypot(vehiculo.pos.x - PORTON.x, vehiculo.pos.z - PORTON.z) < CERCA_TALLER + 4) {
      return `Taller cerrado: abre al ${Math.round(AUTOS_DESDE * 100)}%`;
    }
    return this.cercaDelPorton(vehiculo) ? 'Entrar al taller (E)' : '';
  }

  datosDe(id) {
    this.estado.taller ??= {};
    this.estado.taller[id] ??= {};
    return this.estado.taller[id];
  }

  // Precio de referencia del auto: el del concesionario (el Deportivo cuenta como uno barato).
  precioBase(def) {
    return def.precio || PRECIO_DEPORTIVO;
  }

  redondo(n) {
    const e = 10 ** Math.max(0, Math.floor(Math.log10(n)) - 1);
    return Math.round(n / e) * e;
  }

  precioNivel(def, cat, nivel) {
    return this.redondo(this.precioBase(def) * CATEGORIAS.find((c) => c.id === cat).niveles[nivel - 1].precio);
  }

  precioPintura(def) {
    return this.redondo(this.precioBase(def) * PINTURA.precio);
  }

  // Todos los autos de este modelo que hay en el mundo (el que manejás y el del galpón son el
  // mismo; el de la carrera se arma aparte), para que tomen la mejora al toque.
  copias(id) {
    const lista = [this.tycoon.auto, ...(this.flota?.autos || [])].filter((a) => a?.def?.id === id);
    if (this.auto && !lista.includes(this.auto)) lista.push(this.auto);
    return lista;
  }

  // La E: si está cerrado avisa; si no, entra. Devuelve true si se abrió el menú.
  hacer(vehiculo) {
    if (!this.abierto) {
      sfx.error();
      this.ui.toast(`El taller abre cuando la mansión llegue al ${Math.round(AUTOS_DESDE * 100)}%`, 'error');
      return false;
    }
    if (!this.cercaDelPorton(vehiculo)) return false;
    this.entrar(vehiculo);
    return true;
  }

  entrar(vehiculo) {
    this.auto = vehiculo;
    vehiculo.vel = 0;
    vehiculo.pos.set(BOX.x, 0, BOX.z);
    vehiculo.angulo = -2.5; // tres cuartos de frente, mirando a la cámara
    vehiculo.colocar();
    const def = vehiculo.def;
    const datos = this.datosDe(def.id);
    sfx.brillo();
    this.ui.abrirTaller({
      nombre: def.nombre,
      plata: () => this.estado.plata,
      categorias: CATEGORIAS.map((c) => ({
        id: c.id, nombre: c.nombre, icono: c.icono, stat: c.stat,
        niveles: c.niveles.map((n, i) => ({ ...n, precio: this.precioNivel(def, c.id, i + 1) })),
      })),
      colores: COLORES,
      precioPintura: this.precioPintura(def),
      niveles: () => ({ ...datos }),
      stats: (mejoras) => this.stats(def, mejoras),
      color: (parte) => vehiculo.colorDe(parte),
      colorGuardado: (parte) => datos[parte] || null, // null: el de fábrica
      alComprar: (cat, nivel) => this.comprar(def, cat, nivel),
      alPrevisualizarColor: (parte, color) => vehiculo.pintar(parte, color),
      alPintar: (parte, color) => this.pintar(def, parte, color),
      alGirar: (d) => { vehiculo.angulo += d; vehiculo.colocar(); },
      alCerrar: () => this.salir(),
    });
  }

  // Los números de la tarjeta de stats (con las mejoras que se le pasen).
  stats(def, mejoras) {
    const ef = (cat) => efectoMejora(cat, mejoras[cat] || 0);
    return {
      velocidad: Math.round(def.vmax * (1 + ef('motor'))),
      aceleracion: def.cero100 / (1 + ef('turbo')),
      manejo: def.agarre * (1 + ef('gomas')),
      frenado: def.agarre * (1 + ef('frenos')),
    };
  }

  comprar(def, cat, nivel) {
    const datos = this.datosDe(def.id);
    if ((datos[cat] || 0) !== nivel - 1) return false;
    const precio = this.precioNivel(def, cat, nivel);
    if (this.estado.plata < precio) return false;
    this.estado.plata -= precio;
    datos[cat] = nivel;
    for (const a of this.copias(def.id)) a.aplicarTaller(datos);
    sfx.comprar();
    this.guardar();
    return true;
  }

  pintar(def, parte, color) {
    const precio = this.precioPintura(def);
    if (this.estado.plata < precio) return false;
    this.estado.plata -= precio;
    const datos = this.datosDe(def.id);
    datos[parte] = color;
    for (const a of this.copias(def.id)) a.aplicarTaller(datos);
    sfx.comprar();
    this.guardar();
    return true;
  }

  // Al cerrar el menú: lo que no se confirmó vuelve a su color y el auto sale por el portón.
  salir() {
    const a = this.auto;
    if (!a) return;
    a.aplicarTaller(this.datosDe(a.def.id));
    a.pos.set(PORTON.x, 0, PORTON.z - 7);
    a.angulo = Math.PI; // mirando a la autopista
    a.vel = 0;
    a.colocar();
    this.auto = null;
    this.alSalir?.();
  }

  // La cámara del taller: más alta y alejada, con la pared de las herramientas de fondo. El auto
  // queda a la derecha de la pantalla (a la izquierda está el menú).
  camara(cam) {
    cam.position.set(BOX.x + 7.5, 5.6, BOX.z - 13.5);
    cam.lookAt(BOX.x, 1.5, BOX.z + 1);
    const w = window.innerWidth;
    const h = window.innerHeight;
    const corrido = w > 700 ? 0.23 : 0;
    cam.setViewOffset(w, h, -w * corrido, h * 0.04, w, h);
  }

  soltarCamara(cam) {
    cam.clearViewOffset();
  }
}
