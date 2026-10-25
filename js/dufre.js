import * as THREE from 'three';
import { crearPersonaje } from './personaje.js';
import { cargarCabeza, crearEtiqueta } from './texturas.js';
import { CALLE_Z } from './constantes.js';
import { paseoCiudad } from './ciudad.js';

// Dufre: a veces camina por la vereda de la mansión, de punta a punta, y a veces anda dando
// vueltas a la plaza de la Ciudad Vecibanda (así no está siempre). Siempre con el buzo de
// entrenamiento con el cierre hasta arriba (cuello pegado a la cara) y las manos en los
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
const CAMBIO = 240; // cada cuánto puede cambiar de lugar (solo si no lo estás viendo)
const LEJOS = 300;
const LUGARES = {
  casa: () => ({ y: 0.25, puntos: [[DESDE, VEREDA_Z], [HASTA, VEREDA_Z]] }),
  ciudad: paseoCiudad,
};
const LO_VE = 13; // a cuánto te ve
const FRASE = '¿Vamo a ver el interno?';

export class Dufre {
  constructor(escena, ui) {
    this.escena = escena;
    this.ui = ui;
    this.modelo = null;
    this.cargando = false;
    this.reloj = 0;
    this.ir(Math.random() < 0.5 ? 'casa' : 'ciudad');
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
    this.escena.add(m.grupo);
    this.modelo = m;
    this.ubicar();
  }

  // Elige lugar y arranca en un punto al azar de su recorrido.
  ir(lugar) {
    this.lugar = lugar;
    const { y, puntos } = LUGARES[lugar]();
    this.y = y;
    this.puntos = puntos;
    const k = Math.floor(Math.random() * puntos.length);
    const [ax, az] = puntos[k];
    const [bx, bz] = puntos[(k + 1) % puntos.length];
    const t = Math.random();
    this.x = ax + (bx - ax) * t;
    this.z = az + (bz - az) * t;
    this.i = (k + 1) % puntos.length;
    this.ubicar();
  }

  ubicar() {
    this.modelo?.grupo.position.set(this.x, this.y, this.z);
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
      // De vez en cuando se muda (de la casa a la ciudad o al revés), si estás lejos de los dos.
      this.reloj += dt;
      if (this.reloj > CAMBIO) {
        this.reloj = 0;
        const otro = this.lugar === 'casa' ? 'ciudad' : 'casa';
        const [ox, oz] = LUGARES[otro]().puntos[0];
        if (Math.random() < 0.5 && d > LEJOS && Math.hypot(jugador.pos.x - ox, jugador.pos.z - oz) > LEJOS) this.ir(otro);
      }
      // Camina su recorrido, de punto en punto.
      const [px, pz] = this.puntos[this.i];
      const dx = px - this.x;
      const dz = pz - this.z;
      const largo = Math.hypot(dx, dz);
      const paso = VEL * dt;
      if (largo <= paso) {
        this.x = px;
        this.z = pz;
        this.i = (this.i + 1) % this.puntos.length;
      } else {
        this.x += (dx / largo) * paso;
        this.z += (dz / largo) * paso;
      }
      this.ubicar();
      const objetivo = Math.atan2(dx, dz);
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
