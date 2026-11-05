// Medidas del mundo. Sin imports para que también se pueda usar desde herramientas/.

// ---------- Multijugador: 10 terrenos sobre la misma calle ----------
// LOTES: x del centro de cada terreno en el mundo compartido (el 0 es el de siempre; los otros,
// pasando el restaurante, con lugar para el galpón de cada uno). Cada jugador tiene el suyo
// (VECI.slot, js/arranque.js) y lo ve en el centro, como siempre: lo compartido (gym, resto,
// playa, montaña, autopista, ciudad...) se corre DX en x. local = compartido + DX.
// El décimo (el último: después no entra nadie más) va a la izquierda del primero, entre el gym y la
// mansión de siempre, a la misma distancia que los demás. Va AL FINAL de la lista: los índices de los
// que ya juegan no cambian (su terreno y todo lo que ven queda donde estaba).
export const LOTES = [0, 340, 570, 800, 1030, 1260, 1490, 1720, 1950, -230];
export const SLOT = globalThis.VECI?.slot ?? 0;
export const DX = -LOTES[SLOT];
// Donde está la casa del terreno k en tu mundo.
export const loteLocal = (k) => LOTES[k] + DX;

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

// Galpón Vecibanda: otro terreno pegado a la mansión, del lado del garage. La boca (con el
// portón corredizo abierto) mira a la calle; ahí se guardan los autos del concesionario.
export const GALPON = { x0: 82, x1: 126, z0: -46, z1: 14, alto: 11, cumbrera: 16, boca: [88, 122] };
// Lugares para estacionar en el galpón (centro de cada auto, con la trompa hacia la boca).
export const GALPON_LUGARES = [0, 1, 2, 3, 4, 5].map((i) => ({ x: GALPON.x0 + 4.5 + i * 7, z: -20 }));

// Ascensor: una plataforma por piso, en el fondo del núcleo.
export const ASCENSOR = { x: -6, z: -31 };

// Restaurante "Lo de Lourdes": afuera del terreno, unos 150 m a la derecha de la mansión
// sobre la misma calle (se llega caminando o en auto). La puerta mira a la calle (+z).
// No se compra: abre solo cuando la mansión llega al RESTO_ABRE (30%).
export const RESTO = { x0: 140 + DX, x1: 178.5 + DX, z0: 25, z1: 55.5, alto: 13, pared: 0.7 };
export const RESTO_ABRE = 0.3;
// Mesas del comedor (centros) y microondas (centro de cada mesita, contra la pared del fondo).
export const RESTO_MESAS = [10.5, 19.5].flatMap((dz) => [6.5, 14.5, 22.5].map((dx) => [RESTO.x0 + dx, RESTO.z0 + dz]));
export const RESTO_MICROONDAS = [5.5, 11.5, 17.5, 23.5, 29.5].map((dx) => RESTO.x0 + dx);
// Rincón de Lourdes (adelante a la derecha): su mesa con la radio y su silla, al costado,
// así se sienta mirando al salón.
export const RESTO_LOURDES = { mesa: [RESTO.x0 + 32.5, RESTO.z0 + 25.5], silla: [RESTO.x0 + 36.3, RESTO.z0 + 25.5] };
// Parrilla Vecibanda (de ladrillo, como la de la foto), al lado del restaurante: centro del
// frente; mira a la calle (+z).
export const PARRILLA = { x: RESTO.x1 + 12, z: 50 };
// Gimnasio Power Camp: a unos 450 m de la mansión para el otro lado (izquierda, mirando desde
// la calle), sobre la misma calle. La entrada mira a la calle (+z). Siempre está abierto.
export const GYM = { x0: -480 + DX, x1: -430 + DX, z0: 14, z1: 55.5, alto: 12, pared: 0.8 };
// Entrada: puerta abierta en el medio del frente, con la alfombra START hacia adentro.
export const GYM_PUERTA = { a: -460 + DX, b: -450 + DX, alto: 8.5 };
// Kelvin, detrás del mostrador (a la derecha de la alfombra al entrar), mirando a la alfombra.
export const GYM_KELVIN = { x: -448.3 + DX, z: 48 };
// Estaciones de ejercicio: dónde se pone el jugador (y hacia dónde mira: angulo, 0 = +z).
export const GYM_ESTACIONES = {
  curl: { x: -472.5 + DX, z: 31, angulo: -Math.PI / 2 }, // parado frente al espejo, al lado del stand de mancuernas
  banca: { x: -444 + DX, z: 26.2 }, // banco plano: la cabeza hacia -z, donde están los soportes
  dominadas: { x: -434.5 + DX, z: 22 }, // barra de dominadas del rack de la pared derecha
  pecdec: { x: -463 + DX, z: 15.5 }, // torre contra la pared del fondo: el asiento mira a +z
  jalon: { x: -451 + DX, z: 15.5 }, // torre alta contra el fondo: se sienta mirando a la torre
  pecdec2: { x: -445 + DX, z: 15.5 }, // el otro pec dec: siempre lo ocupa El Shileno con el celu
};
// Montaña del pelado: colina grande atrás de la mansión (para el lado del garage), con el
// pelado y la camiseta de La Dosis en la cima. r: radio de la base, alto: de la cima.
export const MONTANA = { x: 175 + DX, z: -225, r: 125, alto: 92 };
// Bosque al pie de la montaña, donde se pierde el Cusi (misión de Juanma).
export const BOSQUE_CUSI = { x: 92 + DX, z: -122, r: 20 };
export const CUSI_ESCONDIDO = { x: 94.5 + DX, z: -124.5 };
// Ciudad Vecibanda: a unos 20 km para el lado del gym, al final de la autopista (que sigue la
// misma calle de la mansión). Centro de la ciudad en el mundo; la avenida principal es la
// autopista que entra por el este.
export const CIUDAD = { x: -4000 + DX, z: CALLE_Z }; // antes a 20 km: se hacía larguísimo
// Playa frente a la mansión (cruzando la calle): la arena va de la vereda a la orilla y el mar sigue
// hasta el horizonte. Se camina por el agua solo cerca de la orilla (hasta orilla + vadeo); el auto
// no entra al agua. El muelle sale de la arena hacia el mar.
// Llega de punta a punta del barrio (frente a los 10 terrenos).
export const PLAYA = { x0: -700 + DX, x1: 2300 + DX, z0: CALLE_Z + 8.5, orilla: CALLE_Z + 58, vadeo: 6.5, mar: { x0: -1150 + DX, x1: 4600 + DX, z1: 2600 }, muelle: { x: 46 + DX, largo: 40, ancho: 5 } };
// TP a la ciudad: el portal a la salida de la mansión (se compra, 10 T) y donde aparecés en la
// ciudad (en la avenida de la entrada, con el portal de vuelta).
export const TP_CIUDAD = { x: -18, z: 47, precio: 5e12, llegada: { x: CIUDAD.x + 296, z: CALLE_Z + 18 } };
// La autopista va desde donde termina la calle del barrio hasta la entrada de la ciudad.
export const AUTOPISTA = { x0: CIUDAD.x + 340, x1: -640 + DX, z: CALLE_Z, medioAncho: 12 };
// La calle del barrio: de la autopista hasta pasando el último terreno.
export const BARRIO = { x0: -650 + DX, x1: 2250 + DX };
// Vecibanda Motors, el Galpón Vecibanda y las misiones de los autos abren a este progreso.
export const AUTOS_DESDE = 0.6;
// Concesionario Vecibanda Motors: a la salida de la ciudad, al costado de la autopista (del
// lado de las casas), con la vidriera mirando a la autopista (-z).
export const CONCESIONARIO = { x0: CIUDAD.x + 384, x1: CIUDAD.x + 444, z0: CALLE_Z + 26, z1: CALLE_Z + 64, alto: 13 };
// El Taller, al lado de Vecibanda Motors (mismo lado de la autopista): el portón mira a la autopista.
export const TALLER = { x0: CONCESIONARIO.x1 + 18, x1: CONCESIONARIO.x1 + 50, z0: CALLE_Z + 26, z1: CALLE_Z + 56, alto: 9.5, porton: 12 };
// Autódromo Vecibanda Ring: a mitad de la autopista, del lado de las casas. x, z: dónde cae el
// punto de arriba del dibujo del trazado (la recta de arriba, la más cerca de la autopista);
// escala: unidades por píxel del dibujo; ancho: de la pista (unos 14 m).
export const AUTODROMO = { x: (AUTOPISTA.x0 + AUTOPISTA.x1) / 2, z: CALLE_Z + 100, escala: 3.2, ancho: 34 };
// Hasta dónde se puede ir caminando o en auto: el barrio, la autopista, el autódromo y la ciudad.
export const LIMITE_MAPA = { x0: CIUDAD.x - 480, x1: 2300 + DX, z0: -520, z1: 1000 };
// La Cachimba del Piojo (el barrio de El Humano): bien apartada, al norte de la autopista, a mitad
// de camino a la ciudad. Solo existe cuando El Humano te invita. Se entra por un camino de tierra
// que sale de la autopista (x del camino: entrada).
export const CACHIMBA = { x0: -2790 + DX, x1: -2550 + DX, z0: -420, z1: -240, entrada: -2670 + DX };
// ---------- La costa (zona nueva, la habilita Nico Baraja por 200B) ----------
// Sigue la calle del barrio hacia el este. Pasando la barrera se bifurca: el ramal recto sigue por
// abajo, junto a la playa de las mansiones de lujo; el ramal en curva sube al acantilado, donde
// está la parcela del galpón de tanzania (escondido arriba, mirando al mar). Ver js/costa.js.
export const COSTA = {
  x0: 2260 + DX, x1: 3460 + DX, // de la barrera al final
  barrera: 2254 + DX, // donde termina la calle del barrio (BARRIO.x1)
  nico: { x: 2236 + DX, z: CALLE_Z - 11 }, // donde espera Nico, apoyado en el Koenigsegg
  bif: 2560 + DX, // donde se abre el camino en dos
  meseta: { x0: 2880 + DX, x1: 3200 + DX, z0: -220, z1: -40, alto: 30 }, // la cima plana del cerro
  falda: { o: 290, e: 250, n: 170, s: 92 }, // cuánto baja el cerro hacia cada lado (al mar, empinado)
  galpon: { x: 3045 + DX, z: -130, ancho: 84, fondo: 56 }, // el galpón de tanzania (en la cima)
  playa: { x0: 2560 + DX, x1: 3460 + DX }, // la arena de las mansiones (de la calle a la orilla)
  precio: 2e11, // lo que pide Nico (200B)
  desde: 0.99, // la mansión al 99%
};
// El C.O.M.C.A.R. (la cárcel, js/comcar.js): en las afueras, al norte de la autopista, entre el
// barrio y la Cachimba. Se entra por un camino desde la autopista (x: entrada). Adentro (de z1 - 27
// para el norte) vive el que cae preso; la franja del sur es para las visitas.
export const COMCAR = { x0: -1920 + DX, x1: -1500 + DX, z0: -440, z1: -170, entrada: -1710 + DX };
