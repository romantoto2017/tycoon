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

// Cuadros: la imagen se busca en assets/cuadros/<archivo>.
// Van de a dos por piso en las paredes del pasillo (1-2 planta baja, 3-4 primer piso, etc.).
export const CUADROS = [
  { nombre: 'Cuadro 1', precio: 1700,  archivo: 'cuadro1.jpg' },
  { nombre: 'Cuadro 2', precio: 1800,  archivo: 'cuadro2.jpg' },
  { nombre: 'Cuadro 3', precio: 370000, archivo: 'cuadro3.jpg' },
  { nombre: 'Cuadro 4', precio: 390000, archivo: 'cuadro4.jpg' },
  { nombre: 'Cuadro 5', precio: 25e6,   archivo: 'cuadro5.jpg' },
  { nombre: 'Cuadro 6', precio: 26e6,   archivo: 'cuadro6.jpg' },
  { nombre: 'Cuadro 7', precio: 3e9, archivo: 'cuadro7.jpg' },
  { nombre: 'Cuadro 8', precio: 3.1e9, archivo: 'cuadro8.jpg' },
];
