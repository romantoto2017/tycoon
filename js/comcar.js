import * as THREE from 'three';
import { COMCAR as CC, AUTOPISTA as AU } from './constantes.js';
import { Constructor, dibujarCara } from './ciudad.js';
import { crearPersonaje } from './personaje.js';
import { cargarCabeza, crearEtiqueta, liberarAlSubir } from './texturas.js';
import { crearAK } from './arma.js';
import { PERSONAJES } from '../data/personajes.js';
import { momento } from './cielo.js';
import { aleatorio, formato } from './util.js';
import { sfx } from './sfx.js';

// El C.O.M.C.A.R. (como las fotos de referencia): doble alambrado con concertina, torres de
// vigilancia, el Módulo 4 de dos pisos (blanco y celeste, galerías enrejadas, ropa colgada), el
// pabellón por dentro (rejas, el cartel "A1 1-10", celdas con cama de material, letrina y charcos),
// el comedor, los baños, el patio de tierra y la sala de visitas. Todo sucio y descuidado:
// manchas de humedad, basura, papeles, charcos. Guardias de azul (algunos con escopeta) y muchos
// presos de naranja con las esposas.
//
// Si caés preso (la policía, policia.js), tu vida pasa a ser acá adentro: no podés salir ni hacer
// nada afuera; la rutina del día (patio, comedor, baños, celda de noche) y las misiones para salir:
// conocer al Extravirgen (su cara: herramientas/extravirgen.py) y escaparse juntos por un túnel, o
// sobornar al guardia. Otros jugadores presos se ven (cada uno se escapa por su cuenta); los de afuera te pueden
// visitar en la sala (el lado de afuera se entra desde el portón). Todo en estado.carcel.
const W = CC.x1 - CC.x0;
const X = (u) => CC.x0 + u; // de la esquina noroeste de la cárcel al mundo
const Z = (v) => CC.z0 + v;
const VIS = { x0: CC.entrada - 22, x1: CC.entrada + 22, z0: CC.z1 - 44, rejas: CC.z1 - 30, z1: CC.z1 - 16 }; // sala de visitas
// Donde vive el preso (no puede salir de acá).
export const ADENTRO = { x0: X(12), x1: X(W - 12), z0: Z(12), z1: VIS.rejas - 0.5 };
const H = 7.4; // alto de cada piso (3 m: 1 m = 2,47)
const PISOS = 3;
// El Módulo 4 (como la foto del patio interno): dos pabellones de 3 pisos enfrentados, cada uno con
// celdas y su galería enrejada de arriba a abajo; en el medio, el patio de cemento con el charco.
const MOD = { x0: X(20), x1: X(200), z0: Z(20), z1: Z(38), galeria: 6 }; // pabellón A (el tuyo, celdas mirando al sur)
const PAB_B = { z0: Z(62), z1: Z(80) }; // pabellón B (celdas mirando al norte); su cara sur es la fachada
const PATIO_INT = { z0: MOD.z1, z1: PAB_B.z0 };
const CELDA = 11; // ancho de cada celda
const N_CELDAS = Math.floor((MOD.x1 - MOD.x0 - 12) / CELDA);
const COM = { x0: X(225), x1: X(305), z0: Z(22), z1: Z(64) }; // comedor
const BAN = { x0: X(320), x1: X(W - 22), z0: Z(22), z1: Z(58) }; // baños
const PATIO = { x0: X(40), x1: X(W - 40), z0: Z(92), z1: VIS.z0 - 12 };
const celda = (n) => ({ x0: MOD.x0 + 2 + n * CELDA, x1: MOD.x0 + 2 + (n + 1) * CELDA - 0.6, z0: MOD.z0 + 0.5, z1: MOD.z1 - MOD.galeria });
const TU_CELDA = 6; // la 7
const SU_CELDA = 7; // la 8 (la del Extravirgen, donde está el túnel)
const TUNEL = (() => { const c = celda(SU_CELDA); return { x: c.x0 + 3, z: c.z0 + 4 }; })();
const SALIDA = { x: celda(SU_CELDA).x0 + 3, z: CC.z0 - 14 }; // del otro lado del alambrado norte
const GUARDIA_PUERTA = { x: MOD.x1 + 5, z: (PATIO_INT.z0 + PATIO_INT.z1) / 2 }; // en la reja de entrada al pabellón
export const EXTRAVIRGEN = { id: 'extravirgen', nombre: 'El Extravirgen', foto: 'extravirgen.jpeg', recorte: [0.5, 0.5, 1], piel: '#e0b296', pelo: '#1c1612', peinado: 'liso', remera: '#f07c18', pantalon: '#f07c18', mangasLargas: true };

// La rutina del día (por la hora del ciclo de día y noche): qué toca y dónde.
function rutina(noche, sol) {
  if (noche > 0.5) return { que: 'Celda', donde: 'Encerrado en tu celda: es de noche' };
  if (sol < 0.18) return { que: 'Baños', donde: 'Hora de los baños (duchas)' };
  if (sol < 0.32 || (sol > 0.62 && sol < 0.74)) return { que: 'Comedor', donde: 'Hora de comer en el comedor' };
  return { que: 'Patio', donde: 'Hora de patio' };
}

// Los pasos para salir (estado.carcel.paso). Cada uno: el objetivo que se muestra arriba.
const PASOS = [
  'Andá a tu celda (la 7, en el Módulo 4) y tirate en la cama',
  'Comé algo en el comedor',
  'Buscá al Extravirgen en el patio',
  'Robate una cuchara del comedor sin que te vea el guardia',
  'Limpiá los baños por cigarrillos (los 5 inodoros)',
  'Sobornale al guardia Benítez (en la reja del Módulo 4) los cigarrillos',
  'De noche, cavá el túnel en la celda del Extravirgen (la 8)',
  'Esta noche: metete en el túnel con el Extravirgen y escapate',
];

// ---------- Texturas (de un solo dibujo) ----------
function tex(w, h, dibujar, repetir = false) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  dibujar(c.getContext('2d'), w, h);
  const t = liberarAlSubir(new THREE.CanvasTexture(c));
  t.colorSpace = THREE.SRGBColorSpace;
  if (repetir) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
// Alambrado romboidal (transparente entre los alambres).
const texAlambrado = () => tex(64, 64, (g) => {
  g.strokeStyle = 'rgba(190,195,200,0.95)';
  g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, 32); g.lineTo(32, 0); g.lineTo(64, 32); g.lineTo(32, 64); g.closePath(); g.stroke();
}, true);
// Pared pintada vieja: el color con manchas de humedad, desconchado y mugre abajo.
const texPared = (color) => tex(128, 128, (g, w, h) => {
  g.fillStyle = color;
  g.fillRect(0, 0, w, h);
  const r = aleatorio(color.length * 7);
  for (let i = 0; i < 9; i++) {
    g.fillStyle = `rgba(${60 + r() * 40},${55 + r() * 30},${40 + r() * 20},${0.04 + r() * 0.07})`;
    g.beginPath(); g.ellipse(r() * w, r() * h, 6 + r() * 22, 4 + r() * 16, r() * 3, 0, Math.PI * 2); g.fill();
  }
  const gr = g.createLinearGradient(0, h * 0.7, 0, h);
  gr.addColorStop(0, 'rgba(60,50,40,0)');
  gr.addColorStop(1, 'rgba(60,50,40,0.22)');
  g.fillStyle = gr;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(r() * w, r() * h, 3 + r() * 8, 2 + r() * 5); } // desconchado
}, true);
// Reja: un barrote vertical y dos travesaños (transparente entre medio). Se repite por los UV.
const texReja = () => tex(32, 128, (g, w, h) => {
  g.fillStyle = '#2f3b47';
  g.fillRect(w / 2 - 3, 0, 6, h);
  g.fillRect(0, 6, w, 6);
  g.fillRect(0, h - 12, w, 6);
}, true);
// Piedra (las torres, como las de la imagen de referencia): bloques grises con junta.
const texPiedra = () => tex(128, 128, (g, w, h) => {
  g.fillStyle = '#8e8a84';
  g.fillRect(0, 0, w, h);
  const r = aleatorio(9);
  for (let f = 0; f < 8; f++) for (let k = -1; k < 4; k++) {
    const t = 150 + Math.floor(r() * 40);
    g.fillStyle = `rgb(${t},${t - 4},${t - 10})`;
    g.fillRect(k * 40 + (f % 2) * 20 + 2, f * 16 + 2, 36, 12);
  }
}, true);
const texCartel = (texto, sub, color = '#1d4fa0') => tex(512, 128, (g, w, h) => {
  g.fillStyle = 'rgba(0,0,0,0)';
  g.fillRect(0, 0, w, h);
  g.fillStyle = color;
  g.font = '900 88px Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(texto, w / 2, sub ? 52 : h / 2);
  if (sub) { g.font = '700 32px Arial, sans-serif'; g.fillStyle = '#333'; g.fillText(sub, w / 2, 108); }
});

// Un paño de reja (plano vertical con la textura repetida por los UV, así todas usan la misma).
function reja(mat, x0, z0, x1, z1, y0, y1) {
  const largo = Math.hypot(x1 - x0, z1 - z0);
  const g = new THREE.PlaneGeometry(largo, y1 - y0);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (largo / 0.55), uv.getY(i) * ((y1 - y0) / 3.6));
  const m = new THREE.Mesh(g, mat);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  m.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
  return m;
}

export class Comcar {
  constructor({ escena, estado, ui, guardar, colisiones, jugador, hora, pausar }) {
    Object.assign(this, { escena, estado, ui, guardar, colisiones, jugador, hora, pausar });
    this.grupo = null;
    this.gente = [];
    this.reloj = 0;
    this.alEncarcelar = null; // main.js: bajarse del auto, etc.
    this.alLiberar = null;
    this.hud = document.getElementById('carcel-hud');
  }

  get preso() { return !!this.estado.carcel; }
  get c() { return this.estado.carcel; }
  // En la sala de visitas (del lado que sea).
  enSalaVisitas(p) { return p.x > VIS.x0 && p.x < VIS.x1 && p.z > VIS.z0 && p.z < VIS.z1; }
  dentro(p, m = 0) { return p.x > CC.x0 - m && p.x < CC.x1 + m && p.z > CC.z0 - m && p.z < CC.z1 + m; }

  solido(x0, y0, z0, x1, y1, z1) {
    this.colisiones.push(new THREE.Box3(new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x1, y1, z1)));
  }

  // ---------- El edificio ----------
  armar() {
    if (this.grupo) return;
    this.grupo = new THREE.Group();
    this.escena.add(this.grupo);
    const rnd = aleatorio(666);
    const c = new Constructor();
    const mats = {
      liso: new THREE.MeshLambertMaterial({ vertexColors: true }),
      luz: new THREE.MeshBasicMaterial({ vertexColors: true }),
      blanca: new THREE.MeshLambertMaterial({ vertexColors: true, map: texPared('#e9e6df') }),
      celeste: new THREE.MeshLambertMaterial({ vertexColors: true, map: texPared('#5fb7d8') }),
      gris: new THREE.MeshLambertMaterial({ vertexColors: true, map: texPared('#c9ccd0') }),
      piedra: new THREE.MeshLambertMaterial({ vertexColors: true, map: texPiedra() }),
    };
    this.matReja = new THREE.MeshLambertMaterial({ map: texReja(), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
    // El piso: pasto seco afuera, tierra en el patio, cemento sucio adentro; el camino de entrada.
    c.piso(CC.x0 - 30, CC.z0 - 30, CC.x1 + 30, CC.z1 + 20, 0.04, '#7b8a4e');
    c.piso(CC.x0 + 8, CC.z0 + 8, CC.x1 - 8, CC.z1 - 8, 0.06, '#8d8a80');
    c.piso(PATIO.x0, PATIO.z0, PATIO.x1, PATIO.z1, 0.08, '#8a6f52');
    c.piso(CC.entrada - 5, CC.z1, CC.entrada + 5, AU.z - AU.medioAncho, 0.07, '#5a5c60');
    for (let i = 0; i < 40; i++) {
      const x = PATIO.x0 + rnd() * (PATIO.x1 - PATIO.x0);
      const z = PATIO.z0 + rnd() * (PATIO.z1 - PATIO.z0);
      c.piso(x, z, x + 3 + rnd() * 6, z + 2 + rnd() * 5, 0.09, rnd() < 0.5 ? '#76603f' : '#6f7d47'); // manchones
    }
    this.alambrados(c, rnd);
    this.torres(c);
    this.modulo(c, rnd);
    this.comedor(c, rnd);
    this.banos(c, rnd);
    this.patio(c, rnd);
    this.visitas(c);
    // Basura por todos lados (papeles, botellas, bolsas), como en las fotos.
    const basura = ['#f2f2ee', '#d8d4c8', '#2b6cb0', '#3a3d40', '#9c4f3a'];
    for (let i = 0; i < 160; i++) {
      const x = CC.x0 + 12 + rnd() * (W - 24);
      const z = CC.z0 + 12 + rnd() * (CC.z1 - CC.z0 - 30);
      const t = 0.15 + rnd() * 0.35;
      c.caja(x - t, 0.08, z - t * 0.7, x + t, 0.08 + t * 0.4, z + t * 0.7, basura[i % basura.length]);
    }
    this.grupo.add(c.armar(mats));
    // Los carteles, pintados sobre la pared (pegados, como en las fotos): MODULO 4 en la franja azul
    // de la fachada, INR M4 en la torre, A1 1-10 arriba de la reja del pabellón y el de la garita.
    const pintado = (t, w, h, x, y, z, ry = 0) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
      m.position.set(x, y, z);
      m.rotation.y = ry;
      this.grupo.add(m);
    };
    const xm = (MOD.x0 + MOD.x1) / 2;
    pintado(texCartel('MODULO 4', null, '#f4f4f0'), 26, 6.5, xm - 32, H - 3.2, PAB_B.z1 + 0.46);
    pintado(texCartel('INR', 'M 4'), 6.5, 3.2, xm - 9, H * PISOS + 3, PAB_B.z1 + 6.06);
    pintado(texCartel('A1  1-10'), 7, 1.8, MOD.x1 + 1.06, H + 1.6, (PATIO_INT.z0 + PATIO_INT.z1) / 2, Math.PI / 2);
    pintado(texCartel('C.O.M.C.A.R.', 'INR'), 4.6, 1.15, CC.entrada + 10.5, 3, CC.z1 + 7.06);
    this.reja = (x0, z0, x1, z1, y0, y1) => this.grupo.add(reja(this.matReja, x0, z0, x1, z1, y0, y1));
    this.rejas();
    // La gente aparece recién cuando abre la costa (antes, la cárcel se ve vacía).
    this.rnd = rnd;
  }

  // Doble alambrado con postes de material inclinados y concertina arriba; el portón de entrada.
  alambrados(c, rnd) {
    const malla = new THREE.MeshBasicMaterial({ map: texAlambrado(), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide });
    const tramo = (x0, z0, x1, z1, alto) => {
      const largo = Math.hypot(x1 - x0, z1 - z0);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(largo, alto), malla);
      m.position.set((x0 + x1) / 2, alto / 2, (z0 + z1) / 2);
      m.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
      m.material.map.repeat.set(largo / 1.6, alto / 1.6);
      this.grupo.add(m);
      for (let k = 0; k <= largo; k += 6) {
        const px = x0 + ((x1 - x0) * k) / largo;
        const pz = z0 + ((z1 - z0) * k) / largo;
        c.caja(px - 0.22, 0, pz - 0.22, px + 0.22, alto + 1.4, pz + 0.22, '#c9c6bd');
      }
      this.solido(Math.min(x0, x1) - 0.3, 0, Math.min(z0, z1) - 0.3, Math.max(x0, x1) + 0.3, alto, Math.max(z0, z1) + 0.3);
    };
    const anillo = (x0, z0, x1, z1, alto, hueco) => {
      tramo(x0, z0, x1, z0, alto);
      tramo(x1, z0, x1, z1, alto);
      tramo(x0, z0, x0, z1, alto);
      if (hueco) { tramo(x0, z1, hueco[0], z1, alto); tramo(hueco[1], z1, x1, z1, alto); } else tramo(x0, z1, x1, z1, alto);
    };
    anillo(CC.x0, CC.z0, CC.x1, CC.z1, 5.5, [CC.entrada - 6, CC.entrada + 6]);
    anillo(CC.x0 + 6, CC.z0 + 6, CC.x1 - 6, VIS.z0, 5, [VIS.x0, VIS.x1]);
    // La concertina: espirales sobre el alambrado de afuera (una malla instanciada).
    const espiras = [];
    const per = [[CC.x0, CC.z0, CC.x1, CC.z0], [CC.x1, CC.z0, CC.x1, CC.z1], [CC.x0, CC.z1, CC.x0, CC.z0], [CC.x0, CC.z1, CC.entrada - 6, CC.z1], [CC.entrada + 6, CC.z1, CC.x1, CC.z1]];
    for (const [x0, z0, x1, z1] of per) {
      const largo = Math.hypot(x1 - x0, z1 - z0);
      for (let k = 0; k < largo; k += 0.9) espiras.push([x0 + ((x1 - x0) * k) / largo, z0 + ((z1 - z0) * k) / largo, Math.atan2(z1 - z0, x1 - x0)]);
    }
    const im = new THREE.InstancedMesh(new THREE.TorusGeometry(0.55, 0.035, 4, 12), new THREE.MeshLambertMaterial({ color: '#b8bcc0' }), espiras.length);
    const o = new THREE.Object3D();
    espiras.forEach(([x, z, a], i) => { o.position.set(x, 6.3, z); o.rotation.set(0, -a + Math.PI / 2, 0.3); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
    this.grupo.add(im);
    // El portón (dos hojas de rejas abiertas) y la garita.
    for (const s of [-1, 1]) for (let k = 0; k < 8; k++) c.caja(CC.entrada + s * (6 + k * 0.7) - 0.05, 0, CC.z1 - 0.05, CC.entrada + s * (6 + k * 0.7) + 0.05, 5, CC.z1 + 0.05, '#2b3a4a');
    c.caja(CC.entrada + 8, 0, CC.z1 + 2, CC.entrada + 13, 4, CC.z1 + 7, '#e9e6df', { lados: 'blanca' });
    c.caja(CC.entrada + 7.6, 4, CC.z1 + 1.6, CC.entrada + 13.4, 4.4, CC.z1 + 7.4, '#3a5f8a');
    this.solido(CC.entrada + 8, 0, CC.z1 + 2, CC.entrada + 13, 4, CC.z1 + 7);
  }

  // Torres de vigilancia en las esquinas (de material blanco, como las de la foto).
  // Torres de vigilancia de piedra (como la imagen de referencia), más altas, y el mástil con la
  // bandera de Uruguay en la entrada.
  torres(c) {
    for (const [x, z] of [[CC.x0 + 3, CC.z0 + 3], [CC.x1 - 3, CC.z0 + 3], [CC.x0 + 3, CC.z1 - 3], [CC.x1 - 3, CC.z1 - 3]]) {
      c.caja(x - 3, 0, z - 3, x + 3, 22, z + 3, '#ffffff', { lados: 'piedra' });
      c.caja(x - 3.8, 22, z - 3.8, x + 3.8, 22.6, z + 3.8, '#8e8a84');
      for (const [a, b] of [[-3.6, -3.4], [3.4, 3.6]]) { c.caja(x + a, 22.6, z - 3.6, x + b, 26, z - 3.4, '#5a5c60'); c.caja(x + a, 22.6, z + 3.4, x + b, 26, z + 3.6, '#5a5c60'); }
      c.caja(x - 3.6, 22.6, z - 3.6, x + 3.6, 23.8, z + 3.6, '#8e8a84'); // pretil
      c.caja(x - 4.2, 26, z - 4.2, x + 4.2, 26.6, z + 4.2, '#3a3d40'); // techo
      c.caja(x - 0.3, 26.6, z - 0.3, x + 0.3, 27.4, z + 0.3, '#ffe8a0', { lados: 'luz' }); // reflector
      this.solido(x - 3, 0, z - 3, x + 3, 22, z + 3);
    }
    // Mástil y bandera (franjas blancas y celestes, el sol en el cuadrado de arriba).
    const mx = CC.entrada - 14;
    const mz = CC.z1 + 6;
    c.cil(0.15, 0.2, 16, '#d8d8d8', mx, 0, mz, 6);
    for (let k = 0; k < 9; k++) c.caja(mx + 0.2, 15.8 - k * 0.5, mz - 0.03, mx + 6.2, 16.3 - k * 0.5, mz + 0.03, k % 2 ? '#2f7bd6' : '#ffffff');
    c.caja(mx + 0.2, 13.8, mz - 0.04, mx + 2.4, 16.3, mz + 0.04, '#ffffff');
    c.cil(0.6, 0.6, 0.1, '#f2c12e', mx + 1.3, 15, mz + 0.05, 12);
  }

  // El Módulo 4: los dos pabellones de 3 pisos enfrentados (celdas, galerías y losas), el patio
  // interno con el charco, la fachada del pabellón B que da al patio grande (abajo azul, arriba
  // blanco con ventanas y dos torres, como la foto) y las celdas de tu piso por dentro (como en el
  // Roblox: paredes grises, cama, inodoro, pileta y la reja). Las rejas: rejas() (planos con textura).
  modulo(c, rnd) {
    const { x0, x1, z0, z1, galeria } = MOD;
    const alto = H * PISOS;
    const zc = z1 - galeria; // frente de las celdas del A
    const bc = PAB_B.z0 + galeria; // frente de las celdas del B
    // Pabellón A: pared de atrás, los costados, losas y techo; las galerías con su baranda.
    c.caja(x0, 0, z0, x1, alto, z0 + 0.6, '#e9e6df', { lados: 'blanca' });
    c.caja(x0, 0, z0, x0 + 0.6, alto, z1, '#e9e6df', { lados: 'blanca' });
    c.caja(x1 - 0.6, 0, z0, x1, alto, z1, '#e9e6df', { lados: 'blanca' });
    this.solido(x0, 0, z0, x1, alto, z0 + 0.6);
    this.solido(x0, 0, z0, x0 + 0.6, alto, z1);
    this.solido(x1 - 0.6, 0, z0, x1, alto, z1 - 3.5);
    for (let p = 1; p <= PISOS; p++) c.caja(x0, H * p - 0.4, z0, x1, H * p, z1, '#b9b5ac', { abajo: true });
    c.caja(x0 - 0.4, alto, z0 - 0.4, x1 + 0.4, alto + 0.8, z1 + 0.4, '#e9e6df', { lados: 'blanca' });
    // Pabellón B (macizo: no se entra) con su techo.
    c.caja(x0, 0, PAB_B.z0, x1, alto, PAB_B.z1, '#e9e6df', { lados: 'blanca' });
    c.caja(x0 - 0.4, alto, PAB_B.z0 - 0.4, x1 + 0.4, alto + 0.8, PAB_B.z1 + 0.4, '#e9e6df', { lados: 'blanca' });
    this.solido(x0, 0, PAB_B.z0, x1, alto, PAB_B.z1);
    // Frentes de celdas de los pisos de arriba del A y de todo el B: abajo celeste, arriba blanco,
    // puertas de chapa gris con la mirilla (como la foto del pasillo).
    const frente = (z, s, desdePiso) => {
      for (let p = desdePiso; p < PISOS; p++) {
        const y = H * p;
        c.caja(x0, y, z - 0.3, x1, y + H * 0.45, z + 0.3, '#5fb7d8', { lados: 'celeste' });
        c.caja(x0, y + H * 0.45, z - 0.3, x1, y + H - 0.4, z + 0.3, '#e9e6df', { lados: 'blanca' });
        for (let n = 0; n < N_CELDAS; n++) {
          const dx = x0 + 2 + n * CELDA + 3;
          c.caja(dx, y + 0.1, z + s * 0.32, dx + 3.6, y + 5.8, z + s * 0.36, '#6b7078');
          c.caja(dx + 1.2, y + 3.8, z + s * 0.37, dx + 2.4, y + 4.6, z + s * 0.39, '#1b1e22');
        }
      }
    };
    frente(zc, 1, 1);
    frente(bc, -1, 0);
    // Las galerías: el pasillo de cada piso con su borde.
    for (let p = 1; p < PISOS; p++) {
      c.caja(x0, H * p - 0.4, PAB_B.z0, x1, H * p, bc, '#b9b5ac', { abajo: true });
      c.caja(x0, H * p, z1 - 0.3, x1, H * p + 1.1, z1, '#b9b5ac');
      c.caja(x0, H * p, PAB_B.z0, x1, H * p + 1.1, PAB_B.z0 + 0.3, '#b9b5ac');
    }
    // Columnas de las galerías.
    for (let x = x0; x <= x1; x += 15) for (const z of [z1 - 0.3, PAB_B.z0]) c.caja(x - 0.4, 0, z, x + 0.4, alto, z + 0.3, '#d8d4c8');
    // Patio interno: cemento gastado, el charco largo en el medio y basura; la pared del oeste.
    c.piso(x0, PATIO_INT.z0, x1 + 6, PATIO_INT.z1, 0.09, '#9a968c');
    c.piso(x0 + 6, (PATIO_INT.z0 + PATIO_INT.z1) / 2 - 1.4, x1 - 20, (PATIO_INT.z0 + PATIO_INT.z1) / 2 + 1.6, 0.1, '#5e6560');
    c.caja(x0 - 0.6, 0, PATIO_INT.z0, x0, alto, PATIO_INT.z1, '#e9e6df', { lados: 'blanca' });
    this.solido(x0 - 0.6, 0, PATIO_INT.z0, x0, alto, PATIO_INT.z1);
    // Al este, el muro con la reja de entrada (el cartel A1 arriba).
    c.caja(x1, 0, PATIO_INT.z0, x1 + 1, H * 2, PATIO_INT.z0 + 5, '#e9e6df', { lados: 'blanca' });
    c.caja(x1, 0, PATIO_INT.z1 - 5, x1 + 1, H * 2, PATIO_INT.z1, '#e9e6df', { lados: 'blanca' });
    c.caja(x1, H + 0.2, PATIO_INT.z0 + 5, x1 + 1, H * 2, PATIO_INT.z1 - 5, '#e9e6df', { lados: 'blanca' });
    this.solido(x1, 0, PATIO_INT.z0, x1 + 1, H * 2, PATIO_INT.z0 + 5);
    this.solido(x1, 0, PATIO_INT.z1 - 5, x1 + 1, H * 2, PATIO_INT.z1);
    // Tus celdas por dentro (planta baja del A): paredes grises, cama azul, inodoro, pileta, ventana.
    for (let n = 0; n < N_CELDAS; n++) {
      const k = celda(n);
      c.caja(k.x1, 0, z0, k.x1 + 0.6, H, zc, '#c9ccd0', { lados: 'gris' });
      this.solido(k.x1, 0, z0, k.x1 + 0.6, H, zc);
      c.caja(k.x0, 0, zc - 0.3, k.x0 + 3, H, zc + 0.3, '#5fb7d8', { lados: 'celeste' });
      c.caja(k.x0 + 7, 0, zc - 0.3, k.x1, H, zc + 0.3, '#5fb7d8', { lados: 'celeste' });
      c.caja(k.x0 + 3, 6.1, zc - 0.3, k.x0 + 7, H, zc + 0.3, '#5fb7d8', { lados: 'celeste' });
      this.solido(k.x0, 0, zc - 0.3, k.x0 + 3, H, zc + 0.3);
      this.solido(k.x0 + 7, 0, zc - 0.3, k.x1, H, zc + 0.3);
      c.caja(k.x0 + 2.9, 0, zc - 0.35, k.x0 + 3.1, 6.1, zc + 0.35, '#2f3b47'); // marco de la reja
      c.caja(k.x0 + 6.9, 0, zc - 0.35, k.x0 + 7.1, 6.1, zc + 0.35, '#2f3b47');
      c.caja(k.x0 + 2.9, 5.9, zc - 0.35, k.x0 + 7.1, 6.1, zc + 0.35, '#2f3b47');
      c.caja(k.x0 + 0.5, 0, k.z0 + 0.5, k.x0 + 3.2, 1.3, k.z0 + 6.5, '#9aa0a6'); // cama
      c.caja(k.x0 + 0.6, 1.3, k.z0 + 0.6, k.x0 + 3.1, 1.6, k.z0 + 6.4, ['#3f6fb0', '#4a5a6a', '#6d5a42'][n % 3]);
      c.caja(k.x0 + 0.7, 1.6, k.z0 + 0.7, k.x0 + 3, 1.9, k.z0 + 1.8, '#e8e6e0'); // almohada
      c.cil(0.55, 0.5, 1.1, '#f2f2f2', k.x1 - 1.6, 0, k.z0 + 1.8, 10); // inodoro
      c.caja(k.x1 - 2.2, 1.1, k.z0 + 0.7, k.x1 - 1, 2.4, k.z0 + 1, '#f2f2f2');
      c.caja(k.x1 - 2.4, 2.4, k.z0 + 4, k.x1 - 0.7, 2.8, k.z0 + 6, '#f2f2f2'); // pileta
      c.caja(k.x1 - 1.9, 0, k.z0 + 4.6, k.x1 - 1.2, 2.4, k.z0 + 5.4, '#e2e2e2');
      c.caja(k.x0 + 3.5, 5, z0 + 0.62, k.x0 + 6.5, 6.5, z0 + 0.7, '#f2f6ff', { lados: 'luz' }); // ventanita
      c.piso(k.x0 + 3.6, k.z0 + 3.6, k.x0 + 6 + rnd() * 2, k.z0 + 6 + rnd() * 2, 0.1, '#7a7a6c'); // charco
      this.solido(k.x0 + 0.5, 0, k.z0 + 0.5, k.x0 + 3.2, 1.9, k.z0 + 6.5);
    }
    // La fachada (cara sur del B, que da al patio grande): abajo ladrillo azul, arriba blanco con
    // las ventanas en fila y, en el medio, las dos torres blancas.
    const fz = PAB_B.z1;
    c.caja(x0, 0, fz, x1, H, fz + 0.4, '#3f6fb8', { lados: 'celeste' });
    c.caja(x0, H, fz, x1, alto, fz + 0.4, '#e9e6df', { lados: 'blanca' });
    for (let p = 1; p < PISOS; p++) for (let x = x0 + 4; x < x1 - 4; x += 6) c.caja(x, H * p + 2, fz + 0.4, x + 2.6, H * p + 5.4, fz + 0.5, '#2a2e33');
    const xm = (x0 + x1) / 2;
    for (const dx of [-9, 9]) {
      c.caja(xm + dx - 4, 0, fz, xm + dx + 4, alto + 8, fz + 6, '#f2f0ea', { lados: 'blanca' });
      c.caja(xm + dx - 4.3, alto + 8, fz - 0.3, xm + dx + 4.3, alto + 8.6, fz + 6.3, '#d8d4c8');
      this.solido(xm + dx - 4, 0, fz, xm + dx + 4, alto + 8, fz + 6);
    }
    c.caja(xm - 5, 0, fz + 0.4, xm + 5, H, fz + 6, '#3f6fb8', { lados: 'celeste' }); // el cuerpo de entrada
    c.caja(xm - 2.5, 0.1, fz + 6, xm + 2.5, 6, fz + 6.1, '#2a2e33'); // la puerta
    c.caja(xm - 6, H, fz - 0.2, xm + 6, H + 0.6, fz + 7, '#d8d4c8'); // alero
    this.solido(xm - 5, 0, fz, xm + 5, H, fz + 6);
    // Ropa colgada en las galerías y manchas de humedad.
    for (let i = 0; i < 40; i++) {
      const lado = i % 2;
      const z = lado ? z1 + 0.25 : PAB_B.z0 - 0.25;
      const p = 1 + (i % PISOS);
      const x = x0 + 3 + rnd() * (x1 - x0 - 6);
      c.caja(x, H * p - 3.2 + rnd(), z - 0.05, x + 0.9 + rnd() * 1.2, H * p - 1 + rnd(), z + 0.05, ['#f2f2ee', '#c0392b', '#2b6cb0', '#d4b06a', '#3a3d40', '#f07c18'][i % 6]);
    }
    for (let i = 0; i < 18; i++) { const x = x0 + rnd() * (x1 - x0); c.caja(x, alto - 5, fz + 0.41, x + 3 + rnd() * 6, alto - 0.5, fz + 0.45, '#a8a49a'); }
  }

  // Las rejas (planos con la misma textura): las galerías de los dos pabellones de arriba a abajo
  // (abajo, con la puerta del pabellón A al este), las puertas de las celdas abiertas contra la
  // pared y la reja de entrada al pabellón.
  rejas() {
    const { x0, x1, z1, galeria } = MOD;
    const zc = z1 - galeria;
    const alto = H * PISOS;
    this.reja(x0, z1 - 0.15, x1 - 10, z1 - 0.15, 0, alto);
    this.reja(x1 - 10, z1 - 0.15, x1, z1 - 0.15, H, alto);
    this.reja(x0, PAB_B.z0 + 0.15, x1, PAB_B.z0 + 0.15, 0, alto);
    this.solido(x0, 0, z1 - 0.4, x1 - 10, H, z1 + 0.1);
    for (let n = 0; n < N_CELDAS; n++) { const k = celda(n); this.reja(k.x0 + 7.1, zc + 0.45, k.x0 + 11, zc + 0.45, 0, 5.9); } // abiertas, contra el frente
    this.reja(x1 + 1, PATIO_INT.z0 + 5, x1 + 8, PATIO_INT.z0 + 5, 0, H); // la reja de entrada, abierta contra el muro
  }

  comedor(c, rnd) {
    const { x0, x1, z0, z1 } = COM;
    c.caja(x0, 0, z0, x1, 7, z0 + 0.5, '#e9e6df', { lados: 'blanca' });
    c.caja(x0, 0, z0, x0 + 0.5, 7, z1, '#e9e6df', { lados: 'blanca' });
    c.caja(x1 - 0.5, 0, z0, x1, 7, z1, '#e9e6df', { lados: 'blanca' });
    c.caja(x0, 0, z1 - 0.5, (x0 + x1) / 2 - 4, 7, z1, '#5fb7d8', { lados: 'celeste' });
    c.caja((x0 + x1) / 2 + 4, 0, z1 - 0.5, x1, 7, z1, '#5fb7d8', { lados: 'celeste' });
    c.caja(x0 - 0.3, 7, z0 - 0.3, x1 + 0.3, 7.5, z1 + 0.3, '#cfcbc2', { abajo: true });
    for (const b of [[x0, z0, x1, z0 + 0.5], [x0, z0, x0 + 0.5, z1], [x1 - 0.5, z0, x1, z1], [x0, z1 - 0.5, (x0 + x1) / 2 - 4, z1], [(x0 + x1) / 2 + 4, z1 - 0.5, x1, z1]]) this.solido(b[0], 0, b[1], b[2], 7, b[3]);
    // Mesas largas de material con bancos, bandejas y el mostrador de la comida.
    for (let m = 0; m < 4; m++) {
      const zm = z0 + 10 + m * 7.5;
      c.caja(x0 + 8, 0, zm - 1, x1 - 8, 2.2, zm + 1, '#b8b4aa');
      for (const s of [-1, 1]) c.caja(x0 + 8, 0, zm + s * 2.2 - 0.4, x1 - 8, 1.3, zm + s * 2.2 + 0.4, '#a8a49a');
      for (let k = 0; k < 10; k++) c.caja(x0 + 10 + k * 6 + rnd(), 2.2, zm - 0.6, x0 + 11.6 + k * 6, 2.35, zm + 0.2, '#9aa2aa');
      this.solido(x0 + 8, 0, zm - 1, x1 - 8, 2.2, zm + 1);
    }
    c.caja(x0 + 4, 0, z0 + 1, x1 - 4, 3, z0 + 4, '#c9ccd0');
    for (let k = 0; k < 5; k++) c.cil(1, 1, 1.4, '#8a8f96', x0 + 12 + k * 12, 3, z0 + 2.5, 10);
    this.solido(x0 + 4, 0, z0 + 1, x1 - 4, 3, z0 + 4);
  }

  banos(c, rnd) {
    const { x0, x1, z0, z1 } = BAN;
    c.caja(x0, 0, z0, x1, 6.5, z0 + 0.5, '#d8d4c8', { lados: 'blanca' });
    c.caja(x0, 0, z0, x0 + 0.5, 6.5, z1, '#d8d4c8', { lados: 'blanca' });
    c.caja(x1 - 0.5, 0, z0, x1, 6.5, z1, '#d8d4c8', { lados: 'blanca' });
    c.caja(x0, 0, z1 - 0.5, (x0 + x1) / 2 - 3, 6.5, z1, '#5fb7d8', { lados: 'celeste' });
    c.caja((x0 + x1) / 2 + 3, 0, z1 - 0.5, x1, 6.5, z1, '#5fb7d8', { lados: 'celeste' });
    c.caja(x0 - 0.3, 6.5, z0 - 0.3, x1 + 0.3, 7, z1 + 0.3, '#cfcbc2', { abajo: true });
    for (const b of [[x0, z0, x1, z0 + 0.5], [x0, z0, x0 + 0.5, z1], [x1 - 0.5, z0, x1, z1], [x0, z1 - 0.5, (x0 + x1) / 2 - 3, z1], [(x0 + x1) / 2 + 3, z1 - 0.5, x1, z1]]) this.solido(b[0], 0, b[1], b[2], 6.5, b[3]);
    // Cinco letrinas con medio tabique, duchas (caños y la flor) y charcos por todos lados.
    this.inodoros = [];
    for (let k = 0; k < 5; k++) {
      const x = x0 + 5 + k * 10;
      c.caja(x + 4, 0, z0 + 0.5, x + 4.3, 3.6, z0 + 7, '#bdb8ac');
      c.cil(0.6, 0.6, 1.1, '#e2ded4', x, 0, z0 + 2.5, 10);
      c.caja(x - 0.8, 1.1, z0 + 1.2, x + 0.8, 2.6, z0 + 1.6, '#e2ded4');
      this.inodoros.push({ x, z: z0 + 3.5 });
      c.caja(x - 0.05, 0, z1 - 8, x + 0.05, 5.5, z1 - 7.9, '#8a8f96');
      c.cil(0.45, 0.2, 0.2, '#8a8f96', x, 5.3, z1 - 7.4, 8);
      c.piso(x - 2 - rnd(), z0 + 4 + rnd() * 6, x + 2 + rnd() * 2, z0 + 9 + rnd() * 6, 0.1, '#5f6658');
    }
  }

  patio(c, rnd) {
    // Arcos de fútbol de caño, un aro de básquet torcido, bancos de material y una soga con ropa.
    for (const x of [PATIO.x0 + 10, PATIO.x1 - 10]) {
      for (const dz of [-4, 4]) c.caja(x - 0.12, 0, (PATIO.z0 + PATIO.z1) / 2 + dz - 0.12, x + 0.12, 3, (PATIO.z0 + PATIO.z1) / 2 + dz + 0.12, '#d8d8d8');
      c.caja(x - 0.12, 2.9, (PATIO.z0 + PATIO.z1) / 2 - 4, x + 0.12, 3.1, (PATIO.z0 + PATIO.z1) / 2 + 4, '#d8d8d8');
    }
    c.caja(PATIO.x1 - 60, 0, PATIO.z0 + 2, PATIO.x1 - 59.6, 7, PATIO.z0 + 2.4, '#4a4d50');
    c.caja(PATIO.x1 - 61.2, 6, PATIO.z0 + 2.4, PATIO.x1 - 58.4, 7.8, PATIO.z0 + 2.6, '#e9e6df');
    for (let k = 0; k < 8; k++) {
      const x = PATIO.x0 + 20 + k * 38;
      const z = k % 2 ? PATIO.z0 + 4 : PATIO.z1 - 4;
      c.caja(x - 3, 0, z - 0.6, x + 3, 1.2, z + 0.6, '#a8a49a');
      this.solido(x - 3, 0, z - 0.6, x + 3, 1.2, z + 0.6);
    }
    for (let k = 0; k < 10; k++) c.caja(PATIO.x0 + 120 + k * 1.6, 1.6, PATIO.z0 + 30, PATIO.x0 + 121 + k * 1.6, 2.6, PATIO.z0 + 30.1, ['#f2f2ee', '#f07c18', '#2b6cb0'][k % 3]);
    c.caja(PATIO.x0 + 118, 2.6, PATIO.z0 + 29.95, PATIO.x0 + 138, 2.65, PATIO.z0 + 30.15, '#d8d8d8');
  }

  // La sala de visitas: del lado de afuera (sur) se entra desde el portón; del de adentro, el preso.
  // En el medio, el mostrador con rejas hasta el techo: se ven y se hablan, pero no se cruza.
  visitas(c) {
    const { x0, x1, z0, z1, rejas } = VIS;
    c.caja(x0, 0, z0, x1, 6, z0 + 0.5, '#e9e6df', { lados: 'blanca' });
    c.caja(x0, 0, z0, x0 + 0.5, 6, z1, '#e9e6df', { lados: 'blanca' });
    c.caja(x1 - 0.5, 0, z0, x1, 6, z1, '#e9e6df', { lados: 'blanca' });
    c.caja(x0, 0, z1 - 0.5, (x0 + x1) / 2 - 3, 6, z1, '#e9e6df', { lados: 'blanca' });
    c.caja((x0 + x1) / 2 + 3, 0, z1 - 0.5, x1, 6, z1, '#e9e6df', { lados: 'blanca' });
    c.caja(x0 - 0.3, 6, z0 - 0.3, x1 + 0.3, 6.5, z1 + 0.3, '#cfcbc2', { abajo: true });
    c.caja(x0 + 2, 0, z0 - 0.6, x0 + 6, 5, z0 + 0.6, '#3a4a5a'); // la puerta del lado de adentro (reja)
    for (const b of [[x0, z0, x0 + 2, z0 + 0.5], [x0 + 6, z0, x1, z0 + 0.5], [x0, z0, x0 + 0.5, z1], [x1 - 0.5, z0, x1, z1], [x0, z1 - 0.5, (x0 + x1) / 2 - 3, z1], [(x0 + x1) / 2 + 3, z1 - 0.5, x1, z1]]) this.solido(b[0], 0, b[1], b[2], 6, b[3]);
    c.caja(x0 + 0.5, 0, rejas - 0.6, x1 - 0.5, 1.4, rejas + 0.6, '#b8b4aa');
    for (let x = x0 + 0.8; x < x1 - 0.6; x += 0.45) c.caja(x - 0.04, 1.4, rejas - 0.04, x + 0.04, 6, rejas + 0.04, '#3a4a5a');
    for (let k = 0; k < 4; k++) {
      const x = x0 + 6 + k * 10;
      for (const s of [-1, 1]) c.cil(0.45, 0.45, 1, '#8a8f96', x, 0, rejas + s * 2, 8); // los banquitos
    }
    this.solido(x0 + 0.5, 0, rejas - 0.6, x1 - 0.5, 6, rejas + 0.6);
    this.sillas = Array.from({ length: 4 }, (_, k) => ({ x: x0 + 6 + k * 10, zPreso: rejas - 2, zVisita: rejas + 2 }));
  }

  // ---------- La gente ----------
  async persona(p, x, z, a, extra, y = 0.05) {
    const cab = await cargarCabeza(p);
    if (p.sinFoto && !cab.dibujada) { dibujarCara(cab.frente, p.piel, p.pelo); cab.dibujada = true; }
    const m = crearPersonaje(p, cab);
    m.grupo.position.set(x, y, z);
    m.grupo.rotation.y = a;
    extra?.(m);
    this.grupo.add(m.grupo);
    return m;
  }

  async poblar(rnd) {
    const pieles = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#a86b45'];
    // Presos: mameluco naranja y esposas (las manos juntas adelante). Unos caminan el patio,
    // otros en las celdas, en el comedor o contra la reja.
    for (let n = 0; n < 34; n++) {
      const p = { id: `preso${n % 6}`, nombre: ' ', sinFoto: true, sinCara: true, piel: pieles[n % pieles.length], pelo: ['#151010', '#3e2723', '#2b2b2b'][n % 3], peinado: n % 3 ? 'liso' : 'rapado', remera: '#f07c18', pantalon: '#f07c18', mangasLargas: true, cuerpo: n % 9 === 0 ? 'gordo' : undefined };
      let x, z;
      const lugar = n < 16 ? 'patio' : n < 22 ? 'celda' : n < 26 ? 'comedor' : 'galeria';
      let y = 0.05;
      if (lugar === 'patio') { x = PATIO.x0 + 10 + rnd() * (PATIO.x1 - PATIO.x0 - 20); z = PATIO.z0 + 6 + rnd() * (PATIO.z1 - PATIO.z0 - 12); }
      else if (lugar === 'celda') { const k = celda((n * 3) % N_CELDAS === TU_CELDA || (n * 3) % N_CELDAS === SU_CELDA ? 1 : (n * 3) % N_CELDAS); x = k.x0 + 5; z = k.z0 + 5 + rnd() * 3; }
      else if (lugar === 'comedor') { x = COM.x0 + 14 + rnd() * 50; z = COM.z0 + 12.2 + (n % 4) * 7.5; }
      else { const piso = 1 + (n % 2); y = H * piso + 0.05; x = MOD.x0 + 10 + rnd() * 150; z = n % 4 < 2 ? MOD.z1 - 2 : PAB_B.z0 + 2; } // en las galerías de arriba, contra la reja
      const m = await this.persona(p, x, z, rnd() * 6, (mm) => {
        // Las esposas: un aro en cada muñeca y la cadenita entre las dos.
        for (const b of [mm.partes.brazoI, mm.partes.brazoD]) {
          const aro = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.07, 6, 12).rotateX(Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#b8bcc0' }));
          aro.position.y = -0.85;
          b.codo.add(aro);
        }
        const cadena = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.08), new THREE.MeshLambertMaterial({ color: '#9aa0a6' }));
        cadena.position.set(-0.5, -0.88, 0.25);
        mm.partes.brazoD.codo.add(cadena);
      }, y);
      this.gente.push({ m, preso: true, camina: lugar === 'patio', dest: null, vel: 2.4 + rnd() * 1.4 });
    }
    // Guardias: uniforme azul, gorra, algunos con escopeta. Uno en cada lugar y el de la reja.
    const G = { id: 'guardia', nombre: ' ', sinFoto: true, sinCara: true, piel: '#e0ac69', pelo: '#2b2b2b', peinado: 'rapado', remera: '#1f2a44', pantalon: '#1b2233', mangasLargas: true };
    const cabG = await cargarCabeza(G);
    if (!cabG.dibujada) { dibujarCara(cabG.frente, G.piel, G.pelo); cabG.dibujada = true; }
    this.caraGuardia = cabG.frente.toDataURL(); // para los diálogos (antes de que se vacíe)
    const puestos = [[GUARDIA_PUERTA.x, GUARDIA_PUERTA.z, -Math.PI / 2, false], [COM.x0 + 6, COM.z1 - 6, 0.5, false], [BAN.x1 - 6, BAN.z1 - 6, -0.5, false], [PATIO.x0 + 4, PATIO.z0 + 4, 0.8, true], [PATIO.x1 - 4, PATIO.z1 - 4, -2.4, true], [VIS.x1 - 3, VIS.z0 + 3, -1.6, false], [CC.entrada + 4, CC.z1 + 4, 0, true]];
    for (const [x, z, a, arma] of puestos) {
      const m = await this.persona(G, x, z, a, (mm) => {
        const gorra = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.32, 1.5), new THREE.MeshLambertMaterial({ color: '#141a2a' }));
        gorra.position.set(0, 0.8, 0.08);
        mm.partes.cabeza.add(gorra);
        if (arma) { const ak = crearAK(); ak.position.set(0, -1.9, 0); ak.rotation.x = Math.PI / 2; mm.manoD.add(ak); mm.apuntar = true; }
        else { const baston = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.6, 6), new THREE.MeshLambertMaterial({ color: '#111111' })); baston.position.set(0, -1.9, 0.5); baston.rotation.x = Math.PI / 2.4; mm.manoD.add(baston); }
      });
      this.gente.push({ m, guardia: true });
      if (x === GUARDIA_PUERTA.x) this.benitez = m;
    }
    // El Extravirgen (de naranja, sin esposas: tiene sus contactos).
    this.ev = await this.persona(EXTRAVIRGEN, PATIO.x0 + 60, PATIO.z0 + 8, 0);
    this.listo = true;
  }

  // ---------- Caer preso ----------
  async encarcelar(motivo) {
    this.armar();
    this.estado.carcel = { paso: 0, cig: 0, cuchara: false, tunel: 0, limpios: [], desde: this.estado.tiempoJugado || 0 };
    this.guardar();
    await this.fundido(`${motivo}<br><b>Te llevaron al C.O.M.C.A.R.</b>`, () => {
      this.alEncarcelar?.();
      const k = celda(TU_CELDA);
      this.jugador.pos.set(k.x0 + 5, 0.3, k.z0 + 5);
      this.jugador.vel.set(0, 0, 0);
    });
    this.ui.toast('Estás preso. Para salir, seguí el objetivo de arriba', 'error', 6000);
  }

  liberar(texto) {
    this.estado.carcel = null;
    this.guardar();
    this.alLiberar?.();
    this.ui.toast(texto, 'plata', 6000);
  }

  fundido(html, enMedio) {
    return new Promise((res) => {
      const d = document.createElement('div');
      d.className = 'carcel-fundido';
      d.innerHTML = `<p>${html}</p>`;
      document.body.appendChild(d);
      requestAnimationFrame(() => d.classList.add('visible'));
      setTimeout(() => { enMedio?.(); setTimeout(() => { d.classList.remove('visible'); setTimeout(() => { d.remove(); res(); }, 700); }, 1400); }, 900);
    });
  }

  // ---------- La vida adentro ----------
  // Lo que se puede hacer con la E acá adentro (o en la sala de visitas, de afuera).
  accion(jugador) {
    if (!this.preso || !this.grupo) return '';
    const p = jugador.pos;
    const c = this.c;
    const cerca = (x, z, r = 3.5) => Math.hypot(p.x - x, p.z - z) < r;
    const k = celda(TU_CELDA);
    if (c.paso === 0 && p.x > k.x0 && p.x < k.x1 && p.z < k.z1 && p.z > k.z0) return 'Tirarte en la cama (E)';
    if (c.paso === 1 && p.x > COM.x0 && p.x < COM.x1 && p.z > COM.z0 && p.z < COM.z1) return 'Comer la bandeja (E)';
    if (c.paso === 2 && this.ev && cerca(this.ev.grupo.position.x, this.ev.grupo.position.z, 4)) return 'Hablar con el Extravirgen (E)';
    if (c.paso === 3 && p.x > COM.x0 && p.x < COM.x1 && p.z > COM.z0 && p.z < COM.z1) return 'Manotear una cuchara (E)';
    if (c.paso === 4) { const i = this.inodoros?.findIndex((q, n) => !c.limpios.includes(n) && cerca(q.x, q.z, 3)); if (i >= 0) return 'Limpiar el inodoro (E)'; }
    if (this.benitez && cerca(GUARDIA_PUERTA.x, GUARDIA_PUERTA.z, 4)) return 'Hablar con el guardia Benítez (E)';
    if (c.paso === 6 && cerca(TUNEL.x, TUNEL.z, 3)) return 'Cavar con la cuchara (E)';
    if (c.paso === 7 && cerca(TUNEL.x, TUNEL.z, 3)) return 'Meterte en el túnel (E)';
    if (this.visita && cerca(this.visita.silla.x, this.visita.silla.zPreso, 3)) return `Hablar con ${this.visita.p.nombre} (E)`;
    return '';
  }

  async hacer(jugador) {
    const c = this.c;
    const t = this.accion(jugador);
    const noche = momento(this.hora()).noche > 0.5;
    const avanzar = (msj) => { c.paso++; this.guardar(); sfx.brillo(); if (msj) this.ui.toast(msj, 'info', 4500); };
    if (t.startsWith('Tirarte')) return avanzar('Llegaste. Paredes húmedas, colchón finito y olor a encierro. Así es acá.');
    if (t.startsWith('Comer')) return avanzar('Guiso frío y un pan duro. Por lo menos comiste');
    if (t.startsWith('Hablar con el Extravirgen')) {
      const cara = (await cargarCabeza(EXTRAVIRGEN)).frente.toDataURL();
      await this.decir(EXTRAVIRGEN.nombre, cara, ['¿Vos sos el nuevo? Te vi entrar. A mí me dicen el Extravirgen.', 'Yo de acá me voy, hermano. Tengo un plan y me falta alguien de confianza.', 'Primero conseguite una cuchara del comedor. Después vemos cómo hacemos con Benítez, el guardia: ese se compra con cigarrillos.']);
      return avanzar('Plan del Extravirgen: conseguir una cuchara');
    }
    if (t.startsWith('Manotear')) {
      const guardiaMira = Math.random() < 0.35;
      if (guardiaMira) { sfx.error(); this.ui.toast('¡Te vio el guardia! Disimulá y probá de nuevo en un rato', 'error'); return; }
      c.cuchara = true;
      return avanzar('Tenés la cuchara escondida en la manga');
    }
    if (t.startsWith('Limpiar')) {
      const i = this.inodoros.findIndex((q, n) => !c.limpios.includes(n) && Math.hypot(jugador.pos.x - q.x, jugador.pos.z - q.z) < 3);
      c.limpios.push(i);
      c.cig++;
      sfx.comer();
      this.ui.toast(`Limpiaste un inodoro asqueroso (+1 cigarrillo, tenés ${c.cig})`, 'info');
      if (c.limpios.length >= 5) avanzar('Juntaste 5 cigarrillos');
      else this.guardar();
      return;
    }
    if (t.startsWith('Hablar con el guardia')) return this.benitezHabla(avanzar);
    if (t.startsWith('Cavar')) {
      if (!noche) { this.ui.toast('De día te ven: cavá de noche', 'error'); return; }
      c.tunel = Math.min(100, c.tunel + 20);
      sfx.pesa();
      this.ui.toast(`Túnel: ${c.tunel}%`, 'info');
      if (c.tunel >= 100) avanzar('¡El túnel llega afuera del alambrado!');
      else this.guardar();
      return;
    }
    if (t.startsWith('Meterte')) {
      if (!noche) { this.ui.toast('Esperá a que sea de noche', 'error'); return; }
      return this.escapar();
    }
    if (t.startsWith('Hablar con') && this.visita) {
      const v = this.visita.p;
      const cara = (await cargarCabeza(v)).frente.toDataURL();
      await this.decir(v.nombre, cara, [['¡Ey! ¿Cómo estás acá adentro? Te traje unos alfajores, se los tuve que dar al guardia igual.', 'Aguantá, hermano. Afuera todos te extrañamos.', 'Che, ¿es verdad que acá adentro hay uno que le dicen el Extravirgen?'][Math.floor(Math.random() * 3)]]);
    }
  }

  async benitezHabla(avanzar) {
    const c = this.c;
    const cara = this.caraGuardia;
    const fianza = Math.max(5e10, Math.round(this.estado.plata * 0.3));
    const op = [];
    if (c.paso === 5) op.push(`Darle ${c.cig} cigarrillos`);
    op.push(`Sobornarlo con ${formato(fianza)} para salir ya`);
    op.push('Nada');
    const r = await this.decir('Guardia Benítez', cara, ['¿Qué querés, preso? Circulá.'], op);
    const elegido = op[r];
    if (!elegido || elegido === 'Nada') return;
    if (elegido.startsWith('Darle')) {
      await this.decir('Guardia Benítez', cara, ['…Mirá vos. Esta noche no hago la ronda del Módulo 4. Yo no vi nada, eh.']);
      return avanzar('Benítez no va a hacer la ronda de noche: a cavar el túnel en la celda del Extravirgen');
    }
    if (this.estado.plata < fianza) { await this.decir('Guardia Benítez', cara, ['Con eso no me alcanza ni para el bondi. Andá.']); return; }
    this.estado.plata -= fianza;
    await this.decir('Guardia Benítez', cara, ['Plata en mano… Seguime. Por la puerta de atrás y no te conozco.']);
    await this.fundido('Benítez te saca por la puerta de atrás…', () => { this.estado.carcel = null; this.ponerAfuera(); });
    this.liberar('Saliste del C.O.M.C.A.R. (sobornaste al guardia). El Extravirgen se quedó adentro');
  }
  // La fuga: por el túnel con el Extravirgen. Cada jugador preso se escapa por su cuenta (haciendo sus pasos).
  async escapar() {
    sfx.susto();
    await this.fundido('Te metés en el túnel con el Extravirgen…<br>Arrastrándose en el barro, por debajo del alambrado…', () => { this.estado.carcel = null; this.ponerAfuera(); });
    this.estado.extravirgenLibre = true;
    this.liberar('¡Te escapaste del C.O.M.C.A.R. con el Extravirgen!');
    const cara = (await cargarCabeza(EXTRAVIRGEN)).frente.toDataURL();
    await this.decir(EXTRAVIRGEN.nombre, cara, ['¡Estamos afuera, hermano! Te debo una.', 'Yo me voy a guardar en la Cachimba un tiempo. Cuando necesites algo, me buscás ahí.']);
  }

  ponerAfuera() { this.jugador.pos.set(SALIDA.x, 0.3, SALIDA.z); this.jugador.vel.set(0, 0, 0); }

  decir(nombre, cara, lineas, opciones = null) {
    this.pausar(true);
    return new Promise((res) => this.ui.dialogo({ nombre, cara: cara || '', remera: '#f07c18', lineas, opciones, alElegir: (i) => { this.pausar(false); res(i); }, alTerminar: () => { this.pausar(false); res(-1); } }));
  }

  // ---------- Cada cuadro ----------
  actualizar(dt, jugador) {
    const p = jugador.pos;
    const cerca = this.dentro(p, 250);
    if ((cerca || this.preso) && !this.grupo) this.armar();
    if (this.preso) {
      // Encerrado: no se sale de adentro (ni por la sala de visitas).
      p.x = THREE.MathUtils.clamp(p.x, ADENTRO.x0, ADENTRO.x1);
      p.z = THREE.MathUtils.clamp(p.z, ADENTRO.z0, ADENTRO.z1);
    }
    if (this.hud) this.hud.classList.toggle('oculto', !this.preso);
    if (!this.grupo) return;
    if (this.estado.costa && !this.poblando) { this.poblando = true; this.poblar(this.rnd); } // la gente, recién con la costa abierta
    this.grupo.visible = this.dentro(p, 700);
    if (!cerca && !this.preso) return;
    this.reloj += dt;
    const m = momento(this.hora());
    const r = rutina(m.noche, m.sol);
    // El Extravirgen: de día en el patio, de noche en su celda.
    if (this.ev) {
      const k = celda(SU_CELDA);
      const [ex, ez] = r.que === 'Celda' ? [k.x0 + 5, k.z0 + 5] : [PATIO.x0 + 60, PATIO.z0 + 8];
      this.ev.grupo.position.set(ex, 0.05, ez);
      this.ev.grupo.rotation.y = Math.atan2(p.x - ex, p.z - ez);
      this.ev.animar(dt, 0, true);
    }
    // Los presos del patio caminan de un lado al otro; todos con las manos esposadas adelante.
    for (const g of this.gente) {
      const mm = g.m;
      const d = Math.hypot(mm.grupo.position.x - p.x, mm.grupo.position.z - p.z);
      if (d > 160) continue;
      if (g.camina) {
        if (!g.dest || Math.hypot(g.dest[0] - mm.grupo.position.x, g.dest[1] - mm.grupo.position.z) < 1) g.dest = [PATIO.x0 + 8 + Math.random() * (PATIO.x1 - PATIO.x0 - 16), PATIO.z0 + 6 + Math.random() * (PATIO.z1 - PATIO.z0 - 12)];
        const dx = g.dest[0] - mm.grupo.position.x;
        const dz = g.dest[1] - mm.grupo.position.z;
        const l = Math.hypot(dx, dz);
        mm.grupo.position.x += (dx / l) * g.vel * dt;
        mm.grupo.position.z += (dz / l) * g.vel * dt;
        mm.grupo.rotation.y = Math.atan2(dx, dz);
        mm.animar(dt, g.vel, true);
      } else mm.animar(dt, 0, true);
      if (g.preso) {
        for (const [b, s] of [[mm.partes.brazoI, 1], [mm.partes.brazoD, -1]]) { b.rotation.set(-0.55, 0, s * 0.32); b.codo.rotation.x = -0.9; }
      }
    }
    // Las visitas: en horario de patio aparece alguno de los pibes del otro lado de la reja.
    if (this.preso && r.que === 'Patio' && !this.visita && this.sillas && (this.proxVisita = (this.proxVisita ?? 20) - dt) <= 0) this.ponerVisita();
    if (this.visita && r.que !== 'Patio') { this.grupo.remove(this.visita.m.grupo); this.visita = null; this.proxVisita = 120; }
    // Arriba: la rutina y el objetivo.
    if (this.preso && this.hud && this.reloj - (this.ultimoHud || -9) > 0.5) {
      this.ultimoHud = this.reloj;
      const c = this.c;
      this.hud.innerHTML = `<b>C.O.M.C.A.R.</b> · ${r.donde}<br>🎯 ${PASOS[c.paso] || 'Escapate'}${c.paso === 6 ? ` (${c.tunel}%)` : ''}${c.cig ? ` · 🚬 ${c.cig}` : ''}`;
      if (r.que !== this.rutinaAntes) { if (this.rutinaAntes) this.ui.toast(`Guardia: "¡${r.donde}!"`, 'info'); this.rutinaAntes = r.que; }
    }
  }

  async ponerVisita() {
    const yo = this.estado.personaje;
    const otros = PERSONAJES.filter((x) => x.id !== yo && x.foto);
    const pj = otros[Math.floor(Math.random() * otros.length)];
    const silla = this.sillas[Math.floor(Math.random() * this.sillas.length)];
    const m = await this.persona(pj, silla.x, silla.zVisita, Math.PI);
    this.visita = { m, p: pj, silla };
    this.ui.toast(`Guardia: "¡Tenés visita! ${pj.nombre} te espera en la sala"`, 'plata', 5000);
  }
}
