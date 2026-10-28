import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PLAYA as P } from './constantes.js';
import { crearPersonaje } from './personaje.js';
import { cargarCabeza, cargarImagen, crearEtiqueta, liberarAlSubir } from './texturas.js';
import { aleatorio } from './util.js';
import { sfx } from './sfx.js';

// Playa frente a la mansión, cruzando la calle, estilo Miami Beach: arena clara, mar turquesa que
// se vuelve azul profundo hacia el horizonte, olas suaves con espuma en la orilla, un muelle de
// madera, palmeras altas y arbustos tropicales entre la vereda y la arena, reposeras y sombrillas
// pastel, bancos frente al agua y la casilla del guardavidas. Un deck de madera (con la senda
// peatonal en la calle) va del portón de la mansión a la arena. De noche se prenden luces cálidas
// en las palmeras y en el muelle, y las luces de la mansión se reflejan en el agua.
//
// Se camina por la arena y por el agua de la orilla (hasta P.vadeo adentro); el auto no entra al
// mar (choque soloAutos en la orilla, ver jugador.js).
//
// En el agua surfea Francis Jeremy (el rapero): cuerpo hecho a mano como el del profe, con las
// rastas y los tatuajes de sus fotos. Si te acercás a la orilla, viene; tira sus frases y, cuando
// ya tenés los perros, se puede charlar con él y, eligiendo bien, te da una pócima que revive a un
// perro (una por vez).
//
// Liviano: todo lo quieto va en pocas mallas (geometrías unidas por material) y el mar es un solo
// plano con un shader corto.

const O = P.orilla;
const Y_AGUA = 0.32;
const ANCHO_PLAYA = P.x1 - P.x0;
const SPOT = { x: 14, z: O - 3.6 }; // donde se para Francis cuando sale del agua

function lienzo(w, h, dibujar) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  dibujar(c.getContext('2d'), w, h);
  return c;
}
function textura(c, repetir = false, liberar = true) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repetir) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (liberar) liberarAlSubir(t);
  return t;
}

// Junta geometrías (cada una con su color) en una sola malla por material.
class Pila {
  constructor() { this.geos = []; }
  agregar(geo, color) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    const c = new THREE.Color(color);
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.geos.push(g);
    return g;
  }
  caja(x0, y0, z0, x1, y1, z1, color) {
    const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    return this.agregar(g, color);
  }
  malla(material) {
    if (!this.geos.length) return null;
    const m = new THREE.Mesh(mergeGeometries(this.geos), material);
    m.geometry.computeBoundingSphere();
    return m;
  }
}

// ---------- Texturas ----------
const texArena = () => textura(lienzo(256, 256, (g, w) => {
  g.fillStyle = '#f2e3c0';
  g.fillRect(0, 0, w, w);
  const rnd = aleatorio(4);
  for (let i = 0; i < 2600; i++) {
    const v = rnd();
    g.fillStyle = v < 0.5 ? 'rgba(196,170,120,0.35)' : v < 0.85 ? 'rgba(255,250,235,0.55)' : 'rgba(150,120,80,0.3)';
    g.fillRect(rnd() * w, rnd() * w, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  // Ondas suaves que deja el viento.
  g.strokeStyle = 'rgba(205,180,130,0.22)';
  g.lineWidth = 2;
  for (let y = 10; y < w; y += 22) {
    g.beginPath();
    for (let x = 0; x <= w; x += 8) g.lineTo(x, y + Math.sin(x * 0.05 + y) * 4);
    g.stroke();
  }
}), true);
// Arena mojada cerca del agua: más oscura, que se funde con la seca.
const texMojada = () => textura(lienzo(4, 128, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, 'rgba(180,150,105,0)');
  gr.addColorStop(0.6, 'rgba(176,146,102,0.55)');
  gr.addColorStop(1, 'rgba(160,132,92,0.75)');
  g.fillStyle = gr;
  g.fillRect(0, 0, w, h);
}));
// Espuma: franja blanca deshilachada con burbujas, transparente en los bordes.
const texEspuma = () => textura(lienzo(512, 64, (g, w, h) => {
  const rnd = aleatorio(9);
  for (let i = 0; i < 900; i++) {
    const x = rnd() * w;
    const y = h * 0.5 + (rnd() - 0.5) * h * 0.8 * rnd();
    const r = 1 + rnd() * 4;
    g.fillStyle = `rgba(255,255,255,${0.35 + rnd() * 0.6})`;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, 'rgba(255,255,255,0)');
  gr.addColorStop(0.45, 'rgba(255,255,255,0.75)');
  gr.addColorStop(0.55, 'rgba(255,255,255,0.75)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, w, h);
}), true);
// Sombra blanda (las sombras largas de la tarde, abajo de palmeras y sombrillas).
const texSombra = () => textura(lienzo(64, 64, (g) => {
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(60,40,20,0.45)');
  r.addColorStop(1, 'rgba(60,40,20,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
}));
// Brillo de luz (los puntos de luz de noche).
const texBrillo = () => textura(lienzo(64, 64, (g) => {
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.25, 'rgba(255,235,190,0.7)');
  r.addColorStop(1, 'rgba(255,200,120,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
}));
// Reflejo de una luz en el agua: rayitas cortadas que tiemblan (se mueve con el offset).
const texReflejo = () => textura(lienzo(32, 256, (g, w, h) => {
  const rnd = aleatorio(13);
  for (let y = 0; y < h; y += 3) {
    const a = 0.25 + rnd() * 0.75;
    const ancho = w * (0.25 + rnd() * 0.7);
    g.fillStyle = `rgba(255,214,150,${a * (0.4 + 0.6 * (1 - y / h))})`;
    g.fillRect((w - ancho) / 2 + (rnd() - 0.5) * 6, y, ancho, 2);
  }
}), true, false);
// Tabla de surf: blanca con la franja turquesa y naranja y "#UNDER".
const texTabla = () => textura(lienzo(512, 128, (g, w, h) => {
  g.fillStyle = '#fbfaf5';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#19c3c9';
  g.fillRect(0, h * 0.42, w, h * 0.16);
  g.fillStyle = '#ff7a2f';
  g.fillRect(0, h * 0.36, w, h * 0.05);
  g.fillRect(0, h * 0.59, w, h * 0.05);
  g.fillStyle = '#111';
  g.font = '900 34px Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('#UNDER', w * 0.35, h * 0.5);
}));
// Malla de cuadros amarilla (la bermuda de Francis, como el bóxer de la foto).
const texCuadros = () => textura(lienzo(128, 128, (g, w) => {
  g.fillStyle = '#efc94c';
  g.fillRect(0, 0, w, w);
  for (let i = 0; i < w; i += 16) {
    g.fillStyle = 'rgba(255,255,255,0.45)';
    g.fillRect(i, 0, 5, w);
    g.fillRect(0, i, w, 5);
    g.fillStyle = 'rgba(190,120,40,0.35)';
    g.fillRect(i + 9, 0, 2, w);
    g.fillRect(0, i + 9, w, 2);
  }
}), true);

// ---------- El mar (un plano y un shader corto) ----------
function crearMar(uT) {
  const w = P.mar.x1 - P.mar.x0;
  const d = P.mar.z1 - (O - 1);
  const geo = new THREE.PlaneGeometry(w, d, 52, 26);
  geo.rotateX(-Math.PI / 2);
  geo.translate((P.mar.x0 + P.mar.x1) / 2, Y_AGUA, O - 1 + d / 2);
  const mat = new THREE.MeshLambertMaterial({ color: '#ffffff', transparent: true });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uT = uT;
    sh.uniforms.uOrilla = { value: O };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMundo;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMundo = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMundo;\nuniform float uT;\nuniform float uOrilla;')
      .replace('#include <color_fragment>', `
        float d = clamp((vMundo.z - uOrilla) / 300.0, 0.0, 1.0);
        vec3 turquesa = vec3(0.20, 0.82, 0.78);
        vec3 medio = vec3(0.03, 0.52, 0.74);
        vec3 profundo = vec3(0.02, 0.18, 0.44);
        vec3 c = mix(turquesa, medio, smoothstep(0.0, 0.22, d));
        c = mix(c, profundo, smoothstep(0.18, 1.0, d));
        float ola = sin(vMundo.x * 0.11 + uT * 1.3) * sin(vMundo.z * 0.17 - uT * 1.1) + 0.5 * sin(vMundo.x * 0.31 - vMundo.z * 0.23 + uT * 2.0);
        c *= 1.0 + 0.06 * ola;
        float chispa = pow(max(0.0, sin(vMundo.x * 0.7 + uT * 2.3) * sin(vMundo.z * 0.9 - uT * 1.7)), 28.0);
        c += chispa * 0.4 * (1.0 - d * 0.6);
        diffuseColor.rgb = c;
        diffuseColor.a = mix(0.62, 1.0, smoothstep(0.0, 0.035, d));
      `);
  };
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = 1;
  return m;
}

// ---------- Palmeras, arbustos y cosas de playa ----------
// Palmera alta: tronco curvo de anillos y penacho de hojas caídas (dos tramos cada una).
function palmera(pila, hojas, x, z, alto, rnd) {
  const dir = rnd() * Math.PI * 2;
  const curva = 0.06 + rnd() * 0.08;
  let px = x;
  let pz = z;
  let py = 0;
  const tramos = 7;
  const largo = alto / tramos;
  for (let i = 0; i < tramos; i++) {
    const inc = curva * i;
    const r0 = 0.5 - i * 0.03;
    const t = new THREE.CylinderGeometry(r0 - 0.03, r0, largo * 1.02, 7);
    t.translate(0, largo / 2, 0);
    t.rotateZ(inc);
    t.rotateY(dir);
    t.translate(px, py, pz);
    pila.agregar(t, i % 2 ? '#9a7b55' : '#8a6a46');
    px += Math.sin(inc) * largo * Math.cos(dir) * -1;
    pz += Math.sin(inc) * largo * Math.sin(dir);
    py += Math.cos(inc) * largo;
  }
  for (let k = 0; k < 3; k++) {
    const c = new THREE.SphereGeometry(0.28, 6, 5);
    c.translate(px + Math.cos(k * 2.1) * 0.35, py - 0.3, pz + Math.sin(k * 2.1) * 0.35);
    pila.agregar(c, '#6b4a22');
  }
  const n = 9;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + rnd() * 0.3;
    const verde = ['#2f8f3a', '#3aa047', '#277a33'][k % 3];
    for (const [l, caida, desde] of [[2.6, 0.35, 0], [2.4, 1.0, 2.5]]) {
      const h = new THREE.BoxGeometry(1.1 - desde * 0.18, 0.06, l);
      h.translate(0, 0, l / 2);
      h.rotateX(caida);
      // El segundo tramo arranca donde termina el primero.
      const base = new THREE.Vector3(0, -Math.sin(0.35) * desde, Math.cos(0.35) * desde);
      h.translate(base.x, base.y, base.z);
      h.rotateY(a);
      h.translate(px, py, pz);
      hojas.agregar(h, verde);
    }
  }
  return { x: px, y: py, z: pz };
}

function arbusto(pila, x, z, rnd, flores = true) {
  for (let k = 0; k < 4; k++) {
    const b = new THREE.IcosahedronGeometry(0.9 + rnd() * 0.6, 0);
    b.translate(x + (rnd() - 0.5) * 2, 0.7 + rnd() * 0.4, z + (rnd() - 0.5) * 1.4);
    pila.agregar(b, ['#2e7d32', '#388e3c', '#43a047', '#1b5e20'][k % 4]);
  }
  if (!flores) return;
  for (let k = 0; k < 6; k++) {
    const f = new THREE.IcosahedronGeometry(0.22, 0);
    f.translate(x + (rnd() - 0.5) * 2.6, 1.2 + rnd() * 0.8, z + (rnd() - 0.5) * 1.8);
    pila.agregar(f, ['#ff5fa2', '#ff8a3d', '#ffd23f', '#e040fb'][k % 4]);
  }
}

const PASTEL = ['#ffb3c7', '#9ee6dc', '#ffe08f', '#c9b8ff', '#ffc9a3', '#a8d8ff'];

// Reposera mirando al mar (+z): patas blancas, colchoneta pastel y respaldo inclinado.
function reposera(pila, x, z, color) {
  pila.caja(x - 0.9, 0.55, z - 2, x + 0.9, 0.7, z + 1.4, '#f5f5f2');
  pila.caja(x - 0.8, 0.7, z - 1.1, x + 0.8, 0.88, z + 1.3, color);
  for (const [dx, dz] of [[-0.75, -1.8], [0.75, -1.8], [-0.75, 1.2], [0.75, 1.2]]) pila.caja(x + dx - 0.07, 0, z + dz - 0.07, x + dx + 0.07, 0.6, z + dz + 0.07, '#f5f5f2');
  const r = new THREE.BoxGeometry(1.6, 0.18, 1.4);
  r.translate(0, 0.09, 0.7);
  r.rotateX(-0.95);
  r.translate(x, 0.8, z - 2);
  pila.agregar(r, color);
}

function sombrilla(pila, x, z, color) {
  const palo = new THREE.CylinderGeometry(0.08, 0.08, 5.2, 6);
  palo.translate(x, 2.6, z);
  pila.agregar(palo, '#f5f5f2');
  const tela = new THREE.ConeGeometry(3.2, 1.2, 10, 1, true);
  tela.translate(x, 5.4, z);
  pila.agregar(tela, color);
  const borde = new THREE.CylinderGeometry(3.22, 3.22, 0.25, 10, 1, true);
  borde.translate(x, 4.75, z);
  pila.agregar(borde, '#ffffff');
}

function banco(pila, x, z) {
  pila.caja(x - 2, 0.9, z - 0.45, x + 2, 1.1, z + 0.45, '#a87445');
  const resp = new THREE.BoxGeometry(4, 0.9, 0.14);
  resp.rotateX(-0.2);
  resp.translate(x, 1.7, z - 0.48);
  pila.agregar(resp, '#a87445');
  for (const dx of [-1.7, 1.7]) pila.caja(x + dx - 0.12, 0, z - 0.4, x + dx + 0.12, 0.9, z + 0.4, '#6b4a2e');
}

// ---------- Francis Jeremy ----------
export const FRANCIS = {
  id: 'francis', nombre: 'Francis Jeremy', foto: 'francisjeremy.jpeg', recorte: [0.65, 0.4, 0.68], pelo: '#3a2618', peinado: 'rapado',
  remera: '#c58b62', pantalon: '#efc94c', gordura: -0.18,
};
const FRASES = [
  'Vamo a surfear esas olas mano',
  'Cómo quedan unos cogollitos',
  'POLICÍA, ¡ABRA LA PUERTA!',
  '#under',
  'MUAJAJAJAJAJ',
];
const una = (l) => l[Math.floor(Math.random() * l.length)];

// Mangas tatuadas de los antebrazos (como en la foto): rosa, letras, estrellas y sombreado.
function manga(g, w, h, lado) {
  g.clearRect(0, 0, w, h);
  g.fillStyle = 'rgba(24,28,36,0.85)';
  g.strokeStyle = 'rgba(24,28,36,0.85)';
  g.lineWidth = w * 0.04;
  // Rosa arriba.
  const cx = w * 0.5;
  const cy = h * 0.2;
  for (let r = w * 0.32; r > w * 0.05; r -= w * 0.07) { g.beginPath(); g.arc(cx + (lado * r) * 0.08, cy, r, 0.3, Math.PI * 1.75); g.stroke(); }
  for (const s of [-1, 1]) {
    g.beginPath(); g.ellipse(cx + s * w * 0.32, cy + h * 0.08, w * 0.16, w * 0.07, s * 0.6, 0, Math.PI * 2); g.fill();
  }
  // Letras verticales.
  g.font = `900 ${Math.round(w * 0.22)}px Georgia, serif`;
  g.textAlign = 'center';
  'UNDER'.split('').forEach((l, i) => g.fillText(l, w * 0.5, h * (0.42 + i * 0.1)));
  // Estrellitas y sombreado de puntos.
  for (let i = 0; i < 3; i++) {
    const x = w * (0.18 + i * 0.32);
    const y = h * 0.92;
    g.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
      const r = k % 2 ? w * 0.05 : w * 0.11;
      g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
  }
  g.fillStyle = 'rgba(24,28,36,0.25)';
  for (let i = 0; i < 160; i++) g.fillRect(((i * 37) % w), h * 0.3 + ((i * 53) % (h * 0.6)), 2, 2);
}

// Cuerpo: torso desnudo con la piel pintada (pectorales y abdominales marcados de flaco) y el
// tatuaje del abdomen de la foto; antebrazos tatuados; bermuda a cuadros; descalzo; las rastas.
async function crearFrancis() {
  const cab = await cargarCabeza(FRANCIS);
  const piel = cab.piel || FRANCIS.remera;
  const tatu = await cargarImagen('assets/ropa/francis_tatu_panza.png');
  const p = {
    ...FRANCIS,
    remera: piel,
    detallar: ({ cuerpo, cabeza, brazoI, brazoD, torso, anchoTorso: A, fondoTorso: D, matPiel, extras }) => {
      const base = matPiel.color.getStyle();
      const frente = lienzo(256, 256, (g, w, h) => {
        g.fillStyle = base;
        g.fillRect(0, 0, w, h);
        const sombra = (x, y, rx, ry, a) => {
          const r = g.createRadialGradient(x * w, y * h, 0, x * w, y * h, Math.max(rx * w, ry * h));
          r.addColorStop(0, `rgba(90,45,20,${a})`);
          r.addColorStop(1, 'rgba(90,45,20,0)');
          g.fillStyle = r;
          g.fillRect(0, 0, w, h);
        };
        // Pectorales (línea de abajo), abdominales y la V de la cadera.
        g.strokeStyle = 'rgba(95,50,25,0.4)';
        g.lineWidth = 5;
        g.lineCap = 'round';
        for (const s of [-1, 1]) {
          g.beginPath(); g.moveTo(w * 0.5, h * 0.36); g.quadraticCurveTo(w * (0.5 + s * 0.22), h * 0.42, w * (0.5 + s * 0.4), h * 0.24); g.stroke();
          g.beginPath(); g.moveTo(w * (0.5 + s * 0.3), h * 0.66); g.lineTo(w * (0.5 + s * 0.08), h * 0.98); g.stroke();
        }
        g.lineWidth = 3;
        g.beginPath(); g.moveTo(w * 0.5, h * 0.38); g.lineTo(w * 0.5, h * 0.92); g.stroke();
        for (const y of [0.56, 0.7, 0.83]) { g.beginPath(); g.moveTo(w * 0.38, h * y); g.lineTo(w * 0.62, h * y); g.stroke(); }
        sombra(0.5, 0.94, 0.06, 0.03, 0.5); // ombligo
        for (const s of [-1, 1]) {
          g.fillStyle = 'rgba(120,60,40,0.55)';
          g.beginPath(); g.arc(w * (0.5 + s * 0.24), h * 0.3, 4, 0, Math.PI * 2); g.fill();
        }
        // El tatuaje del abdomen (texto gótico y el felino), justo abajo del pecho.
        if (tatu) g.drawImage(tatu, w * 0.18, h * 0.42, w * 0.64, h * 0.36);
      });
      const lado = new THREE.MeshBasicMaterial({ color: matPiel.color });
      const mFrente = new THREE.MeshBasicMaterial({ map: textura(frente) });
      extras.push(lado, mFrente, mFrente.map);
      torso.material = [lado, lado, lado, lado, mFrente, lado];
      // Brazos de piel (sin remera) y las mangas tatuadas en los antebrazos.
      for (const [brazo, s] of [[brazoI, -1], [brazoD, 1]]) {
        brazo.traverse((o) => { if (o.isMesh && !Array.isArray(o.material) && o.material !== matPiel) o.material = matPiel; });
        const c = lienzo(64, 160, (g, w, h) => manga(g, w, h, s));
        const mt = new THREE.MeshBasicMaterial({ map: textura(c), transparent: true, depthWrite: false });
        extras.push(mt, mt.map);
        for (const [dx, ry] of [[0, 0], [s * 0.5, s * Math.PI / 2]]) {
          const t = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.95), mt);
          t.position.set(dx, -0.48, dx ? 0 : 0.5);
          t.rotation.y = ry;
          brazo.codo.add(t);
        }
      }
      // Rastas: caen de arriba de la cabeza por los costados y la nuca (rubias, con la raíz
      // oscura), algunas sobre los hombros. Ninguna tapa la cara.
      const rnd = aleatorio(21);
      const pila = new Pila();
      const yc = cabeza.position.y;
      const puntos = [];
      for (let i = 0; i < 9; i++) puntos.push([-0.62 + i * 0.155, -0.6]); // nuca
      for (const s of [-1, 1]) for (let i = 0; i < 5; i++) puntos.push([s * 0.62, -0.5 + i * 0.22]); // costados
      for (const s of [-1, 1]) puntos.push([s * 0.5, 0.48]); // sienes (adelante de las orejas)
      for (const [x, z] of puntos) {
        const largo = 1.5 + rnd() * 0.9;
        const r = new THREE.BoxGeometry(0.17, largo, 0.17);
        r.translate(0, -largo / 2, 0);
        r.rotateZ(Math.sign(x) * (0.06 + rnd() * 0.1));
        r.rotateX(z < 0 ? 0.12 : -0.04);
        r.translate(x * 1.04, yc + 0.6, z * 1.04);
        pila.agregar(r, rnd() < 0.5 ? '#b5834a' : '#a7743d');
        const raiz = new THREE.BoxGeometry(0.19, 0.32, 0.19);
        raiz.translate(x * 1.04, yc + 0.48, z * 1.04);
        pila.agregar(raiz, '#3a2618');
      }
      for (let i = 0; i < 7; i++) {
        // Coronilla: rastas recogidas para atrás.
        const r = new THREE.BoxGeometry(0.18, 0.18, 1.1);
        r.translate(-0.45 + i * 0.15, yc + 0.7, -0.15);
        pila.agregar(r, '#3a2618');
      }
      const matR = new THREE.MeshLambertMaterial({ vertexColors: true });
      extras.push(matR);
      cuerpo.add(pila.malla(matR));
    },
  };
  const m = crearPersonaje(p, cab);
  // Bermuda a cuadros (solo los muslos) y descalzo: de la rodilla para abajo, piel.
  const cuadros = new THREE.MeshLambertMaterial({ map: texCuadros() });
  const piernaPiel = new THREE.MeshBasicMaterial({ color: new THREE.Color(piel).multiplyScalar(0.87) });
  for (const pi of [m.partes.piernaI, m.partes.piernaD]) {
    pi.muslo.children.forEach((o) => { if (o.isMesh) o.material = cuadros; });
    pi.rodilla.children.forEach((o) => { if (o.isMesh) o.material = piernaPiel; });
  }
  return { m, cab };
}

export class Playa {
  constructor({ escena, colisiones, estado, ui, guardar }) {
    this.escena = escena;
    this.estado = estado;
    this.ui = ui;
    this.guardar = guardar;
    this.uT = { value: 0 };
    this.reloj = 0;
    this.grupo = new THREE.Group();
    escena.add(this.grupo);
    this.colisiones = colisiones;
    this.armar(colisiones);
    this.crearFrancis();
  }

  armar(colisiones) {
    const rnd = aleatorio(55);
    const g = this.grupo;
    const solido = (x0, y0, z0, x1, y1, z1, extra = {}) => {
      const b = new THREE.Box3(new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x1, y1, z1));
      Object.assign(b, extra);
      colisiones.push(b);
      return b;
    };
    // Arena (de la vereda a la orilla, un poco abajo del agua) y la franja mojada.
    const arena = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO_PLAYA, O + 3 - P.z0), new THREE.MeshLambertMaterial({ map: texArena() }));
    arena.material.map.repeat.set(ANCHO_PLAYA / 14, (O + 3 - P.z0) / 14);
    arena.rotation.x = -Math.PI / 2;
    arena.position.set((P.x0 + P.x1) / 2, 0.06, (P.z0 + O + 3) / 2);
    g.add(arena);
    const mojada = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO_PLAYA, 9), new THREE.MeshBasicMaterial({ map: texMojada(), transparent: true, depthWrite: false }));
    mojada.rotation.x = -Math.PI / 2;
    mojada.position.set((P.x0 + P.x1) / 2, 0.08, O - 3.5);
    g.add(mojada);
    // El mar.
    this.mar = crearMar(this.uT);
    g.add(this.mar);
    // Espuma de la orilla (va y viene) y tres crestas de olas que llegan.
    const espuma = texEspuma();
    espuma.repeat.set(ANCHO_PLAYA / 40, 1);
    this.orilla = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO_PLAYA, 3.2), new THREE.MeshBasicMaterial({ map: espuma, transparent: true, depthWrite: false }));
    this.orilla.rotation.x = -Math.PI / 2;
    this.orilla.position.set((P.x0 + P.x1) / 2, Y_AGUA + 0.02, O);
    this.orilla.renderOrder = 2;
    g.add(this.orilla);
    this.crestas = [0, 1, 2].map((i) => {
      const t = espuma.clone();
      t.repeat.set(ANCHO_PLAYA / 55, 1);
      t.offset.x = i * 0.37;
      t.needsUpdate = true;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO_PLAYA + 200, 1.8), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      m.position.set((P.x0 + P.x1) / 2, Y_AGUA + 0.03, O + 20);
      m.renderOrder = 2;
      g.add(m);
      return { m, fase: i / 3 };
    });

    const pila = new Pila();
    const hojas = new Pila();
    // Fuera de la playa (los costados de la bahía): la orilla es de piedras.
    const rocas = [];
    for (let x = P.mar.x0; x < P.mar.x1; x += 5) {
      if (x > P.x0 - 4 && x < P.x1 + 4) continue;
      rocas.push([x + rnd() * 3, O - 1 + rnd() * 3, 0.8 + rnd() * 1.4]);
    }
    const geoRoca = new THREE.DodecahedronGeometry(1, 0);
    const piedras = new THREE.InstancedMesh(geoRoca, new THREE.MeshLambertMaterial({ color: '#8a8780' }), rocas.length);
    const o = new THREE.Object3D();
    rocas.forEach(([x, z, s], i) => {
      o.position.set(x, s * 0.25, z);
      o.scale.set(s * 1.4, s * 0.8, s);
      o.rotation.set(rnd(), rnd() * 3, rnd());
      o.updateMatrix();
      piedras.setMatrixAt(i, o.matrix);
    });
    piedras.computeBoundingSphere();
    g.add(piedras);

    // Cantero tropical entre la vereda y la arena: pasto, palmeras y arbustos (con cortes en
    // el deck y frente al muelle).
    const zc0 = P.z0;
    const zc1 = P.z0 + 5;
    const cortes = [[-4, 4], [P.muelle.x - 5, P.muelle.x + 5]];
    const libre = (x) => !cortes.some(([a, b]) => x > a - 1 && x < b + 1);
    for (let x = P.x0; x < P.x1; x += 10) {
      const a = x;
      const b = Math.min(P.x1, x + 10);
      if (!libre((a + b) / 2)) continue;
      pila.caja(a, 0, zc0, b, 0.22, zc1, '#5f9e45');
      pila.caja(a, 0, zc1 - 0.15, b, 0.32, zc1 + 0.15, '#efe2c4'); // cordón
    }
    this.palmeras = [];
    const sombras = [];
    for (let x = P.x0 + 8; x < P.x1 - 6; x += 17) {
      if (!libre(x)) continue;
      const z = (zc0 + zc1) / 2 + (rnd() - 0.5) * 1.5;
      const copa = palmera(pila, hojas, x, z, 15 + rnd() * 5, rnd);
      this.palmeras.push(copa);
      sombras.push([x + 3, z + 4, 4.5, 2]);
      solido(x - 0.5, 0, z - 0.5, x + 0.5, 8, z + 0.5);
      arbusto(pila, x + 8, (zc0 + zc1) / 2, rnd);
    }
    // Más palmeras sueltas en la arena, en grupitos.
    for (const [x, z] of [[-250, O - 26], [-243, O - 21], [-120, O - 28], [118, O - 30], [125, O - 24], [300, O - 27], [420, O - 25], [428, O - 31], [540, O - 26]]) {
      const copa = palmera(pila, hojas, x, z, 13 + rnd() * 6, rnd);
      this.palmeras.push(copa);
      sombras.push([x + 3, z + 4, 4.5, 2]);
      solido(x - 0.5, 0, z - 0.5, x + 0.5, 8, z + 0.5);
    }
    // Deck de madera del portón de la mansión a la arena (con la senda peatonal en la calle).
    for (let z = 61.5; z < 74; z += 1.4) pila.caja(-4, 0.1, z, 4, 0.13, z + 0.8, '#f4f4f4');
    for (let z = P.z0 - 1.2; z < O - 12; z += 0.9) pila.caja(-3, 0.1, z, 3, 0.22, z + 0.8, z % 1.8 < 0.9 ? '#b98a5a' : '#ad7f50');
    for (const x of [-3.15, 3.15]) pila.caja(x - 0.15, 0.1, P.z0 - 1.2, x + 0.15, 0.3, O - 12, '#8d6440');
    // Faroles del deck (la luz se prende de noche).
    this.luces = [];
    for (let z = P.z0 + 6; z < O - 12; z += 9) {
      for (const x of [-3.6, 3.6]) {
        pila.caja(x - 0.1, 0, z - 0.1, x + 0.1, 3.4, z + 0.1, '#2b2b2b');
        this.luces.push([x, 3.5, z, 1.6]);
      }
    }
    // Bancos frente al agua, al final del deck.
    for (const x of [-12, 0, 12]) banco(pila, x, O - 13);
    for (const x of [-12, 12]) solido(x - 2, 0, O - 13.5, x + 2, 1.1, O - 12.5);
    // Reposeras y sombrillas pastel cerca del agua.
    let k = 0;
    for (let x = P.x0 + 30; x < P.x1 - 20; x += 38) {
      if (Math.abs(x) < 22 || Math.abs(x - P.muelle.x) < 14 || Math.abs(x - SPOT.x) < 10) continue;
      const z = O - 17 + (rnd() - 0.5) * 3;
      const color = PASTEL[k++ % PASTEL.length];
      sombrilla(pila, x, z - 0.6, color);
      reposera(pila, x - 1.4, z, PASTEL[(k + 2) % PASTEL.length]);
      reposera(pila, x + 1.4, z, PASTEL[(k + 3) % PASTEL.length]);
      sombras.push([x + 2, z + 2.2, 4.5, 3]);
      solido(x - 2.4, 0, z - 2.1, x + 2.4, 0.9, z + 1.5);
    }
    // Casilla del guardavidas (rosa y turquesa, como las de Miami).
    const gx = -150;
    const gz = O - 16;
    for (const [dx, dz] of [[-1.6, -1.4], [1.6, -1.4], [-1.6, 1.4], [1.6, 1.4]]) pila.caja(gx + dx - 0.15, 0, gz + dz - 0.15, gx + dx + 0.15, 4, gz + dz + 0.15, '#f5f5f2');
    pila.caja(gx - 2.4, 4, gz - 2.2, gx + 2.4, 4.3, gz + 2.6, '#f5f5f2');
    pila.caja(gx - 1.9, 4.3, gz - 1.7, gx + 1.9, 7.2, gz + 1.7, '#ff9ec4');
    pila.caja(gx - 1.95, 5.4, gz + 1.7, gx + 1.95, 6.6, gz + 1.75, '#2a5d73');
    pila.caja(gx - 2.3, 7.2, gz - 2.1, gx + 2.3, 7.5, gz + 2.1, '#3cd0c8');
    const rampa = new THREE.BoxGeometry(1.4, 0.2, 6.5);
    rampa.rotateX(0.62);
    rampa.translate(gx, 2.05, gz - 4.6);
    pila.agregar(rampa, '#e8d8b8');
    solido(gx - 2, 0, gz - 1.6, gx + 2, 4.3, gz + 1.6);
    this.luces.push([gx, 7.8, gz, 2]);

    // Muelle de madera: escalones en la arena, tablas, pilotes, barandas y un farol al final.
    const mx = P.muelle.x;
    const a = P.muelle.ancho / 2;
    const z0 = O - 9;
    const z1 = O + P.muelle.largo;
    const yd = 1.1;
    pila.caja(mx - a, 0, z0 - 2.4, mx + a, 0.4, z0 - 1.2, '#a8784a');
    pila.caja(mx - a, 0, z0 - 1.2, mx + a, 0.75, z0, '#a8784a');
    solido(mx - a, 0, z0 - 2.4, mx + a, 0.4, z0 - 1.2);
    solido(mx - a, 0, z0 - 1.2, mx + a, 0.75, z0);
    for (let z = z0; z < z1; z += 0.9) pila.caja(mx - a, yd - 0.2, z, mx + a, yd, z + 0.8, z % 1.8 < 0.9 ? '#b98a5a' : '#a77a4c');
    pila.caja(mx - a, yd - 0.45, z0, mx + a, yd - 0.2, z1, '#7a5634');
    solido(mx - a, 0, z0, mx + a, yd, z1);
    for (let z = z0 + 1; z <= z1; z += 4) {
      for (const s of [-1, 1]) {
        const x = mx + s * (a - 0.2);
        const pil = new THREE.CylinderGeometry(0.22, 0.22, yd + 3, 7);
        pil.translate(x, (yd - 3) / 2, z);
        pila.agregar(pil, '#6b4a2e');
        pila.caja(x - 0.1, yd, z - 0.1, x + 0.1, yd + 1.3, z + 0.1, '#8d6440');
      }
    }
    for (const s of [-1, 1]) {
      const x = mx + s * (a - 0.2);
      pila.caja(x - 0.08, yd + 1.1, z0, x + 0.08, yd + 1.3, z1, '#8d6440');
      solido(x - 0.25, yd, z0 + 0.5, x + 0.25, yd + 3, z1);
    }
    pila.caja(mx - a, yd + 1.1, z1 - 0.1, mx + a, yd + 1.3, z1 + 0.1, '#8d6440');
    solido(mx - a, yd, z1 - 0.3, mx + a, yd + 3, z1 + 0.3);
    pila.caja(mx - 0.12, yd, z1 - 1.2, mx + 0.12, yd + 4.5, z1 - 0.96, '#2b2b2b');
    this.luces.push([mx, yd + 4.6, z1 - 1.1, 2]);
    for (let z = z0 + 6; z < z1; z += 8) for (const s of [-1, 1]) this.luces.push([mx + s * (a - 0.2), yd + 1.45, z, 0.9]);

    // Mallas: lo liso y las hojas.
    const mLiso = new THREE.MeshLambertMaterial({ vertexColors: true });
    g.add(pila.malla(mLiso));
    g.add(hojas.malla(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })));
    // Sombras largas en la arena (una malla instanciada).
    const ms = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: texSombra(), transparent: true, depthWrite: false }), sombras.length);
    sombras.forEach(([x, z, w, d], i) => {
      o.position.set(x, 0.09, z);
      o.rotation.set(0, 0.6, 0);
      o.scale.set(w * 2, 1, d * 2);
      o.updateMatrix();
      ms.setMatrixAt(i, o.matrix);
    });
    ms.computeBoundingSphere();
    g.add(ms);

    // Luces de noche: en las copas y al pie de cada palmera (luz cálida que sube), los faroles
    // del deck y del muelle. Todas en un solo Points (un solo dibujo).
    for (const c of this.palmeras) {
      this.luces.push([c.x, c.y - 0.6, c.z, 2.6]);
    }
    const pos = new Float32Array(this.luces.length * 3);
    this.luces.forEach(([x, y, z], i) => pos.set([x, y, z], i * 3));
    const geoL = new THREE.BufferGeometry();
    geoL.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.puntosLuz = new THREE.Points(geoL, new THREE.PointsMaterial({ map: texBrillo(), size: 4.5, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: '#ffcf8a', opacity: 0 }));
    g.add(this.puntosLuz);
    // Reflejos de las luces de la mansión en el agua (tiras que tiemblan).
    const tr = texReflejo();
    this.reflejos = [];
    for (let x = -36; x <= 36; x += 12) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 70), new THREE.MeshBasicMaterial({ map: tr, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(x + (rnd() - 0.5) * 3, Y_AGUA + 0.04, O + 42);
      m.renderOrder = 3;
      g.add(m);
      this.reflejos.push(m);
    }
    // Paredes invisibles: hasta dónde se camina en el agua (con el hueco del muelle) y la orilla,
    // que solo frena al auto.
    const zv = O + P.vadeo;
    solido(P.mar.x0, 0, zv, mx - a, 12, zv + 1.5, { camara: false });
    solido(mx + a, 0, zv, P.mar.x1, 12, zv + 1.5, { camara: false });
    solido(P.mar.x0, 0, O - 2, P.mar.x1, 3, O - 0.5, { soloAutos: true, camara: false });
  }

  async crearFrancis() {
    const { m, cab } = await crearFrancis();
    this.cara = cab.frente;
    m.grupo.scale.setScalar(1.02);
    const etiqueta = crearEtiqueta([{ texto: 'Francis Jeremy', tam: 60, color: '#ffffff' }], 6);
    etiqueta.sprite.position.y = 7.6;
    m.grupo.add(etiqueta.sprite);
    this.grupo.add(m.grupo);
    // La tabla: sola en el mundo (abajo de él surfeando; clavada en la arena en la orilla).
    const geo = new THREE.SphereGeometry(1, 20, 8);
    geo.scale(3.3, 0.13, 0.9);
    const tabla = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: texTabla() }));
    this.grupo.add(tabla);
    this.francis = { m, etiqueta, tabla, estado: 'surf', t: 0, x: SPOT.x, z: O + 24, globo: 0, saludo: false, rumbo: 1, desde: null, espera: 0 };
  }

  // ---------- Charla y pócima ----------
  // Algún perro tirado ahora mismo (la opción de los perros solo aparece entonces: antes no se
  // tiene que saber nada).
  hayPerroTirado() {
    const e = this.estado;
    return Object.entries(e.perros || {}).some(([id, d]) => d.muerto != null && e.compras.includes(`perro_${id}`) && e.tiempoJugado - d.muerto <= 900);
  }

  perrosDesbloqueados() {
    return this.estado.compras.some((c) => c.startsWith('perro_'));
  }

  hablar(texto, toast = true) {
    const f = this.francis;
    f.etiqueta.actualizar([{ texto: 'Francis Jeremy', tam: 60, color: '#ffffff' }, { texto, tam: 40 }]);
    f.globo = 5;
    if (toast) this.ui.toast(`Francis Jeremy: "${texto}"`, 'info', 4000);
  }

  cerca(jugador, r = 4.5) {
    const f = this.francis;
    return f && f.estado === 'orilla' && Math.hypot(jugador.pos.x - f.x, jugador.pos.z - f.z) < r && jugador.pos.y < 3;
  }

  accion(jugador) {
    if (!this.cerca(jugador)) return '';
    return this.perrosDesbloqueados() ? 'Hablar con Francis Jeremy (E)' : 'Saludar a Francis Jeremy (E)';
  }

  // Devuelve true si abrió la charla (main.js frena los controles hasta que termina).
  hacer(jugador, alTerminar) {
    if (!this.cerca(jugador)) return false;
    if (!this.perrosDesbloqueados()) {
      this.hablar(una(FRASES));
      sfx.salto();
      return false;
    }
    this.charla(alTerminar);
    return true;
  }

  // La charla: con opciones. Para la pócima hay que contarle lo de los perros y no rechazarla;
  // las otras ramas terminan en nada.
  charla(fin) {
    const cara = this.cara.toDataURL();
    const decir = (lineas, opciones) => new Promise((res) => {
      this.ui.dialogo({ nombre: 'Francis Jeremy', cara, remera: '#c58b62', lineas, opciones: opciones?.map((o) => o[0]), alElegir: (i) => res(opciones[i][1]), alTerminar: () => res(null) });
    });
    const terminar = () => fin?.();
    const darPocima = async () => {
      if (this.estado.pocion) {
        await decir(['Ya tenés uno en el bolsillo, mano. Usalo primero, después volvé.']);
        return terminar();
      }
      this.estado.pocion = true;
      this.guardar();
      sfx.brillo();
      await decir(['Tomá, mano. Un menjunje de la abuela: algas, agua de mar y unos cogollitos. MUAJAJAJAJAJ', 'Se lo echás arriba al perrito y vuelve. Pero uno solo, eh, que no crece en los árboles.']);
      this.ui.toast('Conseguiste la pócima de Francis: dásela a un perro tirado (una por vez)', 'plata', 5000);
      return terminar();
    };
    (async () => {
      const r1 = await decir(['Qué onda mano, ¿qué hacés por acá? Vamo a surfear esas olas.'], [
        ['Vine a mirar el mar nomás', 'mar'],
        ['¿Me enseñás a surfear?', 'surf'],
        ['Ando medio bajón', 'bajon'],
      ]);
      if (r1 === 'mar') { await decir(['El mar cura todo, mano. Todo menos la policía. POLICÍA, ¡ABRA LA PUERTA! jajaja']); return terminar(); }
      if (r1 === 'surf') { await decir(['Primero hay que sentir la ola, mano. La ola te elige a vos.', 'Hoy no, que está picado. #under']); return terminar(); }
      if (r1 !== 'bajon') return terminar();
      const r2 = await decir(['¿Bajón? ¿Qué pasó, mano? Contame.'], [
        ['Se me cortó el wifi', 'wifi'],
        ['La Schwepa me hizo algo en casa', 'schwepa'],
        ['Nada, olvidate', 'nada'],
      ]);
      if (r2 === 'wifi') { await decir(['Eso no es bajón, mano. Salí a tomar sol. Cómo quedan unos cogollitos ahora...']); return terminar(); }
      if (r2 !== 'schwepa') { await decir(['Bueno mano, cualquier cosa estoy acá en el agua.']); return terminar(); }
      const r3 = await decir(['Uuuh, la Schwepa... ¿Qué te hizo esa rata?'], [
        ['Me robó la plata', 'plata'],
        this.hayPerroTirado() ? ['Mis perros... no se levantan más', 'perros'] : ['Me asustó nomás', 'susto'],
      ]);
      if (r3 === 'plata') { await decir(['La plata va y viene, mano. Como las olas. MUAJAJAJAJAJ']); return terminar(); }
      if (r3 !== 'perros') { await decir(['Tranqui mano, acá en la playa no entra. #under']); return terminar(); }
      const r4 = await decir(['No puede ser, mano... Escuchame. Yo algo tengo, pero no lo andes contando.'], [
        ['¿Qué tenés?', 'que'],
        ['Mejor no me metas en nada raro', 'no'],
      ]);
      if (r4 !== 'que') { await decir(['Vos te lo perdés, mano. #under']); return terminar(); }
      const r5 = await decir(['Una cosa que hacía mi abuela allá en el barrio. Pero te pido algo a cambio...'], [
        ['Dale, lo que quieras', 'dale'],
        ['Ni en pedo, eso es brujería', 'bruja'],
      ]);
      if (r5 === 'bruja') { await decir(['Brujería es lo que hace la Schwepa, mano. Bueno, si cambiás de idea, acá estoy.']); return terminar(); }
      await decir(['Que me grites bien fuerte: POLICÍA, ¡ABRA LA PUERTA!', 'jajaja no mano, es joda. Tomá.']);
      return darPocima();
    })();
  }

  // ---------- Cada cuadro ----------
  actualizar(dt, jugador, noche, aPie) {
    this.reloj += dt;
    const t = this.reloj;
    const enBarrio = Math.abs(jugador.pos.x) < 1600 && jugador.pos.z > -400;
    this.grupo.visible = enBarrio;
    if (!enBarrio) return;
    this.uT.value = t;
    // Espuma que va y viene y olas que llegan a la orilla (se apagan al llegar).
    this.orilla.position.z = O + Math.sin(t * 0.8) * 0.9;
    this.orilla.material.opacity = 0.7 + Math.sin(t * 0.8 + 1) * 0.25;
    for (const c of this.crestas) {
      const f = (t * 0.06 + c.fase) % 1;
      c.m.position.z = O + 2 + (1 - f) * 40;
      c.m.material.opacity = Math.sin(f * Math.PI) * 0.75;
      c.m.material.map.offset.x += dt * 0.01;
    }
    // De noche: luces cálidas y los reflejos en el agua.
    this.puntosLuz.material.opacity = THREE.MathUtils.clamp((noche - 0.3) / 0.5, 0, 1);
    for (const r of this.reflejos) {
      r.material.opacity = THREE.MathUtils.clamp((noche - 0.4) / 0.5, 0, 1) * 0.55;
      r.material.map.offset.y = (t * 0.15) % 1;
    }
    this.actualizarFrancis(dt, jugador, aPie);
  }

  actualizarFrancis(dt, jugador, aPie) {
    const f = this.francis;
    if (!f) return;
    f.t += dt;
    const g = f.m.grupo;
    const p = jugador.pos;
    const jugadorCerca = aPie && Math.hypot(p.x - SPOT.x, p.z - SPOT.z) < 30 && p.z > P.z0;
    if (f.globo > 0 && (f.globo -= dt) <= 0) f.etiqueta.actualizar([{ texto: 'Francis Jeremy', tam: 60, color: '#ffffff' }]);
    const surfPos = () => {
      // Va y viene a lo largo de la playa sobre la cresta, cerca de donde rompen las olas.
      const s = Math.sin(f.t * 0.11);
      return { x: SPOT.x + s * 85, z: O + 20 + Math.sin(f.t * 0.37) * 4, rumbo: Math.cos(f.t * 0.11) >= 0 ? 1 : -1 };
    };
    if (f.estado === 'surf') {
      const s = surfPos();
      f.x = s.x;
      f.z = s.z;
      f.rumbo = s.rumbo;
      if (jugadorCerca) { f.estado = 'yendo'; f.desde = { x: f.x, z: f.z }; f.paso = 0; }
    } else if (f.estado === 'yendo' || f.estado === 'volviendo') {
      f.paso += dt / 5;
      const k = Math.min(1, f.paso);
      const e = k * k * (3 - 2 * k);
      const hasta = f.estado === 'yendo' ? SPOT : surfPos();
      f.x = f.desde.x + (hasta.x - f.desde.x) * e;
      f.z = f.desde.z + (hasta.z - f.desde.z) * e;
      if (k >= 1) {
        if (f.estado === 'yendo') {
          f.estado = 'orilla';
          f.espera = 0;
          this.hablar(una(FRASES));
        } else f.estado = 'surf';
      }
    } else if (f.estado === 'orilla') {
      f.espera = jugadorCerca ? 0 : f.espera + dt;
      if (f.espera > 6) { f.estado = 'volviendo'; f.desde = { x: f.x, z: f.z }; f.paso = 0; }
    }
    const enAgua = f.z > O + 1;
    const ola = Math.sin(f.t * 2.2) * 0.12;
    const surfeando = f.estado === 'surf' || (enAgua && f.estado !== 'orilla');
    if (surfeando) {
      // Parado de costado sobre la tabla, rodillas flexionadas y los brazos abiertos.
      g.position.set(f.x, Y_AGUA + 0.28 + ola, f.z);
      g.rotation.set(0, f.rumbo > 0 ? -Math.PI / 2 + 0.25 : Math.PI / 2 - 0.25, Math.sin(f.t * 1.6) * 0.08);
      f.m.animar(dt, 0, true);
      const { piernaI, piernaD, brazoI, brazoD, cuerpo } = f.m.partes;
      for (const [pi, s] of [[piernaI, 1], [piernaD, -1]]) {
        pi.muslo.rotation.set(-0.55 + s * 0.35, 0, s * 0.18);
        pi.rodilla.rotation.x = 0.9;
        pi.muslo.position.y = 1.55;
      }
      cuerpo.position.y = 1.55;
      cuerpo.rotation.x = 0.28;
      brazoI.rotation.set(-0.2, 0, -1.25 + Math.sin(f.t * 1.4) * 0.15);
      brazoD.rotation.set(-0.2, 0, 1.25 - Math.sin(f.t * 1.4) * 0.15);
      f.tabla.position.set(f.x, Y_AGUA + 0.16 + ola, f.z);
      f.tabla.rotation.set(0, f.rumbo > 0 ? 0 : Math.PI, Math.sin(f.t * 1.6) * 0.06);
    } else {
      // En la arena: camina y después se queda parado, con la tabla clavada al lado.
      g.position.set(f.x, 0.06, f.z);
      const quieto = f.estado === 'orilla';
      const mira = quieto ? Math.atan2(p.x - f.x, p.z - f.z) : Math.atan2(SPOT.x - f.x, SPOT.z - f.z);
      g.rotation.set(0, mira, 0);
      f.m.animar(dt, quieto ? 0 : 6, true);
      f.tabla.position.set(f.x + 1.6, 3.1, f.z + 0.6);
      f.tabla.rotation.set(0, 0, Math.PI / 2 - 0.12);
    }
    // Te tira una frase cuando llegás al lado.
    const alLado = this.cerca(jugador, 7);
    if (alLado && !f.saludo && f.globo <= 0) this.hablar(una(FRASES));
    f.saludo = alLado;
  }
}
