import * as THREE from 'three';
import { crearPersonaje } from './personaje.js';
import { cargarCabeza, crearEtiqueta } from './texturas.js';
import { MANSION, CUSI_ESCONDIDO as CU, nivel } from './constantes.js';
import { BAUTI_GYM } from './gimnasio.js';
import { sfx } from './sfx.js';

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

export const MISIONES = [
  {
    id: 'trabado', personaje: 'bauti', titulo: 'Ponerse trabado',
    texto: 'Entrená en el Power Camp hasta adelgazar y quedar musculoso del todo.',
  },
  {
    id: 'cusi', personaje: 'juanma', titulo: 'Rescatar al Cusi',
    texto: 'Cuando la mansión llegue al 50%, el Cusi se pierde. Encontralo y llevalo a casa.',
  },
];

const DIALOGO_CUSI = [
  '¿Eh? ¿Y el Cusi? ¿Alguien vio al Cusi?',
  'Estaba acá hace un rato... ¡No lo encuentro por ningún lado de la casa!',
  'Me parece que se fue para el bosque, el que está al pie de la montaña del pelado.',
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

  completar(id, mensaje) {
    if (id === 'cusi') this.estado.cusi = 'rescatado';
    else this.estado[id] = true;
    sfx.final();
    this.ui.toast(`¡Misión cumplida! ${mensaje}`, 'plata');
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
      if (m.id === 'trabado') {
        avance = Math.min(1, (e.bautiGym || 0) / (BAUTI_GYM.adelgazar + BAUTI_GYM.musculo));
        detalle = this.hecha('trabado') ? '¡Bauti quedó trabado!' : `Entrenamiento: ${Math.floor(avance * 100)}%`;
      } else {
        const c = this.estado.cusi;
        if (c === 'rescatado') { avance = 1; detalle = 'El Cusi está a salvo en la casa'; }
        else if (c === 'perdido' || c === 'llevando') { avance = c === 'llevando' ? 0.75 : 0.4; detalle = c === 'llevando' ? 'Llevalo hasta la mansión' : 'Está en el bosque, al pie de la montaña del pelado'; }
        else { avance = Math.min(0.99, progreso / 0.5) * 0.3; detalle = progreso < 0.5 ? `Se activa con la mansión al 50% (vas ${Math.floor(progreso * 100)}%)` : 'Jugá con Juanma para empezarla'; }
      }
      return { ...m, hecha: this.hecha(m.id), avance, detalle, tuya: jugador.personaje?.id === m.personaje };
    });
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

  // Dónde tiene que estar el Cusi ahora (o null si no se ve).
  lugarCusi(jugador) {
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
    if (!this.accion(jugador)) return;
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

  actualizar(dt, jugador, jugando) {
    if (!jugador.personaje) return;
    const e = this.estado;
    const id = jugador.personaje.id;
    // Bauti trabado: musculoso al 100%.
    if (jugando && !this.hecha('trabado') && id === 'bauti' && (jugador.personaje.musculo || 0) >= 1) this.completar('trabado', 'Bauti quedó trabado');
    // Al 50% con Juanma: el Cusi se pierde (diálogo).
    if (jugando && !e.cusi && id === 'juanma' && this.tycoon.progreso >= 0.5 && this.alHablar && !this.hablando) {
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
      if (this.enCasa(jugador.pos)) {
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
