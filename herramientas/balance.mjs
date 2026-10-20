// Simula una partida comprando todo en orden y calcula los precios para que
// cada compra cueste "ingreso actual x tiempo objetivo". Escribe js/precios.js.
// Uso: node herramientas/balance.mjs [--escribir]
import { writeFileSync } from 'node:fs';
import { DROPPERS } from '../data/objetos.js';
import { ITEMS } from '../js/progresion.js';

const T0 = 8;          // segundos de espera para las primeras compras
const T1 = 240;        // segundos extra hacia el final
const CURVA = 1.2;
const EFICIENCIA = 0.85; // se pierde algo de tiempo yendo a cobrar
const CAMINAR = 12;    // segundos promedio para llegar a cada botón

const redondo = (n) => {
  if (n < 100) return Math.max(1, Math.round(n));
  const e = Math.pow(10, Math.floor(Math.log10(n)) - 1);
  return Math.round(n / e) * e;
};

let ingreso = 0;
let multValor = 1;
let multVel = 1;
const droppers = [];
const precios = {};
let t = 0;
const N = ITEMS.length;
const filas = [];

ITEMS.forEach((item, i) => {
  const objetivo = T0 + T1 * Math.pow(i / N, CURVA);
  const sugerido = redondo(ingreso * EFICIENCIA * objetivo);
  let precio;
  if (item.id === 'dropper1') precio = 0;
  else if (item.especial) precio = item.precio;
  else { precio = sugerido; precios[item.id] = precio; }
  const espera = precio === 0 ? 0 : precio / (ingreso * EFICIENCIA);
  t += espera + CAMINAR;
  if (item.tipo === 'dropper') droppers.push(item.dropper);
  if (item.valor) multValor *= item.valor;
  if (item.velocidad) multVel *= item.velocidad;
  ingreso = droppers.reduce((a, d) => a + DROPPERS[d].valor / DROPPERS[d].cada, 0) * multValor * multVel;
  filas.push({ i, id: item.id, precio, sugerido: item.especial ? sugerido : '', espera: Math.round(espera), min: (t / 60).toFixed(1), ingreso: Math.round(ingreso) });
});

console.table(filas);
console.log(`Ítems: ${N}. Duración estimada: ${(t / 3600).toFixed(2)} h`);
if (process.argv.includes('--escribir')) {
  writeFileSync(new URL('../js/precios.js', import.meta.url),
    `// Generado por herramientas/balance.mjs. No editar a mano: cambiá los tiempos ahí y volvé a correrlo.\nexport const PRECIOS = ${JSON.stringify(precios, null, 2)};\n`);
  console.log('js/precios.js actualizado');
}
