import * as THREE from 'three';
import { CIUDAD as C } from './constantes.js';
import { crearPersonaje } from './personaje.js';
import { cargarCabeza, cargarImagen, crearEtiqueta } from './texturas.js';
import { vestido } from './vestir.js';
import { LUCCA } from '../data/ropa.js';

// LUCCABOSSIO™, en la ciudad (manzana 'lucca' de ciudad.js), armado lo más parecido al local de
// verdad (assets/especiales/luccabossiolocal.jpeg y localluccabossio2.jpeg): planta baja de un
// edificio, marco blanco, la banda negra con el logo blanco de la viborita, todo el frente de
// vidrio con "LUCCABOSSIO™" y el texto de la marca pegados, el número 3174 en la columna y la
// maceta de granito afuera. Adentro: paredes blancas, piso de madera clara, percheros con la ropa
// colgada de costado y dos prendas de frente, mueble blanco con remeras dobladas, el cubo blanco
// de la vidriera, el banco y el mostrador de madera al fondo, donde atiende Shaggy (el cuñado de
// Lucca, con ropa de la marca). La mascota (el bichito) flota por el local. Lucca Bossio a veces está en el local y si
// no anda caminando por la ciudad, y te tira alguna de las suyas.

const ALTO = 13; // del piso al techo del local (saltando no se llega a ver el techo)
const FRASES = [
  'Tengo la mejor marca de nicho de Uruguay',
  'Qué onda mano',
  'De hecho, mi ropa sí vale los 5000 pesos 🤓👆',
  'Esto no es ropa, mano: es arte',
  'Cada prenda es una pieza única, de colección',
];
const FRASES_SHAGGY = ['¡Bienvenido, viejo!', 'Zoinks, esa te queda re bien', 'Like, ¿qué vas a llevar?'];
const una = (l) => l[Math.floor(Math.random() * l.length)];

export const LUCCA_P = {
  id: 'luccabossio', nombre: 'Lucca Bossio', foto: 'luccabossio.jpeg', recorte: [0.57, 0.6, 0.74], pelo: '#17110e', peinado: 'liso', peloLargo: true,
  remera: '#1f4f9a', pantalon: '#3b3c40',
};
const ROPA_LUCCA = { torso: 'lb_knox', piernas: 'lb_jean' };
const ROPA_SHAGGY = { torso: 'lb_tranca', piernas: 'lb_acanto' }; // el cuñado también viste la marca
export const SHAGGY = {
  id: 'shaggy', nombre: 'Shaggy', foto: 'shaggy.jpeg', recorte: [0.4, 0.22, 0.46], pelo: '#6e4a2c', peinado: 'liso', peloLargo: true,
  remera: '#c9d6cf', pantalon: '#2c3440', mangasLargas: true, gordura: -0.2,
};

function lienzo(w, h, dibujar) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  dibujar(c.getContext('2d'), w, h);
  return c;
}
function textura(c, repetir = false) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repetir) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
const texImagen = (url) => {
  const t = new THREE.TextureLoader().load(url);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};

// Piso de tablas de madera clara (como el del local).
const texMadera = () => textura(lienzo(256, 256, (g, w) => {
  for (let f = 0; f < 8; f++) {
    for (let k = -1; k < 3; k++) {
      const x = k * 128 + (f % 2) * 64 + ((f * 37) % 50);
      const tono = 0.9 + ((f * 13 + k * 7) % 5) * 0.03;
      g.fillStyle = `rgb(${Math.round(196 * tono)},${Math.round(164 * tono)},${Math.round(124 * tono)})`;
      g.fillRect(x, f * 32, 128, 32);
      g.strokeStyle = 'rgba(90,60,30,0.18)';
      for (let v = 0; v < 6; v++) { g.beginPath(); g.moveTo(x, f * 32 + 4 + v * 5); g.bezierCurveTo(x + 40, f * 32 + 2 + v * 5, x + 80, f * 32 + 7 + v * 5, x + 128, f * 32 + 4 + v * 5); g.stroke(); }
      g.fillStyle = 'rgba(70,45,20,0.45)';
      g.fillRect(x, f * 32, 2, 32);
    }
    g.fillStyle = 'rgba(70,45,20,0.35)';
    g.fillRect(0, f * 32, w, 1.5);
  }
}), true);
// Granito de la maceta de afuera.
const texGranito = () => textura(lienzo(128, 128, (g) => {
  g.fillStyle = '#b6a79a';
  g.fillRect(0, 0, 128, 128);
  for (let k = 0; k < 1400; k++) {
    g.fillStyle = ['#7d6b5e', '#d8cdc3', '#5f5249', '#9b8a7d', '#efe8e1'][k % 5];
    g.fillRect((k * 53) % 128, (k * 97 + k * k) % 128, 1 + (k % 3), 1 + (k % 2));
  }
}), true);
// Letras blancas pegadas en el vidrio.
const texLetras = () => textura(lienzo(1024, 160, (g, w, h) => {
  g.fillStyle = '#ffffff';
  g.textBaseline = 'middle';
  g.font = '700 104px "Helvetica Neue", Arial, sans-serif';
  const t = 'LUCCABOSSIO';
  g.textAlign = 'center';
  g.fillText(t, w / 2 - 30, h / 2 + 6, w - 120);
  g.font = '700 40px Arial, sans-serif';
  g.fillText('™', w - 70, h / 2 - 26);
}));
const texManifiesto = () => textura(lienzo(512, 512, (g, w) => {
  g.fillStyle = '#ffffff';
  g.textAlign = 'center';
  g.font = '700 46px "Helvetica Neue", Arial, sans-serif';
  g.fillText('LUCCABOSSIO™', w / 2, 70);
  g.font = '400 22px "Helvetica Neue", Arial, sans-serif';
  const lineas = ['Diseñador de moda streetwear', 'que busca fusionar el arte con el diseño', 'mediante la creación de colecciones', 'exclusivas y limitadas.', '', 'Basadas en conceptos creados por', 'el joven artista y diseñador.', '', 'Mediante su estilo abstracto/surrealista,', 'heredado de su familia.'];
  lineas.forEach((l, i) => g.fillText(l, w / 2, 130 + i * 30));
}));
const texCartelito = (lineas, w, h, fondo, color, fuente) => textura(lienzo(w, h, (g) => {
  g.fillStyle = fondo;
  g.fillRect(0, 0, w, h);
  g.fillStyle = color;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = fuente;
  lineas.forEach((t, i) => g.fillText(t, w / 2, (h / (lineas.length + 1)) * (i + 1)));
}));

export class Lucca {
  constructor({ ciudad, escena, estado, ui }) {
    this.ciudad = ciudad;
    this.escena = escena;
    this.estado = estado;
    this.ui = ui;
    this.listo = false;
    this.reloj = 0;
    ciudad.lucca = this;
  }

  // Un plano con textura en coordenadas de la ciudad; ry: hacia dónde mira (0 = +z).
  plano(map, w, h, x, y, z, ry = 0, extra = {}) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map, transparent: true, ...extra }));
    m.position.set(x, y, z);
    m.rotation.y = ry;
    this.ciudad.grupo.add(m);
    return m;
  }

  // ---------- Construcción (la llama ciudad.js al armar la manzana) ----------
  armar(c, lote, PISO, rnd) {
    const s = this.ciudad.solido.bind(this.ciudad);
    const xm = Math.round((lote.x0 + lote.x1) / 2);
    const x0 = xm - 8;
    const x1 = xm + 8;
    const zf = lote.z0 + 3; // la vidriera
    const zb = zf + 28; // la pared del fondo
    const P = PISO;
    const T = P + ALTO;
    this.L = { xm, x0, x1, zf, zb, P };
    // Edificios de al lado (comunes) y el del local: planta baja blanca, pisos arriba.
    c.piso(lote.x0, lote.z0, lote.x1, lote.z1, P + 0.02, '#c7c2b8');
    this.ciudad.edificio(c, lote.x0, lote.z0 + 2, xm - 18, lote.z0 + 28, 4, rnd, { eje: 'z', lado: -1 }, true);
    this.ciudad.edificio(c, xm + 18, lote.z0 + 2, lote.x1, lote.z0 + 28, 5, rnd, { eje: 'z', lado: -1 }, true);
    this.ciudad.edificio(c, lote.x0, lote.z1 - 18, lote.x1, lote.z1, 3, rnd, { eje: 'z', lado: 1 }, false);
    const bx0 = xm - 18;
    const bx1 = xm + 18;
    const pisos = T + 4.5;
    const arriba = pisos + 5 * 4.2;
    c.caja(bx0, pisos, zf - 0.2, bx1, arriba, zb + 4, '#ece8df', { lados: 'ventanas', base: pisos, arriba: '#9e9e9e' });
    c.caja(bx0 - 0.2, arriba, zf - 0.4, bx1 + 0.2, arriba + 0.6, zb + 4.2, '#ece8df');
    for (let y = pisos + 4.2; y < arriba; y += 4.2) c.caja(bx0, y - 0.15, zf - 0.6, bx1, y, zf - 0.2, '#d8d3c8'); // balconcitos
    s(bx0, pisos, zf - 0.6, bx1, arriba + 0.6, zb + 4.2);
    // Planta baja a los costados del local: revestimiento blanco.
    for (const [a, b] of [[bx0, x0 - 1.2], [x1 + 1.2, bx1]]) {
      c.caja(a, P, zf, b, pisos, zb + 4, '#f1efe9');
      s(a, 0, zf, b, pisos, zb + 4);
    }
    // ----- Fachada del local -----
    // Columnas del marco blanco, el dintel blanco y la banda negra con el logo.
    for (const [a, b] of [[x0 - 1.2, x0], [x1, x1 + 1.2]]) {
      c.caja(a, P, zf - 0.5, b, pisos, zf + 0.6, '#f3f2ee');
      s(a, 0, zf - 0.5, b, pisos, zf + 0.6);
    }
    c.caja(x0, T - 0.6, zf - 0.3, x1, T + 0.2, zf + 0.6, '#f3f2ee', { abajo: true });
    c.caja(x0 - 1.4, T + 0.2, zf - 0.7, x1 + 1.4, pisos, zf + 0.2, '#16171c', { arriba: '#16171c' });
    s(x0 - 1.4, T - 0.6, zf - 0.7, x1 + 1.4, pisos, zf + 0.6);
    this.plano(texImagen('assets/especiales/luccabossio_logo_blanco.png'), 7.6, 3.3, xm, T + 2.05, zf - 0.72, Math.PI);
    // Cámara de seguridad (domo) abajo del dintel.
    const domo = new THREE.SphereGeometry(0.35, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    domo.translate(x0 + 3, T - 0.6, zf - 0.05);
    c.forma('liso', domo, '#e8e8e8');
    // Vidriera: panel fijo izquierdo (con el texto de la marca), puerta en el medio (abierta, de
    // vidrio) y el panel grande de la derecha (con LUCCABOSSIO™).
    const pa = x0 + 4.6;
    const pb = x0 + 8.4;
    for (const [a, b] of [[x0, pa], [pb, x1]]) {
      c.caja(a, P, zf, b, T - 0.6, zf + 0.1, '#d6e6ee', { lados: 'cristal' });
      s(a, 0, zf, b, T - 0.6, zf + 0.1);
    }
    for (const x of [pa, pb]) c.caja(x - 0.06, P, zf - 0.02, x + 0.06, T - 0.6, zf + 0.12, '#bfc5ca');
    c.caja(pb - 0.12, P, zf + 0.1, pb, T - 0.7, zf + 3.6, '#d6e6ee', { lados: 'cristal' }); // la puerta abierta
    c.caja(pb - 0.2, P + 3.6, zf + 1.6, pb + 0.08, P + 5.6, zf + 1.75, '#c9ced3'); // manija
    this.plano(texLetras(), 7.4, 1.3, (pb + x1) / 2, P + 5.2, zf - 0.03, Math.PI);
    this.plano(texManifiesto(), 3.6, 3.6, (x0 + pa) / 2, P + 4.6, zf - 0.03, Math.PI);
    const chico = this.plano(texImagen('assets/especiales/luccabossio_logo_blanco.png'), 1.2, 0.52, (x0 + pa) / 2, P + 2.55, zf - 0.03, Math.PI);
    chico.renderOrder = 1;
    this.plano(texCartelito(['PROHIBIDO', 'FUMAR'], 128, 80, '#ffffff', '#c62828', '900 22px Arial'), 0.9, 0.56, (pa + pb) / 2 + 1, T - 1.3, zf - 0.03, Math.PI);
    // Número de puerta en la columna izquierda.
    this.plano(texCartelito(['3174'], 128, 80, '#f7f7f4', '#2a2a2a', '700 44px Georgia, serif'), 0.95, 0.6, x0 - 0.6, P + 6.2, zf - 0.52, Math.PI);
    // Maceta de granito afuera, a la derecha (con la tapa oscura y su placa).
    const mg = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.4, 3), new THREE.MeshLambertMaterial({ map: texGranito() }));
    mg.position.set(x1 + 2.2, P + 1.2, zf - 2.2);
    this.ciudad.grupo.add(mg);
    c.caja(x1 + 0.45, P + 2.4, zf - 3.65, x1 + 3.95, P + 2.55, zf - 0.75, '#3b3a38');
    c.caja(x1 + 1.2, P + 0.5, zf - 3.72, x1 + 3.2, P + 1.9, zf - 3.69, '#5a5a58');
    s(x1 + 0.4, 0, zf - 3.7, x1 + 4, P + 2.55, zf - 0.7);

    // ----- Adentro -----
    const pared = '#f6f5f2';
    c.caja(x0 - 0.3, P, zf, x0, T, zb + 0.3, pared);
    c.caja(x1, P, zf, x1 + 0.3, T, zb + 0.3, pared);
    c.caja(x0, P, zb, x1, T, zb + 0.3, pared);
    s(x0 - 0.3, 0, zf, x0, T, zb + 0.3);
    s(x1, 0, zf, x1 + 0.3, T, zb + 0.3);
    s(x0, 0, zb, x1, T, zb + 0.3);
    c.caja(x0, T, zf, x1, T + 0.3, zb + 0.3, '#fbfbf9', { abajo: true });
    const piso = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, zb - zf), new THREE.MeshLambertMaterial({ map: texMadera() }));
    piso.material.map.repeat.set((x1 - x0) / 8, (zb - zf) / 8);
    piso.rotation.x = -Math.PI / 2;
    piso.position.set(xm, P + 0.04, (zf + zb) / 2);
    this.ciudad.grupo.add(piso);
    // Rieles negros en el techo con spots, y luces embutidas.
    for (const x of [xm - 4, xm + 4]) {
      c.caja(x - 0.08, T - 0.12, zf + 2, x + 0.08, T, zb - 2, '#1b1b1f');
      for (let z = zf + 4; z < zb - 2; z += 4) {
        const spot = new THREE.CylinderGeometry(0.18, 0.24, 0.5, 8);
        spot.rotateX(0.5);
        spot.translate(x, T - 0.4, z);
        c.forma('liso', spot, '#1b1b1f');
        c.caja(x - 0.16, T - 0.68, z + 0.12, x + 0.16, T - 0.62, z + 0.44, '#fff6dc', { lados: 'luz' });
      }
    }
    // ----- Pared derecha: mueble blanco con remeras dobladas, perchero y estante -----
    const zr0 = zf + 7;
    const zr1 = zf + 21;
    c.caja(x1 - 1.7, P, zr0, x1, P + 1.6, zr1, '#ffffff', { arriba: '#f2f2f0' });
    for (let z = zr0; z <= zr1 + 0.01; z += 2.8) c.caja(x1 - 1.72, P, z - 0.05, x1 - 1.68, P + 1.6, z + 0.05, '#e6e6e3');
    const doblados = ['#141414', '#f2f2f2', '#1e1e1e', '#2e3f63', '#ededed', '#121212'];
    for (let z = zr0 + 0.5, k = 0; z < zr1 - 0.6; z += 1.4, k++) {
      for (let n = 0; n < 4; n++) c.caja(x1 - 1.45, P + 1.6 + n * 0.16, z, x1 - 0.4, P + 1.74 + n * 0.16, z + 1.1, doblados[(k + n) % doblados.length]);
    }
    s(x1 - 1.7, 0, zr0, x1, P + 2.3, zr1);
    c.caja(x1 - 1.05, P + 6.5, zr0, x1 - 0.95, P + 6.62, zr1, '#c9ced3');
    for (const z of [zr0, zr1]) c.caja(x1 - 1.05, P + 6.5, z - 0.05, x1, P + 6.62, z + 0.05, '#c9ced3');
    const colgadas = ['#111111', '#f4f4f4', '#151515', '#1f4f9a', '#e9e9ef', '#101010', '#f0efed', '#191a1e', '#2e3f63', '#f6f6f6'];
    for (let z = zr0 + 0.4, k = 0; z < zr1 - 0.3; z += 0.48, k++) {
      c.caja(x1 - 1.9, P + 3.7, z, x1 - 0.1, P + 6.35, z + 0.2, colgadas[k % colgadas.length]);
      c.caja(x1 - 1.05, P + 6.35, z + 0.05, x1 - 0.95, P + 6.55, z + 0.15, '#9aa0a6');
    }
    c.caja(x1 - 1.5, P + 8.1, zr0, x1, P + 8.25, zr1, '#ffffff');
    for (let z = zr0 + 0.6, k = 0; z < zr1 - 3; z += 1.6, k++) for (let n = 0; n < 3; n++) c.caja(x1 - 1.3, P + 8.25 + n * 0.16, z, x1 - 0.3, P + 8.39 + n * 0.16, z + 1.1, doblados[(k + n + 2) % doblados.length]);
    c.cil(0.35, 0.28, 0.6, '#f5f5f5', x1 - 0.8, P + 8.25, zr1 - 1.2, 10);
    const planta = new THREE.IcosahedronGeometry(0.75, 0);
    planta.translate(x1 - 0.8, P + 9.3, zr1 - 1.2);
    c.forma('liso', planta, '#3f7d3a');
    // Dos prendas colgadas de frente, adelante (como en la vidriera de la foto).
    for (const [id, z] of [['lb_pasamontanas', zf + 2.6], ['lb_knox', zf + 5.2]]) {
      c.caja(x1 - 0.5, P + 6.7, z - 0.05, x1, P + 6.8, z + 0.05, '#c9ced3');
      this.plano(texImagen(`assets/ropa/tienda/${id}.webp`), 2.4, 2.6, x1 - 0.5, P + 5.3, z, -Math.PI / 2);
    }
    // ----- Pared izquierda: perchero de jeans, banco de madera, cuadro de la mascota y espejo -----
    c.caja(x0, P + 6.2, zf + 1.5, x0 + 1.1, P + 6.3, zf + 1.6, '#c9ced3');
    c.caja(x0 + 0.95, P + 6.2, zf + 1.5, x0 + 1.05, P + 6.3, zf + 6, '#c9ced3');
    for (let z = zf + 1.8, k = 0; z < zf + 5.8; z += 0.45, k++) c.caja(x0 + 0.1, P + 2.6, z, x0 + 1.9, P + 6.1, z + 0.2, ['#3b5577', '#2c3c55', '#5a6f8a', '#3b3c40'][k % 4]);
    s(x0, 0, zf + 1.5, x0 + 2, P + 6.3, zf + 6);
    c.caja(x0 + 0.3, P + 1.1, zf + 8, x0 + 2.1, P + 1.35, zf + 12.5, '#b8743c');
    for (const z of [zf + 8.3, zf + 12.2]) c.caja(x0 + 0.4, P, z - 0.15, x0 + 2, P + 1.1, z + 0.15, '#9a5f2e');
    s(x0, 0, zf + 8, x0 + 2.1, P + 1.35, zf + 12.5);
    c.caja(x0, P + 3.4, zf + 7.6, x0 + 0.12, P + 7.8, zf + 13, '#111111');
    this.plano(textura(lienzo(4, 4, (g) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 4, 4); })), 5.1, 4.1, x0 + 0.13, P + 5.6, zf + 10.3, Math.PI / 2);
    this.plano(texImagen('assets/especiales/luccabossio_mascota.png'), 4.4, 2.86, x0 + 0.15, P + 5.6, zf + 10.3, Math.PI / 2);
    c.caja(x0, P + 0.4, zf + 15, x0 + 0.1, P + 7.6, zf + 18, '#d9d9d6');
    c.caja(x0 + 0.1, P + 0.6, zf + 15.2, x0 + 0.12, P + 7.4, zf + 17.8, '#b9cbd6', { lados: 'luz' });
    // ----- El cubo blanco de la vidriera, con dos remeras dobladas arriba -----
    c.caja(x1 - 5.4, P, zf + 1.2, x1 - 2.2, P + 2.6, zf + 4.2, '#ffffff', { arriba: '#f7f7f5' });
    s(x1 - 5.4, 0, zf + 1.2, x1 - 2.2, P + 2.6, zf + 4.2);
    for (const [id, dx] of [['lb_monograma', -4.6], ['lb_escrituras', -3.0]]) {
      const r = this.plano(texImagen(`assets/ropa/tienda/${id}.webp`), 1.4, 1.4, x1 + dx + 0.6, P + 2.62, zf + 2.7);
      r.rotation.set(-Math.PI / 2, 0, Math.PI);
    }
    // ----- Mostrador de madera al fondo, con el posnet y bolsas; atrás el logo negro y la puerta -----
    const mz0 = zb - 6.2;
    const mz1 = zb - 4.8;
    c.caja(xm - 7, P, mz0, xm + 1.5, P + 3.3, mz1, '#b0682f', { arriba: '#cf8a4c' });
    c.caja(xm - 7.1, P + 3.3, mz0 - 0.1, xm + 1.6, P + 3.45, mz1 + 0.1, '#d79457');
    s(xm - 7, 0, mz0, xm + 1.5, P + 3.45, mz1);
    c.caja(xm - 2.6, P + 3.45, mz0 + 0.3, xm - 1.8, P + 3.55, mz1 - 0.2, '#1b1b1f');
    c.caja(xm - 2.5, P + 3.55, mz1 - 0.35, xm - 1.9, P + 4.3, mz1 - 0.3, '#2a2a2e');
    c.caja(xm - 2.42, P + 3.62, mz1 - 0.36, xm - 1.98, P + 4.22, mz1 - 0.355, '#7cc4ff', { lados: 'luz' });
    for (const [x, h] of [[xm - 6.2, 1.4], [xm - 5.3, 1.1]]) {
      c.caja(x - 0.4, P + 3.45, mz0 + 0.2, x + 0.4, P + 3.45 + h, mz0 + 0.65, '#ffffff');
      c.caja(x - 0.05, P + 3.45 + h, mz0 + 0.38, x + 0.05, P + 3.75 + h, mz0 + 0.47, '#111111');
    }
    this.plano(texImagen('assets/especiales/luccabossio_logo_negro.png'), 5, 2.2, xm - 2.8, P + 7, zb - 0.02, Math.PI);
    c.caja(xm + 3, P, zb - 0.05, xm + 6.6, P + 7.4, zb, '#0e0e10');
    this.mostrador = { x: xm - 2.8, z: mz0 - 1.4 };
    this.cajero = { x: xm - 2.8, z: zb - 3.2 };
    this.adentro = { x0, x1, zf, zb };
    this.listo = true;
    this.crearGente();
  }

  async crearGente() {
    // Shaggy, atrás del mostrador.
    const sh = crearPersonaje(SHAGGY, await cargarCabeza(SHAGGY), await vestido(ROPA_SHAGGY));
    sh.grupo.position.set(this.cajero.x, this.L.P, this.cajero.z);
    sh.grupo.rotation.y = Math.PI;
    sh.grupo.scale.setScalar(1.04);
    const etq = crearEtiqueta([{ texto: 'Shaggy', tam: 60, color: '#ffffff' }], 6);
    etq.sprite.position.y = 7;
    sh.grupo.add(etq.sprite);
    this.ciudad.grupo.add(sh.grupo);
    const cab = await cargarCabeza(SHAGGY);
    // Lo que usa el catálogo de main.js (como las otras tiendas de ciudad.js).
    this.tienda = { T: LUCCA, vendedor: sh, etiqueta: etq, cara: cab.frente, globo: 0 };
    this.shaggy = sh;
    // Lucca Bossio, con su propia ropa.
    const lu = crearPersonaje(LUCCA_P, await cargarCabeza(LUCCA_P), await vestido(ROPA_LUCCA));
    const etl = crearEtiqueta([{ texto: 'Lucca Bossio', tam: 60, color: '#ffffff' }], 6);
    etl.sprite.position.y = 7;
    lu.grupo.add(etl.sprite);
    this.ciudad.grupo.add(lu.grupo);
    this.lucca = { m: lu, etiqueta: etl, globo: 0, donde: null, cambio: 0, saludo: false, camino: null, s: 0 };
    this.mudarLucca('local');
    // La mascota: flota por el local (siempre de frente a la cámara).
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texImagen('assets/especiales/luccabossio_mascota.png'), transparent: true }));
    sp.scale.set(2.6, 1.7, 1);
    this.ciudad.grupo.add(sp);
    this.mascota = sp;
  }

  // Lucca va al local (parado entre los percheros) o sale a caminar por las veredas de una manzana.
  mudarLucca(donde) {
    const l = this.lucca;
    l.donde = donde;
    l.cambio = 60 + Math.random() * 90;
    if (donde === 'local') {
      l.camino = null;
      l.m.grupo.position.set(this.L.xm + 2.5, this.L.P, this.L.zf + 12);
      l.m.grupo.rotation.y = -Math.PI / 2;
      return;
    }
    const m = this.ciudad.manzanaDe(1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6));
    const r = { x0: m.x0 + 2.8, x1: m.x1 - 2.8, z0: m.z0 + 2.8, z1: m.z1 - 2.8 };
    l.camino = { r, per: 2 * (r.x1 - r.x0 + r.z1 - r.z0), vel: 3.6 * (Math.random() < 0.5 ? 1 : -1), y: m.y };
    l.s = Math.random() * l.camino.per;
  }

  hablar(quien, texto, toast = true) {
    const nombre = quien === this.lucca ? 'Lucca Bossio' : 'Shaggy';
    quien.etiqueta.actualizar([{ texto: nombre, tam: 60, color: '#ffffff' }, { texto, tam: 40 }]);
    quien.globo = 5;
    if (toast) this.ui.toast(`${nombre}: "${texto}"`, 'info', 4000);
  }

  // ---------- Dónde estás ----------
  local(p) { return { x: p.x - C.x, z: p.z - C.z }; }
  cercaMostrador(jugador) {
    if (!this.tienda || jugador.pos.y > 3) return false;
    const l = this.local(jugador.pos);
    return Math.hypot(l.x - this.mostrador.x, l.z - this.mostrador.z) < 4.2;
  }
  cercaLucca(jugador, r = 4) {
    if (!this.lucca) return false;
    const l = this.local(jugador.pos);
    const p = this.lucca.m.grupo.position;
    return Math.hypot(l.x - p.x, l.z - p.z) < r && Math.abs(jugador.pos.y - p.y) < 3;
  }
  accion(jugador) {
    if (!this.listo) return '';
    if (this.cercaLucca(jugador)) return 'Hablar con Lucca Bossio (E)';
    if (this.cercaMostrador(jugador)) return 'Ver la ropa (E)';
    return '';
  }
  hacer(jugador) {
    if (this.cercaLucca(jugador)) {
      this.hablar(this.lucca, una(FRASES));
      return;
    }
    if (this.cercaMostrador(jugador)) {
      this.hablar(this.tienda, una(FRASES_SHAGGY), false);
      this.alTienda?.(this.tienda);
    }
  }

  // ---------- Cada cuadro ----------
  actualizar(dt, jugador) {
    if (!this.listo || !this.lucca) return;
    this.reloj += dt;
    const t = this.reloj;
    const l = this.local(jugador.pos);
    const L = this.L;
    const cercaLocal = Math.abs(l.x - L.xm) < 120 && Math.abs(l.z - (L.zf + 14)) < 120;
    if (cercaLocal) {
      // La mascota da vueltas por el local, flotando y meciéndose.
      this.mascota.position.set(L.xm + Math.sin(t * 0.35) * 4.5, L.P + 6.4 + Math.sin(t * 1.7) * 0.4, L.zf + 13 + Math.sin(t * 0.23) * 8);
      this.mascota.material.rotation = Math.sin(t * 1.2) * 0.12;
      this.shaggy.animar(dt, 0, true);
    }
    for (const q of [this.tienda, this.lucca]) {
      if (q.globo > 0 && (q.globo -= dt) <= 0) q.etiqueta.actualizar([{ texto: q === this.lucca ? 'Lucca Bossio' : 'Shaggy', tam: 60, color: '#ffffff' }]);
    }
    // Lucca: cada tanto cambia de lugar (nunca delante tuyo).
    const lu = this.lucca;
    const p = lu.m.grupo.position;
    const lejos = Math.hypot(l.x - p.x, l.z - p.z) > 40;
    if ((lu.cambio -= dt) <= 0 && lejos) this.mudarLucca(Math.random() < 0.4 ? 'local' : 'ciudad');
    let vel = 0;
    if (lu.camino && Math.hypot(l.x - p.x, l.z - p.z) < 200) {
      const k = lu.camino;
      const parar = this.cercaLucca(jugador, 6); // si estás al lado, se frena a charlar
      if (!parar) {
        lu.s = THREE.MathUtils.euclideanModulo(lu.s + k.vel * dt, k.per);
        vel = Math.abs(k.vel);
      }
      const { r } = k;
      const a = r.x1 - r.x0;
      const b = r.z1 - r.z0;
      let s = lu.s;
      let x;
      let z;
      let dir;
      if (s < a) { x = r.x0 + s; z = r.z0; dir = Math.PI / 2; } else if ((s -= a) < b) { x = r.x1; z = r.z0 + s; dir = 0; } else if ((s -= b) < a) { x = r.x1 - s; z = r.z1; dir = -Math.PI / 2; } else { s -= a; x = r.x0; z = r.z1 - s; dir = Math.PI; }
      if (k.vel < 0) dir += Math.PI;
      p.set(x, k.y, z);
      lu.m.grupo.rotation.y = parar ? Math.atan2(l.x - p.x, l.z - p.z) : dir;
    } else if (!lu.camino && this.cercaLucca(jugador, 10)) {
      lu.m.grupo.rotation.y = Math.atan2(l.x - p.x, l.z - p.z); // en el local, te mira
    }
    lu.m.animar(dt, vel, true);
    lu.m.grupo.visible = Math.hypot(l.x - p.x, l.z - p.z) < 200;
    // Cuando te acercás, te tira una de las suyas (una vez por vez que llegás).
    const cerca = this.cercaLucca(jugador, 7);
    if (cerca && !lu.saludo) this.hablar(lu, una(FRASES));
    lu.saludo = cerca;
  }
}
