// Muebles de cada habitación. Coordenadas locales: (0,0) es el centro de la habitación,
// x de -8 a 8, z de -6.6 a 6.6, y desde el piso terminado.
import { nivel, ALTO_PISO, LOSA } from './constantes.js';
import { colgante } from './arquitectura.js';

// Habitaciones: W/E = ala oeste/este, I/O = columna interior/exterior, F/B = adelante/atrás.
const LUGARES = {
  WIF: [-17, -7], WIB: [-17, -27], WOF: [-35, -7], WOB: [-35, -27],
  EIF: [17, -7], EIB: [17, -27], EOF: [35, -7], EOB: [35, -27],
};

// Cada diseño se dibujó para un tipo de habitación ("nativo": WF, WB, EF o EB). Si va en
// otra, se refleja en X (oeste/este) y/o en Z (adelante/atrás) para que la puerta quede libre.
function sala(k, g, lugar, piso, nativo) {
  const [cx, cz] = LUGARES[lugar];
  const y = nivel(piso);
  const ex = lugar[0] === nativo[0] ? 1 : -1;
  const ez = lugar[2] === nativo[1] ? 1 : -1;
  const rango = (a, b, e) => (e > 0 ? [a, b] : [-b, -a]);
  const girar = (rot) => {
    let r = ex > 0 ? rot : -rot;
    if (ez < 0) r = Math.PI - r;
    return r;
  };
  const s = {
    b(x0, y0, z0, x1, y1, z1, color) {
      const [a0, a1] = rango(x0, x1, ex);
      const [c0, c1] = rango(z0, z1, ez);
      const m = k.cajaDe(cx + a0, y + y0, cz + c0, cx + a1, y + y1, cz + c1, color);
      g.add(m);
      return m;
    },
    // Decoración que no choca.
    d(x0, y0, z0, x1, y1, z1, color) { return k.noSolido(s.b(x0, y0, z0, x1, y1, z1, color)); },
    cil(r, h, color, x, y0, z, seg = 12) {
      const m = k.cilindro(r, r, h, color, cx + ex * x, y + y0 + h / 2, cz + ez * z, seg);
      g.add(m);
      return m;
    },
    esf(r, color, x, y0, z) {
      const m = k.esfera(r, color, cx + ex * x, y + y0, cz + ez * z);
      g.add(m);
      return m;
    },
    cono(r, h, color, x, y0, z, seg = 8) {
      const m = k.cono(r, h, color, cx + ex * x, y + y0 + h / 2, cz + ez * z, seg);
      g.add(m);
      return m;
    },
    // Coloca una lámina (cartel, retrato) que mira hacia rotY.
    plano(m, x, y0, z, rotY) {
      m.position.set(cx + ex * x, y + y0, cz + ez * z);
      m.rotation.y = girar(rotY);
      g.add(m);
      return m;
    },
    cartel(texto, ancho, alto, x, y0, z, rotY, color, fondo) {
      return s.plano(k.cartel(texto, ancho, alto, color, fondo), x, y0, z, rotY);
    },
    // Mueble 3D (ver kit.modelo) con el frente hacia rotY.
    modelo(nombre, x, y0, z, rotY = 0, opts = {}) {
      return s.plano(k.modelo(nombre, opts), x, y0, z, rotY);
    },
    medida: (nombre, opts) => k.medida(nombre, opts),
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
  p.modelo(ancho > 3.2 ? 'bedDouble' : 'bedSingle', 0, 0, { ancho: ancho + 0.3, atras: -largo / 2 - 0.35, tela: color });
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
    p.modelo('bathroomMirror', u, 0, { alto: 2.6, atras: -0.68, y: 3.3, solido: false });
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

// Mesada: muebles bajos (con bacha y anafe donde se pidan), alacenas, campana y algunos
// electrodomésticos chicos arriba.
function mesada(k, p, largo, bacha, anafe) {
  const L = largo / 2;
  const n = Math.max(1, Math.round(largo / 2.4));
  const w = largo / n;
  const cerca = (u, x) => x !== undefined && Math.abs(u - x) < w / 2;
  let alto = 0;
  for (let i = 0; i < n; i++) {
    const u = -L + w * (i + 0.5);
    const tipo = cerca(u, bacha) ? 'kitchenSink' : cerca(u, anafe) ? 'kitchenStove' : i % 2 ? 'kitchenCabinetDrawer' : 'kitchenCabinet';
    p.modelo(tipo, u, 0, { ancho: w + 0.01, atras: -0.68 });
    alto = p.medida(tipo, { ancho: w }).y;
    if (cerca(u, anafe)) p.modelo('hoodModern', u, 0, { ancho: w * 0.9, atras: -0.68, y: alto + 2.3, solido: false });
    else p.modelo(i % 2 ? 'kitchenCabinetUpper' : 'kitchenCabinetUpperDouble', u, 0, { ancho: w + 0.01, atras: -0.68, y: alto + 2.1, solido: false });
  }
  p.d(-L, alto, -0.68, L, alto + 2.1, -0.62, k.tex('baldosa', '#e9e4dc', 0.6));
  const libres = [];
  for (let i = 0; i < n; i++) {
    const u = -L + w * (i + 0.5);
    if (!cerca(u, bacha) && !cerca(u, anafe)) libres.push(u);
  }
  ['kitchenCoffeeMachine', 'kitchenMicrowave', 'toaster'].forEach((m, i) => {
    if (libres[i] !== undefined) p.modelo(m, libres[i], 0, { atras: -0.5, y: alto, solido: false });
  });
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

function escritorio(k, p, ancho, color) {
  p.modelo('desk', 0, 0, { ancho, atras: -0.7 });
  const alto = p.medida('desk', { ancho }).y;
  p.modelo('computerScreen', 0, 0, { atras: -0.6, y: alto, solido: false });
  p.modelo('computerKeyboard', 0, 0.4, { y: alto, solido: false });
  p.modelo('chairDesk', 0, 1.8, { rot: Math.PI, tela: color });
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

// ---------- Planta baja ----------

function living(k, s) {
  const P = pieza(s, 0, 0, '+z');
  alfombra(s, -6.4, -3.9, 3.4, 3.9, '#cbbba5');
  tele(k, pieza(s, -8.1, 0, '+x'), 6);
  sofa(k, pieza(s, 1.6, 0, '-x'), 6.6, '#7d8a96');
  mesaRatona(k, pieza(s, -3, 0, '+x'), 3.2, 1.8);
  sofa(k, pieza(s, -3, 4.9, '-z'), 3.4, '#c9b8a0');
  lamparaPie(k, P, 3.8, 4.9);
  planta(k, P, -7.7, 5.7);
  planta(k, P, 7.7, 5.7);
  planta(k, P, 7.7, -5.7, 2.4);
  estanteria(k, pieza(s, -6, -6.2, '+z'), 4);
  pintura(k, pieza(s, 8.62, 0, '-x'), 'impresion.jpg', 0, 4.8, 0, 3);
}

function cocina(k, s) {
  const P = pieza(s, 0, 0, '+z');
  mesada(k, pieza(s, -1.4, -6.05, '+z'), 12.2, -2.5, 2.5);
  heladera(k, pieza(s, 6.8, -5.85, '+z'));
  // Isla con barra y banquetas.
  const isla = pieza(s, -1.4, -0.6, '+z');
  for (const u of [-2.4, 0, 2.4]) {
    isla.modelo('kitchenBar', u, 0, { ancho: 2.41 });
    isla.modelo('stoolBar', u, 2.2, { rot: Math.PI, tela: '#3a3f44' });
  }
  isla.modelo('plantSmall1', 0, 0, { y: isla.medida('kitchenBar', { ancho: 2.41 }).y, solido: false, escala: 1.5 });
  // Mesa redonda para desayunar.
  const mesa = pieza(s, 5, 3.4, '+z');
  mesa.modelo('tableRound', 0, 0, { ancho: 3.2 });
  [[0, -2.1, 0], [0, 2.1, Math.PI], [-2.1, 0, Math.PI / 2], [2.1, 0, -Math.PI / 2]].forEach(([u, v, r]) => mesa.modelo('chairModernCushion', u, v, { rot: r, tela: '#e9e2d6' }));
  planta(k, P, -7.8, 5.6);
  planta(k, P, 7.8, -2);
}

function salaJuegos(k, s) {
  s.b(-3, 0, -2, 3, 1.6, 2, '#5d4037');
  s.d(-2.7, 1.6, -1.7, 2.7, 1.72, 1.7, '#2e7d32');
  s.esf(0.2, '#ffffff', -1, 1.92, 0);
  s.esf(0.2, '#e53935', 1, 1.92, 0.4);
  s.esf(0.2, '#fdd835', 1.3, 1.92, -0.3);
  s.b(3.6, 0, -6.4, 7.6, 1.8, -4.4, '#1565c0');
  s.d(3.6, 1.8, -6.2, 7.6, 1.85, -4.6, '#4caf50');
  [4.3, 5.2, 6.1, 7].forEach((x) => s.d(x - 0.06, 1.95, -6.9, x + 0.06, 2.07, -3.9, '#bdbdbd'));
  s.b(5.8, 0, 3, 7.8, 5.2, 5.2, '#7b1fa2');
  s.d(5.75, 3, 3.3, 5.8, 4.5, 4.9, brillo(k, '#00e5ff'));
  s.b(2.8, 0, 3, 4.8, 5.2, 5.2, '#c2185b');
  s.d(2.75, 3, 3.3, 2.8, 4.5, 4.9, brillo(k, '#ffea00'));
  s.cil(0.9, 0.1, '#ffffff', -7.95, 4, 5, 16).rotation.z = Math.PI / 2;
  s.d(-8.2, 0, 4.5, -4.5, 0.06, 6.5, '#ffb300');
  s.modelo('loungeSofa', -6.4, 0, -5.4, 0, { ancho: 3.6, tela: '#5d4037' });
  s.modelo('pottedPlant', -7.8, 0, -1, 0, { alto: 3.4 });
}

function banioPB(k, s) {
  const P = pieza(s, 0, 0, '+z');
  alfombra(s, -8.7, -6.75, 8.7, 6.75, k.tex('baldosa', '#e3e6e8', 1.5));
  ducha(k, pieza(s, -6.7, -4.75, '+z'), 4, 4);
  inodoro(k, pieza(s, 0.5, -6, '+z'));
  lavatorio(k, pieza(s, 8.1, -2.5, '-x'), 3.4);
  pieza(s, 7.6, 3, '-x').modelo('washerDryerStacked', 0, 0, { alto: 5.2, atras: -0.9 });
  P.d(2.2, 3, -6.72, 3.8, 3.1, -6.6, '#c9ced3');
  P.d(2.3, 1.6, -6.7, 3.7, 3, -6.6, '#90caf9');
  planta(k, P, -7.7, 5.7);
}

// ---------- Piso 1 ----------

function dormitorio1(k, s) {
  const P = pieza(s, 0, 0, '+z');
  alfombra(s, -8, -4.2, 0.5, 4.2, '#d8cbb8');
  cama(k, pieza(s, -5.95, 0, '+x'), 4.4, 4.6, '#3f5873', '#c9a227');
  mesaLuz(k, pieza(s, -7.9, 3.2, '+x'), 0, 0);
  mesaLuz(k, pieza(s, -7.9, -3.2, '+x'), 0, 0);
  pintura(k, pieza(s, -8.62, 0, '+x'), 'cafe_noche.jpg', 0, 5.8, 0, 2.6);
  tele(k, pieza(s, 8.1, 0, '-x'), 5);
  sofa(k, pieza(s, 3.8, 5.3, '-z'), 2.8, '#c9b8a0');
  placard(k, pieza(s, -5.2, 6, '-z'), 5);
  planta(k, P, 7.7, -5.7);
  lamparaPie(k, P, 6.2, 5.6);
}

function dormitorio2(k, s) {
  const P = pieza(s, 0, 0, '+z');
  alfombra(s, -6.5, -4, 6.5, 2, '#c5d5d3');
  cama(k, pieza(s, -3.6, -4.35, '+z'), 2.6, 4.4, '#7a9e9f');
  cama(k, pieza(s, 3.6, -4.35, '+z'), 2.6, 4.4, '#7a9e9f');
  mesaLuz(k, pieza(s, 0, -6, '+z'), 0, 0);
  pintura(k, pieza(s, 0, -6.68, '+z'), 'grande_jatte.jpg', 0, 5.3, 0, 2.2);
  placard(k, pieza(s, 8, 1.5, '-x'), 4.5);
  escritorio(k, pieza(s, -7.8, 2.5, '+x'), 3, '#4fc3f7');
  planta(k, P, -7.7, 5.6);
}

function salaGamer(k, s) {
  // Escritorio con tres monitores y silla gamer.
  const P = pieza(s, 5.4, -6, '+z');
  P.modelo('desk', 0, 0, { ancho: 5.2, atras: -0.6 });
  const alto = P.medida('desk', { ancho: 5.2 }).y;
  [-1.6, 0, 1.6].forEach((u, i) => {
    P.modelo('computerScreen', u, 0, { atras: -0.5, y: alto, solido: false, rot: -u * 0.12 });
    P.d(u - 0.75, alto + 0.45, 0.06, u + 0.75, alto + 1.4, 0.08, brillo(k, ['#00e5ff', '#ff4081', '#76ff03'][i]));
  });
  P.modelo('computerKeyboard', 0, 0.6, { y: alto, solido: false });
  P.modelo('chairDesk', 0, 2.4, { rot: Math.PI, tela: '#e53935' });
  s.b(7.6, 1.5, 3.3, 7.9, 4.5, 6.6, '#111111');
  s.d(7.55, 1.7, 3.5, 7.6, 4.3, 6.4, brillo(k, '#7c4dff'));
  sofa(k, pieza(s, 1.4, 4.9, '+x'), 3.4, '#3949ab');
  s.modelo('loungeChair', -1, 0, 0.6, Math.PI / 2, { tela: '#ff4081' });
  s.modelo('loungeChair', -1, 0, -2.6, Math.PI / 2, { tela: '#00bcd4' });
  s.d(-8, 7.1, -6.6, 8, 7.3, -6.4, brillo(k, '#ff00ff'));
  s.d(-8, 7.1, 6.4, 8, 7.3, 6.6, brillo(k, '#00e5ff'));
  alfombra(s, -3, -3, 4, 2.5, '#263238');
}

function banio1(k, s) {
  const P = pieza(s, 0, 0, '+z');
  alfombra(s, -8.7, -6.75, 8.7, 6.75, k.tex('baldosa', '#ece7e1', 1.5));
  banera(k, pieza(s, -4, -5.4, '+z'), 5.5);
  inodoro(k, pieza(s, 3.2, -6, '+z'));
  lavatorio(k, pieza(s, 8.1, 0, '-x'), 5);
  P.d(-8.66, 3, 0, -8.6, 3.1, 2.5, '#c9ced3');
  P.d(-8.6, 1.4, 0.2, -8.5, 3, 2.3, '#ff8a80');
  P.modelo('stoolBar', -1.4, 2.1, { tela: '#e9e2d6' });
  planta(k, P, -7.7, 5.7);
  planta(k, P, 7.7, 5.7, 2.4);
}

// ---------- Piso 2 ----------

function dormitorioPrincipal(k, s) {
  const P = pieza(s, 0, 0, '+z');
  alfombra(s, -8, -4.6, 1, 4.6, '#cdbfae');
  cama(k, pieza(s, -5.85, 0, '+x'), 5, 5, '#efe7da');
  mesaLuz(k, pieza(s, -7.9, 3.6, '+x'), 0, 0);
  mesaLuz(k, pieza(s, -7.9, -3.6, '+x'), 0, 0);
  pintura(k, pieza(s, -8.62, 0, '+x'), 'grande_jatte.jpg', 0, 5.9, 0, 2.4);
  pieza(s, -1.2, 0, '+x').modelo('loungeSofaOttoman', 0, 0, { ancho: 3.8, fondo: 1.6, alto: 1.3, tela: '#8e6c4a' });
  tele(k, pieza(s, 8.1, 0, '-x'), 5.4);
  sofa(k, pieza(s, 3.6, 5.3, '-z'), 2.6, '#8e6c4a');
  placard(k, pieza(s, -5.2, 6, '-z'), 5);
  planta(k, P, 7.7, -5.7);
  lamparaPie(k, P, 6.4, 5.6);
}

function gimnasio(k, s) {
  s.d(-8, 0, -6.6, 8, 0.06, 3, '#263238');
  s.b(-8, 0, -6.4, -5, 1, -2.4, '#333333');
  s.d(-7.8, 0.9, -6.2, -5.2, 1.02, -2.6, '#616161');
  s.b(-8, 1, -6.6, -7.6, 3.5, -2.2, '#9e9e9e');
  s.b(0, 0, -5.4, 4, 1.2, -4.2, '#212121');
  s.d(-0.5, 2.6, -6.2, 4.5, 2.75, -6, '#bdbdbd');
  [-0.4, 4.4].forEach((x) => s.cil(0.8, 0.4, '#424242', x, 2.6, -6.1, 12).rotation.z = Math.PI / 2);
  s.b(0.3, 0, -6.6, 0.6, 2.7, -6.2, '#9e9e9e');
  s.b(3.4, 0, -6.6, 3.7, 2.7, -6.2, '#9e9e9e');
  s.b(5, 0, -6.6, 7.8, 2, -5.6, '#555555');
  [5.5, 6.4, 7.3].forEach((x) => s.d(x - 0.3, 2, -6.3, x + 0.3, 2.4, -5.9, '#e53935'));
  s.cil(0.75, 3, '#c62828', 5.5, 2.8, 1, 10);
  s.d(5.45, 5.8, 0.95, 5.55, 7.6, 1.05, '#757575');
  s.cartel('VECIBANDA FIT', 6, 1.2, -1, 5.5, -6.55, 0, '#ffeb3b', '#212121');
}

function cine(k, s) {
  s.d(-8, 0, -6.6, 8, 0.06, 6.6, '#311b92');
  s.b(7.6, 1, -6, 7.95, 6.8, 6, '#000000');
  s.d(7.55, 1.3, -5.7, 7.6, 6.5, 5.7, brillo(k, '#e3f2fd'));
  // Butacas reclinables mirando a la pantalla; la fila de atrás, sobre una tarima.
  s.b(-4.2, 0, -6, -0.6, 0.5, 4.5, '#4a148c');
  [[2.5, 0], [-2.3, 0.5]].forEach(([x, y]) => {
    [-4, -1, 2].forEach((z) => s.modelo('loungeChairRelax', x, y, z, Math.PI / 2, { ancho: 2.2, tela: '#b71c1c' }));
  });
  s.b(-7.8, 0, -6.6, -6.4, 3, -5.2, '#d32f2f');
  s.d(-7.7, 3, -6.5, -6.5, 4.2, -5.3, '#fff9c4');
  [-6, -2, 2, 6].forEach((z) => s.d(-8, 6.9, z - 0.3, 8, 7.1, z + 0.3, brillo(k, '#ffd54f')));
}

function biblioteca(k, s) {
  const P = pieza(s, 0, 0, '+z');
  alfombra(s, -6, -4, 3, 4, '#8d6e63');
  estanteria(k, pieza(s, -6, -6.1, '+z'), 4.4);
  estanteria(k, pieza(s, 6, -6.1, '+z'), 4.4);
  const mesa = pieza(s, -1.5, 0, '+z');
  mesa.modelo('table', 0, 0, { ancho: 4.4, fondo: 2.4, alto: 2.1 });
  mesa.modelo('books', -0.8, 0, { y: 2.1, solido: false, escala: 1.4 });
  mesa.modelo('lampRoundTable', 1.4, -0.4, { y: 2.1, solido: false });
  mesa.modelo('chairCushion', 0, 1.9, { rot: Math.PI, tela: '#7b4a35' });
  mesa.modelo('chairCushion', 0, -1.9, { tela: '#7b4a35' });
  s.esf(0.7, '#42a5f5', -3.3, 2.8, -0.4);
  sofa(k, pieza(s, 6.4, 3, '-x'), 2.8, '#7b4a35');
  lamparaPie(k, P, 7.6, 5.5);
  planta(k, P, -7.8, 5.6);
  pintura(k, pieza(s, 8.62, 0, '-x'), 'ronda_nocturna.jpg', -2, 5, 0, 2.6);
}

// ---------- Piso 3 ----------

function salonFiestas(k, s) {
  const colores = ['#ff1744', '#00e5ff', '#76ff03', '#ffea00'];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      s.d(-5 + i * 2.6, 0, -5 + j * 2.6, -5 + i * 2.6 + 2.5, 0.08, -5 + j * 2.6 + 2.5, brillo(k, colores[(i + j) % 4]));
    }
  }
  const bola = s.esf(1, '#cfd8dc', 0, 5.5, 0);
  bola.userData.girar = 1.5;
  s.d(-0.05, 6.5, -0.05, 0.05, 7.6, 0.05, '#757575');
  s.b(-8, 0, -3, -6.2, 2.4, 3, '#212121');
  s.cil(0.6, 0.15, '#424242', -7.1, 2.4, -1.2, 16);
  s.cil(0.6, 0.15, '#424242', -7.1, 2.4, 1.2, 16);
  [-5, 6].forEach((z) => s.modelo('speaker', -7.4, 0, z, Math.PI / 2, { alto: 4.8 }));
  colores.forEach((c, i) => s.d(-6 + i * 4, 7.2, -6.6, -4.5 + i * 4, 7.6, -6.2, brillo(k, c)));
  s.cartel('FIESTA VECIBANDA', 7, 1.4, 1, 5.2, -6.55, 0, '#ff4081', '#1a0033');
}

function estudioMusica(k, s) {
  s.d(-8, 0, -6.6, 8, 0.06, 3, '#3e2723');
  const bombo = s.cil(1.1, 1, '#d32f2f', -5, 1.1, -4, 16);
  bombo.rotation.x = Math.PI / 2;
  s.cil(0.6, 0.5, '#eeeeee', -6.4, 1.4, -2.8, 12);
  s.cil(0.6, 0.5, '#eeeeee', -3.6, 1.4, -2.8, 12);
  s.cil(0.8, 0.06, '#ffd54f', -6.8, 3, -5, 16);
  s.cil(0.8, 0.06, '#ffd54f', -3.2, 3, -5, 16);
  s.b(-5.3, 0, -1.8, -4.7, 1.2, -1.2, '#424242');
  s.modelo('speaker', 2.4, 0, -5.9, 0, { alto: 3.4 });
  s.modelo('speaker', 3.9, 0, -5.9, 0, { alto: 3.4 });
  s.b(5, 0, -6.6, 6.6, 2, -5.4, '#212121');
  [[5.5, '#ff7043'], [7.2, '#29b6f6']].forEach(([x, c]) => {
    s.d(x - 0.6, 2, -6.62, x + 0.6, 3.6, -6.5, c);
    s.d(x - 0.12, 3.6, -6.62, x + 0.12, 5.6, -6.5, '#5d4037');
  });
  s.b(0.4, 0, 1, 0.6, 4.5, 1.2, '#9e9e9e');
  s.esf(0.3, '#212121', 0.5, 4.7, 1.1);
  [-6, -2, 2, 6].forEach((x, i) => s.d(x - 1.2, 2, 6.55, x + 1.2, 5, 6.6, ['#7e57c2', '#26a69a', '#ef5350', '#ffca28'][i]));
}

function bar(k, s) {
  s.b(2.8, 0, -6.6, 7.9, 2.4, -4.6, '#6d4c41');
  s.d(2.6, 2.4, -6.7, 8, 2.6, -4.4, '#3e2723');
  s.b(6.2, 0, -4.6, 7.9, 2.4, 2, '#6d4c41');
  s.d(6, 2.4, -4.6, 8, 2.6, 2.2, '#3e2723');
  ['#ffca28', '#66bb6a', '#ef5350', '#42a5f5', '#ab47bc'].forEach((c, i) => {
    s.d(3 + i * 0.9, 3.4, -6.6, 3.4 + i * 0.9, 4.6, -6.3, c);
    s.d(3 + i * 0.9, 5, -6.6, 3.4 + i * 0.9, 6.2, -6.3, c);
  });
  s.d(2.8, 3.3, -6.7, 7.8, 3.4, -6.2, '#5d4037');
  s.d(2.8, 4.9, -6.7, 7.8, 5, -6.2, '#5d4037');
  [[3.6, -3.4, 0], [5.2, -3.4, 0], [5, 1, -Math.PI / 2], [5, -1.5, -Math.PI / 2]].forEach(([x, z, r]) => {
    s.modelo('stoolBar', x, 0, z, r + Math.PI, { tela: '#c62828' });
  });
  s.modelo('tableRound', -1, 0, 3, 0, { ancho: 2.6 });
  s.modelo('stoolBar', -2.8, 0, 3, 0, { tela: '#c62828' });
  s.modelo('stoolBar', 0.8, 0, 3, 0, { tela: '#c62828' });
  s.cartel('BAR VECIBANDA', 6, 1.3, -1, 5.5, -6.55, 0, '#00e5ff', '#0d0221');
  pintura(k, pieza(s, -8.62, 0, '+x'), 'cafe_noche.jpg', 0, 4.8, 0, 3);
}

function salaTrofeos(k, s) {
  s.d(-1, 0, -6.6, 1.5, 0.08, 6.6, '#c62828');
  [[-7, -5], [-7, -1], [-7, 3], [5.8, -5]].forEach(([x, z]) => {
    s.b(x - 1, 0, z - 1, x + 1, 2, z + 1, '#5d4037');
    s.b(x - 0.9, 2, z - 0.9, x + 0.9, 4.2, z + 0.9, k.vidrio);
    s.cil(0.35, 0.9, '#ffc928', x, 2.4, z, 10);
    s.d(x - 0.2, 2, z - 0.2, x + 0.2, 2.4, z + 0.2, '#ffb300');
  });
  s.b(3, 0, -1, 7, 0.8, 1, '#eeeeee');
  s.b(4.3, 0.8, -1, 5.7, 1.6, 1, '#eeeeee');
  s.cil(0.6, 1.4, '#ffd600', 5, 1.6, 0, 12);
  s.cil(0.25, 0.06, '#212121', -2, 4, -6.55, 16).rotation.x = Math.PI / 2;
  s.cartel('SALA DE TROFEOS', 6, 1.2, 3, 5.6, -6.55, 0, '#ffd54f', '#3e2723');
}

// ---------- Diseños nuevos ----------

// Cuarto de un integrante de la Vecibanda: su color, su retrato y su nombre.
function cuarto(k, s, p) {
  const P = pieza(s, 0, 0, '+z');
  alfombra(s, -7.6, -3.8, 1.2, 3.8, p.remera);
  cama(k, pieza(s, -6.05, 0, '+x'), 3.6, 4.6, p.remera);
  mesaLuz(k, pieza(s, -7.9, 2.9, '+x'), 0, 0);
  mesaLuz(k, pieza(s, -7.9, -2.9, '+x'), 0, 0);
  s.d(-8.68, 3.95, -1.55, -8.6, 7.05, 1.55, '#24282c');
  s.plano(k.retrato(p, 2.8, 2.8), -8.55, 5.5, 0, Math.PI / 2);
  escritorio(k, pieza(s, 4.2, 6, '-z'), 4, p.remera);
  placard(k, pieza(s, 8, -1.5, '-x'), 4.5);
  s.modelo('loungeChair', 4.6, 0, -3.4, -Math.PI / 2 - 0.4, { tela: p.remera });
  planta(k, P, -7.6, 5.7);
  P.modelo('coatRackStanding', 7.6, 5.8, { alto: 5 });
  s.cartel(`CUARTO DE ${p.nombre.toUpperCase()}`, 7, 1.2, 0, 8.2, -6.7, 0, '#ffffff', p.remera);
  s.cartel('VECIBANDA', 4, 1, 4.2, 6.9, 6.7, Math.PI, '#ffd23f', '#212121');
}

function comedor(k, s) {
  const P = pieza(s, 0, 0, '+z');
  alfombra(s, -6.2, -3.8, 6.2, 3.8, '#b7a48e');
  P.modelo('table', 0, 0, { ancho: 9.6, fondo: 2.8, alto: 2.05 });
  P.cil(0.25, 0.9, '#e0ddd5', 0, 2.05, 0, 10);
  P.d(-0.15, 2.95, -0.15, 0.15, 3.6, 0.15, '#3d8b3d');
  for (const u of [-3.3, -1.1, 1.1, 3.3]) {
    silla(k, pieza(s, u, -2.1, '+z'));
    silla(k, pieza(s, u, 2.1, '-z'));
  }
  silla(k, pieza(s, -5.5, 0, '+x'));
  silla(k, pieza(s, 5.5, 0, '-x'));
  const ap = pieza(s, -8.1, 0, '+x');
  ap.modelo('cabinetTelevisionDoors', 0, 0, { ancho: 6, alto: 2.4, fondo: 1.1, atras: -0.55 });
  ap.cil(0.3, 1, '#4fc3f7', -1.8, 2.4, 0, 8);
  ap.cil(0.25, 1.4, '#ffffff', 1.8, 2.4, 0, 8);
  pintura(k, pieza(s, -8.62, 0, '+x'), 'ronda_nocturna.jpg', 0, 5.4, 0, 3);
  planta(k, P, 7.7, 5.7);
  planta(k, P, 7.7, -5.7);
}

function arcade(k, s) {
  s.d(-8, 0, -6.6, 8, 0.06, 3, '#1a237e');
  ['#e53935', '#43a047', '#1e88e5', '#fdd835'].forEach((c, i) => {
    const x = -6.3 + i * 3.1;
    s.b(x - 1, 0, -6.7, x + 1, 5, -5.2, c);
    s.d(x - 0.8, 3, -5.22, x + 0.8, 4.4, -5.18, brillo(k, ['#00e5ff', '#ff4081', '#76ff03', '#ffea00'][i]));
    s.d(x - 0.9, 2, -5.4, x + 0.9, 2.3, -4.8, '#212121');
  });
  s.b(-2, 0, -1.2, 2, 1.6, 1.2, '#1565c0');
  s.d(-1.9, 1.6, -1.1, 1.9, 1.65, 1.1, '#ffffff');
  s.b(6.2, 0, -2, 7.8, 2.2, 2, '#e91e63');
  s.d(6.25, 2.2, -1.9, 7.75, 2.25, 1.9, brillo(k, '#ff80ab'));
  s.b(-8.4, 0, 0, -6.4, 1.6, 2, '#ffeb3b');
  s.b(-8.4, 1.6, 0, -6.4, 4.6, 2, k.vidrio);
  s.b(-8.4, 4.6, 0, -6.4, 5, 2, '#ffeb3b');
  s.cartel('ARCADE', 5, 1.2, 0, 7, -6.7, 0, '#00e5ff', '#1a0033');
}

// Playroom: pelotero, tobogán, cama elástica, carpa y un oso gigante.
function playroom(k, s) {
  const colores = ['#ef5350', '#42a5f5', '#ffca28', '#66bb6a', '#ab47bc'];
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 5; j++) s.d(-8.7 + i * 2.9, 0, -6.75 + j * 2.7, -8.7 + (i + 1) * 2.9, 0.05, -6.75 + (j + 1) * 2.7, colores[(i + j) % 4]);
  }
  // Pelotero.
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
  // Tobogán con escalera.
  s.b(3.2, 0, 3, 5.2, 3, 5, '#ffca28');
  [[5.2, 2.25], [6, 1.5], [6.8, 0.75]].forEach(([x, h]) => s.b(x, 0, 3.3, x + 0.8, h, 4.7, '#ef5350'));
  const tobogan = s.d(-1.9, 1.55, 3.2, 3.8, 1.75, 4.8, '#ef5350');
  tobogan.rotation.z = 0.44;
  // Cama elástica.
  s.cil(1.8, 0.4, '#1565c0', 5.4, 0.3, -2, 16);
  s.cil(1.55, 0.06, '#212121', 5.4, 0.72, -2, 16);
  // Carpa.
  s.cono(1.7, 3.6, '#ffcc80', -6.2, 0, -3.2, 6);
  // Oso de peluche gigante.
  s.modelo('bear', 7, 0, 4.8, -Math.PI / 2 - 0.5, { alto: 4.2 });
  s.cartel('PLAYROOM', 5, 1.2, 0, 7.6, -6.7, 0, '#ffffff', '#ff7043');
}

function spa(k, s) {
  s.d(-8, 0, -6.6, 8, 0.06, 3, '#b2dfdb');
  // Sauna de madera con puerta.
  s.b(-8.6, 0, -6.7, -3, 6, -6.4, '#a1785c');
  s.b(-3.3, 0, -6.4, -3, 6, -3, '#a1785c');
  s.b(-8.6, 0, -1.8, -6, 6, -1.5, '#a1785c');
  s.b(-4.2, 0, -1.8, -3, 6, -1.5, '#a1785c');
  s.b(-8.6, 6, -6.7, -3, 6.3, -1.5, '#8d6e63');
  s.b(-8.3, 0, -6.3, -3.6, 1.4, -5, '#bcaaa4');
  // Hidromasaje.
  s.b(1, 0, -5.5, 7.6, 1.2, -5.1, '#ffffff');
  s.b(1, 0, -1.4, 7.6, 1.2, -1, '#ffffff');
  s.b(1, 0, -5.1, 1.4, 1.2, -1.4, '#ffffff');
  s.b(7.2, 0, -5.1, 7.6, 1.2, -1.4, '#ffffff');
  s.d(1.4, 0.2, -5.1, 7.2, 1, -1.4, k.agua);
  [-1.8, 1.8].forEach((x) => s.modelo('loungeChairRelax', x, 0, 3.2, Math.PI, { ancho: 2.4, tela: '#f3f1ec' }));
  [[7, 2.5], [-7.5, 2.5]].forEach(([x, z]) => s.modelo('pottedPlant', x, 0, z, 0, { alto: 3.4 }));
  s.cartel('SPA', 3, 1.1, 4.3, 6.6, -6.7, 0, '#ffffff', '#00897b');
}

function karaoke(k, s) {
  s.d(-8, 0, -6.6, 8, 0.06, 6.6, '#311b92');
  s.b(-8.6, 0, -4, -4.5, 0.6, 4, '#4a148c');
  s.b(-6.6, 0.6, -0.1, -6.4, 4.5, 0.1, '#9e9e9e');
  s.esf(0.3, '#212121', -6.5, 4.7, 0);
  s.b(-8.66, 2.5, -3.5, -8.6, 7.5, 3.5, '#111111');
  s.d(-8.6, 2.7, -3.3, -8.56, 7.3, 3.3, brillo(k, '#e1bee7'));
  [-3, 3].forEach((z) => s.modelo('speaker', -7.9, 0.6, z, Math.PI / 2, { alto: 3.6 }));
  sofa(k, pieza(s, 4, 0, '-x'), 7, '#d81b60');
  s.modelo('tableCoffeeGlass', 1.2, 0, 0, Math.PI / 2, { ancho: 3, fondo: 1.6, alto: 1.1 });
  ['#ff1744', '#00e5ff', '#76ff03', '#ffea00'].forEach((c, i) => s.d(-6 + i * 4, 9.2, -0.4, -5 + i * 4, 9.5, 0.4, brillo(k, c)));
  s.cartel('KARAOKE', 5, 1.2, 0, 7.6, -6.7, 0, '#ff4081', '#1a0033');
}

function streaming(k, s) {
  alfombra(s, -3, -2, 5, 4, '#263238');
  const P = pieza(s, 3.8, 4.3, '-z');
  P.modelo('desk', 0, 0, { ancho: 5.6, atras: -0.7 });
  const alto = P.medida('desk', { ancho: 5.6 }).y;
  [-1.2, 1.2].forEach((u, i) => {
    P.modelo('computerScreen', u, 0, { atras: -0.6, y: alto, solido: false });
    P.d(u - 0.75, alto + 0.45, -0.04, u + 0.75, alto + 1.4, -0.02, brillo(k, i ? '#7c4dff' : '#00e5ff'));
  });
  P.modelo('computerKeyboard', 0, 0.4, { y: alto, solido: false });
  P.modelo('chairDesk', 0, 2.2, { rot: Math.PI, tela: '#e53935' });
  s.b(0.4, 0, 2, 0.6, 3.8, 2.2, '#9e9e9e');
  s.cil(0.8, 0.12, '#fffde7', 0.5, 4.2, 2.1, 20).rotation.x = Math.PI / 2;
  s.d(8.6, 0, -4, 8.66, 7, 3, '#00c853');
  s.cartel('EN VIVO', 4, 1.2, 0, 7.6, -6.7, 0, '#ffffff', '#d50000');
  s.cartel('VECIBANDA TV', 5, 1, -8.65, 5.5, 0, Math.PI / 2, '#ffd23f', '#212121');
}

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

// Arma los muebles del diseño en la habitación `lugar` del piso `piso`.
export function amueblar(k, g, diseno, lugar, piso, extra) {
  const [nativo, fn] = DISENOS[diseno];
  fn(k, sala(k, g, lugar, piso, nativo), extra);
  const [cx, cz] = LUGARES[lugar];
  colgante(k, g, cx, nivel(piso) + ALTO_PISO - LOSA, cz);
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
