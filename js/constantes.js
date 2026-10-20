// Medidas del mundo. Sin imports para que también se pueda usar desde herramientas/.

export const TERRENO = { x0: -60, x1: 60, z0: -64, z1: 46 };
export const CALLE_Z = 58;
export const SPAWN = { x: 0, z: 38 };

// Mansión: frente hacia +Z (la calle). 4 pisos (0 a 3) + terraza.
export const MANSION = { x0: -22, x1: 22, z0: -28, z1: 0 };
export const ALTO_PISO = 8;
export const LOSA = 0.4;
export const PISOS = 4;

// Nivel del piso terminado del piso n (0 = planta baja, 4 = terraza).
export const nivel = (n) => n * ALTO_PISO + LOSA;

// Fábrica: cinta a lo largo de Z en el costado oeste.
export const CINTA = { x: -44, z0: -40, z1: 26, alto: 1.2, ancho: 2.4, vel: 7 };
export const SLOTS_DROPPER = [-37, -30.5, -24, -17.5, -11, -4.5, 2, 8.5, 15, 21.5];
export const COLECTOR_Z = 27.8;
export const COBRAR = { x: -39.5, z: 27.8 };

// Patio trasero y alrededores.
export const PISCINA = { x0: -12, x1: 12, z0: -56, z1: -38, alto: 2.4 };
export const CANCHA = { x0: 28, x1: 56, z0: -56, z1: -12 };
export const GARAGE = { x0: 30, x1: 50, z0: 2, z1: 18 };
