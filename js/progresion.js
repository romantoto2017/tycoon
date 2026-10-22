// Orden de compra de la mansión. Cada ítem es un botón en el piso.
// - requiere: ids que tienen que estar comprados para que aparezca el botón
// - boton:    [x, y, z] donde aparece
// - tipo:     'dropper' | 'mejora' | 'construccion'
// - muebles:  true si son muebles (la cámara los atraviesa)
// - multPrecio: cuántas veces más caro que lo que le tocaría por su lugar en la partida
// - mueble:   true si es un mueble de una habitación (se compran de a uno, en orden)
// Los precios salen de js/precios.js (generado con herramientas/balance.mjs),
// salvo los objetos especiales y cuadros, que están en data/objetos.js.
// Este archivo no importa three: lo usa también la simulación de balance.
import { DROPPERS, MEJORAS_VALOR, MEJORAS_VELOCIDAD, OBJETOS_VECIBANDA, CUADROS, OBRAS_DE_ARTE, LUJOS } from '../data/objetos.js';
import { PERSONAJES } from '../data/personajes.js';
import { SLOTS_DROPPER, ASCENSOR, nivel } from './constantes.js';
import { PRECIOS } from './precios.js';
import * as A from './arquitectura.js';
import * as Mu from './muebles.js';
import * as Ex from './exterior.js';
import * as Es from './especiales.js';

// Posiciones de botones dentro de la casa (por piso), en el hall del frente.
const H1 = [-4, -3];
const H2 = [4, -3];
const H4 = [4, -8];
const SUBIR_PAR = [-2, -9.5];   // al pie de la escalera tipo A
const SUBIR_IMPAR = [2, -30.5]; // al pie de la escalera tipo B
const Z_MEJORAS = [-36, -30, -24, -18, -12, -6, 0, 6, 12, 18, 24];

const en = (piso, [x, z]) => [x, nivel(piso), z];
const suelo = (x, z) => [x, 0, z];

const lista = [];
const agregar = (item) => lista.push(item);

function dropper(i, requiere) {
  agregar({
    id: `dropper${i + 1}`, nombre: DROPPERS[i].nombre, tipo: 'dropper', dropper: i, requiere,
    boton: i === 0 ? suelo(-5, 51) : suelo(-66, SLOTS_DROPPER[i]),
    ...(i === 0 ? { gratis: true } : {}),
  });
}

let nValor = 0;
let nVel = 0;
let nZ = 0;
function mejora(clase, requiere) {
  const valor = clase === 'valor';
  const n = valor ? nValor++ : nVel++;
  agregar({
    id: valor ? (n === 0 ? 'monedas_x2' : `valor${n + 1}`) : `vel${n + 1}`,
    nombre: valor ? MEJORAS_VALOR[n] : MEJORAS_VELOCIDAD[n],
    tipo: 'mejora', requiere, boton: suelo(-53, Z_MEJORAS[nZ++ % Z_MEJORAS.length]),
    ...(valor ? { valor: 2 } : { velocidad: 1.25 }),
  });
}

function obra(id, nombre, requiere, boton, construir, extra = {}) {
  agregar({ id, nombre, tipo: 'construccion', requiere, boton, construir, ...extra });
}

const NOMBRES_PISO = ['Planta Baja', 'Primer Piso', 'Segundo Piso', 'Tercer Piso'];
const SUF = ['pb', '1', '2', '3'];

// Losa, paredes, ventanas e interiores de un piso.
function estructuraPiso(n, requierePiso, botonPiso, entre) {
  const s = SUF[n];
  const nombre = NOMBRES_PISO[n];
  obra(`piso_${s}`, n === 0 ? 'Piso Planta Baja' : `Escalera + ${nombre}`, requierePiso, botonPiso,
    (k, g) => A.pisoConEscalera(k, g, n));
  entre?.[0]?.();
  obra(`paredes_${s}`, `Paredes ${nombre}`, [`piso_${s}`], en(n, H1), (k, g) => A.paredesExteriores(k, g, n));
  entre?.[1]?.();
  obra(`ventanas_${s}`, n === 0 ? 'Puerta y Ventanales' : `Ventanales ${nombre}`, [`paredes_${s}`], en(n, H2),
    (k, g) => A.aberturas(k, g, n));
  entre?.[2]?.();
  obra(`paredes_int_${s}`, `Habitaciones ${nombre}`, [`ventanas_${s}`], en(n, H4), (k, g) => A.paredesInteriores(k, g, n));
}

// Habitación: cada mueble es un botón en el piso, donde va el mueble. Se compran en
// orden (aparece uno por habitación). `id` de la habitación queda como alias del último
// mueble, para usarlo de requisito; MIGRAR convierte partidas que la compraban entera.
const salasPiso = [[], [], [], []];
const ALIAS = {};
export const MIGRAR = {};
function sala(id, nombre, piso, lugar, diseno, extra) {
  let previo = `paredes_int_${SUF[piso]}`;
  MIGRAR[id] = [];
  Mu.mueblesDe(diseno).forEach((m, i) => {
    const mid = `${id}_${m.id}`;
    agregar({
      id: mid, nombre: m.nombre, sala: nombre, tipo: 'construccion', mueble: true, muebles: true,
      requiere: [previo], boton: Mu.botonMueble(diseno, lugar, piso, m.boton),
      construir: (k, g) => Mu.amueblar(k, g, diseno, i, lugar, piso, extra),
    });
    MIGRAR[id].push(mid);
    previo = mid;
  });
  ALIAS[id] = previo;
  salasPiso[piso].push(id);
}

// Cuarto de cada integrante, en el orden de data/personajes.js.
const LUGARES_CUARTOS = [[1, 'WIF'], [1, 'WIB'], [1, 'WOF'], [1, 'WOB'], [1, 'EOF'], [1, 'EOB'], [2, 'WIF'], [2, 'WIB'], [2, 'WOF'], [2, 'WOB']];
function cuarto(i) {
  const p = PERSONAJES[i];
  if (!p || !LUGARES_CUARTOS[i]) return;
  const [piso, lugar] = LUGARES_CUARTOS[i];
  sala(`cuarto_${p.id}`, `Cuarto de ${p.nombre}`, piso, lugar, 'cuarto', p);
}

const subir = (n) => en(n, n % 2 === 0 ? SUBIR_PAR : SUBIR_IMPAR);

// ---------- Orden de la partida ----------

// Se arranca sin nada: primero el terreno y la primera máquina, los dos gratis.
obra('terreno', 'Comprar Terreno', [], suelo(0, 44), Ex.terreno, { gratis: true });
dropper(0, ['terreno']);
estructuraPiso(0, ['dropper1'], suelo(0, 7), [
  () => dropper(1, ['piso_pb']),
  () => mejora('valor', ['dropper2']),
  () => dropper(2, ['dropper2', 'ventanas_pb']),
]);
mejora('velocidad', ['monedas_x2', 'paredes_int_pb']);
sala('living', 'Living', 0, 'WIF', 'living');
sala('cocina', 'Cocina', 0, 'WIB', 'cocina');
mejora('valor', ['vel1', 'living']);
sala('comedor', 'Comedor', 0, 'WOF', 'comedor');
sala('banio_pb', 'Baño y Lavadero', 0, 'WOB', 'banioPB');
sala('sala_juegos', 'Sala de Juegos', 0, 'EIF', 'salaJuegos');
dropper(3, ['dropper3', 'cocina']);
sala('arcade', 'Arcade', 0, 'EIB', 'arcade');
sala('playroom', 'Playroom', 0, 'EOF', 'playroom');
sala('spa', 'Spa', 0, 'EOB', 'spa');
obra('camino', 'Camino de Entrada', ['ventanas_pb'], suelo(-30, 14), Ex.camino);
obra('cascadas', 'Cascadas de la Entrada', ['camino'], suelo(-38, 14), Ex.cascadas);

estructuraPiso(1, salasPiso[0], subir(0), [
  () => dropper(4, ['dropper4', 'piso_1']),
  () => mejora('valor', ['valor2', 'piso_1']),
]);
agregar({ id: 'ascensor', nombre: 'Ascensor', tipo: 'construccion', requiere: ['piso_1'], boton: en(0, [ASCENSOR.x, ASCENSOR.z]) });
agregar({ id: 'auto_cobro', nombre: 'Cobrador Automático', tipo: 'construccion', requiere: ['piso_1', 'dropper5'], boton: suelo(-50, 34) });
// Garage, AK-47 y auto alrededor del 20% de la partida. El AK cuesta más que lo que
// hay alrededor y el auto bastante más (multPrecio, ver herramientas/balance.mjs).
obra('garage', 'Garage', ['piso_1', 'cascadas'], suelo(59, 24), Ex.garage);
obra('ak47', 'AK-47 (para la Schwepa)', ['garage'], suelo(66.5, 2), Es.armero, {
  descripcion: 'Apretá 1 o el botón de abajo para sacarla', multPrecio: 3,
});
agregar({ id: 'auto', nombre: 'Auto Deportivo (manejable)', tipo: 'construccion', requiere: ['ak47'], boton: suelo(59, 30), multPrecio: 10 });
cuarto(0);
cuarto(1);
mejora('velocidad', ['vel1', 'paredes_int_1']);
cuarto(2);
cuarto(3);
dropper(5, ['dropper5', 'cuarto_toto']);
sala('sala_gamer', 'Sala Gamer', 1, 'EIF', 'salaGamer');
sala('banio_1', 'Baño del Primer Piso', 1, 'EIB', 'banio1');
cuarto(4);
cuarto(5);
obra('cerca', 'Cerca y Portón', ['camino'], suelo(-30, 22), Ex.cerca);
obra('jardin', 'Jardín', ['cerca'], suelo(-38, 22), Ex.jardin);
mejora('valor', ['valor3', 'sala_gamer']);

estructuraPiso(2, salasPiso[1], subir(1), [
  () => dropper(6, ['dropper6', 'piso_2']),
]);
mejora('velocidad', ['vel2', 'paredes_int_2']);
cuarto(6);
cuarto(7);
sala('cine', 'Cine', 2, 'EIF', 'cine');
sala('gimnasio', 'Gimnasio', 2, 'EIB', 'gimnasio');
mejora('valor', ['valor4', 'gimnasio']);
cuarto(8);
cuarto(9);
sala('biblioteca', 'Biblioteca', 2, 'EOF', 'biblioteca');
sala('dorm_principal', 'Suite Principal', 2, 'EOB', 'dormitorioPrincipal');
obra('piscina', 'Piscina', ['piso_2'], suelo(0, -36), Ex.piscina);
dropper(7, ['dropper7', 'cine']);
obra('reposeras', 'Reposeras y Sombrillas', ['piscina'], suelo(-20, -50), Ex.reposeras, { muebles: true });
obra('trampolin', 'Trampolín', ['piscina'], suelo(20, -50), Ex.trampolin);
obra('parrilla', 'Parrilla', ['jardin', 'piso_2'], suelo(-28, -44), Ex.parrilla, { muebles: true });

estructuraPiso(3, salasPiso[2], subir(2), [
  () => mejora('valor', ['valor5', 'piso_3']),
  null,
  () => dropper(8, ['dropper8', 'ventanas_3']),
]);
sala('salon_fiestas', 'Salón de Fiestas', 3, 'WIF', 'salonFiestas');
sala('estudio_musica', 'Estudio de Música', 3, 'WIB', 'estudioMusica');
mejora('velocidad', ['vel3', 'salon_fiestas']);
sala('karaoke', 'Karaoke', 3, 'WOF', 'karaoke');
sala('invitados', 'Cuarto de Invitados', 3, 'WOB', 'dormitorio2');
sala('bar', 'Bar Vecibanda', 3, 'EIF', 'bar');
sala('trofeos', 'Sala de Trofeos', 3, 'EIB', 'salaTrofeos');
sala('streaming', 'Estudio de Streaming', 3, 'EOF', 'streaming');
sala('suite_vip', 'Suite VIP', 3, 'EOB', 'dormitorio1');
obra('cancha', 'Cancha de Fútbol', ['piso_3'], suelo(24, -60), Ex.cancha);
obra('gradas', 'Gradas y Marcador', ['cancha'], suelo(24, -44), Ex.gradas);
obra('farolas', 'Farolas', ['jardin', 'piso_3'], suelo(-30, 30), Ex.farolas);
obra('fuente', 'Fuente', ['farolas'], suelo(-38, 30), Ex.fuente);

obra('techo', 'Escalera + Terraza', salasPiso[3], subir(3), A.terraza);
dropper(9, ['dropper9', 'techo']);
mejora('valor', ['valor6', 'techo']);
obra('jacuzzi', 'Jacuzzi en la Terraza', ['techo'], en(4, [-8, -16]), Mu.jacuzzi, { muebles: true });

// ---------- Objetos especiales y cuadros (de data/objetos.js) ----------

const ETAPAS = {
  1: 'dropper1', 2: 'piso_pb', 3: 'paredes_pb', 4: 'ventanas_pb', 5: 'dropper3',
  6: 'living', 7: 'piso_1', 8: 'piso_2', 9: 'piso_3', 10: 'techo',
};

// Una habitación se nombra por su id, pero en la lista está su último mueble.
const real = (id) => ALIAS[id] || id;

function insertarDespues(idPrevio, item) {
  let i = lista.findIndex((x) => x.id === real(idPrevio));
  if (i < 0) i = lista.length - 1;
  // Después del previo y de los especiales ya insertados ahí.
  while (lista[i + 1]?.especial) i++;
  lista.splice(i + 1, 0, item);
}

OBJETOS_VECIBANDA.forEach((obj, i) => {
  const etapa = Math.min(10, Math.max(1, Math.round(obj.etapa) || 1));
  const [x, z] = Es.SLOTS_ESPECIALES[i % Es.SLOTS_ESPECIALES.length];
  insertarDespues(ETAPAS[etapa], {
    id: `especial${i + 1}`, nombre: obj.nombre, descripcion: obj.descripcion, precio: obj.precio,
    tipo: 'construccion', especial: true, requiere: [ETAPAS[etapa]],
    boton: suelo(x < 0 ? x - 4.5 : x + 4.5, z),
    construir: (k, g) => Es.objetoEspecial(k, g, i, obj),
  });
});

CUADROS.forEach((c, i) => {
  const { piso, lado, z } = Es.slotCuadro(i);
  const previo = `paredes_int_${SUF[piso]}`;
  insertarDespues(previo, {
    id: `cuadro${i + 1}`, nombre: c.nombre, precio: c.precio, tipo: 'construccion', especial: true,
    requiere: [previo], boton: en(piso, [lado * 5.5, z]),
    construir: (k, g) => Es.cuadro(k, g, i, c),
  });
});

// Obras de arte famosas: dos por piso en las paredes de los pasillos.
OBRAS_DE_ARTE.slice(0, 8).forEach((o, i) => {
  const { piso, lado } = Es.slotObra(i);
  const previo = `paredes_int_${SUF[piso]}`;
  insertarDespues(previo, {
    id: `obra${i + 1}`, nombre: o.nombre, precio: o.precio, tipo: 'construccion', especial: true,
    requiere: [previo], boton: en(piso, [lado * 26, -17.2]),
    construir: (k, g) => Es.obra(k, g, i, o),
  });
});

// Lujos: cada uno en su lugar fijo, que además tiene que existir.
const LUGAR_LUJO = {
  estatuas: { base: ['ventanas_pb'], boton: suelo(-5.5, 6), construir: Es.estatuas },
  nico_carton: { base: ['paredes_int_pb'], boton: en(0, [3.5, -1.6]), construir: Es.nicoCarton },
  piano: { base: ['paredes_int_pb'], boton: en(0, [5.5, -31.5]), construir: Es.piano },
  trex: { base: ['jardin'], boton: suelo(-34, 42), construir: Es.trex },
  boveda: { base: ['garage', 'techo'], boton: suelo(50, -3), construir: Es.boveda },
  piscina_inf: { base: ['techo'], boton: en(4, [14, -17]), construir: Es.piscinaInfinita },
  helicoptero: { base: ['techo'], boton: en(4, [32, -20]), construir: Es.helicoptero },
};
LUJOS.forEach((l) => {
  const lugar = LUGAR_LUJO[l.id];
  if (!lugar) return;
  const etapa = Math.min(10, Math.max(1, Math.round(l.etapa) || 1));
  const requiere = [ETAPAS[etapa], ...lugar.base];
  const indice = (id) => lista.findIndex((x) => x.id === real(id));
  const ultimo = requiere.reduce((a, id) => (indice(id) > indice(a) ? id : a));
  insertarDespues(ultimo, {
    id: `lujo_${l.id}`, nombre: l.nombre, precio: l.precio, tipo: 'construccion', especial: true,
    requiere, boton: lugar.boton, construir: lugar.construir,
  });
});

// Los requisitos que nombran una habitación apuntan a su último mueble.
for (const item of lista) item.requiere = item.requiere.map((r) => ALIAS[r] || r);

// ---------- Final ----------

agregar({
  id: 'cartel_final', nombre: '¡CARTEL LA VECIBANDA HOUSE!', tipo: 'construccion', final: true,
  requiere: lista.map((i) => i.id), boton: suelo(0, 53.5), construir: Es.cartelFinal,
});

for (const item of lista) {
  if (item.precio === undefined) item.precio = item.gratis ? 0 : (PRECIOS[item.id] ?? 1e15);
}

export const ITEMS = lista;
export const ITEMS_POR_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
