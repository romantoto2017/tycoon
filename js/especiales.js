// Objetos especiales de la Vecibanda (pedestales en el camino de entrada),
// cuadros en los pasillos y el cartel final.
import { nivel, PASILLO, GARAGE as G } from './constantes.js';

// Pedestales a los costados del camino de entrada: [x, z].
export const SLOTS_ESPECIALES = [[-8, 18], [8, 18], [-8, 26], [8, 26], [-8, 34], [8, 34], [-8, 42], [8, 42]];

// Cuadros: dos por piso en las paredes del hall; del noveno en adelante, otra fila más adentro.
export function slotCuadro(i) {
  return { piso: Math.floor(i / 2) % 4, lado: i % 2 === 0 ? -1 : 1, z: i < 8 ? -6 : -10.5 };
}

const FORMAS = [trofeo, estatua, guitarra, pelota, gnomo, heladera, tele, cohete];

export function objetoEspecial(k, g, i, obj) {
  const [x, z] = SLOTS_ESPECIALES[i % SLOTS_ESPECIALES.length];
  g.add(k.cajaDe(x - 1.6, 0, z - 1.6, x + 1.6, 1.4, z + 1.6, '#f5f5f5'));
  g.add(k.noSolido(k.cajaDe(x - 1.75, 1.4, z - 1.75, x + 1.75, 1.6, z + 1.75, '#ffc928')));
  const pieza = k.grupo();
  FORMAS[i % FORMAS.length](k, pieza);
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
  p.position.set(lado * 7.72, nivel(piso) + 4.7, z);
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
  const p = k.pintura(datos.archivo, 3);
  p.position.set(lado * 26, nivel(piso) + 4.6, PASILLO.z1 - 0.24);
  p.rotation.y = Math.PI;
  g.add(p);
  const cartel = k.cartel(datos.nombre, 4, 0.45, '#ffffff', '#24282c');
  cartel.position.set(lado * 26, nivel(piso) + 2.3, PASILLO.z1 - 0.23);
  cartel.rotation.y = Math.PI;
  g.add(cartel);
}

// ---------- Lujos ----------

// Armero en la pared del garage con el AK-47 colgado.
export function armero(k, g) {
  const x = G.x1 - 0.5;
  const z = G.z0 + 14;
  g.add(k.cajaDe(x - 0.15, 2.6, z - 2.2, x, 6.2, z + 2.2, '#4a5056'));
  g.add(k.noSolido(k.cajaDe(x - 0.45, 3.6, z - 1.6, x - 0.15, 3.8, z - 1.2, '#24282c')));
  g.add(k.noSolido(k.cajaDe(x - 0.45, 3.6, z + 1.2, x - 0.15, 3.8, z + 1.6, '#24282c')));
  const ak = k.ak47();
  ak.position.set(x - 0.4, 4.1, z - 0.3);
  g.add(ak);
  const cartel = k.cartel('ANTI SCHWEPA', 3.6, 0.6, '#ffffff', '#b71c1c');
  cartel.position.set(x - 0.17, 5.6, z);
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

// Bóveda con lingotes en el garage.
export function boveda(k, gg) {
  // Dibujada para un garage que empezaba en (49, 2): se corre con el garage.
  const g = k.grupo();
  g.position.set(G.x0 - 49, 0, G.z0 - 2);
  gg.add(g);
  const acero = '#7d868c';
  g.add(k.cajaDe(50, 0, 2.6, 54.2, 4.6, 6.4, acero));
  const puerta = k.cilindro(1.5, 1.5, 0.3, '#aab3b9', 52.1, 2.3, 6.55, 16);
  puerta.rotation.x = Math.PI / 2;
  g.add(puerta);
  for (const a of [0, Math.PI / 2]) {
    const rayo = k.noSolido(k.caja(1.8, 0.14, 0.14, '#5d6469', 52.1, 2.3, 6.75));
    rayo.rotation.z = a + Math.PI / 4;
    g.add(rayo);
  }
  g.add(k.cajaDe(50.3, 0, 9.5, 54.7, 0.4, 14.5, '#8d6e4f'));
  const oro = k.brillo('#f2c230');
  for (let capa = 0; capa < 4; capa++) {
    for (let i = 0; i < 4 - capa; i++) {
      for (let j = 0; j < 5 - capa; j++) {
        const x = 50.7 + capa * 0.45 + i * 0.9;
        const z = 9.9 + capa * 0.5 + j * 0.9;
        g.add(k.cajaDe(x, 0.4 + capa * 0.4, z, x + 0.8, 0.8 + capa * 0.4, z + 0.42, oro));
      }
    }
  }
}

// Piscina infinita en la terraza (con un lado de vidrio).
export function piscinaInfinita(k, g) {
  const y = nivel(4);
  const borde = k.tex('baldosa', '#eceae5', 1.5);
  g.add(k.cajaDe(9, y, -27, 9.4, y + 2.4, -7, borde));
  g.add(k.cajaDe(9.4, y, -27, 19.5, y + 2.4, -26.6, borde));
  g.add(k.cajaDe(9.4, y, -7.4, 19.5, y + 2.4, -7, borde));
  g.add(k.cajaDe(19.1, y, -26.6, 19.5, y + 2.2, -7.4, k.vidrio));
  g.add(k.noSolido(k.cajaDe(19.1, y + 2.2, -26.6, 19.5, y + 2.3, -7.4, '#24282c')));
  g.add(k.noSolido(k.cajaDe(9.4, y, -26.6, 19.1, y + 0.1, -7.4, k.tex('baldosa', '#3fb4e8', 1.2))));
  g.add(k.noSolido(k.cajaDe(9.4, y + 0.1, -26.5, 19.1, y + 2.2, -7.5, k.agua)));
  g.add(k.cajaDe(7.6, y, -20, 8.3, y + 0.8, -14, borde));
  g.add(k.cajaDe(8.3, y, -20, 9, y + 1.6, -14, borde));
}

// Helipuerto con helicóptero (las aspas giran).
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
  // Helicóptero.
  const hy = y + 0.15;
  g.add(k.cajaDe(cx - 2, hy + 1.2, cz - 3, cx + 2, hy + 4, cz + 3, '#f4f4f2'));
  g.add(k.cajaDe(cx - 1.7, hy + 1.6, cz + 3, cx + 1.7, hy + 3.8, cz + 4.4, '#1d2833'));
  g.add(k.noSolido(k.cajaDe(cx - 2.02, hy + 2.2, cz - 3, cx + 2.02, hy + 2.6, cz + 3, '#d32f2f')));
  g.add(k.cajaDe(cx - 0.5, hy + 2.6, cz - 10, cx + 0.5, hy + 3.4, cz - 3, '#f4f4f2'));
  g.add(k.noSolido(k.cajaDe(cx - 0.2, hy + 3.4, cz - 10, cx + 0.2, hy + 5.2, cz - 8.6, '#d32f2f')));
  g.add(k.noSolido(k.cajaDe(cx + 0.5, hy + 3.2, cz - 9.8, cx + 0.6, hy + 4.8, cz - 9.6, '#24282c')));
  for (const s of [-1, 1]) {
    g.add(k.cajaDe(cx + s * 2.2 - 0.15, hy, cz - 3.5, cx + s * 2.2 + 0.15, hy + 0.25, cz + 3.5, '#24282c'));
    g.add(k.noSolido(k.cajaDe(cx + s * 1.9 - 0.1, hy + 0.25, cz - 2, cx + s * 1.9 + 0.1, hy + 1.2, cz - 1.8, '#24282c')));
    g.add(k.noSolido(k.cajaDe(cx + s * 1.9 - 0.1, hy + 0.25, cz + 1.8, cx + s * 1.9 + 0.1, hy + 1.2, cz + 2, '#24282c')));
  }
  g.add(k.cilindro(0.25, 0.25, 0.8, '#24282c', cx, hy + 4.4, cz, 8));
  const rotor = k.grupo();
  rotor.position.set(cx, hy + 4.85, cz);
  rotor.add(k.caja(15, 0.1, 0.6, '#2b2f33', 0, 0, 0));
  rotor.add(k.caja(0.6, 0.1, 15, '#2b2f33', 0, 0, 0));
  rotor.userData.girar = 5;
  rotor.userData.dinamico = true;
  g.add(rotor);
}
