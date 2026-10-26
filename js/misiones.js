import * as THREE from 'three';
import { crearPersonaje } from './personaje.js';
import { cargarCabeza, crearEtiqueta } from './texturas.js';
import { MANSION, CUSI_ESCONDIDO as CU, nivel } from './constantes.js';
import { BAUTI_GYM } from './gimnasio.js';
import { sfx } from './sfx.js';
import { formato } from './util.js';

// Misiones. Cada una es de un personaje y se cumple una sola vez (queda guardada en
// estado.misiones). El panel de misiones del HUD las muestra con su avance.
//  - Bauti: ponerse trabado (musculoso del todo en el Power Camp).
//  - Juanma: rescatar al Cusi. Al llegar la mansión al 50% jugando con Juanma salta un
//    diálogo: el Cusi se perdió en el bosque al pie de la montaña del pelado. Solo con Juanma
//    aparece ahí; lo agarrás y lo llevás a la casa. Ya rescatado, vive en el hall de la
//    mansión y se lo ve con cualquier personaje.

// El Cusi: un nene, chiquito y muy cabezón.
export const CUSI = {
  id: 'cusi', nombre: 'Cusi', foto: 'cusi.jpeg', recorte: [0.385, 0.218, 0.52], pelo: '#2e2119', peinado: 'liso',
  remera: '#14806f', pantalon: '#78805d', capucha: '#14806f',
};
const ESCALA_CUSI = 0.58;
const CABEZON = 1.95;
const CASA_CUSI = { x: -4.5, z: -4, angulo: 0.4 }; // en el hall de planta baja, mirando a la puerta

// La sección de misiones aparece cuando la mansión llega a este progreso. Una misión con
// `desde` se ve gris (un "?" de piedra, sin decir cuánto falta) hasta llegar a ese progreso.
export const MISIONES_DESDE = 0.15;
// Premio de cada misión: lo que más convenga entre `base` (fijo, según el % al que se
// desbloquea: más o menos 10 minutos de lo que se gana en ese momento de la partida) y
// `minutos` de lo que estás ganando cuando la cumplís (según lo difícil que es). La de Bauti
// es lejos la más difícil (horas de gym): la que más minutos paga. `tope`: para que dejarla para
// el final no rompa la partida.
export const MISIONES = [
  {
    id: 'trabado', personaje: 'bauti', titulo: 'Ponerse trabado', premio: { base: 5e6, minutos: 20, tope: 3e9 },
    texto: 'Entrená en el Power Camp hasta adelgazar y quedar musculoso del todo.',
  },
  {
    id: 'cusi', personaje: 'juanma', titulo: 'Rescatar al Cusi', desde: 0.5, premio: { base: 2e7, minutos: 6, tope: 6e8 },
    texto: 'El Cusi se perdió. Encontralo y llevalo de vuelta a casa.',
  },
  // De cualquier personaje (personaje: null). Sin pistas: solo el texto.
  { id: 'empilchado', personaje: null, titulo: 'Empilchado', texto: 'Comprate 5 pilchas ricas', premio: { base: 1.5e9, minutos: 3, tope: 6e9 } },
];
export const PILCHAS = 5;

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
    this.cusi = null;
    this.cargando = false;
    this.llevando = false;
    this.alHablar = null; // main.js: abre el diálogo (personaje, líneas, alTerminar)
    this.reloj = 0;
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
    if (id === 'cusi') this.estado.cusi = 'rescatado';
    else this.estado[id] = true;
    sfx.final();
    const plata = this.cobrar(id);
    this.ui.toast(`¡Misión cumplida! ${mensaje} (+$${formato(plata)})`, 'plata');
    this.ui.puntoMisiones?.(true);
    this.tycoon.guardar?.();
  }

  // Lo que muestra el panel de misiones.
  lista(jugador) {
    const e = this.tycoon.estado;
    const progreso = this.tycoon.progreso;
    return MISIONES.map((m) => {
      let avance = 0;
      let detalle = '';
      if (m.id === 'empilchado') {
        avance = Math.min(1, (e.ropa?.length || 0) / PILCHAS);
        detalle = '';
      } else if (m.id === 'trabado') {
        avance = Math.min(1, (e.bautiGym || 0) / (BAUTI_GYM.adelgazar + BAUTI_GYM.musculo));
        detalle = this.hecha('trabado') ? '¡Bauti quedó trabado!' : `Entrenamiento: ${Math.floor(avance * 100)}%`;
      } else {
        const c = this.estado.cusi;
        if (c === 'rescatado') { avance = 1; detalle = 'El Cusi está a salvo en la casa'; }
        else if (c === 'perdido' || c === 'llevando') { avance = c === 'llevando' ? 0.75 : 0.4; detalle = c === 'llevando' ? 'Llevalo hasta la mansión' : 'Todavía no lo encontraste... ¡buscalo!'; }
        else { avance = 0; detalle = 'Jugá con Juanma para empezarla'; }
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

  // ---------- El Cusi ----------
  async crearCusi() {
    this.cargando = true;
    const m = crearPersonaje(CUSI, await cargarCabeza(CUSI));
    const { cabeza } = m.partes;
    // Cabezón: la cabeza crece desde el cuello (y la capucha y todo lo demás quedan igual).
    cabeza.scale.setScalar(CABEZON);
    cabeza.position.y = 2 + 0.65 * CABEZON;
    m.grupo.scale.setScalar(ESCALA_CUSI);
    const nombre = crearEtiqueta([{ texto: 'Cusi', tam: 60, color: '#7cf0c8' }], 4);
    nombre.sprite.position.y = 9.6;
    m.grupo.add(nombre.sprite);
    this.etiqueta = nombre.sprite;
    this.cusi = m;
    this.cargando = false;
  }

  // ¿Ya pasó el 50%? Antes de eso el Cusi no existe y su misión no se puede hacer.
  get cusiDisponible() {
    return this.tycoon.progreso >= MISIONES.find((m) => m.id === 'cusi').desde;
  }

  // Dónde tiene que estar el Cusi ahora (o null si no se ve).
  lugarCusi(jugador) {
    if (!this.cusiDisponible) return null;
    const c = this.estado.cusi;
    if (c === 'rescatado') return 'casa';
    if (c === 'perdido' && jugador.personaje?.id === 'juanma') return 'bosque';
    if (c === 'llevando' && this.llevando) return 'brazos';
    return null;
  }

  ponerCusi(lugar, jugador) {
    const g = this.cusi.grupo;
    if (g.parent) g.parent.remove(g);
    this.lugar = lugar;
    if (!lugar) return;
    if (lugar === 'brazos') {
      // En brazos de Juanma, adelante a la altura del pecho, sentadito.
      g.position.set(0, 1.65, 1.15);
      g.rotation.set(0, 0, 0);
      jugador.contenedor.add(g);
      this.etiqueta.visible = false;
    } else {
      const p = lugar === 'casa' ? { x: CASA_CUSI.x, y: nivel(0), z: CASA_CUSI.z } : { x: CU.x, y: 0, z: CU.z };
      g.position.set(p.x, p.y, p.z);
      g.rotation.set(0, lugar === 'casa' ? CASA_CUSI.angulo : -0.77, 0); // en el bosque mira para el lado de la casa
      this.escena.add(g);
      this.etiqueta.visible = lugar === 'casa';
    }
  }

  distCusi(jugador) {
    if (this.lugar !== 'bosque') return Infinity;
    return Math.hypot(jugador.pos.x - CU.x, jugador.pos.z - CU.z);
  }

  // Texto del botón de acción, o ''.
  accion(jugador) {
    if (this.lugar === 'bosque' && this.distCusi(jugador) < 4 && jugador.pos.y < 2) return 'Agarrar al Cusi (E)';
    return '';
  }

  hacer(jugador) {
    if (!this.accion(jugador) || !this.cusiDisponible) return;
    this.estado.cusi = 'llevando';
    this.llevando = true;
    sfx.brillo();
    this.ui.toast('Juanma: "¡Acá estabas! Vamos a casa, Cusi"', 'info');
  }

  // Si se cambia de personaje con el Cusi en brazos, el Cusi vuelve al bosque.
  soltar() {
    if (this.estado.cusi === 'llevando') this.estado.cusi = 'perdido';
    this.llevando = false;
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
    // Al 50% con Juanma: el Cusi se pierde (diálogo).
    if (jugando && !e.cusi && id === 'juanma' && this.cusiDisponible && this.alHablar && !this.hablando) {
      this.hablando = true;
      this.alHablar(DIALOGO_CUSI, () => {
        e.cusi = 'perdido';
        this.hablando = false;
        this.ui.toast('Nueva misión: Rescatar al Cusi', 'info');
        this.tycoon.guardar?.();
      });
    }
    // Una partida guardada a mitad del rescate arranca con el Cusi perdido otra vez.
    if (e.cusi === 'llevando' && !this.llevando) e.cusi = 'perdido';
    if (e.cusi === 'llevando' && id !== 'juanma') this.soltar();
    const lugar = this.lugarCusi(jugador);
    if (lugar && !this.cusi) {
      if (!this.cargando) this.crearCusi();
      return;
    }
    if (this.cusi && lugar !== this.lugar) this.ponerCusi(lugar, jugador);
    if (!this.cusi || !lugar) return;
    // Llegó a la casa con el Cusi en brazos.
    if (lugar === 'brazos') {
      jugador.modelo && (jugador.modelo.llevar = true);
      this.cusi.animar(dt, 0, true, false, true);
      if (this.enCasa(jugador.pos) && this.cusiDisponible) {
        this.llevando = false;
        if (jugador.modelo) jugador.modelo.llevar = false;
        this.completar('cusi', 'El Cusi volvió a casa');
      }
      return;
    }
    this.reloj += dt;
    const g = this.cusi.grupo;
    if (lugar === 'bosque') {
      // Sentadito y perdido; cuando te acercás te llama.
      this.cusi.animar(dt, 0, true, false, true);
      g.position.y = -0.55;
      const d = this.distCusi(jugador);
      this.etiqueta.visible = d < 14;
      if (d < 12 && !this.llamo) {
        this.llamo = true;
        this.ui.toast('Cusi: "¡¡Juanmaaa!! ¡Acá estoy!"', 'info');
      }
      if (d > 25) this.llamo = false;
    } else {
      // En casa: parado, mira al que se acerca y se balancea un poquito.
      this.cusi.animar(dt, 0, true);
      g.position.y = nivel(0);
      const cerca = Math.hypot(jugador.pos.x - g.position.x, jugador.pos.z - g.position.z) < 12 && Math.abs(jugador.pos.y - nivel(0)) < 3;
      const objetivo = cerca ? Math.atan2(jugador.pos.x - g.position.x, jugador.pos.z - g.position.z) : CASA_CUSI.angulo;
      let a = objetivo - g.rotation.y;
      a = Math.atan2(Math.sin(a), Math.cos(a));
      g.rotation.y += a * Math.min(1, dt * 5);
      g.rotation.z = Math.sin(this.reloj * 2.2) * 0.03;
    }
  }
}
