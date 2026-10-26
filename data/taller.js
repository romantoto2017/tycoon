// Mejoras del Taller (al lado de Vecibanda Motors). Todo lo que cuestan y lo que hacen sale de
// acá: auto.js (specsAuto) aplica los efectos a la física de siempre y la pantalla del taller
// (ui.js) muestra estas tarjetas.
//
// - efecto: cuánto mejora el stat ese nivel, en total (no se suma al anterior): 0.1 = +10%.
//   Motor: velocidad máxima. Turbo: aceleración (el 0 a 100 baja en esa proporción). Gomas:
//   agarre en las curvas. Frenos: frenada.
// - precio: fracción del precio del auto (los baratos mejoran barato y la Ferrari, caro).
// - icono: el dibujito de la tarjeta.
export const CATEGORIAS = [
  {
    id: 'motor', nombre: 'Motor', icono: '⚙️', stat: 'velocidad',
    niveles: [
      { nombre: 'Admisión deportiva', icono: '🌀', efecto: 0.04, precio: 0.01 },
      { nombre: 'Escape libre', icono: '💨', efecto: 0.08, precio: 0.02 },
      { nombre: 'Pistones de competición', icono: '🔩', efecto: 0.13, precio: 0.03 },
      { nombre: 'Motor preparado', icono: '🏁', efecto: 0.2, precio: 0.045 },
    ],
  },
  {
    id: 'turbo', nombre: 'Turbo', icono: '🐌', stat: 'aceleracion',
    niveles: [
      { nombre: 'Turbo chico', icono: '🐌', efecto: 0.08, precio: 0.01 },
      { nombre: 'Turbo grande', icono: '🌪️', efecto: 0.16, precio: 0.02 },
      { nombre: 'Intercooler', icono: '❄️', efecto: 0.26, precio: 0.03 },
      { nombre: 'Biturbo', icono: '🚀', efecto: 0.38, precio: 0.045 },
    ],
  },
  {
    id: 'gomas', nombre: 'Gomas', icono: '🛞', stat: 'manejo',
    niveles: [
      { nombre: 'Gomas deportivas', icono: '🛞', efecto: 0.06, precio: 0.01 },
      { nombre: 'Semi-slick', icono: '〰️', efecto: 0.12, precio: 0.02 },
      { nombre: 'Slick', icono: '⭕', efecto: 0.19, precio: 0.03 },
      { nombre: 'Slick de competición', icono: '🏆', efecto: 0.28, precio: 0.045 },
    ],
  },
  {
    id: 'frenos', nombre: 'Frenos', icono: '🛑', stat: 'frenado',
    niveles: [
      { nombre: 'Pastillas deportivas', icono: '🟫', efecto: 0.08, precio: 0.01 },
      { nombre: 'Discos ventilados', icono: '💿', efecto: 0.16, precio: 0.02 },
      { nombre: 'Cálipers de 6 pistones', icono: '🔴', efecto: 0.25, precio: 0.03 },
      { nombre: 'Carbono-cerámicos', icono: '🔥', efecto: 0.35, precio: 0.045 },
    ],
  },
];

// Pintura (carrocería) y color de llantas: cada vez que confirmás, esta fracción del precio del auto.
export const PINTURA = { precio: 0.005 };
export const COLORES = ['#e3241b', '#ff7a00', '#ffd23f', '#3ccf4e', '#2f8cff', '#8e44ad', '#f5f5f5', '#141416'];

// Precio de referencia del Auto Deportivo (en la mansión cuesta casi nada; acá cuenta como un
// auto barato).
export const PRECIO_DEPORTIVO = 20e9;

// Las medallas del autódromo: el piloto automático corre con el auto así de mejorado.
// Bronce: de fábrica. Plata: todo al nivel 2. Oro: todo al máximo (sin mejorar es casi imposible).
export const NIVEL_MEDALLA = { bronce: 0, plata: 2, oro: 4 };
