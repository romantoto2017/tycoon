import { PRENDA } from '../data/ropa.js';
import { cargarImagen } from './texturas.js';

// Carga las texturas de las prendas (assets/ropa/prendas/, hechas con herramientas/ropa.py)
// y arma lo que crearPersonaje() necesita para vestir a alguien: { torso, piernas, pies, cabeza }.
const DIR = 'assets/ropa/prendas';
const cache = new Map();

// La imagen tal cual, sin pasarla a un canvas: drawImage, createPattern y las texturas la
// aceptan igual, y las imágenes no cuentan para el tope de memoria de canvas del iPhone.
async function canvas(nombre) {
  return cargarImagen(`${DIR}/${nombre}`);
}

export function cargarPrenda(id) {
  const p = PRENDA[id];
  if (!p) return Promise.resolve(null);
  if (!cache.has(id)) {
    cache.set(id, (async () => {
      if (p.slot === 'torso' || p.slot === 'cabeza') {
        const [frente, tela, manga] = await Promise.all([canvas(`${id}_frente.jpg`), canvas(`${id}_tela.jpg`), p.manga ? canvas(`${id}_manga.jpg`) : null]);
        return frente && tela ? { prenda: p, frente, tela, manga } : null;
      }
      if (p.slot === 'piernas') {
        const [piernas, tela] = await Promise.all([canvas(`${id}_piernas.jpg`), canvas(`${id}_tela.jpg`)]);
        return piernas && tela ? { prenda: p, piernas, tela } : null;
      }
      return { prenda: p }; // zapatillas: modelos 3D (zapatillas.js)
    })());
  }
  return cache.get(id);
}

// ropa: { torso: id, piernas: id, pies: id, cabeza: id } (cualquiera puede faltar).
export async function vestido(ropa) {
  if (!ropa) return null;
  const v = {};
  await Promise.all(Object.entries(ropa).map(async ([slot, id]) => {
    const p = id && (await cargarPrenda(id));
    if (p && p.prenda.slot === slot) v[slot] = p;
  }));
  return Object.keys(v).length ? v : null;
}

// Cabeza de maniquí: lisa, blanca, sin cara.
let maniqui = null;
export function cabezaManiqui() {
  if (!maniqui) {
    const lienzo = (tono) => {
      const c = document.createElement('canvas');
      c.width = c.height = 16;
      const g = c.getContext('2d');
      g.fillStyle = tono;
      g.fillRect(0, 0, 16, 16);
      return c;
    };
    const blanco = lienzo('#f4f4f4');
    maniqui = { frente: blanco, der: lienzo('#e2e2e2'), izq: lienzo('#e2e2e2'), atras: lienzo('#e8e8e8'), arriba: blanco, abajo: lienzo('#d8d8d8'), piel: '#f6f6f6', pelo: '#f4f4f4', ropa: null };
  }
  return maniqui;
}
export const MANIQUI = { id: 'maniqui', nombre: ' ', sinFoto: true, piel: '#f6f6f6', remera: '#ededed', pantalon: '#ededed' };
