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
export const OBJETOS_VECIBANDA = [
  { nombre: 'Objeto Vecibanda 1', precio: 300,    etapa: 4,  descripcion: 'Descripción corta 1' },
  { nombre: 'Objeto Vecibanda 2', precio: 1400,   etapa: 5,  descripcion: 'Descripción corta 2' },
  { nombre: 'Objeto Vecibanda 3', precio: 2800,   etapa: 6,  descripcion: 'Descripción corta 3' },
  { nombre: 'Objeto Vecibanda 4', precio: 35000,  etapa: 7,  descripcion: 'Descripción corta 4' },
  { nombre: 'Objeto Vecibanda 5', precio: 40000, etapa: 7,  descripcion: 'Descripción corta 5' },
  { nombre: 'Objeto Vecibanda 6', precio: 5.5e6,   etapa: 8,  descripcion: 'Descripción corta 6' },
  { nombre: 'Objeto Vecibanda 7', precio: 340e6,  etapa: 9,  descripcion: 'Descripción corta 7' },
  { nombre: 'Objeto Vecibanda 8', precio: 4.7e9,    etapa: 10, descripcion: 'Descripción corta 8' },
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
];

// Obras de arte famosas (dominio público) que se compran y se cuelgan en los pasillos.
// Van de a dos por piso: 1-2 planta baja, 3-4 primer piso, etc. Imagen en assets/pinturas/.
export const OBRAS_DE_ARTE = [
  { nombre: 'La noche estrellada (Van Gogh)',  precio: 1600,  archivo: 'noche_estrellada.jpg' },
  { nombre: 'La joven de la perla (Vermeer)',  precio: 1700,  archivo: 'joven_perla.jpg' },
  { nombre: 'La gran ola (Hokusai)',           precio: 3.4e5, archivo: 'gran_ola.jpg' },
  { nombre: 'Los girasoles (Van Gogh)',        precio: 3.5e5, archivo: 'girasoles.jpg' },
  { nombre: 'La Gioconda (Da Vinci)',          precio: 2.6e7, archivo: 'mona_lisa.jpg' },
  { nombre: 'El grito (Munch)',                precio: 2.7e7, archivo: 'el_grito.jpg' },
  { nombre: 'El nacimiento de Venus (Botticelli)', precio: 3e9, archivo: 'venus.jpg' },
  { nombre: 'El beso (Klimt)',                 precio: 3.1e9, archivo: 'el_beso.jpg' },
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
