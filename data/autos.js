// Autos del concesionario Vecibanda Motors (a la salida de la Ciudad Vecibanda).
// Se compran ahí, pero primero hay que tener el Galpón Vecibanda (al lado de la mansión):
// ahí quedan guardados y se pueden manejar.
//
// - archivo:  modelo en assets/autos/ (achicado con herramientas/autos.mjs)
// - largo:    largo real en metros (el modelo se escala a eso: 1 m = 2,47 unidades)
// - precio:   en la moneda del juego. Escala: 9B × (precio real en dólares / 350) ^ 0,6,
//             redondeado. 350 dólares es la Jordan 3 x J Balvin (9B); con la proporción
//             exacta un McLaren costaría 41T (más de 50 horas de juego), así que se comprime.
// - real:     precio de verdad (aprox., octubre 2026), para mostrar en el concesionario
// - potencia: velocidad máxima comparada con el Auto Deportivo (1 = igual)
const B = 1e9;
const T = 1e12;

export const AUTOS = [
  { id: 'miata', nombre: 'Mazda MX-5 Miata', archivo: 'miata.glb', largo: 3.95, precio: 75 * B, real: 'US$ 12.000', potencia: 1.05 },
  { id: 'bmw_e36', nombre: 'BMW Serie 3 E36', archivo: 'bmw_e36.glb', largo: 4.43, precio: 85 * B, real: 'US$ 14.000', potencia: 1.1 },
  { id: 'golf_gti', nombre: 'VW Golf GTI Clubsport', archivo: 'golf_gti.glb', largo: 4.27, precio: 130 * B, real: 'US$ 28.000', potencia: 1.15 },
  { id: 'gtr', nombre: 'Nissan GT-R R35', archivo: 'gtr.glb', largo: 4.71, precio: 350 * B, real: 'US$ 120.000', potencia: 1.35 },
  { id: 'mclaren_p1', nombre: 'McLaren P1', archivo: 'mclaren_p1.glb', largo: 4.59, precio: 1.5 * T, real: 'US$ 1.600.000', potencia: 1.6 },
  { id: 'ferrari_f40', nombre: 'Ferrari F40', archivo: 'ferrari_f40.glb', largo: 4.36, precio: 2.5 * T, real: 'US$ 3.200.000', potencia: 1.5 },
];
