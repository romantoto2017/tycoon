// Objetos especiales de la Vecibanda (pedestales en el camino de entrada),
// cuadros en los pasillos y el cartel final.
import { nivel, PASILLO, GARAGE as G } from './constantes.js';
import { GROSOR_INT } from './arquitectura.js';

// Pedestales a los costados del camino de entrada: [x, z].
export const SLOTS_ESPECIALES = [[-8, 18], [8, 18], [-8, 26], [8, 26], [-8, 34], [8, 34], [-8, 42], [8, 42]];

// Cuadros: dos por piso en las paredes del hall; del noveno en adelante, otra fila más adentro.
export function slotCuadro(i) {
  return { piso: Math.floor(i / 2) % 4, lado: i % 2 === 0 ? -1 : 1, z: i < 8 ? -6 : -10.5 };
}

const FORMAS = [trofeo, estatua, guitarra, pelota, gnomo, heladera, tele, cohete];
const FORMAS_PROPIAS = { lapiz, papa, stm, boxer, flauta };

// Lápiz Staedtler azul, hexagonal, con punta de madera y mina negra, inclinado.
function lapiz(k, p) {
  const l = k.grupo();
  l.add(k.cilindro(0.22, 0.22, 3.6, '#2b6cc4', 0, 0, 0, 6));
  l.add(k.cilindro(0.225, 0.225, 0.5, '#1d1f22', 0, 2.05, 0, 6));
  l.add(k.cilindro(0.226, 0.226, 0.06, '#f5f5f5', 0, 1.78, 0, 6));
  const madera = k.cono(0.22, 0.6, '#e2c194', 0, -2.1, 0, 6);
  madera.rotation.x = Math.PI;
  l.add(madera);
  const mina = k.cono(0.075, 0.2, '#1d1f22', 0, -2.47, 0, 6);
  mina.rotation.x = Math.PI;
  l.add(mina);
  const texto = k.cartel('STAEDTLER  Mars Lumograph 100', 2.4, 0.2, '#ffffff', '#2b6cc4');
  texto.position.set(0, 0.3, 0.2);
  texto.rotation.z = Math.PI / 2;
  l.add(texto);
  l.position.y = 1.6;
  l.rotation.z = -1.0;
  p.add(l);
}

// Flauta dulce del pelado (la del video): verde lima, con la boquilla, los agujeros y el
// pie un poco más ancho, inclinada como cuando la levantó en la cancha.
function flauta(k, p) {
  const f = k.grupo();
  const verde = '#d4ee4e';
  const oscuro = '#a8c634';
  f.add(k.cilindro(0.2, 0.17, 2.6, verde, 0, 0, 0, 14)); // cuerpo
  f.add(k.cilindro(0.24, 0.2, 0.55, verde, 0, 1.55, 0, 14)); // cabeza
  f.add(k.cilindro(0.15, 0.24, 0.35, oscuro, 0, 1.98, 0, 14)); // boquilla
  f.add(k.cilindro(0.24, 0.17, 0.7, verde, 0, -1.65, 0, 14)); // pie
  f.add(k.cilindro(0.245, 0.245, 0.06, oscuro, 0, 1.28, 0, 14));
  f.add(k.cilindro(0.215, 0.215, 0.06, oscuro, 0, -1.3, 0, 14));
  f.add(k.caja(0.16, 0.12, 0.06, '#26300c', 0, 1.62, 0.23)); // la ventanita
  for (let n = 0; n < 7; n++) {
    const h = k.cilindro(0.06, 0.06, 0.05, '#26300c', 0, 0.9 - n * 0.32, 0.19 - n * 0.003, 10);
    h.rotation.x = Math.PI / 2;
    f.add(h);
  }
  f.position.y = 2.3;
  f.rotation.z = -0.5;
  f.rotation.x = 0.2;
  p.add(f);
}

// Papa podrida: la foto recortada en dos planos cruzados (se ve con volumen desde cualquier lado).
function papa(k, p) {
  for (const r of [0, Math.PI / 2]) {
    const m = k.imagen('assets/especiales/papa_podrida.png', 2.4, 2.35, { dosLados: true });
    m.position.y = 1.2;
    m.rotation.y = r;
    p.add(m);
  }
}

// Boxer Supreme (sin el paquete ni el fondo), flotando y girando sobre el pedestal.
function boxer(k, p) {
  for (const lado of [1, -1]) {
    const b = k.imagen('assets/especiales/boxer_supreme.png', 2.9, 2.64);
    b.position.set(0, 2, lado * 0.01);
    b.rotation.y = lado > 0 ? 0 : Math.PI;
    p.add(b);
  }
}

// STM de la Schwepa: la tarjeta parada en un soporte (datos personales tapados).
function stm(k, p) {
  p.add(k.caja(1.4, 0.3, 0.8, '#3a3f44', 0, 0.15, 0));
  for (const lado of [1, -1]) {
    const t = k.imagen('assets/especiales/stm_schwepa.png', 3.4, 2.15);
    t.position.set(0, 1.4, lado * 0.02);
    t.rotation.set(-0.08 * lado, lado > 0 ? 0 : Math.PI, 0);
    p.add(t);
  }
}

export function objetoEspecial(k, g, i, obj) {
  const [x, z] = SLOTS_ESPECIALES[i % SLOTS_ESPECIALES.length];
  g.add(k.cajaDe(x - 1.6, 0, z - 1.6, x + 1.6, 1.4, z + 1.6, '#f5f5f5'));
  g.add(k.noSolido(k.cajaDe(x - 1.75, 1.4, z - 1.75, x + 1.75, 1.6, z + 1.75, '#ffc928')));
  const pieza = k.grupo();
  (FORMAS_PROPIAS[obj.forma] || FORMAS[i % FORMAS.length])(k, pieza);
  pieza.position.set(x, 1.6, z);
  pieza.userData.girar = 0.6;
  pieza.userData.dinamico = true;
  g.add(pieza);
  const et = k.etiqueta([
    { texto: obj.nombre, tam: 52, color: '#ffd23f' },
    { texto: obj.descripcion || '', tam: 34 },
  ], 6);
  et.position.set(x, 7.4, z);
  g.add(et);
}

function trofeo(k, p) {
  p.add(k.caja(1.4, 0.4, 1.4, '#5d4037', 0, 0.2, 0));
  p.add(k.cilindro(0.2, 0.3, 1, '#ffc928', 0, 0.9, 0, 8));
  p.add(k.cilindro(1, 0.4, 1.6, '#ffc928', 0, 2.2, 0, 12));
  p.add(k.caja(0.3, 1, 0.2, '#ffc928', -1.1, 2.3, 0));
  p.add(k.caja(0.3, 1, 0.2, '#ffc928', 1.1, 2.3, 0));
}

function estatua(k, p) {
  const o = '#ffc928';
  p.add(k.caja(0.5, 1.2, 0.5, o, -0.28, 0.6, 0));
  p.add(k.caja(0.5, 1.2, 0.5, o, 0.28, 0.6, 0));
  p.add(k.caja(1.1, 1.2, 0.6, o, 0, 1.8, 0));
  p.add(k.caja(0.45, 1.2, 0.45, o, -0.8, 2.3, 0).rotateZ(-0.8));
  p.add(k.caja(0.45, 1.2, 0.45, o, 0.8, 1.8, 0));
  p.add(k.caja(0.75, 0.75, 0.75, o, 0, 2.8, 0));
}

function guitarra(k, p) {
  p.add(k.caja(1.6, 1.4, 0.4, '#e53935', 0, 0.9, 0));
  p.add(k.caja(1.2, 1, 0.4, '#e53935', 0, 2, 0));
  p.add(k.cilindro(0.3, 0.3, 0.42, '#212121', 0, 1.2, 0, 10).rotateX(Math.PI / 2));
  p.add(k.caja(0.3, 2.2, 0.3, '#5d4037', 0, 3.5, 0));
  p.add(k.caja(0.5, 0.6, 0.3, '#212121', 0, 4.8, 0));
}

function pelota(k, p) {
  p.add(k.esfera(1.3, '#fafafa', 0, 1.3, 0));
  p.add(k.cilindro(1.32, 1.32, 0.3, '#212121', 0, 1.3, 0, 16));
}

function gnomo(k, p) {
  p.add(k.cilindro(0.7, 0.9, 1.4, '#1e88e5', 0, 0.7, 0, 10));
  p.add(k.esfera(0.55, '#f1c27d', 0, 1.8, 0));
  p.add(k.caja(0.8, 0.7, 0.3, '#ffffff', 0, 1.5, 0.45));
  p.add(k.cono(0.65, 1.4, '#e53935', 0, 2.8, 0, 10));
}

function heladera(k, p) {
  p.add(k.caja(1.6, 3, 1.4, '#80cbc4', 0, 1.5, 0));
  p.add(k.caja(1.5, 0.08, 0.05, '#4db6ac', 0, 2, 0.72));
  p.add(k.caja(0.12, 0.8, 0.12, '#eeeeee', 0.55, 2.5, 0.75));
}

function tele(k, p) {
  p.add(k.caja(2.2, 1.8, 1.6, '#795548', 0, 0.9, 0));
  p.add(k.caja(1.6, 1.2, 0.05, k.brillo('#80deea'), -0.1, 0.95, 0.8));
  p.add(k.caja(0.08, 1.2, 0.08, '#9e9e9e', -0.4, 2.3, 0).rotateZ(0.5));
  p.add(k.caja(0.08, 1.2, 0.08, '#9e9e9e', 0.4, 2.3, 0).rotateZ(-0.5));
}

function cohete(k, p) {
  p.add(k.cilindro(0.6, 0.6, 2.6, '#eeeeee', 0, 1.5, 0, 10));
  p.add(k.cono(0.6, 1.2, '#e53935', 0, 3.4, 0, 10));
  p.add(k.esfera(0.3, '#4fc3f7', 0, 2.2, 0.5));
  [0, 1, 2].forEach((i) => {
    const a = (i / 3) * Math.PI * 2;
    p.add(k.caja(0.1, 0.9, 0.7, '#e53935', Math.sin(a) * 0.65, 0.5, Math.cos(a) * 0.65).rotateY(a + Math.PI / 2));
  });
}

// Sin cartel con el nombre (así lo pidió el dueño del juego).
export function cuadro(k, g, i, datos) {
  const { piso, lado, z } = slotCuadro(i);
  const p = k.pintura(datos.archivo, 2.6, { carpeta: 'cuadros', marco: '#1d1f22' });
  p.position.set(lado * (8 - GROSOR_INT / 2 - 0.08), nivel(piso) + 4.7, z);
  p.rotation.y = -lado * Math.PI / 2;
  g.add(p);
}

export function cartelFinal(k, g) {
  const y = nivel(4);
  [-18, 18].forEach((x) => g.add(k.cajaDe(x - 0.6, y, -2, x + 0.6, y + 3.4, -0.8, '#263238')));
  g.add(k.cajaDe(-26, y + 3, -0.8, 26, y + 14, -0.2, '#c62828'));
  const cartel = k.cartel('LA VECIBANDA HOUSE', 50, 10, '#ffd23f', '#b71c1c');
  cartel.position.set(0, y + 8.5, -0.18);
  g.add(cartel);
  for (let i = 0; i <= 32; i++) {
    const bx = -25.6 + i * (51.2 / 32);
    const c = i % 2 ? '#fff59d' : '#ffffff';
    g.add(k.noSolido(k.cajaDe(bx - 0.3, y + 3.15, -0.2, bx + 0.3, y + 3.75, 0.05, k.brillo(c))));
    g.add(k.noSolido(k.cajaDe(bx - 0.3, y + 13.25, -0.2, bx + 0.3, y + 13.85, 0.05, k.brillo(c))));
  }
}

// ---------- Obras de arte (pasillos) ----------

// Dos por piso, en la pared del pasillo que da a las habitaciones del frente.
export function slotObra(i) {
  return { piso: Math.floor(i / 2) % 4, lado: i % 2 === 0 ? -1 : 1 };
}

export function obra(k, g, i, datos) {
  const { piso, lado } = slotObra(i);
  const p = datos.carpeta ? k.pintura(datos.archivo, 3.4, { carpeta: datos.carpeta, marco: '#1d1f22' }) : k.pintura(datos.archivo, 3);
  p.position.set(lado * 26, nivel(piso) + 4.6, PASILLO.z1 - GROSOR_INT / 2 - 0.08);
  p.rotation.y = Math.PI;
  g.add(p);
  if (!datos.cartel) return; // los de la Vecibanda no llevan cartel
  const cartel = k.cartel(datos.nombre, 4, 0.45, '#ffffff', '#24282c');
  cartel.position.set(lado * 26, nivel(piso) + 2.3, PASILLO.z1 - GROSOR_INT / 2 - 0.02);
  cartel.rotation.y = Math.PI;
  g.add(cartel);
}

// ---------- Lujos ----------

// Armero en la pared del garage: tablero, dos ganchos que salen de la pared y el AK-47
// apoyado de costado arriba de ellos (se ve entero desde adentro del garage).
export function armero(k, g) {
  const pared = G.x1 - 0.5;
  const zc = G.z0 + 14;
  const y = 4;
  const escala = 1.35;
  g.add(k.cajaDe(pared - 0.12, 2.4, zc - 3.2, pared, 6.4, zc + 3.2, '#d6d1c8'));
  g.add(k.noSolido(k.cajaDe(pared - 0.14, 2.4, zc - 3.2, pared - 0.12, 2.55, zc + 3.2, '#8a4b22')));
  g.add(k.noSolido(k.cajaDe(pared - 0.14, 6.25, zc - 3.2, pared - 0.12, 6.4, zc + 3.2, '#8a4b22')));
  // El arma: cañón hacia +z, de costado contra el tablero. Su centro está ~0,6 adelante del origen.
  const ak = k.ak47();
  ak.scale.setScalar(escala);
  ak.position.set(pared - 0.42, y, zc - 0.6 * escala);
  g.add(ak);
  // Ganchos debajo de la culata y del guardamanos (salen de la pared y doblan hacia arriba).
  for (const dz of [-0.75, 1.1]) {
    const z = ak.position.z + dz * escala;
    g.add(k.noSolido(k.cajaDe(pared - 0.62, y - 0.22, z - 0.08, pared - 0.12, y - 0.1, z + 0.08, '#c9ced3')));
    g.add(k.noSolido(k.cajaDe(pared - 0.68, y - 0.22, z - 0.08, pared - 0.58, y + 0.18, z + 0.08, '#c9ced3')));
  }
  const cartel = k.cartel('ANTI SCHWEPA', 3.6, 0.6, '#ffffff', '#b71c1c');
  cartel.position.set(pared - 0.15, 5.7, zc);
  cartel.rotation.y = -Math.PI / 2;
  g.add(cartel);
}

// Nico de cartón en tamaño real, en el hall, mirando hacia la puerta. Atrás: cartón y una pata.
export function nicoCarton(k, g) {
  const alto = 5.4;
  const ancho = alto * 516 / 610;
  const p = k.grupo();
  const frente = k.imagen('assets/especiales/nico_frente.png', ancho, alto);
  frente.position.set(0, alto / 2 + 0.05, 0.02);
  const dorso = k.imagen('assets/especiales/nico_dorso.png', ancho, alto);
  dorso.position.set(0, alto / 2 + 0.05, -0.02);
  dorso.rotation.y = Math.PI;
  const pata = k.noSolido(k.caja(0.6, 2.8, 0.05, '#b0885c', 0, 1.3, -0.6));
  pata.rotation.x = 0.45;
  p.add(frente, dorso, pata);
  p.position.set(4.6, nivel(0), -2.8);
  p.rotation.y = -0.45;
  g.add(p);
}

const MARMOL = '#f1efe9';

function pedestal(k, g, x, y, z) {
  g.add(k.cajaDe(x - 0.9, y, z - 0.9, x + 0.9, y + 0.25, z + 0.9, '#d4d0c6'));
  g.add(k.cajaDe(x - 0.7, y + 0.25, z - 0.7, x + 0.7, y + 1.4, z + 0.7, '#e2ded5'));
  g.add(k.cajaDe(x - 0.85, y + 1.4, z - 0.85, x + 0.85, y + 1.6, z + 0.85, '#d4d0c6'));
}

// Dos estatuas de mármol a los lados de la puerta: un atleta y una Venus sin brazos.
export function estatuas(k, g) {
  const m = k.tex('estuco', MARMOL, 1.5);
  const y = 0.4;
  const z = 1.8;
  const c = (x0, y0, z0, x1, y1, z1) => g.add(k.noSolido(k.cajaDe(x0, y0, z0, x1, y1, z1, m)));
  // Atleta.
  let x = -6.6;
  pedestal(k, g, x, y, z);
  let b = y + 1.6;
  c(x - 0.45, b, z - 0.2, x - 0.1, b + 2.2, z + 0.2);
  c(x + 0.1, b, z - 0.05, x + 0.45, b + 2.1, z + 0.35);
  c(x - 0.55, b + 1.8, z - 0.3, x + 0.55, b + 2.5, z + 0.3);
  c(x - 0.55, b + 2.5, z - 0.28, x + 0.55, b + 3.8, z + 0.28);
  c(x - 0.85, b + 2.4, z - 0.15, x - 0.55, b + 3.7, z + 0.15);
  c(x + 0.55, b + 3.2, z - 0.15, x + 0.85, b + 3.8, z + 0.15);
  c(x + 0.6, b + 3.8, z - 0.15, x + 0.9, b + 4.5, z + 0.15);
  c(x - 0.12, b + 3.8, z - 0.12, x + 0.12, b + 4, z + 0.12);
  c(x - 0.3, b + 4, z - 0.3, x + 0.3, b + 4.6, z + 0.3);
  // Venus.
  x = 6.6;
  pedestal(k, g, x, y, z);
  c(x - 0.6, b, z - 0.4, x + 0.6, b + 2.3, z + 0.4);
  c(x - 0.5, b + 2.3, z - 0.25, x + 0.5, b + 3.7, z + 0.25);
  c(x - 0.62, b + 3.3, z - 0.15, x - 0.5, b + 3.6, z + 0.15);
  c(x + 0.5, b + 3.3, z - 0.15, x + 0.62, b + 3.6, z + 0.15);
  c(x - 0.12, b + 3.7, z - 0.12, x + 0.12, b + 3.9, z + 0.12);
  c(x - 0.28, b + 3.9, z - 0.3, x + 0.28, b + 4.5, z + 0.28);
  c(x - 0.25, b + 4.4, z - 0.45, x + 0.25, b + 4.65, z - 0.1);
}

// Piano de cola en el fondo del hall de planta baja.
export function piano(k, g) {
  const y = nivel(0);
  const negro = '#111214';
  g.add(k.cajaDe(4.4, y + 1.5, -33.2, 7.4, y + 2.4, -30, negro));
  g.add(k.cilindro(1.5, 1.5, 0.9, negro, 6.1, y + 1.95, -33, 16));
  const tapa = k.noSolido(k.caja(3, 0.08, 3.4, negro, 5.9, y + 3.2, -31.7));
  tapa.rotation.z = 0.55;
  g.add(tapa);
  g.add(k.noSolido(k.cajaDe(4.35, y + 2.4, -31.5, 4.45, y + 3.9, -31.4, negro)));
  g.add(k.cajaDe(3.7, y + 1.9, -32.8, 4.4, y + 2.05, -30.4, '#fafafa'));
  for (let i = 0; i < 10; i++) {
    const z = -32.6 + i * 0.23;
    if (i % 7 === 2 || i % 7 === 6) continue;
    g.add(k.noSolido(k.cajaDe(3.9, y + 2.05, z, 4.4, y + 2.15, z + 0.12, negro)));
  }
  [[4.7, -32.9], [4.7, -30.3], [7.1, -33]].forEach(([x, z]) => g.add(k.cilindro(0.12, 0.12, 1.5, negro, x, y + 0.75, z, 8)));
  g.add(k.cajaDe(2.4, y + 0.9, -32.2, 3.2, y + 1.2, -31, negro));
  g.add(k.noSolido(k.cajaDe(2.5, y, -32.1, 2.6, y + 0.9, -31.1, negro)));
  g.add(k.noSolido(k.cajaDe(3, y, -32.1, 3.1, y + 0.9, -31.1, negro)));
}

// Esqueleto de T-Rex sobre una base, en el jardín delantero.
export function trex(k, g) {
  const hueso = '#e8dfc8';
  g.add(k.cajaDe(-42, 0, 38, -26, 0.5, 46, k.tex('concreto', '#a7aaad', 3)));
  const h = (x0, y0, z0, x1, y1, z1) => g.add(k.noSolido(k.cajaDe(x0, y0, z0, x1, y1, z1, hueso)));
  // Columna: de la cola (x -41) al cuello (x -30).
  for (let i = 0; i < 14; i++) {
    const x = -41 + i * 0.85;
    const y = 4.2 + Math.sin((i / 13) * Math.PI) * 2.4 + i * 0.12;
    const t = 0.25 + Math.min(i, 9) * 0.05;
    h(x, y - t, 42 - t, x + 0.7, y + t, 42 + t);
    if (i > 4 && i < 11) h(x + 0.25, y + t, 41.9, x + 0.45, y + t + 0.6, 42.1);
  }
  // Costillas.
  for (let i = 0; i < 6; i++) {
    const x = -36 + i * 0.85;
    h(x, 4.2, 41.1, x + 0.15, 6.4, 41.25);
    h(x, 4.2, 42.75, x + 0.15, 6.4, 42.9);
    h(x, 4.1, 41.1, x + 0.15, 4.3, 42.9);
  }
  // Cuello y cráneo.
  h(-30.2, 6.6, 41.6, -28.8, 7.4, 42.4);
  h(-28.9, 6.6, 41.4, -26.6, 8, 42.6);
  h(-28.9, 5.9, 41.5, -26.8, 6.4, 42.5);
  for (let i = 0; i < 5; i++) h(-28.7 + i * 0.4, 6.4, 41.5, -28.55 + i * 0.4, 6.65, 42.5);
  h(-27.6, 7.3, 41.35, -27.2, 7.7, 41.45);
  // Patas traseras y brazitos.
  for (const z of [41.2, 42.5]) {
    h(-35.6, 2.4, z, -34.6, 5.2, z + 0.3);
    h(-35.2, 0.5, z, -34.6, 2.6, z + 0.3);
    h(-35.6, 0.5, z - 0.2, -33.6, 0.8, z + 0.5);
  }
  h(-31.2, 4.8, 41.3, -30.9, 5.8, 41.45);
  h(-31.2, 4.8, 42.55, -30.9, 5.8, 42.7);
  const placa = k.cartel('TYRANNOSAURUS REX', 5, 0.6, '#ffd23f', '#24282c');
  placa.position.set(-34, 0.3, 46.02);
  g.add(placa);
}

// Bóveda de oro en el garage: una cámara de acero con la puerta redonda gigante abierta (con
// el volante, los pernos y la bisagra), estantes llenos de lingotes, pilas de monedas y bolsas
// de plata adentro, luz dorada, y afuera una tarima con una pirámide de lingotes y el cartel.
let oroBoveda = null;
export function boveda(k, gg) {
  const THREE = k.THREE;
  // Dibujada para un garage que empezaba en (49, 2): se corre con el garage.
  const g = k.grupo();
  g.position.set(G.x0 - 49, 0, G.z0 - 2);
  gg.add(g);
  oroBoveda ??= new THREE.MeshPhongMaterial({ color: '#e3a91f', specular: '#fff2b0', shininess: 90, emissive: '#3a2600' });
  const oro = oroBoveda;
  const acero = '#7d868c';
  const aceroOscuro = '#4f575d';
  // Lingote (trapecio) de 0.9 x 0.32 x 0.45, apoyado en y = 0.
  const lingote = () => {
    const s = new THREE.Shape([new THREE.Vector2(-0.225, 0), new THREE.Vector2(0.225, 0), new THREE.Vector2(0.16, 0.32), new THREE.Vector2(-0.16, 0.32)]);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.9, bevelEnabled: false });
    geo.translate(0, 0, -0.45);
    return geo;
  };
  const lingotes = [];
  const ponerLingote = (x, y, z, rotY = 0) => lingotes.push(lingote().rotateY(rotY).translate(x, y, z));
  const monedas = [];
  const pilaMonedas = (x, y, z, n) => {
    for (let i = 0; i < n; i++) monedas.push(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 12).translate(x + (i % 3) * 0.02, y + 0.03 + i * 0.065, z));
  };

  // ---- Cámara de acero (x 49.6..55.6, z 2.5..9.5), abierta hacia el garage (+x) ----
  g.add(k.cajaDe(49.6, 0, 9.1, 55.6, 6, 9.5, acero));
  g.add(k.cajaDe(55.2, 0, 2.5, 55.6, 6, 4.6, acero));
  g.add(k.cajaDe(55.2, 0, 7.4, 55.6, 6, 9.5, acero));
  g.add(k.cajaDe(55.2, 4.2, 4.6, 55.6, 6, 7.4, acero));
  g.add(k.cajaDe(49.6, 6, 2.5, 55.6, 6.3, 9.5, aceroOscuro));
  g.add(k.noSolido(k.cajaDe(49.6, 0.1, 2.5, 55.2, 0.14, 9.1, '#3a3f44')));
  // Marco redondo de la puerta (aro grueso alrededor del hueco).
  const aro = k.noSolido(new THREE.Mesh(new THREE.TorusGeometry(1.95, 0.28, 8, 28), k.material('#aab3b9')));
  aro.position.set(55.75, 2.3, 6);
  aro.rotation.y = Math.PI / 2;
  g.add(aro);
  // Luz dorada adentro.
  g.add(k.noSolido(k.cajaDe(50.2, 5.8, 3.0, 54.8, 5.95, 8.6, k.brillo('#fff1c4'))));
  // La puerta redonda, abierta 90° (bisagra en el lado de +z del hueco).
  const puerta = k.grupo();
  puerta.position.set(55.75, 2.3, 8.0);
  const disco = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 0.55, 28), k.material('#b8c1c7'));
  disco.rotation.x = Math.PI / 2;
  disco.position.x = 1.95;
  puerta.add(disco);
  const anillo = k.noSolido(new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.08, 6, 24), k.material('#6b747a')));
  anillo.position.set(1.95, 0, -0.3);
  puerta.add(anillo);
  // Volante con rayos y los pernos alrededor del borde.
  const volante = k.noSolido(new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.07, 6, 18), k.material('#d0d6da')));
  volante.position.set(1.95, 0, -0.45);
  puerta.add(volante);
  for (let i = 0; i < 3; i++) {
    const rayo = k.noSolido(k.caja(1.3, 0.1, 0.1, '#d0d6da', 1.95, 0, -0.45));
    rayo.rotation.z = (i * Math.PI) / 3;
    puerta.add(rayo);
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const perno = k.noSolido(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.5, 8), k.material('#8d969c')));
    perno.rotation.x = Math.PI / 2;
    perno.position.set(1.95 + Math.cos(a) * 1.68, Math.sin(a) * 1.68, -0.1);
    puerta.add(perno);
  }
  puerta.add(k.caja(0.5, 1.6, 0.6, aceroOscuro, 0.1, 0, 0));
  g.add(puerta);
  // Teclado de la clave al costado del hueco.
  g.add(k.noSolido(k.cajaDe(55.6, 2.6, 3.4, 55.7, 3.4, 4.0, '#24282c')));
  g.add(k.noSolido(k.cajaDe(55.7, 3.15, 3.5, 55.72, 3.3, 3.9, k.brillo('#3ee07a'))));
  // Cartel arriba del hueco.
  const cartel = k.cartel('BÓVEDA VECIBANDA', 4.4, 0.8, '#ffd23f', '#24282c');
  cartel.position.set(55.7, 5.1, 6);
  cartel.rotation.y = Math.PI / 2;
  g.add(cartel);

  // ---- Adentro: estantes con lingotes, monedas y bolsas ----
  for (const [x0, x1, z0, z1] of [[50, 54.9, 2.6, 3.5], [49.7, 50.6, 3.6, 8.9]]) {
    for (const y of [0, 1.5, 3.0]) {
      g.add(k.cajaDe(x0, y + 1.2, z0, x1, y + 1.32, z1, aceroOscuro));
      if (z1 - z0 < 1) for (let x = x0 + 0.5; x < x1 - 0.3; x += 0.55) { ponerLingote(x, y + 1.32, (z0 + z1) / 2, Math.PI / 2); ponerLingote(x + 0.05, y + 1.64, (z0 + z1) / 2, Math.PI / 2); }
      else for (let z = z0 + 0.5; z < z1 - 0.3; z += 0.55) { ponerLingote((x0 + x1) / 2, y + 1.32, z); ponerLingote((x0 + x1) / 2, y + 1.64, z + 0.05); }
    }
    for (const x of [x0, x1 - 0.1]) g.add(k.noSolido(k.cajaDe(x, 0, z0, x + 0.1, 4.5, z1, aceroOscuro)));
  }
  pilaMonedas(52.4, 0.14, 5.4, 14);
  pilaMonedas(52.9, 0.14, 5.9, 10);
  pilaMonedas(52.1, 0.14, 6.2, 18);
  // Montaña de monedas en el medio y bolsas con el signo $.
  const monte = new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.9, 16), oro);
  monte.position.set(53.2, 0.55, 7.6);
  g.add(monte);
  for (const [x, z] of [[51.4, 7.9], [54.3, 4.0], [51.2, 4.6]]) {
    const bolsa = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8), k.material('#c9b08a'));
    bolsa.scale.y = 1.1;
    bolsa.position.set(x, 0.6, z);
    g.add(bolsa);
    g.add(k.noSolido(k.cilindro(0.18, 0.28, 0.35, '#a8916b', x, 1.25, z, 8)));
    const signo = k.cartel('$', 0.45, 0.45, '#2e7d32', '#c9b08a');
    signo.position.set(x + 0.5, 0.7, z);
    signo.rotation.y = Math.PI / 2;
    g.add(signo);
  }

  // Los de adentro, en una sola malla que no choca (los estantes ya chocan).
  g.add(k.noSolido(new THREE.Mesh(k.unir(lingotes.splice(0)), oro)));

  // ---- Afuera: tarima con la pirámide de lingotes ----
  g.add(k.cajaDe(50.2, 0, 10.2, 54.8, 0.4, 14.5, '#8d6e4f'));
  for (let capa = 0; capa < 5; capa++) {
    for (let i = 0; i < 4 - Math.floor(capa / 2); i++) {
      for (let j = 0; j < 8 - capa; j++) {
        const x = 50.8 + (capa % 2) * 0.25 + i * 1.0;
        const z = 10.7 + capa * 0.25 + j * 0.5;
        if (x > 54.3) continue;
        ponerLingote(x, 0.4 + capa * 0.33, z + 0.22, capa % 2 ? 0 : 0);
      }
    }
  }
  pilaMonedas(54.4, 0.4, 14.1, 12);
  g.add(new THREE.Mesh(k.unir(lingotes), oro));
  g.add(k.noSolido(new THREE.Mesh(k.unir(monedas), oro)));
}

// Piscina infinita en la terraza: va del pabellón hasta el helipuerto y llega al borde de
// atrás de la terraza; el agua queda al ras del vidrio de ese borde y se derrama por afuera a
// una canaleta (desde adentro parece que el agua sigue hasta el horizonte). Escalones para
// subir, luces abajo del agua y un deck de madera adelante.
export function piscinaInfinita(k, g) {
  const y = nivel(4);
  const borde = k.tex('baldosa', '#eceae5', 1.5);
  const X0 = 7.6;
  const X1 = 22.4;
  const Z0 = -33.8; // el vidrio del borde de la terraza
  const Z1 = -6.8;
  const ALTO = 1.6;
  const AGUA = 1.42; // al ras del vidrio (1.3) + la baranda
  // Paredes de los costados y de adelante (la de atrás es el vidrio de la terraza).
  g.add(k.cajaDe(X0, y, Z0, X0 + 0.4, y + ALTO, Z1, borde));
  g.add(k.cajaDe(X1 - 0.4, y, Z0, X1, y + ALTO, Z1, borde));
  g.add(k.cajaDe(X0, y, Z1 - 0.4, X1, y + ALTO, Z1, borde));
  g.add(k.noSolido(k.cajaDe(X0 - 0.1, y + ALTO, Z1 - 0.5, X1 + 0.1, y + ALTO + 0.08, Z1 + 0.1, '#f7f5f0')));
  for (const x of [X0 - 0.1, X1 - 0.5]) g.add(k.noSolido(k.cajaDe(x, y + ALTO, Z0, x + 0.6, y + ALTO + 0.08, Z1, '#f7f5f0')));
  // Fondo celeste, el agua y las luces de adentro.
  g.add(k.noSolido(k.cajaDe(X0 + 0.4, y, Z0, X1 - 0.4, y + 0.1, Z1 - 0.4, k.tex('baldosa', '#3fb4e8', 1.2))));
  g.add(k.noSolido(k.cajaDe(X0 + 0.4, y + 0.1, Z0 + 0.2, X1 - 0.4, y + AGUA, Z1 - 0.4, k.agua)));
  for (let z = Z0 + 4; z < Z1 - 2; z += 6) {
    for (const x of [X0 + 0.42, X1 - 0.44]) g.add(k.noSolido(k.cajaDe(x, y + 0.6, z, x + 0.02, y + 0.85, z + 0.6, k.brillo('#b9f3ff'))));
  }
  // Derrame por afuera del borde: lámina de agua cayendo y la canaleta en el alero.
  const cae = k.cascada(X1 - X0 - 0.8, 1.2);
  cae.position.set((X0 + X1) / 2, y + 0.86, Z0 - 0.32);
  cae.rotation.y = Math.PI;
  g.add(cae);
  g.add(k.cajaDe(X0, y, -36.3, X1, y + 0.35, -34.15, borde));
  g.add(k.noSolido(k.cajaDe(X0 + 0.2, y + 0.35, -36.1, X1 - 0.2, y + 0.38, -34.35, k.agua)));
  // Escalones para subir (del lado del pabellón).
  g.add(k.cajaDe(6.25, y, -20, 6.9, y + 0.55, -14, borde));
  g.add(k.cajaDe(6.9, y, -20, X0, y + 1.1, -14, borde));
  g.add(k.noSolido(k.cajaDe(X0 + 0.4, y + 0.1, -19.5, X0 + 1.4, y + 0.9, -14.5, borde)));
  // Deck de madera adelante, con dos reposeras mirando al agua.
  g.add(k.noSolido(k.cajaDe(X0, y, Z1 + 0.1, X1, y + 0.12, Z1 + 3.2, '#a0714f')));
  for (let x = X0 + 0.5; x < X1; x += 0.8) g.add(k.noSolido(k.cajaDe(x, y + 0.12, Z1 + 0.1, x + 0.04, y + 0.13, Z1 + 3.2, '#7e5538')));
}

// Helipuerto (el helicóptero lo pone tycoon.js, porque se puede manejar).
export function helicoptero(k, g) {
  const y = nivel(4);
  const cx = 32;
  const cz = -20;
  g.add(k.cajaDe(23, y, -29, 41, y + 0.15, -11, '#3a3f44'));
  g.add(k.noSolido(k.cilindro(7, 7, 0.02, '#ffca28', cx, y + 0.16, cz, 32)));
  g.add(k.noSolido(k.cilindro(6.5, 6.5, 0.03, '#3a3f44', cx, y + 0.17, cz, 32)));
  const blanco = (x0, z0, x1, z1) => g.add(k.noSolido(k.cajaDe(x0, y + 0.15, z0, x1, y + 0.2, z1, '#fafafa')));
  blanco(cx - 2.5, cz - 3, cx - 1.5, cz + 3);
  blanco(cx + 1.5, cz - 3, cx + 2.5, cz + 3);
  blanco(cx - 1.5, cz - 0.5, cx + 1.5, cz + 0.5);
  // El helicóptero es aparte (helicoptero.js): se maneja.
}
