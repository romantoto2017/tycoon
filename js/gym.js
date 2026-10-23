// Gimnasio Power Camp (basado en las fotos de assets/especiales): fachada negra con POWER en
// letras blancas, la alfombra START de la entrada, el mostrador de Kelvin, techo negro con
// aros de luz, el espejo con el stand largo de mancuernas, racks negros y amarillos, torres
// de máquinas negras con la placa POWER y discos con el logo. Coordenadas del mundo (GYM en
// constantes.js). Lo que se mueve en los ejercicios lo arma gimnasio.js.
import { GYM as G, GYM_PUERTA as PU, GYM_KELVIN as KV, GYM_ESTACIONES as EST } from './constantes.js';
import { pared } from './arquitectura.js';

export const PALETA_GYM = {
  negro: '#16171a',
  grafito: '#24262a',
  gris: '#3a3d42',
  amarillo: '#c9d220', // el verde limón de las máquinas
  dorado: '#d29a2c', // la rayita del logo
  madera: '#9a6038',
  blanco: '#efefef',
  cromo: '#c9ced3',
};
const P = PALETA_GYM;
export const PISO_GYM = 0.2;
const F = PISO_GYM;
const T = G.pared;

// ---------- Texturas: discos y mancuernas POWER (una sola imagen para todo) ----------

// Pesos de las mancuernas del stand (pares) y de los discos.
export const PESOS_MANCUERNA = [2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 27.5, 30, 32.5, 35, 37.5, 40];
export const PESOS_DISCO = [5, 10, 20, 25];
const ATLAS = { w: 1024, h: 512 };
// Celdas: discos arriba (256 px), mancuernas en dos filas de 8 (128 px); goma lisa al final.
export const celdaDisco = (kg) => ({ x: PESOS_DISCO.indexOf(kg) * 256, y: 0, l: 256 });
export const celdaMancuerna = (kg) => { const i = PESOS_MANCUERNA.indexOf(kg); return { x: (i % 8) * 128, y: 256 + Math.floor(i / 8) * 128, l: 128 }; };
const CELDA_GOMA = { x: 1000, y: 10, l: 8 };
const kgTexto = (kg) => `${String(kg).replace('.', ',')}KG`;

// El logo: la flecha (chevron) con la rayita dorada.
function chevron(g, x, y, h, conDorado = true) {
  const w = h * 0.42;
  if (conDorado) {
    g.fillStyle = P.dorado;
    g.beginPath();
    g.moveTo(x + w * 0.1, y); g.lineTo(x + w * 1.18, y + h / 2); g.lineTo(x + w * 0.1, y + h);
    g.lineTo(x + w * 0.24, y + h); g.lineTo(x + w * 1.32, y + h / 2); g.lineTo(x + w * 0.24, y);
    g.closePath(); g.fill();
  }
  g.fillStyle = '#f2f2f2';
  g.beginPath();
  g.moveTo(x - w * 0.12, y); g.lineTo(x + w, y + h / 2); g.lineTo(x - w * 0.12, y + h);
  g.lineTo(x + w * 0.22, y + h / 2);
  g.closePath(); g.fill();
}

function caraDisco(g, c, kg) {
  const r = c.l / 2;
  const cx = c.x + r;
  const cy = c.y + r;
  g.save();
  g.beginPath(); g.arc(cx, cy, r - 1, 0, Math.PI * 2); g.clip();
  g.fillStyle = '#121315';
  g.fillRect(c.x, c.y, c.l, c.l);
  // Cinco rayos con borde plateado, como el disco de la foto.
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    g.save();
    g.translate(cx, cy);
    g.rotate(a);
    g.fillStyle = '#1d1f22';
    g.strokeStyle = '#b8bdc2';
    g.lineWidth = r * 0.025;
    g.beginPath();
    g.moveTo(r * 0.2, -r * 0.13); g.lineTo(r * 0.8, -r * 0.22); g.lineTo(r * 0.8, r * 0.22); g.lineTo(r * 0.2, r * 0.13);
    g.closePath(); g.fill(); g.stroke();
    g.restore();
  }
  g.strokeStyle = '#d7dbdf';
  g.lineWidth = r * 0.03;
  g.beginPath(); g.arc(cx, cy, r * 0.88, 0, Math.PI * 2); g.stroke();
  g.lineWidth = r * 0.012;
  g.beginPath(); g.arc(cx, cy, r * 0.95, 0, Math.PI * 2); g.stroke();
  // Centro plateado.
  g.fillStyle = '#9aa0a6';
  g.beginPath(); g.arc(cx, cy, r * 0.17, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#2b2d30';
  g.beginPath(); g.arc(cx, cy, r * 0.1, 0, Math.PI * 2); g.fill();
  // Logo arriba y el peso abajo.
  chevron(g, cx - r * 0.06, cy - r * 0.66, r * 0.16, false);
  g.fillStyle = '#f2f2f2';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `900 ${Math.round(r * 0.15)}px Arial, sans-serif`;
  g.fillText('POWER', cx, cy - r * 0.36);
  g.font = `900 ${Math.round(r * 0.2)}px Arial, sans-serif`;
  g.fillText(kgTexto(kg), cx, cy + r * 0.46);
  g.restore();
}

function caraMancuerna(g, c, kg) {
  const r = c.l / 2;
  const cx = c.x + r;
  const cy = c.y + r;
  g.save();
  g.beginPath(); g.arc(cx, cy, r - 1, 0, Math.PI * 2); g.clip();
  g.fillStyle = '#141517';
  g.fillRect(c.x, c.y, c.l, c.l);
  g.strokeStyle = '#e8e8e8';
  g.lineWidth = r * 0.05;
  g.beginPath(); g.arc(cx, cy, r * 0.86, 0, Math.PI * 2); g.stroke();
  chevron(g, cx - r * 0.1, cy - r * 0.62, r * 0.28, false);
  g.fillStyle = '#f2f2f2';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `900 ${Math.round(r * 0.24)}px Arial, sans-serif`;
  g.fillText('POWER', cx, cy + 0.02 * r);
  g.font = `800 ${Math.round(r * 0.22)}px Arial, sans-serif`;
  g.fillText(kgTexto(kg), cx, cy + r * 0.42);
  g.restore();
}

let atlas = null;
// Textura compartida (discos, mancuernas y goma lisa para los costados).
export function texturaAtlas(THREE) {
  if (atlas) return atlas;
  const c = document.createElement('canvas');
  c.width = ATLAS.w;
  c.height = ATLAS.h;
  const g = c.getContext('2d');
  g.fillStyle = '#141517';
  g.fillRect(0, 0, ATLAS.w, ATLAS.h);
  for (const kg of PESOS_DISCO) caraDisco(g, celdaDisco(kg), kg);
  for (const kg of PESOS_MANCUERNA) caraMancuerna(g, celdaMancuerna(kg), kg);
  atlas = new THREE.CanvasTexture(c);
  atlas.colorSpace = THREE.SRGBColorSpace;
  atlas.anisotropy = 4;
  return atlas;
}

// Cilindro (eje y) con las tapas mostrando una celda del atlas y el costado de goma lisa.
// El texto de las tapas queda derecho si después se gira con rotateX(PI / 2) (caras a ±z)
// y, para ponerlo de costado, además rotateY(PI / 2) (caras a ±x).
export function cilindroAtlas(THREE, r, alto, celda, seg = 20) {
  const geo = new THREE.CylinderGeometry(r, r, alto, seg, 1);
  const uv = geo.attributes.uv;
  const pos = geo.attributes.position;
  const nCostado = (seg + 1) * 2;
  for (let i = 0; i < uv.count; i++) {
    let px = CELDA_GOMA.x + 4;
    let py = CELDA_GOMA.y + 4;
    if (i >= nCostado) {
      const arriba = pos.getY(i) > 0;
      const cu = 0.5 + ((arriba ? 1 : -1) * pos.getX(i)) / (2 * r);
      const cv = 0.5 + pos.getZ(i) / (2 * r);
      px = celda.x + cu * celda.l;
      py = celda.y + cv * celda.l;
    }
    uv.setXY(i, px / ATLAS.w, 1 - py / ATLAS.h);
  }
  return geo;
}
// Gira un cilindro del atlas para que sus caras miren a ±x o ±z (texto derecho).
export function orientar(geo, eje) {
  geo.rotateX(Math.PI / 2);
  if (eje === 'x') geo.rotateY(Math.PI / 2);
  return geo;
}

// ---------- Letras de bloque (POWER / CAMP) ----------
// Cada letra: rectángulos en una grilla de 4 x 6 (trazo de 1).
const LETRAS = {
  P: [[0, 0, 1, 6], [1, 5, 3, 6], [3, 2.5, 4, 6], [1, 2.5, 3, 3.5]],
  O: [[0, 0, 1, 6], [3, 0, 4, 6], [1, 0, 3, 1], [1, 5, 3, 6]],
  W: [[0, 0, 1, 6], [3, 0, 4, 6], [1.5, 0.6, 2.5, 3.6], [1, 0, 3, 1]],
  E: [[0, 0, 1, 6], [1, 5, 4, 6], [1, 2.5, 3.2, 3.5], [1, 0, 4, 1]],
  R: [[0, 0, 1, 6], [1, 5, 3, 6], [3, 3.2, 4, 6], [1, 2.5, 3.4, 3.5], [2.6, 0, 3.8, 2.5]],
  C: [[0, 0, 1, 6], [1, 5, 4, 6], [1, 0, 4, 1]],
  A: [[0, 0, 1, 5], [3, 0, 4, 5], [0.5, 5, 3.5, 6], [1, 2.4, 3, 3.4]],
  M: [[0, 0, 1, 6], [3, 0, 4, 6], [1, 5, 1.7, 6], [2.3, 5, 3, 6], [1.6, 3.7, 2.4, 5.3]],
};
// Palabra en el plano x/y, apoyada en y0, sobresaliendo de la pared (en z) hacia +z.
function palabra(k, g, texto, x0, y0, alto, z, fondo, color) {
  const u = alto / 6;
  let x = x0;
  for (const letra of texto) {
    for (const [a, b, c, d] of LETRAS[letra]) g.add(k.cajaDe(x + a * u, y0 + b * u, z, x + c * u, y0 + d * u, z + fondo, color));
    x += 5 * u;
  }
  return x - u;
}
export const anchoPalabra = (texto, alto) => (texto.length * 5 - 1) * (alto / 6);

// ---------- Edificio ----------
export function edificio(k, g) {
  const THREE = k.THREE;
  const concreto = k.tex('concreto', '#5a5d63', 4);
  const panel = k.tex('panel', P.grafito, 3);
  const alto = G.alto;
  // Piso de goma y vereda.
  g.add(k.cajaDe(G.x0, 0, G.z0, G.x1, F, G.z1, k.tex('goma', '#ffffff', 3)));
  g.add(k.noSolido(k.cajaDe(G.x0 - 1, 0, G.z1, G.x1 + 1, 0.12, G.z1 + 4, k.tex('concreto', '#cfcbc4', 3))));
  // Paredes: frente con la puerta grande, costados con ventanales altos y el fondo.
  const ventanas = [{ a: G.z0 + 8, b: G.z0 + 16, y0: 7, y1: 10.5 }, { a: G.z0 + 22, b: G.z0 + 30, y0: 7, y1: 10.5 }];
  pared(k, g, 'x', G.z1 - T / 2, G.x0, G.x1, 0, alto, T, panel, [{ ...PU, y0: 0, y1: PU.alto }, { a: G.x0 + 2, b: PU.a - 2, y0: 0.6, y1: PU.alto }, { a: PU.b + 2, b: G.x1 - 2, y0: 0.6, y1: PU.alto }]);
  pared(k, g, 'x', G.z0 + T / 2, G.x0, G.x1, 0, alto, T, concreto);
  pared(k, g, 'z', G.x0 + T / 2, G.z0 + T, G.z1 - T, 0, alto, T, concreto, ventanas);
  pared(k, g, 'z', G.x1 - T / 2, G.z0 + T, G.z1 - T, 0, alto, T, concreto, ventanas);
  // Ventanales del frente (vidrio oscuro con perfiles negros) y de los costados (luz de día).
  for (const [a, b] of [[G.x0 + 2, PU.a - 2], [PU.b + 2, G.x1 - 2]]) {
    g.add(k.cajaDe(a, 0.6, G.z1 - 0.45, b, PU.alto, G.z1 - 0.35, k.vidrio));
    for (let x = a; x <= b + 0.01; x += (b - a) / 3) g.add(k.noSolido(k.cajaDe(x - 0.1, 0.6, G.z1 - 0.6, x + 0.1, PU.alto, G.z1 + 0.05, P.negro)));
  }
  for (const x of [G.x0 + T / 2, G.x1 - T / 2]) {
    for (const v of ventanas) g.add(k.noSolido(k.cajaDe(x - 0.05, v.y0, v.a, x + 0.05, v.y1, v.b, k.brillo('#dfe9f2'))));
  }
  // Marco negro de la puerta.
  g.add(k.noSolido(k.cajaDe(PU.a - 0.4, 0, G.z1 - 0.9, PU.a, PU.alto + 0.4, G.z1 + 0.1, P.negro)));
  g.add(k.noSolido(k.cajaDe(PU.b, 0, G.z1 - 0.9, PU.b + 0.4, PU.alto + 0.4, G.z1 + 0.1, P.negro)));
  // Techo negro y la faja del frente con POWER en letras blancas grandes (y CAMP en dorado).
  g.add(k.cajaDe(G.x0 - 0.3, alto, G.z0 - 0.3, G.x1 + 0.3, alto + 0.5, G.z1 + 0.3, P.negro));
  g.add(k.noSolido(k.cajaDe(G.x0 - 0.4, PU.alto + 0.4, G.z1 - 0.1, G.x1 + 0.4, alto + 0.9, G.z1 + 0.25, k.tex('panel', '#2d3035', 3))));
  const altoLetra = 2.7;
  const ancho = anchoPalabra('POWER', altoLetra);
  const xp = (PU.a + PU.b) / 2 - ancho / 2;
  const fin = palabra(k, g, 'POWER', xp, PU.alto + 0.9, altoLetra, G.z1 + 0.25, 0.55, k.brillo('#f6f6f4'));
  palabra(k, g, 'CAMP', fin + 0.9, PU.alto + 0.9, 1.15, G.z1 + 0.25, 0.4, k.brillo(P.dorado));
  // Adentro del techo: vigas de acero y aros de luz.
  for (let z = G.z0 + 4; z < G.z1 - 2; z += 7) g.add(k.noSolido(k.cajaDe(G.x0 + T, alto - 0.9, z - 0.25, G.x1 - T, alto, z + 0.25, P.negro)));
  const aros = [];
  for (let x = G.x0 + 5; x < G.x1 - 3; x += 7) {
    for (let z = G.z0 + 7.5; z < G.z1 - 2; z += 7) {
      const t = new THREE.TorusGeometry(1.45, 0.09, 6, 28);
      t.rotateX(Math.PI / 2);
      t.translate(x, alto - 1.9, z);
      aros.push(t);
      for (const dx of [-0.9, 0.9]) {
        const cable = new THREE.BoxGeometry(0.03, 1.0, 0.03);
        cable.translate(x + dx, alto - 1.4, z);
        aros.push(cable);
      }
    }
  }
  const malla = new THREE.Mesh(k.unir(aros), k.brillo('#fff3dc'));
  malla.userData.noSolido = true;
  g.add(malla);
  // Columnas de acero negras.
  for (const x of [G.x0 + 17, G.x1 - 17]) {
    for (const z of [G.z0 + 12, G.z0 + 26]) g.add(k.cajaDe(x - 0.45, F, z - 0.45, x + 0.45, alto, z + 0.45, P.negro));
  }

  // ---------- Entrada: alfombra START, plantas en macetas blancas y bicis ----------
  const alfombra = k.imagenCanvas(dibujarAlfombra, 512, 2048);
  alfombra.rotation.x = -Math.PI / 2;
  alfombra.scale.set(PU.b - PU.a - 4.6, 19, 1);
  alfombra.position.set((PU.a + PU.b) / 2, F + 0.03, G.z1 - 7.3);
  g.add(alfombra);
  for (const x of [PU.a - 2.4, PU.b + 2.4]) palmera(k, g, x, G.z1 + 1.6);
  for (const [i, x] of [-444, -440.5, -437].entries()) bici(k, g, x, G.z1 + 2.2, ['#3d7bd9', '#e53935', '#24282c'][i]);
}

// La alfombra de la entrada (pista de trineo): negra, con las líneas blancas y START.
function dibujarAlfombra(g, w, h) {
  g.fillStyle = '#121214';
  g.fillRect(0, 0, w, h);
  // Pelito del césped sintético.
  for (let i = 0; i < 9000; i++) {
    const v = 20 + Math.random() * 22;
    g.fillStyle = `rgb(${v},${v},${v + 3})`;
    g.fillRect(Math.random() * w, Math.random() * h, 2, 3);
  }
  g.fillStyle = '#ecebe6';
  const borde = w * 0.06;
  for (const x of [borde, w - borde * 2.2]) {
    g.fillRect(x, 0, borde * 0.45, h);
    g.fillRect(x + borde * 0.75, 0, borde * 0.45, h);
  }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const largo = h - 240;
  for (let i = 1; i <= 5; i++) {
    const y = 240 + largo - (i * largo) / 6;
    g.fillRect(w * 0.26, y, w * 0.48, 10);
    g.font = '900 96px Arial, sans-serif';
    g.fillText(String(i), w / 2, y + 70);
  }
  g.font = '900 120px Arial, sans-serif';
  g.save();
  g.translate(w / 2, h - 110);
  g.fillText('START', 0, 0);
  g.restore();
}

function palmera(k, g, x, z) {
  g.add(k.cilindro(0.75, 0.6, 1.5, '#f2f2f0', x, 0.75, z, 14));
  g.add(k.noSolido(k.cilindro(0.66, 0.66, 0.1, '#4a3626', x, 1.48, z, 12)));
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const hoja = k.noSolido(k.caja(0.18, 3.2, 0.5, i % 2 ? '#3f8f3a' : '#4fa64a', x + Math.cos(a) * 0.55, 3.1, z + Math.sin(a) * 0.55));
    hoja.rotation.set(Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45);
    g.add(hoja);
  }
}

function bici(k, g, x, z, color) {
  const THREE = k.THREE;
  const ruedas = [];
  for (const dx of [-1.05, 1.05]) {
    const r = new THREE.TorusGeometry(0.62, 0.07, 6, 18);
    r.translate(x + dx, 0.7, z);
    ruedas.push(r);
  }
  const m = new THREE.Mesh(k.unir(ruedas), k.material('#1b1c1e'));
  m.userData.noSolido = true;
  g.add(m);
  const tubo = (x0, y0, x1, y1) => {
    const l = Math.hypot(x1 - x0, y1 - y0);
    const c = k.noSolido(k.caja(l, 0.09, 0.09, color, (x0 + x1) / 2, (y0 + y1) / 2, z));
    c.rotation.z = Math.atan2(y1 - y0, x1 - x0);
    g.add(c);
  };
  tubo(x - 1.05, 0.7, x - 0.1, 0.75);
  tubo(x - 0.1, 0.75, x + 0.55, 1.45);
  tubo(x - 1.05, 0.7, x - 0.25, 1.5);
  tubo(x - 0.25, 1.5, x + 0.55, 1.45);
  tubo(x + 1.05, 0.7, x + 0.6, 1.6);
  g.add(k.noSolido(k.cajaDe(x - 0.45, 1.55, z - 0.12, x - 0.05, 1.65, z + 0.12, '#111')));
  g.add(k.noSolido(k.cajaDe(x + 0.55, 1.7, z - 0.4, x + 0.65, 1.78, z + 0.4, '#111')));
}

// ---------- Mostrador de Kelvin ----------
export function mostrador(k, g) {
  const x0 = KV.x - 3.2; // frente del mostrador, mirando a la alfombra
  const z0 = KV.z - 4.5;
  const z1 = KV.z + 4.5;
  const gris = k.tex('panel', '#b9bbbd', 2);
  g.add(k.cajaDe(x0, F, z0, x0 + 1.1, F + 2.3, z1, gris));
  g.add(k.cajaDe(x0 - 0.15, F + 2.3, z0 - 0.15, x0 + 1.25, F + 2.5, z1 + 0.15, k.tex('listones', P.madera, 2)));
  g.add(k.noSolido(k.cajaDe(x0 - 0.05, F, z0, x0, F + 0.3, z1, P.negro)));
  // Monitor y la planta arriba del mostrador.
  g.add(k.noSolido(k.cajaDe(x0 + 0.5, F + 2.5, z0 + 1.2, x0 + 0.6, F + 3.4, z0 + 2.6, P.negro)));
  g.add(k.noSolido(k.cajaDe(x0 + 0.44, F + 2.6, z0 + 1.3, x0 + 0.5, F + 3.3, z0 + 2.5, k.brillo('#6fb6ff'))));
  g.add(k.noSolido(k.cilindro(0.3, 0.25, 0.5, '#f2f2f0', x0 + 0.6, F + 2.75, z1 - 1, 10)));
  for (let i = 0; i < 6; i++) {
    const hoja = k.noSolido(k.caja(0.08, 1, 0.2, '#4fa64a', x0 + 0.6, F + 3.4, z1 - 1));
    hoja.rotation.set(Math.sin(i) * 0.5, i, Math.cos(i) * 0.5);
    g.add(hoja);
  }
  // Pared negra atrás de Kelvin con el logo de Power.
  const xp = KV.x + 2.1;
  g.add(k.cajaDe(xp, F, z0 - 1, xp + 0.5, 7.5, z1 + 2, P.negro));
  const logo = k.imagen('assets/especiales/gymlogo.png', 4.4, 4.24);
  logo.position.set(xp - 0.02, 4.6, KV.z);
  logo.rotation.y = -Math.PI / 2;
  g.add(logo);
}

// ---------- Espejo y stand de mancuernas ----------
export function mancuernas(k, g) {
  const THREE = k.THREE;
  const xi = G.x0 + T;
  // Espejo grande en la pared (gris azulado que brilla un poco, con marco negro).
  g.add(k.noSolido(k.cajaDe(xi, 0.5, G.z0 + 5, xi + 0.08, 8, G.z0 + 31, k.brillo('#8d99a6'))));
  g.add(k.noSolido(k.cajaDe(xi, 0.4, G.z0 + 4.9, xi + 0.1, 0.5, G.z0 + 31.1, P.negro)));
  g.add(k.noSolido(k.cajaDe(xi, 8, G.z0 + 4.9, xi + 0.1, 8.1, G.z0 + 31.1, P.negro)));
  // Stand de dos pisos, largo, con las 16 mancuernas en par (de 2,5 a 40 kg).
  const xs = xi + 2.1; // eje del stand
  const za = G.z0 + 6;
  const zb = G.z0 + 30;
  for (const z of [za, (za + zb) / 2, zb]) g.add(k.cajaDe(xs - 0.9, F, z - 0.15, xs + 0.9, F + 2.5, z + 0.15, P.negro));
  for (const [y, dx] of [[1.0, 0.25], [2.2, -0.25]]) {
    const bandeja = k.cajaDe(xs - 0.85 + dx, F + y - 0.08, za, xs + 0.85 + dx, F + y, zb, P.gris);
    bandeja.rotation.z = 0.12;
    g.add(bandeja);
  }
  const cabezas = [];
  const manijas = [];
  PESOS_MANCUERNA.forEach((kg, i) => {
    const piso = i < 8 ? 0 : 1;
    const j = i % 8;
    const y = F + (piso ? 2.42 : 1.22);
    const x = xs + (piso ? -0.25 : 0.25);
    const r = 0.27 + kg * 0.0045;
    for (const n of [0, 1]) {
      const z = za + 0.9 + j * 2.95 + n * 1.2;
      const [c1, c2, m] = mancuernaGeo(THREE, kg, r);
      for (const geo of [c1, c2, m]) {
        orientar(geo, 'x'); // el eje a lo ancho del stand: una cara mira al pasillo
        geo.translate(x, y + r, z);
      }
      cabezas.push(c1, c2);
      manijas.push(m);
    }
  });
  g.add(k.noSolido(new THREE.Mesh(k.unir(cabezas), new THREE.MeshLambertMaterial({ map: texturaAtlas(THREE) }))));
  g.add(k.noSolido(new THREE.Mesh(k.unir(manijas), k.material(P.cromo))));
  // Bancos ajustables frente al espejo.
  for (const z of [G.z0 + 9, G.z0 + 27]) banco(k, g, xi + 7.5, z, 0);
}

// Mancuerna de eje y (largo 1,5): dos cabezas con la cara POWER y la manija cromada.
export function mancuernaGeo(THREE, kg, r = 0.3) {
  const ancho = 0.32 + kg * 0.004;
  const c1 = cilindroAtlas(THREE, r, ancho, celdaMancuerna(kg), 18);
  const c2 = c1.clone();
  c1.translate(0, 0.55, 0);
  c2.translate(0, -0.55, 0);
  const m = new THREE.CylinderGeometry(0.075, 0.075, 0.85, 8);
  return [c1, c2, m];
}

function banco(k, g, x, z, giro) {
  g.add(k.cajaDe(x - 0.55, F + 1.05, z - 2.1, x + 0.55, F + 1.35, z + 2.1, P.negro));
  g.add(k.noSolido(k.cajaDe(x - 0.15, F, z - 1.8, x + 0.15, F + 1.05, z - 1.5, P.gris)));
  g.add(k.noSolido(k.cajaDe(x - 0.15, F, z + 1.5, x + 0.15, F + 1.05, z + 1.8, P.gris)));
  g.add(k.noSolido(k.cajaDe(x - 0.7, F, z - 1.9, x + 0.7, F + 0.15, z - 1.4, P.gris)));
  g.add(k.noSolido(k.cajaDe(x - 0.7, F, z + 1.4, x + 0.7, F + 0.15, z + 1.9, P.gris)));
  return giro;
}

// ---------- Racks, banco de press, torres de máquinas y máquinas amarillas ----------
export function maquinas(k, g) {
  const THREE = k.THREE;
  const discos = [];
  const disco = (kg, x, y, z, eje) => {
    const r = { 5: 0.5, 10: 0.66, 20: 0.88, 25: 0.95 }[kg];
    const geo = cilindroAtlas(THREE, r, 0.14 + kg * 0.004, celdaDisco(kg), 22);
    orientar(geo, eje);
    geo.translate(x, y, z);
    discos.push(geo);
  };
  // Rack de dominadas (pared derecha): negro con los ganchos y los brazos amarillos.
  const rack = (cx, cz, conBarra) => {
    for (const dx of [-2.7, 2.7]) {
      for (const dz of [-1.5, 1.5]) g.add(k.cajaDe(cx + dx - 0.2, F, cz + dz - 0.2, cx + dx + 0.2, 9, cz + dz + 0.2, P.negro));
      g.add(k.noSolido(k.cajaDe(cx + dx - 0.2, 8.8, cz - 1.5, cx + dx + 0.2, 9.1, cz + 1.5, P.negro)));
      // Brazos de seguridad y ganchos amarillos.
      g.add(k.noSolido(k.cajaDe(cx + dx - 0.15, 2.6, cz - 1.5, cx + dx + 0.15, 2.85, cz + 1.9, P.amarillo)));
      g.add(k.noSolido(k.cajaDe(cx + dx - 0.18, 4.4, cz + 1.7, cx + dx + 0.18, 4.75, cz + 2.1, P.amarillo)));
    }
    g.add(k.noSolido(k.cajaDe(cx - 2.7, 8.8, cz - 1.7, cx + 2.7, 9.1, cz - 1.3, P.negro)));
    if (conBarra) {
      const barra = k.noSolido(k.cilindro(0.08, 0.08, 5.8, P.cromo, cx, 8.6, cz + 1.5, 10));
      barra.rotation.z = Math.PI / 2;
      g.add(barra);
    }
    g.add(k.noSolido(k.cajaDe(cx - 2.9, F, cz - 1.7, cx + 2.9, F + 0.12, cz + 1.7, '#202124')));
  };
  const D = EST.dominadas;
  rack(D.x, D.z, true);
  rack(D.x, D.z + 9, false);
  // Barra olímpica con discos en el segundo rack.
  const zr = D.z + 9 + 1.9;
  const b2 = k.noSolido(k.cilindro(0.07, 0.07, 7.2, P.cromo, D.x, 4.95, zr, 10));
  b2.rotation.z = Math.PI / 2;
  g.add(b2);
  for (const s of [-1, 1]) { disco(20, D.x + s * 2.95, 4.95, zr, 'x'); disco(10, D.x + s * 3.15, 4.95, zr, 'x'); }

  // Banco de press plano con los soportes (la barra con los discos la pone gimnasio.js).
  const B = EST.banca;
  g.add(k.cajaDe(B.x - 0.6, F + 1.0, B.z + 0.4, B.x + 0.6, F + 1.3, B.z + 4.2, P.negro));
  g.add(k.noSolido(k.cajaDe(B.x - 0.2, F, B.z + 0.8, B.x + 0.2, F + 1.0, B.z + 3.8, P.gris)));
  for (const s of [-1, 1]) {
    const xs = B.x + s * 1.9;
    g.add(k.cajaDe(xs - 0.18, F, B.z + 1.25, xs + 0.18, 4.3, B.z + 1.6, P.negro));
    g.add(k.noSolido(k.cajaDe(xs - 0.2, 3.7, B.z + 1.55, xs + 0.2, 3.85, B.z + 1.9, P.amarillo)));
    g.add(k.noSolido(k.cajaDe(xs - 0.4, F, B.z + 0.9, xs + 0.4, F + 0.12, B.z + 2, P.gris)));
  }
  // Árbol de discos al lado.
  const ax = B.x + 4.5;
  const az = B.z + 3;
  g.add(k.cajaDe(ax - 0.12, F, az - 0.12, ax + 0.12, 3.4, az + 0.12, P.negro));
  g.add(k.noSolido(k.cajaDe(ax - 1, F, az - 0.6, ax + 1, F + 0.15, az + 0.6, P.negro)));
  [[25, 2.8], [20, 2.0], [10, 1.2]].forEach(([kg, y]) => { disco(kg, ax, y, az + 0.25, 'z'); disco(kg, ax, y, az - 0.25, 'z'); });

  // Fila de torres negras contra el fondo (las de pec dec y jalón las completa gimnasio.js).
  const zt = G.z0 + T + 0.75;
  const torre = (x, altoTorre = 6.4) => {
    g.add(k.cajaDe(x - 0.85, F, zt - 0.7, x + 0.85, altoTorre, zt + 0.7, k.tex('panel', '#1e1f22', 2)));
    g.add(k.noSolido(k.cajaDe(x - 0.88, altoTorre, zt - 0.73, x + 0.88, altoTorre + 0.2, zt + 0.73, '#c4c7ca')));
    const placa = k.imagenCanvas((c, w, h) => {
      c.fillStyle = '#0d0e10'; c.fillRect(0, 0, w, h);
      chevron(c, w * 0.08, h * 0.22, h * 0.56, true);
      c.fillStyle = '#efefef'; c.font = `900 ${h * 0.5}px Arial, sans-serif`; c.textBaseline = 'middle';
      c.fillText('POWER', w * 0.32, h * 0.53);
    }, 256, 80);
    placa.scale.set(1.1, 0.35, 1);
    placa.position.set(x, altoTorre - 1.1, zt + 0.72);
    g.add(placa);
    return zt;
  };
  for (const x of [G.x0 + 5, G.x0 + 11, EST.pecdec.x, G.x0 + 23, EST.jalon.x, G.x0 + 35, G.x0 + 41]) {
    torre(x, x === EST.jalon.x ? 9.2 : 6.4);
    if (x !== EST.pecdec.x && x !== EST.jalon.x) {
      // Máquina de piernas/brazos genérica: asiento, respaldo y palanca con el rodillo.
      g.add(k.cajaDe(x - 0.6, F + 1.2, zt + 1.2, x + 0.6, F + 1.55, zt + 2.6, P.negro));
      g.add(k.noSolido(k.cajaDe(x - 0.6, F + 1.55, zt + 0.75, x + 0.6, F + 4.2, zt + 1.05, P.negro)));
      g.add(k.noSolido(k.cajaDe(x - 0.15, F, zt + 1.5, x + 0.15, F + 1.2, zt + 2.3, P.gris)));
      const palanca = k.noSolido(k.caja(0.18, 2.2, 0.18, '#2c2e31', x + 0.9, F + 1.3, zt + 2.6));
      palanca.rotation.x = 0.7;
      g.add(palanca);
      const rodillo = k.noSolido(k.cilindro(0.25, 0.25, 1.3, '#111214', x + 0.3, F + 0.6, zt + 3.3, 10));
      rodillo.rotation.z = Math.PI / 2;
      g.add(rodillo);
      g.add(k.noSolido(k.cilindro(0.12, 0.12, 0.2, '#e0a526', x + 0.95, F + 2.2, zt + 2.1, 8)));
    }
  }
  // Pec dec: asiento y respaldo. Jalón: asiento y apoyo de rodillas.
  const pd = EST.pecdec.x;
  g.add(k.cajaDe(pd - 0.75, F + 1.15, zt + 1.6, pd + 0.75, F + 1.5, zt + 3.1, P.negro));
  g.add(k.noSolido(k.cajaDe(pd - 0.2, F, zt + 2.0, pd + 0.2, F + 1.15, zt + 2.7, P.gris)));
  g.add(k.cajaDe(pd - 0.75, F + 1.5, zt + 1.15, pd + 0.75, F + 5.6, zt + 1.5, P.negro));
  const ja = EST.jalon.x;
  g.add(k.cajaDe(ja - 0.75, F + 1.15, zt + 3.0, ja + 0.75, F + 1.5, zt + 4.4, P.negro));
  g.add(k.noSolido(k.cajaDe(ja - 0.2, F, zt + 3.4, ja + 0.2, F + 1.15, zt + 4.0, P.gris)));
  g.add(k.noSolido(k.cajaDe(ja - 0.2, F, zt + 0.7, ja + 0.2, F + 0.3, zt + 4.2, P.gris)));
  const rodillos = k.noSolido(k.cilindro(0.3, 0.3, 1.9, '#111214', ja, F + 2.85, zt + 2.85, 10));
  rodillos.rotation.z = Math.PI / 2;
  g.add(rodillos);
  g.add(k.noSolido(k.cajaDe(ja - 0.12, F + 1.5, zt + 2.75, ja + 0.12, F + 2.85, zt + 2.95, P.gris)));
  // Brazo de arriba del jalón con la roldana justo arriba de la barra.
  g.add(k.noSolido(k.cajaDe(ja - 0.2, 8.8, zt, ja + 0.2, 9.1, zt + 3.7, P.negro)));
  g.add(k.noSolido(k.cilindro(0.28, 0.28, 0.2, P.gris, ja, 8.7, zt + 3.4, 12)));

  // Máquinas de discos amarillas (como las de las fotos), en el medio.
  for (const [x, z] of [[G.x0 + 13, G.z0 + 14], [G.x0 + 13, G.z0 + 22], [G.x0 + 21, G.z0 + 18]]) {
    g.add(k.cajaDe(x - 0.5, F + 1.1, z - 1.6, x + 0.5, F + 1.45, z + 0.4, P.negro));
    g.add(k.noSolido(k.cajaDe(x - 0.5, F + 1.45, z - 1.95, x + 0.5, F + 4.4, z - 1.6, P.negro)));
    g.add(k.noSolido(k.cajaDe(x - 1.5, F, z - 2.4, x + 1.5, F + 0.25, z + 1, '#2c2e31')));
    for (const s of [-1, 1]) {
      const brazo = k.noSolido(k.caja(0.35, 3.6, 0.45, P.amarillo, x + s * 1.25, F + 3.1, z - 0.6));
      brazo.rotation.x = -0.5;
      g.add(brazo);
      g.add(k.noSolido(k.cajaDe(x + s * 1.25 - 0.18, F, z - 2.3, x + s * 1.25 + 0.18, F + 2.4, z - 1.9, P.amarillo)));
      const cuerno = k.noSolido(k.cilindro(0.09, 0.09, 0.9, P.cromo, x + s * 1.75, F + 4.1, z + 0.4, 8));
      cuerno.rotation.z = Math.PI / 2;
      g.add(cuerno);
      disco(20, x + s * 1.85, F + 4.1, z + 0.4, 'x');
    }
  }
  g.add(k.noSolido(new THREE.Mesh(k.unir(discos), new THREE.MeshLambertMaterial({ map: texturaAtlas(THREE) }))));

  // Soga de batalla colgando de una viga, enroscada en el piso.
  const sx = G.x1 - 9;
  const sz = G.z1 - 13;
  g.add(k.noSolido(k.cilindro(0.16, 0.16, G.alto - 1.2, '#b0703f', sx, (G.alto - 1.2) / 2 + 0.6, sz, 8)));
  for (let i = 0; i < 3; i++) {
    const vuelta = new THREE.Mesh(new THREE.TorusGeometry(0.75 - i * 0.15, 0.16, 6, 16), k.material('#a8683a'));
    vuelta.rotation.x = Math.PI / 2;
    vuelta.position.set(sx, 0.35 + i * 0.3, sz);
    vuelta.userData.noSolido = true;
    g.add(vuelta);
  }
}
