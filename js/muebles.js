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
      if (opts.ropero) k.alRopero?.(m.position.clone()); // para cambiarse la ropa (main.js)
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
  p.modelo('bookcaseClosedWide', 0, 0, { ancho, alto: 7, fondo: 1.3, atras: -0.65, ropero: true });
}

// Alfombra: color = modelo de alfombra con borde; textura = piso (baños).
function alfombra(s, x0, z0, x1, z1, color) {
  if (typeof color !== 'string') { s.d(x0, 0, z0, x1, 0.05, z1, color); return; }
  s.modelo('rugRectangle', (x0 + x1) / 2, 0.02, (z0 + z1) / 2, 0, { ancho: x1 - x0, fondo: z1 - z0, alto: 0.05, tela: color, solido: false });
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

// ---------- Cine ----------
// Sala de cine de verdad: oscura, con cortinas que tapan el ventanal, techo de estrellitas,
// la pantalla grande con su marco y el telón rojo a los costados, tres filas de butacas rojas
// en un escalonado con luces en los escalones, el proyector atrás con su haz, la marquesina
// "CINE VECIBANDA" arriba de la puerta y la máquina de pochoclos. Puerta en z = -6.6.
function butaca(s, x, y0, z) {
  s.b(x - 0.55, y0, z - 0.55, x + 0.45, y0 + 1.0, z + 0.55, '#7f0f16');
  s.d(x - 0.5, y0 + 1.0, z - 0.5, x + 0.45, y0 + 1.15, z + 0.5, '#a3141f');
  s.d(x - 0.78, y0 + 1.0, z - 0.52, x - 0.5, y0 + 2.75, z + 0.52, '#9b111e');
  for (const dz of [-0.63, 0.63]) s.d(x - 0.75, y0, z + dz - 0.08, x + 0.5, y0 + 1.55, z + dz + 0.08, '#1d1d22');
}

function filaButacas(s, x, y0) {
  // Corridas hacia +z: la primera fila queda a la entrada, y el paso de la puerta tiene que quedar libre.
  for (const z of [-3.2, -1.9, -0.6, 1.2, 2.5, 3.8]) butaca(s, x, y0, z);
}

const cine = [
  LUZ(-6, 5.5, (k, s) => {
    revestir(s, '#1a0d14', { lados: ['-x', '+x'], zPuerta: -1 });
    // Techo de estrellitas.
    const techo = lamina(k, (g, w, h) => {
      g.fillStyle = '#0b0c1e';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 160; i++) {
        g.fillStyle = i % 7 ? '#fff6d8' : '#9fd8ff';
        const r = 1 + ((i * 37) % 3);
        g.fillRect((i * 173) % w, (i * 97) % h, r, r);
      }
    }, 512, 384, 17.4, 13.3);
    techo.rotation.order = 'YXZ';
    techo.rotation.x = Math.PI / 2;
    s.plano(techo, 0, 9.55, 0, 0);
    // Cortinas negras sobre el ventanal (así la sala queda oscura).
    const cortina = lamina(k, (g, w, h) => {
      for (let x = 0; x < w; x++) {
        const v = 26 + 14 * Math.sin(x * 0.19);
        g.fillStyle = `rgb(${v + 10},${v},${v + 4})`;
        g.fillRect(x, 0, 1, h);
      }
    }, 256, 32, 17.4, 9.5, { mate: true });
    s.plano(cortina, 0, 4.8, 6.6, Math.PI);
    // Marquesina con lamparitas arriba de la puerta (del lado de adentro).
    s.plano(lamina(k, (g, w, h) => {
      g.fillStyle = '#2a0a12';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffd54f';
      for (let x = 14; x < w; x += 28) { g.beginPath(); g.arc(x, 12, 7, 0, 7); g.arc(x, h - 12, 7, 0, 7); g.fill(); }
      for (let y = 40; y < h - 30; y += 28) { g.beginPath(); g.arc(12, y, 7, 0, 7); g.arc(w - 12, y, 7, 0, 7); g.fill(); }
      g.fillStyle = '#ff5252';
      g.shadowColor = '#ff5252';
      g.shadowBlur = 18;
      g.font = '700 74px Fredoka, Arial, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('CINE VECIBANDA', w / 2, h / 2 + 4);
    }, 768, 180, 6.4, 1.5), 0, 8.3, -6.62, 0);
  }),
  M('alfombra', 'Alfombra', 4.5, -4.5, (k, s) => {
    s.d(-8.8, 0, -6.75, 8.8, 0.06, 6.75, '#3a0f1c');
    // Pasillo marcado con luces en el piso hasta la pantalla.
    for (let x = -6; x <= 6; x += 1.5) s.d(x - 0.2, 0.06, -5.3, x + 0.2, 0.09, -5.1, brillo(k, '#ffcf6b'));
  }),
  M('pantalla', 'Pantalla gigante', 6.4, 0, (k, s) => {
    s.b(8.3, 1.2, -5.6, 8.75, 7.9, 5.6, '#0a0a0a');
    s.plano(lamina(k, (g, w, h) => {
      const cielo = g.createLinearGradient(0, 0, 0, h);
      cielo.addColorStop(0, '#0d1b4c');
      cielo.addColorStop(0.6, '#e2577a');
      cielo.addColorStop(1, '#ffb347');
      g.fillStyle = cielo;
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffe9a8';
      g.beginPath();
      g.arc(w * 0.72, h * 0.62, h * 0.16, 0, Math.PI * 2);
      g.fill();
      // La mansión recortada a contraluz.
      g.fillStyle = '#140d22';
      g.fillRect(w * 0.18, h * 0.5, w * 0.5, h * 0.5);
      g.fillRect(w * 0.3, h * 0.36, w * 0.26, h * 0.2);
      g.fillRect(0, h * 0.86, w, h * 0.14);
      g.fillStyle = '#ffd56b';
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) g.fillRect(w * (0.22 + i * 0.11), h * (0.56 + j * 0.1), w * 0.05, h * 0.05);
      g.fillStyle = '#ffffff';
      g.textAlign = 'center';
      g.font = '700 54px Fredoka, Arial, sans-serif';
      g.shadowColor = '#000';
      g.shadowBlur = 12;
      g.fillText('VECIBANDA', w / 2, h * 0.2);
      g.font = '700 30px Fredoka, Arial, sans-serif';
      g.fillText('L A   P E L Í C U L A', w / 2, h * 0.3);
    }, 640, 360, 10.6, 6.2), 8.27, 4.55, 0, -Math.PI / 2);
    // Telón rojo a los costados y arriba.
    const telon = (ancho, alto) => lamina(k, (g, w, h) => {
      for (let x = 0; x < w; x++) {
        const v = 0.55 + 0.45 * Math.abs(Math.sin(x * 0.12));
        g.fillStyle = `rgb(${Math.round(150 * v)},${Math.round(14 * v)},${Math.round(28 * v)})`;
        g.fillRect(x, 0, 1, h);
      }
    }, 128, 16, ancho, alto, { mate: true });
    for (const z of [-6.15, 6.15]) s.plano(telon(1.2, 9.3), 8.2, 4.7, z, -Math.PI / 2);
    s.plano(telon(13.4, 1.4), 8.15, 8.75, 0, -Math.PI / 2);
  }),
  M('tarima', 'Escalonado', -3.4, 4.5, (k, s) => {
    s.b(-3.2, 0, -4.6, 0.2, 0.7, 4.6, '#2b0a14');
    s.b(-6.6, 0, -4.6, -3.2, 1.4, 4.6, '#2b0a14');
    s.b(-8.7, 0, -4.6, -6.6, 2.1, 4.6, '#2b0a14');
    // Luces en el borde de cada escalón.
    for (const [x, y] of [[0.2, 0.7], [-3.2, 1.4], [-6.6, 2.1]]) s.d(x - 0.04, y - 0.12, -4.6, x + 0.02, y - 0.04, 4.6, brillo(k, '#ffcf6b'));
  }),
  M('butacas1', 'Butacas de adelante', 3.4, 4.8, (k, s) => filaButacas(s, 2.6, 0)),
  M('butacas2', 'Butacas de atrás', -2, 5.4, (k, s) => {
    filaButacas(s, -1.0, 0.7);
    filaButacas(s, -4.6, 1.4);
  }),
  M('pochoclos', 'Máquina de pochoclos', -5.2, -5.6, (k, s) => {
    s.b(-8.4, 0, -6.5, -6.6, 2.4, -5.0, '#c62828');
    s.d(-8.42, 0.4, -5.0, -6.58, 0.6, -4.98, '#ffd54f');
    s.d(-8.3, 2.4, -6.4, -6.7, 4.6, -5.1, k.vidrio);
    for (let i = 0; i < 14; i++) s.esf(0.18, '#fff3c4', -8.1 + (i % 5) * 0.32, 2.55 + Math.floor(i / 5) * 0.22, -6.1 + ((i * 3) % 4) * 0.28);
    s.d(-8.45, 4.6, -6.55, -6.55, 5.0, -4.95, '#c62828');
    s.plano(neon(k, 'POCHOCLOS', 2.2, 0.55, '#ffd54f'), -7.5, 5.4, -4.95, 0);
  }),
  M('proyector', 'Proyector', -5, 5.6, (k, s) => {
    const THREE = k.THREE;
    s.d(-8.6, 8.6, -0.6, -7.2, 9.6, 0.6, '#1d1d22');
    s.d(-7.25, 8.85, -0.25, -7.15, 9.25, 0.25, brillo(k, '#fff6d8'));
    const haz = new THREE.Mesh(new THREE.ConeGeometry(3.2, 15.4, 16, 1, true).translate(0, -7.7, 0), new THREE.MeshBasicMaterial({ color: '#fff6d8', transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    // El cono apunta para -y: se acuesta hacia +z del grupo (que mira a la pantalla) y se
    // inclina un poco para abajo, hasta el centro de la pantalla.
    haz.rotation.x = -Math.PI / 2 + 0.28;
    const g = new THREE.Group();
    g.add(k.noSolido(haz));
    s.plano(k.noSolido(g), -7.2, 9.05, 0, Math.PI / 2);
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

// ---------- Biblioteca ----------
// Biblioteca clásica: paredes verde inglés con boiserie de madera, estanterías de piso a techo
// (con lomos de libros de colores) en toda la pared de adentro y a los costados y arriba de la
// puerta, escalera corrediza, alfombra persa, mesa larga con lámparas verdes de banquero, dos
// sillones de cuero junto al ventanal, globo terráqueo y plantas. Diseño de habitación de atrás
// (puerta en z = +6.6, ventanal en z = -6.6); en la sala de adelante va reflejado.
const LIBROS = ['#7b1f1f', '#1f4e3d', '#1d3557', '#5b3a24', '#e9dcc4', '#8a6d2f', '#3d2b56', '#a33b20', '#2f2f2f', '#6b8f71'];
let lomos = null;
function canvasLomos() {
  if (lomos) return lomos;
  lomos = [];
  for (let v = 0; v < 3; v++) {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 96;
    const g = c.getContext('2d');
    g.fillStyle = '#2b1a10';
    g.fillRect(0, 0, 512, 96);
    let x = 2;
    let n = v * 7;
    while (x < 510) {
      const w = 9 + ((n * 13) % 10);
      const h = 62 + ((n * 29) % 30);
      g.fillStyle = LIBROS[(n * 7 + v) % LIBROS.length];
      g.fillRect(x, 96 - h, w, h);
      g.fillStyle = 'rgba(255,215,120,0.75)';
      g.fillRect(x + 1, 96 - h + 8, w - 2, 2);
      g.fillRect(x + 1, 96 - 14, w - 2, 2);
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.fillRect(x + w - 2, 96 - h, 2, h);
      x += w + 1;
      n++;
      if (n % 11 === 0) x += 14; // hueco (un libro sacado)
    }
    lomos.push(c);
  }
  return lomos;
}

// Estantería empotrada a lo largo de una pieza: u de -ancho/2 a ancho/2, contra la pared (v = 0),
// de y0 a y1 con estantes cada 1.55.
function estanteriaAlta(k, P, ancho, y0, y1) {
  const madera = '#4a2e1b';
  const fondo = 1.0;
  P.b(-ancho / 2, y0, 0, ancho / 2, y0 + 0.5, fondo, madera);
  P.d(-ancho / 2, y1 - 0.25, 0, ancho / 2, y1, fondo + 0.15, madera);
  const tramos = Math.max(1, Math.round(ancho / 2.6));
  for (let i = 0; i <= tramos; i++) {
    const u = -ancho / 2 + (i * ancho) / tramos;
    P.d(u - 0.08, y0, 0, u + 0.08, y1, fondo, madera);
  }
  const canvases = canvasLomos();
  let fila = 0;
  for (let y = y0 + 0.5; y + 1.4 < y1; y += 1.55, fila++) {
    P.d(-ancho / 2, y - 0.08, 0, ancho / 2, y, fondo, madera);
    for (let i = 0; i < tramos; i++) {
      const a = -ancho / 2 + (i * ancho) / tramos + 0.08;
      const b = -ancho / 2 + ((i + 1) * ancho) / tramos - 0.08;
      const c = canvases[(fila + i) % canvases.length];
      const libros = lamina(k, (g, w, h) => g.drawImage(c, 0, 0, w, h), 256, 48, b - a, 1.3, { mate: true });
      P.plano(libros, (a + b) / 2, y + 0.65, fondo - 0.25, 0);
    }
  }
}

const biblioteca = [
  LUZ(-3.8, 3.2, (k, s) => {
    revestir(s, '#1f3a2c', { lados: ['-x', '+x'], zPuerta: 1, zocalo: '#4a2e1b', altoZocalo: 3 });
    for (const x of [-8.7, 8.65]) s.d(x, 9.15, -6.6, x + 0.05, 9.6, 6.6, '#4a2e1b');
  }),
  M('alfombra', 'Alfombra persa', 1.5, 2.6, (k, s) => {
    const a = lamina(k, (g, w, h) => {
      g.fillStyle = '#7a1f22';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#d9b46a';
      g.lineWidth = 10;
      g.strokeRect(14, 14, w - 28, h - 28);
      g.strokeStyle = '#1d3557';
      g.lineWidth = 16;
      g.strokeRect(36, 36, w - 72, h - 72);
      g.fillStyle = '#d9b46a';
      g.beginPath();
      g.ellipse(w / 2, h / 2, w * 0.2, h * 0.22, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#1d3557';
      g.beginPath();
      g.ellipse(w / 2, h / 2, w * 0.12, h * 0.13, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(217,180,106,0.6)';
      for (let i = 0; i < 4; i++) {
        g.beginPath();
        g.arc(i % 2 ? w - 90 : 90, i < 2 ? 90 : h - 90, 26, 0, Math.PI * 2);
        g.fill();
      }
    }, 512, 384, 9, 6.6, { mate: true });
    a.rotation.order = 'YXZ';
    a.rotation.x = -Math.PI / 2;
    s.plano(a, 0.8, 0.07, -0.3, 0);
  }),
  M('estante1', 'Biblioteca de pared', -6.4, 2.2, (k, s) => {
    estanteriaAlta(k, pieza(s, -8.75, 0, '+x'), 13.2, 0, 9.1);
  }),
  M('estante2', 'Estantes de la puerta', -5.6, 4.2, (k, s) => {
    estanteriaAlta(k, pieza(s, -5.95, 6.75, '-z'), 4.9, 0, 9.1);
    estanteriaAlta(k, pieza(s, 5.95, 6.75, '-z'), 4.9, 0, 9.1);
    estanteriaAlta(k, pieza(s, 0, 6.75, '-z'), 7, 7.15, 9.1);
  }),
  M('mesa', 'Mesa de lectura', 0.7, 3.6, (k, s) => {
    // Mesa larga de madera con dos lámparas verdes de banquero y libros abiertos.
    s.b(-1.2, 2.0, -2.6, 2.6, 2.2, 2.6, '#5b3a24');
    for (const [x, z] of [[-1, -2.4], [2.4, -2.4], [-1, 2.4], [2.4, 2.4]]) s.b(x - 0.12, 0, z - 0.12, x + 0.12, 2.0, z + 0.12, '#4a2e1b');
    for (const z of [-1.3, 1.3]) {
      s.cil(0.22, 0.1, '#b8892f', 0.7, 2.2, z, 12);
      s.d(0.66, 2.3, z - 0.03, 0.74, 2.9, z + 0.03, '#b8892f');
      s.d(0.35, 2.9, z - 0.55, 1.05, 3.15, z + 0.55, '#1b6b3a');
      s.d(0.45, 2.86, z - 0.45, 0.95, 2.9, z + 0.45, brillo(k, '#fff3c4'));
    }
    s.d(0.2, 2.2, -0.5, 1.3, 2.27, 0.5, '#f4ecd8');
    s.d(0.74, 2.2, -0.5, 0.78, 2.29, 0.5, '#8a6d2f');
    s.d(-0.6, 2.2, 1.6, 0.0, 2.6, 2.2, '#1d3557');
  }),
  M('sillas', 'Sillas', 5.4, 1.6, (k, s) => {
    for (const z of [-1.6, 1.6]) {
      s.modelo('chairCushion', -2.4, 0, z, Math.PI / 2, { tela: '#5b2a22' });
      s.modelo('chairCushion', 3.8, 0, z, -Math.PI / 2, { tela: '#5b2a22' });
    }
  }),
  M('sillon', 'Sillones de cuero', 4.4, -3.4, (k, s) => {
    // Dos sillones chesterfield junto al ventanal, mirando hacia la sala.
    for (const x of [3.2, 6.6]) {
      const P = pieza(s, x, -6.1, '+z');
      P.b(-0.95, 0, 0, 0.95, 1.1, 1.7, '#6b3a22');
      P.b(-0.95, 1.1, 0, 0.95, 2.9, 0.4, '#6b3a22');
      for (const u of [-0.95, 0.7]) P.b(u, 1.1, 0.3, u + 0.25, 1.9, 1.7, '#6b3a22');
      P.d(-0.7, 1.1, 0.4, 0.7, 1.35, 1.6, '#7d4528');
      for (let i = 0; i < 3; i++) P.d(-0.6 + i * 0.6, 2.1, 0.41, -0.55 + i * 0.6, 2.15, 0.43, '#3d2012');
    }
  }),
  M('lampara', 'Lámpara y mesita', 4.9, -2.6, (k, s) => {
    s.cil(0.6, 0.08, '#4a2e1b', 4.9, 1.6, -5.4, 16);
    s.cil(0.1, 1.6, '#4a2e1b', 4.9, 0, -5.4, 8);
    s.d(4.6, 1.68, -5.6, 5.2, 1.88, -5.2, '#7b1f1f');
    lamparaPie(k, P0(s), 8.0, -5.6);
  }),
  M('planta', 'Globo y plantas', -1.6, -4.2, (k, s) => {
    // Globo terráqueo en su pie, y dos plantas.
    s.cil(0.45, 0.1, '#4a2e1b', -2.2, 0, -5.2, 12);
    s.cil(0.08, 1.6, '#b8892f', -2.2, 0.1, -5.2, 8);
    const globo = s.esf(0.7, '#2f6fa8', -2.2, 2.4, -5.2);
    globo.userData.girar = 0.25;
    s.esf(0.36, '#5e9b4c', -2.0, 2.65, -4.85);
    s.esf(0.3, '#5e9b4c', -2.65, 2.25, -5.0);
    planta(k, P0(s), -7.6, -5.6, 3.4);
    planta(k, P0(s), 7.8, 5.4, 2.6);
  }),
  M('escalera', 'Escalera corrediza', -5.6, -2.2, (k, s) => {
    // Riel de bronce a lo largo de la biblioteca y la escalera apoyada.
    s.d(-7.6, 7.6, -6.4, -7.5, 7.7, 6.4, '#b8892f');
    const P = pieza(s, -8.75, -2.2, '+x');
    for (const u of [-0.55, 0.55]) P.d(u - 0.07, 0, 1.15, u + 0.07, 7.9, 1.3, '#6b4226');
    for (let y = 0.6; y < 7.6; y += 0.7) P.d(-0.55, y, 1.17, 0.55, y + 0.08, 1.27, '#6b4226');
  }),
];

// Suite (piso 2) y Suite VIP (piso 3): cama grande, mesas de luz, tele, sillón, ropero.
function suite(colorCama, colorAcento, anchoCama, banco) {
  return [
    LUZ(0, 0),
    M('alfombra', 'Alfombra', -2, 2.5, (k, s) => alfombra(s, -8, -4.4, 0.8, 4.4, '#cdbfae')),
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
const dormitorioPrincipal = suite('#efe7da', '#8e6c4a', 5, true);
const dormitorio1 = suite('#3f5873', '#c9b8a0', 4.4, false);

// ---------- Piso 3 ----------
// Las salas de este piso son de noche y con neones (inspiradas en boliches, karaokes y bares
// de Roblox). Ojo con la puerta: en las salas de adelante (F) está en el medio de la pared
// z = -6.6 y en las de atrás (B) en z = +6.6 (6 de ancho y 7 de alto); la pared de enfrente es
// casi toda ventanal. Los carteles van en las paredes de los costados o arriba de la puerta.

// Lámina que brilla sola (no le afecta la luz): pantallas, neones, piso LED. dibujar(g, w, h).
function lamina(k, dibujar, pw, ph, ancho, alto, { transparente = false, aditivo = false, mate = false } = {}) {
  const THREE = k.THREE;
  const c = document.createElement('canvas');
  c.width = pw;
  c.height = ph;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  dibujar(c.getContext('2d'), pw, ph, () => { tex.needsUpdate = true; });
  // mate: le afecta la luz (libros, cortinas); si no, brilla sola (pantallas, neones).
  const m = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto), mate ? new THREE.MeshLambertMaterial({ map: tex }) : new THREE.MeshBasicMaterial({
    map: tex, transparent: transparente || aditivo, depthWrite: !(transparente || aditivo),
    blending: aditivo ? THREE.AdditiveBlending : THREE.NormalBlending,
  }));
  return k.noSolido(m);
}

// Cartel de neón: letras de color con resplandor y el centro más claro, sin chapa atrás.
function neon(k, texto, ancho, alto, color) {
  return lamina(k, (g, w, h) => {
    let t = h * 0.7;
    const fuente = () => { g.font = `700 ${t}px Fredoka, 'Arial Rounded MT Bold', Arial, sans-serif`; };
    fuente();
    while (g.measureText(texto).width > w * 0.9 && t > 10) { t -= 2; fuente(); }
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = color;
    g.fillStyle = color;
    for (const b of [36, 18, 6]) { g.shadowBlur = b; g.fillText(texto, w / 2, h / 2); }
    g.shadowBlur = 0;
    g.globalAlpha = 0.55;
    g.fillStyle = '#ffffff';
    g.fillText(texto, w / 2, h / 2);
  }, 1024, Math.max(64, Math.round((1024 * alto) / ancho)), ancho, alto, { transparente: true });
}

// Reviste por dentro las paredes de la sala: '-x', '+x' y la de la puerta (zPuerta = -1 o 1),
// dejando libre el hueco de la puerta. zocalo: color de la parte de abajo (madera), o null.
function revestir(s, color, { lados = [], zPuerta = 0, zocalo = null, altoZocalo = 2.6 } = {}) {
  const X = 8.78;
  const Z = 6.73;
  const A = 9.6;
  const capa = (x0, y0, z0, x1, y1, z1) => {
    if (zocalo) {
      s.d(x0, y0, z0, x1, Math.min(y1, altoZocalo), z1, zocalo);
      if (y1 > altoZocalo) s.d(x0, Math.max(y0, altoZocalo), z0, x1, y1, z1, color);
    } else {
      s.d(x0, y0, z0, x1, y1, z1, color);
    }
  };
  if (lados.includes('-x')) capa(-X, 0, -Z, -X + 0.05, A, Z);
  if (lados.includes('+x')) capa(X - 0.05, 0, -Z, X, A, Z);
  if (zPuerta) {
    const z0 = zPuerta < 0 ? -Z : Z - 0.05;
    capa(-8.8, 0, z0, -3.3, A, z0 + 0.05);
    capa(3.3, 0, z0, 8.8, A, z0 + 0.05);
    s.d(-3.3, 7.1, z0, 3.3, A, z0 + 0.05, color);
  }
}

// Tira de LED en el borde del techo, en las paredes indicadas.
function tirasLed(k, s, color, lados, zPuerta = 0) {
  const m = brillo(k, color);
  if (lados.includes('-x')) s.d(-8.7, 9.2, -6.6, -8.55, 9.32, 6.6, m);
  if (lados.includes('+x')) s.d(8.55, 9.2, -6.6, 8.7, 9.32, 6.6, m);
  if (zPuerta) {
    const z = zPuerta < 0 ? -6.6 : 6.45;
    s.d(-8.6, 9.2, z, 8.6, 9.32, z + 0.15, m);
  }
}

// ---------- Estatuilla de los Vecibanda Awards ----------
// Como la de la foto: un muñeco de bloques dorado con alas grandes, los brazos para arriba,
// sobre una base escalonada con la placa "VECIBANDA AWARDS". Mide unos 2,4 de alto (e = 1).
let matOro = null;
let alaGeo = null;
let placaAwards = null;
function estatuillaAwards(k, e = 1) {
  const THREE = k.THREE;
  matOro ??= new THREE.MeshPhongMaterial({ color: '#d9a21b', specular: '#fff0b0', shininess: 70 });
  const oro = matOro;
  const g = new THREE.Group();
  const caja = (w, h, d, x, y, z, rx = 0, rz = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), oro);
    m.position.set(x, y, z);
    m.rotation.set(rx, 0, rz);
    g.add(m);
    return m;
  };
  const cil = (r0, r1, h, y) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, 20), oro);
    m.position.y = y;
    g.add(m);
  };
  // Base escalonada.
  cil(0.5, 0.52, 0.1, 0.05);
  cil(0.4, 0.44, 0.5, 0.35);
  cil(0.46, 0.46, 0.08, 0.64);
  cil(0.32, 0.36, 0.12, 0.74);
  // Placa adelante de la base.
  placaAwards ??= lamina(k, (c, w, h) => {
    c.fillStyle = '#3a2a08';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#f7d774';
    c.lineWidth = 6;
    c.strokeRect(6, 6, w - 12, h - 12);
    c.fillStyle = '#f7d774';
    c.font = '700 52px Fredoka, Arial, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('VECIBANDA', w / 2, h * 0.36);
    c.font = '700 40px Fredoka, Arial, sans-serif';
    c.fillText('AWARDS', w / 2, h * 0.72);
  }, 384, 160, 0.56, 0.24);
  const placa = placaAwards.clone();
  placa.position.set(0, 0.36, 0.425);
  g.add(placa);
  // Muñeco: piernas, torso, cabeza y los brazos para arriba.
  caja(0.15, 0.42, 0.16, -0.09, 1.01, 0);
  caja(0.15, 0.42, 0.16, 0.09, 1.01, 0);
  caja(0.38, 0.4, 0.2, 0, 1.42, 0);
  caja(0.28, 0.28, 0.28, 0, 1.78, 0);
  caja(0.11, 0.44, 0.12, -0.27, 1.75, 0, 0, 0.45);
  caja(0.11, 0.44, 0.12, 0.27, 1.75, 0, 0, -0.45);
  // Alas: plumas grandes hacia arriba y afuera, atrás del muñeco.
  if (!alaGeo) {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.bezierCurveTo(0.25, 0.15, 0.55, 0.5, 0.75, 1.15);
    s.lineTo(0.62, 1.0);
    s.lineTo(0.66, 1.18);
    s.lineTo(0.5, 0.95);
    s.lineTo(0.52, 1.1);
    s.lineTo(0.36, 0.86);
    s.lineTo(0.36, 0.98);
    s.bezierCurveTo(0.2, 0.7, 0.08, 0.42, 0, 0.3);
    s.closePath();
    alaGeo = new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1, curveSegments: 8 });
  }
  for (const lado of [-1, 1]) {
    const ala = new THREE.Mesh(alaGeo, oro);
    ala.position.set(lado * 0.1, 1.38, -0.16);
    ala.scale.set(lado, 1, 1);
    ala.rotation.y = lado * -0.35;
    g.add(ala);
  }
  g.scale.setScalar(e);
  return g;
}

// ---------- Salón de fiestas (Fiesta Vecibanda) ----------
// Boliche: paredes oscuras con tiras de LED, estructura de truss en el techo, pista LED de
// baldosas con estrellas, bola de boliche colgada con haces de colores (sin lámpara), cabina
// de DJ con frente LED, parlantes, cabezales móviles y la foto gigante atrás del DJ.
const COLORES_PISTA = ['#ff5a5f', '#ff9f1c', '#c77dff', '#ff4fd8', '#4cc9f0', '#80ffdb'];
const salonFiestas = [
  M('luz', 'Neones y truss', 2.5, 2.5, (k, s) => {
    revestir(s, '#150b26', { lados: ['-x', '+x'], zPuerta: -1 });
    tirasLed(k, s, '#ff2bd6', ['+x'], -1);
    tirasLed(k, s, '#00e5ff', ['-x']);
    // Truss: marco cuadrado colgado del techo, con travesaños.
    const t = '#9aa1a8';
    for (const z of [-4, 4]) s.d(-5.2, 8.55, z - 0.15, 5.2, 8.85, z + 0.15, t);
    for (const x of [-5, 5]) s.d(x - 0.15, 8.55, -4, x + 0.15, 8.85, 4, t);
    for (let x = -4; x <= 4; x += 2) s.d(x - 0.05, 8.6, -4, x + 0.05, 8.8, 4, t);
    for (const [x, z] of [[-5, -4], [5, -4], [-5, 4], [5, 4]]) s.d(x - 0.05, 8.85, z - 0.05, x + 0.05, 9.6, z + 0.05, t);
    // El cartel en la pared de la derecha (no en la puerta).
    s.plano(neon(k, 'Fiesta Vecibanda', 10, 2.2, '#ff3bd4'), 8.6, 6.4, 0.5, -Math.PI / 2);
    s.plano(neon(k, '★', 1.4, 1.4, '#fff59d'), 8.6, 7.9, -5, -Math.PI / 2);
  }),
  M('pista', 'Pista de baile LED', -1, -1.5, (k, s) => {
    const nx = 6;
    const nz = 5;
    const lado = 1.8;
    s.d(-nx * lado / 2 - 0.2, 0, -nz * lado / 2 - 0.2, nx * lado / 2 + 0.2, 0.06, nz * lado / 2 + 0.2, '#0c0c12');
    const piso = lamina(k, (g, w, h) => {
      const t = w / nx;
      for (let i = 0; i < nx; i++) {
        for (let j = 0; j < nz; j++) {
          const c = COLORES_PISTA[(i + j * 2) % COLORES_PISTA.length];
          const x = i * t;
          const y = j * t;
          g.fillStyle = '#111';
          g.fillRect(x, y, t, t);
          g.fillStyle = c;
          g.globalAlpha = 0.85;
          g.fillRect(x + 4, y + 4, t - 8, t - 8);
          // Estrella de cuatro puntas clarita en el medio, y rombos en las esquinas.
          g.globalAlpha = 1;
          g.fillStyle = 'rgba(255,255,255,0.55)';
          const cx = x + t / 2;
          const cy = y + t / 2;
          g.beginPath();
          for (let k2 = 0; k2 < 8; k2++) {
            const a = (k2 * Math.PI) / 4;
            const r = k2 % 2 ? t * 0.12 : t * 0.4;
            g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
          }
          g.fill();
          g.fillStyle = 'rgba(0,0,0,0.35)';
          g.beginPath();
          for (let k2 = 0; k2 < 8; k2++) {
            const a = (k2 * Math.PI) / 4 + Math.PI / 4;
            const r = k2 % 2 ? t * 0.05 : t * 0.16;
            g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
          }
          g.fill();
        }
      }
    }, 768, 640, nx * lado, nz * lado);
    piso.rotation.order = 'YXZ';
    piso.rotation.x = -Math.PI / 2;
    s.plano(piso, 0, 0.07, 0, 0);
  }),
  M('bola', 'Bola de boliche', 0, 1, (k, s) => {
    const THREE = k.THREE;
    // Bola espejada (sin lámpara arriba): cadena al techo y haces de colores que giran con ella.
    const tex = new THREE.CanvasTexture((() => {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 128;
      const g = c.getContext('2d');
      for (let x = 0; x < 256; x += 8) for (let y = 0; y < 128; y += 8) {
        const v = 150 + Math.floor(Math.random() * 105);
        g.fillStyle = `rgb(${v},${v},${v + 10})`;
        g.fillRect(x, y, 7, 7);
      }
      return c;
    })());
    tex.colorSpace = THREE.SRGBColorSpace;
    const bola = new THREE.Mesh(new THREE.SphereGeometry(0.85, 20, 14), new THREE.MeshPhongMaterial({ map: tex, specular: '#ffffff', shininess: 120, emissive: '#222233' }));
    k.noSolido(bola);
    bola.userData.girar = 0.8;
    const haz = new THREE.ConeGeometry(1.5, 8, 16, 1, true);
    haz.translate(0, -4, 0);
    ['#ff3bd4', '#00e5ff', '#ffe600', '#7cff4f', '#ff8a00'].forEach((c, i) => {
      const m = new THREE.Mesh(haz, new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.13, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      const a = (i / 5) * Math.PI * 2;
      m.rotation.set(0.55 * Math.cos(a), 0, 0.55 * Math.sin(a));
      bola.add(k.noSolido(m));
    });
    s.plano(bola, 0, 7.9, 0, 0);
    s.d(-0.03, 8.75, -0.03, 0.03, 9.6, 0.03, '#bdbdbd');
  }),
  M('dj', 'Cabina de DJ', -6, 0, (k, s) => {
    const P = pieza(s, -8.7, 0, '+x');
    P.b(-2.8, 0, 0.3, 2.8, 2.4, 2.1, '#141418');
    P.d(-2.9, 2.4, 0.2, 2.9, 2.55, 2.2, '#2b2b33');
    // Frente LED con un ecualizador.
    P.plano(lamina(k, (g, w, h) => {
      g.fillStyle = '#05050a';
      g.fillRect(0, 0, w, h);
      const n = 24;
      for (let i = 0; i < n; i++) {
        const alto = (0.25 + 0.7 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6))) * h;
        const d = g.createLinearGradient(0, h, 0, h - alto);
        d.addColorStop(0, '#00e5ff');
        d.addColorStop(0.6, '#c77dff');
        d.addColorStop(1, '#ff3bd4');
        g.fillStyle = d;
        g.fillRect((i * w) / n + 3, h - alto, w / n - 6, alto);
      }
    }, 512, 160, 5.4, 1.9), 0, 1.2, 2.12, 0);
    // Bandejas, mixer y la compu.
    for (const u of [-1.6, 1.6]) {
      P.cil(0.62, 0.12, '#1d1d1d', u, 2.55, 1.2, 20);
      P.cil(0.5, 0.03, '#3b3b3b', u, 2.67, 1.2, 20);
      P.cil(0.07, 0.05, '#cfd8dc', u, 2.7, 1.2, 8);
    }
    P.d(-0.55, 2.55, 0.8, 0.55, 2.75, 1.7, '#202024');
    for (let i = 0; i < 4; i++) P.d(-0.4 + i * 0.25, 2.75, 1.2, -0.3 + i * 0.25, 2.8, 1.5, brillo(k, ['#00e5ff', '#ff3bd4', '#ffe600', '#7cff4f'][i]));
    P.d(-0.5, 2.55, 0.35, 0.5, 3.25, 0.4, '#1a1a1a');
    P.d(-0.45, 2.6, 0.405, 0.45, 3.2, 0.41, brillo(k, '#5ad1ff'));
  }),
  M('parlantes', 'Parlantes', -6.6, -4.6, (k, s) => [-4.4, 4.4].forEach((z) => s.modelo('speaker', -7.7, 0, z, Math.PI / 2, { alto: 5.2 }))),
  M('luces', 'Cabezales móviles', 3, -3.2, (k, s) => {
    const THREE = k.THREE;
    const haz = new THREE.ConeGeometry(0.9, 8.2, 12, 1, true);
    haz.translate(0, -4.1, 0);
    [[-5, -4, '#ff3bd4'], [5, -4, '#00e5ff'], [-5, 4, '#7cff4f'], [5, 4, '#ffe600']].forEach(([x, z, c]) => {
      s.d(x - 0.3, 8.0, z - 0.3, x + 0.3, 8.55, z + 0.3, '#1b1b1f');
      const m = new THREE.Mesh(haz, new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      m.rotation.set(-0.35 * Math.sign(z), 0, 0.35 * Math.sign(x));
      s.plano(k.noSolido(m), x, 8.0, z, 0);
    });
  }),
  // La foto icónica de la Vecibanda (frente al Palacio Legislativo): ocupa toda la pared de
  // atrás del DJ, de arriba de la cabina hasta el techo. Sin cartel, como todos los cuadros.
  M('foto', 'Cuadro gigante', -4.8, 4.6, (k, s) => {
    const p = pieza(s, -8.62, 0, '+x');
    p.plano(k.pintura('fotovecibanda.jpeg', 6.4, { carpeta: 'cuadros', marco: '#141414' }), 0, 6.15, 0);
  }),
];

// ---------- Estudio de música ----------
// Un home studio moderno, no una sala de ensayo: escritorio con la compu y dos pantallas (en una
// el FL Studio), monitores de estudio en pies, un tecladito MIDI, una guitarra eléctrica, un
// micrófono de condensador con antipop en brazo y paneles acústicos. Puerta en z = +6.6.
const estudioMusica = [
  LUZ(0, 1, (k, s) => {
    revestir(s, '#24262d', { lados: ['-x', '+x'], zPuerta: 1 });
    tirasLed(k, s, '#7c4dff', ['-x', '+x']);
  }),
  M('piso', 'Piso de madera oscura', 0, -1.5, (k, s) => {
    s.d(-8.8, 0, -6.75, 8.8, 0.06, 6.75, '#3b2a20');
    s.d(-6.6, 0.06, -3.4, -1.4, 0.09, 3.4, '#1f2026');
  }),
  M('pc', 'Escritorio con la compu', -5.6, 0, (k, s) => {
    const P = pieza(s, -8.75, 0, '+x');
    P.b(-3.2, 2.35, 0.2, 3.2, 2.5, 2.4, '#1c1c20');
    for (const u of [-3, 3]) P.b(u - 0.12, 0, 0.3, u + 0.12, 2.35, 2.3, '#2a2a30');
    P.d(-3.1, 2.2, 0.3, 3.1, 2.35, 0.4, brillo(k, '#7c4dff'));
    // Pantallas: a la izquierda el FL Studio, a la derecha la lista de canales.
    const pantalla = (u, rot, dibujar) => {
      P.d(u - 1.25, 2.5, 0.75, u + 1.25, 2.56, 1.1, '#111');
      P.d(u - 0.08, 2.56, 0.85, u + 0.08, 3.1, 0.95, '#111');
      const q = P.plano(lamina(k, dibujar, 512, 300, 2.5, 1.46), u, 3.95, 0.98, rot);
      const marco = k.noSolido(k.caja(2.62, 1.58, 0.06, '#0b0b0d'));
      marco.position.z = -0.04;
      q.add(marco);
    };
    pantalla(-1.35, 0.12, (g, w, h, listo) => {
      g.fillStyle = '#2b3036';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#3c434b';
      g.fillRect(0, 0, w, 24);
      g.fillStyle = '#ff8f1f';
      g.font = '700 16px Arial, sans-serif';
      g.fillText('FL STUDIO', 10, 17);
      const logo = new Image();
      logo.onload = () => {
        const l = h * 0.78;
        g.drawImage(logo, (w - l) / 2, 34, l, l);
        listo();
      };
      logo.src = 'assets/especiales/fllogo.jpeg';
    });
    pantalla(1.35, -0.12, (g, w, h) => {
      g.fillStyle = '#262b30';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#3c434b';
      g.fillRect(0, 0, w, 24);
      const colores = ['#ff8f1f', '#7bd389', '#5ab0ff', '#ff6b9a', '#c77dff', '#ffd23f'];
      for (let fila = 0; fila < 8; fila++) {
        const y = 32 + fila * 33;
        g.fillStyle = fila % 2 ? '#2f353c' : '#2a3036';
        g.fillRect(0, y, w, 30);
        for (let x = 20 + (fila * 37) % 60; x < w - 30; x += 70 + (fila * 13) % 40) {
          g.fillStyle = colores[fila % colores.length];
          g.fillRect(x, y + 4, 54, 22);
        }
      }
      g.fillStyle = '#ffffff';
      g.fillRect(w * 0.42, 24, 2, h);
    });
    // Teclado y mouse de la compu, y la torre al costado.
    P.d(-0.9, 2.5, 1.5, 0.9, 2.56, 1.9, '#18181c');
    P.d(1.3, 2.5, 1.6, 1.55, 2.56, 1.85, '#18181c');
    P.b(2.3, 0, 0.4, 2.9, 1.7, 1.8, '#18181c');
    P.d(2.33, 0.3, 1.81, 2.87, 1.5, 1.82, brillo(k, '#7c4dff'));
  }),
  M('parlantes', 'Monitores de estudio', -4.4, 4, (k, s) => {
    const P = pieza(s, -8.75, 0, '+x');
    for (const u of [-4.3, 4.3]) {
      P.b(u - 0.08, 0, 1.2, u + 0.08, 2.9, 1.36, '#2a2a30');
      P.d(u - 0.5, 0, 0.9, u + 0.5, 0.08, 1.7, '#2a2a30');
      P.b(u - 0.5, 2.9, 0.8, u + 0.5, 4.3, 1.75, '#141416');
      P.cil(0.3, 0.06, '#f2c200', u, 3.25, 1.75, 16).rotation.z = Math.PI / 2;
      P.cil(0.12, 0.06, '#1b1b1b', u, 3.25, 1.79, 12).rotation.z = Math.PI / 2;
      P.cil(0.11, 0.06, '#2f2f33', u, 3.95, 1.75, 12).rotation.z = Math.PI / 2;
    }
  }),
  M('guitarra', 'Guitarra eléctrica', 5.6, -3.6, (k, s) => {
    const P = pieza(s, 6.4, -4.4, '-x');
    // Pie de guitarra y la guitarra (cuerpo rojo, golpeador blanco, mástil y clavijero).
    P.d(-0.5, 0, -0.4, 0.5, 0.1, 0.4, '#1b1b1b');
    P.d(-0.06, 0, -0.1, 0.06, 1.3, 0.02, '#1b1b1b');
    P.d(-0.55, 0.35, 0, 0.55, 1.6, 0.18, '#c62828');
    P.d(-0.45, 1.5, 0, 0.45, 2.0, 0.18, '#c62828');
    P.d(-0.2, 0.6, 0.185, 0.25, 1.5, 0.2, '#f2f2f2');
    P.d(-0.08, 2.0, 0.05, 0.08, 3.6, 0.15, '#6d4c41');
    P.d(-0.13, 3.6, 0.05, 0.13, 4.0, 0.15, '#1b1b1b');
    P.d(-0.3, 0.75, 0.19, 0.3, 0.8, 0.21, '#bdbdbd');
    // Ampli chico al lado.
    P.b(0.9, 0, -0.5, 2.1, 1.3, 0.4, '#1b1b1d');
    P.d(1.0, 0.15, 0.41, 2.0, 1.0, 0.42, '#3a3a3e');
    P.d(1.0, 1.05, 0.41, 2.0, 1.2, 0.42, '#c9a227');
  }),
  M('microfono', 'Micrófono de estudio', 2, 2.6, (k, s) => {
    // Pie con brazo, micrófono de condensador con su araña y el antipop adelante.
    s.d(1.6, 0, 2.6, 2.6, 0.08, 3.6, '#1b1b1b');
    s.d(2.06, 0, 3.06, 2.14, 4.6, 3.14, '#2a2a2a');
    s.d(2.1, 4.55, 2.2, 2.18, 4.63, 3.1, '#2a2a2a');
    s.cil(0.2, 0.75, '#c7ccd1', 2.14, 4.2, 2.2, 14);
    s.esf(0.2, '#9aa0a6', 2.14, 4.95, 2.2);
    const pop = s.cil(0.38, 0.03, '#111111', 2.14, 4.55, 1.55, 18);
    pop.rotation.x = Math.PI / 2;
    // Auriculares colgados.
    s.d(1.9, 3.5, 3.05, 2.3, 3.55, 3.15, '#111');
  }),
  M('paneles', 'Paneles acústicos', -4, 4.5, (k, s) => {
    // Paneles de goma espuma en las dos paredes de los costados (no en la de la puerta).
    const colores = ['#2d2f36', '#4b2a6b', '#2d2f36'];
    for (const x of [-8.7, 8.55]) {
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 2; j++) {
          const z = -5.6 + i * 2.6;
          const y = 4.8 + j * 2.2;
          s.d(x, y, z, x + 0.15, y + 2, z + 2.3, colores[(i + j) % 3]);
          for (let r = 0; r < 4; r++) s.d(x + (x < 0 ? 0.15 : -0.05), y + 0.25 + r * 0.45, z + 0.2, x + (x < 0 ? 0.2 : 0), y + 0.4 + r * 0.45, z + 2.1, '#1b1b20');
        }
      }
    }
  }),
  M('teclado', 'Tecladito MIDI', -4.3, -2, (k, s) => {
    const P = pieza(s, -8.75, 0, '+x');
    // Teclado de 25 teclas arriba del escritorio, adelante de las pantallas.
    P.d(-1.1, 2.5, 1.95, 0.7, 2.62, 2.35, '#1d1d22');
    const teclas = lamina(k, (g, w, h) => {
      g.fillStyle = '#f5f5f5';
      g.fillRect(0, 0, w, h);
      const n = 15;
      g.fillStyle = '#222';
      for (let i = 0; i <= n; i++) g.fillRect((i * w) / n - 1, 0, 2, h);
      [0, 1, 3, 4, 5, 7, 8, 10, 11, 12].forEach((i) => g.fillRect(((i + 0.68) * w) / n, 0, w / n * 0.62, h * 0.6));
    }, 256, 64, 1.4, 0.32);
    teclas.rotation.order = 'YXZ';
    teclas.rotation.x = -Math.PI / 2;
    P.plano(teclas, -0.25, 2.63, 2.2, 0);
    for (let i = 0; i < 4; i++) P.d(0.3 + (i % 2) * 0.18, 2.62, 2.0 + Math.floor(i / 2) * 0.16, 0.42 + (i % 2) * 0.18, 2.66, 2.12 + Math.floor(i / 2) * 0.16, brillo(k, ['#ff8f1f', '#5ab0ff', '#7bd389', '#ff6b9a'][i]));
  }),
];

// ---------- Karaoke ----------
// La pantalla de letras (la usa karaoke.js para la letra al ritmo de la canción).
export const PANTALLA_KARAOKE = { malla: null };
export function portadaKaraoke(g, w, h) {
  const d = g.createLinearGradient(0, 0, w, h);
  d.addColorStop(0, '#1b2a6b');
  d.addColorStop(1, '#5b1a6e');
  g.fillStyle = d;
  g.fillRect(0, 0, w, h);
  g.textAlign = 'center';
  g.font = '700 26px Fredoka, Arial, sans-serif';
  g.fillStyle = 'rgba(255,255,255,0.7)';
  g.fillText('♪ VECIBANDA KARAOKE ♪', w / 2, 44);
  g.font = '700 52px Fredoka, Arial, sans-serif';
  g.fillStyle = '#ffd23f';
  g.fillText('Los Guaranguitos', w / 2, 170);
  g.font = '700 30px Fredoka, Arial, sans-serif';
  g.fillStyle = '#ffffff';
  g.fillText('Acercate y tocá "Poner el karaoke"', w / 2, 250);
}
// Como un karaoke de Roblox: sala oscura con LED, la pantalla grande con la letra en la pared
// de adentro (+x), un escenario bajo adelante con dos micrófonos, sillón largo y mesa ratona.
// En la sala de afuera (WOF) la pared -x tiene ventanal: ahí solo va el sillón (bajo).
const karaoke = [
  LUZ(0, 2, (k, s) => {
    revestir(s, '#1a1030', { lados: ['+x'], zPuerta: -1 });
    tirasLed(k, s, '#ff2bd6', ['+x'], -1);
    s.plano(neon(k, 'KARAOKE', 6, 1.4, '#ff3bd4'), 8.6, 8.35, 0, -Math.PI / 2);
    s.plano(neon(k, '♪', 1.2, 1.2, '#00e5ff'), 8.6, 8.3, -4.4, -Math.PI / 2);
    s.plano(neon(k, '♫', 1.2, 1.2, '#00e5ff'), 8.6, 8.3, 4.4, -Math.PI / 2);
  }),
  M('alfombra', 'Alfombra', -3, 3.5, (k, s) => {
    s.d(-8.8, 0, -6.75, 8.8, 0.06, 6.75, '#24143f');
    s.d(-7.4, 0.06, -3.6, -1.6, 0.09, 3.6, '#4a1d6b');
  }),
  M('escenario', 'Escenario con micrófonos', 4.2, 4.4, (k, s) => {
    s.b(4.4, 0, -4.6, 8.6, 0.55, 4.6, '#2b1650');
    s.d(4.35, 0.08, -4.65, 4.42, 0.5, 4.65, brillo(k, '#00e5ff'));
    for (const z of [-1.4, 1.4]) {
      s.d(5.2, 0.55, z - 0.4, 6.0, 0.62, z + 0.4, '#1b1b1b');
      s.d(5.56, 0.55, z - 0.04, 5.64, 4.4, z + 0.04, '#9e9e9e');
      s.esf(0.22, '#2a2a2a', 5.6, 4.6, z);
    }
    [-3.6, 3.6].forEach((z) => s.modelo('speaker', 7.8, 0.55, z, -Math.PI / 2, { alto: 3.6 }));
  }),
  M('pantalla', 'Pantalla de letras', 2.8, -2.4, (k, s) => {
    s.d(8.55, 2.4, -3.2, 8.75, 7.4, 3.2, '#0b0b0f');
    // karaoke.js le dibuja la letra encima mientras suena la canción; si no, esta portada.
    const pantalla = lamina(k, (g, w, h) => portadaKaraoke(g, w, h), 640, 400, 6.2, 4.8);
    PANTALLA_KARAOKE.malla = pantalla;
    s.plano(pantalla, 8.52, 4.9, 0, -Math.PI / 2);
  }),
  M('sillon', 'Sillón largo', -5, 0, (k, s) => sofa(k, pieza(s, -7.6, 0, '+x'), 7, '#d81b60')),
  M('mesa_ratona', 'Mesa ratona', -2.4, 3.6, (k, s) => {
    s.modelo('tableCoffeeGlass', -4.3, 0, 0, Math.PI / 2, { ancho: 3, fondo: 1.6, alto: 1.1 });
    [[-4.6, -0.8, '#ff3bd4'], [-4.1, 0.6, '#00e5ff']].forEach(([x, z, c]) => s.cil(0.14, 0.4, brillo(k, c), x, 1.1, z, 10));
    s.d(-4.2, 1.1, -0.2, -3.6, 1.2, 0.1, '#1b1b1b');
  }),
];

const dormitorio2 = [
  LUZ(0, 0),
  M('alfombra', 'Alfombra', 3, 1.5, (k, s) => alfombra(s, -6.5, -4, 6.5, 2, '#c5d5d3')),
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

// ---------- Bar Vecibanda ----------
// Bar elegante (como el de la foto): paredes de terciopelo bordó con zócalo de madera,
// apliques dorados, la barra de mármol oscuro contra la pared de la derecha con el espejo y
// los estantes de botellas iluminados atrás, el colgador de copas arriba, banquetas tapizadas
// y dos mesitas. El cartel va arriba de las botellas, no en la puerta.
const bar = [
  LUZ(-3, -2, (k, s) => {
    revestir(s, '#5c1420', { lados: ['-x', '+x'], zPuerta: -1, zocalo: '#4a2f1d' });
    for (const x of [-8.7, 8.65]) s.d(x, 2.6, -6.6, x + 0.05, 2.75, 6.6, '#a07a3b');
    // Apliques dorados de dos luces a los costados de la barra.
    for (const z of [-5, 5]) {
      s.d(8.55, 5.2, z - 0.25, 8.7, 5.9, z + 0.25, '#b8892f');
      for (const dz of [-0.45, 0.45]) {
        s.d(8.3, 5.75, z + dz - 0.05, 8.6, 5.85, z + dz + 0.05, '#b8892f');
        s.esf(0.22, brillo(k, '#ffe7b0'), 8.3, 6.15, z + dz);
      }
    }
    s.plano(neon(k, 'Bar Vecibanda', 7, 1.5, '#ffcf6b'), 8.62, 8.1, 0, -Math.PI / 2);
  }),
  M('barra', 'Barra de mármol', 3.2, -3.4, (k, s) => {
    s.b(4.6, 0, -4.4, 5.9, 2.35, 4.4, '#4a2f1d');
    for (let z = -4; z < 4.2; z += 1.6) s.d(4.55, 0.3, z, 4.6, 2.0, z + 1.2, '#5c3a24');
    s.d(4.3, 2.35, -4.6, 6.1, 2.55, 4.6, '#2f3b38');
    s.d(4.3, 0.15, -4.4, 4.45, 0.3, 4.4, '#b8892f');
  }),
  M('botellas', 'Espejo y botellas', 7, -3, (k, s) => {
    // Mueble bajo, espejo iluminado y tres estantes de botellas de colores.
    s.b(7.6, 0, -4, 8.75, 2.2, 4, '#3b2416');
    s.d(8.7, 2.9, -3.4, 8.75, 6.9, 3.4, '#b8892f');
    s.d(8.65, 3.0, -3.3, 8.7, 6.8, 3.3, brillo(k, '#e8d9b0'));
    const colores = ['#2e7d32', '#8d6e63', '#ffb300', '#c62828', '#ece6d0', '#5d4037', '#1565c0', '#d4a017'];
    for (const [i, y] of [3.3, 4.6, 5.9].entries()) {
      s.d(8.0, y - 0.1, -3.3, 8.7, y, 3.3, '#3b2416');
      s.d(8.0, y - 0.13, -3.3, 8.7, y - 0.1, 3.3, brillo(k, '#ffcf6b'));
      for (let z = -3, n = 0; z < 3.1; z += 0.55, n++) {
        const c = colores[(n + i * 3) % colores.length];
        s.cil(0.13, 0.6, c, 8.35, y, z, 8);
        s.cil(0.05, 0.25, c, 8.35, y + 0.6, z, 6);
      }
    }
    // Colgador de copas arriba de la barra.
    s.d(4.6, 7.6, -3.5, 6.0, 7.75, 3.5, '#1d1d1d');
    for (const x of [4.7, 5.9]) for (const z of [-3.4, 3.4]) s.d(x - 0.02, 7.75, z - 0.02, x + 0.02, 9.6, z + 0.02, '#9e9e9e');
    for (let z = -3.2; z <= 3.2; z += 0.8) for (const x of [4.95, 5.6]) {
      s.cil(0.02, 0.3, '#e0f2f1', x, 7.3, z, 6);
      s.cil(0.16, 0.25, k.vidrio, x, 7.05, z, 10);
    }
  }),
  M('banquetas', 'Banquetas', 2.6, 0, (k, s) => [-3.3, -1.1, 1.1, 3.3].forEach((z) => s.modelo('stoolBar', 3.6, 0, z, Math.PI / 2, { tela: '#2b2b35' }))),
  M('mesa', 'Mesitas', -4.2, 1.4, (k, s) => {
    // Mesitas de pie (tapa redonda de mármol, columna y base de bronce) con dos sillones
    // tapizados y una velita.
    for (const z of [-2.6, 3]) {
      s.cil(0.75, 0.08, '#b8892f', -5, 0, z, 16);
      s.cil(0.12, 2.15, '#b8892f', -5, 0.08, z, 10);
      s.cil(1.05, 0.12, '#2f3b38', -5, 2.23, z, 20);
      for (const dx of [-1.9, 1.9]) {
        s.b(-5 + dx - 0.6, 0, z - 0.6, -5 + dx + 0.6, 1.2, z + 0.6, '#5c1420');
        const atras = dx < 0 ? -5 + dx - 0.6 : -5 + dx + 0.45;
        s.b(atras, 1.2, z - 0.6, atras + 0.15, 2.6, z + 0.6, '#5c1420');
        s.d(-5 + dx - 0.55, 0, z - 0.55, -5 + dx + 0.55, 0.25, z + 0.55, '#3b2416');
      }
      s.cil(0.12, 0.3, '#fff3d6', -5, 2.35, z, 8);
      s.cil(0.04, 0.12, brillo(k, '#ffcf6b'), -5, 2.65, z, 6);
    }
  }),
];

// ---------- Sala de trofeos: Vecibanda Awards ----------
// Paredes azul noche con guarda dorada, alfombra roja desde la puerta (z = +6.6) hasta el
// podio con la estatuilla grande y el fondo con el neón "VECIBANDA AWARDS", vitrinas con
// estatuillas a los costados y lo de La Dosis en la pared.
const salaTrofeos = [
  LUZ(0, 3, (k, s) => {
    revestir(s, '#141c3a', { lados: ['-x', '+x'], zPuerta: 1 });
    for (const x of [-8.7, 8.65]) s.d(x, 8.3, -6.6, x + 0.05, 8.5, 6.6, '#d4a017');
    s.plano(k.imagen('assets/especiales/ladosis_banderin.png', 2.4, 3.5, { dosLados: true }), 8.6, 6.4, 3.8, -Math.PI / 2);
    s.plano(k.imagen('assets/especiales/ladosis_escudo.png', 2.6, 2.6), 8.6, 6.6, -1.8, -Math.PI / 2);
  }),
  M('alfombra', 'Alfombra roja', 0.25, 2.5, (k, s) => {
    s.d(-1.5, 0, -3.4, 1.5, 0.08, 6.7, '#b71c1c');
    for (const x of [-1.5, 1.4]) s.d(x, 0.08, -3.4, x + 0.1, 0.1, 6.7, '#d4a017');
  }),
  M('vitrinas1', 'Vitrinas', -5.6, -3, (k, s) => vitrinas(k, s, [[-7.4, -4], [-7.4, 0], [-7.4, 4]])),
  M('vitrinas2', 'Más vitrinas', 5.6, 3, (k, s) => vitrinas(k, s, [[7.4, -4], [7.4, 0]])),
  M('podio', 'Podio con la estatuilla', 3.4, -2, (k, s) => {
    // Fondo oscuro con el neón, y el podio de tres escalones con las estatuillas.
    s.d(-5, 0, -6.2, 5, 8.8, -5.95, '#0e1430');
    s.d(-5.1, 8.8, -6.25, 5.1, 9.0, -5.9, '#d4a017');
    s.plano(neon(k, 'VECIBANDA AWARDS', 9, 1.7, '#ffd54f'), 0, 7.3, -5.9, 0);
    s.b(-3.6, 0, -5.6, -1.2, 1.0, -3.6, '#eeeeee');
    s.b(-1.2, 0, -5.6, 1.2, 1.6, -3.6, '#ffffff');
    s.b(1.2, 0, -5.6, 3.6, 0.7, -3.6, '#eeeeee');
    s.plano(estatuillaAwards(k, 1.6), 0, 1.6, -4.6, 0);
    s.plano(estatuillaAwards(k, 1.15), -2.4, 1.0, -4.6, 0);
    s.plano(estatuillaAwards(k, 1.15), 2.4, 0.7, -4.6, 0);
    for (const [x, n] of [[0, '1'], [-2.4, '2'], [2.4, '3']]) {
      s.plano(neon(k, n, 0.8, 0.8, '#d4a017'), x, 0.35, -3.58, 0);
    }
  }),
];

// Vitrinas de vidrio con una estatuilla de los Vecibanda Awards cada una.
function vitrinas(k, s, lugares) {
  lugares.forEach(([x, z]) => {
    s.b(x - 1, 0, z - 1, x + 1, 2, z + 1, '#2a1d14');
    s.d(x - 1.05, 2, z - 1.05, x + 1.05, 2.1, z + 1.05, '#d4a017');
    s.b(x - 0.95, 2.1, z - 0.95, x + 0.95, 5.2, z + 0.95, k.vidrio);
    s.d(x - 1, 5.2, z - 1, x + 1, 5.35, z + 1, '#2a1d14');
    s.d(x - 0.3, 5.18, z - 0.3, x + 0.3, 5.2, z + 0.3, brillo(k, '#fff3d6'));
    s.plano(estatuillaAwards(k, 1.05), x, 2.1, z, x < 0 ? Math.PI / 2 : -Math.PI / 2);
  });
}

// ---------- Vecibanda TV (estudio de streaming) ----------
// Setup violeta con neones (como la foto): escritorio blanco largo contra la pared de adentro
// con tres monitores, la pantalla grande arriba con la ciudad de noche y paneles de neón,
// silla gamer, parlantes en pie con luz, aro de luz, puf y planta. "EN VIVO" arriba de la
// puerta y "VECIBANDA TV" arriba de la pantalla. La pared +x es la de afuera (ventanal).
const streaming = [
  LUZ(0, 0, (k, s) => {
    revestir(s, '#3d2b8a', { lados: ['-x'], zPuerta: -1 });
    tirasLed(k, s, '#b388ff', ['-x'], -1);
    s.plano(neon(k, '● EN VIVO', 4.6, 1.2, '#ff3b3b'), 0, 8.3, -6.6, 0);
    s.plano(neon(k, 'VECIBANDA TV', 7.5, 1.4, '#7df9ff'), -8.62, 8.55, 0, Math.PI / 2);
  }),
  M('alfombra', 'Alfombra', -1.5, 2, (k, s) => {
    s.d(-8.8, 0, -6.75, 8.8, 0.06, 6.75, '#2a2350');
    s.d(-5.6, 0.06, -3.6, 1.4, 0.09, 3.6, '#5b3fb0');
  }),
  M('escritorio', 'Escritorio con 3 monitores', -4.6, 4.6, (k, s) => {
    const P = pieza(s, -8.75, 0, '+x');
    P.b(-4, 2.3, 0.2, 4, 2.45, 2.2, '#f2f2f6');
    P.b(-4, 0, 0.3, -2.6, 2.3, 2.1, '#e8e8ee');
    for (let i = 0; i < 3; i++) P.d(-3.9, 0.3 + i * 0.7, 2.11, -2.7, 0.9 + i * 0.7, 2.12, '#d6d6de');
    P.b(3.8, 0, 0.3, 4, 2.3, 2.1, '#e8e8ee');
    P.d(-3.9, 2.18, 2.1, 3.9, 2.28, 2.2, brillo(k, '#00e5ff'));
    // Pantalla grande en la pared: ciudad de noche, con marco de neón y dos paneles al costado.
    P.plano(lamina(k, (g, w, h) => {
      const d = g.createLinearGradient(0, 0, 0, h);
      d.addColorStop(0, '#0b1240');
      d.addColorStop(1, '#2a7ad8');
      g.fillStyle = d;
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffffff';
      for (let i = 0; i < 40; i++) g.fillRect((i * 97) % w, (i * 53) % (h * 0.5), 2, 2);
      g.fillStyle = '#d9f1ff';
      g.beginPath();
      g.arc(w * 0.62, h * 0.32, h * 0.22, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#0d1b3d';
      let x = 0;
      let n = 0;
      while (x < w) {
        const bw = 26 + ((n * 37) % 40);
        const bh = h * (0.25 + ((n * 53) % 50) / 100);
        g.fillRect(x, h - bh, bw, bh);
        x += bw + 4;
        n++;
      }
    }, 512, 256, 6.4, 3.1), 0, 6.2, 0.05, 0);
    P.d(-3.3, 4.55, 0.0, 3.3, 4.65, 0.06, brillo(k, '#7df9ff'));
    P.d(-3.3, 7.75, 0.0, 3.3, 7.85, 0.06, brillo(k, '#7df9ff'));
    for (const u of [-5, 5]) {
      P.d(u - 0.9, 5.2, 0.0, u + 0.9, 5.3, 0.06, brillo(k, '#e0b3ff'));
      P.d(u - 0.9, 7.0, 0.0, u + 0.9, 7.1, 0.06, brillo(k, '#e0b3ff'));
      P.d(u - 0.9, 5.2, 0.0, u - 0.8, 7.1, 0.06, brillo(k, '#e0b3ff'));
      P.d(u + 0.8, 5.2, 0.0, u + 0.9, 7.1, 0.06, brillo(k, '#e0b3ff'));
    }
    // Tres monitores (el del medio más grande, los de los costados un poco girados).
    [[-1.9, 0.3, 1.5], [0, 0, 2.0], [1.9, -0.3, 1.5]].forEach(([u, rot, ancho]) => {
      P.d(u - 0.08, 2.45, 0.9, u + 0.08, 3.0, 1.0, '#1b1b1b');
      const q = P.plano(lamina(k, (g, w, h) => {
        g.fillStyle = '#e8f6ff';
        g.fillRect(0, 0, w, h);
        g.fillStyle = '#6a5acd';
        g.fillRect(0, 0, w, h * 0.12);
        g.fillStyle = '#b8d9ff';
        g.fillRect(w * 0.06, h * 0.2, w * 0.6, h * 0.6);
        g.fillStyle = '#c7b8ff';
        g.fillRect(w * 0.7, h * 0.2, w * 0.24, h * 0.6);
      }, 256, 150, ancho, ancho * 0.58), u, 3.0 + ancho * 0.29, 1.02, rot);
      const marco = k.noSolido(k.caja(ancho + 0.12, ancho * 0.58 + 0.12, 0.06, '#111'));
      marco.position.z = -0.04;
      q.add(marco);
    });
    P.d(-0.9, 2.45, 1.45, 0.9, 2.5, 1.85, '#222');
    P.d(1.15, 2.45, 1.5, 1.4, 2.5, 1.8, '#222');
    // Cartelito "Enjoy" de neón y la webcam.
    P.plano(neon(k, 'Vecis', 1.2, 0.5, '#7df9ff'), -3.2, 2.75, 1.3, 0);
    P.d(-0.15, 4.0, 1.0, 0.15, 4.18, 1.15, '#111');
  }),
  M('silla', 'Silla gamer', -3.4, 0, (k, s) => sillaEscritorio(k, pieza(s, -8.75, 0, '+x'), '#ffb300', 3.6)),
  M('aro', 'Parlantes y aro de luz', -3, 5.2, (k, s) => {
    const P = pieza(s, -8.75, 0, '+x');
    for (const u of [-5.4, 5.4]) {
      P.b(u - 0.6, 0, 0.4, u + 0.6, 2.6, 1.6, '#f2f2f6');
      for (const y of [0.8, 1.9]) {
        P.cil(0.38, 0.05, '#2a2a33', u, y, 1.62, 16).rotation.z = Math.PI / 2;
        P.cil(0.42, 0.03, brillo(k, '#00b0ff'), u, y, 1.6, 16).rotation.z = Math.PI / 2;
      }
    }
    s.d(-1.1, 0, 4.5, -0.9, 4.0, 4.7, '#9e9e9e');
    const aro = s.cil(0.8, 0.12, brillo(k, '#fffde7'), -1, 4.4, 4.6, 24);
    aro.rotation.x = Math.PI / 2;
  }),
  M('neones', 'Puf, planta y neones', 4.6, 3.6, (k, s) => {
    // Puf blanco, planta y los símbolos de joystick en la pared de la puerta (a un costado).
    s.plano(neon(k, '○', 1.1, 1.1, '#ff6ec7'), -6.4, 5.6, -6.6, 0);
    s.plano(neon(k, '△', 1.1, 1.1, '#7df9ff'), -5.0, 5.6, -6.6, 0);
    s.plano(neon(k, '✕', 1.1, 1.1, '#b388ff'), -6.4, 4.3, -6.6, 0);
    s.plano(neon(k, '□', 1.1, 1.1, '#ffd23f'), -5.0, 4.3, -6.6, 0);
    s.plano(neon(k, 'PLAY', 3.2, 1.2, '#7df9ff'), 5.9, 5.4, -6.6, 0);
    const puf = s.esf(1.1, '#f4f4fb', 5.6, 0.75, 4.6);
    puf.scale.y = 0.65;
    planta(k, P0(s), 7.4, 5.6, 3.6);
  }),
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

// Jacuzzi en la terraza (y lo que va con él): deck de madera, jacuzzi redondo de piedra con
// burbujas y luz abajo del agua, escalones, toallas y el balde con champagne; tres reposeras
// de verdad (estructura blanca, almohadón a rayas y respaldo reclinado) con mesitas, una
// sombrilla grande y macetas con plantas en las esquinas de la terraza.
let rayasReposera = null;
export function jacuzzi(k, g) {
  const THREE = k.THREE;
  const y = nivel(4);
  const add = (x0, y0, z0, x1, y1, z1, c, solido = true) => {
    const m = k.cajaDe(x0, y + y0, z0, x1, y + y1, z1, c);
    if (!solido) k.noSolido(m);
    g.add(m);
    return m;
  };
  // Deck de madera con tablas.
  add(-27.6, 0, -13.6, -14.4, 0.25, -2.6, '#a0714f');
  for (let x = -27.3; x < -14.5; x += 0.75) add(x, 0.25, -13.6, x + 0.04, 0.26, -2.6, '#7e5538', false);
  // Jacuzzi redondo: piedra clara, borde, agua con burbujas y luz.
  const cx = -21;
  const cz = -8.1;
  // Hueco (paredes de afuera y de adentro, borde y fondo) para que se vea el agua y meterse.
  const piedra = k.material('#e8e4dc');
  for (const [r0, r1, lado] of [[3.4, 3.5, THREE.FrontSide], [3.0, 3.0, THREE.BackSide]]) {
    const m = new THREE.MeshLambertMaterial({ color: '#e8e4dc', side: lado });
    const pared = k.noSolido(new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, 1.15, 28, 1, true), m));
    pared.position.set(cx, y + 0.25 + 0.575, cz);
    g.add(pared);
  }
  g.add(k.noSolido(k.cilindro(3.0, 3.0, 0.05, piedra, cx, y + 0.27, cz, 28)));
  // Asiento corrido adentro.
  const asiento = k.noSolido(new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.35, 6, 28), k.material('#dcd6cb')));
  asiento.rotation.x = Math.PI / 2;
  asiento.position.set(cx, y + 0.6, cz);
  g.add(asiento);
  const borde = k.noSolido(new THREE.Mesh(new THREE.TorusGeometry(3.15, 0.22, 8, 32), k.material('#f5f2ec')));
  borde.rotation.x = Math.PI / 2;
  borde.position.set(cx, y + 1.42, cz);
  g.add(borde);
  g.add(k.noSolido(k.cilindro(1.2, 1.2, 0.04, k.brillo('#55e3ff'), cx, y + 0.31, cz, 20)));
  const agua = k.noSolido(k.cilindro(3.0, 3.0, 1.0, k.agua, cx, y + 0.8, cz, 28));
  g.add(agua);
  const burbuja = new THREE.SphereGeometry(0.09, 6, 4);
  const blanca = new THREE.MeshBasicMaterial({ color: '#f2fdff', transparent: true, opacity: 0.85 });
  for (let i = 0; i < 70; i++) {
    const a = i * 2.39996;
    const r = 2.8 * Math.sqrt((i + 0.5) / 70);
    const b = k.noSolido(new THREE.Mesh(burbuja, blanca));
    b.position.set(cx + Math.cos(a) * r, y + 1.33, cz + Math.sin(a) * r);
    b.scale.setScalar(0.6 + ((i * 7) % 5) * 0.2);
    g.add(b);
  }
  // Escalones de madera para subir.
  add(cx - 1.2, 0.25, cz + 3.3, cx + 1.2, 0.65, cz + 4.1, '#8a5d3f');
  add(cx - 1.2, 0.25, cz + 3.3, cx + 1.2, 1.0, cz + 3.7, '#8a5d3f');
  // Toallas enrolladas y el balde con champagne.
  ['#ffffff', '#5ec5e8', '#ffffff'].forEach((c, i) => {
    const t = k.cilindro(0.28, 0.28, 1.4, c, -26.4, y + 0.53 + i * 0.56, -12.6, 10);
    t.rotation.x = Math.PI / 2;
    g.add(t);
  });
  g.add(k.cilindro(0.3, 0.22, 0.5, '#cfd4d8', -16.0, y + 0.5, -12.8, 10));
  g.add(k.noSolido(k.cilindro(0.08, 0.08, 0.8, '#1b5e20', -16.0, y + 0.75, -12.8, 6)));

  // ---- Reposeras con mesitas y la sombrilla ----
  rayasReposera ??= (() => {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const gg = c.getContext('2d');
    for (let i = 0; i < 8; i++) {
      gg.fillStyle = i % 2 ? '#ffffff' : '#1f4e79';
      gg.fillRect(i * 8, 0, 8, 64);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshLambertMaterial({ map: t });
  })();
  const reposera = (x, z) => {
    // Mirando hacia +z (adelante), con el respaldo atrás.
    const blanco = '#f4f4f2';
    for (const dx of [-0.75, 0.75]) {
      add(x + dx - 0.06, 0.25, z - 2.6, x + dx + 0.06, 0.95, z - 2.48, blanco);
      add(x + dx - 0.06, 0.25, z + 1.9, x + dx + 0.06, 0.95, z + 2.02, blanco);
      add(x + dx - 0.06, 0.9, z - 2.6, x + dx + 0.06, 1.0, z + 2.0, blanco, false);
    }
    const asiento = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.22, 3.2), rayasReposera);
    asiento.position.set(x, y + 1.1, z + 0.4);
    g.add(asiento);
    const respaldo = k.noSolido(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.22, 1.9), rayasReposera));
    respaldo.position.set(x, y + 1.65, z - 1.95);
    respaldo.rotation.x = -0.75;
    g.add(respaldo);
    const almohada = k.noSolido(k.caja(1.2, 0.25, 0.5, '#ffffff', x, y + 2.15, z - 2.45));
    almohada.rotation.x = -0.75;
    g.add(almohada);
  };
  for (const x of [-24.5, -21, -17.5]) reposera(x, -21.5);
  // Mesitas con un vaso de jugo entre reposera y reposera.
  for (const x of [-22.75, -19.25]) {
    g.add(k.cilindro(0.45, 0.45, 0.08, '#f4f4f2', x, y + 1.0, -22.4, 14));
    g.add(k.cilindro(0.07, 0.07, 1.0, '#f4f4f2', x, y + 0.5, -22.4, 6));
    g.add(k.noSolido(k.cilindro(0.12, 0.1, 0.4, '#ff9800', x, y + 1.24, -22.4, 8)));
  }
  // Sombrilla grande cuadrada: mástil, varillas y la tela con el volado.
  add(-13.1, 0, -23.1, -12.9, 5.4, -22.9, '#cfcfcf', false);
  add(-13.8, 0, -23.8, -12.2, 0.3, -22.2, '#9e9e9e');
  const tela = k.noSolido(k.cono(4.2, 1.4, '#f3e6c8', -13, y + 5.9, -23, 4));
  tela.rotation.y = Math.PI / 4;
  g.add(tela);
  for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) add(-13 + dx * 2.95 - (dz ? 2.95 : 0.03), 5.05, -23 + dz * 2.95 - (dx ? 2.95 : 0.03), -13 + dx * 2.95 + (dz ? 2.95 : 0.03), 5.4, -23 + dz * 2.95 + (dx ? 2.95 : 0.03), '#d9c39a', false);
  // Macetas redondas con plantas en las esquinas.
  [[-42, -32], [-42, -3], [40.8, -3], [40.8, -32], [20, -32], [20, -3]].forEach(([x, z]) => {
    if (x === 20 && z === -32) return; // ahí ahora llega la piscina infinita
    g.add(k.cilindro(0.75, 0.6, 1.2, '#455a64', x + 0.6, y + 0.6, z + 0.6, 12));
    for (const [dx, dy, dz, r] of [[0, 1.9, 0, 0.95], [0.45, 1.6, 0.3, 0.6], [-0.4, 1.7, -0.3, 0.65], [0.1, 2.5, -0.1, 0.55]]) {
      g.add(k.noSolido(k.esfera(r, '#2e7d32', x + 0.6 + dx, y + dy, z + 0.6 + dz)));
    }
  });
}
