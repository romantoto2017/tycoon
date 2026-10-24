import * as THREE from 'three';
import { crearPersonaje } from './personaje.js';
import { cargarCabeza, crearEtiqueta } from './texturas.js';
import { CALLE_Z } from './constantes.js';

// Dufre: camina por la vereda de enfrente de la mansión, de punta a punta, siempre con el buzo
// de entrenamiento con el cierre hasta arriba (cuello pegado a la cara) y las manos en los
// bolsillos. Si te ve cerca, frena, te mira y te dice "¿Vamo a ver el interno?".
export const DUFRE = {
  id: 'dufre', nombre: 'Dufre', foto: 'dufre.jpeg', recorte: [0.46, 0.225, 0.44], pelo: '#2a1d16', peinado: 'ondulado',
  remera: '#141416', pantalon: '#e8e8e6', mangasLargas: true, cuelloAlto: '#141416',
  remeraFotos: { frente: 'ropa/dufre_frente.jpg', tela: 'ropa/dufre_tela.jpg' },
};
const VEREDA_Z = CALLE_Z - 7.25; // la vereda del lado de la mansión
const DESDE = -130;
const HASTA = 135;
const VEL = 4.5;
const LO_VE = 13; // a cuánto te ve
const FRASE = '¿Vamo a ver el interno?';

export class Dufre {
  constructor(escena, ui) {
    this.escena = escena;
    this.ui = ui;
    this.modelo = null;
    this.cargando = false;
    this.sentido = 1;
    this.x = -40;
    this.dijo = false; // ya te habló en este cruce (vuelve a hablar cuando te alejás)
    this.globo = 0;
  }

  async crear() {
    this.cargando = true;
    const m = crearPersonaje(DUFRE, await cargarCabeza(DUFRE));
    m.manosBolsillo = true;
    const nombre = crearEtiqueta([{ texto: 'Dufre', tam: 60, color: '#ffffff' }], 4);
    nombre.sprite.position.y = 6.6;
    m.grupo.add(nombre.sprite);
    this.etiqueta = crearEtiqueta([{ texto: FRASE, tam: 52, color: '#ffffff' }], 7);
    this.etiqueta.sprite.position.y = 8.1;
    this.etiqueta.sprite.visible = false;
    m.grupo.add(this.etiqueta.sprite);
    m.grupo.position.set(this.x, 0.25, VEREDA_Z);
    this.escena.add(m.grupo);
    this.modelo = m;
  }

  actualizar(dt, jugador, jugando) {
    if (!this.modelo) {
      if (!this.cargando) this.crear();
      return;
    }
    const g = this.modelo.grupo;
    const d = Math.hypot(jugador.pos.x - g.position.x, jugador.pos.z - g.position.z);
    const cerca = jugando && d < LO_VE && jugador.pos.y < 4;
    if (cerca) {
      // Frena y te mira.
      let a = Math.atan2(jugador.pos.x - g.position.x, jugador.pos.z - g.position.z) - g.rotation.y;
      a = Math.atan2(Math.sin(a), Math.cos(a));
      g.rotation.y += a * Math.min(1, dt * 6);
      this.modelo.animar(dt, 0, true);
      if (!this.dijo) {
        this.dijo = true;
        this.globo = 4;
        this.etiqueta.sprite.visible = true;
        this.ui.toast(`Dufre: "${FRASE}"`, 'info');
      }
    } else {
      if (d > LO_VE + 12) this.dijo = false;
      // Camina por la vereda, de punta a punta.
      this.x += this.sentido * VEL * dt;
      if (this.x > HASTA) { this.x = HASTA; this.sentido = -1; }
      if (this.x < DESDE) { this.x = DESDE; this.sentido = 1; }
      g.position.x = this.x;
      const objetivo = this.sentido > 0 ? Math.PI / 2 : -Math.PI / 2;
      let a = objetivo - g.rotation.y;
      a = Math.atan2(Math.sin(a), Math.cos(a));
      g.rotation.y += a * Math.min(1, dt * 6);
      this.modelo.animar(dt, VEL, true);
    }
    if (this.globo > 0) {
      this.globo -= dt;
      if (this.globo <= 0) this.etiqueta.sprite.visible = false;
    }
  }
}
