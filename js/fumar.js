import * as THREE from 'three';
import { PERSONAJES } from '../data/personajes.js';
import { liberarAlSubir, cargarCabeza } from './texturas.js';
import { sfx } from './sfx.js';

// Fumar tanzania: con bolsitas encima (las del depósito del galpón, tanzania.js), el botón 🌿 o la
// F. Sale humo de la boca y los ojos se ponen rojos un rato (ROJOS segundos de juego, guardado en
// la partida: estado.ojosRojos es hasta cuándo). Después de varias entregas de Tranzapp
// (celular.js), por la calle y en la Cachimba se ve gente fumando con los ojos rojos (Fumadores).
const ROJOS = 120;
export const ENTREGAS_PARA_VER_GENTE = 5;

// Los ojos rojos, como el pasamontañas: una capa transparente pegada a la cara con cada ojo donde
// lo tiene esa persona (ojos: [y, x izq, x der] de la cara). Adentro: el blanco rosado con venitas
// rojas, la pupila de la foto a la vista y el párpado de arriba caído (del color de la piel).
// Dónde están los ojos en la cara del juego de cada uno (medido sobre su foto ya recortada):
// [y, x del izquierdo, x del derecho, tamaño].
export const OJOS = {
  toto: [0.36, 0.445, 0.815, 1], nico: [0.28, 0.07, 0.875, 1.45], val: [0.37, 0.17, 0.72, 1.1], juanma: [0.31, 0.31, 0.8, 1.1],
  jeipi: [0.43, 0.23, 0.76, 1], tepho: [0.345, 0.29, 0.8, 1.1], mateo: [0.54, 0.33, 0.92, 1.35], negro: [0.19, 0.39, 0.78, 1], bauti: [0.17, 0.15, 0.56, 1],
};
const capas = new Map();
function texOjos(ojos, piel) {
  const k = `${ojos.join(',')}|${piel}`; // piel null: cara de foto (sin párpado dibujado: se ve el suyo)
  if (capas.has(k)) return capas.get(k);
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  const [oy, ox0, ox1, tam = 1] = ojos;
  for (const ox of [ox0, ox1]) {
    const [x, y, rx, ry] = [ox * s, oy * s, s * 0.09 * tam, s * 0.05 * tam];
    g.save();
    g.beginPath();
    g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    g.clip();
    // El blanco del ojo, rosado y más rojo hacia los bordes.
    const gr = g.createRadialGradient(x, y, ry * 0.3, x, y, rx);
    gr.addColorStop(0, 'rgba(255,150,150,0.35)');
    gr.addColorStop(0.7, 'rgba(240,80,90,0.6)');
    gr.addColorStop(1, 'rgba(200,30,40,0.85)');
    g.fillStyle = gr;
    g.fillRect(x - rx, y - ry, rx * 2, ry * 2);
    // Venitas: líneas rojas finitas que salen de los costados hacia el centro, con ramitas.
    g.strokeStyle = 'rgba(190,10,20,0.95)';
    g.lineCap = 'round';
    for (let v = 0; v < 10; v++) {
      const a = (v / 10) * Math.PI * 2 + 0.3;
      let [px, py] = [x + Math.cos(a) * rx, y + Math.sin(a) * ry];
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(px, py);
      for (let t = 0; t < 3; t++) {
        px += (x - px) * 0.28 + Math.sin(v * 7 + t) * 2.5;
        py += (y - py) * 0.28 + Math.cos(v * 5 + t) * 1.5;
        g.lineTo(px, py);
        g.lineWidth = 1.1;
      }
      g.stroke();
    }
    // La pupila: se deja ver la de la foto (agujero en el medio).
    g.globalCompositeOperation = 'destination-out';
    g.beginPath();
    g.arc(x, y + ry * 0.1, ry * 0.7, 0, Math.PI * 2);
    g.fill();
    g.globalCompositeOperation = 'source-over';
    // El párpado de arriba caído hasta casi la mitad, con su borde oscuro (en las caras dibujadas).
    if (!piel) { g.restore(); continue; }
    g.fillStyle = piel;
    g.fillRect(x - rx, y - ry, rx * 2, ry * 0.6);
    g.strokeStyle = 'rgba(40,20,20,0.85)';
    g.lineWidth = 2.2;
    g.beginPath();
    g.moveTo(x - rx, y - ry * 0.4);
    g.lineTo(x + rx, y - ry * 0.4);
    g.stroke();
    g.restore();
  }
  const t = liberarAlSubir(new THREE.CanvasTexture(c));
  t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false });
  capas.set(k, m);
  return m;
}
const GEO_CARA = new THREE.PlaneGeometry(1.3, 1.3);
export function ojosRojos(cabeza, ojos, piel) {
  const m = new THREE.Mesh(GEO_CARA, texOjos(ojos, piel));
  m.position.z = 0.656; // apenas delante de la cara (la cabeza es un cubo de 1.3)
  cabeza.add(m);
  return m;
}

// Bocanadas de humo (un grupo de pelotitas que suben, se agrandan y se desvanecen).
class Humo {
  constructor(escena, n = 8) {
    const m = new THREE.MeshBasicMaterial({ color: '#e6e6e6', transparent: true, opacity: 0, depthWrite: false });
    this.bolas = Array.from({ length: n }, (_, i) => {
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), m.clone());
      b.visible = false;
      b.userData.retraso = i * 0.16;
      escena.add(b);
      return b;
    });
    this.t = 99;
    this.base = new THREE.Vector3();
  }

  soltar(pos) { this.base.copy(pos); this.t = 0; }

  actualizar(dt, pos = null) {
    if (this.t > 3) return;
    this.t += dt;
    if (pos) this.base.copy(pos);
    for (const b of this.bolas) {
      const t = this.t - b.userData.retraso;
      b.visible = t > 0 && t < 1.8;
      if (!b.visible) continue;
      const k = t / 1.8;
      b.position.set(this.base.x + Math.sin(t * 5 + b.userData.retraso) * 0.3, this.base.y - 0.2 + k * 2.8, this.base.z + Math.cos(t * 4) * 0.3);
      b.scale.setScalar(0.7 + k * 2.6);
      b.material.opacity = 0.55 * (1 - k);
    }
  }
}

export class Fumar {
  constructor({ escena, estado, ui, guardar, jugador, tanzania, puede }) {
    Object.assign(this, { escena, estado, ui, guardar, jugador, tanzania, puede });
    this.boton = document.getElementById('btn-fumar');
    this.boton.addEventListener('click', () => this.fumar());
    window.addEventListener('keydown', (e) => { if (e.code === 'KeyF' && !e.repeat && this.puede()) this.fumar(); });
    this.humo = new Humo(escena, 10);
    this.ojos = null; // { cabeza, malla }
  }

  get encima() { return this.tanzania.datos.encima || 0; }

  fumar() {
    if (!this.puede() || this.encima <= 0 || this.humo.t < 2.5) return;
    this.tanzania.datos.encima -= 1;
    this.estado.ojosRojos = (this.estado.tiempoJugado || 0) + ROJOS;
    this.humo.soltar(this.boca());
    sfx.salto();
    this.ui.toast(`Fumaste tanzania (te quedan ${this.encima})`, 'info');
    this.guardar();
  }

  boca() {
    const c = this.jugador.modelo?.partes.cabeza;
    if (!c) return this.jugador.pos.clone();
    return c.localToWorld(new THREE.Vector3(0, -0.35, 0.8));
  }

  ponerOjos(rojos) {
    const m = this.jugador.modelo;
    if (!m) return;
    if (this.ojos?.cabeza !== m.partes.cabeza) {
      // El párpado, del color de piel que se sacó de su foto (cargarCabeza ya lo tiene en caché).
      const cabeza = m.partes.cabeza;
      const p = this.jugador.personaje || PERSONAJES.find((x) => x.id === this.estado.personaje) || PERSONAJES[0];
      this.ojos = { cabeza, malla: null };
      cargarCabeza(p).then((cab) => { if (this.ojos.cabeza === cabeza) this.ojos.malla = ojosRojos(cabeza, OJOS[p.id] || p.ojos || [0.45, 0.33, 0.67], p.sinFoto || !p.foto ? p.piel || cab.piel : null); });
    }
    if (this.ojos.malla) this.ojos.malla.visible = rojos;
  }

  actualizar(dt) {
    const hay = this.puede() && this.encima > 0;
    this.boton.classList.toggle('oculto', !hay);
    if (hay) this.boton.title = `Fumar tanzania (F) · ${this.encima}`;
    this.ponerOjos((this.estado.ojosRojos || 0) > (this.estado.tiempoJugado || 0));
    this.humo.actualizar(dt, this.humo.t < 3 ? this.boca() : null);
  }
}

// La gente que fuma (después de ENTREGAS_PARA_VER_GENTE entregas): uno de cada tres peatones de la
// ciudad y los villeros de la Cachimba, con los ojos rojos; de vez en cuando uno cerca tuyo larga humo.
export class Fumadores {
  constructor({ escena, estado, cabezas }) {
    Object.assign(this, { escena, estado, cabezas }); // cabezas(): [{ cabeza, piel }] de la gente
    this.humos = [new Humo(escena), new Humo(escena)];
    this.puestos = new Set();
    this.reloj = 0;
    this.lista = [];
  }

  actualizar(dt, jugador) {
    if ((this.estado.tanzania?.entregas || 0) < ENTREGAS_PARA_VER_GENTE) return;
    this.reloj += dt;
    if (this.reloj > 3) {
      this.reloj = 0;
      this.lista = this.cabezas().filter((x, i) => i % 3 === 0);
      for (const x of this.lista) {
        if (this.puestos.has(x.cabeza)) continue;
        this.puestos.add(x.cabeza);
        ojosRojos(x.cabeza, [0.47, 0.34, 0.66], x.piel);
      }
      // Una bocanada de alguien que esté cerca y a la vista.
      const v = new THREE.Vector3();
      const cerca = this.lista.filter((x) => x.cabeza.visible && x.cabeza.getWorldPosition(v).distanceTo(jugador.pos) < 45);
      const libre = this.humos.find((h) => h.t > 3);
      if (cerca.length && libre) libre.soltar(cerca[Math.floor(Math.random() * cerca.length)].cabeza.localToWorld(new THREE.Vector3(0, -0.35, 0.8)));
    }
    for (const h of this.humos) h.actualizar(dt);
  }
}
