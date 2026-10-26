// Configuración editable de La Vecibanda House.
// Podés cambiar nombres, descripciones y precios sin tocar el resto del código.
// Después de editar, subí el archivo a GitHub y recargá la página.

// Droppers: las máquinas que tiran monedas a la cinta (se compran en orden).
// - nombre: lo que se ve en el botón y arriba de la máquina
// - color:  color de la máquina
// - valor:  plata que vale cada moneda (antes de mejoras)
// - cada:   segundos entre moneda y moneda (antes de mejoras)
export const DROPPERS = [
  { nombre: 'Dropper del Barrio',   color: '#ff7043', valor: 2,      cada: 1.0 },
  { nombre: 'Dropper de la Esquina', color: '#29b6f6', valor: 8,      cada: 1.0 },
  { nombre: 'Dropper del Kiosco',   color: '#ab47bc', valor: 30,     cada: 1.0 },
  { nombre: 'Dropper de la Plaza',  color: '#66bb6a', valor: 120,    cada: 1.0 },
  { nombre: 'Dropper del Club',     color: '#ffca28', valor: 500,    cada: 1.0 },
  { nombre: 'Dropper del Asado',    color: '#ec407a', valor: 2000,   cada: 1.0 },
  { nombre: 'Dropper de la Previa', color: '#26c6da', valor: 8000,   cada: 1.0 },
  { nombre: 'Dropper del Viaje',    color: '#8d6e63', valor: 32000,  cada: 1.0 },
  { nombre: 'Dropper Dorado',       color: '#ffd600', valor: 130000, cada: 1.0 },
  { nombre: 'Dropper Vecibanda',    color: '#e53935', valor: 520000, cada: 1.0 },
];

// Nombres de las mejoras (en el orden en que aparecen).
export const MEJORAS_VALOR = [
  'Monedas x2', 'Monedas Brillantes x2', 'Monedas de Plata x2', 'Monedas de Oro x2',
  'Monedas de Diamante x2', 'Monedas Vecibanda x2', 'Monedas Legendarias x2',
];
export const MEJORAS_VELOCIDAD = ['Cinta Turbo', 'Droppers Rápidos', 'Motor Vecibanda', 'Hiper Velocidad'];

// Objetos especiales de la Vecibanda. Aparecen en pedestales a los costados del camino de entrada.
// - etapa: cuándo aparece el botón (1 = al principio ... 10 = con el techo terminado)
//   1 primer dropper, 2 piso planta baja, 3 paredes, 4 puerta y ventanas, 5 tercer dropper,
//   6 living, 7 primer piso, 8 segundo piso, 9 tercer piso, 10 terraza
// Cada uno tiene una forma distinta según su posición en la lista
// (trofeo, estatua, guitarra, pelota, gnomo, heladera, tele, cohete).
// Son caros a propósito (más o menos 20 veces lo que se gana en ese momento, unos 10 a 25
// minutos juntando) y no hacen falta para el cartel final: son los trofeos difíciles.
// forma (opcional): 'lapiz', 'papa', 'stm', 'boxer' o 'flauta' usan su modelo; sin forma, una figura de relleno.
export const OBJETOS_VECIBANDA = [
  { nombre: 'Lápiz de Nico', precio: 5000, etapa: 4, descripcion: 'Staedtler Mars Lumograph 9B', forma: 'lapiz' },
  { nombre: 'Papa Podrida', precio: 25000, etapa: 5, descripcion: 'Nadie sabe hace cuánto está', forma: 'papa' },
  { nombre: 'STM de la Schwepa', precio: 60000, etapa: 6, descripcion: 'Boleto estudiante', forma: 'stm' },
  { nombre: 'Boxer Supreme', precio: 900000, etapa: 7, descripcion: 'Original, sin estrenar', forma: 'boxer' },
  { nombre: 'Flauta del Pelado', precio: 1.2e6, etapa: 7, descripcion: 'La que sonó en la cancha', forma: 'flauta' },
  { nombre: 'Objeto Vecibanda 6', precio: 8e7,      etapa: 8,  descripcion: 'Descripción corta 6' },
  { nombre: 'Objeto Vecibanda 7', precio: 4e9,     etapa: 9,  descripcion: 'Descripción corta 7' },
  { nombre: 'Objeto Vecibanda 8', precio: 4.5e10,    etapa: 10, descripcion: 'Descripción corta 8' },
];

// Cuadros: la imagen se busca en assets/cuadros/<archivo> (un .mp4 se ve animado).
// Van en las paredes del hall: dos por piso (1-2 planta baja, 3-4 primer piso, etc.)
// y del noveno en adelante, otra fila más adentro del hall, empezando de nuevo en planta baja.
export const CUADROS = [
  { nombre: 'Puede ser', precio: 1700, archivo: 'puedeser.jpg' },
  { nombre: 'Tosi', precio: 1800, archivo: 'tosi.jpg' },
  { nombre: 'Samu Barber', precio: 370000, archivo: 'samubarber.jpg' },
  { nombre: 'Grefg', precio: 390000, archivo: 'grefg.jpg' },
  { nombre: 'Bauti pateado', precio: 25e6, archivo: 'bautipateado.jpg' },
  { nombre: 'Nico Pereira', precio: 26e6, archivo: 'nicopereira.jpg' },
  { nombre: 'Kirk', precio: 3e9, archivo: 'kirk.jpg' },
  { nombre: 'Alonso', precio: 3.1e9, archivo: 'alonso.jpg' },
  { nombre: 'Momo (animado)', precio: 2500, archivo: 'momo.mp4' },
  { nombre: 'Llorens', precio: 3200, archivo: 'llorens.jpg' },
  { nombre: 'Cuadro Gorda', precio: 4.1e5, archivo: 'cuadrogorda.jpg' },
  { nombre: 'Joaco', precio: 6500, archivo: 'joaco.jpg' },
  { nombre: 'Patito', precio: 4.6e5, archivo: 'trolleado.jpg' }, // el nombre real es 'Trolleado'
];

// Cuadros grandes de los pasillos (dos por piso: 1-2 planta baja, 3-4 primer piso, etc.).
// De las obras famosas solo quedó la Gioconda (con la cara de Bauti, hecha con
// herramientas/gioconda_bauti.py), con su cartel. Los demás son de la Vecibanda: sin cartel.
// - carpeta: dónde está la imagen dentro de assets/ (por defecto, pinturas). Un .mp4 se ve animado.
// - cartel: true = lleva la placa con el nombre abajo.
export const OBRAS_DE_ARTE = [
  { nombre: 'Masacre',                 precio: 1600,  archivo: 'masacre.jpeg',     carpeta: 'cuadros' },
  { nombre: 'Toto lindo',              precio: 1700,  archivo: 'totolindo.jpeg',   carpeta: 'cuadros' },
  { nombre: 'Veneca',                  precio: 3.4e5, archivo: 'veneca.jpeg',      carpeta: 'cuadros' },
  { nombre: 'La flauta del pelado (video)', precio: 3.5e5, archivo: 'flautapelado.mp4', carpeta: 'cuadros' },
  { nombre: 'La Gioconda (Da Vinci)',  precio: 2.6e7, archivo: 'mona_lisa_bauti.jpg', cartel: true },
];

// Lujos de millonario. Cada uno tiene su lugar fijo (no cambies el id).
// - etapa: igual que en OBJETOS_VECIBANDA (algunos además necesitan que exista su lugar,
//   por ejemplo el helicóptero siempre espera a la terraza).
export const LUJOS = [
  { id: 'estatuas',   nombre: 'Estatuas Griegas',      precio: 3000,  etapa: 6 },
  { id: 'nico_carton', nombre: 'Nico de Cartón',       precio: 2200,  etapa: 5 },
  { id: 'piano',      nombre: 'Piano de Cola',         precio: 4e4,   etapa: 7 },
  { id: 'trex',       nombre: 'Esqueleto de T-Rex',    precio: 7.2e6, etapa: 8 },
  { id: 'boveda',     nombre: 'Bóveda de Oro',         precio: 5.4e9, etapa: 9 },
  { id: 'piscina_inf', nombre: 'Piscina Infinita',     precio: 5.9e9, etapa: 10 },
  { id: 'helicoptero', nombre: 'Helicóptero Privado',  precio: 6e9,   etapa: 10 },
];

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
