import * as THREE from 'three';
import { CIUDAD as C } from './constantes.js';
import { crearPersonaje } from './personaje.js';
import { cargarCabeza, crearEtiqueta, liberarAlSubir } from './texturas.js';
import { formato } from './util.js';
import { sfx } from './sfx.js';

// Casino Vecibanda, en la ciudad (manzana del casino de ciudad.js), inspirado en el del
// Schedule 1: edificio de ladrillo con la marquesina redonda y la escalinata, y el cartel CASINO
// de neón arriba (de noche, con luces de colores que van cambiando). Adentro, un casino de
// verdad: alfombra de colores, neones en el techo, muchas tragamonedas como las de las fotos,
// blackjack, póker (Casino Hold'em contra la casa) y ruleta europea. Se apuesta con la plata de
// la partida, con las reglas y las chances de verdad, hasta 100 B por apuesta. El crupier de las
// tres mesas es Astrojorge (camina a la mesa donde te sentás). Afuera, el estacionamiento con el
// auto de Astrojorge (con una papa metida en el caño de escape).
//
// Liviano: lo que no se mueve va en la malla de la manzana (ciudad.js) y las caras de las
// tragamonedas y los rodillos son mallas instanciadas (una para todas).

export const LIMITE = 1e11; // 100 B por apuesta
const MINIMO = 10;
const ALTO = 16; // del piso al techo, adentro (alto, así saltando no se llega)
export const CASINO_DESDE = 0.25; // abre cuando la mansión llega al 25%
const PALOS = ['♠', '♥', '♦', '♣'];
const RANGOS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// ---------- Tragamonedas ----------
// Los símbolos del rodillo (en este orden alrededor) y la chance de cada uno en cada rodillo.
// Pagos como en el cartel de las máquinas de la foto: 3 frutas x2, misma fruta x10, 3 campanas
// x25 y 3 sietes x100 (devuelve en promedio el 96% de lo apostado, como una máquina de verdad).
const SIMBOLOS = ['siete', 'cereza', 'limon', 'bar', 'campana', 'naranja', 'uva', 'sandia'];
const FRUTAS = ['cereza', 'limon', 'naranja', 'uva', 'sandia'];
const CHANCE = { siete: 0.08, campana: 0.12, bar: 0.08, cereza: 0.144, limon: 0.144, naranja: 0.144, uva: 0.144, sandia: 0.144 };
export function premioTragamonedas(r) {
  if (r.every((s) => s === 'siete')) return { mult: 100, texto: '¡¡3 SIETES!! JACKPOT' };
  if (r.every((s) => s === 'campana')) return { mult: 25, texto: '¡3 campanas!' };
  if (FRUTAS.includes(r[0]) && r.every((s) => s === r[0])) return { mult: 10, texto: '¡La misma fruta!' };
  if (r.every((s) => FRUTAS.includes(s))) return { mult: 2, texto: '3 frutas' };
  return { mult: 0, texto: '' };
}
const tirarSimbolo = () => {
  let x = Math.random();
  for (const s of SIMBOLOS) if ((x -= CHANCE[s]) < 0) return s;
  return 'sandia';
};

// Dibuja un símbolo en (x, y) de lado t.
function dibujarSimbolo(g, s, x, y, t) {
  g.save();
  g.translate(x + t / 2, y + t / 2);
  const k = t / 100;
  g.scale(k, k);
  g.lineWidth = 4;
  g.strokeStyle = 'rgba(0,0,0,0.55)';
  const bola = (cx, cy, r, color) => { g.fillStyle = color; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill(); g.stroke(); };
  if (s === 'siete') {
    g.font = '900 92px Georgia, serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 10;
    g.strokeStyle = '#7a0000';
    g.strokeText('7', 0, 6);
    g.fillStyle = '#ff1f1f';
    g.fillText('7', 0, 6);
  } else if (s === 'cereza') {
    g.strokeStyle = '#2e7d32';
    g.lineWidth = 6;
    g.beginPath(); g.moveTo(-18, 10); g.quadraticCurveTo(-8, -30, 12, -38); g.moveTo(20, 18); g.quadraticCurveTo(18, -20, 12, -38); g.stroke();
    g.lineWidth = 4;
    g.strokeStyle = 'rgba(0,0,0,0.55)';
    bola(-20, 22, 20, '#e01b2d');
    bola(20, 28, 20, '#c2101f');
  } else if (s === 'limon') {
    g.fillStyle = '#ffe23a';
    g.beginPath(); g.ellipse(0, 0, 40, 28, -0.3, 0, Math.PI * 2); g.fill(); g.stroke();
  } else if (s === 'naranja') {
    bola(0, 4, 36, '#ff8c1a');
    g.fillStyle = '#2e7d32';
    g.beginPath(); g.ellipse(10, -34, 14, 7, -0.4, 0, Math.PI * 2); g.fill();
  } else if (s === 'uva') {
    for (const [cx, cy] of [[-18, -18], [0, -20], [18, -18], [-10, 0], [10, 0], [0, 18], [-20, 16], [20, 16], [0, 36]]) bola(cx, cy, 13, '#7b2fbf');
  } else if (s === 'sandia') {
    g.fillStyle = '#2e9d3e';
    g.beginPath(); g.moveTo(-42, -10); g.arc(0, -10, 42, 0, Math.PI); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#ff3d5a';
    g.beginPath(); g.moveTo(-34, -10); g.arc(0, -10, 34, 0, Math.PI); g.closePath(); g.fill();
    g.fillStyle = '#1b1b1b';
    for (const [cx, cy] of [[-14, 4], [0, 10], [14, 4], [-6, 18], [8, 18]]) { g.beginPath(); g.ellipse(cx, cy, 3, 5, 0, 0, Math.PI * 2); g.fill(); }
  } else if (s === 'campana') {
    g.fillStyle = '#ffc61a';
    g.beginPath();
    g.moveTo(-36, 26); g.quadraticCurveTo(-30, 18, -26, -6); g.quadraticCurveTo(-22, -38, 0, -38);
    g.quadraticCurveTo(22, -38, 26, -6); g.quadraticCurveTo(30, 18, 36, 26); g.closePath(); g.fill(); g.stroke();
    bola(0, 32, 8, '#d18b00');
  } else if (s === 'bar') {
    g.fillStyle = '#111';
    g.fillRect(-44, -20, 88, 40);
    g.strokeStyle = '#ffd54a';
    g.strokeRect(-44, -20, 88, 40);
    g.fillStyle = '#ffd54a';
    g.font = '900 30px Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('BAR', 0, 2);
  }
  g.restore();
}

function lienzo(w, h, dibujar) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  dibujar(c.getContext('2d'), w, h);
  return c;
}
// liberar: el canvas se vacía al subirse (las que no se redibujan; ver texturas.js).
function textura(c, repetir = false, liberar = true) {
  const t = new THREE.CanvasTexture(c);
  if (liberar) liberarAlSubir(t);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repetir) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

// Rodillo: los 8 símbolos uno arriba del otro (se envuelve alrededor del cilindro).
const texRodillo = () => textura(lienzo(128, 1024, (g) => {
  for (let k = 0; k < 8; k++) {
    const y = (7 - k) * 128;
    const fondo = g.createLinearGradient(0, y, 0, y + 128);
    fondo.addColorStop(0, '#e9e4d6');
    fondo.addColorStop(0.5, '#ffffff');
    fondo.addColorStop(1, '#e9e4d6');
    g.fillStyle = fondo;
    g.fillRect(0, y, 128, 128);
    dibujarSimbolo(g, SIMBOLOS[k], 14, y + 14, 100);
  }
}));

// Frente de la máquina (verde, con la ventana de los rodillos y el SELECT AMOUNT de la foto).
const texFrente = () => textura(lienzo(256, 288, (g, w, h) => {
  const fondo = g.createLinearGradient(0, 0, 0, h);
  fondo.addColorStop(0, '#27b04a');
  fondo.addColorStop(1, '#13702b');
  g.fillStyle = fondo;
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#0b2a14';
  g.fillRect(16, 52, w - 32, 132);
  g.strokeStyle = '#ffd54a';
  g.lineWidth = 6;
  g.strokeRect(13, 49, w - 26, 138);
  g.fillStyle = '#ffd54a';
  g.font = '900 24px Arial, sans-serif';
  g.textAlign = 'center';
  g.fillText('VECIBANDA', w / 2, 36);
  g.fillStyle = '#f2f2f2';
  g.font = '800 20px Arial, sans-serif';
  g.fillText('SELECT AMOUNT', w / 2, 220);
  g.fillStyle = '#111';
  g.fillRect(70, 234, 116, 34);
  g.fillStyle = '#7dff6a';
  g.font = '800 22px monospace';
  g.fillText('$ BET', w / 2, 258);
}));

// Cartel de arriba con los pagos (como el de la foto).
const texCartelMaquina = () => textura(lienzo(512, 256, (g, w, h) => {
  g.fillStyle = '#121212';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = '#e8b21a';
  g.lineWidth = 10;
  g.strokeRect(5, 5, w - 10, h - 10);
  g.fillStyle = '#ffffff';
  g.font = '900 28px Arial, sans-serif';
  g.textBaseline = 'middle';
  const fila = (x, y, texto, simbolos) => {
    g.fillText(texto, x, y);
    simbolos.forEach((s, i) => dibujarSimbolo(g, s, x + i * 52, y + 12, 50));
  };
  fila(24, 46, '3 FRUTAS: x2', ['limon', 'uva', 'cereza']);
  fila(270, 46, 'MISMA: x10', ['cereza', 'cereza', 'cereza']);
  fila(24, 156, '3 CAMPANAS: x25', ['campana', 'campana', 'campana']);
  fila(270, 156, '3 SIETES: x100', ['siete', 'siete', 'siete']);
}));

// ---------- Paño de las mesas ----------
const verdePano = (g, w, h) => {
  const f = g.createRadialGradient(w / 2, h * 0.4, 10, w / 2, h / 2, w * 0.7);
  f.addColorStop(0, '#1d8a45');
  f.addColorStop(1, '#0d5a2b');
  g.fillStyle = f;
  g.fillRect(0, 0, w, h);
};
const texBlackjack = () => textura(lienzo(1024, 512, (g, w, h) => {
  verdePano(g, w, h);
  g.fillStyle = '#f2e9c9';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  // El paño es medio círculo: el lado recto (el del crupier) queda arriba en la textura.
  g.font = '700 92px Georgia, serif';
  g.fillText('BLACKJACK', w / 2, 120);
  g.font = '600 30px Georgia, serif';
  g.fillText('El crupier pide hasta 16 y se planta en 17', w / 2, 200);
  g.fillStyle = '#f08a1c';
  g.beginPath(); g.moveTo(250, 236); g.lineTo(774, 236); g.lineTo(750, 266); g.lineTo(774, 296); g.lineTo(250, 296); g.lineTo(274, 266); g.closePath(); g.fill();
  g.fillStyle = '#fff3d6';
  g.font = '800 30px Georgia, serif';
  g.fillText('BLACKJACK PAGA 3 A 2', w / 2, 268);
  g.strokeStyle = '#f2e9c9';
  g.lineWidth = 4;
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * (0.18 + i * 0.16);
    g.beginPath();
    g.ellipse(w / 2 - Math.cos(a) * 400, 30 + Math.sin(a) * 420, 46, 34, 0, 0, Math.PI * 2);
    g.stroke();
  }
}));
const texPoker = () => textura(lienzo(1024, 512, (g, w, h) => {
  verdePano(g, w, h);
  g.fillStyle = '#f2e9c9';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '700 70px Georgia, serif';
  g.fillText("CASINO HOLD'EM", w / 2, 150);
  g.font = '600 26px Georgia, serif';
  g.fillText('El crupier califica con par de 4 o más', w / 2, 210);
  g.strokeStyle = '#f2e9c9';
  g.lineWidth = 4;
  for (let i = 0; i < 5; i++) g.strokeRect(w / 2 - 230 + i * 94, 250, 80, 110);
  g.font = '600 22px Georgia, serif';
  g.fillText('Escalera real 100 · Esc. de color 20 · Póker 10 · Full 3 · Color 2 · El resto 1', w / 2, 400);
}));
// Ruleta europea: el número en cada casillero y su color.
const ROJOS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const colorNumero = (n) => (n === 0 ? 'verde' : ROJOS.has(n) ? 'rojo' : 'negro');
const RUEDA = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const HEX = { rojo: '#c8102e', negro: '#141414', verde: '#0f8a3c' };
const texPanoRuleta = () => textura(lienzo(1024, 512, (g, w, h) => {
  verdePano(g, w, h);
  const x0 = 110;
  const cw = 64;
  const y0 = 60;
  const ch = 96;
  g.lineWidth = 3;
  g.strokeStyle = '#f2e9c9';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '800 32px Georgia, serif';
  // El cero a la izquierda y los números en tres filas.
  g.fillStyle = HEX.verde;
  g.fillRect(x0 - 80, y0, 80, ch * 3);
  g.strokeRect(x0 - 80, y0, 80, ch * 3);
  g.fillStyle = '#fff';
  g.fillText('0', x0 - 40, y0 + ch * 1.5);
  for (let n = 1; n <= 36; n++) {
    const col = Math.floor((n - 1) / 3);
    const fila = 2 - ((n - 1) % 3);
    const x = x0 + col * cw;
    const y = y0 + fila * ch;
    g.strokeRect(x, y, cw, ch);
    g.fillStyle = HEX[colorNumero(n)];
    g.beginPath(); g.ellipse(x + cw / 2, y + ch / 2, 26, 30, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff';
    g.fillText(String(n), x + cw / 2, y + ch / 2 + 2);
  }
  g.font = '700 22px Georgia, serif';
  for (let f = 0; f < 3; f++) { g.strokeRect(x0 + 12 * cw, y0 + f * ch, 70, ch); g.fillStyle = '#f2e9c9'; g.fillText('2 a 1', x0 + 12 * cw + 35, y0 + f * ch + ch / 2); }
  const abajo = y0 + ch * 3;
  ['1ª 12', '2ª 12', '3ª 12'].forEach((t, i) => { g.strokeRect(x0 + i * 4 * cw, abajo, 4 * cw, 50); g.fillText(t, x0 + i * 4 * cw + 2 * cw, abajo + 25); });
  ['1-18', 'PAR', '◆', '◆', 'IMPAR', '19-36'].forEach((t, i) => {
    g.strokeRect(x0 + i * 2 * cw, abajo + 50, 2 * cw, 50);
    g.fillStyle = t === '◆' ? (i === 2 ? HEX.rojo : '#000') : '#f2e9c9';
    g.font = t === '◆' ? '900 40px Arial' : '700 22px Georgia, serif';
    g.fillText(t, x0 + i * 2 * cw + cw, abajo + 76);
    g.fillStyle = '#f2e9c9';
  });
}));
// La rueda vista desde arriba: 37 casilleros en el orden europeo, con los números.
const texRueda = () => textura(lienzo(512, 512, (g, w) => {
  const m = w / 2;
  g.fillStyle = '#6b3a12';
  g.beginPath(); g.arc(m, m, m, 0, Math.PI * 2); g.fill();
  const paso = (Math.PI * 2) / 37;
  for (let k = 0; k < 37; k++) {
    const a = k * paso;
    g.fillStyle = HEX[colorNumero(RUEDA[k])];
    g.beginPath();
    g.moveTo(m, m);
    g.arc(m, m, m * 0.96, a - paso / 2, a + paso / 2);
    g.closePath();
    g.fill();
    g.save();
    g.translate(m + Math.cos(a) * m * 0.85, m + Math.sin(a) * m * 0.85);
    g.rotate(a + Math.PI / 2);
    g.fillStyle = '#fff';
    g.font = '800 22px Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(RUEDA[k]), 0, 0);
    g.restore();
  }
  // Los separadores de los casilleros (donde cae la bolita) y el centro de madera y oro.
  g.strokeStyle = '#d9c38a';
  g.lineWidth = 2;
  for (let k = 0; k < 37; k++) {
    const a = k * paso + paso / 2;
    g.beginPath(); g.moveTo(m + Math.cos(a) * m * 0.55, m + Math.sin(a) * m * 0.55); g.lineTo(m + Math.cos(a) * m * 0.75, m + Math.sin(a) * m * 0.75); g.stroke();
  }
  g.fillStyle = '#7a4416';
  g.beginPath(); g.arc(m, m, m * 0.55, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#e0b84a';
  g.lineWidth = 6;
  for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2; g.beginPath(); g.moveTo(m, m); g.lineTo(m + Math.cos(a) * m * 0.5, m + Math.sin(a) * m * 0.5); g.stroke(); }
}));

// Alfombra de casino (como la de las fotos): roja con firuletes, flores y hojas de colores.
const texAlfombra = () => textura(lienzo(512, 512, (g, w) => {
  g.fillStyle = '#9e0f1c';
  g.fillRect(0, 0, w, w);
  // Fondo con vetas más oscuras (para que no sea liso).
  for (let k = 0; k < 900; k++) {
    g.fillStyle = k % 2 ? 'rgba(60,0,8,0.18)' : 'rgba(255,80,60,0.08)';
    g.fillRect((k * 131) % w, (k * 197) % w, 3 + (k % 5), 2);
  }
  // Se dibuja todo repetido en los bordes, así el mosaico no se nota.
  const rep = (f) => { for (const dx of [-w, 0, w]) for (const dy of [-w, 0, w]) { g.save(); g.translate(dx, dy); f(); g.restore(); } };
  const rulo = (x, y, r, a, color, ancho) => {
    g.strokeStyle = color;
    g.lineWidth = ancho;
    g.beginPath();
    for (let t = 0; t < 1; t += 0.02) {
      const rr = r * (1 - t * 0.85);
      const aa = a + t * Math.PI * 3;
      const px = x + Math.cos(aa) * rr;
      const py = y + Math.sin(aa) * rr;
      if (t) g.lineTo(px, py); else g.moveTo(px, py);
    }
    g.stroke();
  };
  const flor = (x, y, r, petalo, centro) => {
    g.fillStyle = petalo;
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3;
      g.beginPath();
      g.ellipse(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.5, r * 0.28, a, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = centro;
    g.beginPath(); g.arc(x, y, r * 0.3, 0, Math.PI * 2); g.fill();
  };
  const hoja = (x, y, l, a, color) => {
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = color;
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(l * 0.5, -l * 0.35, l, 0); g.quadraticCurveTo(l * 0.5, l * 0.35, 0, 0); g.fill();
    g.restore();
  };
  rep(() => {
    const puntos = [[90, 100], [350, 70], [230, 260], [450, 330], [110, 400], [320, 460]];
    puntos.forEach(([x, y], i) => {
      rulo(x, y, 70, i, '#f2b31a', 7);
      rulo(x + 40, y - 30, 40, i + 2, '#e8752a', 5);
      rulo(x - 50, y + 35, 34, i + 4, '#2ab7a9', 5);
      for (let k = 0; k < 4; k++) hoja(x + 20, y + 10, 34, i + k * 1.6, k % 2 ? '#2e8b57' : '#1fa0a0');
      flor(x, y, 26, ['#ffcc33', '#ff6fa8', '#7a3ff0', '#ff8c1a', '#33d1c4', '#ffe066'][i], '#3a0008');
      flor(x + 70, y + 60, 12, '#f5e2b8', '#c0392b');
    });
    for (let k = 0; k < 14; k++) flor((k * 97) % w, (k * 173 + 40) % w, 7, '#ffd75e', '#9e0f1c');
  });
}), true);

// Pared de adentro (un paño de 4 de ancho por todo el alto): abajo boiserie de madera con molduras
// doradas, arriba tapiz adamascado bordó con dibujos dorados, y una cornisa dorada arriba.
const texPared = () => textura(lienzo(256, 768, (g, w, h) => {
  const corte = h - (4.2 / ALTO) * h; // donde termina la madera
  // Tapiz.
  g.fillStyle = '#5a0c1e';
  g.fillRect(0, 0, w, corte);
  g.fillStyle = 'rgba(232,180,80,0.55)';
  for (let y = 40; y < corte - 20; y += 120) {
    for (const x of [64, 192]) {
      const dy = x === 192 ? 60 : 0;
      g.save(); g.translate(x, y + dy);
      g.beginPath();
      g.moveTo(0, -38); g.bezierCurveTo(26, -28, 30, -6, 0, 0); g.bezierCurveTo(-30, -6, -26, -28, 0, -38);
      g.moveTo(0, 38); g.bezierCurveTo(26, 28, 30, 6, 0, 0); g.bezierCurveTo(-30, 6, -26, 28, 0, 38);
      g.fill();
      g.beginPath(); g.ellipse(0, 0, 9, 14, 0, 0, Math.PI * 2); g.fill();
      g.restore();
    }
  }
  // Moldura dorada y la madera con dos paneles.
  const oro = g.createLinearGradient(0, corte - 14, 0, corte + 6);
  oro.addColorStop(0, '#fff0a8'); oro.addColorStop(0.5, '#d4a93a'); oro.addColorStop(1, '#7a5512');
  g.fillStyle = oro;
  g.fillRect(0, corte - 12, w, 16);
  const mad = g.createLinearGradient(0, corte, 0, h);
  mad.addColorStop(0, '#4a1d0e'); mad.addColorStop(1, '#2a0f06');
  g.fillStyle = mad;
  g.fillRect(0, corte + 4, w, h - corte - 4);
  g.strokeStyle = '#d4a93a';
  g.lineWidth = 4;
  for (const x of [14, 136]) g.strokeRect(x, corte + 26, 106, h - corte - 70);
  g.fillStyle = '#1b0a04';
  g.fillRect(0, h - 22, w, 22); // zócalo
  // Cornisa arriba.
  g.fillStyle = oro;
  g.fillRect(0, 0, w, 18);
}), true, false); // se clona para cada pared: no se puede vaciar

// Cielorraso artesonado dorado (como el de la foto del casino de lujo), con una luz en cada casetón.
const texTecho = () => textura(lienzo(256, 256, (g, w) => {
  g.fillStyle = '#e9c98a';
  g.fillRect(0, 0, w, w);
  const fondo = g.createRadialGradient(w / 2, w / 2, 10, w / 2, w / 2, w * 0.45);
  fondo.addColorStop(0, '#fff3d0'); fondo.addColorStop(1, '#c98f42');
  g.fillStyle = fondo;
  g.fillRect(28, 28, w - 56, w - 56);
  g.strokeStyle = '#f7e4b0'; g.lineWidth = 6; g.strokeRect(28, 28, w - 56, w - 56);
  g.strokeStyle = '#8a5a1c'; g.lineWidth = 3; g.strokeRect(40, 40, w - 80, w - 80);
  const luz = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, 26);
  luz.addColorStop(0, '#ffffff'); luz.addColorStop(0.4, '#fff6c8'); luz.addColorStop(1, 'rgba(255,240,180,0)');
  g.fillStyle = luz;
  g.beginPath(); g.arc(w / 2, w / 2, 26, 0, Math.PI * 2); g.fill();
}), true);

// Halo de luz (se suma a lo que hay atrás): los charcos de luz en la alfombra y en las paredes.
const texHalo = () => textura(lienzo(128, 128, (g) => {
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,255,0.9)');
  r.addColorStop(0.35, 'rgba(255,255,255,0.4)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
}));

// Ladrillo a la vista (la fachada).
const texLadrillo = () => textura(lienzo(128, 128, (g) => {
  g.fillStyle = '#d9d0c4';
  g.fillRect(0, 0, 128, 128);
  for (let f = 0; f < 8; f++) {
    for (let k = -1; k < 4; k++) {
      const x = k * 40 + (f % 2) * 20;
      const tono = 0.85 + ((f * 7 + k * 13) % 5) * 0.04;
      g.fillStyle = `rgb(${Math.round(176 * tono)},${Math.round(74 * tono)},${Math.round(52 * tono)})`;
      g.fillRect(x + 2, f * 16 + 2, 36, 12);
    }
  }
}), true);

// Letra de neón (blanca, se tiñe con el color del material).
const texLetra = (l) => textura(lienzo(128, 160, (g) => {
  g.font = '900 140px Arial Black, Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = '#ffffff';
  g.shadowBlur = 18;
  g.lineWidth = 10;
  g.strokeStyle = '#ffffff';
  g.strokeText(l, 64, 84);
  g.fillStyle = 'rgba(255,255,255,0.55)';
  g.fillText(l, 64, 84);
}));

// Cartel pintado (el del auto de Astrojorge y el del lugar reservado).
const texTexto = (lineas, w, h, fondo, color, fuente) => textura(lienzo(w, h, (g) => {
  if (fondo) { g.fillStyle = fondo; g.fillRect(0, 0, w, h); }
  g.fillStyle = color;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  lineas.forEach((t, i) => { g.font = fuente; g.fillText(t, w / 2, (h / (lineas.length + 1)) * (i + 1)); });
}));

// La papa del caño de escape: bulto irregular (un icosaedro abollado con ruido), con la cáscara
// pintada (manchas, ojitos y tierra) y un brote chiquito.
function crearPapa(x, y, z) {
  const geo = new THREE.IcosahedronGeometry(0.2, 3);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let k = 0; k < pos.count; k++) {
    v.fromBufferAttribute(pos, k);
    const n = v.clone().normalize();
    const bollo = 1 + 0.06 * Math.sin(n.x * 4 + n.y * 2) * Math.cos(n.z * 3) + 0.02 * Math.sin(n.y * 9 + n.z * 4);
    v.multiplyScalar(bollo);
    pos.setXYZ(k, v.x * 1.65, v.y * 1.0, v.z * 1.12);
  }
  geo.computeVertexNormals();
  const piel = textura(lienzo(256, 128, (g, w, h) => {
    g.fillStyle = '#e6c27f';
    g.fillRect(0, 0, w, h);
    for (let k = 0; k < 500; k++) {
      g.fillStyle = k % 3 ? 'rgba(150,105,55,0.18)' : 'rgba(250,225,170,0.35)';
      g.beginPath(); g.ellipse((k * 73) % w, (k * 41) % h, 2 + (k % 4), 1 + (k % 3), k, 0, Math.PI * 2); g.fill();
    }
    for (const [ox, oy] of [[40, 40], [120, 80], [200, 30], [170, 100], [80, 100]]) {
      g.fillStyle = '#6b4a22';
      g.beginPath(); g.ellipse(ox, oy, 6, 3, 0.4, 0, Math.PI * 2); g.fill(); // ojito
      g.fillStyle = 'rgba(120,85,40,0.2)';
      g.beginPath(); g.arc(ox, oy, 9, 0, Math.PI * 2); g.fill();
    }
  }));
  const papa = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: piel, emissive: '#3a2a12' }));
  papa.position.set(x, y, z);
  papa.rotation.set(0.3, 0.2, -0.15);
  const brote = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.12, 5), new THREE.MeshLambertMaterial({ color: '#d9d2a0' }));
  brote.position.set(-0.18, 0.17, 0.05);
  brote.rotation.z = 0.6;
  papa.add(brote);
  return papa;
}

// ---------- Cartas ----------
const valorCarta = (c) => (c.r === 0 ? 11 : Math.min(10, c.r + 1));
function totalBJ(cartas) {
  let t = 0;
  let ases = 0;
  for (const c of cartas) { t += valorCarta(c); if (c.r === 0) ases++; }
  while (t > 21 && ases) { t -= 10; ases--; }
  return { t, blanda: ases > 0 };
}
const esBJ = (cartas) => cartas.length === 2 && totalBJ(cartas).t === 21;

// Póker: la mejor mano de 5 entre 7 cartas. Devuelve [categoría, desempates...].
const NOMBRES_MANO = ['Carta alta', 'Par', 'Doble par', 'Trío', 'Escalera', 'Color', 'Full', 'Póker', 'Escalera de color', 'Escalera real'];
function mano5(cs) {
  const v = cs.map((c) => (c.r === 0 ? 14 : c.r + 1)).sort((a, b) => b - a);
  const color = cs.length === 5 && cs.every((c) => c.p === cs[0].p); // con menos de 5 (antes del river) solo cuentan pares y tríos
  const unicos = [...new Set(v)];
  let alta = 0;
  if (unicos.length === 5 && cs.length === 5) {
    if (v[0] - v[4] === 4) alta = v[0];
    else if (v.join() === '14,5,4,3,2') alta = 5; // la escalera con el as abajo
  }
  const cuenta = {};
  for (const x of v) cuenta[x] = (cuenta[x] || 0) + 1;
  const grupos = Object.entries(cuenta).map(([x, n]) => [n, +x]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  const orden = grupos.map((gr) => gr[1]);
  if (alta && color) return [alta === 14 ? 9 : 8, alta];
  if (grupos[0][0] === 4) return [7, ...orden];
  if (grupos[0][0] === 3 && grupos[1]?.[0] === 2) return [6, ...orden];
  if (color) return [5, ...v];
  if (alta) return [4, alta];
  if (grupos[0][0] === 3) return [3, ...orden];
  if (grupos[0][0] === 2 && grupos[1]?.[0] === 2) return [2, ...orden];
  if (grupos[0][0] === 2) return [1, ...orden];
  return [0, ...v];
}
const comparar = (a, b) => { for (let i = 0; i < Math.max(a.length, b.length); i++) if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) - (b[i] || 0); return 0; };
export function mejorMano(cs) {
  if (cs.length <= 5) return mano5(cs);
  // Todas las combinaciones de 5 (21 con 7 cartas, 6 con 6).
  let mejor = null;
  const elegir = (desde, cinco) => {
    if (cinco.length === 5) {
      const m = mano5(cinco);
      if (!mejor || comparar(m, mejor) > 0) mejor = m;
      return;
    }
    for (let i = desde; i <= cs.length - (5 - cinco.length); i++) elegir(i + 1, [...cinco, cs[i]]);
  };
  elegir(0, []);
  return mejor;
}
const PAGO_ANTE = [1, 1, 1, 1, 1, 2, 3, 10, 20, 100]; // por categoría

// Canvas de una carta (para la mesa 3D).
function canvasCarta(c) {
  return lienzo(128, 180, (g, w, h) => {
    g.fillStyle = '#ffffff';
    g.beginPath(); g.roundRect(2, 2, w - 4, h - 4, 12); g.fill();
    if (!c) {
      g.fillStyle = '#b3122a';
      g.beginPath(); g.roundRect(10, 10, w - 20, h - 20, 8); g.fill();
      g.strokeStyle = '#ffd7a0';
      g.lineWidth = 2;
      for (let i = -h; i < w + h; i += 12) { g.beginPath(); g.moveTo(i, 10); g.lineTo(i + h, h - 10); g.stroke(); }
      return;
    }
    const rojo = c.p === 1 || c.p === 2;
    g.fillStyle = rojo ? '#c8102e' : '#111';
    g.font = '800 34px Arial, sans-serif';
    g.textAlign = 'center';
    g.fillText(RANGOS[c.r], 26, 40);
    g.font = '30px Arial, sans-serif';
    g.fillText(PALOS[c.p], 26, 72);
    g.font = '86px Arial, sans-serif';
    g.textBaseline = 'middle';
    g.fillText(PALOS[c.p], w / 2 + 6, h / 2 + 18);
  });
}

// ---------- Astrojorge ----------
export const ASTROJORGE = {
  id: 'astrojorge', nombre: 'Astrojorge', foto: 'astrojorge_cara.jpeg', pelo: '#ebe9e3', peinado: 'liso', calva: true,
  gordura: -0.35, remera: '#f4f4f0', pantalon: '#17171b', mangasLargas: true,
  remeraFotos: { frente: 'ropa/astrojorge_frente.jpg', tela: 'ropa/astrojorge_tela.jpg', espalda: 'ropa/astrojorge_espalda.jpg' },
};
const FRASES = {
  bienvenida: ['Bienvenido, hagan sus apuestas', 'Pase, pase, que la suerte está caliente', 'Hoy es su noche, se lo digo yo'],
  ganaste: ['¡Felicitaciones!', '¡Qué mano!', 'La casa paga, señor'],
  perdiste: ['La casa gana... esta vez', 'Mala suerte, la próxima sale', 'Uy, casi'],
  ruleta: ['No va más'],
};
const una = (l) => l[Math.floor(Math.random() * l.length)];

export class Casino {
  constructor({ ciudad, escena, estado, ui, guardar, progreso }) {
    this.progreso = progreso;
    this.abierto = null;
    this.ciudad = ciudad;
    this.escena = escena;
    this.estado = estado;
    this.ui = ui;
    this.guardar = guardar;
    this.listo = false;
    this.jugando = null; // { tipo, ... } mientras estás en un juego
    this.maquinas = [];
    this.mesas = {};
    this.cartas3d = [];
    this.texCartas = new Map();
    this.reloj = 0;
    this.apuesta = 0;
    this.historial = [];
    ciudad.casino = this;
    // Materiales propios de la malla de la manzana (ciudad.js los usa por nombre).
    const basico = () => new THREE.MeshBasicMaterial({ vertexColors: true });
    Object.assign(ciudad.materiales, {
      ladrillo: new THREE.MeshLambertMaterial({ vertexColors: true, map: texLadrillo() }),
      tira0: basico(), tira1: basico(), tira2: basico(), // luces que titilan (de a tres grupos)
    });
    this.armarPanel();
  }

  // Coordenadas del casino (las de la ciudad) a partir de la u (izquierda a derecha, mirando la
  // entrada) y la v (de la puerta hacia el fondo).
  xu(u) { return this.b.x0 + u; }
  zv(v) { return this.b.z0 + v; }

  // ---------- Construcción (la llama ciudad.js al armar la manzana) ----------
  armar(c, lote, PISO) {
    const b = { x0: lote.x0 + 1, x1: lote.x0 + 41, z0: lote.z0 + 11, z1: lote.z1 - 1 };
    this.b = b;
    const F = PISO + 0.9; // piso de adentro (se sube por la escalinata)
    this.F = F;
    this.PISO = PISO;
    const xm = (b.x0 + b.x1) / 2;
    const s = this.ciudad.solido.bind(this.ciudad);
    // Vereda/plaza de adelante y el piso de adentro.
    c.piso(lote.x0, lote.z0, lote.x1, lote.z1, PISO + 0.02, '#a49c90');
    c.caja(b.x0, PISO, b.z0, b.x1, F, b.z1, '#8f877c');
    s(b.x0, 0, b.z0, b.x1, F, b.z1);
    // Paredes de ladrillo (con la abertura de la puerta adelante) y el zócalo de piedra.
    const techo = F + ALTO + 1;
    const pared = (x0, z0, x1, z1) => {
      c.caja(x0, F, z0, x1, techo, z1, '#ffffff', { lados: 'ladrillo', base: F, arriba: '#5b5b5b' });
      s(x0, 0, z0, x1, techo, z1);
    };
    const puerta = 3.2;
    pared(b.x0, b.z0, xm - puerta, b.z0 + 0.6);
    pared(xm + puerta, b.z0, b.x1, b.z0 + 0.6);
    c.caja(xm - puerta, F + 7, b.z0, xm + puerta, techo, b.z0 + 0.6, '#ffffff', { lados: 'ladrillo', base: F, arriba: '#5b5b5b' });
    s(xm - puerta, F + 7, b.z0, xm + puerta, techo, b.z0 + 0.6);
    pared(b.x0, b.z1 - 0.6, b.x1, b.z1);
    pared(b.x0, b.z0, b.x0 + 0.6, b.z1);
    pared(b.x1 - 0.6, b.z0, b.x1, b.z1);
    // Zócalo de piedra: una franja por afuera de las paredes (al frente, cortada en la puerta).
    const zocalo = (x0, z0, x1, z1) => c.caja(x0, PISO, z0, x1, F + 0.8, z1, '#a9a39a');
    zocalo(b.x0 - 0.25, b.z0 - 0.25, xm - puerta, b.z0);
    zocalo(xm + puerta, b.z0 - 0.25, b.x1 + 0.25, b.z0);
    zocalo(b.x0 - 0.25, b.z1, b.x1 + 0.25, b.z1 + 0.25);
    zocalo(b.x0 - 0.25, b.z0, b.x0, b.z1);
    zocalo(b.x1, b.z0, b.x1 + 0.25, b.z1);
    c.caja(b.x0 - 0.5, techo - 0.7, b.z0 - 0.5, b.x1 + 0.5, techo, b.z1 + 0.5, '#e3dccd');
    c.caja(b.x0 - 0.3, techo, b.z0 - 0.3, b.x1 + 0.3, techo + 0.8, b.z1 + 0.3, '#d6cfbf', { arriba: '#4e4e4e' });
    // Techo de adentro (oscuro) con los neones.
    c.caja(b.x0 + 0.6, F + ALTO, b.z0 + 0.6, b.x1 - 0.6, F + ALTO + 0.2, b.z1 - 0.6, '#150a1c', { abajo: true, arriba: '#4e4e4e' });
    // Ventanales al frente (se ve el casino iluminado adentro) y ventanas en los costados.
    for (const [x0, x1] of [[b.x0 + 3, xm - 6], [xm + 6, b.x1 - 3]]) {
      c.caja(x0 - 0.3, F + 1.2, b.z0 - 0.08, x1 + 0.3, F + 7.3, b.z0, '#d8d2c6');
      c.caja(x0, F + 1.5, b.z0 - 0.12, x1, F + 7, b.z0 - 0.04, '#ffb36b', { lados: 'luz' });
      for (let x = x0; x <= x1 + 0.01; x += (x1 - x0) / 4) c.caja(x - 0.1, F + 1.5, b.z0 - 0.2, x + 0.1, F + 7, b.z0 - 0.08, '#2a2a2a');
    }
    for (const [x, signo] of [[b.x0, -1], [b.x1, 1]]) {
      for (let z = b.z0 + 6; z < b.z1 - 4; z += 8) {
        c.caja(Math.min(x, x + signo * 0.12), F + 4, z, Math.max(x, x + signo * 0.12), F + 9, z + 4, '#ffb36b', { lados: 'luz' });
        c.caja(Math.min(x, x + signo * 0.2), F + 3.8, z - 0.2, Math.max(x, x + signo * 0.2), F + 4, z + 4.2, '#d8d2c6');
      }
    }
    // Puertas de vidrio abiertas y el marco dorado.
    for (const lado of [-1, 1]) {
      const x = xm + lado * puerta;
      c.caja(Math.min(x, x - lado * 0.15), F, b.z0 + 0.6, Math.max(x, x - lado * 0.15), F + 7, b.z0 + 3.4, '#cfe6f5', { lados: 'cristal' });
      c.caja(x - 0.18, F, b.z0 - 0.05, x + 0.18, F + 7.2, b.z0 + 0.65, '#d4a93a');
    }
    c.caja(xm - puerta, F + 7, b.z0 - 0.05, xm + puerta, F + 7.3, b.z0 + 0.65, '#d4a93a');
    // Hasta el 25%: la puerta tiene un choque (se corre lejos al abrir) y el cartel de CERRADO.
    this.cierre = s(xm - puerta, 0, b.z0 - 0.4, xm + puerta, F + 7, b.z0 + 0.6);
    this.cierreCaja = this.cierre.clone();
    this.avisoCerrado = crearEtiqueta([{ texto: `CERRADO · ABRE AL ${Math.round(CASINO_DESDE * 100)}%`, tam: 60, color: '#ffd23f' }], 9);
    this.avisoCerrado.sprite.position.set(xm, F + 5, b.z0 - 1.5);
    this.ciudad.grupo.add(this.avisoCerrado.sprite);
    this.puertaX = xm;
    // Marquesina redonda (medio cilindro contra la fachada), con dos columnas y lamparitas abajo.
    const R = 7.4;
    const mq = new THREE.CylinderGeometry(R, R, 1.1, 32, 1, false, Math.PI / 2, Math.PI);
    mq.translate(xm, F + 8.05, b.z0);
    c.forma('liso', mq, '#3a4650');
    const borde = new THREE.CylinderGeometry(R + 0.12, R + 0.12, 0.3, 32, 1, true, Math.PI / 2, Math.PI);
    borde.translate(xm, F + 7.7, b.z0);
    c.forma('liso', borde, '#d4a93a');
    for (let k = 0; k <= 16; k++) {
      const a = Math.PI / 2 + (k / 16) * Math.PI;
      const x = xm + Math.sin(a) * (R - 0.1);
      const z = b.z0 + Math.cos(a) * (R - 0.1);
      c.caja(x - 0.16, F + 7.35, z - 0.16, x + 0.16, F + 7.55, z + 0.16, '#fff1b0', { lados: `tira${k % 3}`, abajo: true });
    }
    for (const lado of [-1, 1]) {
      const a = lado * 0.95;
      const x = xm + Math.sin(a) * (R - 0.8);
      const z = b.z0 - Math.cos(a) * (R - 0.8);
      c.cil(0.35, 0.4, 7.5, '#efe7d6', x, F, z, 12);
      s(x - 0.4, 0, z - 0.4, x + 0.4, F + 7.5, z + 0.4);
    }
    this.marquesina = { x: xm, y: F + 8.6, z: b.z0 - R + 0.9 };
    // Escalinata redonda (tres escalones de medio círculo). Los choques, con cajas adentro del arco.
    const escalones = [[5.2, F], [6.4, F - 0.3], [7.6, F - 0.6]];
    for (const [r, y] of escalones) {
      const e = new THREE.CylinderGeometry(r, r, y - PISO, 32, 1, false, Math.PI / 2, Math.PI);
      e.translate(xm, PISO + (y - PISO) / 2, b.z0);
      c.forma('liso', e, '#7c6f66');
      for (const [fx, fz] of [[0.38, 0.92], [0.71, 0.71], [0.92, 0.38]]) s(xm - r * fx, 0, b.z0 - r * fz, xm + r * fx, y, b.z0);
    }
    // Pinos a los costados de la entrada, tacho, farol y teléfono público (como en la foto).
    for (const x of [b.x0 + 2.5, b.x1 - 2.5]) {
      const z = b.z0 - 4;
      c.caja(x - 0.3, PISO, z - 0.3, x + 0.3, PISO + 3, z + 0.3, '#6d4c34');
      for (const [r, y, h] of [[3, 2.5, 5], [2.3, 5.5, 4.5], [1.5, 8.4, 3.5]]) {
        const k = new THREE.ConeGeometry(r, h, 8);
        k.translate(x, PISO + y + h / 2, z);
        c.forma('liso', k, '#2f5d3a');
      }
      s(x - 0.4, 0, z - 0.4, x + 0.4, PISO + 6, z + 0.4);
    }
    c.caja(xm - 10, PISO, b.z0 - 3.2, xm - 9, PISO + 1.6, b.z0 - 2.2, '#3d3f43');
    c.caja(xm + 9.4, PISO, b.z0 - 2.6, xm + 10.4, PISO + 3.4, b.z0 - 2.1, '#3c5fa8');
    c.caja(xm + 9.55, PISO + 1.6, b.z0 - 2.7, xm + 10.25, PISO + 3.1, b.z0 - 2.6, '#cfd8dc');

    this.armarAdentro(c, b, F);
    this.armarEstacionamiento(c, lote, b, PISO);
    this.armarCartel(F);
    this.listo = true;
  }

  armarAdentro(c, b, F) {
    const s = this.ciudad.solido.bind(this.ciudad);
    const x0 = b.x0 + 0.6;
    const x1 = b.x1 - 0.6;
    const z0 = b.z0 + 0.6;
    const z1 = b.z1 - 0.6;
    // Paredes de adentro: boiserie y tapiz (una malla por pared, con la textura repetida cada 4).
    const matPared = new THREE.MeshLambertMaterial({ map: texPared() });
    const pared = (xa, za, xb, zb) => {
      const largo = Math.hypot(xb - xa, zb - za);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(largo, ALTO), matPared.clone());
      m.material.map = matPared.map.clone();
      m.material.map.repeat.set(largo / 4, 1);
      m.material.map.needsUpdate = true;
      m.position.set((xa + xb) / 2, F + ALTO / 2, (za + zb) / 2);
      m.rotation.y = Math.atan2(zb - za, xa - xb) ; // la cara mira para adentro
      this.ciudad.grupo.add(m);
    };
    pared(x0, z1 - 0.01, x1, z1 - 0.01);
    pared(x0 + 0.01, z0, x0 + 0.01, z1);
    pared(x1 - 0.01, z1, x1 - 0.01, z0);
    pared(b.x0 + 16.6, z0 + 0.01, x0, z0 + 0.01);
    pared(x1, z0 + 0.01, b.x0 + 23.4, z0 + 0.01);
    // Columnas doradas contra las paredes (con luz que sube) y apliques encendidos entre columnas.
    const columna = (x, z, nx, nz) => {
      c.caja(x - 0.45, F, z - 0.45, x + 0.45, F + ALTO, z + 0.45, '#d9b25a', { arriba: '#d9b25a' });
      c.caja(x - 0.6, F, z - 0.6, x + 0.6, F + 0.8, z + 0.6, '#8a5a1c');
      c.caja(x - 0.6, F + ALTO - 0.8, z - 0.6, x + 0.6, F + ALTO, z + 0.6, '#f0d27a');
      this.halos.push([x + nx * 0.5, F + 2.4, z + nz * 0.5, 2.2, '#ffcf6a', 'pared', nx, nz]); // luz que sube
    };
    const aplique = (x, z, nx, nz) => {
      c.caja(x - 0.25 + nx * 0.2, F + 6.4, z - 0.25 + nz * 0.2, x + 0.25 + nx * 0.2, F + 7.1, z + 0.25 + nz * 0.2, '#fff1c4', { lados: 'luz' });
      this.halos.push([x + nx * 0.05, F + 6.8, z + nz * 0.05, 2.6, '#ffb84a', 'pared', nx, nz]);
    };
    this.halos = [];
    for (let z = z0 + 4; z < z1 - 1; z += 8) { columna(x0 + 0.45, z, 1, 0); columna(x1 - 0.45, z, -1, 0); aplique(x0, z + 4, 1, 0); aplique(x1, z + 4, -1, 0); }
    for (let x = x0 + 4; x < x1 - 1; x += 8) { columna(x, z1 - 0.45, 0, -1); aplique(x + 4, z1, 0, -1); }
    // Neón fucsia en la cornisa, alrededor de todo (como en la foto).
    for (const [a0, c0, a1, c1] of [[x0, z1 - 0.3, x1, z1], [x0, z0, x0 + 0.3, z1], [x1 - 0.3, z0, x1, z1], [x0, z0, x1, z0 + 0.3]]) {
      c.caja(a0, F + ALTO - 1.1, c0, a1, F + ALTO - 0.9, c1, '#ff2fd0', { lados: 'luz', abajo: true });
    }
    // Cielorraso artesonado.
    const techo = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), new THREE.MeshBasicMaterial({ map: texTecho(), color: '#d8c3a0' }));
    techo.material.map.repeat.set((x1 - x0) / 5, (z1 - z0) / 5);
    techo.rotation.x = Math.PI / 2;
    techo.position.set((x0 + x1) / 2, F + ALTO - 0.02, (z0 + z1) / 2);
    this.ciudad.grupo.add(techo);
    // Óvalo de neón violeta arriba de las tragamonedas de la izquierda.
    const ovalo = new THREE.TorusGeometry(1, 0.06, 4, 48);
    ovalo.rotateX(Math.PI / 2);
    ovalo.scale(5, 1, 15);
    ovalo.translate(this.xu(8), F + ALTO - 0.4, this.zv(22));
    c.forma('luz', ovalo, '#c13bff');
    // Alfombra (una sola malla con la textura repetida).
    const alf = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), new THREE.MeshLambertMaterial({ map: texAlfombra() }));
    alf.material.map.repeat.set((x1 - x0) / 7, (z1 - z0) / 7);
    alf.rotation.x = -Math.PI / 2;
    alf.position.set((x0 + x1) / 2, F + 0.02, (z0 + z1) / 2);
    this.ciudad.grupo.add(alf);

    // ----- Tragamonedas -----
    // Contra la pared izquierda, una isla doble en el medio-izquierda y contra la pared derecha
    // (adelante; atrás está la barra).
    const lugares = [];
    for (let v = 6; v <= 39; v += 3) lugares.push([0.6, v, 1]);
    for (let v = 10; v <= 34; v += 3) { lugares.push([11, v, -1]); lugares.push([11, v, 1]); }
    for (let v = 6; v <= 21; v += 3) lugares.push([39.4, v, -1]);
    lugares.forEach(([u, v, dir], i) => this.maquina(c, this.xu(u), this.zv(v), dir, i));
    this.armarInstancias();

    // ----- Mesas (en una columna en el medio-derecha) -----
    this.mesaBlackjack(c, this.xu(24), this.zv(14), F);
    this.mesaPoker(c, this.xu(24), this.zv(25), F);
    this.mesaRuleta(c, this.xu(24), this.zv(36), F);

    // ----- Barra (atrás a la derecha) -----
    const bx = this.xu(33.5);
    c.caja(bx, F, this.zv(26), bx + 1.6, F + 2.8, this.zv(41.5), '#3b0d1d', { arriba: '#1b1b1f' });
    c.caja(bx - 0.1, F + 2.8, this.zv(26), bx + 1.7, F + 2.95, this.zv(41.5), '#d4a93a');
    c.caja(bx - 0.02, F + 0.4, this.zv(26), bx, F + 0.55, this.zv(41.5), '#ff2fb4', { lados: 'luz' });
    s(bx, 0, this.zv(26), bx + 1.6, F + 2.95, this.zv(41.5));
    const xp = x1 - 0.06;
    for (const y of [F + 3.5, F + 5, F + 6.5]) {
      c.caja(xp - 1, y - 0.1, this.zv(27), xp, y, this.zv(41), '#d4a93a');
      for (let z = this.zv(27.3); z < this.zv(40.8); z += 0.55) {
        const col = ['#2fae5a', '#c9a227', '#7a3b12', '#3a7bd5', '#d63a3a', '#e8e8e8'][Math.floor(z * 7) % 6];
        c.caja(xp - 0.7, y, z, xp - 0.4, y + 0.9, z + 0.3, col, { lados: 'luz' });
      }
    }
    for (let z = this.zv(27.5); z < this.zv(41); z += 2.6) this.banqueta(c, bx - 1.1, z, F);
    // ----- Arañas rosas colgando (como las de la foto) arriba de las mesas y los pasillos -----
    for (const m of Object.values(this.mesas)) this.arana(c, m.x, m.z, F);
    for (const [u, v] of [[20, 4], [5.5, 22], [16, 22], [36, 28]]) this.arana(c, this.xu(u), this.zv(v), F, 0.75);
    // Luz de las máquinas sobre la alfombra (cada una con su charquito de color).
    for (const mq of this.maquinas) this.halos.push([mq.x + mq.dir * 3, F + 0.05, mq.z, 2.6, ['#ffd23f', '#ff4fd1', '#2fe0ff'][mq.i % 3], 'piso']);
    this.armarHalos();
    // ----- Pantalla del JACKPOT en la pared del fondo -----
    this.pantalla = { x: this.xu(17), y: F + 9.5, z: z1 - 0.1 };
  }

  // Araña de caireles rosas: aro dorado, brazos con pantallitas rosas encendidas y gotas de
  // cristal. Todo va en la malla de la manzana (con el material de luz, así brilla sola).
  arana(c, x, z, F, k = 1) {
    const y = F + ALTO - 3.2 * k;
    c.caja(x - 0.05, y + 1.4 * k, z - 0.05, x + 0.05, F + ALTO, z + 0.05, '#d4a93a');
    for (const [r, h, n] of [[1.6, 0, 10], [0.9, 1.0, 6]]) {
      const aro = new THREE.TorusGeometry(r * k, 0.07 * k, 4, 24);
      aro.rotateX(Math.PI / 2);
      aro.translate(x, y + h * k, z);
      c.forma('liso', aro, '#e0b84a');
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const px = x + Math.cos(a) * r * k;
        const pz = z + Math.sin(a) * r * k;
        const pantalla = new THREE.CylinderGeometry(0.16 * k, 0.32 * k, 0.45 * k, 8);
        pantalla.translate(px, y + (h + 0.32) * k, pz);
        c.forma('luz', pantalla, '#ff5fb0');
        const gota = new THREE.OctahedronGeometry(0.11 * k);
        gota.scale(1, 1.8, 1);
        gota.translate(px, y + (h - 0.35) * k, pz);
        c.forma('luz', gota, '#ffd0ec');
      }
    }
    const centro = new THREE.SphereGeometry(0.5 * k, 10, 8);
    centro.translate(x, y + 0.4 * k, z);
    c.forma('luz', centro, '#ff8fcf');
    this.halos.push([x, F + 0.05, z, 5.5 * k, '#ff6fb8', 'piso']);
  }

  // Todos los halos de luz en una sola malla instanciada (se suman a lo de atrás: brillan).
  armarHalos() {
    const geo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.MeshBasicMaterial({ map: texHalo(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: false });
    const im = new THREE.InstancedMesh(geo, mat, this.halos.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const p = new THREE.Vector3();
    const t = new THREE.Vector3();
    const col = new THREE.Color();
    this.halos.forEach(([x, y, z, r, color, tipo, nx = 0, nz = 0], i) => {
      if (tipo === 'piso') e.set(-Math.PI / 2, 0, 0);
      else if (tipo === 'pared') e.set(0, Math.atan2(nx, nz), 0);
      else e.set(0, 0, 0);
      q.setFromEuler(e);
      im.setMatrixAt(i, m.compose(p.set(x, y, z), q, t.set(r * 2, tipo === 'pared' ? r * 2.6 : r * 2, 1)));
      im.setColorAt(i, col.set(color).multiplyScalar(tipo === 'piso' ? 0.55 : 0.7));
    });
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    im.renderOrder = 2;
    this.ciudad.grupo.add(im);
    this.mallaHalos = im;
  }

  banqueta(c, x, z, F, alto = 2.1) {
    c.cil(0.5, 0.55, 0.08, '#c9ced3', x, F, z, 10);
    c.cil(0.1, 0.1, alto, '#c9ced3', x, F, z, 6);
    c.cil(0.62, 0.6, 0.3, '#8b0d1a', x, F + alto, z, 12);
  }

  // Una tragamonedas contra (u, v), mirando a +x (dir 1) o a -x (dir -1), como las de la foto:
  // gabinete violeta o amarillo, frente verde con los tres rodillos, el cartel de pagos arriba, la
  // palanca con la bola roja, la tira de luz amarilla al costado y su banqueta.
  maquina(c, x, z, dir, i) {
    const F = this.F;
    const caja = (a0, b0, y0, a1, b1, y1, color, op) => {
      const xa = x + dir * a0;
      const xb = x + dir * a1;
      c.caja(Math.min(xa, xb), F + y0, z + b0, Math.max(xa, xb), F + y1, z + b1, color, op);
    };
    const gab = i % 2 ? '#d8a21c' : '#5b2a86';
    const otro = i % 2 ? '#5b2a86' : '#d8a21c';
    caja(0.2, -1.2, 0, 2.2, 1.2, 2.3, '#2a1745');
    caja(1.9, -1.15, 2.3, 2.65, 1.15, 2.65, '#1f8f3a', { arriba: '#22a845' });
    caja(0, -1.25, 2.3, 1.9, 1.25, 6.35, gab, { arriba: otro });
    caja(0.2, -1.25, 5.0, 2.05, 1.25, 6.35, otro);
    for (const [b0, b1] of [[-1.25, -1.05], [1.05, 1.25]]) caja(1.9, b0, 2.65, 2.3, b1, 5.0, gab);
    caja(1.9, -1.05, 4.62, 2.3, 1.05, 4.78, '#e0e0e0');
    caja(1.9, -1.05, 3.24, 2.3, 1.05, 3.4, '#e0e0e0');
    caja(1.85, 1.25, 2.4, 2.02, 1.38, 6.3, '#ffe066', { lados: `tira${i % 3}` });
    caja(1.85, -1.38, 2.4, 2.02, -1.25, 6.3, '#ffe066', { lados: `tira${(i + 1) % 3}` });
    // Palanca.
    caja(1.0, 1.25, 3.6, 1.3, 1.45, 3.9, '#9aa0a6');
    caja(1.08, 1.45, 3.6, 1.22, 1.6, 4.9, '#c9ced3');
    const bola = new THREE.SphereGeometry(0.24, 10, 8);
    bola.translate(x + dir * 1.15, F + 5.0, z + 1.53);
    c.forma('liso', bola, '#e11d2a');
    // Botones del tablero.
    for (let k = 0; k < 4; k++) caja(2.2, -0.8 + k * 0.45, 2.65, 2.45, -0.5 + k * 0.45, 2.75, ['#ff3b30', '#ffcc00', '#34c759', '#2f8cff'][k], { lados: 'luz' });
    this.banqueta(c, x + dir * 3.5, z, F);
    this.ciudad.solido(Math.min(x, x + dir * 2.65), 0, z - 1.4, Math.max(x, x + dir * 2.65), F + 6.4, z + 1.4);
    this.maquinas.push({ x, z, dir, i, ultimos: [SIMBOLOS[0], SIMBOLOS[3], SIMBOLOS[6]], rodillos: [0, 0, 0].map((_, k) => ({ ang: Math.PI / 2 - (2 * Math.PI * (k * 3 + 0.5)) / 8, giro: null })) });
  }

  // Caras verdes, carteles y rodillos de todas las tragamonedas: tres mallas instanciadas.
  armarInstancias() {
    const n = this.maquinas.length;
    const F = this.F;
    const frente = new THREE.InstancedMesh(new THREE.PlaneGeometry(2.1, 2.36), new THREE.MeshBasicMaterial({ map: texFrente() }), n);
    const cartel = new THREE.InstancedMesh(new THREE.PlaneGeometry(2.3, 1.15), new THREE.MeshBasicMaterial({ map: texCartelMaquina() }), n);
    // Rodillo: cilindro abierto con el eje a lo largo de la máquina (z) y la tira de símbolos
    // envuelta (los uv se dan vuelta para que los símbolos queden parados).
    const geo = new THREE.CylinderGeometry(0.46, 0.46, 0.55, 24, 1, true);
    const uv = geo.attributes.uv;
    for (let k = 0; k < uv.count; k++) { const u = uv.getX(k); const v = uv.getY(k); uv.setXY(k, 1 - v, u); }
    geo.rotateX(Math.PI / 2);
    const rodillos = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ map: texRodillo() }), n * 3);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const uno = new THREE.Vector3(1, 1, 1);
    const p = new THREE.Vector3();
    this.maquinas.forEach((mq, i) => {
      const giro = mq.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      q.setFromEuler(e.set(0, giro, 0));
      frente.setMatrixAt(i, m.compose(p.set(mq.x + mq.dir * 1.905, F + 3.83, mq.z), q, uno));
      cartel.setMatrixAt(i, m.compose(p.set(mq.x + mq.dir * 2.06, F + 5.68, mq.z), q, uno));
    });
    this.rodillos = rodillos;
    this.maquinas.forEach((mq) => this.ponerRodillos(mq));
    for (const im of [frente, cartel, rodillos]) {
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
      this.ciudad.grupo.add(im);
    }
  }

  ponerRodillos(mq) {
    const m = this.mtmp ??= new THREE.Matrix4();
    const r = this.rtmp ??= new THREE.Matrix4();
    const i = this.maquinas.indexOf(mq);
    mq.rodillos.forEach((rod, k) => {
      m.makeRotationY(mq.dir > 0 ? 0 : Math.PI);
      m.multiply(r.makeRotationZ(rod.ang));
      m.setPosition(mq.x + mq.dir * 1.72, this.F + 4.01, mq.z - (k - 1) * 0.62 * mq.dir);
      this.rodillos.setMatrixAt(i * 3 + k, m);
    });
    this.rodillos.instanceMatrix.needsUpdate = true;
  }

  mesaBlackjack(c, x, z, F) {
    // Medio círculo: el lado recto del crupier hacia +z y la curva hacia los jugadores.
    const R = 4.3;
    const tapa = new THREE.CylinderGeometry(R, R, 0.3, 32, 1, false, Math.PI / 2, Math.PI);
    tapa.translate(x, F + 2.45, z);
    c.forma('liso', tapa, '#1a1012');
    c.caja(x - 3, F, z - 2.2, x + 3, F + 2.3, z - 0.2, '#3a0f1c');
    // Medio círculo con la textura entera: el lado recto (arriba en la textura) es el del crupier.
    const pano = new THREE.Mesh(new THREE.CircleGeometry(R - 0.25, 32, Math.PI, Math.PI), new THREE.MeshLambertMaterial({ map: texBlackjack() }));
    const uvp = pano.geometry.attributes.uv;
    for (let k = 0; k < uvp.count; k++) uvp.setY(k, uvp.getY(k) * 2);
    pano.rotation.set(-Math.PI / 2, 0, Math.PI); // así se lee desde los jugadores
    pano.position.set(x, F + 2.61, z);
    this.ciudad.grupo.add(pano);
    // Bandeja de fichas del crupier.
    c.caja(x - 1.4, F + 2.6, z - 0.9, x + 1.4, F + 2.75, z - 0.3, '#1b1b1f');
    this.fichas(c, x - 1.25, F + 2.75, z - 0.6, 10);
    c.caja(x - 4.3, F, z, x + 4.3, F + 2.6, z + 0.6, '#2a0b16', { arriba: '#1a1012' });
    this.ciudad.solido(x - 4.3, 0, z - 3.2, x + 4.3, F + 2.6, z + 0.6);
    this.ciudad.solido(x - 3, 0, z - 4.1, x + 3, F + 2.6, z - 3.2);
    for (let k = 0; k < 5; k++) {
      const a = Math.PI * (0.18 + k * 0.16);
      this.banqueta(c, x - Math.cos(a) * 5.4, z - Math.sin(a) * 5.4, F);
    }
    this.mesas.blackjack = { tipo: 'blackjack', x, z, asiento: { x, z: z - 5.6 }, dealer: { x, z: z + 1.6 }, cam: { x, y: F + 9, z: z - 10.5, mx: x, my: F + 1.2, mz: z - 0.5 } };
  }

  mesaPoker(c, x, z, F) {
    const tapa = new THREE.CylinderGeometry(1, 1, 0.3, 36);
    tapa.scale(4.6, 1, 2.5);
    tapa.translate(x, F + 2.45, z);
    c.forma('liso', tapa, '#1a1012');
    c.caja(x - 2.5, F, z - 1, x + 2.5, F + 2.3, z + 1, '#3a0f1c');
    const pano = new THREE.Mesh(new THREE.CircleGeometry(1, 36), new THREE.MeshLambertMaterial({ map: texPoker() }));
    pano.scale.set(4.3, 2.25, 1);
    pano.rotation.set(-Math.PI / 2, 0, Math.PI);
    pano.position.set(x, F + 2.61, z);
    this.ciudad.grupo.add(pano);
    this.fichas(c, x + 2.6, F + 2.6, z + 1.2, 6);
    this.ciudad.solido(x - 4.4, 0, z - 2.3, x + 4.4, F + 2.6, z + 2.3);
    for (const [dx, dz] of [[-3.2, -2.8], [-1.1, -3.3], [1.1, -3.3], [3.2, -2.8]]) this.banqueta(c, x + dx, z + dz, F);
    this.mesas.poker = { tipo: 'poker', x, z, asiento: { x, z: z - 4.0 }, dealer: { x, z: z + 3.2 }, cam: { x, y: F + 8.6, z: z - 9.5, mx: x, my: F + 1.2, mz: z } };
  }

  mesaRuleta(c, x, z, F) {
    // Mesa larga: el paño con los números a la izquierda y la rueda a la derecha.
    c.caja(x - 6.2, F + 2.3, z - 2.6, x + 6.2, F + 2.6, z + 2.6, '#5a2d0c', { arriba: '#4a240a' });
    c.caja(x - 5.5, F, z - 2, x + 5.5, F + 2.3, z + 2, '#3a0f1c');
    this.ciudad.solido(x - 6.2, 0, z - 2.6, x + 6.2, F + 2.6, z + 2.6);
    const pano = new THREE.Mesh(new THREE.PlaneGeometry(7.8, 3.9), new THREE.MeshLambertMaterial({ map: texPanoRuleta() }));
    pano.rotation.set(-Math.PI / 2, 0, Math.PI);
    pano.position.set(x - 1.9, F + 2.62, z);
    this.ciudad.grupo.add(pano);
    // Rueda: tazón de madera, el plato que gira y la bolita.
    const xr = x + 3.6;
    c.cil(2.25, 2.0, 0.4, '#5a2d0c', xr, F + 2.6, z, 28);
    const aro = new THREE.TorusGeometry(2.05, 0.13, 6, 32);
    aro.rotateX(Math.PI / 2);
    aro.translate(xr, F + 3.06, z);
    c.forma('liso', aro, '#7a4416');
    const plato = new THREE.Group();
    plato.position.set(xr, F + 3.05, z);
    const disco = new THREE.Mesh(new THREE.CircleGeometry(1.75, 37 * 2).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: texRueda() }));
    plato.add(disco);
    const torre = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.6, 12), new THREE.MeshLambertMaterial({ color: '#e0b84a' }));
    torre.position.y = 0.3;
    plato.add(torre);
    this.ciudad.grupo.add(plato);
    const bolita = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshLambertMaterial({ color: '#ffffff' }));
    this.ciudad.grupo.add(bolita);
    this.ruleta = { plato, bolita, xr, zr: z, y: F + 3.05, ang: 0, giro: null, k: null };
    this.ponerBolita(1.95, 0);
    this.fichas(c, x - 5.6, F + 2.6, z + 1.8, 8);
    for (const dx of [-4.5, -2.5, -0.5]) this.banqueta(c, x + dx, z - 3.6, F);
    this.mesas.ruleta = { tipo: 'ruleta', x, z, asiento: { x: x - 2.5, z: z - 4.2 }, dealer: { x: x + 1, z: z + 3.4 }, cam: { x: x + 0.5, y: F + 9.8, z: z - 8.6, mx: x + 0.5, my: F + 1.4, mz: z + 0.2 } };
  }

  ponerBolita(r, ang) {
    const R = this.ruleta;
    R.bolita.position.set(R.xr + Math.cos(ang) * r, R.y + 0.08 + Math.max(0, r - 1.45) * 0.15, R.zr + Math.sin(ang) * r);
  }

  fichas(c, x, y, z, n) {
    const colores = ['#d32f2f', '#1565c0', '#2e7d32', '#212121', '#f9a825', '#7b1fa2'];
    for (let k = 0; k < n; k++) c.cil(0.22, 0.22, 0.12 * (3 + (k * 5) % 6), colores[k % colores.length], x + (k % 5) * 0.5, y, z + Math.floor(k / 5) * 0.5, 10);
  }

  armarEstacionamiento(c, lote, b, PISO) {
    const x0 = b.x1 + 1.5;
    const x1 = lote.x1;
    c.piso(x0, lote.z0, x1, lote.z1, PISO + 0.04, '#3a3c40');
    const fondo = x1 - 6.5;
    for (let z = lote.z0 + 3; z <= lote.z1 - 2; z += 3.4) c.piso(fondo, z - 0.08, x1 - 0.5, z + 0.08, PISO + 0.06, '#f2f2f2');
    c.piso(fondo - 0.08, lote.z0 + 3, fondo + 0.08, lote.z1 - 2, PISO + 0.06, '#f2f2f2');
    // Autos estacionados (algunos lugares vacíos) y el de Astrojorge en el segundo lugar.
    const colores = ['#c62828', '#f5f5f5', '#212121', '#1565c0', '#9e9e9e', '#2e7d32'];
    let k = 0;
    for (let z = lote.z0 + 4.7, n = 0; z < lote.z1 - 3; z += 3.4, n++) {
      if (n === 1) { this.autoAstrojorge(c, x1 - 3.5, z, PISO); continue; }
      if ((n * 7) % 5 < 2) continue;
      this.ciudad.autoEstacionado(c, x1 - 3.5, z, 'x', colores[k++ % colores.length]);
    }
    // Cartel ESTACIONAMIENTO a la entrada.
    const e = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.3), new THREE.MeshBasicMaterial({ map: texTexto(['ESTACIONAMIENTO'], 512, 144, '#1565c0', '#ffffff', '900 54px Arial, sans-serif') }));
    e.position.set(x0 + 2.6, PISO + 4.3, lote.z0 + 1.2);
    e.rotation.y = Math.PI;
    this.ciudad.grupo.add(e);
    c.caja(x0 + 2.5, PISO, lote.z0 + 1.25, x0 + 2.7, PISO + 3.7, lote.z0 + 1.45, '#9aa0a6');
  }

  // El auto de Astrojorge: un sedán viejo (tipo Falcon) celeste gastado, con óxido, "Auto de
  // Astrojorge" pintado en las puertas y una papa metida en el caño de escape (la cola mira al pasillo).
  autoAstrojorge(c, x, z, PISO) {
    const y0 = PISO;
    const col = '#86a9bb';
    const caja = (a0, b0, h0, a1, b1, h1, color, op) => c.caja(x + a0, y0 + h0, z + b0, x + a1, y0 + h1, z + b1, color, op);
    caja(-2.7, -1.15, 0.55, 2.7, 1.15, 1.5, col);
    caja(-1.4, -1.0, 1.5, 1.0, 1.0, 2.4, '#2a3642', { arriba: col });
    caja(-1.45, -1.02, 2.35, 1.05, 1.02, 2.45, col);
    caja(2.65, -1.18, 0.6, 2.85, 1.18, 0.88, '#d0d4d8');
    caja(-2.85, -1.18, 0.6, -2.65, 1.18, 0.88, '#d0d4d8');
    caja(-2.72, -1.0, 1.05, -2.68, -0.55, 1.35, '#e53935', { lados: 'luz' });
    caja(-2.72, 0.55, 1.05, -2.68, 1.0, 1.35, '#e53935', { lados: 'luz' });
    for (const lado of [-1, 1]) {
      const fa = new THREE.CylinderGeometry(0.2, 0.2, 0.06, 12);
      fa.rotateZ(Math.PI / 2);
      fa.translate(x + 2.72, y0 + 1.15, z + lado * 0.75);
      c.forma('luz', fa, '#fff6d6');
    }
    // Manchas de óxido.
    for (const [a, h, l] of [[-1.9, 0.7, 1], [1.6, 0.6, -1], [-0.6, 1.2, -1], [2.2, 1.1, 1]]) caja(a - 0.25, l * 1.16 - 0.02, h, a + 0.25, l * 1.16 + 0.02, h + 0.22, '#8a4b20');
    for (const sx of [-1.7, 1.7]) {
      for (const sz of [-1.05, 1.05]) {
        const r = new THREE.CylinderGeometry(0.52, 0.52, 0.36, 12);
        r.rotateX(Math.PI / 2);
        r.translate(x + sx, y0 + 0.52, z + sz);
        c.forma('liso', r, '#161616');
        const taza = new THREE.CylinderGeometry(0.28, 0.28, 0.38, 10);
        taza.rotateX(Math.PI / 2);
        taza.translate(x + sx, y0 + 0.52, z + sz);
        c.forma('liso', taza, '#bfc5ca');
      }
    }
    // Caño de escape cromado (sale de abajo del paragolpes) y la papa metida hasta la mitad.
    const cano = new THREE.CylinderGeometry(0.15, 0.15, 0.75, 14, 1, true);
    cano.rotateZ(Math.PI / 2);
    cano.translate(x - 2.7, y0 + 0.42, z - 0.65);
    c.forma('liso', cano, '#9aa0a6');
    const boca = new THREE.TorusGeometry(0.15, 0.025, 6, 16);
    boca.rotateY(Math.PI / 2);
    boca.translate(x - 3.07, y0 + 0.42, z - 0.65);
    c.forma('liso', boca, '#c9ced3');
    this.ciudad.grupo.add(crearPapa(x - 3.2, y0 + 0.43, z - 0.65));
    this.ciudad.solido(x - 3.4, 0, z - 1.2, x + 2.9, y0 + 2.45, z + 1.2);
    // "Auto de Astrojorge" en las dos puertas y el cartel del lugar reservado.
    const letras = texTexto(['Auto de', 'Astrojorge'], 512, 200, null, '#fff3c4', 'italic 900 64px Georgia, serif');
    for (const lado of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.95), new THREE.MeshBasicMaterial({ map: letras, transparent: true }));
      p.position.set(x - 0.1, y0 + 1.02, z + lado * 1.165);
      p.rotation.y = lado > 0 ? 0 : Math.PI;
      this.ciudad.grupo.add(p);
    }
    const cartel = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.1), new THREE.MeshBasicMaterial({ map: texTexto(['RESERVADO', 'AUTO DE ASTROJORGE'], 360, 220, '#f5f5f5', '#c62828', '900 27px Arial, sans-serif'), side: THREE.DoubleSide }));
    cartel.position.set(x + 3.4, y0 + 2.6, z);
    cartel.rotation.y = -Math.PI / 2;
    this.ciudad.grupo.add(cartel);
    c.caja(x + 3.45, y0, z - 0.06, x + 3.55, y0 + 2.05, z + 0.06, '#9aa0a6');
  }

  // Las letras CASINO arriba de la marquesina (cada una con su material, para los colores de noche).
  armarCartel(F) {
    const { x, z } = this.marquesina;
    this.letras = [];
    'CASINO'.split('').forEach((l, i) => {
      const mat = new THREE.MeshBasicMaterial({ map: texLetra(l), transparent: true, depthWrite: false, color: '#ff4f78' });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 2.4), mat);
      m.position.set(x - (i - 2.5) * 1.95, F + 9.85, z);
      m.rotation.y = Math.PI;
      this.ciudad.grupo.add(m);
      this.letras.push(mat);
    });
    // La pantalla del JACKPOT (adentro, en la pared del fondo).
    const P = this.pantalla;
    this.canvasJackpot = lienzo(1024, 256, () => {});
    this.texJackpot = textura(this.canvasJackpot, false, false); // se redibuja
    const pj = new THREE.Mesh(new THREE.PlaneGeometry(14, 3.5), new THREE.MeshBasicMaterial({ map: this.texJackpot }));
    pj.position.set(P.x, P.y, P.z);
    pj.rotation.y = Math.PI;
    this.ciudad.grupo.add(pj);
    this.dibujarJackpot(0);
    this.crearAstrojorge();
  }

  dibujarJackpot(t) {
    const g = this.canvasJackpot.getContext('2d');
    const w = 1024;
    const h = 256;
    g.fillStyle = '#0a0410';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      g.fillStyle = `hsl(${(i * 9 + t * 120) % 360},100%,60%)`;
      g.beginPath(); g.arc(12 + i * 25.7, 12, 7, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(12 + i * 25.7, h - 12, 7, 0, Math.PI * 2); g.fill();
    }
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '900 96px Arial Black, Arial, sans-serif';
    g.shadowColor = '#ff2fb4';
    g.shadowBlur = 24;
    g.fillStyle = Math.floor(t * 2) % 2 ? '#ffe14d' : '#ff4fd1';
    g.fillText('JACKPOT', w / 2, 100);
    g.shadowBlur = 0;
    g.font = '800 44px Arial, sans-serif';
    g.fillStyle = '#7dff6a';
    g.fillText('3 SIETES PAGAN x100', w / 2, 186);
    this.texJackpot.needsUpdate = true;
  }

  async crearAstrojorge() {
    const m = crearPersonaje(ASTROJORGE, await cargarCabeza(ASTROJORGE));
    m.grupo.scale.setScalar(1.12); // alto y flaco
    const etiqueta = crearEtiqueta([{ texto: ASTROJORGE.nombre, tam: 60, color: '#ffd54a' }], 5);
    etiqueta.sprite.position.y = 6.9;
    m.grupo.add(etiqueta.sprite);
    const d = this.mesas.blackjack.dealer;
    m.grupo.position.set(d.x, this.F, d.z);
    m.grupo.rotation.y = Math.PI;
    this.ciudad.grupo.add(m.grupo);
    this.astro = { m, etiqueta, camino: [], mesa: 'blackjack', globo: 0 };
  }

  // Astrojorge va a la mesa (por el pasillo de la derecha, así no atraviesa las mesas).
  irA(mesa) {
    const a = this.astro;
    if (!a || a.mesa === mesa) return;
    const d = this.mesas[mesa].dealer;
    const p = a.m.grupo.position;
    const pasillo = this.xu(31.2);
    a.camino = [{ x: pasillo, z: p.z }, { x: pasillo, z: d.z }, { x: d.x, z: d.z }];
    a.mesa = mesa;
  }

  decir(texto) {
    if (!this.astro) return;
    this.astro.etiqueta.actualizar([{ texto: ASTROJORGE.nombre, tam: 60, color: '#ffd54a' }, { texto, tam: 40 }]);
    this.astro.globo = 4;
    if (this.el) this.el.dealer.textContent = `Astrojorge: “${texto}”`;
  }

  // ---------- Dónde estás ----------
  local(p) { return { x: p.x - C.x, z: p.z - C.z }; }
  dentro(p) {
    if (!this.listo) return false;
    const l = this.local(p);
    return l.x > this.b.x0 && l.x < this.b.x1 && l.z > this.b.z0 && l.z < this.b.z1 && p.y < this.F + ALTO;
  }

  // Lo que hay para hacer donde estás parado (o null).
  cercano(jugador) {
    if (!this.listo || !this.dentro(jugador.pos)) return null;
    const l = this.local(jugador.pos);
    for (const m of Object.values(this.mesas)) {
      if (Math.hypot(l.x - m.asiento.x, l.z - m.asiento.z) < 3) return { tipo: m.tipo, mesa: m };
    }
    let mejor = null;
    let dm = 2.2;
    for (const mq of this.maquinas) {
      const d = Math.hypot(l.x - (mq.x + mq.dir * 3.6), l.z - mq.z);
      if (d < dm) { dm = d; mejor = mq; }
    }
    return mejor ? { tipo: 'tragamonedas', maquina: mejor } : null;
  }

  accion(jugador) {
    if (this.jugando) return '';
    if (this.listo && !this.abierto) {
      const l = this.local(jugador.pos);
      return Math.hypot(l.x - this.puertaX, l.z - this.b.z0) < 6 ? `Casino cerrado: abre al ${Math.round(CASINO_DESDE * 100)}%` : '';
    }
    const c = this.cercano(jugador);
    if (!c) return '';
    return { blackjack: 'Jugar al blackjack (E)', poker: 'Jugar al póker (E)', ruleta: 'Jugar a la ruleta (E)', tragamonedas: 'Jugar al tragamonedas (E)' }[c.tipo];
  }

  // Se sienta a jugar: abre el panel del juego. Devuelve true si empezó.
  hacer(jugador) {
    if (!this.abierto) {
      this.ui.toast(`El casino abre cuando la mansión llegue al ${Math.round(CASINO_DESDE * 100)}%`, 'error');
      return false;
    }
    const c = this.cercano(jugador);
    if (!c) return false;
    this.jugador = jugador;
    this.jugando = { ...c };
    if (!this.apuesta) this.apuesta = this.apuestaInicial();
    this.apuesta = Math.min(this.apuesta, this.maximo()) || MINIMO;
    this.abiertoEn = performance.now();
    this.abrirPanel(c.tipo);
    if (c.mesa) {
      this.irA(c.tipo);
      this.decir(una(FRASES.bienvenida));
    }
    return true;
  }

  // forzar: al ir al menú (lo que se estaba jugando se termina solo, igual paga).
  salir(forzar = false) {
    if (!this.jugando || (this.ocupado() && !forzar)) return;
    if (this.jugando.tipo === 'blackjack' || this.jugando.tipo === 'poker') this.limpiarCartas3d();
    this.jugando = null;
    this.el.raiz.classList.add('oculto');
    if (this.jugador?.modelo) this.jugador.modelo.grupo.visible = true;
    this.alSalir?.();
  }

  // Mientras gira algo o se reparte, no te podés levantar.
  ocupado() {
    const j = this.jugando;
    if (!j) return false;
    if (j.tipo === 'tragamonedas') return j.maquina.rodillos.some((r) => r.giro);
    if (j.tipo === 'ruleta') return !!this.ruleta.giro;
    return !!this.repartiendo;
  }

  camara(camara) {
    const j = this.jugando;
    if (!j) return;
    if (this.jugador?.modelo) this.jugador.modelo.grupo.visible = false;
    if (j.tipo === 'tragamonedas') {
      const mq = j.maquina;
      camara.position.set(C.x + mq.x + mq.dir * 7.4, this.F + 5.6, C.z + mq.z);
      camara.lookAt(C.x + mq.x + mq.dir * 1.9, this.F + 2.6, C.z + mq.z);
    } else {
      const k = j.mesa.cam;
      camara.position.set(C.x + k.x, k.y, C.z + k.z);
      camara.lookAt(C.x + k.mx, k.my, C.z + k.mz);
    }
  }

  // ---------- Plata ----------
  maximo() { return Math.max(MINIMO, Math.min(LIMITE, Math.floor(this.estado.plata))); }
  apuestaInicial() {
    // Un 2% de lo que tenés, redondeado a 1-2-5.
    return this.redondo(Math.max(MINIMO, this.estado.plata * 0.02));
  }
  redondo(v) {
    const p = 10 ** Math.floor(Math.log10(Math.max(1, v)));
    const k = v / p;
    return (k >= 5 ? 5 : k >= 2 ? 2 : 1) * p;
  }
  // Escalera 1-2-5: el siguiente (o anterior) valor de apuesta.
  paso(v, arriba) {
    const p = 10 ** Math.floor(Math.log10(Math.max(1, v)));
    const k = Math.round(v / p);
    if (arriba) return (k < 2 ? 2 : k < 5 ? 5 : 10) * p;
    return k > 5 ? 5 * p : k > 2 ? 2 * p : k > 1 ? p : Math.max(1, p / 2);
  }
  cobrar(monto) {
    if (this.estado.plata < monto) {
      this.ui.toast(`No te alcanza: tenés ${formato(this.estado.plata)}`, 'error');
      sfx.error();
      return false;
    }
    this.estado.plata -= monto;
    sfx.ficha();
    return true;
  }
  pagar(monto) {
    if (monto > 0) this.estado.plata += monto;
    this.guardar();
  }

  // ---------- Panel ----------
  armarPanel() {
    const r = document.createElement('div');
    r.id = 'casino';
    r.className = 'casino oculto';
    r.innerHTML = `
      <div class="cas-panel" role="dialog" aria-label="Casino">
        <div class="cas-cab">
          <h2 class="cas-titulo"></h2>
          <p class="cas-dealer"></p>
          <button class="cas-salir" type="button">Salir ✕</button>
        </div>
        <div class="cas-mesa"></div>
        <div class="cas-msj" aria-live="polite"></div>
        <div class="cas-pie">
          <div class="cas-apuesta">
            <span class="cas-etq">Apuesta</span>
            <button type="button" data-a="div">÷10</button>
            <button type="button" data-a="menos">−</button>
            <b class="cas-monto"></b>
            <button type="button" data-a="mas">+</button>
            <button type="button" data-a="por">×10</button>
            <button type="button" data-a="max">Máx</button>
          </div>
          <div class="cas-botones"></div>
        </div>
      </div>`;
    document.body.appendChild(r);
    const q = (s) => r.querySelector(s);
    this.el = { raiz: r, titulo: q('.cas-titulo'), dealer: q('.cas-dealer'), mesa: q('.cas-mesa'), msj: q('.cas-msj'), monto: q('.cas-monto'), botones: q('.cas-botones'), apuesta: q('.cas-apuesta') };
    q('.cas-salir').addEventListener('click', () => this.salir());
    this.el.apuesta.addEventListener('click', (e) => {
      const a = e.target.closest('button')?.dataset.a;
      if (!a || this.bloqueaApuesta()) return;
      const max = this.maximo();
      if (a === 'div') this.apuesta = Math.max(MINIMO, this.redondo(this.apuesta / 10));
      if (a === 'por') this.apuesta = Math.min(max, this.apuesta * 10);
      if (a === 'mas') this.apuesta = Math.min(max, this.paso(this.apuesta, true));
      if (a === 'menos') this.apuesta = Math.max(MINIMO, this.paso(this.apuesta, false));
      if (a === 'max') this.apuesta = max;
      sfx.ficha();
      this.mostrarApuesta();
    });
    window.addEventListener('keydown', (e) => {
      if (!this.jugando || e.repeat || performance.now() - this.abiertoEn < 300) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        this.el.botones.querySelector('button:not([disabled])')?.click();
      }
      if (e.code === 'Escape' || e.code === 'KeyE') {
        e.stopImmediatePropagation(); // que la misma E no te vuelva a sentar (main.js escucha después)
        this.salir();
      }
    });
  }

  bloqueaApuesta() {
    const j = this.jugando;
    return !j || this.ocupado() || ((j.tipo === 'blackjack' || j.tipo === 'poker') && this.mano && !this.mano.terminada);
  }

  mostrarApuesta() {
    this.el.monto.textContent = formato(this.apuesta);
    this.el.apuesta.classList.toggle('bloqueada', this.bloqueaApuesta());
  }

  botones(lista) {
    this.el.botones.innerHTML = '';
    for (const [texto, fn, extra] of lista) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = texto;
      if (extra?.clase) b.className = extra.clase;
      if (extra?.desactivado) b.disabled = true;
      b.addEventListener('click', fn);
      this.el.botones.appendChild(b);
    }
    this.mostrarApuesta();
  }

  mensaje(texto, tipo = '') {
    this.el.msj.textContent = texto;
    this.el.msj.className = `cas-msj ${tipo}`;
  }

  abrirPanel(tipo) {
    this.el.raiz.className = `casino cas-${tipo}`;
    this.el.titulo.textContent = { blackjack: 'Blackjack', poker: "Póker · Casino Hold'em", ruleta: 'Ruleta', tragamonedas: 'Tragamonedas' }[tipo];
    this.el.dealer.textContent = tipo === 'tragamonedas' ? '3 frutas x2 · misma fruta x10 · 3 campanas x25 · 3 sietes x100' : '';
    this.mensaje(`Máximo por apuesta: ${formato(LIMITE)}`);
    this.mano = null;
    if (tipo === 'tragamonedas') this.panelTragamonedas();
    if (tipo === 'blackjack') this.panelBlackjack();
    if (tipo === 'poker') this.panelPoker();
    if (tipo === 'ruleta') this.panelRuleta();
  }

  // ---------- Tragamonedas ----------
  panelTragamonedas() {
    this.el.mesa.innerHTML = '<div class="cas-rodillos"></div>';
    this.dibujarRodillosHTML(this.jugando.maquina.ultimos);
    this.botones([['Girar', () => this.girarTragamonedas(), { clase: 'cas-principal' }]]);
  }

  dibujarRodillosHTML(sims) {
    const cont = this.el.mesa.querySelector('.cas-rodillos');
    if (!cont) return;
    cont.innerHTML = '';
    for (const s of sims) {
      const c = lienzo(72, 72, (g) => { g.fillStyle = '#fff'; g.fillRect(0, 0, 72, 72); dibujarSimbolo(g, s, 6, 6, 60); });
      c.className = 'cas-simbolo';
      cont.appendChild(c);
    }
  }

  girarTragamonedas() {
    const mq = this.jugando?.maquina;
    if (!mq || mq.rodillos.some((r) => r.giro)) return;
    const apuesta = this.apuesta;
    if (!this.cobrar(apuesta)) return;
    const res = [tirarSimbolo(), tirarSimbolo(), tirarSimbolo()];
    mq.rodillos.forEach((rod, k) => {
      const idx = SIMBOLOS.indexOf(res[k]);
      const destino = Math.PI / 2 - (2 * Math.PI * (idx + 0.5)) / 8;
      // Gira para abajo (el ángulo baja) unas vueltas y frena justo en el símbolo.
      let fin = destino;
      while (fin > rod.ang - Math.PI * 2 * (4 + k * 1.5)) fin -= Math.PI * 2;
      rod.giro = { desde: rod.ang, hasta: fin, t: 0, dur: 1.3 + k * 0.45 };
    });
    mq.pendiente = { res, apuesta };
    this.mensaje('¡Girando!');
    this.botones([['Girar', () => {}, { clase: 'cas-principal', desactivado: true }]]);
  }

  terminarTragamonedas(mq) {
    const { res, apuesta } = mq.pendiente;
    mq.pendiente = null;
    mq.ultimos = res;
    const p = premioTragamonedas(res);
    if (this.jugando?.maquina === mq) {
      this.dibujarRodillosHTML(res);
      if (p.mult) {
        this.pagar(apuesta * p.mult);
        this.mensaje(`${p.texto} Ganaste ${formato(apuesta * p.mult)} (x${p.mult})`, 'gana');
        sfx.premio(p.mult >= 25);
        mq.festejo = p.mult >= 25 ? 4 : 1.5;
      } else {
        this.guardar();
        this.mensaje('Nada esta vez... ¿otra?', 'pierde');
      }
      this.botones([['Girar', () => this.girarTragamonedas(), { clase: 'cas-principal' }]]);
    } else if (p.mult) this.pagar(apuesta * p.mult);
  }

  // ---------- Cartas ----------
  sacarCarta() {
    if (!this.mazo || this.mazo.length < 60) {
      // Zapato de 6 mazos, mezclado.
      this.mazo = [];
      for (let m = 0; m < 6; m++) for (let p = 0; p < 4; p++) for (let r = 0; r < 13; r++) this.mazo.push({ r, p });
      for (let i = this.mazo.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [this.mazo[i], this.mazo[j]] = [this.mazo[j], this.mazo[i]]; }
    }
    return this.mazo.pop();
  }

  htmlCarta(c, tapada = false) {
    if (tapada || !c) return '<span class="cas-carta tapada"></span>';
    const rojo = c.p === 1 || c.p === 2;
    return `<span class="cas-carta${rojo ? ' roja' : ''}"><b>${RANGOS[c.r]}</b><i>${PALOS[c.p]}</i></span>`;
  }

  texCarta(c) {
    const k = c ? `${c.r}-${c.p}` : 'dorso';
    if (!this.texCartas.has(k)) this.texCartas.set(k, textura(canvasCarta(c)));
    return this.texCartas.get(k);
  }

  // Una carta 3D apoyada en el paño (en coordenadas de la ciudad), de frente al jugador.
  carta3d(c, x, z, tapada = false) {
    this.geoCarta ??= new THREE.PlaneGeometry(0.8, 1.12).rotateX(-Math.PI / 2).rotateY(Math.PI);
    const m = new THREE.Mesh(this.geoCarta, new THREE.MeshBasicMaterial({ map: this.texCarta(tapada ? null : c) }));
    m.position.set(x, this.F + 2.64 + this.cartas3d.length * 0.002, z);
    m.userData = { c };
    this.ciudad.grupo.add(m);
    this.cartas3d.push(m);
    sfx.carta();
    return m;
  }
  destapar3d(m) { m.material.map = this.texCarta(m.userData.c); }
  limpiarCartas3d() {
    for (const m of this.cartas3d) { this.ciudad.grupo.remove(m); m.material.dispose(); }
    this.cartas3d = [];
  }
  esperar(s) { return new Promise((r) => setTimeout(r, s * 1000)); }

  // ---------- Blackjack ----------
  panelBlackjack() {
    this.el.mesa.innerHTML = '<div class="cas-fila"><span class="cas-quien">Astrojorge</span><span class="cas-cartas" data-q="d"></span><span class="cas-total" data-q="dt"></span></div><div class="cas-fila"><span class="cas-quien">Vos</span><span class="cas-cartas" data-q="j"></span><span class="cas-total" data-q="jt"></span></div>';
    this.botones([['Repartir', () => this.repartirBJ(), { clase: 'cas-principal' }]]);
  }

  dibujarBJ() {
    const h = this.mano;
    const q = (k) => this.el.mesa.querySelector(`[data-q="${k}"]`);
    q('d').innerHTML = h.dealer.map((c, i) => this.htmlCarta(c, i === 1 && h.tapada)).join('');
    q('j').innerHTML = h.jugador.map((c) => this.htmlCarta(c)).join('');
    q('dt').textContent = !h.dealer.length ? '' : h.tapada ? valorCarta(h.dealer[0]) : totalBJ(h.dealer).t;
    const t = totalBJ(h.jugador);
    if (!h.jugador.length) return;
    q('jt').textContent = t.blanda && t.t < 21 ? `${t.t - 10}/${t.t}` : t.t;
  }

  async repartirBJ() {
    if (this.repartiendo) return;
    const apuesta = this.apuesta;
    if (!this.cobrar(apuesta)) return;
    this.limpiarCartas3d();
    const M = this.mesas.blackjack;
    this.mano = { jugador: [], dealer: [], apuesta, tapada: true, terminada: false, doblo: false };
    const h = this.mano;
    this.repartiendo = true;
    this.mensaje('');
    this.botones([]);
    const dar = async (quien) => {
      const c = this.sacarCarta();
      h[quien].push(c);
      const n = h[quien].length - 1;
      const tapada = quien === 'dealer' && n === 1;
      if (quien === 'jugador') this.carta3d(c, M.x - 0.5 + n * 0.55, M.z - 2.7 - n * 0.05);
      else {
        const m = this.carta3d(c, M.x - 0.5 + n * 0.9, M.z - 1.0, tapada);
        if (tapada) h.tapada3d = m;
      }
      this.dibujarBJ();
      await this.esperar(0.45);
    };
    await dar('jugador');
    await dar('dealer');
    await dar('jugador');
    await dar('dealer');
    this.repartiendo = false;
    // Si Astrojorge muestra un as o un 10, mira si tiene blackjack.
    if (esBJ(h.dealer) || esBJ(h.jugador)) return this.finBJ();
    this.turnoBJ();
  }

  turnoBJ() {
    const h = this.mano;
    const puedeDoblar = h.jugador.length === 2 && this.estado.plata >= h.apuesta;
    this.botones([
      ['Pedir', () => this.pedirBJ(), { clase: 'cas-principal' }],
      ['Plantarse', () => this.finBJ()],
      ['Doblar', () => this.doblarBJ(), { desactivado: !puedeDoblar }],
    ]);
  }

  async pedirBJ() {
    if (this.repartiendo || this.mano.terminada) return;
    const h = this.mano;
    const M = this.mesas.blackjack;
    const c = this.sacarCarta();
    h.jugador.push(c);
    this.carta3d(c, M.x - 0.5 + (h.jugador.length - 1) * 0.55, M.z - 2.7 - (h.jugador.length - 1) * 0.05);
    this.dibujarBJ();
    const t = totalBJ(h.jugador).t;
    if (t > 21) return this.finBJ();
    if (t === 21) return this.finBJ();
    this.turnoBJ();
  }

  async doblarBJ() {
    const h = this.mano;
    if (h.jugador.length !== 2 || !this.cobrar(h.apuesta)) return;
    h.apuesta *= 2;
    h.doblo = true;
    const M = this.mesas.blackjack;
    const c = this.sacarCarta();
    h.jugador.push(c);
    this.carta3d(c, M.x - 0.5 + 2 * 0.55, M.z - 2.8);
    this.dibujarBJ();
    this.finBJ();
  }

  async finBJ() {
    const h = this.mano;
    if (h.terminada || this.repartiendo) return;
    this.repartiendo = true;
    this.botones([]);
    const M = this.mesas.blackjack;
    const tj = totalBJ(h.jugador).t;
    const bjJ = esBJ(h.jugador);
    h.tapada = false;
    if (h.tapada3d) this.destapar3d(h.tapada3d);
    this.dibujarBJ();
    await this.esperar(0.5);
    // Astrojorge pide hasta 16 y se planta en 17 (si vos no te pasaste ni tenés blackjack).
    if (tj <= 21 && !bjJ) {
      while (totalBJ(h.dealer).t < 17) {
        const c = this.sacarCarta();
        h.dealer.push(c);
        this.carta3d(c, M.x - 0.5 + (h.dealer.length - 1) * 0.9, M.z - 1.0);
        this.dibujarBJ();
        await this.esperar(0.6);
      }
    }
    const td = totalBJ(h.dealer).t;
    const bjD = esBJ(h.dealer);
    let paga = 0;
    let texto;
    if (tj > 21) texto = `Te pasaste (${tj}). Perdiste ${formato(h.apuesta)}`;
    else if (bjJ && bjD) { paga = h.apuesta; texto = 'Blackjack los dos: empate, te devuelven la apuesta'; }
    else if (bjJ) { paga = h.apuesta * 2.5; texto = `¡BLACKJACK! Ganaste ${formato(h.apuesta * 1.5)}`; }
    else if (bjD) texto = 'Astrojorge tiene blackjack. Perdiste';
    else if (td > 21) { paga = h.apuesta * 2; texto = `Astrojorge se pasó (${td}). ¡Ganaste ${formato(h.apuesta)}!`; }
    else if (tj > td) { paga = h.apuesta * 2; texto = `Vos ${tj}, Astrojorge ${td}. ¡Ganaste ${formato(h.apuesta)}!`; }
    else if (tj === td) { paga = h.apuesta; texto = `Empate a ${tj}: te devuelven la apuesta`; }
    else texto = `Astrojorge ${td}, vos ${tj}. Perdiste ${formato(h.apuesta)}`;
    this.pagar(paga);
    const gano = paga > h.apuesta;
    this.mensaje(texto, gano ? 'gana' : paga ? '' : 'pierde');
    if (gano) sfx.premio(bjJ);
    this.decir(una(gano ? FRASES.ganaste : paga ? ['Empate, nadie pierde'] : FRASES.perdiste));
    h.terminada = true;
    this.repartiendo = false;
    this.botones([['Repartir', () => this.repartirBJ(), { clase: 'cas-principal' }]]);
  }

  // ---------- Póker (Casino Hold'em contra la casa) ----------
  panelPoker() {
    this.el.mesa.innerHTML = '<div class="cas-fila"><span class="cas-quien">Astrojorge</span><span class="cas-cartas" data-q="d"></span><span class="cas-total" data-q="dm"></span></div><div class="cas-fila"><span class="cas-quien">Mesa</span><span class="cas-cartas" data-q="m"></span></div><div class="cas-fila"><span class="cas-quien">Vos</span><span class="cas-cartas" data-q="j"></span><span class="cas-total" data-q="jm"></span></div>';
    this.botones([['Repartir (ante)', () => this.repartirPoker(), { clase: 'cas-principal' }]]);
  }

  dibujarPoker() {
    const h = this.mano;
    const q = (k) => this.el.mesa.querySelector(`[data-q="${k}"]`);
    q('d').innerHTML = h.dealer.map((c) => this.htmlCarta(c, h.tapada)).join('');
    q('m').innerHTML = [0, 1, 2, 3, 4].map((i) => (h.mesa[i] ? this.htmlCarta(h.mesa[i]) : '<span class="cas-carta vacia"></span>')).join('');
    q('j').innerHTML = h.jugador.map((c) => this.htmlCarta(c)).join('');
    q('jm').textContent = NOMBRES_MANO[mejorMano([...h.jugador, ...h.mesa])[0]];
    q('dm').textContent = h.tapada ? '' : NOMBRES_MANO[mejorMano([...h.dealer, ...h.mesa])[0]];
  }

  async repartirPoker() {
    if (this.repartiendo) return;
    const ante = this.apuesta;
    if (!this.cobrar(ante)) return;
    this.limpiarCartas3d();
    const M = this.mesas.poker;
    this.mano = { jugador: [], dealer: [], mesa: [], ante, tapada: true, terminada: false, cartas3dDealer: [] };
    const h = this.mano;
    this.repartiendo = true;
    this.mensaje('');
    this.botones([]);
    for (let i = 0; i < 2; i++) {
      h.jugador.push(this.sacarCarta());
      this.carta3d(h.jugador[i], M.x - 0.45 + i * 0.9, M.z - 1.7);
      await this.esperar(0.3);
      h.dealer.push(this.sacarCarta());
      h.cartas3dDealer.push(this.carta3d(h.dealer[i], M.x - 0.45 + i * 0.9, M.z + 1.3, true));
      this.dibujarPoker();
      await this.esperar(0.3);
    }
    for (let i = 0; i < 3; i++) {
      h.mesa.push(this.sacarCarta());
      this.carta3d(h.mesa[i], M.x - 2 + i * 1.0, M.z - 0.1);
      this.dibujarPoker();
      await this.esperar(0.35);
    }
    this.repartiendo = false;
    const ir = 2 * ante;
    this.mensaje(`¿Vas? Ir cuesta ${formato(ir)} más (el doble del ante)`);
    this.botones([
      [`Ir (${formato(ir)})`, () => this.irPoker(), { clase: 'cas-principal', desactivado: this.estado.plata < ir }],
      ['Retirarse', () => this.retirarsePoker()],
    ]);
  }

  async retirarsePoker() {
    const h = this.mano;
    if (h.terminada || this.repartiendo) return;
    this.repartiendo = true;
    await this.mostrarRestoPoker();
    h.terminada = true;
    this.repartiendo = false;
    this.guardar();
    this.mensaje(`Te retiraste: perdiste el ante (${formato(h.ante)})`, 'pierde');
    this.decir(una(FRASES.perdiste));
    this.botones([['Repartir (ante)', () => this.repartirPoker(), { clase: 'cas-principal' }]]);
  }

  async mostrarRestoPoker() {
    const h = this.mano;
    const M = this.mesas.poker;
    this.botones([]);
    while (h.mesa.length < 5) {
      h.mesa.push(this.sacarCarta());
      this.carta3d(h.mesa.at(-1), M.x - 2 + (h.mesa.length - 1) * 1.0, M.z - 0.1);
      this.dibujarPoker();
      await this.esperar(0.5);
    }
    h.tapada = false;
    h.cartas3dDealer.forEach((m) => this.destapar3d(m));
    this.dibujarPoker();
    await this.esperar(0.4);
  }

  async irPoker() {
    const h = this.mano;
    if (h.terminada || this.repartiendo || !this.cobrar(2 * h.ante)) return;
    this.repartiendo = true;
    await this.mostrarRestoPoker();
    const mj = mejorMano([...h.jugador, ...h.mesa]);
    const md = mejorMano([...h.dealer, ...h.mesa]);
    const califica = md[0] >= 2 || (md[0] === 1 && md[1] >= 4);
    const ante = h.ante;
    const ir = 2 * ante;
    const pagoAnte = ante * (1 + PAGO_ANTE[mj[0]]);
    let paga;
    let texto;
    if (!califica) {
      paga = pagoAnte + ir;
      texto = `Astrojorge no califica (${NOMBRES_MANO[md[0]]}): te paga el ante ${PAGO_ANTE[mj[0]]} a 1 y te devuelve el ir. Ganaste ${formato(paga - ante - ir)}`;
    } else {
      const cmp = comparar(mj, md);
      if (cmp > 0) { paga = pagoAnte + ir * 2; texto = `¡${NOMBRES_MANO[mj[0]]} le gana a ${NOMBRES_MANO[md[0]]}! Ganaste ${formato(paga - ante - ir)}`; }
      else if (cmp === 0) { paga = ante + ir; texto = 'Empate: te devuelven todo'; }
      else { paga = 0; texto = `${NOMBRES_MANO[md[0]]} de Astrojorge le gana a tu ${NOMBRES_MANO[mj[0]].toLowerCase()}. Perdiste ${formato(ante + ir)}`; }
    }
    this.pagar(paga);
    const gano = paga > ante + ir;
    this.mensaje(texto, gano ? 'gana' : paga ? '' : 'pierde');
    if (gano) sfx.premio(mj[0] >= 6);
    this.decir(una(gano ? FRASES.ganaste : paga ? ['Empate, nadie pierde'] : FRASES.perdiste));
    h.terminada = true;
    this.repartiendo = false;
    this.botones([['Repartir (ante)', () => this.repartirPoker(), { clase: 'cas-principal' }]]);
  }

  // ---------- Ruleta ----------
  // Apuestas: pleno (número, paga 35 a 1), rojo/negro, par/impar, 1-18/19-36 (1 a 1), docenas y
  // columnas (2 a 1). Las fichas quedan en el paño para repetir; "Borrar" las saca.
  panelRuleta() {
    this.apuestasRuleta ??= {};
    const celdas = [];
    celdas.push('<button type="button" class="rc cero" data-b="n0" style="grid-row:1/4;grid-column:1">0</button>');
    for (let n = 1; n <= 36; n++) {
      const col = Math.floor((n - 1) / 3) + 2;
      const fila = 3 - ((n - 1) % 3);
      celdas.push(`<button type="button" class="rc ${colorNumero(n)}" data-b="n${n}" style="grid-row:${fila};grid-column:${col}">${n}</button>`);
    }
    for (let f = 1; f <= 3; f++) celdas.push(`<button type="button" class="rc afuera" data-b="col${4 - f}" style="grid-row:${f};grid-column:14">2a1</button>`);
    ['1ª 12', '2ª 12', '3ª 12'].forEach((t, i) => celdas.push(`<button type="button" class="rc afuera" data-b="doc${i + 1}" style="grid-row:4;grid-column:${2 + i * 4}/${6 + i * 4}">${t}</button>`));
    [['bajo', '1-18'], ['par', 'PAR'], ['rojo', '◆'], ['negro', '◆'], ['impar', 'IMPAR'], ['alto', '19-36']].forEach(([k, t], i) => celdas.push(`<button type="button" class="rc afuera ${k === 'rojo' ? 'rojo' : k === 'negro' ? 'negro' : ''}" data-b="${k}" style="grid-row:5;grid-column:${2 + i * 2}/${4 + i * 2}">${t}</button>`));
    this.el.mesa.innerHTML = `<div class="cas-historial"></div><div class="cas-pano">${celdas.join('')}</div>`;
    this.el.mesa.querySelector('.cas-pano').addEventListener('click', (e) => {
      const b = e.target.closest('[data-b]');
      if (!b || this.ruleta.giro) return;
      const total = this.totalRuleta();
      if (total + this.apuesta > LIMITE) { this.ui.toast(`El máximo en la mesa es ${formato(LIMITE)} por tirada`, 'error'); sfx.error(); return; }
      if (total + this.apuesta > this.estado.plata) { this.ui.toast('No te alcanza para otra ficha', 'error'); sfx.error(); return; }
      this.apuestasRuleta[b.dataset.b] = (this.apuestasRuleta[b.dataset.b] || 0) + this.apuesta;
      sfx.ficha();
      this.dibujarRuleta();
    });
    this.dibujarRuleta();
  }

  totalRuleta() { return Object.values(this.apuestasRuleta || {}).reduce((a, b) => a + b, 0); }

  dibujarRuleta() {
    for (const b of this.el.mesa.querySelectorAll('[data-b]')) {
      const v = this.apuestasRuleta[b.dataset.b];
      b.querySelector('.ficha')?.remove();
      if (v) b.insertAdjacentHTML('beforeend', `<span class="ficha">${formato(v)}</span>`);
    }
    this.el.mesa.querySelector('.cas-historial').innerHTML = this.historial.map((n) => `<span class="rh ${colorNumero(n)}">${n}</span>`).join('');
    const total = this.totalRuleta();
    if (!this.ruleta.giro) {
      this.botones([
        [total ? `Girar (${formato(total)})` : 'Girar', () => this.girarRuleta(), { clase: 'cas-principal', desactivado: !total }],
        ['Borrar', () => { this.apuestasRuleta = {}; this.dibujarRuleta(); }, { desactivado: !total }],
      ]);
      if (!total) this.mensaje('Tocá el paño para poner fichas (con el monto de la apuesta)');
    }
  }

  girarRuleta() {
    const R = this.ruleta;
    const total = this.totalRuleta();
    if (R.giro || !total || !this.cobrar(total)) return;
    const n = Math.floor(Math.random() * 37);
    const T = 6;
    const psi0 = R.ang;
    const psiFin = psi0 + Math.PI * 4;
    const k = RUEDA.indexOf(n);
    // Ángulo del casillero en el mundo = su ángulo en la textura menos el giro del plato.
    R.giro = { t: 0, T, psi0, psiFin, k, n, total };
    R.k = null;
    this.decir('No va más');
    sfx.bolita();
    this.mensaje('No va más...');
    this.botones([]);
  }

  terminarRuleta() {
    const R = this.ruleta;
    const { n, total, k: casillero } = R.giro;
    R.giro = null;
    R.k = casillero;
    const c = colorNumero(n);
    const gana = (k) => {
      if (k === `n${n}`) return 36;
      if (n === 0) return 0;
      if (k === 'rojo') return c === 'rojo' ? 2 : 0;
      if (k === 'negro') return c === 'negro' ? 2 : 0;
      if (k === 'par') return n % 2 === 0 ? 2 : 0;
      if (k === 'impar') return n % 2 === 1 ? 2 : 0;
      if (k === 'bajo') return n <= 18 ? 2 : 0;
      if (k === 'alto') return n >= 19 ? 2 : 0;
      if (k.startsWith('doc')) return Math.ceil(n / 12) === +k[3] ? 3 : 0;
      if (k.startsWith('col')) return ((n - 1) % 3) + 1 === +k[3] ? 3 : 0;
      return 0;
    };
    let paga = 0;
    for (const [k, v] of Object.entries(this.apuestasRuleta)) paga += v * gana(k);
    this.pagar(paga);
    this.historial = [n, ...this.historial].slice(0, 12);
    const nombre = `${n} ${c}`;
    if (paga > total) { this.mensaje(`¡${nombre}! Ganaste ${formato(paga - total)}`, 'gana'); sfx.premio(paga >= total * 10); this.decir(`${nombre}. ${una(FRASES.ganaste)}`); }
    else if (paga) { this.mensaje(`${nombre}. Recuperaste ${formato(paga)} de ${formato(total)}`); this.decir(nombre); }
    else { this.mensaje(`${nombre}. Perdiste ${formato(total)}`, 'pierde'); this.decir(`${nombre}. ${una(FRASES.perdiste)}`); }
    if (this.jugando?.tipo === 'ruleta') this.dibujarRuleta();
  }

  // ---------- Cada cuadro ----------
  actualizar(dt, jugador, noche) {
    if (!this.listo) return;
    const abierto = !this.progreso || this.progreso() >= CASINO_DESDE;
    if (abierto !== this.abierto) {
      this.abierto = abierto;
      if (abierto) this.cierre.set(new THREE.Vector3(1e6, -10, 1e6), new THREE.Vector3(1e6, -9, 1e6));
      else this.cierre.copy(this.cierreCaja);
      this.avisoCerrado.sprite.visible = !abierto;
    }
    this.reloj += dt;
    const t = this.reloj;
    const l = this.local(jugador.pos);
    const cerca = Math.abs(l.x - (this.b.x0 + 20)) < 160 && Math.abs(l.z - (this.b.z0 + 20)) < 160;
    if (!cerca) return;
    // Letras CASINO: de día rosa neón; de noche, cada una cambia de color (y cada tanto titilan todas).
    const tmp = this.colTmp ??= new THREE.Color();
    this.letras.forEach((m, i) => {
      tmp.setHSL(((t * 0.18 + i / 6) % 1), 1, 0.58);
      const destello = noche > 0.5 && Math.floor(t * 3) % 17 === 0 ? 1.4 : 1;
      m.color.set('#ff4f78').lerp(tmp, noche).multiplyScalar(destello);
    });
    // Lamparitas de la marquesina y tiras de las máquinas: tres grupos que se van prendiendo.
    for (let k = 0; k < 3; k++) {
      const on = (Math.floor(t * 4) % 3) === k;
      this.ciudad.materiales[`tira${k}`].color.setScalar(on ? 1.15 : 0.45);
    }
    if (Math.floor(t * 6) !== this.cuadroJackpot) { this.cuadroJackpot = Math.floor(t * 6); this.dibujarJackpot(t); }
    // Rodillos girando.
    for (const mq of this.maquinas) {
      let cambio = false;
      for (const rod of mq.rodillos) {
        const g = rod.giro;
        if (!g) continue;
        g.t += dt;
        const f = Math.min(1, g.t / g.dur);
        const e = 1 - (1 - f) ** 3;
        rod.ang = g.desde + (g.hasta - g.desde) * e;
        cambio = true;
        if (f >= 1) { rod.giro = null; rod.ang = g.hasta; sfx.rodillo(); }
      }
      if (cambio) {
        this.ponerRodillos(mq);
        if (mq.pendiente && mq.rodillos.every((r) => !r.giro)) this.terminarTragamonedas(mq);
      }
    }
    // Ruleta: el plato gira siempre despacito; tirando, la bolita corre al revés y cae.
    const R = this.ruleta;
    const PASO = (Math.PI * 2) / 37;
    if (R.giro) {
      // El plato frena de a poco; la bolita corre al revés por el borde, baja en espiral y queda
      // en su casillero (el ángulo de un casillero en el mundo es el de la textura menos el giro).
      const G = R.giro;
      G.t += dt;
      const f = Math.min(1, G.t / G.T);
      R.ang = G.psi0 + (G.psiFin - G.psi0) * (1 - (1 - f) ** 2);
      const ang = G.k * PASO - R.ang - Math.PI * 12 * (1 - f) ** 3;
      const radio = f < 0.65 ? 1.95 : f < 0.85 ? 1.95 - ((f - 0.65) / 0.2) * 0.5 + Math.abs(Math.sin(f * 50)) * 0.06 : 1.45;
      this.ponerBolita(radio, ang);
      if (f >= 1) this.terminarRuleta();
    } else {
      R.ang += dt * 0.25;
      if (R.k !== null) this.ponerBolita(1.45, R.k * PASO - R.ang); // quieta en su casillero, girando con el plato
    }
    R.plato.rotation.y = R.ang;
    // Astrojorge: camina a su mesa y espera mirando a los jugadores.
    const a = this.astro;
    if (a) {
      const p = a.m.grupo.position;
      let vel = 0;
      if (a.camino.length) {
        const d = a.camino[0];
        const dx = d.x - p.x;
        const dz = d.z - p.z;
        const dist = Math.hypot(dx, dz);
        const v = 9;
        if (dist < v * dt) { p.x = d.x; p.z = d.z; a.camino.shift(); } else { p.x += (dx / dist) * v * dt; p.z += (dz / dist) * v * dt; vel = v; }
        if (dist > 0.01) a.m.grupo.rotation.y = Math.atan2(dx, dz);
      } else a.m.grupo.rotation.y = Math.PI;
      a.m.animar(dt, vel, true);
      if (a.globo > 0 && (a.globo -= dt) <= 0) a.etiqueta.actualizar([{ texto: ASTROJORGE.nombre, tam: 60, color: '#ffd54a' }]);
    }
  }
}
