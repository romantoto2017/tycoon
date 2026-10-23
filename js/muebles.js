// Muebles de cada habitación. Coordenadas locales: (0,0) es el centro de la habitación,
// x de -8 a 8, z de -6.6 a 6.6, y desde el piso terminado.
import { nivel, ALTO_PISO, LOSA, PASILLO, NUCLEO, COLUMNA, MANSION } from './constantes.js';
import { colgante, GROSOR_INT } from './arquitectura.js';

// Habitaciones: W/E = ala oeste/este, I/O = columna interior/exterior, F/B = adelante/atrás.
const LUGARES = {
  WIF: [-17, -7], WIB: [-17, -27], WOF: [-35, -7], WOB: [-35, -27],
  EIF: [17, -7], EIB: [17, -27], EOF: [35, -7], EOB: [35, -27],
};

// Cada diseño se dibujó para un tipo de habitación ("nativo": WF, WB, EF o EB). Si va en
// otra, se refleja en X (oeste/este) y/o en Z (adelante/atrás) para que la puerta quede libre.
// Los diseños se dibujaron para habitaciones de 17,6 x 13,5 (paredes finas). Las posiciones se
// estiran o encogen para que el diseño vaya de cara a cara de las paredes reales (gruesas y
// con el pasillo ancho): así nada queda metido adentro de una pared.
const MEDIO_ANCHO = 8.8;
const MEDIO_FONDO = 6.75;
const ADENTRO_EXT = 0.5;
function caras(lugar) {
  const [cx, cz] = LUGARES[lugar];
  const s = Math.sign(cx);
  const ax = Math.abs(cx);
  const xa = ax < COLUMNA ? NUCLEO + GROSOR_INT / 2 : COLUMNA + GROSOR_INT / 2;
  const xb = ax < COLUMNA ? COLUMNA - GROSOR_INT / 2 : MANSION.x1 - ADENTRO_EXT;
  const [x0, x1] = s > 0 ? [xa, xb] : [-xb, -xa];
  const [z0, z1] = lugar[2] === 'F' ? [PASILLO.z1 + GROSOR_INT / 2, MANSION.z1 - ADENTRO_EXT] : [MANSION.z0 + ADENTRO_EXT, PASILLO.z0 - GROSOR_INT / 2];
  return { x0: x0 - cx, x1: x1 - cx, z0: z0 - cz, z1: z1 - cz };
}
// Convierte una coordenada del diseño (ya reflejada: + = hacia + del mundo) a la real.
function mapeo(lugar) {
  const c = caras(lugar);
  return {
    x: (w) => c.x0 + ((w + MEDIO_ANCHO) / (2 * MEDIO_ANCHO)) * (c.x1 - c.x0),
    z: (w) => c.z0 + ((w + MEDIO_FONDO) / (2 * MEDIO_FONDO)) * (c.z1 - c.z0),
  };
}

function sala(k, g, lugar, piso, nativo) {
  const [cx, cz] = LUGARES[lugar];
  const y = nivel(piso);
  const ex = lugar[0] === nativo[0] ? 1 : -1;
  const ez = lugar[2] === nativo[1] ? 1 : -1;
  const map = mapeo(lugar);
  const fx = (x) => map.x(ex * x);
  const fz = (z) => map.z(ez * z);
  const girar = (rot) => {
    let r = ex > 0 ? rot : -rot;
    if (ez < 0) r = Math.PI - r;
    return r;
  };
  const s = {
    b(x0, y0, z0, x1, y1, z1, color) {
      const [a0, a1] = [fx(x0), fx(x1)].sort((p, q) => p - q);
      const [c0, c1] = [fz(z0), fz(z1)].sort((p, q) => p - q);
      const m = k.cajaDe(cx + a0, y + y0, cz + c0, cx + a1, y + y1, cz + c1, color);
      g.add(m);
      return m;
    },
    // Decoración que no choca.
    d(x0, y0, z0, x1, y1, z1, color) { return k.noSolido(s.b(x0, y0, z0, x1, y1, z1, color)); },
    cil(r, h, color, x, y0, z, seg = 12) {
      const m = k.cilindro(r, r, h, color, cx + fx(x), y + y0 + h / 2, cz + fz(z), seg);
      g.add(m);
      return m;
    },
    esf(r, color, x, y0, z) {
      const m = k.esfera(r, color, cx + fx(x), y + y0, cz + fz(z));
      g.add(m);
      return m;
    },
    cono(r, h, color, x, y0, z, seg = 8) {
      const m = k.cono(r, h, color, cx + fx(x), y + y0 + h / 2, cz + fz(z), seg);
      g.add(m);
      return m;
    },
    // Coloca una lámina (cartel, retrato) que mira hacia rotY.
    plano(m, x, y0, z, rotY) {
      m.position.set(cx + fx(x), y + y0, cz + fz(z));
      m.rotation.y = girar(rotY);
      g.add(m);
      return m;
    },
    cartel(texto, ancho, alto, x, y0, z, rotY, color, fondo) {
      return s.plano(k.cartel(texto, ancho, alto, color, fondo), x, y0, z, rotY);
    },
    // Mueble 3D (ver kit.modelo) con el frente hacia rotY.
    modelo(nombre, x, y0, z, rotY = 0, opts = {}) {
      const m = s.plano(k.modelo(nombre, opts), x, y0, z, rotY);
      if (opts.cama) k.alCama?.(m.position.clone()); // para poder dormir (main.js)
      return m;
    },
    medida: (nombre, opts) => k.medida(nombre, opts),
    luz: () => colgante(k, g, cx + fx(0), y + ALTO_PISO - LOSA, cz + fz(0)),
  };
  return s;
}

// ---------- Piezas de mobiliario ----------
// pieza(s, X, Z, mira) arma un mueble en su propio marco: u = ancho (de izquierda a derecha),
// v = profundidad con el frente hacia +v, y lo ubica en (X, Z) mirando hacia 'mira'
// ('+x', '-x', '+z' o '-z', en coordenadas de la habitación).

function pieza(s, X, Z, mira) {
  const map = {
    '+z': (u, v) => [X + u, Z + v],
    '-z': (u, v) => [X - u, Z - v],
    '+x': (u, v) => [X + v, Z - u],
    '-x': (u, v) => [X - v, Z + u],
  }[mira];
  const rot = { '+z': 0, '-z': Math.PI, '+x': Math.PI / 2, '-x': -Math.PI / 2 }[mira];
  const caja = (fn, u0, y0, v0, u1, y1, v1, c) => {
    const [ax, az] = map(u0, v0);
    const [bx, bz] = map(u1, v1);
    return fn(Math.min(ax, bx), y0, Math.min(az, bz), Math.max(ax, bx), y1, Math.max(az, bz), c);
  };
  return {
    b: (...a) => caja(s.b, ...a),
    d: (...a) => caja(s.d, ...a),
    cil(r, h, c, u, y0, v, seg) { const [x, z] = map(u, v); return s.cil(r, h, c, x, y0, z, seg); },
    esf(r, c, u, y0, v) { const [x, z] = map(u, v); return s.esf(r, c, x, y0, z); },
    plano(m, u, y0, v, rotLocal = 0) { const [x, z] = map(u, v); return s.plano(m, x, y0, z, rot + rotLocal); },
    // Mueble 3D en (u, v) mirando hacia +v. Con `atras` se apoya el fondo en v = atras;
    // `y` lo sube (por ejemplo, arriba de una mesa) y `rot` lo gira dentro del marco.
    modelo(nombre, u, v, opts = {}) {
      const vv = opts.atras === undefined ? v : opts.atras + s.medida(nombre, opts).z / 2;
      const [x, z] = map(u, vv);
      return s.modelo(nombre, x, opts.y || 0, z, rot + (opts.rot || 0), opts);
    },
    medida: (nombre, opts) => s.medida(nombre, opts),
  };
}

// Los muebles son modelos 3D; acá solo se eligen, se miden y se acomodan.
function cama(k, p, ancho, largo, color) {
  p.modelo(ancho > 3.2 ? 'bedDouble' : 'bedSingle', 0, 0, { ancho: ancho + 0.3, atras: -largo / 2 - 0.35, tela: color, cama: true });
}

function mesaLuz(k, p, u, v) {
  p.modelo('cabinetBedDrawerTable', u, v, {});
  p.modelo('lampRoundTable', u, v, { y: p.medida('cabinetBedDrawerTable').y, solido: false });
}

function inodoro(k, p) {
  p.modelo('toiletSquare', 0, 0, { atras: -0.8 });
}

function lavatorio(k, p, ancho) {
  const n = ancho > 3.5 ? 2 : 1;
  const w = ancho / n;
  for (let i = 0; i < n; i++) {
    const u = -ancho / 2 + w * (i + 0.5);
    p.modelo('bathroomCabinetDrawer', u, 0, { ancho: w - 0.1, atras: -0.66 });
    p.modelo('bathroomMirror', u, 0, { alto: 2.6, atras: -0.68, y: 3.3, solido: false, vidrio: k.brillo('#d3e2ea') });
  }
  p.d(-ancho / 2 + 0.3, 6.1, -0.62, ancho / 2 - 0.3, 6.25, -0.5, k.brillo('#fff3d6'));
}

// Ducha en esquina: pared de azulejos atrás (v-) y a la izquierda (u-), cabina de vidrio.
function ducha(k, p, ancho, fondo) {
  const W = ancho / 2;
  const F = fondo / 2;
  const azulejo = k.tex('baldosa', '#dfe8ec', 0.8);
  p.d(-W, 0, -F, W, 7.5, -F + 0.08, azulejo);
  p.d(-W, 0, -F, -W + 0.08, 7.5, F, azulejo);
  p.modelo('shower', 0, 0, { ancho: ancho - 0.3, fondo: fondo - 0.3, alto: 6.8 });
}

function banera(k, p, largo) {
  p.modelo('bathtub', 0, 0, { ancho: largo, atras: -1.2 });
  p.modelo('trashcan', largo / 2 + 0.7, -0.6, { solido: false, escala: 0.8 });
}

function heladera(k, p) {
  p.modelo('kitchenFridgeLarge', 0, 0, { ancho: 2.7, atras: -0.9 });
}

// Mesada en partes (cada una se compra aparte): 'bajo' (muebles bajos con bacha y
// salpicadero), 'anafe' (cocina con horno), 'alacenas', 'campana' y 'electro'
// (cafetera, microondas y tostadora arriba de la mesada).
function mesada(k, p, largo, bacha, anafe, parte) {
  const L = largo / 2;
  const n = Math.max(1, Math.round(largo / 2.4));
  const w = largo / n;
  const cerca = (u, x) => x !== undefined && Math.abs(u - x) < w / 2;
  const alto = p.medida('kitchenCabinet', { ancho: w }).y;
  const libres = [];
  for (let i = 0; i < n; i++) {
    const u = -L + w * (i + 0.5);
    const esAnafe = cerca(u, anafe);
    if (!esAnafe && !cerca(u, bacha)) libres.push(u);
    if (parte === 'bajo' && !esAnafe) {
      const tipo = cerca(u, bacha) ? 'kitchenSink' : i % 2 ? 'kitchenCabinetDrawer' : 'kitchenCabinet';
      p.modelo(tipo, u, 0, { ancho: w + 0.01, atras: -0.68 });
    }
    if (parte === 'anafe' && esAnafe) p.modelo('kitchenStove', u, 0, { ancho: w + 0.01, atras: -0.68 });
    if (parte === 'campana' && esAnafe) p.modelo('hoodModern', u, 0, { ancho: w * 0.9, atras: -0.68, y: alto + 2.3, solido: false });
    if (parte === 'alacenas' && !esAnafe) {
      p.modelo(i % 2 ? 'kitchenCabinetUpper' : 'kitchenCabinetUpperDouble', u, 0, { ancho: w + 0.01, atras: -0.68, y: alto + 2.1, solido: false });
    }
  }
  if (parte === 'bajo') p.d(-L, alto, -0.68, L, alto + 2.1, -0.62, k.tex('baldosa', '#e9e4dc', 0.6));
  if (parte === 'electro') {
    ['kitchenCoffeeMachine', 'kitchenMicrowave', 'toaster'].forEach((m, i) => {
      if (libres[i] !== undefined) p.modelo(m, libres[i], 0, { atras: -0.5, y: alto, solido: false });
    });
  }
}

function sofa(k, p, ancho, color) {
  if (ancho < 3.2) p.modelo('loungeChair', 0, 0, { ancho, atras: -0.9, tela: color });
  else p.modelo(ancho > 5 ? 'loungeDesignSofa' : 'loungeSofa', 0, 0, { ancho, atras: -0.9, tela: color });
}

function mesaRatona(k, p, ancho, fondo) {
  p.modelo('tableCoffeeGlass', 0, 0, { ancho, fondo, alto: 1.15 });
  p.modelo('books', -0.4, 0, { y: 1.15, solido: false, escala: 1.2 });
  p.modelo('plantSmall1', 0.7, 0.1, { y: 1.15, solido: false, escala: 1.6 });
}

function tele(k, p, ancho) {
  p.modelo('cabinetTelevisionDoors', 0, 0, { ancho, alto: 1.4, fondo: 1.05, atras: -0.55 });
  p.modelo('televisionModern', 0, 0, { ancho: ancho * 0.75, atras: -0.5, y: 1.4, solido: false });
  p.modelo('speakerSmall', -ancho / 2 + 0.4, 0, { atras: -0.5, y: 1.4, solido: false });
  p.modelo('speakerSmall', ancho / 2 - 0.4, 0, { atras: -0.5, y: 1.4, solido: false });
}

function planta(k, p, u, v, alto = 3) {
  p.modelo('pottedPlant', u, v, { alto: alto * 1.15 });
}

function lamparaPie(k, p, u, v) {
  p.modelo('lampRoundFloor', u, v, { alto: 5.4 });
}

function silla(k, p, color = '#e9e2d6') {
  p.modelo('chairCushion', 0, 0, { tela: color });
}

function estanteria(k, p, ancho) {
  const n = Math.max(1, Math.round(ancho / 2.2));
  const w = ancho / n;
  for (let i = 0; i < n; i++) {
    const u = -ancho / 2 + w * (i + 0.5);
    p.modelo('bookcaseOpen', u, 0, { ancho: w, alto: 5.6, atras: -0.5 });
    [0.03, 0.36, 0.69].forEach((f, j) => {
      p.modelo('books', u - w * 0.22, 0, { y: 5.6 * f + 0.15, atras: -0.4, solido: false, escala: 1.4 });
      if ((i + j) % 2) p.modelo('books', u + w * 0.2, 0, { y: 5.6 * f + 0.15, atras: -0.4, solido: false, escala: 1.4, rot: 0.3 });
    });
  }
}

function escritorio(k, p, ancho) {
  p.modelo('desk', 0, 0, { ancho, atras: -0.7 });
  const alto = p.medida('desk', { ancho }).y;
  p.modelo('computerScreen', 0, 0, { atras: -0.6, y: alto, solido: false });
  p.modelo('computerKeyboard', 0, 0.4, { y: alto, solido: false });
}

// Silla de escritorio, mirando al escritorio (que queda hacia -v).
function sillaEscritorio(k, p, color, v = 1.8) {
  p.modelo('chairDesk', 0, v, { rot: Math.PI, tela: color });
}

// Espejo de pie apoyado contra la pared (el fondo en v = 0).
function espejo(k, p) {
  p.modelo('bathroomMirror', 0, 0, { alto: 5.2, atras: -0.05, y: 0.2, vidrio: k.brillo('#d3e2ea') });
}

function placard(k, p, ancho) {
  p.modelo('bookcaseClosedWide', 0, 0, { ancho, alto: 7, fondo: 1.3, atras: -0.65 });
}

// Alfombra: color = modelo de alfombra con borde; textura = piso (baños).
function alfombra(s, x0, z0, x1, z1, color) {
  if (typeof color !== 'string') { s.d(x0, 0, z0, x1, 0.05, z1, color); return; }
  s.modelo('rugRectangle', (x0 + x1) / 2, 0.02, (z0 + z1) / 2, 0, { ancho: x1 - x0, fondo: z1 - z0, alto: 0.05, tela: color, solido: false });
}

function pintura(k, p, archivo, u, y, v, alto = 2.8) {
  p.plano(k.pintura(archivo, alto), u, y, v);
}

const brillo = (k, c) => k.brillo(c);

// ---------- Diseños: cada mueble se compra por separado ----------
// Cada diseño es una lista de muebles en el orden en que se compran. Cada uno tiene
// su botón en el piso donde va (coordenadas de la habitación, en su tipo nativo).
// Primero la luz, después lo que va contra las paredes y al final lo del medio y la decoración.
const M = (id, nombre, x, z, fn) => ({ id, nombre, boton: [x, z], fn });
const LUZ = (x, z, fn) => M('luz', 'Luz de techo', x, z, (k, s, extra) => { s.luz(); fn?.(k, s, extra); });
const P0 = (s) => pieza(s, 0, 0, '+z');

// ---------- Planta baja ----------

const living = [
  LUZ(0, 0),
  M('alfombra', 'Alfombra', -3, 2.5, (k, s) => alfombra(s, -6.4, -3.9, 3.4, 3.9, '#cbbba5')),
  M('cuadro', 'Cuadro', 6.5, -2, (k, s) => pintura(k, pieza(s, 8.62, 0, '-x'), 'impresion.jpg', 0, 4.8, 0, 3)),
  M('tele', 'Televisor', -7, 0, (k, s) => tele(k, pieza(s, -8.1, 0, '+x'), 6)),
  M('biblioteca', 'Biblioteca', -6, -5.4, (k, s) => estanteria(k, pieza(s, -6, -6.2, '+z'), 4)),
  M('sillon', 'Sillón grande', 1.3, 0, (k, s) => sofa(k, pieza(s, 1.6, 0, '-x'), 6.6, '#7d8a96')),
  M('mesa_ratona', 'Mesa ratona', -3, 0, (k, s) => mesaRatona(k, pieza(s, -3, 0, '+x'), 3.2, 1.8)),
  M('sillon2', 'Sillón de dos', -3, 5, (k, s) => sofa(k, pieza(s, -3, 4.9, '-z'), 3.4, '#c9b8a0')),
  M('lampara', 'Lámpara de pie', 3.8, 4.9, (k, s) => lamparaPie(k, P0(s), 3.8, 4.9)),
  M('plantas', 'Plantas', 6, 4, (k, s) => {
    const P = P0(s);
    planta(k, P, -7.7, 5.7);
    planta(k, P, 7.7, 5.7);
    planta(k, P, 7.7, -5.7, 2.4);
  }),
];

const cocina = [
  LUZ(0, 0),
  M('heladera', 'Heladera', 6.8, -5, (k, s) => heladera(k, pieza(s, 6.8, -5.85, '+z'))),
  M('mesada', 'Mesada con bacha', -4, -5.3, (k, s) => mesada(k, pieza(s, -1.4, -6.05, '+z'), 12.2, -2.5, 2.5, 'bajo')),
  M('horno', 'Cocina y horno', 1.04, -5.3, (k, s) => mesada(k, pieza(s, -1.4, -6.05, '+z'), 12.2, -2.5, 2.5, 'anafe')),
  M('alacenas', 'Alacenas', -5, -3.3, (k, s) => mesada(k, pieza(s, -1.4, -6.05, '+z'), 12.2, -2.5, 2.5, 'alacenas')),
  M('campana', 'Campana', 1, -3.3, (k, s) => mesada(k, pieza(s, -1.4, -6.05, '+z'), 12.2, -2.5, 2.5, 'campana')),
  M('electro', 'Microondas y cafetera', -2.5, -3.3, (k, s) => mesada(k, pieza(s, -1.4, -6.05, '+z'), 12.2, -2.5, 2.5, 'electro')),
  M('isla', 'Isla', -1.4, -0.6, (k, s) => {
    const isla = pieza(s, -1.4, -0.6, '+z');
    for (const u of [-2.4, 0, 2.4]) isla.modelo('kitchenBar', u, 0, { ancho: 2.41 });
    const arriba = isla.medida('kitchenBar', { ancho: 2.41 }).y;
    isla.modelo('plantSmall1', 0, 0, { y: arriba, solido: false, escala: 1.5 });
    estatuilla(s, 0.4, arriba, -0.5);
  }),
  M('banquetas', 'Banquetas', -1.4, 1.6, (k, s) => {
    const isla = pieza(s, -1.4, -0.6, '+z');
    for (const u of [-2.4, 0, 2.4]) isla.modelo('stoolBar', u, 2.2, { rot: Math.PI, tela: '#3a3f44' });
  }),
  M('mesa', 'Mesa de desayuno', 5, 3.4, (k, s) => pieza(s, 5, 3.4, '+z').modelo('tableRound', 0, 0, { ancho: 3.2 })),
  M('sillas', 'Sillas', 1.8, 5.6, (k, s) => {
    const mesa = pieza(s, 5, 3.4, '+z');
    [[0, -2.1, 0], [0, 2.1, Math.PI], [-2.1, 0, Math.PI / 2], [2.1, 0, -Math.PI / 2]].forEach(([u, v, r]) => mesa.modelo('chairModernCushion', u, v, { rot: r, tela: '#e9e2d6' }));
  }),
  M('plantas', 'Plantas', -6.5, 4.5, (k, s) => {
    planta(k, P0(s), -7.8, 5.6);
    planta(k, P0(s), 7.8, -2);
  }),
];

const comedor = [
  LUZ(0, 0),
  M('alfombra', 'Alfombra', 3, 3, (k, s) => alfombra(s, -6.2, -3.8, 6.2, 3.8, '#b7a48e')),
  M('mesa', 'Mesa de comedor', 0, 0, (k, s) => {
    const P = P0(s);
    P.modelo('table', 0, 0, { ancho: 9.6, fondo: 2.8, alto: 2.05 });
    P.cil(0.25, 0.9, '#e0ddd5', 0, 2.05, 0, 10);
    P.d(-0.15, 2.95, -0.15, 0.15, 3.6, 0.15, '#3d8b3d');
  }),
  M('aparador', 'Aparador', -7, 0, (k, s) => {
    const ap = pieza(s, -8.1, 0, '+x');
    ap.modelo('cabinetTelevisionDoors', 0, 0, { ancho: 6, alto: 2.4, fondo: 1.1, atras: -0.55 });
    ap.cil(0.3, 1, '#4fc3f7', -1.8, 2.4, 0, 8);
    ap.cil(0.25, 1.4, '#ffffff', 1.8, 2.4, 0, 8);
  }),
  M('cuadro', 'Cuadro', -4, 5, (k, s) => pintura(k, pieza(s, -8.62, 0, '+x'), 'ronda_nocturna.jpg', 0, 5.4, 0, 3)),
  M('sillas', 'Sillas', 0, 4.8, (k, s) => {
    for (const u of [-3.3, -1.1, 1.1, 3.3]) {
      silla(k, pieza(s, u, -2.1, '+z'));
      silla(k, pieza(s, u, 2.1, '-z'));
    }
    silla(k, pieza(s, -5.5, 0, '+x'));
    silla(k, pieza(s, 5.5, 0, '-x'));
  }),
  M('plantas', 'Plantas', 6.5, 4, (k, s) => {
    planta(k, P0(s), 7.7, 5.7);
    planta(k, P0(s), 7.7, -5.7);
  }),
];

const banioPB = [
  LUZ(0, 0),
  M('piso', 'Porcelanato', 3, 3, (k, s) => alfombra(s, -8.7, -6.75, 8.7, 6.75, k.tex('baldosa', '#e3e6e8', 1.5))),
  M('ducha', 'Ducha', -6.7, -4.75, (k, s) => ducha(k, pieza(s, -6.7, -4.75, '+z'), 4, 4)),
  M('inodoro', 'Inodoro', 0.5, -5.6, (k, s) => inodoro(k, pieza(s, 0.5, -6, '+z'))),
  M('vanitory', 'Vanitory y espejo', 7.6, -2.5, (k, s) => lavatorio(k, pieza(s, 8.1, -2.5, '-x'), 3.4)),
  M('lavarropas', 'Lavarropas', 7.6, 3, (k, s) => pieza(s, 7.6, 3, '-x').modelo('washerDryerStacked', 0, 0, { alto: 5.2, atras: -0.9 })),
  M('toallero', 'Toallero', 3, -4.6, (k, s) => {
    P0(s).d(2.2, 3, -6.72, 3.8, 3.1, -6.6, '#c9ced3');
    P0(s).d(2.3, 1.6, -6.7, 3.7, 3, -6.6, '#90caf9');
  }),
  M('planta', 'Planta', -6.8, 4.8, (k, s) => planta(k, P0(s), -7.7, 5.7)),
];

const salaJuegos = [
  LUZ(0, 2.5, (k, s) => {
    s.cartel('SALA DE JUEGOS', 7, 1.4, 0, 7.4, 6.68, Math.PI, '#ffe14d', '#1b5e20');
    // Lámparas de pool sobre la mesa.
    [-1.6, 1.6].forEach((x) => {
      s.d(x - 0.03, 6.6, -0.03, x + 0.03, 9.6, 0.03, '#24282c');
      s.d(x - 0.7, 6.3, -0.45, x + 0.7, 6.6, 0.45, '#1b5e20');
      s.d(x - 0.6, 6.25, -0.35, x + 0.6, 6.3, 0.35, brillo(k, '#fff3c4'));
    });
  }),
  M('alfombra', 'Alfombra', -3, 2.8, (k, s) => alfombra(s, -6, -4, 6, 4, '#2e5d3a')),
  M('pool', 'Mesa de pool', 0, -2.6, (k, s) => mesaPool(k, s)),
  M('tacos', 'Tacos de pool', -7.6, -2, (k, s) => tacos(k, s)),
  M('ping_pong', 'Ping pong', 5.6, -3.4, (k, s) => pingPong(k, s)),
  M('arcades', 'Máquinas de arcade', 5.8, 3.6, (k, s) => {
    maquinaArcade(k, s, 7.7, 2.4, '#7b1fa2', '#00e5ff');
    maquinaArcade(k, s, 7.7, 4.6, '#c2185b', '#ffea00');
  }),
  M('metegol', 'Metegol', 0, 3, (k, s) => metegol(k, s, 0, 4.6)),
  M('dardos', 'Dardos', -6.5, 5.2, (k, s) => dardos(k, s)),
  M('sillon', 'Sillón', -6.4, -5, (k, s) => s.modelo('loungeSofa', -6.4, 0, -5.4, 0, { ancho: 3.6, tela: '#5d4037' })),
  M('planta', 'Planta', -6.6, -1.5, (k, s) => s.modelo('pottedPlant', -7.8, 0, 0.6, 0, { alto: 3.4 })),
];

// ---------- Sala de juegos ----------

// Mesa de pool: patas torneadas, marco de madera, paño verde, troneras, bandas, triángulo
// de bolas y la blanca.
function mesaPool(k, s) {
  const L = 3;
  const W = 1.7;
  for (const x of [-L + 0.35, 0, L - 0.35]) for (const z of [-W + 0.35, W - 0.35]) {
    s.d(x - 0.22, 0, z - 0.22, x + 0.22, 0.25, z + 0.22, '#3e2418');
    s.d(x - 0.15, 0.25, z - 0.15, x + 0.15, 1.35, z + 0.15, '#5d3a24');
  }
  s.b(-L, 1.35, -W, L, 1.75, W, '#5d3a24');
  s.d(-L + 0.3, 1.75, -W + 0.3, L - 0.3, 1.78, W - 0.3, '#1e7a3c');
  s.d(-L, 1.75, -W, L, 1.95, -W + 0.3, '#4a2c1c');
  s.d(-L, 1.75, W - 0.3, L, 1.95, W, '#4a2c1c');
  s.d(-L, 1.75, -W, -L + 0.3, 1.95, W, '#4a2c1c');
  s.d(L - 0.3, 1.75, -W, L, 1.95, W, '#4a2c1c');
  s.d(-L + 0.3, 1.78, -W + 0.3, L - 0.3, 1.83, -W + 0.42, '#176631');
  s.d(-L + 0.3, 1.78, W - 0.42, L - 0.3, 1.83, W - 0.3, '#176631');
  for (const x of [-L + 0.35, 0, L - 0.35]) for (const z of [-W + 0.35, W - 0.35]) s.cil(0.17, 0.03, '#111111', x, 1.78, z, 12);
  for (const x of [-L + 0.35, L - 0.35]) for (const z of [-W + 0.35, W - 0.35]) s.d(x - 0.2, 1.95, z - 0.2, x + 0.2, 1.97, z + 0.2, '#c9a227');
  const colores = ['#fdd835', '#1e88e5', '#e53935', '#6a1b9a', '#ff7043', '#2e7d32', '#8d1c1c', '#111111', '#fdd835', '#1e88e5', '#e53935', '#6a1b9a', '#ff7043', '#2e7d32', '#8d1c1c'];
  let n = 0;
  for (let fila = 0; fila < 5; fila++) {
    for (let i = 0; i <= fila; i++) {
      s.esf(0.11, colores[n++ % colores.length], 1.1 + fila * 0.19, 1.89, (i - fila / 2) * 0.23);
    }
  }
  s.esf(0.11, '#ffffff', -1.6, 1.89, 0);
  s.d(-1.1, 1.92, 0.4, 0.9, 1.97, 0.46, '#c49a6c');
}

// Soporte de pared con tacos y la tiza.
function tacos(k, s) {
  s.d(-8.75, 2.2, -3.4, -8.55, 6.2, -0.6, '#5d3a24');
  s.d(-8.55, 2.6, -3.3, -8.35, 2.8, -0.7, '#4a2c1c');
  s.d(-8.55, 5.6, -3.3, -8.35, 5.8, -0.7, '#4a2c1c');
  [-3, -2.4, -1.8, -1.2].forEach((z, i) => {
    s.d(-8.5, 2.4, z - 0.05, -8.4, 6.1, z + 0.05, '#e0c79c');
    s.d(-8.5, 2.4, z - 0.07, -8.4, 3.6, z + 0.07, ['#3e2418', '#1b5e20', '#8d1c1c', '#1a237e'][i]);
  });
}

// Mesa de ping pong azul con líneas blancas, red, patas y dos paletas.
function pingPong(k, s) {
  const x0 = 3.6;
  const x1 = 7.8;
  const z0 = -6.2;
  const z1 = -3.8;
  for (const x of [x0 + 0.3, x1 - 0.3]) for (const z of [z0 + 0.3, z1 - 0.3]) s.d(x - 0.07, 0, z - 0.07, x + 0.07, 1.6, z + 0.07, '#24282c');
  s.b(x0, 1.6, z0, x1, 1.72, z1, '#1565c0');
  s.d(x0, 1.72, z0, x1, 1.73, z0 + 0.05, '#ffffff');
  s.d(x0, 1.72, z1 - 0.05, x1, 1.73, z1, '#ffffff');
  s.d(x0, 1.72, z0, x0 + 0.05, 1.73, z1, '#ffffff');
  s.d(x1 - 0.05, 1.72, z0, x1, 1.73, z1, '#ffffff');
  s.d(x0, 1.72, (z0 + z1) / 2 - 0.02, x1, 1.73, (z0 + z1) / 2 + 0.02, '#ffffff');
  const xm = (x0 + x1) / 2;
  s.d(xm - 0.02, 1.72, z0 - 0.1, xm + 0.02, 2.05, z1 + 0.1, '#f5f5f5');
  s.d(xm - 0.03, 2.0, z0 - 0.1, xm + 0.03, 2.05, z1 + 0.1, '#ffffff');
  s.cil(0.22, 0.04, '#d32f2f', x0 + 0.9, 1.73, z0 + 0.6, 14);
  s.cil(0.22, 0.04, '#111111', x1 - 0.9, 1.73, z1 - 0.6, 14);
  s.esf(0.07, '#ff9800', xm + 0.6, 1.8, (z0 + z1) / 2 + 0.3);
}

// Metegol: mueble de madera, cancha verde, barras de metal con jugadores rojos y azules.
function metegol(k, s, x, z) {
  const L = 1.6;
  const W = 0.7;
  for (const dx of [-L + 0.2, L - 0.2]) for (const dz of [-W + 0.15, W - 0.15]) s.d(x + dx - 0.1, 0, z + dz - 0.1, x + dx + 0.1, 1.3, z + dz + 0.1, '#3e2418');
  s.b(x - L, 1.3, z - W, x + L, 2.1, z + W, '#8d5a34');
  s.d(x - L + 0.1, 1.8, z - W + 0.1, x + L - 0.1, 1.82, z + W - 0.1, '#2e7d32');
  s.d(x - 0.02, 1.82, z - W + 0.1, x + 0.02, 1.83, z + W - 0.1, '#ffffff');
  for (let i = 0; i < 6; i++) {
    const bx = x - L + 0.35 + i * ((2 * L - 0.7) / 5);
    s.d(bx - 0.03, 2.0, z - W - 0.35, bx + 0.03, 2.06, z + W + 0.35, '#c9ced3');
    s.d(bx - 0.06, 2.0, z - W - 0.45, bx + 0.06, 2.12, z - W - 0.3, '#111111');
    const color = i % 2 ? '#1e88e5' : '#e53935';
    const n = [1, 2, 3, 3, 2, 1][i];
    for (let j = 0; j < n; j++) {
      const pz = z + (j - (n - 1) / 2) * 0.4;
      s.d(bx - 0.06, 1.85, pz - 0.05, bx + 0.06, 2.12, pz + 0.05, color);
    }
  }
  s.esf(0.06, '#ffffff', x + 0.3, 1.88, z + 0.1);
}

// Tablero de dardos: respaldo de madera, aros de colores, dardos clavados y la línea de tiro.
function dardos(k, s) {
  s.d(-8.75, 3.0, 3.6, -8.6, 6.2, 6.4, '#5d3a24');
  const aros = [[0.95, '#111111'], [0.85, '#e53935'], [0.7, '#f3e5c0'], [0.55, '#1b5e20'], [0.4, '#f3e5c0'], [0.18, '#1b5e20'], [0.08, '#e53935']];
  aros.forEach(([r, c], i) => {
    const d = s.cil(r, 0.05, c, -8.58 + i * 0.012, 4.6, 5, 24);
    d.rotation.z = Math.PI / 2;
  });
  [[4.75, 4.95, '#ffe14d'], [4.4, 5.2, '#29e7ff'], [4.7, 5.25, '#ff3d9a']].forEach(([y, z, c]) => {
    s.d(-8.5, y - 0.02, z - 0.02, -8.15, y + 0.02, z + 0.02, '#9aa0a6');
    s.d(-8.2, y - 0.08, z - 0.01, -8.05, y + 0.08, z + 0.01, c);
  });
  s.d(-3.6, 0, 4, -3.5, 0.08, 6, '#ffe14d');
  s.cartel('DARDOS', 1.8, 0.5, -8.58, 6.6, 5, Math.PI / 2, '#ffe14d', '#8d1c1c');
}


const arcade = [
  LUZ(0, 3, (k, s) => {
    s.cartel('ARCADE', 6, 1.5, 0, 7.4, -6.68, 0, '#29e7ff', '#2a0845');
    // Tiras de neón en el techo.
    [['#ff3d9a', -4], ['#29e7ff', 0], ['#ffe14d', 4]].forEach(([c, z]) => s.d(-7.6, 9.3, z - 0.1, 7.6, 9.4, z + 0.1, brillo(k, c)));
  }),
  M('piso', 'Alfombra de arcade', 0, -2, (k, s) => s.d(-8.8, 0, -6.75, 8.8, 0.06, 6.75, k.tex('alfombraArcade', '#ffffff', 5))),
  M('arcades1', 'Máquinas de baile', -4.2, -2.6, (k, s) => {
    maquinaBaile(k, s, -5.95, '#1e88e5', '#f48fb1');
    maquinaBaile(k, s, -2.35, '#8e24aa', '#80deea');
  }),
  M('arcades2', 'Arcades', 6.2, 0.3, (k, s) => {
    ['#e53935', '#43a047', '#1e88e5', '#fdd835'].forEach((c, i) => maquinaArcade(k, s, 7.7, -3 + i * 2.2, c, ['#00e5ff', '#ff4081', '#76ff03', '#ffea00'][i]));
  }),
  M('hockey', 'Air hockey', 1.3, -1.2, (k, s) => airHockey(k, s, 1.3, -1.2)),
  M('pinball', 'Pinballs', -4, 0.9, (k, s) => [-1.2, 1, 3.2].forEach((z, i) => pinball(k, s, z, ['#fdd835', '#ff7043', '#29b6f6'][i]))),
  M('peluches', 'Máquinas de peluches', 2.6, -3.5, (k, s) => {
    maquinaPeluches(k, s, 1.4, '#f06292');
    maquinaPeluches(k, s, 3.85, '#4dd0e1');
  }),
  M('premios', 'Mostrador de premios', -5.8, 4.4, (k, s) => mostradorPremios(k, s)),
];

// ---------- Máquinas del arcade (estilo tycoon de Roblox) ----------

// Máquina de baile: gabinete con pantalla y flechas, parlantes, cartel y plataforma con
// las 4 flechas de colores y la baranda de atrás. Contra la pared del fondo, centrada en x.
function maquinaBaile(k, s, x, color, colorCartel) {
  const gris = '#b0b6bc';
  s.b(x - 1.2, 0, -6.6, x + 1.2, 5.4, -5.3, gris);
  s.d(x - 1.15, 0.3, -5.31, x + 1.15, 1.9, -5.27, color);
  s.d(x - 1, 2.1, -5.32, x + 1, 4.3, -5.26, '#141414');
  s.d(x - 0.85, 2.25, -5.27, x + 0.85, 4.15, -5.24, brillo(k, '#25163d'));
  [['#7cff5a', -0.55], ['#29e7ff', -0.18], ['#ff3d9a', 0.18], ['#ffe14d', 0.55]].forEach(([c, dx], i) => {
    s.d(x + dx - 0.04, 2.3, -5.24, x + dx + 0.04, 4.1, -5.23, brillo(k, '#5c4b7a'));
    s.d(x + dx - 0.16, 2.6 + ((i * 0.53) % 1.2), -5.235, x + dx + 0.16, 2.8 + ((i * 0.53) % 1.2), -5.22, brillo(k, c));
  });
  s.d(x - 1.25, 5.4, -6.6, x + 1.25, 6.5, -5.05, '#3a3f44');
  s.cartel('DANCE', 2.3, 0.95, x, 5.95, -5.03, 0, '#7b1fa2', colorCartel);
  for (const lado of [-1, 1]) {
    const px = x + lado * 1.55;
    s.b(px - 0.35, 0, -6.4, px + 0.35, 2.6, -5.5, '#5f6368');
    s.cil(0.24, 0.06, '#24282c', px, 1.7, -5.48, 14).rotation.x = Math.PI / 2;
    s.cil(0.18, 0.06, '#24282c', px, 0.9, -5.48, 14).rotation.x = Math.PI / 2;
  }
  // Plataforma con flechas.
  s.d(x - 1.2, 0, -5.3, x + 1.2, 0.35, -2.4, '#5f6368');
  const pads = [[-0.7, -3.85, '#7cff5a'], [0, -4.55, '#29e7ff'], [0, -3.15, '#ff3d9a'], [0.7, -3.85, '#ffe14d']];
  for (const [dx, z, c] of pads) s.d(x + dx - 0.3, 0.35, z - 0.3, x + dx + 0.3, 0.4, z + 0.3, brillo(k, c));
  s.d(x - 0.3, 0.35, -4.15, x + 0.3, 0.38, -3.55, '#9aa0a6');
  for (const dx of [-1.1, 1.1]) s.d(x + dx - 0.07, 0.35, -2.6, x + dx + 0.07, 2.6, -2.46, '#e53935');
  s.d(x - 1.15, 2.45, -2.6, x + 1.15, 2.6, -2.46, '#e53935');
}

// Arcade vertical contra la pared +x, mirando hacia -x: gabinete de color, pantalla
// inclinada, tablero con palanca y botones, y cartel iluminado arriba.
function maquinaArcade(k, s, x, z, color, pantalla) {
  s.b(x - 0.8, 0, z - 0.85, x + 0.8, 5.2, z + 0.85, color);
  s.d(x - 0.82, 0, z - 0.87, x + 0.82, 0.3, z + 0.87, '#24282c');
  s.d(x - 0.85, 2.7, z - 0.7, x - 0.8, 4.4, z + 0.7, '#111111');
  s.d(x - 0.87, 2.85, z - 0.6, x - 0.85, 4.25, z + 0.6, brillo(k, pantalla));
  s.d(x - 0.87, 3.3, z - 0.35, x - 0.86, 3.7, z + 0.1, brillo(k, '#ffffff'));
  s.b(x - 1.4, 2, z - 0.85, x - 0.8, 2.4, z + 0.85, '#2b2f34');
  s.d(x - 1.25, 2.4, z - 0.45, x - 1.15, 2.85, z - 0.35, '#24282c');
  s.esf(0.12, '#e53935', x - 1.2, 2.9, z - 0.4);
  ['#ffe14d', '#29e7ff', '#7cff5a'].forEach((c, i) => s.cil(0.08, 0.06, c, x - 1.15, 2.4, z + 0.05 + i * 0.22, 10));
  s.d(x - 0.85, 4.6, z - 0.8, x - 0.82, 5.1, z + 0.8, brillo(k, '#fff3c4'));
  s.d(x - 0.9, 1.0, z - 0.25, x - 0.8, 1.4, z + 0.25, '#ffc928');
}

// Pinball contra la pared -x: mesa inclinada con vidrio, patas, y la caja de atrás con el
// cartel. El jugador se para en el lado +x.
function pinball(k, s, z, color) {
  const x0 = -8.6;
  const x1 = -5.4;
  for (const [x, dz] of [[x0 + 0.3, -0.5], [x0 + 0.3, 0.5], [x1 - 0.2, -0.5], [x1 - 0.2, 0.5]]) s.d(x - 0.07, 0, z + dz - 0.07, x + 0.07, 1.6, z + dz + 0.07, '#24282c');
  s.b(x0, 1.6, z - 0.65, x1, 2.25, z + 0.65, color);
  s.d(x0 + 0.1, 2.0, z - 0.55, x1 - 0.1, 2.27, z + 0.55, '#16213e');
  [[-7.6, -0.25, '#ff3d9a'], [-7.4, 0.25, '#29e7ff'], [-7, 0, '#ffe14d'], [-6.4, -0.3, '#7cff5a']].forEach(([x, dz, c]) => s.cil(0.13, 0.12, c, x, 2.27, z + dz, 10));
  s.d(-5.9, 2.27, z - 0.35, -5.75, 2.32, z - 0.05, '#ffffff');
  s.d(-5.9, 2.27, z + 0.05, -5.75, 2.32, z + 0.35, '#ffffff');
  s.d(x0 + 0.1, 2.33, z - 0.6, x1 - 0.1, 2.36, z + 0.6, k.vidrio);
  s.b(x0, 2.25, z - 0.65, x0 + 0.5, 4.4, z + 0.65, color);
  s.d(x0 + 0.5, 2.8, z - 0.55, x0 + 0.52, 4.2, z + 0.55, '#16213e');
  s.cartel('PINBALL', 1.2, 0.45, x0 + 0.54, 3.9, z, Math.PI / 2, '#d50000', '#ffe14d');
  s.d(x0 + 0.53, 2.9, z - 0.45, x0 + 0.54, 3.55, z + 0.45, brillo(k, '#ff80ab'));
}

// Mesa de air hockey: patas, mesa blanca con borde de color, arcos, disco y dos paletas.
function airHockey(k, s, x, z) {
  const L = 2.3;
  const W = 1.25;
  for (const dx of [-L + 0.3, L - 0.3]) for (const dz of [-W + 0.25, W - 0.25]) s.d(x + dx - 0.12, 0, z + dz - 0.12, x + dx + 0.12, 1.5, z + dz + 0.12, '#24282c');
  s.b(x - L, 1.5, z - W, x + L, 1.85, z + W, '#1565c0');
  s.d(x - L + 0.12, 1.85, z - W + 0.12, x + L - 0.12, 1.88, z + W - 0.12, '#eef3f7');
  s.d(x - L, 1.85, z - W, x + L, 2.05, z - W + 0.12, '#e53935');
  s.d(x - L, 1.85, z + W - 0.12, x + L, 2.05, z + W, '#e53935');
  s.d(x - L, 1.85, z - W, x - L + 0.12, 2.05, z + W, '#e53935');
  s.d(x + L - 0.12, 1.85, z - W, x + L, 2.05, z + W, '#e53935');
  s.d(x - 0.02, 1.88, z - W + 0.12, x + 0.02, 1.89, z + W - 0.12, '#e53935');
  s.cil(0.35, 0.01, '#e53935', x, 1.88, z, 18);
  s.cil(0.32, 0.012, '#eef3f7', x, 1.885, z, 18);
  s.cil(0.14, 0.05, '#212121', x + 0.6, 1.88, z + 0.2, 12);
  s.cil(0.22, 0.1, '#ff3d9a', x - 1.5, 1.88, z, 12);
  s.cil(0.22, 0.1, '#29e7ff', x + 1.6, 1.88, z - 0.3, 12);
  s.d(x - 1.2, 1.5, z + W, x + 1.2, 1.7, z + W + 0.05, '#ffe14d');
}

// Máquina de peluches: base, vidrio, peluches adentro, la garra y el cartel.
function maquinaPeluches(k, s, x, color) {
  const z0 = -6.5;
  const z1 = -4.3;
  s.b(x - 1.05, 0, z0, x + 1.05, 2.3, z1, color);
  s.d(x - 0.5, 1.2, z1, x + 0.5, 1.7, z1 + 0.02, '#24282c');
  s.d(x - 0.25, 0.4, z1, x + 0.25, 0.8, z1 + 0.03, '#111111');
  s.b(x - 1.05, 2.3, z0, x + 1.05, 5.4, z1, k.vidrio);
  for (const [dx, dz] of [[-1, z0], [1, z0], [-1, z1], [1, z1]]) s.d(x + dx - 0.06, 2.3, dz - 0.06, x + dx + 0.06, 5.4, dz + 0.06, '#c9ced3');
  const peluches = ['#ffeb3b', '#ff80ab', '#80deea', '#a5d6a7', '#ffcc80', '#ce93d8'];
  for (let i = 0; i < 9; i++) {
    const px = x - 0.65 + (i % 3) * 0.65;
    const pz = z0 + 0.5 + Math.floor(i / 3) * 0.6;
    s.esf(0.26, peluches[i % peluches.length], px, 2.6 + (i % 2) * 0.12, pz);
  }
  s.d(x - 0.04, 4.4, (z0 + z1) / 2 - 0.04, x + 0.04, 5.4, (z0 + z1) / 2 + 0.04, '#9aa0a6');
  s.d(x - 0.25, 4.2, (z0 + z1) / 2 - 0.25, x + 0.25, 4.4, (z0 + z1) / 2 + 0.25, '#c9ced3');
  s.b(x - 1.05, 5.4, z0, x + 1.05, 6.3, z1, color);
  s.cartel('PELUCHES', 1.9, 0.6, x, 5.85, z1 + 0.02, 0, '#ffffff', '#c2185b');
}

// Mostrador de premios con estantes de peluches y un cartel de TICKETS.
function mostradorPremios(k, s) {
  s.b(-8.6, 0, 4.9, -4.4, 2.2, 6.0, '#ffc928');
  s.d(-8.7, 2.2, 4.8, -4.3, 2.35, 6.1, '#24282c');
  s.d(-8.6, 0.6, 4.88, -4.4, 1.4, 4.9, '#e53935');
  for (const y of [3.4, 4.8]) {
    s.d(-8.6, y, 6.0, -4.4, y + 0.12, 6.7, '#f5f5f5');
    for (let i = 0; i < 6; i++) s.esf(0.28, ['#ffeb3b', '#ff80ab', '#80deea', '#a5d6a7', '#ffcc80', '#ce93d8'][(i + (y > 4 ? 2 : 0)) % 6], -8.2 + i * 0.75, y + 0.4, 6.35);
  }
  s.cartel('TICKETS', 3, 0.8, -6.5, 6.3, 6.72, Math.PI, '#ffe14d', '#c2185b');
}


// Estatuilla verde de juguete (unos 15 cm), escondida arriba de la isla de la cocina.
// Pies descalzos enormes, piernas largas, cara marrón con nariz grande y gorro verde.
function estatuilla(s, x, y, z) {
  const verde = '#3fbf3a';
  const piel = '#a8764e';
  const b = (x0, y0, z0, x1, y1, z1, c) => s.d(x + x0, y + y0, z + z0, x + x1, y + y1, z + z1, c);
  for (const lado of [-1, 1]) {
    const px = lado * 0.065;
    b(px - 0.05, 0, -0.04, px + 0.05, 0.035, 0.09, piel);
    for (let i = 0; i < 4; i++) b(px - 0.045 + i * 0.024, 0, 0.09, px - 0.03 + i * 0.024, 0.03, 0.11, '#c48d63');
    b(px - 0.04, 0.035, -0.035, px + 0.04, 0.12, 0.04, verde);
    b(px - 0.032, 0.12, -0.03, px + 0.032, 0.27, 0.03, verde);
    b(lado * 0.1 - 0.016, 0.21, -0.016, lado * 0.1 + 0.016, 0.4, 0.016, verde);
    b(lado * 0.1 - 0.02, 0.19, -0.02, lado * 0.1 + 0.02, 0.215, 0.02, verde);
  }
  b(-0.085, 0.27, -0.045, 0.085, 0.41, 0.045, verde);
  b(-0.07, 0.41, -0.05, 0.07, 0.54, 0.05, piel);
  b(-0.02, 0.43, 0.05, 0.02, 0.5, 0.085, '#b07d55');
  b(-0.045, 0.495, 0.05, -0.02, 0.51, 0.055, '#2b2b2b');
  b(0.02, 0.495, 0.05, 0.045, 0.51, 0.055, '#2b2b2b');
  b(-0.078, 0.53, -0.058, 0.078, 0.575, 0.058, verde);
}


// Playroom: pelotero, tobogán, cama elástica, carpa y un oso gigante.
const playroom = [
  LUZ(2.5, -1, (k, s) => s.cartel('PLAYROOM', 5, 1.2, 0, 7.6, -6.7, 0, '#ffffff', '#ff7043')),
  M('piso', 'Piso de colores', -1, 2, (k, s) => {
    const colores = ['#ef5350', '#42a5f5', '#ffca28', '#66bb6a'];
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 5; j++) s.d(-8.7 + i * 2.9, 0, -6.75 + j * 2.7, -8.7 + (i + 1) * 2.9, 0.05, -6.75 + (j + 1) * 2.7, colores[(i + j) % 4]);
    }
  }),
  M('pelotero', 'Pelotero', -5.5, 4.2, (k, s) => {
    const colores = ['#ef5350', '#42a5f5', '#ffca28', '#66bb6a', '#ab47bc'];
    s.b(-8.6, 0, 1.8, -2.8, 1.1, 2.1, '#42a5f5');
    s.b(-3.1, 0, 2.1, -2.8, 1.1, 6.6, '#42a5f5');
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 8; j++) {
        const x = -8.1 + i * 0.52;
        const z = 2.45 + j * 0.52;
        s.d(x, 0.05, z, x + 0.42, 0.47, z + 0.42, colores[(i * 3 + j) % 5]);
        if ((i + j) % 2) s.d(x + 0.2, 0.47, z + 0.1, x + 0.6, 0.87, z + 0.5, colores[(i + j * 2) % 5]);
      }
    }
  }),
  M('tobogan', 'Tobogán', 4.2, 4, (k, s) => {
    s.b(3.2, 0, 3, 5.2, 3, 5, '#ffca28');
    [[5.2, 2.25], [6, 1.5], [6.8, 0.75]].forEach(([x, h]) => s.b(x, 0, 3.3, x + 0.8, h, 4.7, '#ef5350'));
    s.d(-1.9, 1.55, 3.2, 3.8, 1.75, 4.8, '#ef5350').rotation.z = 0.44;
  }),
  M('cama_elastica', 'Cama elástica', 5.4, -2, (k, s) => {
    s.cil(1.8, 0.4, '#1565c0', 5.4, 0.3, -2, 16);
    s.cil(1.55, 0.06, '#212121', 5.4, 0.72, -2, 16);
  }),
  M('carpa', 'Carpa', -6.2, -3.2, (k, s) => s.cono(1.7, 3.6, '#ffcc80', -6.2, 0, -3.2, 6)),
  M('oso', 'Oso gigante', -0.5, 0.2, (k, s) => s.modelo('bear', -0.5, 0, 0.2, 0.4, { alto: 3.4 })),
];

const spa = [
  LUZ(0, 0, (k, s) => s.cartel('SPA', 3, 1.1, 4.3, 6.6, -6.7, 0, '#ffffff', '#00897b')),
  M('piso', 'Piso de spa', 3, 3, (k, s) => s.d(-8, 0, -6.6, 8, 0.06, 3, '#b2dfdb')),
  M('sauna', 'Sauna', -5.5, -4, (k, s) => {
    s.b(-8.6, 0, -6.7, -3, 6, -6.4, '#a1785c');
    s.b(-3.3, 0, -6.4, -3, 6, -3, '#a1785c');
    s.b(-8.6, 0, -1.8, -6, 6, -1.5, '#a1785c');
    s.b(-4.2, 0, -1.8, -3, 6, -1.5, '#a1785c');
    s.b(-8.6, 6, -6.7, -3, 6.3, -1.5, '#8d6e63');
    s.b(-8.3, 0, -6.3, -3.6, 1.4, -5, '#bcaaa4');
  }),
  M('hidromasaje', 'Hidromasaje', 4.3, -3.3, (k, s) => {
    s.b(1, 0, -5.5, 7.6, 1.2, -5.1, '#ffffff');
    s.b(1, 0, -1.4, 7.6, 1.2, -1, '#ffffff');
    s.b(1, 0, -5.1, 1.4, 1.2, -1.4, '#ffffff');
    s.b(7.2, 0, -5.1, 7.6, 1.2, -1.4, '#ffffff');
    s.d(1.4, 0.2, -5.1, 7.2, 1, -1.4, k.agua);
  }),
  M('reposeras', 'Reposeras', 0, 2, (k, s) => [-4.2, 4.2].forEach((x) => s.modelo('loungeChairRelax', x, 0, 2.6, Math.PI, { ancho: 2.4, tela: '#f3f1ec' }))),
  M('plantas', 'Plantas', 6, 5.8, (k, s) => [[7, 2.5], [-7.5, 2.5]].forEach(([x, z]) => s.modelo('pottedPlant', x, 0, z, 0, { alto: 3.4 }))),
];

// ---------- Piso 1 ----------

// Cuarto de un integrante de la Vecibanda: su color, su retrato y su nombre.
const cuarto = [
  LUZ(0, 0, (k, s, p) => s.cartel(`CUARTO DE ${p.nombre.toUpperCase()}`, 7, 1.2, 0, 8.2, -6.7, 0, '#ffffff', p.remera)),
  M('alfombra', 'Alfombra', -2.5, 2.5, (k, s, p) => alfombra(s, -7.6, -3.8, 1.2, 3.8, p.remera)),
  M('retrato', 'Retrato', -5.5, -2, (k, s, p) => {
    s.d(-8.68, 3.95, -1.55, -8.6, 7.05, 1.55, '#24282c');
    s.plano(k.retrato(p, 2.8, 2.8), -8.55, 5.5, 0, Math.PI / 2);
  }),
  M('cama', 'Cama', -5.5, 0.5, (k, s, p) => cama(k, pieza(s, -6.05, 0, '+x'), 3.6, 4.6, p.remera)),
  M('mesas_luz', 'Mesas de luz', -6.6, 4.4, (k, s) => {
    mesaLuz(k, pieza(s, -7.9, 2.9, '+x'), 0, 0);
    mesaLuz(k, pieza(s, -7.9, -2.9, '+x'), 0, 0);
  }),
  M('ropero', 'Ropero', 7.5, -1.5, (k, s) => placard(k, pieza(s, 8, -1.5, '-x'), 4.5)),
  M('escritorio', 'Escritorio', 4.2, 5.6, (k, s) => {
    escritorio(k, pieza(s, 4.2, 6, '-z'), 4);
    s.cartel('VECIBANDA', 4, 1, 4.2, 6.9, 6.7, Math.PI, '#ffd23f', '#212121');
  }),
  M('silla', 'Silla de escritorio', 4.2, 3.6, (k, s, p) => sillaEscritorio(k, pieza(s, 4.2, 6, '-z'), p.remera)),
  M('espejo', 'Espejo', 0, 5.4, (k, s) => espejo(k, pieza(s, 0, 6.7, '-z'))),
  M('puff', 'Puff', 4.6, -3.6, (k, s, p) => s.modelo('loungeChair', 4.6, 0, -3.4, -Math.PI / 2 - 0.4, { tela: p.remera })),
  M('perchero', 'Perchero', 7.4, 5.6, (k, s) => P0(s).modelo('coatRackStanding', 7.6, 5.8, { alto: 5 })),
  M('planta', 'Planta', -6.4, -5.4, (k, s) => planta(k, P0(s), -7.6, -5.7)),
];

const salaGamer = [
  LUZ(0, 0),
  M('alfombra', 'Alfombra', 2, 1, (k, s) => alfombra(s, -3, -3, 4, 2.5, '#263238')),
  M('escritorio', 'Escritorio con 3 monitores', 5.4, -5.2, (k, s) => {
    const P = pieza(s, 5.4, -6, '+z');
    P.modelo('desk', 0, 0, { ancho: 5.2, atras: -0.6 });
    const alto = P.medida('desk', { ancho: 5.2 }).y;
    [-1.6, 0, 1.6].forEach((u, i) => {
      P.modelo('computerScreen', u, 0, { atras: -0.5, y: alto, solido: false, rot: -u * 0.12 });
      P.d(u - 0.75, alto + 0.45, 0.06, u + 0.75, alto + 1.4, 0.08, brillo(k, ['#00e5ff', '#ff4081', '#76ff03'][i]));
    });
    P.modelo('computerKeyboard', 0, 0.6, { y: alto, solido: false });
  }),
  M('silla', 'Silla gamer', 5.4, -2.4, (k, s) => pieza(s, 5.4, -6, '+z').modelo('chairDesk', 0, 3, { rot: Math.PI, tela: '#e53935' })),
  M('tele', 'Tele de pared', 6.4, 5, (k, s) => {
    s.b(7.6, 1.5, 3.3, 7.9, 4.5, 6.6, '#111111');
    s.d(7.55, 1.7, 3.5, 7.6, 4.3, 6.4, brillo(k, '#7c4dff'));
  }),
  M('sillon', 'Sillón', 1.2, 4.9, (k, s) => sofa(k, pieza(s, 1.4, 4.9, '+x'), 3.4, '#3949ab')),
  M('puffs', 'Puffs', -2.2, 1.4, (k, s) => {
    s.modelo('loungeChair', -2.2, 0, 1.4, Math.PI / 2, { tela: '#ff4081' });
    s.modelo('loungeChair', -2.2, 0, -1.6, Math.PI / 2, { tela: '#00bcd4' });
  }),
  M('neon', 'Luces neón', -5, 3, (k, s) => {
    s.d(-8, 7.1, -6.6, 8, 7.3, -6.4, brillo(k, '#ff00ff'));
    s.d(-8, 7.1, 6.4, 8, 7.3, 6.6, brillo(k, '#00e5ff'));
  }),
];

const banio1 = [
  LUZ(0, 0),
  M('piso', 'Porcelanato', 3, 3, (k, s) => alfombra(s, -8.7, -6.75, 8.7, 6.75, k.tex('baldosa', '#ece7e1', 1.5))),
  M('banera', 'Bañera', -4, -5.2, (k, s) => banera(k, pieza(s, -4, -5.4, '+z'), 5.5)),
  M('inodoro', 'Inodoro', 3.2, -5.6, (k, s) => inodoro(k, pieza(s, 3.2, -6, '+z'))),
  M('vanitory', 'Vanitory doble', 7.6, 0, (k, s) => lavatorio(k, pieza(s, 8.1, 0, '-x'), 5)),
  M('toallero', 'Toallero', -7, 1.2, (k, s) => {
    P0(s).d(-8.66, 3, 0, -8.6, 3.1, 2.5, '#c9ced3');
    P0(s).d(-8.6, 1.4, 0.2, -8.5, 3, 2.3, '#ff8a80');
  }),
  M('banqueta', 'Banqueta', -1.4, 2.1, (k, s) => P0(s).modelo('stoolBar', -1.4, 2.1, { tela: '#e9e2d6' })),
  M('plantas', 'Plantas', 5.6, 4.6, (k, s) => {
    planta(k, P0(s), -7.7, 5.7);
    planta(k, P0(s), 7.7, 5.7, 2.4);
  }),
];

// ---------- Piso 2 ----------

const cine = [
  LUZ(0, 0, (k, s) => [-6, -2, 2, 6].forEach((z) => s.d(-8, 6.9, z - 0.3, 8, 7.1, z + 0.3, brillo(k, '#ffd54f')))),
  M('alfombra', 'Alfombra', 3, 4.5, (k, s) => s.d(-8, 0, -6.6, 8, 0.06, 6.6, '#311b92')),
  M('pantalla', 'Pantalla gigante', 6.4, 0, (k, s) => {
    s.b(7.6, 1, -6, 7.95, 6.8, 6, '#000000');
    s.d(7.55, 1.3, -5.7, 7.6, 6.5, 5.7, brillo(k, '#e3f2fd'));
  }),
  M('tarima', 'Tarima', -2.4, 0, (k, s) => s.b(-4.2, 0, -6, -0.6, 0.5, 5, '#4a148c')),
  M('butacas1', 'Butacas de adelante', 2.5, 0, (k, s) => [-2.4, 0.6, 3.6].forEach((z) => s.modelo('loungeChairRelax', 2.5, 0, z, Math.PI / 2, { ancho: 2.2, tela: '#b71c1c' }))),
  M('butacas2', 'Butacas de atrás', -5.6, 5.4, (k, s) => [-2.4, 0.6, 3.6].forEach((z) => s.modelo('loungeChairRelax', -2.3, 0.5, z, Math.PI / 2, { ancho: 2.2, tela: '#b71c1c' }))),
  M('pochoclos', 'Máquina de pochoclos', -7.1, -4.6, (k, s) => {
    s.b(-7.8, 0, -6.6, -6.4, 3, -5.2, '#d32f2f');
    s.d(-7.7, 3, -6.5, -6.5, 4.2, -5.3, '#fff9c4');
  }),
];

const gimnasio = [
  LUZ(0, 4, (k, s) => {
    s.cartel('VECIBANDA FIT', 7, 1.4, 0.5, 7.5, -6.68, 0, '#ff3d3d', '#141516');
    s.plano(k.imagen('assets/especiales/ladosis_banderin.png', 2.4, 3.5, { dosLados: true }), -8.6, 5.5, 4.6, Math.PI / 2);
    // Tiras de neón en el techo (rojo y blanco, los colores del gym).
    [['#ff3d3d', -4.5], ['#f5f5f5', -0.5], ['#ff3d3d', 3.5]].forEach(([c, z]) => s.d(-7.8, 9.3, z - 0.1, 7.8, 9.4, z + 0.1, brillo(k, c)));
  }),
  M('piso', 'Piso de goma', 0, -1.5, (k, s) => {
    s.d(-8.8, 0, -6.75, 8.8, 0.06, 6.75, k.tex('goma', '#ffffff', 3));
    // Camino libre de la puerta, marcado con pintura.
    for (const x of [-3.2, 3.2]) s.d(x - 0.06, 0.06, 0.6, x + 0.06, 0.08, 6.75, '#cfd3d6');
  }),
  M('cinta', 'Cintas de correr', -5.7, 0.2, (k, s) => {
    cintaCorrer(k, s, -7.05);
    cintaCorrer(k, s, -4.45);
  }),
  M('pesas', 'Banco de press', 0.5, -0.5, (k, s) => bancoPress(k, s, 0.5)),
  M('mancuernas', 'Rack de mancuernas y espejo', 5.6, -3.5, (k, s) => rackMancuernas(k, s)),
  M('bolsa', 'Bolsa de boxeo', 3.9, 2.6, (k, s) => bolsaBoxeo(k, s, 6.1, 2.6)),
  M('rack', 'Rack de sentadillas', -3.4, 2.2, (k, s) => rackSentadillas(k, s, -6.55, 2.2)),
  M('parlantes', 'Parlantes', 2.4, -1.2, (k, s) => {
    parlante(k, s, -2.6, -6.05);
    parlante(k, s, 4.4, -6.05);
  }),
];

// ---------- Equipos del gym de la mansión (estilo gym de Roblox) ----------

// Disco de color (bumper) con el centro blanco, en una barra que va a lo largo de x.
function disco(s, r, ancho, color, x, y, z) {
  s.cil(r, ancho, color, x, y - ancho / 2, z, 18).rotation.z = Math.PI / 2;
  s.cil(0.2, ancho + 0.03, '#e8e8e8', x, y - (ancho + 0.03) / 2, z, 10).rotation.z = Math.PI / 2;
}
// Barra olímpica a lo largo de x con dos discos por lado.
function barra(s, x, y, z, largo = 5.6) {
  s.cil(0.07, largo, '#c9ced3', x, y - largo / 2, z, 8).rotation.z = Math.PI / 2;
  for (const lado of [-1, 1]) {
    disco(s, 0.85, 0.26, '#d32f2f', x + lado * 2.05, y, z);
    disco(s, 0.66, 0.2, '#1e88e5', x + lado * 2.3, y, z);
    s.cil(0.11, 0.12, '#24282c', x + lado * 2.5, y - 0.06, z, 8).rotation.z = Math.PI / 2;
  }
}
// Contorno pintado en el piso alrededor de un equipo.
function contorno(s, x0, z0, x1, z1) {
  const c = '#cfd3d6';
  const t = 0.07;
  s.d(x0, 0.06, z0, x1, 0.08, z0 + t, c);
  s.d(x0, 0.06, z1 - t, x1, 0.08, z1, c);
  s.d(x0, 0.06, z0, x0 + t, 0.08, z1, c);
  s.d(x1 - t, 0.06, z0, x1, 0.08, z1, c);
}

// Cinta de correr mirando a la pared del fondo: base, banda negra, barandas, parantes con
// los manubrios y el tablero con la pantalla.
function cintaCorrer(k, s, x) {
  const z0 = -5.4;
  const z1 = -1.5;
  contorno(s, x - 1.15, z0 - 0.5, x + 1.15, z1 + 0.35);
  s.b(x - 0.85, 0, z0, x + 0.85, 0.5, z1, '#2b2e33');
  s.d(x - 0.6, 0.5, z0 + 0.45, x + 0.6, 0.56, z1 - 0.12, '#0f1011');
  for (let i = 0; i < 9; i++) s.d(x - 0.6, 0.56, z0 + 0.6 + i * 0.42, x + 0.6, 0.57, z0 + 0.64 + i * 0.42, '#1f2124');
  for (const lado of [-1, 1]) {
    const xr = x + lado * 0.72;
    s.d(xr - 0.12, 0.5, z0, xr + 0.12, 0.64, z1, '#8d949b');
    s.b(xr - 0.08, 0.5, z0 + 0.1, xr + 0.08, 3.7, z0 + 0.3, '#8d949b');
    // Manubrio que sale hacia el que corre.
    s.d(xr - 0.07, 3.0, z0 + 0.2, xr + 0.07, 3.14, z0 + 1.5, '#8d949b');
    s.d(xr - 0.09, 2.98, z0 + 1.0, xr + 0.09, 3.16, z0 + 1.5, '#141516');
  }
  s.d(x - 0.85, 0.5, z0 - 0.15, x + 0.85, 0.95, z0 + 0.45, '#3a3d42');
  s.d(x - 0.8, 3.55, z0 - 0.05, x + 0.8, 4.25, z0 + 0.45, '#24282c');
  s.d(x - 0.6, 3.65, z0 + 0.46, x + 0.6, 4.15, z0 + 0.48, brillo(k, '#1d3b5c'));
  s.d(x - 0.45, 3.8, z0 + 0.485, x - 0.05, 3.9, z0 + 0.49, brillo(k, '#7cff5a'));
  s.d(x + 0.1, 3.8, z0 + 0.485, x + 0.45, 3.9, z0 + 0.49, brillo(k, '#ff3d3d'));
}

// Banco plano con los soportes y la barra cargada (la cabeza hacia la pared del fondo).
function bancoPress(k, s, x) {
  contorno(s, x - 3.1, -5.6, x + 3.1, -1.1);
  s.b(x - 0.55, 1.0, -4.3, x + 0.55, 1.32, -1.5, '#141516');
  s.d(x - 0.5, 1.32, -4.25, x + 0.5, 1.36, -1.55, '#c62828');
  s.d(x - 0.18, 0, -4.0, x + 0.18, 1.0, -3.6, '#5f6368');
  s.d(x - 0.18, 0, -2.0, x + 0.18, 1.0, -1.6, '#5f6368');
  s.d(x - 0.7, 0, -4.1, x + 0.7, 0.14, -3.5, '#5f6368');
  s.d(x - 0.7, 0, -2.1, x + 0.7, 0.14, -1.5, '#5f6368');
  for (const lado of [-1, 1]) {
    const xs = x + lado * 1.55;
    s.b(xs - 0.15, 0, -4.75, xs + 0.15, 3.7, -4.45, '#1b1c1e');
    s.d(xs - 0.5, 0, -5.1, xs + 0.5, 0.14, -4.1, '#1b1c1e');
    s.d(xs - 0.17, 3.15, -4.45, xs + 0.17, 3.3, -4.1, '#ffd23f');
  }
  barra(s, x, 3.42, -4.28);
}

// Rack de dos pisos contra la pared +x con pares de mancuernas de colores, y el espejo.
function rackMancuernas(k, s) {
  const za = -6.2;
  const zb = -0.8;
  s.d(8.7, 2.8, za - 0.2, 8.76, 8.4, zb + 0.2, '#1b1c1e');
  s.d(8.66, 2.95, za - 0.05, 8.7, 8.25, zb + 0.05, brillo(k, '#7f93a6'));
  for (const z of [za, (za + zb) / 2, zb]) s.b(7.2, 0, z - 0.12, 8.6, 2.5, z + 0.12, '#1b1c1e');
  s.d(7.1, 1.15, za, 8.6, 1.28, zb, '#3a3d42');
  s.d(7.5, 2.15, za, 8.6, 2.28, zb, '#3a3d42');
  const colores = ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa'];
  colores.forEach((c, i) => {
    const z = za + 0.55 + i * 0.85;
    for (const [y, x0, r] of [[1.28, 7.85, 0.22 + i * 0.015], [2.28, 8.05, 0.19 + i * 0.012]]) {
      const y0 = y + r;
      s.cil(0.06, 0.95, '#c9ced3', x0, y0 - 0.475, z, 6).rotation.z = Math.PI / 2;
      for (const dx of [-0.42, 0.42]) s.cil(r, 0.26, c, x0 + dx, y0 - 0.13, z, 6).rotation.z = Math.PI / 2;
    }
  });
}

// Bolsa de boxeo colgando del techo con su cadena, la franja blanca y el tatami.
function bolsaBoxeo(k, s, x, z) {
  s.d(x - 1.7, 0, z - 1.7, x + 1.7, 0.1, z + 1.7, '#b71c1c');
  s.d(x - 1.5, 0.1, z - 1.5, x + 1.5, 0.11, z + 1.5, '#212121');
  s.cil(0.72, 3.4, '#c62828', x, 2.3, z, 14);
  s.cil(0.74, 0.45, '#fafafa', x, 4.2, z, 14);
  s.cil(0.76, 0.18, '#1b1c1e', x, 5.7, z, 14);
  s.cil(0.76, 0.18, '#1b1c1e', x, 2.25, z, 14);
  s.d(x - 0.04, 5.88, z - 0.04, x + 0.04, 9.6, z + 0.04, '#9aa0a6');
  s.d(x - 0.5, 9.4, z - 0.5, x + 0.5, 9.6, z + 0.5, '#24282c');
}

// Jaula de sentadillas negra con ganchos amarillos, barra cargada y plataforma de madera.
function rackSentadillas(k, s, x, z) {
  s.d(x - 2.2, 0, z - 1.9, x + 2.2, 0.12, z + 1.9, '#8a5a34');
  s.d(x - 1.3, 0.12, z - 1.9, x + 1.3, 0.14, z + 1.9, '#1b1c1e');
  for (const dx of [-1.3, 1.3]) {
    for (const dz of [-1.1, 1.1]) s.b(x + dx - 0.15, 0, z + dz - 0.15, x + dx + 0.15, 7.6, z + dz + 0.15, '#141516');
    s.d(x + dx - 0.15, 7.45, z - 1.1, x + dx + 0.15, 7.75, z + 1.1, '#141516');
    s.d(x + dx - 0.16, 4.0, z + 1.1, x + dx + 0.16, 4.18, z + 1.45, '#ffd23f');
    s.d(x + dx - 0.12, 2.4, z - 1.1, x + dx + 0.12, 2.58, z + 1.4, '#ffd23f');
  }
  s.d(x - 1.3, 7.45, z - 1.25, x + 1.3, 7.75, z - 0.95, '#141516');
  s.cil(0.06, 2.9, '#c9ced3', x, 7.1 - 1.45, z + 1.1, 8).rotation.z = Math.PI / 2;
  barra(s, x, 4.36, z + 1.3, 5.4);
}

// Parlante grande de piso: gabinete negro con dos conos, tweeter y una luz arriba.
function parlante(k, s, x, z) {
  s.b(x - 0.8, 0, z - 0.6, x + 0.8, 3.4, z + 0.6, '#141516');
  s.d(x - 0.82, 3.4, z - 0.62, x + 0.82, 3.5, z + 0.62, brillo(k, '#ff3d3d'));
  for (const [y, r] of [[0.95, 0.6], [2.35, 0.48]]) {
    s.cil(r, 0.08, '#2b2d30', x, y, z + 0.6, 16).rotation.x = Math.PI / 2;
    s.cil(r * 0.55, 0.1, '#46494e', x, y, z + 0.62, 12).rotation.x = Math.PI / 2;
    s.cil(r * 0.18, 0.12, '#9aa0a6', x, y, z + 0.64, 8).rotation.x = Math.PI / 2;
  }
  s.cil(0.16, 0.08, '#9aa0a6', x, 3.0, z + 0.6, 10).rotation.x = Math.PI / 2;
}

const biblioteca = [
  LUZ(0, 0),
  M('alfombra', 'Alfombra', -1.5, 3, (k, s) => alfombra(s, -6, -4, 3, 4, '#8d6e63')),
  M('cuadro', 'Cuadro', 6.6, -2, (k, s) => pintura(k, pieza(s, 8.62, 0, '-x'), 'ronda_nocturna.jpg', -2, 5, 0, 2.6)),
  M('estante1', 'Biblioteca', -6, -5.3, (k, s) => estanteria(k, pieza(s, -6, -6.1, '+z'), 4.4)),
  M('estante2', 'Otra biblioteca', 6, -5.3, (k, s) => estanteria(k, pieza(s, 6, -6.1, '+z'), 4.4)),
  M('mesa', 'Mesa de lectura', -1.5, 0, (k, s) => {
    const mesa = pieza(s, -1.5, 0, '+z');
    mesa.modelo('table', 0, 0, { ancho: 4.4, fondo: 2.4, alto: 2.1 });
    mesa.modelo('books', -0.8, 0, { y: 2.1, solido: false, escala: 1.4 });
    mesa.modelo('lampRoundTable', 1.4, -0.4, { y: 2.1, solido: false });
    s.esf(0.7, '#42a5f5', -3.3, 2.8, -0.4);
  }),
  M('sillas', 'Sillas', -4.6, 2.8, (k, s) => {
    const mesa = pieza(s, -1.5, 0, '+z');
    mesa.modelo('chairCushion', 0, 1.9, { rot: Math.PI, tela: '#7b4a35' });
    mesa.modelo('chairCushion', 0, -1.9, { tela: '#7b4a35' });
  }),
  M('sillon', 'Sillón de lectura', 6.2, 3, (k, s) => sofa(k, pieza(s, 6.4, 3, '-x'), 2.8, '#7b4a35')),
  M('lampara', 'Lámpara de pie', 7.4, 5.6, (k, s) => lamparaPie(k, P0(s), 7.6, 5.5)),
  M('planta', 'Planta', -6.8, 4.8, (k, s) => planta(k, P0(s), -7.8, 5.6)),
];

// Suite (piso 2) y Suite VIP (piso 3): cama grande, mesas de luz, tele, sillón, ropero.
function suite(cuadroArchivo, alto, colorCama, colorAcento, anchoCama, banco) {
  return [
    LUZ(0, 0),
    M('alfombra', 'Alfombra', -2, 2.5, (k, s) => alfombra(s, -8, -4.4, 0.8, 4.4, '#cdbfae')),
    M('cuadro', 'Cuadro', -5.5, -2, (k, s) => pintura(k, pieza(s, -8.62, 0, '+x'), cuadroArchivo, 0, 5.9, 0, alto)),
    M('cama', 'Cama King', -5.5, 0.5, (k, s) => cama(k, pieza(s, -5.85, 0, '+x'), anchoCama, anchoCama, colorCama)),
    M('mesas_luz', 'Mesas de luz', -6.6, 5, (k, s) => {
      mesaLuz(k, pieza(s, -7.9, 3.6, '+x'), 0, 0);
      mesaLuz(k, pieza(s, -7.9, -3.6, '+x'), 0, 0);
    }),
    ...(banco ? [M('banco', 'Banco al pie de la cama', -1.2, 0, (k, s) => pieza(s, -1.2, 0, '+x').modelo('loungeSofaOttoman', 0, 0, { ancho: 3.8, fondo: 1.6, alto: 1.3, tela: colorAcento }))] : []),
    M('tele', 'Televisor', 7.4, 0, (k, s) => tele(k, pieza(s, 8.1, 0, '-x'), 5.4)),
    M('sillon', 'Sillón', 3.6, 5.3, (k, s) => sofa(k, pieza(s, 3.6, 5.3, '-z'), 2.6, colorAcento)),
    M('ropero', 'Ropero', -5.2, 5.4, (k, s) => placard(k, pieza(s, -5.2, 6, '-z'), 5)),
    M('espejo', 'Espejo', 0, 5.4, (k, s) => espejo(k, pieza(s, 0, 6.7, '-z'))),
    M('planta', 'Planta y lámpara', 6, -4.5, (k, s) => {
      planta(k, P0(s), 7.7, -5.7);
      lamparaPie(k, P0(s), 6.4, 5.6);
    }),
  ];
}
const dormitorioPrincipal = suite('grande_jatte.jpg', 2.4, '#efe7da', '#8e6c4a', 5, true);
const dormitorio1 = suite('cafe_noche.jpg', 2.6, '#3f5873', '#c9b8a0', 4.4, false);

// ---------- Piso 3 ----------

const salonFiestas = [
  LUZ(2.5, 2.5, (k, s) => s.cartel('FIESTA VECIBANDA', 7, 1.4, 1, 5.2, -6.55, 0, '#ff4081', '#1a0033')),
  M('pista', 'Pista de baile', -2, -2, (k, s) => {
    const colores = ['#ff1744', '#00e5ff', '#76ff03', '#ffea00'];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) s.d(-5 + i * 2.6, 0, -5 + j * 2.6, -5 + i * 2.6 + 2.5, 0.08, -5 + j * 2.6 + 2.5, brillo(k, colores[(i + j) % 4]));
    }
  }),
  M('bola', 'Bola de boliche', 0, 1, (k, s) => {
    s.esf(1, '#cfd8dc', 0, 5.5, 0).userData.girar = 1.5;
    s.d(-0.05, 6.5, -0.05, 0.05, 7.6, 0.05, '#757575');
  }),
  M('dj', 'Cabina de DJ', -7.1, 0, (k, s) => {
    s.b(-8, 0, -3, -6.2, 2.4, 3, '#212121');
    s.cil(0.6, 0.15, '#424242', -7.1, 2.4, -1.2, 16);
    s.cil(0.6, 0.15, '#424242', -7.1, 2.4, 1.2, 16);
  }),
  M('parlantes', 'Parlantes', -6.6, -4.6, (k, s) => [-5, 6].forEach((z) => s.modelo('speaker', -7.4, 0, z, Math.PI / 2, { alto: 4.8 }))),
  M('luces', 'Luces de colores', 3, -4, (k, s) => ['#ff1744', '#00e5ff', '#76ff03', '#ffea00'].forEach((c, i) => s.d(-6 + i * 4, 7.2, -6.6, -4.5 + i * 4, 7.6, -6.2, brillo(k, c)))),
];

const estudioMusica = [
  LUZ(0, 3),
  M('piso', 'Piso de madera oscura', 0, -1.5, (k, s) => s.d(-8, 0, -6.6, 8, 0.06, 3, '#3e2723')),
  M('bateria', 'Batería', -5, -3.4, (k, s) => {
    s.cil(1.1, 1, '#d32f2f', -5, 1.1, -4, 16).rotation.x = Math.PI / 2;
    s.cil(0.6, 0.5, '#eeeeee', -6.4, 1.4, -2.8, 12);
    s.cil(0.6, 0.5, '#eeeeee', -3.6, 1.4, -2.8, 12);
    s.cil(0.8, 0.06, '#ffd54f', -6.8, 3, -5, 16);
    s.cil(0.8, 0.06, '#ffd54f', -3.2, 3, -5, 16);
    s.b(-5.3, 0, -1.8, -4.7, 1.2, -1.2, '#424242');
  }),
  M('parlantes', 'Parlantes', 3.1, -4.6, (k, s) => {
    s.modelo('speaker', 2.4, 0, -5.9, 0, { alto: 3.4 });
    s.modelo('speaker', 3.9, 0, -5.9, 0, { alto: 3.4 });
  }),
  M('guitarras', 'Guitarras y ampli', 6.2, -4.4, (k, s) => {
    s.b(5, 0, -6.6, 6.6, 2, -5.4, '#212121');
    [[5.5, '#ff7043'], [7.2, '#29b6f6']].forEach(([x, c]) => {
      s.d(x - 0.6, 2, -6.62, x + 0.6, 3.6, -6.5, c);
      s.d(x - 0.12, 3.6, -6.62, x + 0.12, 5.6, -6.5, '#5d4037');
    });
  }),
  M('microfono', 'Micrófono', 0.5, 0.6, (k, s) => {
    s.b(0.4, 0, 1, 0.6, 4.5, 1.2, '#9e9e9e');
    s.esf(0.3, '#212121', 0.5, 4.7, 1.1);
  }),
  M('paneles', 'Paneles acústicos', -4, 4.5, (k, s) => [-6, -2, 2, 6].forEach((x, i) => s.d(x - 1.2, 2, 6.55, x + 1.2, 5, 6.6, ['#7e57c2', '#26a69a', '#ef5350', '#ffca28'][i]))),
];

const karaoke = [
  LUZ(0, 3, (k, s) => {
    ['#ff1744', '#00e5ff', '#76ff03', '#ffea00'].forEach((c, i) => s.d(-6 + i * 4, 9.2, -0.4, -5 + i * 4, 9.5, 0.4, brillo(k, c)));
    s.cartel('KARAOKE', 5, 1.2, 0, 7.6, -6.7, 0, '#ff4081', '#1a0033');
  }),
  M('alfombra', 'Alfombra', 3, -4, (k, s) => s.d(-8, 0, -6.6, 8, 0.06, 6.6, '#311b92')),
  M('escenario', 'Escenario con micrófono', -6.5, 0, (k, s) => {
    s.b(-8.6, 0, -4, -4.5, 0.6, 4, '#4a148c');
    s.b(-6.6, 0.6, -0.1, -6.4, 4.5, 0.1, '#9e9e9e');
    s.esf(0.3, '#212121', -6.5, 4.7, 0);
    [-3, 3].forEach((z) => s.modelo('speaker', -7.9, 0.6, z, Math.PI / 2, { alto: 3.6 }));
  }),
  M('pantalla', 'Pantalla de letras', -3, -5, (k, s) => {
    s.b(-8.66, 2.5, -3.5, -8.6, 7.5, 3.5, '#111111');
    s.d(-8.6, 2.7, -3.3, -8.56, 7.3, 3.3, brillo(k, '#e1bee7'));
  }),
  M('sillon', 'Sillón largo', 3.6, 0, (k, s) => sofa(k, pieza(s, 4, 0, '-x'), 7, '#d81b60')),
  M('mesa_ratona', 'Mesa ratona', 1.2, 0, (k, s) => s.modelo('tableCoffeeGlass', 1.2, 0, 0, Math.PI / 2, { ancho: 3, fondo: 1.6, alto: 1.1 })),
];

const dormitorio2 = [
  LUZ(0, 0),
  M('alfombra', 'Alfombra', 3, 1.5, (k, s) => alfombra(s, -6.5, -4, 6.5, 2, '#c5d5d3')),
  M('cuadro', 'Cuadro', 0, -4, (k, s) => pintura(k, pieza(s, 0, -6.68, '+z'), 'grande_jatte.jpg', 0, 5.3, 0, 2.2)),
  M('camas', 'Camas', -3.6, -4.2, (k, s) => {
    cama(k, pieza(s, -3.6, -4.35, '+z'), 2.6, 4.4, '#7a9e9f');
    cama(k, pieza(s, 3.6, -4.35, '+z'), 2.6, 4.4, '#7a9e9f');
  }),
  M('mesa_luz', 'Mesa de luz', 0, -5.6, (k, s) => mesaLuz(k, pieza(s, 0, -6, '+z'), 0, 0)),
  M('ropero', 'Ropero', 7.5, 1.5, (k, s) => placard(k, pieza(s, 8, 1.5, '-x'), 4.5)),
  M('escritorio', 'Escritorio', -7.4, 2.5, (k, s) => escritorio(k, pieza(s, -7.8, 2.5, '+x'), 3)),
  M('silla', 'Silla', -5.8, 2.5, (k, s) => sillaEscritorio(k, pieza(s, -7.8, 2.5, '+x'), '#4fc3f7')),
  M('planta', 'Planta', -6.6, 5.4, (k, s) => planta(k, P0(s), -7.7, 5.6)),
];

const bar = [
  LUZ(0, 0, (k, s) => s.cartel('BAR VECIBANDA', 6, 1.3, -1, 5.5, -6.55, 0, '#00e5ff', '#0d0221')),
  M('barra', 'Barra', 5, -5.6, (k, s) => {
    s.b(2.8, 0, -6.6, 7.9, 2.4, -4.6, '#6d4c41');
    s.d(2.6, 2.4, -6.7, 8, 2.6, -4.4, '#3e2723');
    s.b(6.2, 0, -4.6, 7.9, 2.4, 2, '#6d4c41');
    s.d(6, 2.4, -4.6, 8, 2.6, 2.2, '#3e2723');
  }),
  M('botellas', 'Estantes con botellas', 4.4, -3, (k, s) => {
    ['#ffca28', '#66bb6a', '#ef5350', '#42a5f5', '#ab47bc'].forEach((c, i) => {
      s.d(3 + i * 0.9, 3.4, -6.6, 3.4 + i * 0.9, 4.6, -6.3, c);
      s.d(3 + i * 0.9, 5, -6.6, 3.4 + i * 0.9, 6.2, -6.3, c);
    });
    s.d(2.8, 3.3, -6.7, 7.8, 3.4, -6.2, '#5d4037');
    s.d(2.8, 4.9, -6.7, 7.8, 5, -6.2, '#5d4037');
  }),
  M('banquetas', 'Banquetas', 3.4, -1.2, (k, s) => [[3.6, -3.4, 0], [5.2, -3.4, 0], [5, 1, -Math.PI / 2], [5, -1.5, -Math.PI / 2]].forEach(([x, z, r]) => s.modelo('stoolBar', x, 0, z, r + Math.PI, { tela: '#c62828' }))),
  M('mesa', 'Mesa alta', -1, 3, (k, s) => {
    s.modelo('tableRound', -1, 0, 3, 0, { ancho: 2.6 });
    s.modelo('stoolBar', -2.8, 0, 3, 0, { tela: '#c62828' });
    s.modelo('stoolBar', 0.8, 0, 3, 0, { tela: '#c62828' });
  }),
  M('cuadro', 'Cuadro', -6.4, -1, (k, s) => pintura(k, pieza(s, -8.62, 0, '+x'), 'cafe_noche.jpg', 0, 4.8, 0, 3)),
];

const salaTrofeos = [
  LUZ(0, 3, (k, s) => {
    s.cil(0.25, 0.06, '#212121', -2, 4, -6.55, 16).rotation.x = Math.PI / 2;
    s.cartel('SALA DE TROFEOS', 6, 1.2, 3, 5.6, -6.55, 0, '#ffd54f', '#3e2723');
    s.plano(k.imagen('assets/especiales/ladosis_banderin.png', 2.4, 3.5, { dosLados: true }), 8.6, 5.2, 3.8, -Math.PI / 2);
    s.plano(k.imagen('assets/especiales/ladosis_escudo.png', 2.6, 2.6), 8.6, 5.4, -1.8, -Math.PI / 2);
  }),
  M('alfombra', 'Alfombra roja', 0.25, -2.5, (k, s) => s.d(-1, 0, -6.6, 1.5, 0.08, 6.6, '#c62828')),
  M('vitrinas1', 'Vitrinas', -7, -3, (k, s) => vitrinas(k, s, [[-7, -5], [-7, -1]])),
  M('vitrinas2', 'Más vitrinas', -6.6, 4.6, (k, s) => vitrinas(k, s, [[-7, 3], [5.8, -5]])),
  M('podio', 'Podio con copa', 5, 0, (k, s) => {
    s.b(3, 0, -1, 7, 0.8, 1, '#eeeeee');
    s.b(4.3, 0.8, -1, 5.7, 1.6, 1, '#eeeeee');
    s.cil(0.6, 1.4, '#ffd600', 5, 1.6, 0, 12);
  }),
];

function vitrinas(k, s, lugares) {
  lugares.forEach(([x, z]) => {
    s.b(x - 1, 0, z - 1, x + 1, 2, z + 1, '#5d4037');
    s.b(x - 0.9, 2, z - 0.9, x + 0.9, 4.2, z + 0.9, k.vidrio);
    s.cil(0.35, 0.9, '#ffc928', x, 2.4, z, 10);
    s.d(x - 0.2, 2, z - 0.2, x + 0.2, 2.4, z + 0.2, '#ffb300');
  });
}

const streaming = [
  LUZ(0, 0, (k, s) => {
    s.cartel('EN VIVO', 4, 1.2, 0, 7.6, -6.7, 0, '#ffffff', '#d50000');
    s.cartel('VECIBANDA TV', 5, 1, -8.65, 5.5, 0, Math.PI / 2, '#ffd23f', '#212121');
  }),
  M('alfombra', 'Alfombra', -1.5, 0, (k, s) => alfombra(s, -3, -2, 5, 4, '#263238')),
  M('escritorio', 'Escritorio con 2 monitores', 3.8, 4.6, (k, s) => {
    const P = pieza(s, 3.8, 4.3, '-z');
    P.modelo('desk', 0, 0, { ancho: 5.6, atras: -0.7 });
    const alto = P.medida('desk', { ancho: 5.6 }).y;
    [-1.2, 1.2].forEach((u, i) => {
      P.modelo('computerScreen', u, 0, { atras: -0.6, y: alto, solido: false });
      P.d(u - 0.75, alto + 0.45, -0.04, u + 0.75, alto + 1.4, -0.02, brillo(k, i ? '#7c4dff' : '#00e5ff'));
    });
    P.modelo('computerKeyboard', 0, 0.4, { y: alto, solido: false });
  }),
  M('silla', 'Silla gamer', 3.8, 0.9, (k, s) => sillaEscritorio(k, pieza(s, 3.8, 4.3, '-z'), '#e53935', 3.2)),
  M('aro', 'Aro de luz', -0.6, 2.4, (k, s) => {
    s.b(-0.7, 0, 2.3, -0.5, 3.8, 2.5, '#9e9e9e');
    s.cil(0.8, 0.12, '#fffde7', -0.6, 4.2, 2.4, 20).rotation.x = Math.PI / 2;
  }),
  M('croma', 'Pantalla verde', 7, -1, (k, s) => s.d(8.6, 0, -4, 8.66, 7, 3, '#00c853')),
];

// ---------- Registro ----------
// tipo nativo de cada diseño (ver sala()).
const DISENOS = {
  living: ['WF', living], cocina: ['WB', cocina], salaJuegos: ['EF', salaJuegos], banioPB: ['EB', banioPB],
  dormitorio1: ['WF', dormitorio1], dormitorio2: ['WB', dormitorio2], salaGamer: ['EF', salaGamer],
  banio1: ['EB', banio1], dormitorioPrincipal: ['WF', dormitorioPrincipal], gimnasio: ['WB', gimnasio],
  cine: ['EF', cine], biblioteca: ['EB', biblioteca], salonFiestas: ['WF', salonFiestas],
  estudioMusica: ['WB', estudioMusica], bar: ['EF', bar], salaTrofeos: ['EB', salaTrofeos],
  comedor: ['WF', comedor], arcade: ['EB', arcade], playroom: ['EF', playroom], spa: ['EB', spa],
  karaoke: ['WF', karaoke], streaming: ['EF', streaming], cuarto: ['WF', cuarto],
};

// Muebles de un diseño, en orden de compra: [{ id, nombre, boton: [x, z] }].
export function mueblesDe(diseno) {
  return DISENOS[diseno][1];
}

// Botón (en el mundo) de un mueble: misma reflexión que sala().
export function botonMueble(diseno, lugar, piso, [x, z]) {
  const nativo = DISENOS[diseno][0];
  const [cx, cz] = LUGARES[lugar];
  const ex = lugar[0] === nativo[0] ? 1 : -1;
  const ez = lugar[2] === nativo[1] ? 1 : -1;
  const map = mapeo(lugar);
  return [cx + map.x(ex * x), nivel(piso), cz + map.z(ez * z)];
}

// Arma el mueble número `i` del diseño en la habitación `lugar` del piso `piso`.
export function amueblar(k, g, diseno, i, lugar, piso, extra) {
  const [nativo, lista] = DISENOS[diseno];
  lista[i].fn(k, sala(k, g, lugar, piso, nativo), extra);
}

export { LUGARES };

// ---------- Terraza ----------

export function jacuzzi(k, g) {
  const y = nivel(4);
  const add = (x0, y0, z0, x1, y1, z1, c, solido = true) => {
    const m = k.cajaDe(x0, y + y0, z0, x1, y + y1, z1, c);
    if (!solido) k.noSolido(m);
    g.add(m);
  };
  add(-26, 0, -12, -16, 1.2, -11.5, '#eceff1');
  add(-26, 0, -4.5, -16, 1.2, -4, '#eceff1');
  add(-26, 0, -11.5, -25.5, 1.2, -4.5, '#eceff1');
  add(-16.5, 0, -11.5, -16, 1.2, -4.5, '#eceff1');
  add(-25.5, 0.9, -11.5, -16.5, 1.05, -4.5, k.agua, false);
  [-24, -20, -16].forEach((x) => {
    add(x, 0, -24, x + 2, 0.6, -20, '#ffffff');
    add(x, 0.6, -24, x + 2, 1.6, -23.4, '#ffffff');
  });
  add(-12.2, 0, -22.2, -11.8, 4.5, -21.8, '#9e9e9e');
  g.add(k.cono(2.6, 1.2, '#263238', -12, y + 5, -22, 8));
  [[-42, -32], [-42, -3], [40.8, -3], [40.8, -32], [20, -32], [20, -3]].forEach(([x, z]) => {
    add(x, 0, z, x + 1.2, 1, z + 1.2, '#455a64');
    add(x - 0.2, 1, z - 0.2, x + 1.4, 2.8, z + 1.4, '#2e7d32', false);
  });
}
