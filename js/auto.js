import * as THREE from 'three';
import { caja, mat } from './util.js';
import { LIMITE_MAPA } from './constantes.js';

const RADIO = 2.3;
const VEL_MAX = 34;
const VEL_ATRAS = -10;

// Auto deportivo manejable. Mira hacia +Z en su marco; `angulo` es el rumbo (0 = +Z).
export class Auto {
  constructor(escena, x, z, angulo = 0) {
    this.pos = new THREE.Vector3(x, 0, z);
    this.angulo = angulo;
    this.vel = 0;
    this.direccion = 0;
    this.grupo = new THREE.Group();
    this.ruedas = [];
    this.delanteras = [];
    this.armar();
    escena.add(this.grupo);
    // Caja de choque para el jugador a pie (la cámara la ignora).
    this.caja = new THREE.Box3();
    this.caja.camara = false;
    this.colocar();
  }

  armar() {
    const g = this.grupo;
    const rojo = new THREE.MeshLambertMaterial({ color: '#c62828', emissive: '#1a0000' });
    const negro = mat('#1b1d20');
    const vidrio = mat('#1d2833');
    const cromo = mat('#c9ced3');
    const p = (w, h, d, m, x, y, z, rx = 0) => {
      const c = caja(w, h, d, m, x, y, z);
      c.rotation.x = rx;
      g.add(c);
      return c;
    };
    // Carrocería baja y ancha.
    p(4.2, 0.85, 8.6, rojo, 0, 1.0, 0);
    p(3.9, 0.3, 3.2, rojo, 0, 1.55, 2.5, 0.08);
    p(4.0, 0.35, 2.4, rojo, 0, 1.5, -3.2);
    p(4.3, 0.5, 0.45, negro, 0, 0.85, 4.45);
    p(4.3, 0.5, 0.45, negro, 0, 0.85, -4.45);
    p(4.32, 0.25, 6.2, negro, 0, 0.62, 0);
    // Cabina con vidrios inclinados.
    p(3.6, 1.0, 3.0, vidrio, 0, 1.95, -0.5);
    p(3.5, 0.12, 2.4, rojo, 0, 2.5, -0.6);
    p(3.6, 0.1, 1.7, vidrio, 0, 2.0, 1.55, -0.62);
    p(3.6, 0.1, 1.6, vidrio, 0, 1.95, -2.55, 0.7);
    // Franja blanca y alerón.
    p(0.7, 0.02, 3.0, mat('#fafafa'), 0, 1.72, 2.5, 0.08);
    p(0.7, 0.02, 2.4, mat('#fafafa'), 0, 2.57, -0.6);
    p(4.0, 0.12, 0.8, negro, 0, 2.25, -4.05);
    p(0.15, 0.6, 0.3, negro, -1.3, 1.9, -4.05);
    p(0.15, 0.6, 0.3, negro, 1.3, 1.9, -4.05);
    // Luces, parrilla, espejos.
    const faro = new THREE.MeshBasicMaterial({ color: '#fffbe6' });
    const stop = new THREE.MeshBasicMaterial({ color: '#ff1744' });
    p(1.0, 0.28, 0.1, faro, -1.45, 1.25, 4.7);
    p(1.0, 0.28, 0.1, faro, 1.45, 1.25, 4.7);
    p(1.6, 0.35, 0.08, negro, 0, 1.05, 4.7);
    p(1.3, 0.22, 0.08, stop, -1.3, 1.3, -4.7);
    p(1.3, 0.22, 0.08, stop, 1.3, 1.3, -4.7);
    p(0.5, 0.3, 0.25, rojo, -2.2, 2.0, 1.0);
    p(0.5, 0.3, 0.25, rojo, 2.2, 2.0, 1.0);
    // Ruedas: el giro de avance va en un grupo interior; las de adelante doblan.
    const geoGoma = new THREE.CylinderGeometry(0.78, 0.78, 0.65, 16);
    const geoLlanta = new THREE.CylinderGeometry(0.45, 0.45, 0.67, 8);
    for (const [x, z] of [[-2.0, 2.9], [2.0, 2.9], [-2.0, -2.9], [2.0, -2.9]]) {
      const soporte = new THREE.Group();
      soporte.position.set(x, 0.78, z);
      const giro = new THREE.Group();
      const goma = new THREE.Mesh(geoGoma, negro);
      goma.rotation.z = Math.PI / 2;
      const llanta = new THREE.Mesh(geoLlanta, cromo);
      llanta.rotation.z = Math.PI / 2;
      giro.add(goma, llanta);
      soporte.add(giro);
      g.add(soporte);
      this.ruedas.push(giro);
      if (z > 0) this.delanteras.push(soporte);
    }
  }

  colocar() {
    this.grupo.position.copy(this.pos);
    this.grupo.rotation.y = this.angulo;
    const c = Math.abs(Math.cos(this.angulo));
    const s = Math.abs(Math.sin(this.angulo));
    const hx = c * 2.1 + s * 4.5;
    const hz = s * 2.1 + c * 4.5;
    this.caja.min.set(this.pos.x - hx, 0, this.pos.z - hz);
    this.caja.max.set(this.pos.x + hx, 2.8, this.pos.z + hz);
  }

  // ejes: { x: doblar (+ derecha), y: acelerar (+ adelante) }.
  actualizar(dt, ejes, colisiones) {
    const acel = ejes.y;
    if (acel) {
      const frenando = acel * this.vel < 0;
      this.vel += acel * (frenando ? 45 : 22) * dt;
    } else {
      this.vel *= Math.max(0, 1 - 1.6 * dt);
      if (Math.abs(this.vel) < 0.2) this.vel = 0;
    }
    this.vel = THREE.MathUtils.clamp(this.vel, VEL_ATRAS, VEL_MAX);
    this.direccion += (ejes.x * 0.45 - this.direccion) * Math.min(1, dt * 8);
    this.angulo -= this.direccion * 3.6 * THREE.MathUtils.clamp(this.vel / 10, -1, 1) * dt;

    const p = this.pos;
    p.x = THREE.MathUtils.clamp(p.x + Math.sin(this.angulo) * this.vel * dt, -LIMITE_MAPA, LIMITE_MAPA);
    p.z = THREE.MathUtils.clamp(p.z + Math.cos(this.angulo) * this.vel * dt, -LIMITE_MAPA, LIMITE_MAPA);
    let choque = false;
    for (const b of colisiones) {
      if (b === this.caja || b.max.y < 0.35 || b.min.y > 2.5) continue;
      const ox1 = p.x + RADIO - b.min.x;
      const ox2 = b.max.x - (p.x - RADIO);
      if (ox1 <= 0 || ox2 <= 0) continue;
      const oz1 = p.z + RADIO - b.min.z;
      const oz2 = b.max.z - (p.z - RADIO);
      if (oz1 <= 0 || oz2 <= 0) continue;
      if (Math.min(ox1, ox2) < Math.min(oz1, oz2)) p.x += ox1 < ox2 ? -ox1 : ox2;
      else p.z += oz1 < oz2 ? -oz1 : oz2;
      choque = true;
    }
    if (choque) this.vel *= 0.4;

    for (const r of this.ruedas) r.rotation.x += (this.vel * dt) / 0.78;
    for (const d of this.delanteras) d.rotation.y = -this.direccion;
    this.colocar();
  }

  // Punto al costado del conductor, para bajarse.
  puntoBajada(salida) {
    return salida.set(this.pos.x + Math.cos(this.angulo) * 3.6, 0, this.pos.z - Math.sin(this.angulo) * 3.6);
  }
}
