import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Zapatillas de las tiendas armadas en 3D (no son fotos): suela, capellada con su perfil de
// costado, puntera, talonera, cuello, cordones y los detalles de cada modelo (swoosh, rayas,
// columnas Shox, burbujas de aire, tapones...). Cada una se arma una sola vez y se reusa.
//
// Marco del pie: punta hacia +z, ancho 1 (x de -0.5 a 0.5), largo 1.7, apoya en y = 0.
// personaje.js la escala al grosor de la pierna.
export const LARGO = 1.7;
const H = LARGO / 2;

// ---------- Formas ----------
// Perfil de costado de la capellada como polígono (z, y), desde la base del talón, en sentido
// antihorario. alto: { punta, empeine, cuello }.
function perfil({ punta, empeine, cuello }) {
  const p = [];
  const curva = (a, c, b, n = 5) => {
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const u = 1 - t;
      p.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
    }
  };
  p.push([-H, 0], [H - 0.14, 0]);
  curva([H - 0.14, 0], [H, 0], [H, 0.13]);
  curva([H, 0.13], [H, punta], [H - 0.3, punta]);
  p.push([0.12, empeine], [-0.12, cuello]);
  p.push([-H + 0.16, cuello * 0.98]);
  curva([-H + 0.16, cuello * 0.98], [-H - 0.02, cuello * 0.95], [-H, cuello * 0.72]);
  return p;
}

// Recorta un polígono a una franja (Sutherland–Hodgman), para las piezas superpuestas.
function recortar(poli, { z0 = -9, z1 = 9, y0 = -9, y1 = 9 }) {
  const planos = [[(q) => q[0] - z0, 0], [(q) => z1 - q[0], 0], [(q) => q[1] - y0, 1], [(q) => y1 - q[1], 1]];
  let out = poli;
  for (const [f] of planos) {
    const ent = out;
    out = [];
    for (let i = 0; i < ent.length; i++) {
      const a = ent[i];
      const b = ent[(i + 1) % ent.length];
      const fa = f(a);
      const fb = f(b);
      if (fa >= 0) out.push(a);
      if ((fa >= 0) !== (fb >= 0)) {
        const t = fa / (fa - fb);
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
    }
    if (!out.length) break;
  }
  return out;
}

// Extruye un polígono de costado a lo ancho (x), centrado. bisel: bordes redondeados.
function extruir(poli, ancho, bisel = 0) {
  const s = new THREE.Shape(poli.map(([z, y]) => new THREE.Vector2(z, y)));
  const g = new THREE.ExtrudeGeometry(s, {
    depth: Math.max(0.001, ancho - 2 * bisel), bevelEnabled: bisel > 0, bevelThickness: bisel, bevelSize: bisel * 0.6,
    bevelSegments: 2, curveSegments: 6,
  });
  g.rotateY(-Math.PI / 2);
  g.translate((ancho - 2 * bisel) / 2, 0, 0);
  // Los costados van aparte, en tiras finitas a lo largo: las tapas de la extrusión son pocos
  // triángulos grandes y, al angostar la punta y el talón (afinar), se hundían en el medio y por
  // ahí asomaba el pantalón (sobre todo en las Balvin).
  const tapas = [-1, 1].map((lado) => tapa(poli, lado * (ancho / 2 + 0.002), lado));
  const todo = mergeGeometries([g, ...tapas]);
  todo.userData.extruida = true;
  return todo;
}

// Tapa plana de un costado (en x), hecha de tiras verticales: en cada z va del punto más bajo
// al más alto del perfil (si el perfil no tiene curvas para adentro).
function tapa(poli, x, lado, n = 30) {
  const z0 = Math.min(...poli.map((q) => q[0]));
  const z1 = Math.max(...poli.map((q) => q[0]));
  const corte = (z) => {
    let lo = Infinity;
    let hi = -Infinity;
    let cruces = 0;
    for (let i = 0; i < poli.length; i++) {
      const [az, ay] = poli[i];
      const [bz, by] = poli[(i + 1) % poli.length];
      if ((z < Math.min(az, bz)) || (z > Math.max(az, bz)) || az === bz) continue;
      const y = ay + ((by - ay) * (z - az)) / (bz - az);
      lo = Math.min(lo, y);
      hi = Math.max(hi, y);
      cruces++;
    }
    if (cruces > 2) concava = true;
    return lo <= hi ? [lo, hi] : [0, 0];
  };
  let concava = false;
  const pos = [];
  const uv = [];
  const punto = (z, y) => { pos.push(x, y, z); uv.push(z, y); };
  for (let i = 0; i < n; i++) {
    const za = z0 + ((z1 - z0) * i) / n;
    const zb = z0 + ((z1 - z0) * (i + 1)) / n;
    const e = (z1 - z0) * 1e-4; // el corte, apenas adentro (justo en un vértice da cualquier cosa)
    const [a0, a1] = corte(za + e);
    const [b0, b1] = corte(zb - e);
    // Mirando desde afuera (normal = lado en x), en sentido antihorario.
    const quad = lado > 0 ? [[za, a0], [za, a1], [zb, b1], [zb, b0]] : [[za, a0], [zb, b0], [zb, b1], [za, a1]];
    for (const k of [0, 1, 2, 0, 2, 3]) punto(...quad[k]);
  }
  if (concava) {
    // Formas con curvas para adentro (el swoosh, las ondas): triangulada, que ahí no se afina.
    const t = new THREE.ShapeGeometry(new THREE.Shape(poli.map(([z, y]) => new THREE.Vector2(lado > 0 ? -z : z, y)))).toNonIndexed();
    t.rotateY((lado * Math.PI) / 2);
    t.translate(x, 0, 0);
    return t;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

// Vista de arriba: la punta se angosta y el talón se redondea un poco (no es un ladrillo).
function afinar(g) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const z = p.getZ(i);
    const t = THREE.MathUtils.clamp((z - (H - 0.5)) / 0.5, 0, 1);
    const u = THREE.MathUtils.clamp((-H + 0.3 - z) / 0.3, 0, 1);
    p.setX(i, p.getX(i) * (1 - 0.24 * t * t) * (1 - 0.12 * u * u));
  }
  g.computeVertexNormals();
  return g;
}

// Agranda un poco una pieza superpuesta (alrededor de la base) para que quede encima.
const encima = (poli, k = 1.012) => poli.map(([z, y]) => [z * k, y * k + 0.002]);

// La pipa de Nike con curvas: la puntita de adelante para arriba, la panza redonda abajo y la
// cola larga y finita que sube hacia el talón. Borde de abajo y de arriba con Bézier cúbicas.
function bezier(a, b, c, d, n) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push([
      u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
      u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1],
    ]);
  }
  return out;
}
// Calcada del logo (en píxeles de un logo de 480 x 100: el gancho arriba a la izquierda, la
// panza gorda abajo y la cola larga casi recta hacia arriba a la derecha). En la zapatilla
// va espejada: el gancho hacia la punta y la cola hacia el talón, como en las de verdad.
const LOGO = [
  ...bezier([75, 5], [28, 42], [38, 104], [112, 97], 10), // gancho -> panza (borde de afuera)
  ...bezier([112, 97], [210, 88], [380, 32], [472, 4], 14).slice(1), // panza -> punta de la cola
  ...bezier([472, 4], [360, 36], [190, 74], [118, 74], 12).slice(1), // borde de arriba de la cola
  ...bezier([118, 74], [78, 74], [64, 40], [75, 5], 8).slice(1, -1), // adentro del gancho
];
const SWOOSH = LOGO.map(([x, y]) => [0.43 - (x / 480) * 1.08, 0.1 + ((100 - y) / 100) * 0.26]);

function ondas(z0, z1, y, alto, n) {
  // Línea ondulada (como las del TN) de grosor `alto`.
  const arriba = [];
  const abajo = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const z = z0 + (z1 - z0) * t;
    const yy = y + Math.sin(t * Math.PI * n) * 0.06;
    arriba.push([z, yy + alto / 2]);
    abajo.push([z, yy - alto / 2]);
  }
  return [...abajo, ...arriba.reverse()];
}

// ---------- Texturas chicas ----------
function lienzo(w, h, dibujar) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  dibujar(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
// Estampado "elefante" de las Jordan 3: gris claro con grietas.
const texElefante = () => lienzo(128, 128, (g, w, h) => {
  g.fillStyle = '#d9d3c5';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = '#8f887a';
  g.lineWidth = 2;
  let s = 7;
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 40; i++) {
    g.beginPath();
    let x = r() * w;
    let y = r() * h;
    g.moveTo(x, y);
    for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 30; y += (r() - 0.5) * 30; g.lineTo(x, y); }
    g.stroke();
  }
});
// Degradé atardecer del talón de la J Balvin.
const texAtardecer = () => lienzo(64, 8, (g, w, h) => {
  const d = g.createLinearGradient(0, 0, w, 0);
  d.addColorStop(0, '#3a2a5c');
  d.addColorStop(0.3, '#e8355b');
  d.addColorStop(0.6, '#ff7b2e');
  d.addColorStop(1, '#f6c21b');
  g.fillStyle = d;
  g.fillRect(0, 0, w, h);
});
// Malla (Shox TL, TN): trama oscura.
const texMalla = (base, hilo) => lienzo(64, 64, (g, w, h) => {
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  g.fillStyle = hilo;
  for (let y = 0; y < h; y += 6) for (let x = (y / 6) % 2 ? 3 : 0; x < w; x += 6) g.fillRect(x, y, 3, 3);
});

// ---------- Materiales ----------
const mats = new Map();
function mat(c, brillo = 0) {
  const k = `${typeof c === 'string' ? c : c.uuid}|${brillo}`;
  if (!mats.has(k)) {
    const o = typeof c === 'string' ? { color: c } : { map: c };
    mats.set(k, brillo ? new THREE.MeshPhongMaterial({ ...o, shininess: brillo, specular: '#666666' }) : new THREE.MeshLambertMaterial(o));
  }
  return mats.get(k);
}

// ---------- Armado ----------
// Suela de dos capas (entresuela y suela), con la punta redondeada. Devuelve la altura.
function suela(g, entre, abajo, altoEntre = 0.13, altoAbajo = 0.05, ancho = 1.1) {
  const forma = (y0, y1) => [[-H - 0.03, y0], [H - 0.05, y0], [H + 0.04, (y0 + y1) / 2 + 0.01], [H - 0.02, y1], [-H - 0.03, y1]];
  g.add(new THREE.Mesh(extruir(forma(0, altoAbajo), ancho), mat(abajo)));
  g.add(new THREE.Mesh(extruir(forma(altoAbajo, altoAbajo + altoEntre), ancho - 0.02), mat(entre)));
  return altoAbajo + altoEntre;
}

function cordones(g, base, alto, color, n = 5) {
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const z = 0.12 + (H - 0.3 - 0.12) * t;
    const y = base + alto.empeine + (alto.punta - alto.empeine) * t + 0.035;
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.03, 0.06), mat(color));
    c.position.set(0, y - 0.01, z);
    c.rotation.x = Math.atan2(alto.empeine - alto.punta, H - 0.42);
    g.add(c);
  }
}

// Una pieza a los dos costados (swoosh, rayas, ondas), pegada a la capellada.
function costados(g, poli, color, base, brillo = 0, grosor = 0.02) {
  for (const lado of [-1, 1]) {
    // El corrimiento va en la geometría: así al angostar la punta la pieza sigue pegada.
    const m = new THREE.Mesh(extruir(poli, grosor).translate(lado * (0.5 + 0.03 + grosor / 2), 0, 0), mat(color, brillo));
    m.position.y = base;
    g.add(m);
  }
}

function capellada(g, base, alto, color, brillo = 0) {
  const poli = perfil(alto);
  const m = new THREE.Mesh(extruir(poli, 1, 0.06), mat(color, brillo));
  m.position.y = base;
  g.add(m);
  return poli;
}

// Cada pieza nueva un pelito más ancha que la anterior: si se superponen, la de arriba gana
// (si no, los costados titilan).
let capa = 0;
function pieza(g, poli, recorte, base, color, brillo = 0, ancho = 1.04) {
  const p = recortar(encima(poli), recorte);
  if (p.length < 3) return;
  const m = new THREE.Mesh(extruir(p, ancho + 0.01 * capa++, 0.06), mat(color, brillo));
  m.position.y = base;
  g.add(m);
}

const MODELOS = {
  // Jordan 1 Mid "Bred" de charol: blanca, puntera y talón rojos, negro arriba, swoosh rojo.
  jordan1(g) {
    const alto = { punta: 0.3, empeine: 0.55, cuello: 0.98 };
    const b = suela(g, '#f4f4f4', '#c4161c', 0.12, 0.05);
    const poli = capellada(g, b, alto, '#f6f6f6');
    pieza(g, poli, { z0: 0.38 }, b, '#121212', 70); // puntera negra
    pieza(g, poli, { z0: 0.5, y0: 0.16 }, b, '#c8151d', 90); // punta roja de charol
    pieza(g, poli, { z1: -0.42 }, b, '#c8151d', 90); // talón rojo
    pieza(g, poli, { y0: 0.72 }, b, '#141414', 60); // cuello negro
    pieza(g, poli, { z0: -0.05, z1: 0.52, y0: 0.3 }, b, '#141414', 60); // ojalillos y lengüeta
    costados(g, SWOOSH.map(([z, y]) => [z * 0.95 + 0.02, y * 0.95 + 0.04]), '#c8151d', b, 80);
    cordones(g, b, alto, '#151515');
  },
  // Jordan 3 x J Balvin: crema, estampado elefante en la punta y el talón, atardecer atrás.
  jordanbalvin(g) {
    const alto = { punta: 0.3, empeine: 0.55, cuello: 0.88 };
    const b = suela(g, '#efe6cf', '#e2d6b6', 0.14, 0.05);
    const poli = capellada(g, b, alto, '#ece3cc');
    const ele = texElefante();
    ele.repeat.set(3, 3);
    pieza(g, poli, { z0: 0.42, y1: 0.24 }, b, ele);
    pieza(g, poli, { z1: -0.45, y1: 0.42 }, b, ele);
    const sol = texAtardecer();
    sol.repeat.set(1 / 0.75, 1);
    sol.offset.set(H / 0.75, 0);
    const talon = new THREE.Mesh(extruir([[-H - 0.035, 0.03], [-H + 0.72, 0.03], [-H + 0.72, 0.19], [-H - 0.035, 0.19]], 1.12), mat(sol));
    g.add(talon);
    costados(g, [[-0.05, 0.12], [0.25, 0.12], [0.25, 0.2], [-0.05, 0.2]], '#f6c21b', 0.02, 60, 0.03); // ventana de aire
    cordones(g, b, alto, '#efe6cf');
    for (let i = 0; i < 4; i++) costados(g, [[0.15 + i * 0.1, 0.5 - i * 0.05], [0.19 + i * 0.1, 0.5 - i * 0.05], [0.19 + i * 0.1, 0.54 - i * 0.05], [0.15 + i * 0.1, 0.54 - i * 0.05]], '#e8a21a', b);
  },
  // Nike Shox TL: malla negra y columnas plateadas en todo el largo.
  nikeshox(g) {
    const alto = { punta: 0.3, empeine: 0.5, cuello: 0.62 };
    const b = shox(g, 6, '#1a1a1c');
    const poli = capellada(g, b, alto, texMalla('#18181a', '#2c2c30'));
    pieza(g, poli, { z1: -0.35 }, b, '#2b2d31', 60);
    pieza(g, poli, { z0: 0.52, y1: 0.18 }, b, '#2b2d31', 60);
    costados(g, SWOOSH.map(([z, y]) => [z * 0.7 + 0.08, y * 0.7 + 0.12]), '#d6d8dc', b, 100);
    cordones(g, b, alto, '#202022');
  },
  // Nike Shox R4: costados plateados, punta y arriba negros, cuatro columnas en el talón.
  nikeshoxr4(g) {
    const alto = { punta: 0.3, empeine: 0.52, cuello: 0.66 };
    const b = shox(g, 2, '#1a1a1c');
    const poli = capellada(g, b, alto, '#16161a');
    pieza(g, poli, { z0: -0.75, z1: 0.6, y1: 0.42 }, b, '#c3c6cb', 110);
    costados(g, SWOOSH.map(([z, y]) => [z * 0.75 + 0.05, y * 0.75 + 0.06]), '#111111', b, 60);
    cordones(g, b, alto, '#141414');
  },
  // Nike Air Max Plus (TN) negras: ondas en los costados y burbujas de aire.
  niketn(g) {
    const alto = { punta: 0.3, empeine: 0.52, cuello: 0.68 };
    const b = suela(g, '#151517', '#0e0e10', 0.17, 0.05);
    const poli = capellada(g, b, alto, texMalla('#141416', '#232327'));
    for (let i = 0; i < 3; i++) costados(g, ondas(-0.7, 0.45, 0.18 + i * 0.13, 0.035, 2.5), '#2c2c30', b, 90);
    costados(g, SWOOSH.map(([z, y]) => [z * 0.45 + 0.25, y * 0.45 + 0.1]), '#2a2a2e', b, 60);
    // Burbujas: talón y punta, azuladas.
    for (const [z, l] of [[-0.55, 0.32], [0.45, 0.22]]) costados(g, [[z - l / 2, 0.08], [z + l / 2, 0.08], [z + l / 2, 0.18], [z - l / 2, 0.18]], '#3d5a8a', 0, 120, 0.03);
    pieza(g, poli, { z1: -0.4 }, b, '#1d1d20', 80);
    cordones(g, b, alto, '#141414');
  },
  // Botines Adidas F50: negros, bajos, tres rayas plateadas y tapones dorados.
  f50(g) {
    const alto = { punta: 0.24, empeine: 0.42, cuello: 0.55 };
    const b = suela(g, '#1c1c1e', '#2a2520', 0.06, 0.04, 1.02);
    const poli = capellada(g, b, alto, '#18181a', 50);
    pieza(g, poli, { z1: -0.5 }, b, '#232326', 50);
    for (let i = 0; i < 3; i++) {
      const z = -0.32 + i * 0.13;
      costados(g, [[z, 0.06], [z + 0.06, 0.06], [z + 0.2, 0.36], [z + 0.14, 0.36]], '#c9ccd1', b, 100);
    }
    cordones(g, b, alto, '#141414');
    for (const [z, x] of [[-0.6, -0.25], [-0.6, 0.25], [-0.35, 0], [0.05, -0.28], [0.05, 0.28], [0.35, -0.25], [0.35, 0.25], [0.6, 0], [0.62, -0.2], [0.62, 0.2]]) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.065, 0.09, 6), mat('#c8a24a', 80));
      t.position.set(x, -0.045, z);
      g.add(t);
    }
  },
};

// Suela Shox: placa arriba, columnas plateadas y suela abajo. columnas: por fila (en el talón
// si son 2; en todo el largo si son más). Devuelve la altura.
function shox(g, columnas, color) {
  const abajo = new THREE.Mesh(extruir([[-H - 0.02, 0], [H - 0.05, 0], [H + 0.03, 0.04], [H - 0.02, 0.07], [-H - 0.02, 0.07]], 1.08), mat('#2a2a2c'));
  g.add(abajo);
  const placa = new THREE.Mesh(extruir([[-H - 0.03, 0.25], [H - 0.04, 0.25], [H + 0.03, 0.29], [H - 0.02, 0.33], [-H - 0.03, 0.33]], 1.08), mat(color));
  g.add(placa);
  const cil = new THREE.CylinderGeometry(0.085, 0.085, 0.19, 10);
  const plata = mat('#d4d7dc', 120);
  const zs = columnas > 2 ? Array.from({ length: columnas }, (_, i) => -H + 0.15 + (i * (LARGO - 0.32)) / (columnas - 1)) : [-H + 0.16, -H + 0.42];
  for (const z of zs) for (const x of [-0.3, 0.3]) {
    const c = new THREE.Mesh(cil, plata);
    c.position.set(x, 0.165, z);
    g.add(c);
  }
  if (columnas <= 2) {
    // Adelante, suela llena.
    const lleno = new THREE.Mesh(extruir([[-H + 0.6, 0.07], [H - 0.05, 0.07], [H + 0.02, 0.16], [H - 0.04, 0.25], [-H + 0.6, 0.25]], 1.04), mat('#3a3a3e'));
    g.add(lleno);
  }
  return 0.33;
}

const hechas = new Map();
// Grupo nuevo con la zapatilla (las geometrías y materiales se comparten entre todas las copias).
export function crearZapatilla(id) {
  if (!MODELOS[id]) return null;
  if (!hechas.has(id)) {
    const g = new THREE.Group();
    capa = 0;
    MODELOS[id](g);
    // Se angostan las piezas que van de lado a lado (suela, capellada, punteras).
    g.traverse((o) => { if (o.isMesh && o.position.x === 0 && o.geometry.userData.extruida) o.geometry = afinar(o.geometry); });
    hechas.set(id, g);
  }
  return hechas.get(id).clone();
}
