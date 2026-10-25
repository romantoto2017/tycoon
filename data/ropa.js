// Ropa de las tiendas de la Ciudad Vecibanda. Las texturas salen de las fotos de assets/ropa/
// con herramientas/ropa.py (assets/ropa/prendas/ y assets/ropa/tienda/ para el catálogo).
// - slot: dónde va (torso, piernas, pies, cabeza). Se puede tener una de cada a la vez.
// - largas: mangas largas · capucha: buzo con capucha · cuello: cuello alto (camperas)
// - mangas: [arriba, abajo] colores de la manga en dos tonos (si no, la tela o la textura de manga)
import { COLORES_ROPA } from './ropa_colores.js';

export const SLOTS = [
  { id: 'torso', nombre: 'Remeras, buzos y camperas' },
  { id: 'piernas', nombre: 'Pantalones' },
  { id: 'pies', nombre: 'Zapatillas' },
  { id: 'cabeza', nombre: 'Gorras' },
];

const M = 1e6;
const B = 1e9;

const LISTA = [
  // ---- Veci Drip: remeras, buzos y joggings ----
  { id: 'babymilo', nombre: 'Remera Baby Milo', slot: 'torso', precio: 650 * M, tienda: 'drip' },
  { id: 'bapeblue', nombre: 'Remera BAPE Blue Camo', slot: 'torso', precio: 700 * M, tienda: 'drip' },
  { id: 'bapeclassic', nombre: 'Remera BAPE College', slot: 'torso', precio: 600 * M, tienda: 'drip' },
  { id: 'bapetee', nombre: 'Remera BAPE Blanca', slot: 'torso', precio: 550 * M, tienda: 'drip' },
  { id: 'corteiz', nombre: 'Remera Corteiz', slot: 'torso', precio: 500 * M, tienda: 'drip' },
  { id: 'corteiz2', nombre: 'Remera Corteiz Alcatraz', slot: 'torso', precio: 520 * M, tienda: 'drip' },
  { id: 'supreme', nombre: 'Remera Supreme Box Logo', slot: 'torso', precio: 900 * M, tienda: 'drip' },
  { id: 'supremeworldfamous', nombre: 'Remera Supreme World Famous', slot: 'torso', precio: 850 * M, tienda: 'drip' },
  { id: 'buzocorteiz', nombre: 'Buzo Corteiz Negro', slot: 'torso', precio: 1.6 * B, tienda: 'drip', largas: true, capucha: true },
  { id: 'buzocorteizceleste', nombre: 'Buzo Corteiz Celeste', slot: 'torso', precio: 1.8 * B, tienda: 'drip', largas: true, capucha: true },
  { id: 'pantcorteiz', nombre: 'Jogging Corteiz Negro', slot: 'piernas', precio: 1.2 * B, tienda: 'drip' },
  { id: 'pantcorteizceleste', nombre: 'Jogging Corteiz Celeste', slot: 'piernas', precio: 1.4 * B, tienda: 'drip' },
  // ---- La Futbolera: camperas de clubes y botines ----
  { id: 'camperacerro', nombre: 'Campera Cerro', slot: 'torso', precio: 2.2 * B, tienda: 'futbolera', largas: true, cuello: true },
  { id: 'camperamilan', nombre: 'Campera Milan', slot: 'torso', precio: 2.8 * B, tienda: 'futbolera', largas: true, cuello: true, rayas: true },
  { id: 'camperapenarol', nombre: 'Campera Peñarol', slot: 'torso', precio: 2.4 * B, tienda: 'futbolera', largas: true, cuello: true },
  { id: 'rompevientosnacional', nombre: 'Rompevientos Nacional', slot: 'torso', precio: 2 * B, tienda: 'futbolera', largas: true, capucha: '#f2f2f4' },
  { id: 'buzosafa', nombre: 'Buzo SAFA', slot: 'torso', precio: 1.5 * B, tienda: 'futbolera', largas: true, capucha: true },
  { id: 'f50', nombre: 'Botines F50', slot: 'pies', precio: 4.5 * B, tienda: 'futbolera' },
  // ---- Kicks: zapatillas, pantalones y gorra ----
  { id: 'jordan1', nombre: 'Jordan 1 Mid Bred', slot: 'pies', precio: 5 * B, tienda: 'kicks' },
  { id: 'jordanbalvin', nombre: 'Jordan 3 x J Balvin', slot: 'pies', precio: 9 * B, tienda: 'kicks' },
  { id: 'nikeshox', nombre: 'Nike Shox TL', slot: 'pies', precio: 6 * B, tienda: 'kicks' },
  { id: 'nikeshoxr4', nombre: 'Nike Shox R4', slot: 'pies', precio: 5.5 * B, tienda: 'kicks' },
  { id: 'niketn', nombre: 'Nike TN', slot: 'pies', precio: 4 * B, tienda: 'kicks' },
  { id: 'joggingjordan', nombre: 'Jogging Jordan', slot: 'piernas', precio: 1.5 * B, tienda: 'kicks' },
  { id: 'jeanscammo', nombre: 'Jean Camuflado', slot: 'piernas', precio: 1.1 * B, tienda: 'kicks' },
  { id: 'tiffosigorra', nombre: 'Gorra Tiffosi', slot: 'cabeza', precio: 800 * M, tienda: 'kicks' },
];

export const PRENDAS = LISTA.map((p) => ({ ...COLORES_ROPA[p.id], ...p, foto: `assets/ropa/tienda/${p.id}.webp` }));
export const PRENDA = Object.fromEntries(PRENDAS.map((p) => [p.id, p]));

// Las tiendas: cartel, colores, lo que tienen puesto los maniquíes de la vidriera y el que
// atiende (vestido con ropa de la tienda).
export const TIENDAS = [
  {
    id: 'kicks', nombre: 'KICKS', logo: 'assets/especiales/logotiendaderopa.png', fondo: '#ffffff', letras: '#111111', pared: '#f4f4f4',
    maniquies: [{ pies: 'jordan1', piernas: 'jeanscammo', cabeza: 'tiffosigorra' }, { pies: 'nikeshoxr4', piernas: 'joggingjordan' }, { pies: 'jordanbalvin', piernas: 'jeanscammo' }],
    vendedor: { nombre: 'Facu', piel: '#e0ac69', pelo: '#1b1411', peinado: 'rulos', remera: '#f5f5f5', pantalon: '#212121', ropa: { cabeza: 'tiffosigorra', piernas: 'joggingjordan', pies: 'jordan1' } },
  },
  {
    id: 'drip', nombre: 'VECI DRIP', fondo: '#111111', letras: '#ffd400', pared: '#2a2a2e',
    maniquies: [{ torso: 'bapeclassic', piernas: 'pantcorteiz' }, { torso: 'buzocorteizceleste', piernas: 'pantcorteizceleste' }, { torso: 'supreme', piernas: 'pantcorteiz' }],
    vendedor: { nombre: 'Lucas', piel: '#f1c27d', pelo: '#3e2723', peinado: 'ondulado', remera: '#111111', pantalon: '#212121', ropa: { torso: 'supremeworldfamous', piernas: 'pantcorteiz' } },
  },
  {
    id: 'futbolera', nombre: 'LA FUTBOLERA', fondo: '#0d47a1', letras: '#ffffff', pared: '#e8eef6',
    maniquies: [{ torso: 'camperapenarol', pies: 'f50' }, { torso: 'rompevientosnacional' }, { torso: 'camperacerro' }],
    vendedor: { nombre: 'Tincho', piel: '#c68642', pelo: '#1b1411', peinado: 'liso', remera: '#0d47a1', pantalon: '#1e3a8a', ropa: { torso: 'camperamilan', pies: 'f50' } },
  },
];
