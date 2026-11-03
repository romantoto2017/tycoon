import * as THREE from 'three';
import { PERSONAJES } from '../data/personajes.js';
import { sfx } from './sfx.js';

// Fumar tanzania: con bolsitas encima (las del depósito del galpón, tanzania.js), el botón 🌿 o la
// F. Sale un poco de humo de la boca y los ojos se ponen rojos un rato (ROJOS segundos de juego,
// guardado en la partida: estado.ojosRojos es hasta cuándo).
const ROJOS = 120;

export class Fumar {
  constructor({ escena, estado, ui, guardar, jugador, tanzania, puede }) {
    Object.assign(this, { escena, estado, ui, guardar, jugador, tanzania, puede });
    this.boton = document.getElementById('btn-fumar');
    this.boton.addEventListener('click', () => this.fumar());
    window.addEventListener('keydown', (e) => { if (e.code === 'KeyF' && !e.repeat && this.puede()) this.fumar(); });
    const m = new THREE.MeshBasicMaterial({ color: '#e6e6e6', transparent: true, opacity: 0, depthWrite: false });
    this.bocanadas = Array.from({ length: 10 }, (_, i) => {
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), m.clone());
      b.visible = false;
      b.userData.retraso = i * 0.18;
      escena.add(b);
      return b;
    });
    this.humo = 0; // segundos que le quedan a la bocanada
    this.ojos = null; // { cabeza, mallas }
  }

  get encima() { return this.tanzania.datos.encima || 0; }

  fumar() {
    if (!this.puede() || this.encima <= 0 || this.humo > 0) return;
    this.tanzania.datos.encima -= 1;
    this.estado.ojosRojos = (this.estado.tiempoJugado || 0) + ROJOS;
    this.humo = 3.2;
    this.origen = null;
    sfx.salto();
    this.ui.toast(`Fumaste tanzania (te quedan ${this.encima})`, 'info');
    this.guardar();
  }

  // Los ojos rojos: dos manchas rojas arriba de los ojos de la cara (donde los tiene cada uno).
  ponerOjos(rojos) {
    const m = this.jugador.modelo;
    if (!m) return;
    if (this.ojos?.cabeza !== m.partes.cabeza) {
      const p = PERSONAJES.find((x) => x.id === this.estado.personaje) || {};
      const [oy, ox0, ox1] = p.ojos || [0.45, 0.33, 0.67];
      const mat = new THREE.MeshBasicMaterial({ color: '#d41a1a', transparent: true, opacity: 0.42, depthWrite: false });
      const mallas = [ox0, ox1].map((ox) => {
        const o = new THREE.Mesh(new THREE.CircleGeometry(0.075, 12).scale(1.3, 0.7, 1), mat);
        o.position.set((ox - 0.5) * 1.3, (0.5 - oy) * 1.3, 0.656);
        m.partes.cabeza.add(o);
        return o;
      });
      this.ojos = { cabeza: m.partes.cabeza, mallas };
    }
    for (const o of this.ojos.mallas) o.visible = rojos;
  }

  actualizar(dt) {
    const hay = this.puede() && this.encima > 0;
    this.boton.classList.toggle('oculto', !hay);
    if (hay) this.boton.title = `Fumar tanzania (F) · ${this.encima}`;
    this.ponerOjos((this.estado.ojosRojos || 0) > (this.estado.tiempoJugado || 0));
    // La bocanada: sale de la boca, sube, se agranda y se desvanece.
    if (this.humo <= 0) return;
    this.humo -= dt;
    const cabeza = this.jugador.modelo?.partes.cabeza;
    if (!cabeza) return;
    const base = cabeza.getWorldPosition(new THREE.Vector3());
    const t0 = 3.2 - this.humo;
    for (const b of this.bocanadas) {
      const t = t0 - b.userData.retraso;
      b.visible = t > 0 && t < 1.6;
      if (!b.visible) continue;
      const k = t / 1.6;
      b.position.set(base.x + Math.sin(t * 5 + b.userData.retraso) * 0.3, base.y - 0.2 + k * 2.6, base.z + Math.cos(t * 4) * 0.3);
      b.scale.setScalar(0.6 + k * 2.4);
      b.material.opacity = 0.45 * (1 - k);
    }
    if (this.humo <= 0) for (const b of this.bocanadas) b.visible = false;
  }
}
