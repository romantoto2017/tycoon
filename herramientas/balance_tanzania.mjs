// Simula el tycoon de la tanzania (data/tanzania.js de la carpeta que se pase, por defecto
// prueba/): un jugador que terminó la mansión (gana MANSION por segundo), le paga a Nico y compra
// cada botón apenas le alcanza. Muestra cuánto tarda cada compra y lo que gana después.
//   node herramientas/balance_tanzania.mjs [prueba]
const carpeta = process.argv[2] || 'prueba';
const { ITEMS_TZ, ingresoTz } = await import(`../${carpeta}/data/tanzania.js`);
const MANSION = 2.16e8; // plata por segundo con la mansión terminada
const NICO = 2e11;
const f = (n) => (n >= 1e12 ? `${(n / 1e12).toFixed(1)}T` : n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : `${(n / 1e6).toFixed(0)}M`);
const min = (s) => `${(s / 60).toFixed(1)} min`;
let t = NICO / MANSION;
console.log(`Nico (200B): ${min(t)} de mansión`);
const compras = [];
let plata = 0;
for (const it of ITEMS_TZ) {
  const ingreso = MANSION + ingresoTz(compras);
  const espera = Math.max(0, (it.precio - plata) / ingreso);
  t += espera;
  plata += espera * ingreso - it.precio;
  compras.push(it.id);
  console.log(`${it.nombre.padEnd(24)} ${f(it.precio).padStart(7)}  espera ${min(espera).padStart(10)}  total ${min(t).padStart(10)}  después gana ${f(MANSION + ingresoTz(compras))}/s (${(ingresoTz(compras) / MANSION).toFixed(1)}x la mansión)`);
}
console.log(`Total: ${(t / 3600).toFixed(2)} h`);
