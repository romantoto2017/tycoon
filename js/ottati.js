import { Paseante } from './paseante.js';
import { ofrecerMano, empezarChoque, moverChoque } from './gimnasio.js';
import { sfx } from './sfx.js';

// Ottati: pasea como Dufre (vereda de la mansión o plaza de la ciudad, paseante.js), con la
// remera blanca de Nacional (frente y espalda de las fotos, herramientas/ottati.py). Morochito,
// rapado y medio gordito (menos que Bauti o la Mazza). Si te ve cerca, frena, te dice "¿Qué onda
// mano?" y te ofrece la mano para chocarla, como Kelvin en el gym.
export const OTTATI = {
  id: 'ottati', nombre: 'Ottati', foto: 'ottati.jpeg', piel: '#bd8262', pelo: '#120e0c', peinado: 'rapado', gordura: 0.45,
  remera: '#f6f6f6', pantalon: '#1f2a44',
  remeraFotos: { frente: 'ropa/ottati_frente.jpg', espalda: 'ropa/ottati_espalda.jpg', tela: 'ropa/ottati_tela.jpg' },
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
