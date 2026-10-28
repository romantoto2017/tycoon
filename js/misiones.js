import * as THREE from 'three';
import { crearPersonaje } from './personaje.js';
import { cargarCabeza, crearEtiqueta } from './texturas.js';
import { MANSION, TERRENO as T, CUSI_ESCONDIDO as CU, AUTOS_DESDE, nivel } from './constantes.js';
import { BAUTI_GYM } from './gimnasio.js';
import { sfx } from './sfx.js';
import { formato } from './util.js';
import { AUTOS } from '../data/objetos.js';

// Misiones. Cada una es de un personaje y se cumple una sola vez (queda guardada en
// estado.misiones). El panel de misiones del HUD las muestra con su avance.
//  - Bauti: ponerse trabado (musculoso del todo en el Power Camp).
//  - Juanma: rescatar al Cusi. Al llegar la mansión al 50% jugando con Juanma salta un
//    diálogo: el Cusi se perdió en el bosque al pie de la montaña del pelado. Solo con Juanma
//    aparece ahí; lo agarrás y lo llevás a la casa. Ya rescatado, vive en el hall de la
//    mansión y se lo ve con cualquier personaje.
//  - Tepho: rescatar al Pipi (desde el 10%, igual que el Cusi): quedó tirado en el rincón más
//    escondido de la cerca, al fondo del terreno. Rescatado, se queda en el hall con el Cusi.
//  - Cualquiera: Hot-Wheels (oro en el autódromo con algún auto) y Verstappen (oro con todos).

// El Cusi: un nene, chiquito y muy cabezón.
export const CUSI = {
  id: 'cusi', nombre: 'Cusi', foto: 'cusi.jpeg', recorte: [0.385, 0.218, 0.52], pelo: '#2e2119', peinado: 'liso',
  remera: '#14806f', pantalon: '#78805d', capucha: '#14806f',
};
// El Pipi: chiquito como el Cusi pero más flaco (gordura negativa) y sin ser cabezón.
export const PIPI = {
  id: 'pipi', nombre: 'Pipi', foto: 'pipi.jpeg', recorte: [0.545, 0.62, 0.6], pelo: '#4a3020', peinado: 'liso', gordura: -0.35,
  remera: '#4fc3f7', pantalon: '#5d4037',
};
// Dónde quedó tirado: el rincón del fondo a la izquierda (mirando desde la calle), detrás de la
// fábrica y la mansión, contra la cerca (o donde va a ir, si todavía no se compró).
export const PIPI_TIRADO = { x: T.x0 + 3.4, z: T.z0 + 3.4 };

// La sección de misiones aparece cuando la mansión llega a este progreso. Una misión con
// `desde` se ve gris (un "?" de piedra, sin decir cuánto falta) hasta llegar a ese progreso.
export const MISIONES_DESDE = 0.1;
// Premio de cada misión: lo que más convenga entre `base` (fijo, según el % al que se
// desbloquea: más o menos 10 minutos de lo que se gana en ese momento de la partida) y
// `minutos` de lo que estás ganando cuando la cumplís (según lo difícil que es). La de Bauti
// es lejos la más difícil (horas de gym). `tope`: para que dejarla para el final no rompa la
// partida. `fijo`: un premio fijo (Bauti, Hot-Wheels y Verstappen).
export const MISIONES = [
  {
    id: 'trabado', personaje: 'bauti', titulo: 'Ponerse trabado', premio: { fijo: 1e11 },
    texto: 'Entrená en el Power Camp hasta adelgazar y quedar musculoso del todo.',
  },
  {
    id: 'cusi', personaje: 'juanma', titulo: 'Rescatar al Cusi', desde: 0.5, premio: { base: 2e7, minutos: 6, tope: 6e8 },
    texto: 'El Cusi se perdió. Encontralo y llevalo de vuelta a casa.',
  },
  {
    id: 'pipi', personaje: 'tepho', titulo: 'Rescatar al Pipi', desde: 0.1, premio: { base: 3e4, minutos: 8, tope: 3e7 },
    texto: 'El Pipi quedó tirado en algún lado de la cerca. Encontralo y traelo a casa.',
  },
  // De cualquier personaje (personaje: null). Sin pistas: solo el texto.
  { id: 'empilchado', personaje: null, titulo: 'Empilchado', texto: 'Comprate 5 pilchas ricas', premio: { base: 1.5e9, minutos: 3, tope: 6e9 } },
  // Autos de Vecibanda Motors (AUTOS en data/objetos.js): caros a propósito, así que pagan bien.
  { id: 'ricas_llantas', personaje: null, desde: AUTOS_DESDE, titulo: 'Ricas llantas', texto: 'Tené dos autos de colección en el galpón', premio: { base: 2e10, minutos: 8, tope: 2e11 } },
  { id: 'il_conto', personaje: null, desde: AUTOS_DESDE, titulo: 'Il conto por favore', texto: 'Comprate la Ferrari', premio: { base: 1e11, minutos: 15, tope: 5e11 } },
  // Autódromo (abre con los autos): oro con un auto y oro con todos (el Auto Deportivo incluido).
  { id: 'hotwheels', personaje: null, desde: AUTOS_DESDE, titulo: 'Hot-Wheels', texto: 'Sacá la medalla de oro en el autódromo con algún auto', premio: { fijo: 1e10 } },
  { id: 'verstappen', personaje: null, desde: AUTOS_DESDE, titulo: 'Verstappen', texto: 'Sacá la medalla de oro con todos los autos', premio: { fijo: 1e12 } },
  // Secretas: no aparecen en ningún lado hasta que se cumplen (sin querer). Ahí salta el cartel
  // grande y recién entonces se ven en la lista, ya cumplidas.
  { id: 'amistad', personaje: null, secreta: true, titulo: 'Restaurando la amistad', texto: 'Dormiste en la cama de Val con Mateo y en la de Mateo con Val', premio: { fijo: 2e7 } },
  { id: 'isa_bonanni', personaje: 'negro', secreta: true, titulo: 'Isa Bonanni', texto: 'Le pegaste 3 tiros a la Schwepa con el Negro', premio: { fijo: 5e7 } },
];
const TIROS_ISA = 3;
// Los autos del autódromo (los del concesionario y el Auto Deportivo).
const AUTOS_CARRERA = ['deportivo', ...AUTOS.map((a) => a.id)];
export const PILCHAS = 5;
export const AUTOS_COLECCION = 2;

const DIALOGO_PIPI = [
  '¿Y el Pipi? Hace un rato andaba por acá jugando...',
  'La última vez lo vi corriendo por la cerca, allá en el fondo del terreno.',
  'Seguro se cayó y quedó tirado en algún rincón. ¡Lo tengo que ir a buscar!',
];

const DIALOGO_CUSI = [
  '¿Eh? ¿Y el Cusi? ¿Alguien vio al Cusi?',
  'Estaba acá hace un rato... ¡No lo encuentro por ningún lado de la casa!',
  'Se debe haber ido para algún lado de afuera... ¡y no tengo ni idea adónde!',
  'Es chiquito, se va a asustar solo. Tengo que ir a buscarlo y traerlo de vuelta a casa.',
];

export class Misiones {
  constructor(escena, tycoon, ui) {
    this.escena = escena;
    this.tycoon = tycoon;
    this.ui = ui;
    this.alHablar = null; // main.js: abre el diálogo (personaje, líneas, alTerminar)
    this.perdidos = Object.fromEntries(Object.entries(PERDIDOS).map(([id, d]) => [id, new Perdido(this, id, d)]));
  }

  get estado() {
    const e = this.tycoon.estado;
    if (!e.misiones) e.misiones = {};
    return e.misiones;
  }

  hecha(id) {
    return this.estado[id] === true || this.estado[id] === 'rescatado';
  }

  premio(id) {
    const p = MISIONES.find((m) => m.id === id)?.premio;
    if (!p) return 0;
    if (p.fijo) return p.fijo;
    const n = Math.min(p.tope, Math.max(p.base, this.tycoon.ingresoPorSegundo * 60 * p.minutos));
    const e = 10 ** Math.max(0, Math.floor(Math.log10(n)) - 1);
    return Math.round(n / e) * e; // redondo (dos cifras)
  }

  // Cobra el premio de la misión (una sola vez; las cumplidas antes de que hubiera premios
  // también se cobran, al cargar).
  cobrar(id) {
    const e = this.tycoon.estado;
    e.premios ??= {};
    if (e.premios[id]) return 0;
    const plata = this.premio(id);
    e.premios[id] = plata;
    e.plata += plata;
    return plata;
  }

  completar(id, mensaje) {
    if (PERDIDOS[id]) this.estado[id] = 'rescatado';
    else this.estado[id] = true;
    sfx.final();
    const plata = this.cobrar(id);
    this.ui.toast(`¡Misión cumplida! ${mensaje} (+$${formato(plata)})`, 'plata');
    this.ui.puntoMisiones?.(true);
    this.tycoon.guardar?.();
  }

  // Misión secreta: la cumple y salta el cartel grande.
  completarSecreta(id) {
    if (this.hecha(id)) return;
    const m = MISIONES.find((x) => x.id === id);
    this.estado[id] = true;
    sfx.final();
    const plata = this.cobrar(id);
    this.ui.secreta?.(m.titulo, `+$${formato(plata)}`);
    this.ui.puntoMisiones?.(true);
    this.tycoon.guardar?.();
  }

  // Al dormir (main.js): dueno es de quién es el cuarto de esa cama.
  durmio(personaje, dueno) {
    if (this.hecha('amistad')) return;
    const s = (this.tycoon.estado.secretas ??= {});
    if (personaje === 'mateo' && dueno === 'val') s.mateoEnVal = true;
    if (personaje === 'val' && dueno === 'mateo') s.valEnMateo = true;
    if (s.mateoEnVal && s.valEnMateo) this.completarSecreta('amistad');
  }

  // Un tiro que le pegó a la Schwepa (main.js).
  tiroSchwepa(personaje) {
    if (personaje !== 'negro' || this.hecha('isa_bonanni')) return;
    const s = (this.tycoon.estado.secretas ??= {});
    s.tirosSchwepa = (s.tirosSchwepa || 0) + 1;
    if (s.tirosSchwepa >= TIROS_ISA) this.completarSecreta('isa_bonanni');
  }

  // Lo que muestra el panel de misiones.
  lista(jugador) {
    const e = this.tycoon.estado;
    const progreso = this.tycoon.progreso;
    return MISIONES.filter((m) => !m.secreta || this.hecha(m.id)).map((m) => {
      let avance = 0;
      let detalle = '';
      if (m.id === 'empilchado') {
        avance = Math.min(1, (e.ropa?.length || 0) / PILCHAS);
        detalle = '';
      } else if (m.id === 'ricas_llantas') {
        avance = Math.min(1, (e.autos?.length || 0) / AUTOS_COLECCION);
      } else if (m.id === 'il_conto') {
        avance = e.autos?.includes('ferrari_f40') ? 1 : 0;
      } else if (m.id === 'hotwheels' || m.id === 'verstappen') {
        const oros = this.oros();
        avance = m.id === 'hotwheels' ? Math.min(1, oros) : oros / AUTOS_CARRERA.length;
        if (m.id === 'verstappen') detalle = `Oros: ${oros} de ${AUTOS_CARRERA.length}`;
      } else if (m.id === 'trabado') {
        avance = Math.min(1, (e.bautiGym || 0) / (BAUTI_GYM.adelgazar + BAUTI_GYM.musculo));
        detalle = this.hecha('trabado') ? '¡Bauti quedó trabado!' : `Entrenamiento: ${Math.floor(avance * 100)}%`;
      } else if (PERDIDOS[m.id]) {
        const d = PERDIDOS[m.id];
        const c = this.estado[m.id];
        if (c === 'rescatado') { avance = 1; detalle = `El ${d.def.nombre} está a salvo en la casa`; }
        else if (c === 'perdido' || c === 'llevando') { avance = c === 'llevando' ? 0.75 : 0.4; detalle = c === 'llevando' ? 'Llevalo hasta la mansión' : 'Todavía no lo encontraste... ¡buscalo!'; }
        else { avance = 0; detalle = `Jugá con ${d.nombreDueno} para empezarla`; }
      }
      const bloqueada = progreso < (m.desde || 0);
      const cobrado = this.tycoon.estado.premios?.[m.id];
      return { ...m, premioPlata: cobrado || this.premio(m.id), hecha: this.hecha(m.id), bloqueada, avance, detalle, tuya: !m.personaje || jugador.personaje?.id === m.personaje };
    });
  }

  // Después de cada compra de ropa (main.js).
  revisarRopa() {
    if (!this.hecha('empilchado') && (this.tycoon.estado.ropa?.length || 0) >= PILCHAS) this.completar('empilchado', 'Empilchado');
  }

  // Después de cada compra en el concesionario (main.js).
  revisarAutos() {
    const autos = this.tycoon.estado.autos || [];
    if (!this.hecha('ricas_llantas') && autos.length >= AUTOS_COLECCION) this.completar('ricas_llantas', 'Ricas llantas');
    if (!this.hecha('il_conto') && autos.includes('ferrari_f40')) this.completar('il_conto', 'Il conto por favore');
  }

  // Con cuántos autos sacaste oro en el autódromo.
  oros() {
    const medallas = this.tycoon.estado.autodromo?.medallas || {};
    return AUTOS_CARRERA.filter((id) => medallas[id]?.includes('oro')).length;
  }

  revisarCarreras() {
    const oros = this.oros();
    if (!this.hecha('hotwheels') && oros >= 1) this.completar('hotwheels', 'Hot-Wheels');
    if (!this.hecha('verstappen') && oros >= AUTOS_CARRERA.length) this.completar('verstappen', 'Verstappen');
  }

  // ---------- Rescates (el Cusi y el Pipi) ----------
  // Texto del botón de acción, o ''.
  accion(jugador) {
    for (const p of Object.values(this.perdidos)) {
      const t = p.accion(jugador);
      if (t) return t;
    }
    return '';
  }

  hacer(jugador) {
    for (const p of Object.values(this.perdidos)) if (p.accion(jugador)) { p.agarrar(); return; }
  }

  enCasa(p) {
    return p.x > MANSION.x0 && p.x < MANSION.x1 && p.z > MANSION.z0 && p.z < MANSION.z1;
  }

  // ¿Ya se ve la sección de misiones?
  get abiertas() {
    return this.tycoon.progreso >= MISIONES_DESDE;
  }

  actualizar(dt, jugador, jugando) {
    if (!jugador.personaje) return;
    const e = this.estado;
    if (!this.premiosViejos && jugando) {
      // Partidas con misiones cumplidas de antes de los premios: se cobran una vez.
      this.premiosViejos = true;
      let total = 0;
      for (const m of MISIONES) if (this.hecha(m.id)) total += this.cobrar(m.id);
      if (total) this.ui.toast(`Premio por las misiones que ya cumpliste: +$${formato(total)}`, 'plata');
    }
    // Al pasar el 15% aparece la sección; al pasar el % de una misión, se desbloquea.
    const progreso = this.tycoon.progreso;
    const abiertas = this.abiertas;
    if (abiertas !== this.yaAbiertas) {
      if (this.yaAbiertas === false && abiertas) {
        sfx.brillo();
        this.ui.toast('¡Desbloqueaste las misiones! Tocá el botón de la lista (o M)', 'plata');
        this.ui.puntoMisiones?.(true);
      }
      this.yaAbiertas = abiertas;
      this.ui.botonMisiones?.(abiertas);
    }
    for (const m of MISIONES) {
      if (!m.desde) continue;
      const libre = progreso >= m.desde;
      if (this.libres?.[m.id] === false && libre && abiertas) {
        this.ui.toast(`¡Nueva misión desbloqueada: ${m.titulo}!`, 'plata');
        this.ui.puntoMisiones?.(true);
      }
      (this.libres ??= {})[m.id] = libre;
    }
    const id = jugador.personaje.id;
    // Bauti trabado: musculoso al 100%.
    if (jugando && !this.hecha('trabado') && id === 'bauti' && (jugador.personaje.musculo || 0) >= 1) this.completar('trabado', 'Bauti quedó trabado');
    if (jugando) this.revisarCarreras();
    for (const p of Object.values(this.perdidos)) p.actualizar(dt, jugador, jugando);
  }
}

// ---------- Rescates ----------
// El Cusi (Juanma, desde el 50%) y el Pipi (Tepho, desde el 10%): jugando con el dueño, al llegar
// al % salta un diálogo y el chico aparece perdido; lo agarrás (queda en brazos), lo llevás a la
// mansión y se queda a vivir en el hall, a la vista de todos. Estado en estado.misiones[id]:
// undefined → 'perdido' → 'llevando' → 'rescatado'.
const PERDIDOS = {
  cusi: {
    def: CUSI, dueno: 'juanma', nombreDueno: 'Juanma', escala: 0.58, cabeza: 1.95, color: '#7cf0c8', dialogo: DIALOGO_CUSI,
    perdido: { x: CU.x, z: CU.z, angulo: -0.77, pose: 'sentado' }, // en el bosque, mirando para el lado de la casa
    casa: { x: -4.5, z: -4, angulo: 0.4 }, // en el hall de planta baja, mirando a la puerta
    agarrar: 'Agarrar al Cusi (E)', alAgarrar: 'Juanma: "¡Acá estabas! Vamos a casa, Cusi"',
    llama: 'Cusi: "¡¡Juanmaaa!! ¡Acá estoy!"', cumplida: 'El Cusi volvió a casa',
  },
  pipi: {
    def: PIPI, dueno: 'tepho', nombreDueno: 'Tepho', escala: 0.56, cabeza: 1, color: '#9fdcff', dialogo: DIALOGO_PIPI,
    perdido: { x: PIPI_TIRADO.x, z: PIPI_TIRADO.z, angulo: 0.8, pose: 'tirado' }, // tirado en el pasto, contra la cerca
    casa: { x: -1.6, z: -3.4, angulo: -0.25 }, // al lado del Cusi
    agarrar: 'Levantar al Pipi (E)', alAgarrar: 'Tepho: "¡Pipi! ¿Qué hacés tirado acá? Vamos a casa"',
    llama: 'Pipi: "¡¡Tephooo!! ¡Estoy acá, en la cerca!"', cumplida: 'El Pipi volvió a casa (con el Cusi)',
  },
};

class Perdido {
  constructor(misiones, id, d) {
    this.m = misiones;
    this.id = id;
    this.d = d;
    this.modelo = null;
    this.cargando = false;
    this.llevando = false;
    this.lugar = null;
    this.reloj = 0;
  }

  get estado() { return this.m.estado[this.id]; }
  set estado(v) { this.m.estado[this.id] = v; }

  // ¿Ya pasó el % de su misión? Antes de eso no existe y la misión no se puede hacer.
  get disponible() {
    return this.m.tycoon.progreso >= MISIONES.find((x) => x.id === this.id).desde;
  }

  async crear() {
    this.cargando = true;
    const { def, escala, cabeza: grande, color } = this.d;
    const m = crearPersonaje(def, await cargarCabeza(def));
    if (grande !== 1) {
      // Cabezón: la cabeza crece desde el cuello (y la capucha y todo lo demás quedan igual).
      const { cabeza } = m.partes;
      cabeza.scale.setScalar(grande);
      cabeza.position.y = 2 + 0.65 * grande;
    }
    m.grupo.scale.setScalar(escala);
    const nombre = crearEtiqueta([{ texto: def.nombre, tam: 60, color }], 4);
    nombre.sprite.position.y = 6 + 1.85 * grande;
    m.grupo.add(nombre.sprite);
    this.etiqueta = nombre.sprite;
    this.modelo = m;
    this.cargando = false;
  }

  // Dónde tiene que estar ahora (o null si no se ve).
  donde(jugador) {
    if (!this.disponible) return null;
    const c = this.estado;
    if (c === 'rescatado') return 'casa';
    if (c === 'perdido' && jugador.personaje?.id === this.d.dueno) return 'perdido';
    if (c === 'llevando' && this.llevando) return 'brazos';
    return null;
  }

  poner(lugar, jugador) {
    const g = this.modelo.grupo;
    if (g.parent) g.parent.remove(g);
    this.lugar = lugar;
    if (!lugar) return;
    g.rotation.order = 'YXZ';
    if (lugar === 'brazos') {
      // En brazos del dueño, adelante a la altura del pecho, sentadito.
      g.position.set(0, 1.65, 1.15);
      g.rotation.set(0, 0, 0);
      jugador.contenedor.add(g);
      this.etiqueta.visible = false;
    } else {
      const p = lugar === 'casa' ? this.d.casa : this.d.perdido;
      g.position.set(p.x, lugar === 'casa' ? nivel(0) : 0, p.z);
      // Tirado: boca arriba en el pasto (la cabeza para el lado del ángulo).
      g.rotation.set(lugar === 'perdido' && p.pose === 'tirado' ? -Math.PI / 2 : 0, p.angulo, 0);
      this.m.escena.add(g);
      this.etiqueta.visible = lugar === 'casa';
    }
  }

  dist(jugador) {
    if (this.lugar !== 'perdido') return Infinity;
    return Math.hypot(jugador.pos.x - this.d.perdido.x, jugador.pos.z - this.d.perdido.z);
  }

  accion(jugador) {
    if (this.lugar === 'perdido' && this.dist(jugador) < 4 && jugador.pos.y < 2) return this.d.agarrar;
    return '';
  }

  agarrar() {
    if (!this.disponible) return;
    this.estado = 'llevando';
    this.llevando = true;
    sfx.brillo();
    this.m.ui.toast(this.d.alAgarrar, 'info');
  }

  // Si se cambia de personaje con el chico en brazos, vuelve a donde estaba perdido.
  soltar() {
    if (this.estado === 'llevando') this.estado = 'perdido';
    this.llevando = false;
  }

  actualizar(dt, jugador, jugando) {
    const id = jugador.personaje.id;
    const d = this.d;
    // Al llegar al % con el dueño: se pierde (diálogo).
    if (jugando && !this.estado && id === d.dueno && this.disponible && this.m.alHablar && !this.m.hablando) {
      this.m.hablando = true;
      this.m.alHablar(d.dueno, d.dialogo, () => {
        this.estado = 'perdido';
        this.m.hablando = false;
        this.m.ui.toast(`Nueva misión: Rescatar al ${d.def.nombre}`, 'info');
        this.m.tycoon.guardar?.();
      });
    }
    // Una partida guardada a mitad del rescate arranca con el chico perdido otra vez.
    if (this.estado === 'llevando' && !this.llevando) this.estado = 'perdido';
    if (this.estado === 'llevando' && id !== d.dueno) this.soltar();
    const lugar = this.donde(jugador);
    if (lugar && !this.modelo) {
      if (!this.cargando) this.crear();
      return;
    }
    if (this.modelo && lugar !== this.lugar) this.poner(lugar, jugador);
    if (!this.modelo || !lugar) return;
    // Llegó a la casa con el chico en brazos.
    if (lugar === 'brazos') {
      jugador.modelo && (jugador.modelo.llevar = true);
      this.modelo.animar(dt, 0, true, false, true);
      if (this.m.enCasa(jugador.pos) && this.disponible) {
        this.llevando = false;
        if (jugador.modelo) jugador.modelo.llevar = false;
        this.m.completar(this.id, d.cumplida);
      }
      return;
    }
    this.reloj += dt;
    const g = this.modelo.grupo;
    if (lugar === 'perdido') {
      // Sentadito (o tirado) y perdido; cuando te acercás te llama.
      const tirado = d.perdido.pose === 'tirado';
      this.modelo.animar(dt, 0, true, false, !tirado);
      g.position.y = tirado ? 0.32 : -0.55;
      const dist = this.dist(jugador);
      this.etiqueta.visible = dist < 14;
      if (dist < 12 && !this.llamo) {
        this.llamo = true;
        this.m.ui.toast(d.llama, 'info');
      }
      if (dist > 25) this.llamo = false;
    } else {
      // En casa: parado, mira al que se acerca y se balancea un poquito.
      this.modelo.animar(dt, 0, true);
      g.position.y = nivel(0);
      const cerca = Math.hypot(jugador.pos.x - g.position.x, jugador.pos.z - g.position.z) < 12 && Math.abs(jugador.pos.y - nivel(0)) < 3;
      const objetivo = cerca ? Math.atan2(jugador.pos.x - g.position.x, jugador.pos.z - g.position.z) : d.casa.angulo;
      let a = objetivo - g.rotation.y;
      a = Math.atan2(Math.sin(a), Math.cos(a));
      g.rotation.y += a * Math.min(1, dt * 5);
      g.rotation.z = Math.sin(this.reloj * 2.2 + (this.id === 'pipi' ? 1.3 : 0)) * 0.03;
    }
  }
}
