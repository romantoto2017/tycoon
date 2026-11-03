// Tycoon de la tanzania (la planta inventada del juego), en el galpón arriba del acantilado de la
// costa (js/tanzania.js). Cadena: plantar → cultivar → cosechar → procesar → vender.
// - plantar: cada mesa de cultivo tiene PLANTAS_POR_MESA plantas; cada ciclo da una cosecha.
// - cultivar: las luces achican el ciclo (vel: multiplica la velocidad).
// - cosechar: sin la mesa de cosecha las plantas maduran pero nadie las corta (no rinde).
// - procesar: cada máquina multiplica lo que vale cada planta (valor).
// - vender: lo procesado va al depósito; el pad COBRAR lo vende. El contacto vende solo; la
//   furgoneta paga más (valor).
// PROPUESTA de números (ver herramientas/balance_tanzania.mjs): se pueden cambiar acá solos.
// Los ids no se renombran ni se borran (son las compras guardadas en estado.tanzania.compras).
const B = 1e9;
const T = 1e12;

export const CICLO = 30; // segundos de una tanda de plantas (sin luces)
export const PLANTAS_POR_MESA = 6;
export const VALOR_PLANTA = 7.5e8; // lo que vale una planta recién cosechada, sin procesar

// tipo: 'galpon' | 'mesa' | 'luz' | 'cosecha' | 'proceso' | 'venta'
export const ITEMS_TZ = [
  { id: 'tz_galpon', nombre: 'Galpón de tanzania', tipo: 'galpon', precio: 300 * B },
  { id: 'tz_mesa1', nombre: 'Mesa de cultivo', tipo: 'mesa', precio: 40 * B },
  { id: 'tz_cosecha', nombre: 'Mesa de cosecha', tipo: 'cosecha', precio: 60 * B },
  { id: 'tz_luz1', nombre: 'Luces de cultivo', tipo: 'luz', precio: 120 * B, vel: 1.5 },
  { id: 'tz_mesa2', nombre: 'Mesa de cultivo 2', tipo: 'mesa', precio: 220 * B },
  { id: 'tz_secadero', nombre: 'Secadero', tipo: 'proceso', precio: 380 * B, valor: 2 },
  { id: 'tz_mesa3', nombre: 'Mesa de cultivo 3', tipo: 'mesa', precio: 650 * B },
  { id: 'tz_luz2', nombre: 'Luces de cultivo 2', tipo: 'luz', precio: 1 * T, vel: 1.5 },
  { id: 'tz_contacto', nombre: 'Contacto en la ciudad', tipo: 'venta', precio: 1.5 * T, auto: true },
  { id: 'tz_mesa4', nombre: 'Mesa de cultivo 4', tipo: 'mesa', precio: 2.2 * T },
  { id: 'tz_picadora', nombre: 'Picadora', tipo: 'proceso', precio: 3.2 * T, valor: 2 },
  { id: 'tz_luz3', nombre: 'Luces de cultivo 3', tipo: 'luz', precio: 4.5 * T, vel: 1.5 },
  { id: 'tz_mesa5', nombre: 'Mesa de cultivo 5', tipo: 'mesa', precio: 6.5 * T },
  { id: 'tz_prensa', nombre: 'Prensa y bolsitas', tipo: 'proceso', precio: 9 * T, valor: 2.5 },
  { id: 'tz_mesa6', nombre: 'Mesa de cultivo 6', tipo: 'mesa', precio: 13 * T },
  { id: 'tz_furgoneta', nombre: 'Furgoneta de reparto', tipo: 'venta', precio: 18 * T, valor: 1.5 },
  { id: 'tz_luz4', nombre: 'Luces de cultivo 4', tipo: 'luz', precio: 25 * T, vel: 1.5 },
  { id: 'tz_mesa7', nombre: 'Mesa de cultivo 7', tipo: 'mesa', precio: 36 * T },
  { id: 'tz_laboratorio', nombre: 'Laboratorio', tipo: 'proceso', precio: 50 * T, valor: 3 },
  { id: 'tz_mesa8', nombre: 'Mesa de cultivo 8', tipo: 'mesa', precio: 70 * T },
];

// Plata por segundo con lo comprado (la usan el juego y la simulación de balance).
export function ingresoTz(compras) {
  const tiene = new Set(compras);
  const items = ITEMS_TZ.filter((i) => tiene.has(i.id));
  if (!tiene.has('tz_cosecha')) return 0;
  const mesas = items.filter((i) => i.tipo === 'mesa').length;
  const vel = items.reduce((v, i) => v * (i.vel || 1), 1);
  const valor = items.reduce((v, i) => v * (i.valor || 1), 1);
  return (mesas * PLANTAS_POR_MESA * VALOR_PLANTA * valor * vel) / CICLO;
}
