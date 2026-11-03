import * as THREE from 'three';
import { LIMITE_MAPA } from './constantes.js';

// Helicóptero manejable (el del helipuerto de la terraza). Mira hacia +z. Controles:
// adelante/atrás para avanzar, izquierda/derecha para girar, saltar (Espacio o el botón) para
// subir; si no apretás nada baja despacito hasta apoyarse. Solo te bajás cuando está apoyado.
const VEL_MAX = 60;
const SUBIDA = 9;
const BAJADA = 4.5;
const GIRO = 1.6;
const RADIO = 2.4;
const ALTO = 4.6;
const TECHO = 260;

export class Helicoptero {
  constructor(escena, x, y, z, angulo = 0) {
    this.pos = new THREE.Vector3(x, y, z);
    this.angulo = angulo;
    this.vel = new THREE.Vector3();
    this.motor = 0; // 0 apagado, 1 a full (las aspas giran según esto)
    this.prendido = false;
    this.apoyado = true;
    this.inclinacion = 0;
    this.balanceo = 0;
    this.grupo = new THREE.Group();
    this.armar();
    escena.add(this.grupo);
    // Caja de choque para el jugador a pie (la cámara la ignora).
    this.caja = new THREE.Box3();
    this.caja.camara = false;
    this.colocar();
  }

  armar() {
    const cuerpo = new THREE.Group();
    this.cuerpo = cuerpo;
    this.grupo.add(cuerpo);
    const blanco = new THREE.MeshPhongMaterial({ color: '#f4f4f2', specular: '#888888', shininess: 40 });
    const rojo = new THREE.MeshPhongMaterial({ color: '#d32f2f', specular: '#552222', shininess: 30 });
    const vidrio = new THREE.MeshPhongMaterial({ color: '#1d2833', specular: '#ffffff', shininess: 90 });
    const negro = new THREE.MeshLambertMaterial({ color: '#24282c' });
    const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.rotation.set(rx, ry, rz);
      cuerpo.add(m);
      return m;
    };
    const caja = (w, h, d, mat, x, y, z) => add(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
    // Cabina redondeada: una cápsula acostada, con la trompa de vidrio adelante.
    add(new THREE.CapsuleGeometry(1.9, 3.4, 6, 14), blanco, 0, 2.7, 0, Math.PI / 2);
    add(new THREE.SphereGeometry(1.75, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), vidrio, 0, 2.75, 2.1, Math.PI / 2 + 0.25);
    for (const lado of [-1, 1]) caja(0.06, 1.1, 1.6, vidrio, lado * 1.9, 3.1, 0.6);
    caja(3.86, 0.35, 5.4, rojo, 0, 2.3, 0);
    // Cola con el estabilizador y el rotor de cola.
    add(new THREE.CylinderGeometry(0.35, 0.7, 6.5, 10), blanco, 0, 3.1, -5.6, Math.PI / 2 - 0.08);
    caja(0.18, 1.9, 1.3, rojo, 0, 3.9, -8.6);
    caja(2.4, 0.12, 0.8, blanco, 0, 3.3, -8.2);
    this.rotorCola = new THREE.Group();
    this.rotorCola.position.set(0.3, 3.8, -8.9);
    this.rotorCola.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.4, 0.25), negro));
    cuerpo.add(this.rotorCola);
    // Patines.
    for (const lado of [-1, 1]) {
      add(new THREE.CylinderGeometry(0.13, 0.13, 6.4, 8), negro, lado * 1.9, 0.13, 0.2, Math.PI / 2);
      for (const z of [-1.4, 1.6]) caja(0.12, 1.4, 0.12, negro, lado * 1.6, 0.8, z).rotation.z = lado * 0.35;
    }
    // Mástil y rotor principal.
    add(new THREE.CylinderGeometry(0.25, 0.3, 0.8, 8), negro, 0, 4.85, 0);
    this.rotor = new THREE.Group();
    this.rotor.position.set(0, 5.3, 0);
    this.rotor.add(new THREE.Mesh(new THREE.BoxGeometry(15, 0.1, 0.55), negro));
    this.rotor.add(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.1, 15), negro));
    cuerpo.add(this.rotor);
    // Luces: roja atrás y verde/roja en los costados.
    const luz = (c) => new THREE.MeshBasicMaterial({ color: c });
    caja(0.2, 0.2, 0.2, luz('#ff1744'), 0, 4.95, -8.6);
    caja(0.15, 0.15, 0.15, luz('#00e676'), 1.95, 2.3, 1.2);
    caja(0.15, 0.15, 0.15, luz('#ff1744'), -1.95, 2.3, 1.2);
  }

  colocar() {
    this.grupo.position.copy(this.pos);
    this.grupo.rotation.y = this.angulo;
    this.cuerpo.rotation.set(this.inclinacion, 0, this.balanceo);
    this.caja.min.set(this.pos.x - 2.3, this.pos.y, this.pos.z - 2.3);
    this.caja.max.set(this.pos.x + 2.3, this.pos.y + 4.5, this.pos.z + 2.3);
  }

  // Altura del piso debajo (el terreno o lo más alto que haya abajo: techos, la terraza...).
  suelo(x, z, colisiones, terreno) {
    let s = terreno ? terreno(x, z) : 0;
    for (const b of colisiones) {
      if (b === this.caja || b.camara === false) continue;
      if (x < b.min.x - 1 || x > b.max.x + 1 || z < b.min.z - 1 || z > b.max.z + 1) continue;
      if (b.max.y <= this.pos.y + 0.6 && b.max.y > s) s = b.max.y;
    }
    return s;
  }

  // ejes: { x: girar, y: adelante }; subir: bool. Devuelve true si está apoyado.
  actualizar(dt, ejes, subir, colisiones, terreno) {
    if (!this.prendido) {
      this.motor = Math.max(0, this.motor - dt * 0.4);
      this.rotor.rotation.y += this.motor * 20 * dt;
      this.rotorCola.rotation.x += this.motor * 30 * dt;
      return true;
    }
    this.motor = Math.min(1, this.motor + dt * 0.6);
    const listo = this.motor > 0.85; // hasta que las aspas no giran fuerte, no despega
    this.angulo -= ejes.x * GIRO * dt * (this.apoyado ? 0.4 : 1);
    const adelante = this.apoyado ? 0 : ejes.y;
    // Velocidad horizontal hacia donde mira, con un poco de inercia.
    const objetivo = adelante * VEL_MAX;
    const actual = this.vel.x * Math.sin(this.angulo) + this.vel.z * Math.cos(this.angulo);
    const nueva = actual + (objetivo - actual) * Math.min(1, dt * 1.2);
    this.vel.x = Math.sin(this.angulo) * nueva;
    this.vel.z = Math.cos(this.angulo) * nueva;
    this.vel.y = listo && subir ? SUBIDA : -BAJADA;

    const p = this.pos;
    const antes = p.clone();
    p.x = THREE.MathUtils.clamp(p.x + this.vel.x * dt, LIMITE_MAPA.x0, LIMITE_MAPA.x1);
    p.z = THREE.MathUtils.clamp(p.z + this.vel.z * dt, LIMITE_MAPA.z0, LIMITE_MAPA.z1);
    // Si se mete en algo (una pared, un edificio), vuelve y frena.
    for (const b of colisiones) {
      if (b === this.caja || b.max.y < p.y + 0.4 || b.min.y > p.y + ALTO) continue;
      if (p.x + RADIO > b.min.x && p.x - RADIO < b.max.x && p.z + RADIO > b.min.z && p.z - RADIO < b.max.z) {
        p.x = antes.x;
        p.z = antes.z;
        this.vel.x = 0;
        this.vel.z = 0;
        break;
      }
    }
    p.y = Math.min(TECHO, p.y + this.vel.y * dt);
    const piso = this.suelo(p.x, p.z, colisiones, terreno);
    // No se mete en un techo de arriba al subir.
    for (const b of colisiones) {
      if (b === this.caja || b.min.y < antes.y + ALTO - 0.2) continue;
      if (p.x + RADIO > b.min.x && p.x - RADIO < b.max.x && p.z + RADIO > b.min.z && p.z - RADIO < b.max.z && p.y + ALTO > b.min.y) {
        p.y = Math.min(p.y, b.min.y - ALTO);
      }
    }
    this.apoyado = p.y <= piso + 0.02;
    if (this.apoyado) {
      p.y = piso;
      this.vel.y = 0;
    }
    // Se inclina para adelante al avanzar y de costado al girar.
    this.inclinacion += ((nueva / VEL_MAX) * 0.22 - this.inclinacion) * Math.min(1, dt * 3);
    this.balanceo += ((this.apoyado ? 0 : ejes.x * 0.18) - this.balanceo) * Math.min(1, dt * 3);
    this.rotor.rotation.y += this.motor * 20 * dt;
    this.rotorCola.rotation.x += this.motor * 30 * dt;
    this.colocar();
    return this.apoyado;
  }

  // Punto al costado, para bajarse (a la altura donde está apoyado).
  puntoBajada(salida) {
    return salida.set(this.pos.x + Math.cos(this.angulo) * 4.2, this.pos.y + 0.2, this.pos.z - Math.sin(this.angulo) * 4.2);
  }
}
