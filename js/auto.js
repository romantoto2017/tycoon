import * as THREE from 'three';
import { mat } from './util.js';
import { LIMITE_MAPA } from './constantes.js';

const RADIO = 2.3;
const VEL_MAX = 34;
const VEL_ATRAS = -10;

// "Auto Deportivo" (en el juego se llama así para trollear): en realidad es un BYD F0
// plateado, el "auto papa" (ver assets/especiales/byd*.jpeg). Medidas del de verdad
// (3,46 x 1,62 x 1,46 m) a la escala del juego: 1 m = 2,47 unidades.
//
// La carrocería es una sola superficie curva: a lo largo (z) cada corte es una
// superelipse (redondeada como una papa) que va del piso (B) al techo (T) del perfil
// lateral, y en las puntas se achica para cerrar la trompa y la cola. Los vidrios, faros,
// ópticas, parrilla, manijas y pasaruedas son "calcos" que siguen esa misma superficie.

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
    pon(calco(...pastilla(-0.28, 0.28, 3.2, 0.035), cola, 0.02, 6, 2), luz('#d0101a'));
    for (const lado of [1, -1]) {
      const co = (s, t) => delFrente(lado * s, t, -0.8, -1);
      // Ópticas altas y verticales en las esquinas (con la parte blanca abajo).
      pon(calco(1.32, 1.82, () => 1.55, (s) => 2.95 - 0.3 * ((s - 1.32) / 0.5) ** 2, co, 0.016, 8, 10), luz('#c3121b'));
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

  colocar() {
    this.grupo.position.copy(this.pos);
    this.grupo.rotation.y = this.angulo;
    const c = Math.abs(Math.cos(this.angulo));
    const s = Math.abs(Math.sin(this.angulo));
    const hx = c * 2.1 + s * 4.35;
    const hz = s * 2.1 + c * 4.35;
    this.caja.min.set(this.pos.x - hx, 0, this.pos.z - hz);
    this.caja.max.set(this.pos.x + hx, 3.6, this.pos.z + hz);
  }

  // ejes: { x: doblar (+ derecha), y: acelerar (+ adelante) }.
  actualizar(dt, ejes, colisiones) {
    const acel = ejes.y;
    if (acel) {
      const frenando = acel * this.vel < 0;
      this.vel += acel * (frenando ? 45 : 22) * dt;
    } else {
      this.vel *= Math.max(0, 1 - 1.6 * dt);
      if (Math.abs(this.vel) < 0.2) this.vel = 0;
    }
    this.vel = THREE.MathUtils.clamp(this.vel, VEL_ATRAS, VEL_MAX);
    this.direccion += (ejes.x * 0.45 - this.direccion) * Math.min(1, dt * 8);
    this.angulo -= this.direccion * 3.6 * THREE.MathUtils.clamp(this.vel / 10, -1, 1) * dt;

    const p = this.pos;
    p.x = THREE.MathUtils.clamp(p.x + Math.sin(this.angulo) * this.vel * dt, -LIMITE_MAPA, LIMITE_MAPA);
    p.z = THREE.MathUtils.clamp(p.z + Math.cos(this.angulo) * this.vel * dt, -LIMITE_MAPA, LIMITE_MAPA);
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
