import * as THREE from 'three';
import { crearPersonaje } from './personaje.js';
import { cargarCabeza, crearEtiqueta, liberarAlSubir } from './texturas.js';
import { formato } from './util.js';
import { sfx } from './sfx.js';

// LAGATTA BAR, en la ciudad (manzana 'bar' de ciudad.js): un bar de verdad, oscuro y cálido.
// Madera oscura, barra larga con tapa de mármol negro, la contrabarra con estantes de botellas
// iluminados de atrás, dos teles, lámparas colgantes, banquetas altas y mesitas. Atiende Lagatta
// (de traje). Te sentás en la barra y pedís: cada trago tiene su precio (sube con lo que ganás)
// y se lo podés regalar a la chica que tenés al lado.

const ALTO = 12;
const ASIENTO = 2.3; // alto de la banqueta (sobre el piso del bar)
const ANCHO = 13; // medio ancho del salón

export const LAGATTA = {
  id: 'lagatta', nombre: 'Lagatta', foto: 'lagatta.png', recorte: [0.525, 0.33, 0.46], pelo: '#5a3a24', peinado: 'liso',
  remera: '#18181c', pantalon: '#141417', mangasLargas: true,
  remeraFotos: { frente: 'ropa/lagatta_frente.jpg', espalda: 'ropa/lagatta_espalda.jpg', manga: 'ropa/lagatta_manga.jpg', tela: 'ropa/lagatta_tela.jpg' },
};
// Las chicas de la barra: vestidos, flacas (sin foto: la cara se dibuja).
const CHICAS = [
  { id: 'chica_sofi', nombre: 'Sofi', piel: '#f0cdb3', pelo: '#1d1410', remera: '#b3122a', labios: '#c2183a' },
  { id: 'chica_cami', nombre: 'Cami', piel: '#f6dcc8', pelo: '#e3c27a', remera: '#121214', labios: '#b5294a' },
  { id: 'chica_juli', nombre: 'Juli', piel: '#d9a882', pelo: '#5b3720', remera: '#0f6b4f', labios: '#a8243a' },
].map((c) => ({ ...c, sinFoto: true, peinado: 'liso', peloLargo: true, pantalon: c.remera, gordura: -0.3 }));
const GRACIAS = ['¡Ay, gracias! Sos un amor', 'Salud 🥂', '¿Me estás invitando? Me encanta', 'Qué caballero 😏', 'La próxima la pago yo... mentira'];
const FRASES = ['¿Qué te sirvo, crack?', 'La casa invita la próxima... mentira', 'Hoy está lindo el ambiente', 'Pedí lo que quieras'];
const una = (l) => l[Math.floor(Math.random() * l.length)];

// Los tragos: fuerza (lo que pega) y minutos de lo que ganás que cuesta (con un mínimo).
export const TRAGOS = [
  { id: 'cerveza', nombre: 'Cerveza', icono: '🍺', fuerza: 1, min: 0.4, color: '#e8b03a' },
  { id: 'fernet', nombre: 'Fernet con coca', icono: '🥤', fuerza: 1.3, min: 0.6, color: '#2a160c' },
  { id: 'vino', nombre: 'Vino tinto', icono: '🍷', fuerza: 1.1, min: 0.5, color: '#6a0f22' },
  { id: 'champagne', nombre: 'Champagne', icono: '🥂', fuerza: 1.2, min: 1.1, color: '#f2dc8a' },
  { id: 'gintonic', nombre: 'Gin tonic', icono: '🍸', fuerza: 1.4, min: 0.8, color: '#dff3f2' },
  { id: 'mojito', nombre: 'Mojito', icono: '🍹', fuerza: 1.3, min: 0.8, color: '#bfe8a0' },
  { id: 'caipirinha', nombre: 'Caipirinha', icono: '🍋', fuerza: 1.5, min: 0.9, color: '#d9ef8a' },
  { id: 'daiquiri', nombre: 'Daiquiri de frutilla', icono: '🍓', fuerza: 1.3, min: 0.9, color: '#e8435a' },
  { id: 'margarita', nombre: 'Margarita', icono: '🧂', fuerza: 1.5, min: 1, color: '#e9f0b8' },
  { id: 'negroni', nombre: 'Negroni', icono: '🍊', fuerza: 1.7, min: 1.2, color: '#b8201c' },
  { id: 'aperol', nombre: 'Aperol spritz', icono: '🍹', fuerza: 1.2, min: 0.9, color: '#f26a1b' },
  { id: 'whisky', nombre: 'Whisky', icono: '🥃', fuerza: 1.8, min: 1.5, color: '#b5671f' },
  { id: 'vodka', nombre: 'Vodka', icono: '🧊', fuerza: 1.8, min: 1.2, color: '#eef5f8' },
  { id: 'ron', nombre: 'Ron', icono: '🏴‍☠️', fuerza: 1.8, min: 1.1, color: '#8a4a1a' },
  { id: 'tequila', nombre: 'Tequila', icono: '🌵', fuerza: 2, min: 1.3, color: '#f1e3a8' },
  { id: 'jager', nombre: 'Jägermeister', icono: '🦌', fuerza: 2, min: 1.4, color: '#3a1d0e' },
  { id: 'absenta', nombre: 'Absenta', icono: '💚', fuerza: 3, min: 2.5, color: '#5ee05a' },
];

function lienzo(w, h, dibujar) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  dibujar(c.getContext('2d'), w, h);
  return c;
}
function textura(c, repetir = false) {
  const t = liberarAlSubir(new THREE.CanvasTexture(c)); // se dibujan una vez (ver texturas.js)
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repetir) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
// Piso de tablas de madera oscura.
const texMadera = () => textura(lienzo(256, 256, (g, w) => {
  for (let f = 0; f < 8; f++) {
    for (let k = -1; k < 3; k++) {
      const x = k * 128 + (f % 2) * 64 + ((f * 37) % 50);
      const tono = 0.85 + ((f * 13 + k * 7) % 5) * 0.05;
      g.fillStyle = `rgb(${Math.round(78 * tono)},${Math.round(50 * tono)},${Math.round(32 * tono)})`;
      g.fillRect(x, f * 32, 128, 32);
      g.strokeStyle = 'rgba(20,10,4,0.3)';
      for (let v = 0; v < 6; v++) { g.beginPath(); g.moveTo(x, f * 32 + 4 + v * 5); g.bezierCurveTo(x + 40, f * 32 + 2 + v * 5, x + 80, f * 32 + 7 + v * 5, x + 128, f * 32 + 4 + v * 5); g.stroke(); }
      g.fillStyle = 'rgba(10,5,2,0.6)';
      g.fillRect(x, f * 32, 2, 32);
    }
    g.fillStyle = 'rgba(10,5,2,0.5)';
    g.fillRect(0, f * 32, w, 1.5);
  }
}), true);
// Mármol negro con vetas (tapa de la barra).
const texMarmol = () => textura(lienzo(256, 128, (g, w, h) => {
  g.fillStyle = '#121416';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(190,200,205,0.35)';
  for (let k = 0; k < 9; k++) {
    g.lineWidth = 0.6 + (k % 3) * 0.5;
    g.beginPath();
    let x = (k * 61) % w;
    let y = 0;
    g.moveTo(x, y);
    while (y < h) { x += Math.sin(y * 0.11 + k) * 9 + 4; y += 8; g.lineTo(x % w, y); }
    g.stroke();
  }
}), true);
// Cartel de neón: LAGATTA BAR.
const texNeon = () => textura(lienzo(1024, 256, (g, w, h) => {
  g.fillStyle = '#0b0b0d';
  g.fillRect(0, 0, w, h);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = 'italic 700 120px Georgia, serif';
  g.shadowColor = '#ff4fb0';
  g.shadowBlur = 40;
  g.fillStyle = '#ffd6f0';
  for (let i = 0; i < 3; i++) g.fillText('Lagatta', w * 0.4, h * 0.5);
  g.font = '700 70px Arial, sans-serif';
  g.shadowColor = '#ffb13b';
  g.fillStyle = '#ffe2a6';
  for (let i = 0; i < 3; i++) g.fillText('BAR', w * 0.82, h * 0.52);
}));
// Pantalla de la tele (un partido, de noche).
const texTele = (cielo) => textura(lienzo(256, 144, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, cielo);
  gr.addColorStop(1, '#1b5e20');
  g.fillStyle = gr;
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#2e7d32';
  g.fillRect(0, h * 0.55, w, h * 0.45);
  g.strokeStyle = '#e8f5e9';
  g.lineWidth = 2;
  g.strokeRect(20, h * 0.6, w - 40, h * 0.35);
  g.fillStyle = '#ffffff';
  g.fillRect(8, 8, 70, 18);
  g.fillStyle = '#111';
  g.font = '700 13px Arial';
  g.fillText('VEC 2 - 1 DOS', 12, 21);
}));

// Cara dibujada de una chica: ojos con pestañas, cejas finas, rubor y labios pintados.
function caraChica(canvas, p) {
  const g = canvas.getContext('2d');
  const s = canvas.width;
  g.fillStyle = p.piel;
  g.fillRect(0, 0, s, s);
  g.fillStyle = p.pelo; // flequillo de costado
  g.beginPath();
  g.moveTo(0, 0); g.lineTo(s, 0); g.lineTo(s, s * 0.14); g.quadraticCurveTo(s * 0.45, s * 0.34, 0, s * 0.3); g.closePath();
  g.fill();
  for (const x of [0.32, 0.68]) {
    g.fillStyle = '#ffffff';
    g.beginPath(); g.ellipse(s * x, s * 0.47, s * 0.08, s * 0.05, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#4a2c1a';
    g.beginPath(); g.arc(s * x, s * 0.475, s * 0.04, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#0d0907';
    g.beginPath(); g.arc(s * x, s * 0.475, s * 0.02, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#0d0907';
    g.lineWidth = s * 0.014;
    g.beginPath(); g.ellipse(s * x, s * 0.47, s * 0.085, s * 0.055, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
    for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(s * (x + (k - 1) * 0.04 + (x < 0.5 ? -0.03 : 0.03)), s * 0.425); g.lineTo(s * (x + (k - 1) * 0.05 + (x < 0.5 ? -0.05 : 0.05)), s * 0.395); g.stroke(); }
    g.lineWidth = s * 0.012;
    g.beginPath(); g.moveTo(s * (x - 0.08), s * 0.37); g.quadraticCurveTo(s * x, s * 0.33, s * (x + 0.08), s * 0.37); g.stroke();
    g.fillStyle = 'rgba(232,110,120,0.28)';
    g.beginPath(); g.ellipse(s * x, s * 0.6, s * 0.07, s * 0.04, 0, 0, Math.PI * 2); g.fill();
  }
  g.strokeStyle = 'rgba(120,70,50,0.45)';
  g.lineWidth = s * 0.01;
  g.beginPath(); g.moveTo(s * 0.5, s * 0.5); g.lineTo(s * 0.48, s * 0.6); g.lineTo(s * 0.52, s * 0.61); g.stroke();
  g.fillStyle = p.labios;
  g.beginPath(); g.moveTo(s * 0.4, s * 0.72); g.quadraticCurveTo(s * 0.5, s * 0.66, s * 0.6, s * 0.72); g.quadraticCurveTo(s * 0.5, s * 0.79, s * 0.4, s * 0.72); g.fill();
}

export class Bar {
  constructor({ ciudad, escena, estado, ui, jugador, controles, guardar, ingreso }) {
    this.ciudad = ciudad;
    this.escena = escena;
    this.estado = estado;
    this.ui = ui;
    this.jugador = jugador;
    this.controles = controles;
    this.guardar = guardar;
    this.ingreso = ingreso; // () => plata por segundo
    this.listo = false;
    this.sentado = null; // índice de la banqueta
    this.t = 0;
    this.vomitos = [];
    this.alMision = null; // main.js: (id) => misiones
    ciudad.bar = this;
  }

  get a() {
    if (!this.estado.alcohol) this.estado.alcohol = { total: 0, nivel: 0, noche: { id: -1, tragos: 0, vomitos: 0 }, mareoHasta: 0 };
    return this.estado.alcohol;
  }

  // ---------- Construcción (la llama ciudad.js al armar la manzana) ----------
  armar(c, lote, PISO, rnd) {
    const s = this.ciudad.solido.bind(this.ciudad);
    const xm = Math.round((lote.x0 + lote.x1) / 2);
    const x0 = xm - ANCHO;
    const x1 = xm + ANCHO;
    const zf = lote.z0 + 3;
    const zb = zf + 26;
    const P = PISO;
    const T = P + ALTO;
    this.B = { xm, x0, x1, zf, zb, P };
    c.piso(lote.x0, lote.z0, lote.x1, lote.z1, P + 0.02, '#bdb6aa');
    this.ciudad.edificio(c, lote.x0, lote.z0 + 2, x0 - 2, lote.z0 + 28, 4, rnd, { eje: 'z', lado: -1 }, true);
    this.ciudad.edificio(c, x1 + 2, lote.z0 + 2, lote.x1, lote.z0 + 28, 5, rnd, { eje: 'z', lado: -1 }, true);
    this.ciudad.edificio(c, lote.x0, lote.z1 - 18, lote.x1, lote.z1, 3, rnd, { eje: 'z', lado: 1 }, false);
    // Pisos de arriba (departamentos) y la planta baja del bar.
    const arriba = T + 4 * 4.2;
    c.caja(x0 - 2, T, zf - 0.2, x1 + 2, arriba, zb + 2, '#5b4636', { lados: 'ventanas', base: T, arriba: '#3d2f25' });
    s(x0 - 2, T, zf - 0.2, x1 + 2, arriba, zb + 2);
    // Fachada: marco de madera oscura, ventanales con luz cálida, la puerta y el neón.
    const negro = '#141012';
    const madera = '#3a2418';
    for (const [a, b] of [[x0 - 2, x0], [x1, x1 + 2]]) {
      c.caja(a, P, zf - 0.6, b, T, zb + 2, madera);
      s(a, 0, zf - 0.6, b, T, zb + 2);
    }
    c.caja(x0, T - 2.6, zf - 0.6, x1, T, zf + 0.4, negro);
    s(x0, T - 2.6, zf - 0.6, x1, T, zf + 0.4);
    const pa = xm - 2.6;
    const pb = xm + 2.6;
    for (const [a, b] of [[x0, pa], [pb, x1]]) {
      c.caja(a, P, zf - 0.4, b, P + 1.6, zf + 0.3, madera); // zócalo
      c.caja(a, P + 1.6, zf, b, T - 2.6, zf + 0.1, '#ffcf8a', { lados: 'cristal' });
      s(a, 0, zf - 0.4, b, T - 2.6, zf + 0.3);
    }
    for (const x of [pa, pb]) c.caja(x - 0.2, P, zf - 0.5, x + 0.2, T - 2.6, zf + 0.4, negro);
    const neon = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.5), new THREE.MeshBasicMaterial({ map: texNeon() }));
    neon.position.set(xm, T - 1.3, zf - 0.62);
    neon.rotation.y = Math.PI;
    this.ciudad.grupo.add(neon);
    // Toldo bordó sobre la puerta.
    c.caja(pa - 1, T - 3.2, zf - 2.4, pb + 1, T - 2.9, zf - 0.6, '#5c0f1c');
    // ----- Adentro -----
    const pared = '#2c211b';
    c.caja(x0, P, zb, x1, T, zb + 0.4, pared);
    s(x0, 0, zb, x1, T, zb + 0.4);
    c.caja(x0, T - 0.4, zf, x1, T, zb, '#1a1412', { abajo: true }); // techo oscuro
    c.caja(x0, P + 3.6, zf + 0.2, x0 + 0.15, P + 3.9, zb, '#6b4a2a'); // molduras
    c.caja(x1 - 0.15, P + 3.6, zf + 0.2, x1, P + 3.9, zb, '#6b4a2a');
    const piso = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, zb - zf), new THREE.MeshLambertMaterial({ map: texMadera() }));
    piso.material.map.repeat.set((x1 - x0) / 8, (zb - zf) / 8);
    piso.rotation.x = -Math.PI / 2;
    piso.position.set(xm, P + 0.04, (zf + zb) / 2);
    this.ciudad.grupo.add(piso);
    // Contrabarra: estantes iluminados con botellas de todos los colores.
    const colores = ['#2e7d32', '#8d5524', '#e0e0e0', '#c62828', '#f9a825', '#4e342e', '#90caf9', '#6a1b9a', '#ffcc80', '#1b5e20'];
    for (let n = 0; n < 4; n++) {
      const y = P + 3.6 + n * 1.7;
      c.caja(x0 + 3, y, zb - 1.2, x1 - 3, y + 0.15, zb, '#4a3020');
      c.caja(x0 + 3, y + 0.15, zb - 0.06, x1 - 3, y + 1.55, zb - 0.02, '#ffd9a0', { lados: 'luz' }); // luz de atrás
      for (let x = x0 + 3.5, k = n * 3; x < x1 - 3.4; x += 0.55, k++) {
        const alto = 0.8 + ((k * 7) % 5) * 0.12;
        c.cil(0.16, 0.18, alto, colores[k % colores.length], x, y + 0.15, zb - 0.6, 8);
        c.cil(0.06, 0.09, 0.3, colores[(k + 3) % colores.length], x, y + 0.15 + alto, zb - 0.6, 6);
      }
    }
    // Dos teles arriba de la contrabarra.
    for (const [x, cielo] of [[xm - 7, '#0d1b3a'], [xm + 7, '#1a1035']]) {
      c.caja(x - 2.6, P + 10.2, zb - 0.3, x + 2.6, P + 13.1, zb - 0.1, '#0c0c0e');
      const tv = new THREE.Mesh(new THREE.PlaneGeometry(5, 2.8), new THREE.MeshBasicMaterial({ map: texTele(cielo) }));
      tv.position.set(x, P + 11.65, zb - 0.32);
      tv.rotation.y = Math.PI;
      this.ciudad.grupo.add(tv);
    }
    // La barra: frente de madera con zócalo y tapa de mármol negro.
    const mz0 = zb - 7.2;
    const mz1 = zb - 5.6;
    c.caja(x0 + 3, P, mz0, x1 - 3, P + 3.2, mz1, '#4a2c1a');
    c.caja(x0 + 3, P, mz0 - 0.05, x1 - 3, P + 0.35, mz0, '#1c120c');
    for (let x = x0 + 4; x < x1 - 3; x += 2.2) c.caja(x, P + 0.5, mz0 - 0.04, x + 0.08, P + 3.1, mz0, '#2e1c12'); // tablas
    const tapa = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 - 5.6, 0.25, mz1 - mz0 + 0.7), new THREE.MeshLambertMaterial({ map: texMarmol() }));
    tapa.material.map.repeat.set(4, 1);
    tapa.position.set(xm, P + 3.32, (mz0 + mz1) / 2 - 0.2);
    this.ciudad.grupo.add(tapa);
    c.caja(x0 + 3, P + 0.9, mz0 - 0.5, x1 - 3, P + 1.05, mz0 - 0.35, '#c9a24a'); // apoyapié dorado
    s(x0 + 3, 0, mz0 - 0.6, x1 - 3, P + 3.45, mz1);
    // Banquetas altas (cuero oscuro, pie cromado).
    this.banquetas = [];
    for (let i = 0; i < 7; i++) {
      const x = x0 + 5.6 + i * 2.5;
      const z = mz0 - 1.6;
      c.cil(0.12, 0.12, ASIENTO - 0.2, '#b8bcc0', x, P, z, 8);
      c.cil(0.7, 0.75, 0.08, '#b8bcc0', x, P, z, 12);
      c.cil(0.75, 0.7, 0.3, '#3b1f17', x, P + ASIENTO - 0.3, z, 14);
      this.banquetas.push({ x, z });
    }
    // Lámparas colgantes cálidas sobre la barra y el salón.
    for (let x = x0 + 5; x < x1 - 4; x += 4.5) {
      c.caja(x - 0.03, P + 8.3, mz0 - 0.03, x + 0.03, T - 0.4, mz0 + 0.03, '#111');
      c.cil(0.35, 0.6, 0.6, '#1a1a1a', x, P + 7.7, mz0, 10);
      c.cil(0.45, 0.45, 0.1, '#ffd38a', x, P + 7.62, mz0, 10, 'luz');
    }
    // Mesitas redondas con sillas, en el salón.
    for (const [x, z] of [[x0 + 4, zf + 5], [x1 - 4, zf + 5], [x0 + 4, zf + 11.5], [x1 - 4, zf + 11.5], [xm, zf + 8]]) {
      c.cil(1.1, 1.1, 0.12, '#3a2418', x, P + 2.6, z, 16);
      c.cil(0.1, 0.1, 2.5, '#141414', x, P + 0.1, z, 8);
      c.cil(0.6, 0.6, 0.08, '#141414', x, P, z, 12);
      s(x - 1.1, 0, z - 1.1, x + 1.1, P + 2.7, z + 1.1);
      for (const [dx, dz] of [[1.9, 0], [-1.9, 0]]) {
        c.caja(x + dx - 0.55, P + 1.5, z + dz - 0.55, x + dx + 0.55, P + 1.65, z + dz + 0.55, '#5a1a1a');
        c.caja(x + dx + Math.sign(dx) * 0.45, P + 1.65, z + dz - 0.55, x + dx + Math.sign(dx) * 0.55, P + 3.2, z + dz + 0.55, '#5a1a1a');
        for (const [ex, ez] of [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]]) c.caja(x + dx + ex - 0.05, P, z + dz + ez - 0.05, x + dx + ex + 0.05, P + 1.5, z + dz + ez + 0.05, '#141414');
      }
      c.cil(0.12, 0.1, 0.4, '#f2c14e', x + 0.3, P + 2.72, z, 8); // un vaso
    }
    // Cuadros y apliques de luz en las paredes.
    for (const z of [zf + 6, zf + 13]) {
      for (const [x, lado] of [[x0 + 0.05, 1], [x1 - 0.05, -1]]) {
        c.caja(x - 0.05 * lado, P + 5.5, z - 1.6, x + 0.12 * lado, P + 8.2, z + 1.6, '#c9a24a');
        c.caja(x + 0.12 * lado, P + 5.7, z - 1.4, x + 0.14 * lado, P + 8, z + 1.4, lado > 0 ? '#3e1b2e' : '#1b2e3e');
      }
    }
    this.mostrador = { mz0, mz1 };
    this.listo = true;
    this.crearGente();
  }

  dentro(p) {
    const B = this.B;
    if (!B) return false;
    const o = this.ciudad.grupo.position;
    return p.x > o.x + B.x0 && p.x < o.x + B.x1 && p.z > o.z + B.zf && p.z < o.z + B.zb;
  }

  async crearGente() {
    const B = this.B;
    const g = this.ciudad.grupo;
    // Lagatta, detrás de la barra.
    const lg = crearPersonaje(LAGATTA, await cargarCabeza(LAGATTA));
    lg.grupo.position.set(B.xm, B.P, B.zb - 3.6);
    lg.grupo.rotation.y = Math.PI;
    const etq = crearEtiqueta([{ texto: 'Lagatta', tam: 60, color: '#ffffff' }], 5);
    etq.sprite.position.y = 6.6;
    lg.grupo.add(etq.sprite);
    // La coctelera (en la mano, mientras prepara).
    const coctelera = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.9, 10), new THREE.MeshLambertMaterial({ color: '#c9ced3' }));
    coctelera.position.set(0, -2.1, 0.1);
    lg.manoD.add(coctelera);
    g.add(lg.grupo);
    this.lagatta = { m: lg, etq, x: B.xm, destino: B.xm, preparando: 0, coctelera, globo: 0 };
    // Las chicas, en las banquetas 1, 3 y 5 (la de al lado siempre queda libre).
    this.chicas = [];
    for (let k = 0; k < CHICAS.length; k++) {
      const p = CHICAS[k];
      const cab = await cargarCabeza(p);
      caraChica(cab.frente, p);
      const m = crearPersonaje(p, cab);
      const b = this.banquetas[1 + k * 2];
      m.grupo.position.set(b.x, B.P + ASIENTO - 2, b.z);
      const e = crearEtiqueta([{ texto: p.nombre, tam: 56, color: '#ffd6f0' }], 5);
      e.sprite.position.y = 6.4;
      m.grupo.add(e.sprite);
      g.add(m.grupo);
      this.chicas.push({ p, m, etq: e, banqueta: 1 + k * 2, globo: 0, tomando: 0, fase: Math.random() * 6 });
    }
  }

  precio(t) {
    const n = Math.max(t.min * 2e5, this.ingreso() * 60 * t.min);
    const e = 10 ** Math.max(0, Math.floor(Math.log10(n)) - 1);
    return Math.round(n / e) * e;
  }

  // ---------- Sentarse y pedir ----------
  banquetaCerca(jugador) {
    if (!this.listo || jugador.pos.y > this.B.P + 2) return -1;
    const o = this.ciudad.grupo.position;
    let mejor = -1;
    let d = 2.4;
    this.banquetas.forEach((b, i) => {
      if (this.chicas?.some((c) => c.banqueta === i)) return;
      const dd = Math.hypot(jugador.pos.x - (o.x + b.x), jugador.pos.z - (o.z + b.z));
      if (dd < d) { d = dd; mejor = i; }
    });
    return mejor;
  }

  accion(jugador) {
    if (this.sentado !== null) return 'Levantarse (E)';
    return this.banquetaCerca(jugador) >= 0 ? 'Sentarse en la barra (E)' : '';
  }

  hacer(jugador) {
    if (this.sentado !== null) { this.levantarse(); return true; }
    const i = this.banquetaCerca(jugador);
    if (i < 0) return false;
    const o = this.ciudad.grupo.position;
    const b = this.banquetas[i];
    this.sentado = i;
    jugador.pos.set(o.x + b.x, this.B.P, o.z + b.z);
    jugador.vel.set(0, 0, 0);
    jugador.angulo = 0; // mirando a la barra
    jugador.montura = { vel: 0, alto: ASIENTO - 2.05, mover: () => {} };
    this.controles.activo = false;
    this.controles.yaw = Math.PI; // la cámara atrás tuyo, mirando la barra
    this.controles.pitch = 0.32;
    this.lagatta.destino = b.x;
    this.decirLagatta(una(FRASES));
    this.abrirPanel();
    return true;
  }

  levantarse() {
    if (this.sentado === null) return;
    const j = this.jugador;
    j.montura = null;
    const pi = j.modelo?.partes;
    if (pi) { pi.piernaI.muslo.rotation.z = 0; pi.piernaD.muslo.rotation.z = 0; }
    j.pos.z -= 2.2;
    if (j.modelo) j.modelo.brazosSentado = -1.2;
    this.sentado = null;
    this.panel?.classList.add('oculto');
    this.controles.activo = true;
  }

  // La chica de al lado (si hay).
  vecina() {
    if (this.sentado === null || !this.chicas) return null;
    return this.chicas.find((c) => Math.abs(c.banqueta - this.sentado) === 1) || null;
  }

  abrirPanel() {
    if (!this.panel) {
      const r = document.createElement('div');
      r.id = 'bar';
      r.className = 'casino';
      r.innerHTML = `<div class="cas-panel bar-panel" role="dialog" aria-label="Lagatta Bar">
        <div class="cas-cab"><h2 class="cas-titulo">LAGATTA BAR</h2><p class="cas-dealer bar-dice"></p><button type="button" class="cas-salir bar-salir">Levantarse ✕</button></div>
        <ul class="bar-lista"></ul></div>`;
      document.body.appendChild(r);
      r.querySelector('.bar-salir').addEventListener('click', () => this.levantarse());
      r.querySelector('.bar-lista').addEventListener('click', (e) => {
        const b = e.target.closest('button[data-t]');
        if (b) this.pedir(TRAGOS.find((t) => t.id === b.dataset.t), b.dataset.para === 'chica');
      });
      window.addEventListener('keydown', (e) => {
        if (this.sentado === null || r.classList.contains('oculto')) return;
        if (e.code === 'KeyE' || e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); this.levantarse(); }
      }, true);
      this.panel = r;
    }
    this.dibujarLista();
    this.panel.classList.remove('oculto');
  }

  dibujarLista() {
    const v = this.vecina();
    this.panel.querySelector('.bar-lista').innerHTML = TRAGOS.map((t) => `<li class="bar-trago"><span class="bar-icono" aria-hidden="true">${t.icono}</span><b>${t.nombre}</b><span class="bar-precio">$${formato(this.precio(t))}</span>
      <button type="button" class="bar-tomar" data-t="${t.id}">Tomar</button>${v ? `<button type="button" class="bar-invitar" data-t="${t.id}" data-para="chica" title="Invitarle uno a ${v.p.nombre}">💖 ${v.p.nombre}</button>` : ''}</li>`).join('');
  }

  decirLagatta(texto) {
    if (this.panel) this.panel.querySelector('.bar-dice').textContent = `Lagatta: "${texto}"`;
    const l = this.lagatta;
    if (!l) return;
    l.etq.actualizar([{ texto: 'Lagatta', tam: 60, color: '#ffffff' }, { texto, tam: 40 }]);
    l.globo = 4;
  }

  pedir(t, paraChica) {
    const precio = this.precio(t);
    if (this.estado.plata < precio) {
      this.ui.toast(`Te faltan $${formato(precio - this.estado.plata)}`, 'error');
      sfx.error();
      return;
    }
    this.estado.plata -= precio;
    sfx.ficha();
    const l = this.lagatta;
    l.preparando = 1.6;
    const v = paraChica ? this.vecina() : null;
    this.decirLagatta(v ? `Uno de ${t.nombre} para ${v.p.nombre}, sale` : `${t.nombre}, sale`);
    setTimeout(() => {
      if (v) {
        v.tomando = 2.2;
        v.globo = 4;
        v.etq.actualizar([{ texto: v.p.nombre, tam: 56, color: '#ffd6f0' }, { texto: `💖 ${una(GRACIAS)}`, tam: 42 }]);
        sfx.brillo();
      } else this.tomar(t);
      this.guardar();
    }, 1700);
  }

  tomar(t) {
    const a = this.a;
    const j = this.jugador;
    // El vaso en la mano, a la boca.
    if (j.modelo) {
      const vaso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.55, 10), new THREE.MeshLambertMaterial({ color: t.color, transparent: true, opacity: 0.85 }));
      vaso.position.set(0, -2.1, 0.2);
      j.modelo.manoD.add(vaso);
      j.modelo.brazosSentado = -2.5;
      setTimeout(() => { vaso.parent?.remove(vaso); if (j.modelo && this.sentado !== null) j.modelo.brazosSentado = -1.2; }, 1400);
    }
    this.revisarNoche();
    a.total++;
    a.noche.tragos++;
    a.nivel += t.fuerza;
    sfx.comprar();
    this.alMision?.('trago', a);
  }

  // La "noche" es la vuelta del día en curso (hora del juego); dormir pasa a la siguiente.
  revisarNoche() {
    const id = Math.floor((this.hora() + 60) / 1440);
    if (this.a.noche.id !== id) this.a.noche = { id, tragos: 0, vomitos: 0 };
  }

  // Lo fuerte que pega ahora (0 a 1). Cuánto dura depende de cuánto tomaste.
  mareo() {
    const a = this.estado.alcohol;
    if (!a) return 0;
    const forzado = a.mareoHasta > (this.estado.tiempoJugado || 0);
    return Math.max(forzado ? 1 : 0, Math.min(1, Math.max(0, (a.nivel - 1.5) / 6)));
  }

  // Camina torcido (dir: el vector de movimiento).
  desviar(dir, t) {
    const m = this.mareo();
    if (!m || (!dir.x && !dir.z)) return;
    const ang = Math.sin(t * 1.3) * 0.55 * m + Math.sin(t * 3.1) * 0.2 * m;
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const x = dir.x * c - dir.z * s;
    dir.z = dir.x * s + dir.z * c;
    dir.x = x;
  }

  // Maneja torcido.
  desviarEjes(ejes, t) {
    const m = this.mareo();
    if (m) ejes.x = Math.max(-1, Math.min(1, ejes.x + (Math.sin(t * 1.1) * 0.6 + Math.sin(t * 2.7) * 0.3) * m));
  }

  // Bambolea la cámara.
  camara(cam, t) {
    const m = this.mareo();
    if (!m) return;
    cam.rotateZ(Math.sin(t * 0.9) * 0.1 * m + Math.sin(t * 2.3) * 0.03 * m);
    cam.rotateX(Math.sin(t * 0.7) * 0.04 * m);
  }

  vomitar() {
    const a = this.a;
    const j = this.jugador;
    this.revisarNoche();
    a.noche.vomitos++;
    a.nivel = Math.max(0, a.nivel - 2);
    sfx.error();
    // Chorro verde para adelante y el charco en el piso (se va solo).
    const dir = new THREE.Vector3(Math.sin(j.angulo), 0, Math.cos(j.angulo));
    const charco = new THREE.Mesh(new THREE.CircleGeometry(1.1, 14), new THREE.MeshLambertMaterial({ color: '#8fa63a', transparent: true, opacity: 0.85 }));
    charco.rotation.x = -Math.PI / 2;
    charco.position.set(j.pos.x + dir.x * 1.6, j.pos.y + 0.06, j.pos.z + dir.z * 1.6);
    this.escena.add(charco);
    const gotas = [];
    for (let k = 0; k < 18; k++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), new THREE.MeshLambertMaterial({ color: k % 2 ? '#9db640' : '#c4cf5a' }));
      m.position.set(j.pos.x + dir.x * 0.6, j.pos.y + 4.1 * j.escala, j.pos.z + dir.z * 0.6);
      m.userData.v = new THREE.Vector3(dir.x * (3 + Math.random() * 2) + (Math.random() - 0.5), 1 + Math.random() * 1.5, dir.z * (3 + Math.random() * 2) + (Math.random() - 0.5));
      m.userData.vida = 0.15 * k / 6 + 0.6;
      this.escena.add(m);
      gotas.push(m);
    }
    this.vomitos.push({ charco, gotas, vida: 40 });
    this.alMision?.('vomito', a);
  }

  hora() { return (this.estado.tiempoJugado || 0) + (this.estado.desfaseHora || 0); }

  actualizar(dt, jugador) {
    this.t += dt;
    const a = this.estado.alcohol;
    if (a) {
      // Se va pasando de a poco (cuanto más tomaste, más tarda).
      a.nivel = Math.max(0, a.nivel - dt / 60);
      const forzado = a.mareoHasta > (this.estado.tiempoJugado || 0);
      const nivel = forzado ? Math.max(a.nivel, 7) : a.nivel;
      if (nivel > 6 && Math.random() < dt * (nivel - 5.5) * 0.012) this.vomitar();
    }
    for (let i = this.vomitos.length - 1; i >= 0; i--) {
      const v = this.vomitos[i];
      v.vida -= dt;
      for (const g of v.gotas) {
        if (!g.parent) continue;
        g.userData.vida -= dt;
        g.userData.v.y -= 20 * dt;
        g.position.addScaledVector(g.userData.v, dt);
        if (g.userData.vida <= 0 || g.position.y < jugador.pos.y) this.escena.remove(g);
      }
      if (v.vida <= 0) { this.escena.remove(v.charco); this.vomitos.splice(i, 1); }
    }
    if (!this.listo || !this.lagatta) return;
    if (Math.abs(jugador.pos.x - this.ciudad.grupo.position.x - this.B.xm) > 160) return;
    // Lagatta: va hasta donde estás, prepara (coctelera) y después repasa vasos.
    const l = this.lagatta;
    const m = l.m;
    const dx = l.destino - l.x;
    const camina = Math.abs(dx) > 0.1;
    if (camina) l.x += Math.sign(dx) * Math.min(Math.abs(dx), 5 * dt);
    m.grupo.position.x = l.x;
    m.animar(dt, camina ? 5 : 0, true);
    const { brazoD, brazoI } = m.partes;
    l.coctelera.visible = l.preparando > 0;
    if (l.preparando > 0) {
      l.preparando -= dt;
      const sacude = Math.sin(this.t * 28) * 0.18;
      brazoD.rotation.set(-2.7 + sacude, 0, 0.25);
      brazoI.rotation.set(-2.5 + sacude, 0, -0.35);
    } else if (!camina) {
      // Repasa un vaso con el trapo: el brazo da vueltitas.
      brazoD.rotation.set(-1.25 + Math.sin(this.t * 3) * 0.12, 0, Math.cos(this.t * 3) * 0.25);
      brazoI.rotation.set(-1.1, 0, -0.15);
    }
    if (l.globo > 0 && (l.globo -= dt) <= 0) l.etq.actualizar([{ texto: 'Lagatta', tam: 60, color: '#ffffff' }]);
    if (this.sentado === null && Math.random() < dt * 0.05) l.destino = this.B.xm + (Math.random() - 0.5) * 14;
    // Las chicas: sentadas, toman cada tanto y te miran si estás al lado.
    for (const c of this.chicas || []) {
      c.m.animar(dt, 0, true, false, true);
      c.m.brazosSentado = c.tomando > 0 ? -2.5 : -0.6;
      if (c.tomando > 0) c.tomando -= dt;
      const cerca = this.sentado !== null && Math.abs(c.banqueta - this.sentado) === 1;
      const objetivo = cerca ? Math.sign(this.sentado - c.banqueta) * 0.9 : Math.sin(this.t * 0.3 + c.fase) * 0.25;
      c.m.grupo.rotation.y += (objetivo - c.m.grupo.rotation.y) * Math.min(1, dt * 3);
      if (c.globo > 0 && (c.globo -= dt) <= 0) c.etq.actualizar([{ texto: c.p.nombre, tam: 56, color: '#ffd6f0' }]);
    }
  }
}
