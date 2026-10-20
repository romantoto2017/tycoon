// Orden de compra de la mansión. Cada ítem es un botón en el piso.
// - requiere: ids que tienen que estar comprados para que aparezca el botón
// - boton:    [x, y, z] donde aparece
// - tipo:     'dropper' | 'mejora' | 'construccion'
// - muebles:  true si son muebles (la cámara los atraviesa)
// Los precios salen de js/precios.js (generado con herramientas/balance.mjs),
// salvo los objetos especiales y cuadros, que están en data/objetos.js.
// Este archivo no importa three: lo usa también la simulación de balance.
import { DROPPERS, MEJORAS_VALOR, MEJORAS_VELOCIDAD, OBJETOS_VECIBANDA, CUADROS } from '../data/objetos.js';
import { SLOTS_DROPPER, nivel } from './constantes.js';
import { PRECIOS } from './precios.js';
import * as A from './arquitectura.js';
import * as Mu from './muebles.js';
import * as Ex from './exterior.js';
import * as Es from './especiales.js';

// Posiciones de botones dentro de la casa (por piso).
const H1 = [-2.6, -3];
const H2 = [2.6, -3];
const H4 = [2.6, -8];
const SUBIR_PAR = [-2.5, -9.5];   // al pie de la escalera tipo A
const SUBIR_IMPAR = [2.5, -26.3]; // al pie de la escalera tipo B
const SALA = { WF: [-8, -6], EF: [8, -6], WB: [-13, -17], EB: [13, -17] };
const Z_MEJORAS = [-36, -30, -24, -18, -12, -6, 0, 6, 12, 18, 24];

const en = (piso, [x, z]) => [x, nivel(piso), z];
const suelo = (x, z) => [x, 0, z];

const lista = [];
const agregar = (item) => lista.push(item);

function dropper(i, requiere) {
  agregar({
    id: `dropper${i + 1}`, nombre: DROPPERS[i].nombre, tipo: 'dropper', dropper: i, requiere,
    boton: i === 0 ? suelo(-6, 30) : suelo(-50, SLOTS_DROPPER[i]),
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
    tipo: 'mejora', requiere, boton: suelo(-37, Z_MEJORAS[nZ++ % Z_MEJORAS.length]),
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
  obra(`ventanas_${s}`, n === 0 ? 'Puerta y Ventanas' : `Ventanas ${nombre}`, [`paredes_${s}`], en(n, H2),
    (k, g) => A.aberturas(k, g, n));
  entre?.[2]?.();
  obra(`paredes_int_${s}`, `Habitaciones ${nombre}`, [`ventanas_${s}`], en(n, H4), (k, g) => A.paredesInteriores(k, g, n));
}

function sala(id, nombre, piso, lugar, construir) {
  obra(id, nombre, [`paredes_int_${SUF[piso]}`], en(piso, SALA[lugar]), construir, { muebles: true });
}

const subir = (n) => en(n, n % 2 === 0 ? SUBIR_PAR : SUBIR_IMPAR);

// ---------- Orden de la partida ----------

// Se arranca sin nada: primero el terreno y la primera máquina, los dos gratis.
obra('terreno', 'Comprar Terreno', [], suelo(0, 32), Ex.terreno, { gratis: true });
dropper(0, ['terreno']);
estructuraPiso(0, ['dropper1'], suelo(0, 6), [
  () => dropper(1, ['piso_pb']),
  () => mejora('valor', ['dropper2']),
  () => dropper(2, ['dropper2', 'ventanas_pb']),
]);
mejora('velocidad', ['monedas_x2', 'paredes_int_pb']);
sala('living', 'Living', 0, 'WF', Mu.living);
sala('cocina', 'Cocina', 0, 'WB', Mu.cocina);
mejora('valor', ['vel1', 'living']);
sala('sala_juegos', 'Sala de Juegos', 0, 'EF', Mu.salaJuegos);
sala('banio_pb', 'Baño', 0, 'EB', Mu.banioPB);
dropper(3, ['dropper3', 'cocina']);
obra('camino', 'Camino de Entrada', ['ventanas_pb'], suelo(-22, 14), Ex.camino);

estructuraPiso(1, ['living', 'cocina', 'sala_juegos', 'banio_pb'], subir(0), [
  () => dropper(4, ['dropper4', 'piso_1']),
  () => mejora('valor', ['valor2', 'piso_1']),
]);
sala('dormitorio1', 'Dormitorio', 1, 'WF', Mu.dormitorio1);
mejora('velocidad', ['vel1', 'paredes_int_1']);
sala('dormitorio2', 'Cuarto de las Cuchetas', 1, 'WB', Mu.dormitorio2);
dropper(5, ['dropper5', 'dormitorio1']);
sala('sala_gamer', 'Sala Gamer', 1, 'EF', Mu.salaGamer);
sala('banio_1', 'Baño del Primer Piso', 1, 'EB', Mu.banio1);
obra('cerca', 'Cerca y Portón', ['camino'], suelo(-22, 20), Ex.cerca);
obra('jardin', 'Jardín', ['cerca'], suelo(-22, 26), Ex.jardin);
mejora('valor', ['valor3', 'sala_gamer']);

estructuraPiso(2, ['dormitorio1', 'dormitorio2', 'sala_gamer', 'banio_1'], subir(1), [
  () => dropper(6, ['dropper6', 'piso_2']),
]);
mejora('velocidad', ['vel2', 'paredes_int_2']);
sala('dorm_principal', 'Dormitorio Principal', 2, 'WF', Mu.dormitorioPrincipal);
sala('gimnasio', 'Gimnasio', 2, 'WB', Mu.gimnasio);
mejora('valor', ['valor4', 'gimnasio']);
sala('cine', 'Cine', 2, 'EF', Mu.cine);
sala('biblioteca', 'Biblioteca', 2, 'EB', Mu.biblioteca);
obra('piscina', 'Piscina', ['piso_2'], suelo(0, -33), Ex.piscina);
dropper(7, ['dropper7', 'cine']);
obra('reposeras', 'Reposeras y Sombrillas', ['piscina'], suelo(-18, -40), Ex.reposeras, { muebles: true });
obra('trampolin', 'Trampolín', ['piscina'], suelo(18, -40), Ex.trampolin);
obra('parrilla', 'Parrilla', ['jardin', 'piso_2'], suelo(-28, -36), Ex.parrilla, { muebles: true });

estructuraPiso(3, ['dorm_principal', 'gimnasio', 'cine', 'biblioteca'], subir(2), [
  () => mejora('valor', ['valor5', 'piso_3']),
  null,
  () => dropper(8, ['dropper8', 'ventanas_3']),
]);
sala('salon_fiestas', 'Salón de Fiestas', 3, 'WF', Mu.salonFiestas);
sala('estudio_musica', 'Estudio de Música', 3, 'WB', Mu.estudioMusica);
mejora('velocidad', ['vel3', 'salon_fiestas']);
sala('bar', 'Bar Vecibanda', 3, 'EF', Mu.bar);
sala('trofeos', 'Sala de Trofeos', 3, 'EB', Mu.salaTrofeos);
obra('garage', 'Garage', ['piso_3', 'camino'], suelo(40, 24), Ex.garage);
obra('auto', 'Auto de la Vecibanda', ['garage'], suelo(40, 30), Ex.auto);
obra('cancha', 'Cancha de Fútbol', ['piso_3'], suelo(25, -20), Ex.cancha);
obra('farolas', 'Farolas', ['jardin', 'piso_3'], suelo(-22, 32), Ex.farolas);
obra('fuente', 'Fuente', ['farolas'], suelo(-28, 26), Ex.fuente);

obra('techo', 'Escalera + Terraza', ['salon_fiestas', 'estudio_musica', 'bar', 'trofeos'], subir(3), A.terraza);
dropper(9, ['dropper9', 'techo']);
mejora('valor', ['valor6', 'techo']);
obra('jacuzzi', 'Jacuzzi en la Terraza', ['techo'], en(4, [-6, -16]), Mu.jacuzzi, { muebles: true });

// ---------- Objetos especiales y cuadros (de data/objetos.js) ----------

const ETAPAS = {
  1: 'dropper1', 2: 'piso_pb', 3: 'paredes_pb', 4: 'ventanas_pb', 5: 'dropper3',
  6: 'living', 7: 'piso_1', 8: 'piso_2', 9: 'piso_3', 10: 'techo',
};

function insertarDespues(idPrevio, item) {
  let i = lista.findIndex((x) => x.id === idPrevio);
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

CUADROS.slice(0, 8).forEach((c, i) => {
  const { piso, lado } = Es.slotCuadro(i);
  const previo = `paredes_int_${SUF[piso]}`;
  insertarDespues(previo, {
    id: `cuadro${i + 1}`, nombre: c.nombre, precio: c.precio, tipo: 'construccion', especial: true,
    requiere: [previo], boton: en(piso, [lado * 2.6, -6]),
    construir: (k, g) => Es.cuadro(k, g, i, c),
  });
});

// ---------- Final ----------

agregar({
  id: 'cartel_final', nombre: '¡CARTEL LA VECIBANDA HOUSE!', tipo: 'construccion', final: true,
  requiere: lista.map((i) => i.id), boton: suelo(0, 44), construir: Es.cartelFinal,
});

for (const item of lista) {
  if (item.precio === undefined) item.precio = item.gratis ? 0 : (PRECIOS[item.id] ?? 1e15);
}

export const ITEMS = lista;
export const ITEMS_POR_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
