// Piezas de la mansión moderna: losas, paredes con ventanales, escaleras y barandas.
// Cada función recibe el "kit" (k) con los creadores de bloques y un grupo (g) donde agregar.
import { MANSION as M, NUCLEO, COLUMNA, PASILLO, ALTO_PISO, LOSA, nivel } from './constantes.js';

const GROSOR_EXT = 0.5;
const GROSOR_INT = 0.4;
const ALTO_PARED = ALTO_PISO - LOSA;
const VENTANAL = { y0: 0.8, y1: 8.8 };
const PUERTA = { y0: 0, y1: 7 };

export const COLORES = {
  marco: '#24282c',
  baranda: '#24282c',
  luz: '#ffe3a8',
};

// Materiales con textura (estilo mansión moderna: estuco blanco, piedra, paneles carbón,
// listones de madera, piso de tablas, ladrillo visto).
function materiales(k) {
  return {
    losa: k.tex('estuco', '#f3f1ec', 3),
    pisoPB: k.tex('baldosa', '#ece6dc', 4),
    piso: k.tex('tablas', '#c9a074', 6),
    deck: k.tex('tablas', '#9c7451', 5),
    estuco: k.tex('estuco', '#f6f4ef', 3),
    piedra: k.tex('piedra', '#c9c4bc', 4),
    carbon: k.tex('panel', '#3a3f44', 4),
    madera: k.tex('listones', '#b07a4f', 3),
    interior: k.tex('estuco', '#f7f3ee', 3),
    ladrillo: k.tex('ladrillo', '#b5654a', 3),
    escalon: k.tex('tablas', '#a87b4f', 3),
  };
}

// Zonas de la fachada: centro de madera, alas de estuco y extremos de piedra (abajo)
// o paneles carbón (arriba).
function zonasFachada(k, n) {
  const m = materiales(k);
  const extremo = n <= 1 ? m.piedra : m.carbon;
  const ala = n === 3 ? m.carbon : m.estuco; // el último piso es un volumen oscuro
  return [
    { a: -44, b: -26, m: extremo }, { a: -26, b: -8, m: ala }, { a: -8, b: 8, m: m.madera },
    { a: 8, b: 26, m: ala }, { a: 26, b: 44, m: extremo },
  ];
}

// Pared dividida en zonas de distinto material (los huecos caen siempre dentro de una zona).
function paredZonas(k, g, eje, fijo, base, alto, grosor, huecos, zonas) {
  for (const z of zonas) {
    pared(k, g, eje, fijo, z.a, z.b, base, alto, grosor, z.m, huecos.filter((h) => h.a >= z.a && h.b <= z.b));
  }
}

// Escaleras de 20 escalones en el centro del núcleo. Tipo A (pisos pares) sube hacia
// el fondo por x[-4,0]; tipo B (pisos impares) sube hacia el frente por x[0,4].
const Z_ESC_FRENTE = -12;
const Z_ESC_FONDO = -28;
const ESCALONES = 20;
const PASO_Z = (Z_ESC_FRENTE - Z_ESC_FONDO) / ESCALONES;

export function huecoEscalera(n) {
  return n % 2 === 0
    ? { x0: -4, x1: 0, z0: Z_ESC_FONDO, z1: Z_ESC_FRENTE }
    : { x0: 0, x1: 4, z0: Z_ESC_FONDO, z1: Z_ESC_FRENTE };
}

// Losa rectangular con un hueco opcional. y = altura de la cara de arriba.
export function losa(k, g, x0, x1, z0, z1, y, grosor, color, hueco = null) {
  const agregar = (a0, a1, b0, b1) => {
    if (a1 - a0 > 0.01 && b1 - b0 > 0.01) g.add(k.cajaDe(a0, y - grosor, b0, a1, y, b1, color));
  };
  if (!hueco) return agregar(x0, x1, z0, z1);
  const h = hueco;
  agregar(x0, x1, z0, h.z0);
  agregar(x0, x1, h.z1, z1);
  agregar(x0, h.x0, h.z0, h.z1);
  agregar(h.x1, x1, h.z0, h.z1);
}

// Pared recta. eje 'x': corre a lo largo de X a z = fijo. eje 'z': a lo largo de Z a x = fijo.
// huecos: [{ a, b, y0, y1 }] (a..b sobre el eje, y0..y1 relativos a la base).
export function pared(k, g, eje, fijo, a0, a1, base, alto, grosor, color, huecos = []) {
  const bloque = (s0, s1, y0, y1) => {
    if (s1 - s0 < 0.01 || y1 - y0 < 0.01) return;
    if (eje === 'x') g.add(k.cajaDe(s0, base + y0, fijo - grosor / 2, s1, base + y1, fijo + grosor / 2, color));
    else g.add(k.cajaDe(fijo - grosor / 2, base + y0, s0, fijo + grosor / 2, base + y1, s1, color));
  };
  let s = a0;
  for (const h of [...huecos].sort((p, q) => p.a - q.a)) {
    bloque(s, h.a, 0, alto);
    bloque(h.a, h.b, 0, h.y0);
    bloque(h.a, h.b, Math.min(h.y1, alto), alto);
    s = h.b;
  }
  bloque(s, a1, 0, alto);
}

// ---------- Huecos de cada piso ----------

const espejar = (lista) => [...lista, ...lista.map((h) => ({ ...h, a: -h.b, b: -h.a }))];

function huecosExteriores(n) {
  const salas = espejar([{ a: 10, b: 24, ...VENTANAL }, { a: 28, b: 42, ...VENTANAL }]);
  return {
    frente: [...salas, n === 0 ? { a: -5, b: 5, ...PUERTA } : { a: -6, b: 6, ...VENTANAL }],
    fondo: [...salas, n === 0 ? { a: -2.5, b: 2.5, ...PUERTA } : { a: -6, b: 6, ...VENTANAL }],
    costado: [{ a: -12, b: -2, ...VENTANAL }, { a: -19, b: -15, ...VENTANAL }, { a: -32, b: -22, ...VENTANAL }],
  };
}

// ---------- Piezas por piso ----------

// Losa del piso n (sobresale como una banda blanca) + la escalera que llega desde abajo.
export function pisoConEscalera(k, g, n) {
  const y = nivel(n);
  const hueco = n === 0 ? null : huecoEscalera(n - 1);
  const vuelo = n === 4 ? 2.5 : 1.2;
  const frente = n === 0 ? 3 : n === 4 ? 3.5 : 2.5;
  const m = materiales(k);
  // La terraza lleva un borde blanco grueso (remate del edificio).
  const grosor = n === 4 ? 1.1 : LOSA - 0.1;
  losa(k, g, M.x0 - vuelo, M.x1 + vuelo, M.z0 - vuelo, M.z1 + frente, y - 0.1, grosor, m.losa, hueco);
  if (n >= 1 && n <= 3) {
    // Balcón saliente en el centro de la fachada, con baranda de vidrio.
    const zb = M.z1 + 5.5;
    g.add(k.cajaDe(-8, y - 0.4, M.z1 + frente, 8, y - 0.1, zb, m.losa));
    g.add(k.cajaDe(-8, y - 0.1, M.z1, 8, y, zb, m.deck));
    g.add(k.cajaDe(-8, y, zb - 0.15, 8, y + 1.3, zb, k.vidrio));
    g.add(k.cajaDe(-8, y, M.z1 + 0.5, -7.85, y + 1.3, zb, k.vidrio));
    g.add(k.cajaDe(7.85, y, M.z1 + 0.5, 8, y + 1.3, zb, k.vidrio));
    g.add(k.noSolido(k.cajaDe(-8, y + 1.3, zb - 0.15, 8, y + 1.42, zb, COLORES.baranda)));
  }
  losa(k, g, M.x0, M.x1, M.z0, M.z1, y, 0.1, n === 0 ? m.pisoPB : n === 4 ? m.deck : m.piso, hueco);
  if (n > 0) {
    escalera(k, g, n - 1);
    barandaHueco(k, g, n);
  }
}

export function escalera(k, g, n) {
  const tipoA = n % 2 === 0;
  const base = nivel(n);
  const x0 = tipoA ? -3.9 : 0.1;
  const x1 = tipoA ? -0.1 : 3.9;
  const madera = materiales(k).escalon;
  // Escalones flotantes de madera.
  for (let i = 1; i <= ESCALONES; i++) {
    const tope = base + (ALTO_PISO / ESCALONES) * i;
    let z0;
    let z1;
    if (tipoA) { z1 = Z_ESC_FRENTE - PASO_Z * (i - 1); z0 = z1 - PASO_Z; }
    else { z0 = Z_ESC_FONDO + PASO_Z * (i - 1); z1 = z0 + PASO_Z; }
    g.add(k.cajaDe(x0, tope - 0.3, z0, x1, tope, z1, madera));
  }
  // Largueros de metal negro en diagonal (decorativos, no chocan).
  const largo = Math.hypot(Z_ESC_FRENTE - Z_ESC_FONDO, ALTO_PISO);
  const angulo = Math.atan2(ALTO_PISO, Z_ESC_FRENTE - Z_ESC_FONDO);
  for (const x of [x0 - 0.08, x1 + 0.08]) {
    const l = k.noSolido(k.caja(0.16, 0.7, largo, COLORES.marco, x, base + ALTO_PISO / 2 - 0.5, (Z_ESC_FRENTE + Z_ESC_FONDO) / 2));
    l.rotation.x = tipoA ? angulo : -angulo;
    g.add(l);
  }
}

// Baranda alrededor del hueco de la escalera en el piso n (para no caerse).
function barandaHueco(k, g, n) {
  const h = huecoEscalera(n - 1);
  const y = nivel(n);
  const alto = 1.3;
  const vidrio = (x0, z0, x1, z1) => g.add(k.cajaDe(x0, y, z0, x1, y + alto, z1, k.vidrio));
  const pasamanos = (x0, z0, x1, z1) => g.add(k.noSolido(k.cajaDe(x0, y + alto, z0, x1, y + alto + 0.12, z1, COLORES.baranda)));
  const tramo = (x0, z0, x1, z1) => { vidrio(x0, z0, x1, z1); pasamanos(x0, z0, x1, z1); };
  // Costados largos (x0 y x1) siempre; el borde corto del lado contrario a la llegada.
  tramo(h.x0, h.z0, h.x0 + 0.2, h.z1);
  tramo(h.x1 - 0.2, h.z0, h.x1, h.z1);
  if (h.x0 < 0) tramo(h.x0, h.z1 - 0.2, h.x1, h.z1); // tipo A: se llega por el fondo
  else tramo(h.x0, h.z0, h.x1, h.z0 + 0.2);           // tipo B: se llega por adelante
}

export function paredesExteriores(k, g, n) {
  const base = nivel(n);
  const hu = huecosExteriores(n);
  const t = GROSOR_EXT;
  const zonas = zonasFachada(k, n);
  const lateral = zonas[0].m;
  paredZonas(k, g, 'x', M.z1 - t / 2, base, ALTO_PARED, t, hu.frente, zonas);
  paredZonas(k, g, 'x', M.z0 + t / 2, base, ALTO_PARED, t, hu.fondo, zonas);
  pared(k, g, 'z', M.x0 + t / 2, M.z0 + t, M.z1 - t, base, ALTO_PARED, t, lateral, hu.costado);
  pared(k, g, 'z', M.x1 - t / 2, M.z0 + t, M.z1 - t, base, ALTO_PARED, t, lateral, hu.costado);
}

export function paredesInteriores(k, g, n) {
  const base = nivel(n);
  const m = materiales(k);
  const c = m.interior;
  const t = GROSOR_INT;
  const z0 = M.z0 + GROSOR_EXT;
  const z1 = M.z1 - GROSOR_EXT;
  const pasillo = { a: PASILLO.z0 + 0.2, b: PASILLO.z1 - 0.2, y0: 0, y1: ALTO_PARED };
  for (const s of [-1, 1]) {
    // Núcleo y división entre columnas: abiertas a la altura del pasillo.
    pared(k, g, 'z', s * NUCLEO, z0, z1, base, ALTO_PARED, t, m.ladrillo, [{ ...pasillo, y1: PUERTA.y1 }]);
    pared(k, g, 'z', s * COLUMNA, z0, z1, base, ALTO_PARED, t, c, [pasillo]);
    // Paredes del pasillo con una puerta por habitación.
    const puertas = [17, 35].map((x) => ({ a: s > 0 ? x - 2 : -x - 2, b: s > 0 ? x + 2 : -x + 2, ...PUERTA }));
    const a0 = s > 0 ? NUCLEO + t / 2 : M.x0 + GROSOR_EXT;
    const a1 = s > 0 ? M.x1 - GROSOR_EXT : -NUCLEO - t / 2;
    pared(k, g, 'x', PASILLO.z1, a0, a1, base, ALTO_PARED, t, c, puertas);
    pared(k, g, 'x', PASILLO.z0, a0, a1, base, ALTO_PARED, t, c, puertas);
    // Luces empotradas en el techo del pasillo.
    for (let x = 12; x < 44; x += 7) {
      g.add(k.noSolido(k.cajaDe(s * x - 1, base + ALTO_PARED - 0.08, PASILLO.z0 + 2, s * x + 1, base + ALTO_PARED, PASILLO.z1 - 2, k.brillo(COLORES.luz))));
    }
  }
  // Lámparas colgantes en el hall.
  for (const x of [-3, 3]) colgante(k, g, x, base + ALTO_PARED, -6);
}

// Lámpara colgante: cable, pantalla negra y luz cálida abajo.
export function colgante(k, g, x, techo, z) {
  g.add(k.noSolido(k.cajaDe(x - 0.04, techo - 2.6, z - 0.04, x + 0.04, techo, z + 0.04, COLORES.marco)));
  g.add(k.noSolido(k.cajaDe(x - 0.7, techo - 3.2, z - 0.7, x + 0.7, techo - 2.6, z + 0.7, COLORES.marco)));
  g.add(k.noSolido(k.cajaDe(x - 0.55, techo - 3.25, z - 0.55, x + 0.55, techo - 3.2, z + 0.55, k.brillo(COLORES.luz))));
}

// Vidrios con parantes negros y, en planta baja, las puertas de entrada.
export function aberturas(k, g, n) {
  const base = nivel(n);
  const hu = huecosExteriores(n);
  const negro = COLORES.marco;
  const lado = (eje, fijo, lista) => {
    const caja = (a0, y0, a1, y1, grosor, mat) => (eje === 'x'
      ? k.cajaDe(a0, y0, fijo - grosor, a1, y1, fijo + grosor, mat)
      : k.cajaDe(fijo - grosor, y0, a0, fijo + grosor, y1, a1, mat));
    for (const h of lista) {
      const y0 = base + h.y0;
      const y1 = base + h.y1;
      if (h.y0 > 0) {
        g.add(caja(h.a, y0, h.b, y1, 0.05, k.vidrio));
        // Marco negro que sobresale en los ventanales de las alas (fachada del frente).
        const ala = Math.abs((h.a + h.b) / 2) > 8 && Math.abs((h.a + h.b) / 2) < 26;
        if (eje === 'x' && fijo > -1 && n >= 1 && ala) {
          const z0 = M.z1;
          const z1 = M.z1 + 1;
          g.add(k.noSolido(k.cajaDe(h.a - 0.4, y1, z0, h.b + 0.4, y1 + 0.4, z1, negro)));
          g.add(k.noSolido(k.cajaDe(h.a - 0.4, y0 - 0.4, z0, h.b + 0.4, y0, z1, negro)));
          g.add(k.noSolido(k.cajaDe(h.a - 0.4, y0, z0, h.a, y1, z1, negro)));
          g.add(k.noSolido(k.cajaDe(h.b, y0, z0, h.b + 0.4, y1, z1, negro)));
        }
        g.add(k.noSolido(caja(h.a, y0 - 0.15, h.b, y0, 0.3, negro)));
        g.add(k.noSolido(caja(h.a, y1, h.b, y1 + 0.15, 0.3, negro)));
        const partes = Math.max(1, Math.round((h.b - h.a) / 3.5));
        for (let i = 1; i < partes; i++) {
          const x = h.a + ((h.b - h.a) * i) / partes;
          g.add(k.noSolido(caja(x - 0.07, y0, x + 0.07, y1, 0.12, negro)));
        }
      } else if (eje === 'x') {
        // Puerta de vidrio abierta: marco negro + hojas giradas hacia afuera (no chocan).
        const sale = fijo > -10 ? 1 : -1;
        g.add(k.noSolido(caja(h.a - 0.3, base, h.a, y1 + 0.3, 0.35, negro)));
        g.add(k.noSolido(caja(h.b, base, h.b + 0.3, y1 + 0.3, 0.35, negro)));
        g.add(k.noSolido(caja(h.a - 0.3, y1, h.b + 0.3, y1 + 0.3, 0.35, negro)));
        const ancho = (h.b - h.a) / 2;
        g.add(k.noSolido(k.cajaDe(h.a, base, fijo, h.a + 0.1, y1, fijo + sale * ancho, k.vidrio)));
        g.add(k.noSolido(k.cajaDe(h.b - 0.1, base, fijo, h.b, y1, fijo + sale * ancho, k.vidrio)));
      }
    }
  };
  lado('x', M.z1 - GROSOR_EXT / 2, hu.frente);
  lado('x', M.z0 + GROSOR_EXT / 2, hu.fondo);
  lado('z', M.x0 + GROSOR_EXT / 2, hu.costado);
  lado('z', M.x1 - GROSOR_EXT / 2, hu.costado);
  if (n === 0) {
    // Alero oscuro sobre la entrada.
    g.add(k.noSolido(k.cajaDe(-8, 7.6, 0, 8, 8.1, 6, COLORES.marco)));
  }
}

// Terraza: losa con la última escalera, baranda de vidrio y pabellón de vidrio.
export function terraza(k, g) {
  const y = nivel(4);
  pisoConEscalera(k, g, 4);
  const alto = 1.3;
  const borde = (x0, z0, x1, z1) => {
    g.add(k.cajaDe(x0, y, z0, x1, y + alto, z1, k.vidrio));
    g.add(k.noSolido(k.cajaDe(x0, y + alto, z0, x1, y + alto + 0.15, z1, COLORES.baranda)));
  };
  borde(M.x0, M.z1 - 0.2, M.x1, M.z1);
  borde(M.x0, M.z0, M.x1, M.z0 + 0.2);
  borde(M.x0, M.z0, M.x0 + 0.2, M.z1);
  borde(M.x1 - 0.2, M.z0, M.x1, M.z1);
  // Pabellón de vidrio alrededor de la llegada de la escalera.
  const h = 9;
  const vidrio = (x0, z0, x1, z1) => g.add(k.cajaDe(x0, y, z0, x1, y + h, z1, k.vidrio));
  vidrio(-6, -29.1, 6, -28.9);
  vidrio(-6.1, -29, -5.9, -8);
  vidrio(5.9, -29, 6.1, -8);
  vidrio(-6, -8.1, -1, -7.9);
  vidrio(5, -8.1, 6, -7.9);
  for (const [x, z] of [[-6, -29], [6, -29], [-6, -8], [6, -8]]) g.add(k.cajaDe(x - 0.2, y, z - 0.2, x + 0.2, y + h, z + 0.2, COLORES.marco));
  g.add(k.cajaDe(-8, y + h, -31, 8, y + h + 0.6, -6, COLORES.marco));
}
