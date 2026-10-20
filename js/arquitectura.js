// Piezas de la mansión: losas, paredes con huecos, escaleras y barandas.
// Cada función recibe el "kit" (k) con los creadores de bloques y un grupo (g) donde agregar.
import { MANSION as M, ALTO_PISO, LOSA, nivel } from './constantes.js';

const GROSOR_EXT = 0.5;
const GROSOR_INT = 0.4;
const ALTO_PARED = ALTO_PISO - LOSA;
const VENTANA = { y0: 2.4, y1: 5.6 };
const PUERTA = { y0: 0, y1: 6 };

export const COLORES = {
  losa: '#d7b48a',
  losaAlta: '#c9a77d',
  exterior: ['#f3ead8', '#f3ead8', '#f3ead8', '#f3ead8'],
  interior: '#fff6e5',
  zocalo: '#8d6e63',
  escalera: '#a1887f',
  baranda: '#ffffff',
  marco: '#ffffff',
  techo: '#b0453a',
};

// Escalera del piso n: tipo A (pisos pares) sube hacia el fondo por x[-5,0];
// tipo B (pisos impares) sube hacia el frente por x[0,5].
const Z_ESC_FRENTE = -12;
const Z_ESC_FONDO = -24.8;
const PASO_Z = 0.8;
const ESCALONES = 16;

export function huecoEscalera(n) {
  return n % 2 === 0
    ? { x0: -5, x1: 0, z0: Z_ESC_FONDO, z1: Z_ESC_FRENTE }
    : { x0: 0, x1: 5, z0: Z_ESC_FONDO, z1: Z_ESC_FRENTE };
}

// Losa rectangular con un hueco opcional. y = altura de la cara de arriba.
export function losa(k, g, x0, x1, z0, z1, y, color, hueco = null) {
  const agregar = (a0, a1, b0, b1) => {
    if (a1 - a0 > 0.01 && b1 - b0 > 0.01) g.add(k.cajaDe(a0, y - LOSA, b0, a1, y, b1, color));
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
    bloque(h.a, h.b, h.y1, alto);
    s = h.b;
  }
  bloque(s, a1, 0, alto);
}

// ---------- Huecos de cada piso ----------

function huecosExteriores(n) {
  return {
    frente: [
      n === 0 ? { a: -2.5, b: 2.5, ...PUERTA } : { a: -3, b: 3, ...VENTANA },
      { a: -17, b: -10, ...VENTANA },
      { a: 10, b: 17, ...VENTANA },
    ],
    fondo: [
      { a: -17, b: -10, ...VENTANA },
      { a: 10, b: 17, ...VENTANA },
      ...(n === 0 ? [{ a: 1, b: 4, ...PUERTA }] : []),
    ],
    oeste: [{ a: -24, b: -18, ...VENTANA }, { a: -10, b: -4, ...VENTANA }],
    este: [{ a: -24, b: -18, ...VENTANA }, { a: -10, b: -4, ...VENTANA }],
  };
}

const PUERTA_HALL = { a: -8, b: -4, ...PUERTA };

// ---------- Piezas por piso ----------

// Losa del piso n (con el hueco de la escalera del piso de abajo) + la escalera que llega.
export function pisoConEscalera(k, g, n) {
  const color = n === 0 ? COLORES.losa : COLORES.losaAlta;
  const hueco = n === 0 ? null : huecoEscalera(n - 1);
  losa(k, g, M.x0, M.x1, M.z0, M.z1, nivel(n), color, hueco);
  if (n > 0) {
    escalera(k, g, n - 1);
    barandaHueco(k, g, n);
  }
}

export function escalera(k, g, n) {
  const tipoA = n % 2 === 0;
  const base = nivel(n);
  const x0 = tipoA ? -4.8 : 0.1;
  const x1 = tipoA ? -0.1 : 4.8;
  for (let i = 1; i <= ESCALONES; i++) {
    const tope = base + (ALTO_PISO / ESCALONES) * i;
    let z0;
    let z1;
    if (tipoA) { z1 = Z_ESC_FRENTE - PASO_Z * (i - 1); z0 = z1 - PASO_Z; }
    else { z0 = Z_ESC_FONDO + PASO_Z * (i - 1); z1 = z0 + PASO_Z; }
    g.add(k.cajaDe(x0, base, z0, x1, tope, z1, i % 2 ? COLORES.escalera : '#8d6e63'));
  }
}

// Baranda alrededor del hueco de la escalera en el piso n (para no caerse).
function barandaHueco(k, g, n) {
  const h = huecoEscalera(n - 1);
  const y = nivel(n);
  const alto = 1.3;
  if (h.x0 < 0) {
    // Hueco tipo A: se llega por el fondo; baranda adelante y del lado x = 0.
    g.add(k.cajaDe(h.x0 + 0.2, y, h.z1 - 0.25, h.x1, y + alto, h.z1, COLORES.baranda));
    g.add(k.cajaDe(h.x1 - 0.25, y, h.z0, h.x1, y + alto, h.z1, COLORES.baranda));
  } else {
    // Hueco tipo B: se llega por adelante; baranda al fondo y del lado x = 0.
    g.add(k.cajaDe(h.x0, y, h.z0, h.x1 - 0.2, y + alto, h.z0 + 0.25, COLORES.baranda));
    g.add(k.cajaDe(h.x0, y, h.z0, h.x0 + 0.25, y + alto, h.z1, COLORES.baranda));
  }
}

export function paredesExteriores(k, g, n) {
  const base = nivel(n);
  const c = COLORES.exterior[n];
  const hu = huecosExteriores(n);
  const t = GROSOR_EXT;
  pared(k, g, 'x', M.z1 - t / 2, M.x0, M.x1, base, ALTO_PARED, t, c, hu.frente);
  pared(k, g, 'x', M.z0 + t / 2, M.x0, M.x1, base, ALTO_PARED, t, c, hu.fondo);
  pared(k, g, 'z', M.x0 + t / 2, M.z0 + t, M.z1 - t, base, ALTO_PARED, t, c, hu.oeste);
  pared(k, g, 'z', M.x1 - t / 2, M.z0 + t, M.z1 - t, base, ALTO_PARED, t, c, hu.este);
  // Cornisa entre pisos.
  g.add(k.noSolido(k.cajaDe(M.x0 - 0.3, base + ALTO_PARED - 0.3, M.z1 - 0.1, M.x1 + 0.3, base + ALTO_PARED + 0.4, M.z1 + 0.3, '#d9c8a9')));
}

export function paredesInteriores(k, g, n) {
  const base = nivel(n);
  const c = COLORES.interior;
  const t = GROSOR_INT;
  const z0 = M.z0 + GROSOR_EXT;
  const z1 = M.z1 - GROSOR_EXT;
  pared(k, g, 'z', -5, z0, z1, base, ALTO_PARED, t, c, [PUERTA_HALL]);
  pared(k, g, 'z', 5, z0, z1, base, ALTO_PARED, t, c, [PUERTA_HALL]);
  pared(k, g, 'x', -14, M.x0 + GROSOR_EXT, -5 - t / 2, base, ALTO_PARED, t, c, [{ a: -15, b: -11, ...PUERTA }]);
  pared(k, g, 'x', -14, 5 + t / 2, M.x1 - GROSOR_EXT, base, ALTO_PARED, t, c, [{ a: 11, b: 15, ...PUERTA }]);
}

// Vidrios, marcos y (en planta baja) las puertas.
export function aberturas(k, g, n) {
  const base = nivel(n);
  const hu = huecosExteriores(n);
  const vidrio = k.vidrio;
  const lado = (eje, fijo, lista) => {
    for (const h of lista) {
      const y0 = base + h.y0;
      const y1 = base + h.y1;
      if (h.y0 > 0) {
        if (eje === 'x') {
          g.add(k.cajaDe(h.a, y0, fijo - 0.06, h.b, y1, fijo + 0.06, vidrio));
          g.add(k.noSolido(k.cajaDe(h.a - 0.2, y0 - 0.25, fijo - 0.35, h.b + 0.2, y0, fijo + 0.35, COLORES.marco)));
          g.add(k.noSolido(k.cajaDe((h.a + h.b) / 2 - 0.08, y0, fijo - 0.1, (h.a + h.b) / 2 + 0.08, y1, fijo + 0.1, COLORES.marco)));
        } else {
          g.add(k.cajaDe(fijo - 0.06, y0, h.a, fijo + 0.06, y1, h.b, vidrio));
          g.add(k.noSolido(k.cajaDe(fijo - 0.35, y0 - 0.25, h.a - 0.2, fijo + 0.35, y0, h.b + 0.2, COLORES.marco)));
          g.add(k.noSolido(k.cajaDe(fijo - 0.1, y0, (h.a + h.b) / 2 - 0.08, fijo + 0.1, y1, (h.a + h.b) / 2 + 0.08, COLORES.marco)));
        }
      } else if (eje === 'x') {
        // Puerta abierta: marco + hojas giradas (no chocan).
        const zf = fijo;
        g.add(k.noSolido(k.cajaDe(h.a - 0.3, base, zf - 0.35, h.a, y1 + 0.3, zf + 0.35, '#6d4c41')));
        g.add(k.noSolido(k.cajaDe(h.b, base, zf - 0.35, h.b + 0.3, y1 + 0.3, zf + 0.35, '#6d4c41')));
        g.add(k.noSolido(k.cajaDe(h.a - 0.3, y1, zf - 0.35, h.b + 0.3, y1 + 0.3, zf + 0.35, '#6d4c41')));
        const sale = zf > -14 ? 1 : -1; // las hojas se abren hacia afuera
        const ancho = (h.b - h.a) / 2;
        g.add(k.noSolido(k.cajaDe(h.a, base, zf, h.a + 0.15, y1, zf + sale * ancho, '#8d5a3b')));
        g.add(k.noSolido(k.cajaDe(h.b - 0.15, base, zf, h.b, y1, zf + sale * ancho, '#8d5a3b')));
      }
    }
  };
  lado('x', M.z1 - GROSOR_EXT / 2, hu.frente);
  lado('x', M.z0 + GROSOR_EXT / 2, hu.fondo);
  lado('z', M.x0 + GROSOR_EXT / 2, hu.oeste);
  lado('z', M.x1 - GROSOR_EXT / 2, hu.este);
  if (n === 0) {
    // Escalones de la entrada y alero sobre la puerta.
    g.add(k.cajaDe(-4, 0, 0, 4, 0.2, 2, '#bdbdbd'));
    g.add(k.noSolido(k.cajaDe(-4.5, 6.6, 0, 4.5, 7, 3, COLORES.techo)));
  }
}

// Techo / terraza: losa con el hueco de la última escalera, parapeto y salida.
export function terraza(k, g) {
  const n = 4;
  const y = nivel(n);
  pisoConEscalera(k, g, n);
  const t = 0.5;
  const alto = 1.4;
  const c = '#e0d4bd';
  pared(k, g, 'x', M.z1 - t / 2, M.x0, M.x1, y, alto, t, c);
  pared(k, g, 'x', M.z0 + t / 2, M.x0, M.x1, y, alto, t, c);
  pared(k, g, 'z', M.x0 + t / 2, M.z0 + t, M.z1 - t, y, alto, t, c);
  pared(k, g, 'z', M.x1 - t / 2, M.z0 + t, M.z1 - t, y, alto, t, c);
  // Casilla de la escalera (techito arriba de la llegada).
  g.add(k.cajaDe(-0.3, y, -25.5, 5.3, y + 6, -25.1, c));
  g.add(k.cajaDe(5.0, y, -25.5, 5.3, y + 6, -12, c));
  g.add(k.noSolido(k.cajaDe(-0.5, y + 6, -25.6, 5.5, y + 6.4, -11.5, COLORES.techo)));
  g.add(k.noSolido(k.cajaDe(M.x0 - 0.4, y - 0.6, M.z0 - 0.4, M.x1 + 0.4, y - 0.3, M.z1 + 0.4, '#d9c8a9')));
}
