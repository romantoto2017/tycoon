import { crearPersonaje } from './personaje.js';
import { cargarCabeza, crearEtiqueta } from './texturas.js';
import { CALLE_Z } from './constantes.js';
import { paseoCiudad } from './ciudad.js';
import { ofrecerMano, empezarChoque, moverChoque } from './gimnasio.js';
import { sfx } from './sfx.js';

// Alguien que pasea solo (Dufre, Ottati): a veces camina por la vereda de la mansión, de
// punta a punta, y a veces anda dando vueltas a la plaza de la Ciudad Vecibanda (así no está
// siempre). Si te ve cerca, frena, te mira y te habla (alHablar).
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

export class Paseante {
  constructor(escena, ui, personaje, { manosBolsillo = false } = {}) {
    this.escena = escena;
    this.ui = ui;
    this.personaje = personaje;
    this.manosBolsillo = manosBolsillo;
    this.modelo = null;
    this.cargando = false;
    this.reloj = 0;
    this.ir(Math.random() < 0.5 ? 'casa' : 'ciudad');
    this.dijo = false; // ya te habló en este cruce (vuelve a hablar cuando te alejás)
    this.globo = 0;
  }

  async crear() {
    this.cargando = true;
    const p = this.personaje;
    const m = crearPersonaje(p, await cargarCabeza(p));
    m.manosBolsillo = this.manosBolsillo;
    const nombre = crearEtiqueta([{ texto: p.nombre, tam: 60, color: '#ffffff' }], 4);
    nombre.sprite.position.y = 6.6;
    m.grupo.add(nombre.sprite);
    this.etiqueta = crearEtiqueta([{ texto: ' ', tam: 52, color: '#ffffff' }], 7);
    this.etiqueta.sprite.position.y = 8.1;
    this.etiqueta.sprite.visible = false;
    m.grupo.add(this.etiqueta.sprite);
    this.escena.add(m.grupo);
    this.modelo = m;
    this.ubicar();
  }

  // Globo arriba de la cabeza y el aviso abajo.
  hablar(texto, segundos = 4) {
    this.etiqueta.actualizar([{ texto, tam: 52, color: '#ffffff' }]);
    this.etiqueta.sprite.visible = true;
    this.globo = segundos;
    this.ui.toast(`${this.personaje.nombre}: "${texto}"`, 'info');
  }

  alHablar() {}

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

  distancia(pos) {
    return Math.hypot(pos.x - this.x, pos.z - this.z);
  }

  actualizar(dt, jugador, jugando) {
    if (!this.modelo) {
      if (!this.cargando) this.crear();
      return;
    }
    const g = this.modelo.grupo;
    const d = this.distancia(jugador.pos);
    const cerca = jugando && d < LO_VE && jugador.pos.y < 4;
    if (cerca) {
      // Frena y te mira.
      let a = Math.atan2(jugador.pos.x - g.position.x, jugador.pos.z - g.position.z) - g.rotation.y;
      a = Math.atan2(Math.sin(a), Math.cos(a));
      g.rotation.y += a * Math.min(1, dt * 6);
      this.modelo.animar(dt, 0, true);
      if (!this.dijo) {
        this.dijo = true;
        this.alHablar();
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
    return cerca;
  }
}

// ---------- Dufre ----------
// Dufre: pasea por la vereda de la mansión o por la plaza de la ciudad (Paseante, arriba). Siempre
// con el buzo de entrenamiento con el cierre hasta arriba (cuello pegado a la cara) y las manos
// en los bolsillos. Si te ve cerca, frena, te mira y te dice "¿Vamo a ver el interno?".
export const DUFRE = {
  id: 'dufre', nombre: 'Dufre', foto: 'dufre.jpeg', recorte: [0.46, 0.225, 0.44], pelo: '#2a1d16', peinado: 'ondulado',
  remera: '#141416', pantalon: '#e8e8e6', mangasLargas: true, cuelloAlto: '#141416',
  remeraFotos: { frente: 'ropa/dufre_frente.jpg', tela: 'ropa/dufre_tela.jpg' },
};

export class Dufre extends Paseante {
  constructor(escena, ui) {
    super(escena, ui, DUFRE, { manosBolsillo: true });
  }

  alHablar() {
    this.hablar('¿Vamo a ver el interno?');
  }
}

// ---------- Ottati ----------
// Ottati: pasea como Dufre (vereda de la mansión o plaza de la ciudad, Paseante, arriba), con la
// remera blanca de Nacional (frente y espalda de las fotos, herramientas/ottati.py). Morochito,
// rapado y medio gordito (menos que Bauti o la Mazza). Si te ve cerca, frena, te dice "¿Qué onda
// mano?" y te ofrece la mano para chocarla, como Kelvin en el gym.
export const OTTATI = {
  id: 'ottati', nombre: 'Ottati', foto: 'ottati.jpeg', piel: '#bd8262', pelo: '#120e0c', peinado: 'rapado', gordura: 0.45,
  remera: '#f6f6f6', pantalon: '#1f2a44',
  remeraFotos: { frente: 'ropa/ottati_frente.jpg', espalda: 'ropa/ottati_espalda.jpg', manga: 'ropa/ottati_manga.jpg', tela: 'ropa/ottati_tela.jpg' },
};
const DESPUES = ['A lo baraja gil', 'Acá ando buscando unas churraskitas gil'];
const ALCANCE = 5.4; // a cuánto se le puede chocar la mano

export class Ottati extends Paseante {
  constructor(escena, ui) {
    super(escena, ui, OTTATI);
    this.oferta = 0; // segundos que tiene la mano extendida
    this.choque = null;
    this.siguiente = 0;
  }

  alHablar() {
    this.hablar('¿Qué onda mano?');
    this.oferta = 14;
  }

  accion(jugador) {
    return this.modelo && this.oferta > 0 && !this.choque && this.distancia(jugador.pos) < ALCANCE ? 'Chocar la mano con Ottati (E)' : '';
  }

  hacer(jugador) {
    if (!this.accion(jugador)) return;
    this.choque = empezarChoque(jugador, this.modelo.grupo.position);
    this.oferta = 0;
  }

  actualizar(dt, jugador, jugando) {
    const cerca = super.actualizar(dt, jugador, jugando);
    if (!this.modelo) return;
    if (!cerca) this.oferta = 0;
    if (this.oferta > 0) this.oferta -= dt;
    const mano = this.oferta > 0 && !this.choque;
    if (mano) ofrecerMano(this.modelo);
    else if (this.mano && !this.choque) {
      // Se cansó de esperar (o te fuiste): baja el brazo.
      this.modelo.partes.brazoI.rotation.set(0, 0, 0);
      this.modelo.partes.brazoI.codo.rotation.set(0, 0, 0);
    }
    this.mano = mano;
    if (this.choque) {
      const c = this.choque;
      c.t += dt;
      if (c.t >= 0.35 && !c.sono) {
        c.sono = true;
        sfx.choque();
        this.hablar(DESPUES[this.siguiente++ % DESPUES.length]);
      }
      if (moverChoque(c, [this.modelo, jugador.modelo])) this.choque = null;
    }
  }
}
