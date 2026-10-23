// Medidas del mundo. Sin imports para que también se pueda usar desde herramientas/.

export const TERRENO = { x0: -72, x1: 72, z0: -88, z1: 56 };
export const CALLE_Z = 68;
export const SPAWN = { x: 0, z: 48 };

// Mansión moderna: frente hacia +Z (la calle). 4 pisos (0 a 3) + terraza.
// Planta: núcleo central (hall + escaleras) en x[-8,8]; a cada lado dos columnas de
// habitaciones (x 8..26 y 26..44), adelante (z 0..-13) y atrás (z -21..-34),
// con un pasillo ancho en z[-21,-13] que las conecta (puertas de 6).
export const MANSION = { x0: -44, x1: 44, z0: -34, z1: 0 };
export const NUCLEO = 8;
export const COLUMNA = 26;
export const PASILLO = { z0: -21, z1: -13 };
export const ANCHO_PUERTA = 6;
export const ALTO_PISO = 10;
export const LOSA = 0.4;
export const PISOS = 4;

// Nivel del piso terminado del piso n (0 = planta baja, 4 = terraza).
export const nivel = (n) => n * ALTO_PISO + LOSA;

// Fábrica: cinta a lo largo de Z en el costado oeste.
export const CINTA = { x: -60, z0: -40, z1: 26, alto: 1.2, ancho: 2.4, vel: 7 };
export const SLOTS_DROPPER = [-37, -30.5, -24, -17.5, -11, -4.5, 2, 8.5, 15, 21.5];
export const COLECTOR_Z = 27.8;
export const COBRAR = { x: -55.5, z: 27.8 };

// Patio trasero y alrededores.
export const PISCINA = { x0: -12, x1: 12, z0: -62, z1: -44, alto: 2.4 };
export const CANCHA = { x0: 28, x1: 60, z0: -84, z1: -46 };
export const GARAGE = { x0: 47, x1: 70.5, z0: -12, z1: 20, alto: 9 };

// Ascensor: una plataforma por piso, en el fondo del núcleo.
export const ASCENSOR = { x: -6, z: -31 };

// Restaurante "Lo de Lourdes", detrás a la izquierda de la mansión. La puerta mira a +z.
// No se compra: abre solo cuando la mansión llega al RESTO_ABRE (30%).
export const RESTO = { x0: -70.5, x1: -32, z0: -86.5, z1: -56, alto: 13, pared: 0.7 };
export const RESTO_ABRE = 0.3;
// Mesas del comedor (centros) y microondas (centro de cada mesita, contra la pared del fondo).
export const RESTO_MESAS = [[-64, -76], [-56, -76], [-48, -76], [-64, -67], [-56, -67], [-48, -67]];
export const RESTO_MICROONDAS = [-65, -59, -53, -47, -41];
// Rincón de Lourdes (adelante a la derecha): su mesa con la radio y su silla, al costado,
// así se sienta mirando al salón.
export const RESTO_LOURDES = { mesa: [-38, -61], silla: [-34.2, -61] };
// Parrilla Vecibanda (de ladrillo, como la de la foto): centro del frente; mira a +z.
export const PARRILLA = { x: -23.5, z: -56.5 };
