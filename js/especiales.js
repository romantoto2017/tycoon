// Objetos especiales de la Vecibanda (pedestales en el camino de entrada),
// cuadros en los pasillos y el cartel final.
import { nivel } from './constantes.js';

// Pedestales a los costados del camino de entrada: [x, z].
export const SLOTS_ESPECIALES = [[-8, 10], [8, 10], [-8, 18], [8, 18], [-8, 26], [8, 26], [-8, 34], [8, 34]];

// Cuadros: dos por piso, en las paredes del pasillo.
export function slotCuadro(i) {
  return { piso: Math.floor(i / 2) % 4, lado: i % 2 === 0 ? -1 : 1 };
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

export function cuadro(k, g, i, datos) {
  const { piso, lado } = slotCuadro(i);
  const y = nivel(piso) + 3.8;
  const x = lado * 4.8;
  const z = -10;
  g.add(k.noSolido(k.cajaDe(Math.min(x, x - lado * 0.18), y - 1.45, z - 1.9, Math.max(x, x - lado * 0.18), y + 1.45, z + 1.9, '#6d4c41')));
  const lamina = k.lamina(datos.archivo, i, 3.4, 2.55);
  lamina.position.set(x - lado * 0.2, y, z);
  lamina.rotation.y = -lado * Math.PI / 2;
  g.add(lamina);
}

export function cartelFinal(k, g) {
  const y = nivel(4);
  g.add(k.cajaDe(-14, y, -1.6, -13, y + 3, -0.6, '#455a64'));
  g.add(k.cajaDe(13, y, -1.6, 14, y + 3, -0.6, '#455a64'));
  g.add(k.cajaDe(-18, y + 2.6, -0.6, 18, y + 11, -0.1, '#c62828'));
  const cartel = k.cartel('LA VECIBANDA HOUSE', 34, 7, '#ffd23f', '#b71c1c');
  cartel.position.set(0, y + 6.8, 0);
  g.add(cartel);
  for (let i = 0; i <= 24; i++) {
    const bx = -17.6 + i * (35.2 / 24);
    const c = i % 2 ? '#fff59d' : '#ffffff';
    g.add(k.noSolido(k.cajaDe(bx - 0.25, y + 2.75, -0.1, bx + 0.25, y + 3.25, 0.1, k.brillo(c))));
    g.add(k.noSolido(k.cajaDe(bx - 0.25, y + 10.35, -0.1, bx + 0.25, y + 10.85, 0.1, k.brillo(c))));
  }
}
