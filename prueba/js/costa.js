import * as THREE from 'three';
import { COSTA as CO, CALLE_Z, PLAYA as P } from './constantes.js';
import { Constructor, dibujarCara } from './ciudad.js';
import { crearPersonaje } from './personaje.js';
import { cargarCabeza, crearEtiqueta } from './texturas.js';
import { cargarAuto, AUTOS_POR_ID } from './auto.js';
import { texArena, texMojada, texEspuma, Y_AGUA } from './playa.js';
import { COMPRADORES, VENTAS_COMPRADORES } from '../data/compradores.js';
import { aleatorio } from './util.js';

// La costa (la habilita Nico Baraja, nico.js): la calle del barrio sigue hacia el este y, pasando
// la barrera, se abre en dos. El ramal recto sigue por abajo, por el barrio privado de la playa
// (garita, reja negra con pilares de piedra, un portón por casa): cuatro mansiones de lujo con
// arquitectura de casas modernas de verdad (la blanca en voladizo, la de piedra y madera, la de
// terrazas escalonadas y el pabellón de vidrio), cada una con pileta, palmeras, su auto en la
// entrada y timbre (sale el dueño, data/compradores.js). El otro ramal es un camino de cerro: sube
// de a poco dando la vuelta (se sube en auto) hasta la cima plana, donde está el galpón de tanzania
// (tanzania.js). El cerro es un terreno de verdad: laderas con pasto, roca a la vista del lado del
// mar, árboles, piedras, arbustos y faroles en el camino. El mar y las olas son los de playa.js.
//
// Liviano: se arma recién cuando te acercás con la costa abierta, todo lo quieto va en pocas mallas
// (Constructor: suelta la copia de JavaScript al subirse), lo que se repite (árboles, piedras) es
// instanciado y los autos son los del concesionario.
const M = CO.meseta;
const F = CO.falda;
const CALLE = { z0: CALLE_Z - 6, z1: CALLE_Z + 6 };
const MEDIO_CAMINO = 6.5;
export const PUERTA_Z = 86; // el frente de las mansiones (la puerta), hacia la calle
const REJA_Z = CALLE.z1 + 2.5; // la reja del barrio privado, al borde de la vereda
export const MANSIONES = [150, 360, 570, 780].map((x, i) => ({
  x: CO.playa.x0 + x, estilo: i, ...COMPRADORES[i],
  auto: ['ferrari_f40', 'mclaren_p1', 'gtr', 'mclaren_p1'][i],
}));
const ENTRADA = (m) => ({ x0: m.x + 15, x1: m.x + 31 }); // el portón de autos y la entrada

// ---------- El cerro ----------
const suave = (t) => { const k = THREE.MathUtils.clamp(t, 0, 1); return k * k * (3 - 2 * k); };
// Altura del cerro sin el camino: la cima plana y las faldas (más corta y empinada hacia el mar),
// con lomas suaves para que no parezca una torta.
function cerro(x, z) {
  const dx = x < M.x0 ? (M.x0 - x) / F.o : x > M.x1 ? (x - M.x1) / F.e : 0;
  const dz = z < M.z0 ? (M.z0 - z) / F.n : z > M.z1 ? (z - M.z1) / F.s : 0;
  const d = Math.hypot(dx, dz);
  if (d >= 1) return 0;
  const lomas = (Math.sin(x * 0.031) * Math.cos(z * 0.027) + Math.sin(x * 0.011 + z * 0.017) * 0.8) * 2.2 * Math.sin(Math.PI * Math.min(1, d * 1.6));
  return Math.max(0, M.alto * (1 - suave(d)) + (d > 0 ? lomas : 0));
}

// El camino: sale del desvío y sube por la falda del oeste dando la vuelta hasta la cima (curva
// suave entre estos puntos). Su altura sube de a poco con lo recorrido (unos 560 de largo: 5%).
const PUNTOS = [[CO.bif, CALLE_Z], [CO.bif + 22, 34], [CO.bif + 68, -8], [CO.bif + 128, -58], [CO.bif + 168, -128], [CO.bif + 196, -196], [CO.bif + 258, -238], [CO.bif + 322, -226], [CO.bif + 360, -186], [CO.bif + 400, -140]];
const CAMINO = (() => {
  const curva = new THREE.CatmullRomCurve3(PUNTOS.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
  const pts = curva.getSpacedPoints(180);
  let largo = 0;
  const lista = pts.map((p, i) => { if (i) largo += p.distanceTo(pts[i - 1]); return { x: p.x, z: p.z, s: largo }; });
  for (const q of lista) q.y = M.alto * suave((q.s / largo) / 0.93);
  return lista;
})();
const CAJA_CAMINO = CAMINO.reduce((a, q) => ({ x0: Math.min(a.x0, q.x), x1: Math.max(a.x1, q.x), z0: Math.min(a.z0, q.z), z1: Math.max(a.z1, q.z) }), { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity });

// El punto del camino más cercano a (x, z): [distancia, altura del camino ahí].
function alCamino(x, z) {
  if (x < CAJA_CAMINO.x0 - 20 || x > CAJA_CAMINO.x1 + 20 || z < CAJA_CAMINO.z0 - 20 || z > CAJA_CAMINO.z1 + 20) return [Infinity, 0];
  let mejor = Infinity;
  let k = 0;
  for (let i = 0; i < CAMINO.length; i++) {
    const d = (CAMINO[i].x - x) ** 2 + (CAMINO[i].z - z) ** 2;
    if (d < mejor) { mejor = d; k = i; }
  }
  return [Math.sqrt(mejor), CAMINO[k].y];
}

// Piso en (x, z): el cerro, aplanado donde pasa el camino (con su terraplén o su corte).
export function alturaCosta(x, z) {
  if (x < CO.x0 || x > CO.x1 + 60 || z > CALLE.z0) return 0;
  const h = cerro(x, z);
  const [d, y] = alCamino(x, z);
  if (d >= MEDIO_CAMINO + 12) return h;
  return THREE.MathUtils.lerp(y, h, suave((d - MEDIO_CAMINO) / 12));
}

// Por dónde andan los autos en el cerro: el camino (con sus banquinas), la cima plana y las laderas suaves. Devuelve la
// altura ahí, o null (afuera: el cerro frena al auto como la montaña).
export function rutaCosta(x, z) {
  if (x < CO.x0 || x > CO.x1 + 60 || z > CALLE.z0) return null;
  const h = alturaCosta(x, z);
  if (h < 0.5) return null; // al pie: el piso de siempre
  if (alCamino(x, z)[0] < MEDIO_CAMINO + 3 || cerro(x, z) >= M.alto - 0.05) return h;
  // Fuera del camino también se anda, salvo donde es muy empinado (la cara que da al mar).
  const pend = (Math.abs(alturaCosta(x + 2, z) - alturaCosta(x - 2, z)) + Math.abs(alturaCosta(x, z + 2) - alturaCosta(x, z - 2))) / 4;
  return pend < 0.45 ? h : null;
}

// Una palmera: tronco curvo de tramos y un penacho de hojas.
function palmera(c, x, z, alto, rnd) {
  const inc = (rnd() - 0.5) * 0.5;
  let px = x;
  for (let k = 0; k < 6; k++) {
    c.cil(0.42 - k * 0.04, 0.5 - k * 0.04, alto / 6 + 0.05, k % 2 ? '#8a6a4a' : '#7a5c3e', px, (k * alto) / 6, z, 7);
    px += inc * 0.6;
  }
  for (let h = 0; h < 9; h++) {
    const a = (h / 9) * Math.PI * 2 + rnd();
    const g = new THREE.BoxGeometry(0.9, 0.08, 5.6);
    g.translate(0, 0, 2.6);
    g.rotateX(0.45 + rnd() * 0.35);
    g.rotateY(a);
    g.translate(px, alto, z);
    c.forma('liso', g, h % 2 ? '#3f8f3a' : '#4fa244');
  }
}

export class Costa {
  constructor({ escena, estado, ui, guardar, colisiones, pausar }) {
    Object.assign(this, { escena, estado, ui, guardar, colisiones, pausar });
    this.grupo = null;
    this.duenos = {}; // id -> { m, cara, t } (el dueño en la puerta)
    this.reloj = 0;
  }

  get abierta() { return !!this.estado.costa; }

  solido(x0, y0, z0, x1, y1, z1) {
    this.colisiones.push(new THREE.Box3(new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x1, y1, z1)));
  }

  armar() {
    if (this.grupo || !this.abierta) return;
    this.grupo = new THREE.Group();
    this.escena.add(this.grupo);
    const rnd = aleatorio(777);
    const c = new Constructor();
    this.calle(c);
    this.armarCerro(c, rnd);
    this.playa();
    this.barrio(c, rnd);
    const materiales = {
      liso: new THREE.MeshLambertMaterial({ vertexColors: true }),
      luz: new THREE.MeshBasicMaterial({ vertexColors: true }),
      cristal: new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.38, depthWrite: false }),
    };
    this.grupo.add(c.armar(materiales));
    // Los autos caros en la entrada de cada mansión (los modelos del concesionario).
    for (const ma of MANSIONES) {
      const e = ENTRADA(ma);
      const x = (e.x0 + e.x1) / 2;
      cargarAuto(AUTOS_POR_ID[ma.auto]).then((a) => {
        a.position.set(x, 0.12, PUERTA_Z + 4);
        a.rotation.y = Math.PI;
        this.grupo.add(a);
        const [mx, mz] = a.userData.medio;
        this.solido(x - mx, 0, PUERTA_Z + 4 - mz, x + mx, 3, PUERTA_Z + 4 + mz);
      });
    }
  }

  // La calle que sigue (asfalto, la línea amarilla cortada, la vereda) y las columnas de luz.
  calle(c) {
    c.piso(CO.x0 - 60, CALLE.z0, CO.x1, CALLE.z1, 0.045, '#3e4046');
    for (let x = CO.x0 - 56; x < CO.x1 - 4; x += 8) c.piso(x, CALLE_Z - 0.15, x + 4, CALLE_Z + 0.15, 0.055, '#f5c518');
    c.piso(CO.x0 - 60, CALLE.z0 - 2.5, CO.bif - 8, CALLE.z0, 0.12, '#bdbab2');
    c.piso(CO.bif + 8, CALLE.z0 - 2.5, CO.x1, CALLE.z0, 0.12, '#bdbab2');
    c.piso(CO.x0 - 60, CALLE.z1, CO.x1, REJA_Z + 0.5, 0.12, '#bdbab2');
  }

  armarCerro(c, rnd) {
    // El terreno: una malla con la altura de cada punto (el camino incluido). Colores según la
    // pendiente: pasto en lo suave, roca en lo empinado (la cara al mar) y tierra al borde del camino.
    const [x0, x1, z0, z1] = [CO.bif - 40, CO.x1 + 40, M.z0 - F.n - 10, CALLE.z0 - 2.5];
    const paso = 5;
    const nx = Math.round((x1 - x0) / paso);
    const nz = Math.round((z1 - z0) / paso);
    const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0, nx, nz).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, alturaCosta(pos.getX(i), pos.getZ(i)) + 0.05);
    geo.computeVertexNormals();
    const nor = geo.attributes.normal;
    const col = new Float32Array(pos.count * 3);
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const empinado = 1 - nor.getY(i);
      const [d] = alCamino(x, z);
      const ruido = (Math.sin(x * 0.17) * Math.cos(z * 0.13) + Math.sin(x * 0.05 - z * 0.07)) * 0.5;
      if (d < MEDIO_CAMINO + 4) tmp.set('#8a6f52');
      else if (empinado > 0.28) tmp.set(ruido > 0 ? '#8d8679' : '#7b746a');
      else if (empinado > 0.16) tmp.set('#6e8a44');
      else tmp.set(ruido > 0.3 ? '#6aa043' : ruido < -0.3 ? '#4f8a35' : '#5f9a3c');
      tmp.toArray(col, i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const terreno = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
    for (const at of Object.values(geo.attributes)) at.onUpload(function () { this.array = null; });
    geo.index.onUpload(function () { this.array = null; });
    this.grupo.add(terreno);

    // El asfalto del camino (con las líneas de los bordes) arriba del terreno.
    const cinta = [];
    const lineas = [];
    const lado = (i) => {
      const a = CAMINO[Math.max(0, i - 1)];
      const b = CAMINO[Math.min(CAMINO.length - 1, i + 1)];
      const d = new THREE.Vector2(b.x - a.x, b.z - a.z).normalize();
      return new THREE.Vector2(-d.y, d.x);
    };
    const tira = (arr, q, r, nq, nr, a0, a1, dy) => {
      const p = (k, n, a) => [k.x + n.x * a, k.y + dy, k.z + n.y * a];
      arr.push(...p(q, nq, a0), ...p(q, nq, a1), ...p(r, nr, a1), ...p(q, nq, a0), ...p(r, nr, a1), ...p(r, nr, a0));
    };
    for (let i = 0; i < CAMINO.length - 1; i++) {
      const [q, r] = [CAMINO[i], CAMINO[i + 1]];
      const [nq, nr] = [lado(i), lado(i + 1)];
      tira(cinta, q, r, nq, nr, -MEDIO_CAMINO + 0.5, MEDIO_CAMINO - 0.5, 0.35);
      for (const s of [-1, 1]) tira(lineas, q, r, nq, nr, s * (MEDIO_CAMINO - 1.1), s * (MEDIO_CAMINO - 0.8), 0.38);
      if (i % 4 < 2) tira(lineas, q, r, nq, nr, -0.15, 0.15, 0.38);
    }
    const geoDe = (arr) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); g.computeVertexNormals(); return g; };
    // El orden de los vértices de la cinta queda hacia abajo o hacia arriba según el lado: se dibuja de las dos caras.
    const asfalto = new THREE.Mesh(geoDe(cinta), new THREE.MeshLambertMaterial({ color: '#45474c', side: THREE.DoubleSide }));
    const pintura = new THREE.Mesh(geoDe(lineas), new THREE.MeshBasicMaterial({ color: '#e8e2c8', side: THREE.DoubleSide }));
    this.grupo.add(asfalto, pintura);
    // Faroles a lo largo del camino (de un lado y del otro), con la luz que se ve de noche.
    for (let i = 6; i < CAMINO.length - 2; i += 12) {
      const q = CAMINO[i];
      const n = lado(i);
      const s = (i / 12) % 2 ? 1 : -1;
      const x = q.x + n.x * s * (MEDIO_CAMINO + 1.5);
      const z = q.z + n.y * s * (MEDIO_CAMINO + 1.5);
      const y = alturaCosta(x, z);
      c.cil(0.16, 0.2, 6.5, '#2b2d30', x, y, z, 6);
      c.caja(x - 0.5, y + 6.3, z - 0.5, x + 0.5, y + 7.3, z + 0.5, '#ffd58a', { lados: 'luz', arriba: '#2b2d30' });
    }
    // Árboles (copas redondas y pinos), piedras y arbustos por las laderas, lejos del camino y
    // del predio del galpón (instanciados: una malla por tipo).
    const G = CO.galpon;
    const libre = (x, z) => alCamino(x, z)[0] > MEDIO_CAMINO + 6 && !(Math.abs(x - G.x) < G.ancho / 2 + 34 && Math.abs(z - G.z) < G.fondo / 2 + 34) && z < CALLE.z0 - 6;
    const lugares = (n, peso) => {
      const out = [];
      for (let k = 0; out.length < n && k < n * 12; k++) {
        const x = x0 + rnd() * (x1 - x0);
        const z = z0 + rnd() * (z1 - z0);
        if (!libre(x, z) || cerro(x, z) < 0.5 || !peso(x, z)) continue;
        out.push([x, alturaCosta(x, z), z, 0.7 + rnd() * 0.7]);
      }
      return out;
    };
    const pendiente = (x, z) => Math.abs(cerro(x + 2, z) - cerro(x - 2, z)) + Math.abs(cerro(x, z + 2) - cerro(x, z - 2));
    const instancias = (geo, mat, lista, ajustar) => {
      const im = new THREE.InstancedMesh(geo, mat, lista.length);
      const o = new THREE.Object3D();
      lista.forEach((l, i) => { ajustar(o, l); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
      this.grupo.add(im);
      return im;
    };
    const copas = lugares(70, (x, z) => pendiente(x, z) < 3);
    const pinos = lugares(55, () => rnd() < 0.8);
    instancias(new THREE.CylinderGeometry(0.5, 0.7, 6, 6).translate(0, 3, 0), new THREE.MeshLambertMaterial({ color: '#6d4a2c' }), [...copas, ...pinos], (o, [x, y, z, s]) => { o.position.set(x, y - 0.2, z); o.rotation.set(0, 0, 0); o.scale.setScalar(s); });
    instancias(new THREE.IcosahedronGeometry(4.6, 1).translate(0, 8.5, 0), new THREE.MeshLambertMaterial({ color: '#3f7f34', flatShading: true }), copas, (o, [x, y, z, s]) => { o.position.set(x, y, z); o.rotation.set(0, s * 9, 0); o.scale.set(s * 1.15, s, s * 1.15); });
    instancias(new THREE.ConeGeometry(3.4, 10, 7).translate(0, 9, 0), new THREE.MeshLambertMaterial({ color: '#2c6a33', flatShading: true }), pinos, (o, [x, y, z, s]) => { o.position.set(x, y, z); o.rotation.set(0, s * 7, 0); o.scale.setScalar(s); });
    const piedras = lugares(150, (x, z) => pendiente(x, z) > 2.5 || rnd() < 0.25);
    instancias(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ color: '#8a8378', flatShading: true }), piedras, (o, [x, y, z, s]) => { o.position.set(x, y + 0.3, z); o.rotation.set(s * 3, s * 5, s * 2); o.scale.set(s * 2.6, s * 1.6, s * 2.2); });
    const arbustos = lugares(220, () => true);
    instancias(new THREE.IcosahedronGeometry(1.3, 0).scale(1, 0.7, 1), new THREE.MeshLambertMaterial({ color: '#4c8a36', flatShading: true }), arbustos, (o, [x, y, z, s]) => { o.position.set(x, y + 0.4, z); o.rotation.set(0, s * 4, 0); o.scale.setScalar(s); });
  }

  // La playa de las mansiones: arena, la franja mojada y las olas (el mar es el de playa.js).
  playa() {
    const PZ = CALLE.z1;
    const ancho = CO.playa.x1 - CO.playa.x0;
    const xm = (CO.playa.x0 + CO.playa.x1) / 2;
    const arena = new THREE.Mesh(new THREE.PlaneGeometry(ancho, P.orilla + 3 - PZ), new THREE.MeshLambertMaterial({ map: texArena() }));
    arena.material.map.repeat.set(ancho / 14, (P.orilla + 3 - PZ) / 14);
    arena.rotation.x = -Math.PI / 2;
    arena.position.set(xm, 0.06, (PZ + P.orilla + 3) / 2);
    const mojada = new THREE.Mesh(new THREE.PlaneGeometry(ancho, 9), new THREE.MeshBasicMaterial({ map: texMojada(), transparent: true, depthWrite: false }));
    mojada.rotation.x = -Math.PI / 2;
    mojada.position.set(xm, 0.08, P.orilla - 3.5);
    const espuma = texEspuma();
    espuma.repeat.set(ancho / 40, 1);
    this.orilla = new THREE.Mesh(new THREE.PlaneGeometry(ancho, 3.2), new THREE.MeshBasicMaterial({ map: espuma, transparent: true, depthWrite: false }));
    this.orilla.rotation.x = -Math.PI / 2;
    this.orilla.position.set(xm, Y_AGUA + 0.02, P.orilla);
    this.orilla.renderOrder = 2;
    this.crestas = [0, 1, 2].map((i) => {
      const t = texEspuma();
      t.repeat.set(ancho / 55, 1);
      t.offset.x = i * 0.37;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(ancho + 100, 1.8), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(xm, Y_AGUA + 0.03, P.orilla + 20);
      m.renderOrder = 2;
      return { m, fase: i / 3 };
    });
    this.grupo.add(arena, mojada, this.orilla, ...this.crestas.map((k) => k.m));
  }

  // El barrio privado: la garita, la reja negra con pilares de piedra (con un portón por casa) y
  // las cuatro mansiones.
  barrio(c, rnd) {
    const x0 = CO.playa.x0 + 20;
    const x1 = CO.x1 - 6;
    // La garita de seguridad (como la de la entrada de un barrio cerrado) con la barrera levantada.
    const gx = x0 + 8;
    c.caja(gx - 4, 0.1, REJA_Z + 1, gx + 4, 6.5, REJA_Z + 8, '#f1efe9');
    c.caja(gx - 4.6, 6.5, REJA_Z + 0.4, gx + 4.6, 7.1, REJA_Z + 8.6, '#3a3d42');
    c.caja(gx - 3, 2.6, REJA_Z + 0.95, gx + 3, 5.4, REJA_Z + 1.05, '#bfe3f2', { lados: 'cristal' });
    c.caja(gx + 4.2, 3, REJA_Z + 0.6, gx + 4.5, 3.3, REJA_Z + 3, '#ffd23f', { lados: 'luz' });
    this.solido(gx - 4, 0, REJA_Z + 1, gx + 4, 7, REJA_Z + 8);
    // La reja: pilares de piedra cada 10, barrotes negros y un farolito arriba de cada pilar.
    const huecos = MANSIONES.flatMap((m) => [[m.x - 3, m.x + 3], [ENTRADA(m).x0, ENTRADA(m).x1]]);
    const enHueco = (a, b) => huecos.some(([h0, h1]) => b > h0 && a < h1);
    for (let x = x0 + 16; x < x1; x += 10) {
      if (enHueco(x - 1, x + 1)) continue;
      c.caja(x - 0.7, 0, REJA_Z - 0.7, x + 0.7, 3.4, REJA_Z + 0.7, '#a59c8e');
      c.caja(x - 0.85, 3.4, REJA_Z - 0.85, x + 0.85, 3.7, REJA_Z + 0.85, '#8d8476');
      c.caja(x - 0.25, 3.7, REJA_Z - 0.25, x + 0.25, 4.2, REJA_Z + 0.25, '#fff2c8', { lados: 'luz' });
      const sig = x + 10;
      for (let b = x + 0.9; b < Math.min(sig, x1) - 0.8; b += 0.55) {
        if (enHueco(b - 0.1, b + 0.1)) continue;
        c.caja(b - 0.05, 0, REJA_Z - 0.05, b + 0.05, 2.9, REJA_Z + 0.05, '#17181a');
      }
      for (const y of [0.4, 2.6]) {
        const tramos = [];
        let a = x + 0.7;
        const fin = Math.min(sig, x1) - 0.7;
        for (const [h0, h1] of huecos.filter(([h0, h1]) => h1 > a && h0 < fin).sort((p, q) => p[0] - q[0])) { tramos.push([a, h0]); a = h1; }
        tramos.push([a, fin]);
        for (const [t0, t1] of tramos) if (t1 > t0) c.caja(t0, y, REJA_Z - 0.07, t1, y + 0.12, REJA_Z + 0.07, '#17181a');
      }
    }
    // Choques de la reja, tramo por tramo, dejando los portones abiertos.
    let a = x0 + 15;
    for (const [h0, h1] of huecos) { this.solido(a, 0, REJA_Z - 0.4, h0, 3.4, REJA_Z + 0.4); a = h1; }
    this.solido(a, 0, REJA_Z - 0.4, x1, 3.4, REJA_Z + 0.4);
    for (const ma of MANSIONES) this.mansion(c, ma, rnd);
  }

  // Una mansión: la entrada de autos (portón de rejas entre pilares, el auto) y la puerta con el
  // timbre al frente; la casa según su estilo; atrás, el deck con la pileta mirando al mar,
  // reposeras, sombrilla y palmeras (lejos de la entrada del auto).
  mansion(c, ma, rnd) {
    const x = ma.x;
    const z0 = PUERTA_Z + 2; // el frente de la casa
    const e = ENTRADA(ma);
    c.piso(e.x0, REJA_Z, e.x1, PUERTA_Z + 14, 0.13, '#cfcac0'); // la entrada de autos (adoquín claro)
    c.piso(x - 2.5, REJA_Z, x + 2.5, z0, 0.13, '#e6e0d4'); // el caminito a la puerta
    for (const px of [e.x0 - 0.9, e.x1 + 0.9, x - 3.9, x + 3.9]) {
      c.caja(px - 0.9, 0, REJA_Z - 0.9, px + 0.9, 4.2, REJA_Z + 0.9, '#a59c8e'); // pilares del portón
      c.caja(px - 1.05, 4.2, REJA_Z - 1.05, px + 1.05, 4.5, REJA_Z + 1.05, '#8d8476');
      c.caja(px - 0.3, 4.5, REJA_Z - 0.3, px + 0.3, 5.1, REJA_Z + 0.3, '#fff2c8', { lados: 'luz' });
      this.solido(px - 0.9, 0, REJA_Z - 0.9, px + 0.9, 4.2, REJA_Z + 0.9);
    }
    // El portón abierto (las dos hojas contra los pilares, adentro).
    for (const [hx, s] of [[e.x0, 1], [e.x1, -1]]) {
      for (let k = 0; k < 7; k++) c.caja(hx - 0.06, 0.2, REJA_Z + 0.6 + k * 0.6, hx + 0.06, 3.2, REJA_Z + 0.7 + k * 0.6, '#17181a');
      c.caja(hx - 0.07 + s * 0, 2.9, REJA_Z + 0.5, hx + 0.07, 3.05, REJA_Z + 4.8, '#17181a');
    }
    // Ligustros recortados a lo largo de la reja, de adentro.
    for (const [h0, h1] of [[x - 95, x - 6], [x + 6, e.x0 - 3], [e.x1 + 3, x + 100]]) {
      if (h1 - h0 > 2) c.caja(h0, 0, REJA_Z + 1, h1, 2.2, REJA_Z + 2.8, '#3f7f34');
    }
    const estilos = [this.voladizo, this.piedraMadera, this.terrazas, this.pabellon];
    const fondo = estilos[ma.estilo].call(this, c, x, z0);
    // La puerta (madera, alta) y el timbre dorado.
    c.caja(x - 1.6, 0.1, PUERTA_Z + 1.7, x + 1.6, 6.8, PUERTA_Z + 2.05, '#5a3a24');
    c.caja(x + 2.3, 3.2, PUERTA_Z + 1.75, x + 2.6, 3.5, PUERTA_Z + 2.05, '#d4af37');
    // Atrás: deck de madera, la pileta (borde blanco y el agua), reposeras y sombrilla.
    const zd = fondo + 1.5;
    c.piso(x - 30, fondo, x + 34, P.orilla - 9, 0.11, '#a07a52');
    c.caja(x - 16, 0, zd, x + 8, 0.5, zd + 10, '#f2f2f2');
    c.piso(x - 15.2, zd + 0.8, x + 7.2, zd + 9.2, 0.51, '#2ec4e8');
    for (let k = 0; k < 3; k++) {
      c.caja(x + 12 + k * 3.2, 0, zd + 1, x + 13.8 + k * 3.2, 0.6, zd + 6, '#ffffff');
      c.caja(x + 12 + k * 3.2, 0.6, zd + 5, x + 13.8 + k * 3.2, 1.5, zd + 6, '#ffffff');
    }
    c.cil(0.08, 0.08, 3.2, '#dddddd', x + 24, 0, zd + 8, 5);
    c.cil(2.6, 0.1, 0.8, '#efe6d2', x + 24, 3, zd + 8, 10);
    for (const [px, pz] of [[x - 24, z0 + 2], [x - 26, zd + 7], [x + 36, zd + 2], [x - 10, REJA_Z + 5]]) {
      palmera(c, px, pz, 10 + rnd() * 4, rnd);
      this.solido(px - 0.6, 0, pz - 0.6, px + 0.6, 8, pz + 0.6);
    }
  }

  // 1) La blanca en voladizo (como las casas de Miami): dos volúmenes blancos, el de arriba sale
  // hacia la calle con listones de madera; ventanales enteros al mar y techo plano con alero.
  voladizo(c, x, z0) {
    const z1 = z0 + 20;
    c.caja(x - 16, 0, z0, x + 12, 8, z1, '#f6f5f2');
    c.caja(x - 15.6, 0.4, z1 - 0.1, x + 11.6, 7.6, z1 + 0.15, '#bfe3f2', { lados: 'cristal' });
    c.caja(x - 12, 0.4, z0 - 0.15, x - 3, 7.6, z0 + 0.1, '#bfe3f2', { lados: 'cristal' });
    c.caja(x - 13, 8, z0 - 4, x + 14, 15, z1 - 2, '#ffffff');
    c.caja(x - 12.6, 8.4, z1 - 2.1, x + 13.6, 14.6, z1 - 1.8, '#bfe3f2', { lados: 'cristal' });
    for (let k = 0; k < 20; k++) c.caja(x - 12 + k * 1.3, 8.6, z0 - 4.25, x - 11.6 + k * 1.3, 14.6, z0 - 4, '#b07a4a');
    c.caja(x - 18, 15, z0 - 5, x + 16, 15.4, z1, '#e8e6e1');
    c.caja(x - 17, 8, z0 - 1, x + 13, 8.35, z1 + 2, '#e8e6e1');
    this.solido(x - 16, 0, z0, x + 12, 15.4, z1);
    return z1;
  }

  // 2) Piedra y madera (como las casas de montaña modernas): planta baja de piedra en L, arriba un
  // volumen de madera oscura con ventanas de marco negro, y una terraza con baranda de vidrio.
  piedraMadera(c, x, z0) {
    const z1 = z0 + 22;
    c.caja(x - 18, 0, z0, x + 12, 8, z0 + 12, '#9a9184');
    c.caja(x - 18, 0, z0 + 12, x - 4, 8, z1, '#9a9184');
    c.caja(x - 3.8, 0.4, z0 + 12, x + 12, 7.6, z1, '#bfe3f2', { lados: 'cristal' });
    c.caja(x - 16, 8, z0 + 2, x + 10, 15.5, z1 - 4, '#6b452a');
    for (let k = 0; k < 5; k++) {
      const wx = x - 14 + k * 5;
      c.caja(wx, 9.5, z1 - 4.15, wx + 3.2, 14, z1 - 3.9, '#bfe3f2', { lados: 'cristal' });
      c.caja(wx - 0.2, 9.3, z1 - 4.2, wx + 3.4, 9.5, z1 - 3.85, '#1b1c1e');
    }
    c.caja(x - 17, 15.5, z0 + 1, x + 11, 16, z1 - 3, '#2b2d30');
    c.caja(x - 3.8, 8, z0 + 12, x + 12, 8.3, z1, '#8d8476');
    c.caja(x - 3.8, 8.3, z1 - 0.1, x + 12, 9.6, z1 + 0.05, '#bfe3f2', { lados: 'cristal' });
    c.caja(x - 3, 0.1, z0 - 0.1, x + 3, 7, z0 + 0.05, '#7a5a3a');
    this.solido(x - 18, 0, z0, x + 12, 16, z1);
    return z1;
  }

  // 3) Terrazas escalonadas (como las de la costa mediterránea): tres cajas blancas cada vez más
  // chicas hacia el mar, cada techo es la terraza del de arriba, con barandas de vidrio.
  terrazas(c, x, z0) {
    const z1 = z0 + 22;
    const pisos = [[x - 18, x + 14, z0, z1], [x - 14, x + 10, z0, z1 - 6], [x - 10, x + 6, z0, z1 - 12]];
    pisos.forEach(([a, b, f, t], k) => {
      const y = k * 6;
      c.caja(a, y, f, b, y + 6, t, k === 1 ? '#f1ece2' : '#faf8f4');
      c.caja(a + 0.4, y + 0.6, t - 0.1, b - 0.4, y + 5.4, t + 0.15, '#bfe3f2', { lados: 'cristal' });
      c.caja(a, y + 6, f, b, y + 6.3, t + 1.5, '#e8e1d4');
      c.caja(a, y + 6.3, t + 1.4, b, y + 7.4, t + 1.55, '#bfe3f2', { lados: 'cristal' });
    });
    c.caja(x + 6, 12.3, z0, x + 8, 16, z0 + 4, '#c9a27a');
    this.solido(x - 18, 0, z0, x + 14, 18, z1);
    return z1;
  }

  // 4) El pabellón de vidrio (como la Farnsworth o las casas de Mies): un techo plano enorme sobre
  // columnas finas, una caja de vidrio adentro con los marcos negros, y un muro de piedra.
  pabellon(c, x, z0) {
    const z1 = z0 + 20;
    c.caja(x - 20, 0, z0 - 2, x + 16, 0.7, z1 + 2, '#e8e4dc'); // la plataforma
    c.caja(x - 15, 0.7, z0, x + 11, 8.2, z1, '#cfe9f5', { lados: 'cristal' });
    for (let k = 0; k <= 6; k++) {
      const cx = x - 15 + k * (26 / 6);
      for (const zz of [z0, z1]) c.caja(cx - 0.12, 0.7, zz - 0.12, cx + 0.12, 8.2, zz + 0.12, '#1b1c1e');
    }
    for (const [cx, zz] of [[x - 19, z0 - 1], [x + 15, z0 - 1], [x - 19, z1 + 1], [x + 15, z1 + 1]]) c.caja(cx - 0.3, 0.7, zz - 0.3, cx + 0.3, 9, zz + 0.3, '#2f3437');
    c.caja(x - 22, 9, z0 - 4, x + 18, 9.8, z1 + 4, '#2f3437'); // el techo que vuela
    c.caja(x - 21, 0.7, z0 + 6, x - 15.2, 8.2, z0 + 14, '#a59c8e'); // muro de piedra
    this.solido(x - 15, 0, z0, x + 11, 9.8, z1);
    return z1 + 2;
  }

  // ---------- Los timbres ----------
  mansionCerca(p) {
    if (p.y > 3) return null;
    return MANSIONES.find((m) => Math.abs(p.x - m.x) < 3.5 && p.z > PUERTA_Z - 5 && p.z < PUERTA_Z + 2.5) || null;
  }

  accion(jugador) {
    return this.grupo && this.mansionCerca(jugador.pos) ? 'Tocar el timbre (E)' : '';
  }

  // Sale el dueño a la puerta y charla (distinto si ya compraste el galpón de tanzania).
  async hacer(jugador) {
    const ma = this.mansionCerca(jugador.pos);
    if (!ma) return;
    this.pausar(true);
    let d = this.duenos[ma.id];
    if (!d) {
      const p = { id: `dueno_${ma.id}`, nombre: ma.nombre, sinFoto: true, ...ma.look };
      const cab = await cargarCabeza(p);
      if (!cab.dibujada) {
        dibujarCara(cab.frente, p.piel, p.pelo);
        cab.dibujada = true;
      }
      const m = crearPersonaje(p, cab);
      const et = crearEtiqueta([{ texto: ma.nombre, tam: 56, color: '#ffffff' }], 4);
      et.sprite.position.y = 6.6;
      m.grupo.add(et.sprite);
      m.grupo.position.set(ma.x - 0.3, 0.12, PUERTA_Z + 1.1); // en el umbral
      this.grupo.add(m.grupo);
      d = this.duenos[ma.id] = { m, cara: cab.frente.toDataURL(), t: 0 };
    }
    d.m.grupo.visible = true;
    d.t = 12;
    d.m.grupo.rotation.y = Math.atan2(jugador.pos.x - d.m.grupo.position.x, jugador.pos.z - d.m.grupo.position.z);
    const lineas = this.estado.tanzania?.compras?.includes('tz_galpon') ? ma.conGalpon : ma.sinGalpon;
    const decir = (l, opciones) => new Promise((res) => this.ui.dialogo({ nombre: ma.nombre, cara: d.cara, remera: ma.look.remera, lineas: l, opciones, alElegir: res, alTerminar: () => res(-1) }));
    // Con bolsitas encima, te compra (VENTAS_COMPRADORES): hasta su cantidad, a lo que paga. El
    // primero que te compra te da el celular (Tranzapp y la cotización: celular.js).
    const encima = this.tanzania?.datos.encima || 0;
    if (VENTAS_COMPRADORES && encima > 0) {
      const n = Math.min(encima, ma.compra.cantidad);
      const r = await decir([...lineas.slice(0, 1), `…¿Eso que tenés ahí es lo que pienso? Te compro ${n} bolsitas, ya.`], [`Venderle ${n} bolsitas`, 'No, gracias']);
      if (r === 0) {
        this.tanzania.vender(ma.compra.paga, n);
        if (!this.estado.celular) {
          this.estado.celular = true;
          this.guardar();
          await decir(['Bien ahí. Tomá este celular: es seguro, nadie lo rastrea.', 'Ahí vas a ver a cuánto se paga la tanzania y te va a escribir gente por Tranzapp. Vos entregás con la camioneta y cobrás.']);
          this.ui.toast('Conseguiste el celular: tocá 📱 o la P', 'plata', 5000);
        } else await decir(['Un placer hacer negocios, eh.']);
      }
    } else await decir(lineas);
    this.pausar(false);
  }

  actualizar(dt, jugador) {
    const x = jugador.pos.x;
    const cerca = x > CO.x0 - 900 && x < CO.x1 + 600;
    if (cerca && !this.grupo) this.armar();
    if (!this.grupo) return;
    this.grupo.visible = cerca;
    if (!cerca) return;
    this.reloj += dt;
    const t = this.reloj;
    this.orilla.position.z = P.orilla + Math.sin(t * 0.8) * 0.9;
    this.orilla.material.opacity = 0.7 + Math.sin(t * 0.8 + 1) * 0.25;
    for (const k of this.crestas) {
      const f = (t * 0.06 + k.fase) % 1;
      k.m.position.z = P.orilla + 2 + (1 - f) * 40;
      k.m.material.opacity = Math.sin(f * Math.PI) * 0.75;
      k.m.material.map.offset.x += dt * 0.01;
    }
    // El dueño vuelve a entrar al rato.
    for (const d of Object.values(this.duenos)) {
      if (!d.m.grupo.visible) continue;
      d.m.animar(dt, 0, true);
      if ((d.t -= dt) <= 0) d.m.grupo.visible = false;
    }
  }
}
