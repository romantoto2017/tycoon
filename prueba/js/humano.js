import * as THREE from 'three';
import { Paseante } from './dufre.js';
import { cargarCabeza } from './texturas.js';
import { nocheN } from './cielo.js';
import { formato } from './util.js';
import { sfx } from './sfx.js';

// El Humano: un fisura que anda por la plaza de la ciudad solo de noche (Paseante). Saco oscuro
// gastado sobre una camisa blanca sucia (herramientas/humano.py). Si te ve a pie, te pide plata:
// si no le das se enoja, te persigue y te tira latas; si le das, se va (hasta la noche siguiente).
// A la tercera noche que le das, te invita a La Cachimba del Piojo (cachimba.js).
export const HUMANO = {
  id: 'humano', nombre: 'El Humano', foto: 'humano.jpeg', recorte: [0.5, 0.5, 1], piel: '#c99a7c', pelo: '#1a1410', peinado: 'liso',
  remera: '#22242e', pantalon: '#2c2a28', mangasLargas: true,
  remeraFotos: { frente: 'ropa/humano_frente.jpg', espalda: 'ropa/humano_espalda.jpg', manga: 'ropa/humano_manga.jpg', tela: 'ropa/humano_tela.jpg' },
};
const VECES = 3; // noches que hay que darle para que te invite
const ENOJO = 30; // segundos que te persigue
const VEL_ENOJADO = 8.5;
const CADA_LATA = 1.3;
const VUELO = 0.8; // segundos que tarda una lata en llegar
const G = 22;
const geoLata = new THREE.CylinderGeometry(0.16, 0.16, 0.45, 8);
const matLata = new THREE.MeshLambertMaterial({ color: '#c9cdd2' });
const matEtiqueta = new THREE.MeshLambertMaterial({ color: '#b3202a' });

export class Humano extends Paseante {
  // hora(): segundo del ciclo de día y noche; ingreso(): plata por segundo; pausar(b): frena el juego.
  constructor({ escena, ui, estado, guardar, hora, ingreso, pausar }) {
    super(escena, ui, HUMANO, { vel: 3.2, lugar: 'ciudad' });
    Object.assign(this, { estado, guardar, hora, ingreso, pausar });
    this.enojado = 0;
    this.latas = [];
    this.tiro = 0;
  }

  datos() { return (this.estado.humano ??= { dado: 0, noche: -1 }); }
  monto() { return Math.max(2000, Math.round(this.ingreso() * 45)); }

  // Te pide plata (cuando te ve a pie). Dar: cuenta una noche; no dar: se enoja.
  async alHablar() {
    if (this.enojado > 0) return;
    const cara = (await cargarCabeza(HUMANO)).frente.toDataURL();
    const decir = (lineas, opciones) => new Promise((res) => {
      this.ui.dialogo({ nombre: HUMANO.nombre, cara, remera: HUMANO.remera, lineas, opciones, alElegir: res, alTerminar: () => res(-1) });
    });
    this.pausar(true);
    const n = Math.min(this.monto(), this.estado.plata);
    const r = await decir(['Eu, amigo, amigo... ¿no tenés una moneda?', 'Es pa comer, te juro. Pa comer.'], [`Darle $${formato(n)}`, 'No tengo nada, flaco']);
    if (r !== 0) {
      this.pausar(false);
      this.hablar('¿Ah no? ¡Te voy a cagar a latazos, rata!', 5);
      this.enojado = ENOJO;
      sfx.susto();
      return;
    }
    this.estado.plata -= n;
    const d = this.datos();
    d.noche = nocheN(this.hora());
    d.dado += 1;
    this.guardar();
    sfx.cobrar();
    if (d.dado < VECES || this.estado.cachimba) {
      await decir(['Sos un capo, amigo. Dios te lo va a devolver.']);
      this.pausar(false);
      return;
    }
    this.estado.cachimba = { visitada: false };
    this.guardar();
    sfx.brillo();
    await decir([
      'Amigo, vos sos de los míos. Tres veces me tiraste una mano.',
      'Venite a La Cachimba del Piojo, mi barrio. Te espero ahí.',
      'Agarrá la autopista y en el medio del camino, para el lado de la montaña, sale uno de tierra. No tiene pérdida.',
      'Eso sí: andá con cuidado, que ahí nadie te cuida.',
    ]);
    this.pausar(false);
    this.ui.toast('El Humano te espera en La Cachimba del Piojo: apareció un "?" en el mapa', 'plata', 6000);
  }

  // De noche, salvo que ya le hayas dado esta noche (se fue). Enojado te sigue aunque se haga de día.
  esta(noche) {
    return this.enojado > 0 || (noche > 0.5 && this.datos().noche !== nocheN(this.hora()));
  }

  actualizar(dt, jugador, jugando, noche, aPie) {
    this.moverLatas(dt, jugador);
    if (!this.modelo) return super.actualizar(dt, jugador, jugando);
    const g = this.modelo.grupo;
    g.visible = this.esta(noche);
    if (!g.visible) return false;
    if (this.enojado > 0) return this.perseguir(dt, jugador, jugando && aPie);
    return super.actualizar(dt, jugador, jugando && aPie);
  }

  perseguir(dt, jugador, aPie) {
    const g = this.modelo.grupo;
    const dx = jugador.pos.x - this.x;
    const dz = jugador.pos.z - this.z;
    const d = Math.hypot(dx, dz);
    this.enojado -= dt;
    if (this.enojado <= 0 || d > 90 || !aPie) {
      this.enojado = 0;
      this.dijo = d < 25; // si quedaste cerca, no te vuelve a pedir enseguida
      this.hablar('¡Rata! ¡Te tengo junado!', 3);
      return false;
    }
    if (d > 3) {
      this.x += (dx / d) * VEL_ENOJADO * dt;
      this.z += (dz / d) * VEL_ENOJADO * dt;
    }
    this.ubicar();
    g.rotation.y = Math.atan2(dx, dz);
    this.modelo.animar(dt, d > 3 ? VEL_ENOJADO : 0, true);
    this.tiro -= dt;
    if (this.tiro <= 0 && d < 35) {
      this.tiro = CADA_LATA;
      this.tirarLata(jugador);
    }
    if (this.globo > 0 && (this.globo -= dt) <= 0) this.etiqueta.sprite.visible = false;
    return false;
  }

  // La lata sale de la mano y cae (tiro parabólico) donde estabas.
  tirarLata(jugador) {
    const m = new THREE.Mesh(geoLata, matLata);
    const banda = new THREE.Mesh(geoLata, matEtiqueta);
    banda.scale.set(1.04, 0.45, 1.04);
    m.add(banda);
    m.position.set(this.x, this.y + 4.2, this.z);
    const v = new THREE.Vector3((jugador.pos.x - this.x) / VUELO, 0, (jugador.pos.z - this.z) / VUELO);
    v.y = (jugador.pos.y + 2 - m.position.y + 0.5 * G * VUELO * VUELO) / VUELO;
    this.escena.add(m);
    this.latas.push({ m, v, vida: 4, pego: false });
  }

  moverLatas(dt, jugador) {
    for (const l of this.latas) {
      l.vida -= dt;
      if (l.m.position.y > 0.2) {
        l.v.y -= G * dt;
        l.m.position.addScaledVector(l.v, dt);
        l.m.rotation.x += dt * 12;
        l.m.rotation.z += dt * 7;
        if (!l.pego && Math.hypot(l.m.position.x - jugador.pos.x, l.m.position.y - jugador.pos.y - 2, l.m.position.z - jugador.pos.z) < 1.6) {
          l.pego = true;
          l.v.multiplyScalar(-0.3);
          sfx.choque();
          this.ui.toast('¡Te pegó un latazo El Humano!', 'error', 2000);
        }
      } else {
        l.m.position.y = 0.2;
        l.m.rotation.set(Math.PI / 2, l.m.rotation.y, 0);
      }
      if (l.vida <= 0) this.escena.remove(l.m);
    }
    this.latas = this.latas.filter((l) => l.vida > 0);
  }
}
