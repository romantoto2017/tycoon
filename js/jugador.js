import * as THREE from 'three';
import { texturaSombra } from './texturas.js';
import { SPAWN } from './constantes.js';

const RADIO = 0.75;
const ALTO = 5.3;
const AGACHADO = 0.6;   // alto agachado (proporción)
const PASO = 0.75;      // escalón que se sube caminando
// Como en Roblox (1 unidad ≈ 1 stud): camina a 16, gravedad 196,2 y salto de 50
// (sube unas 6,4 unidades, más alto que la cabeza, y dura medio segundo).
const GRAVEDAD = 196.2;
const VEL_CAMINAR = 16;
const VEL_SALTO = 50;
const CAIDA_MAX = 120;
const ALTO_AUTOSALTO = 5; // en el celu salta solo al chocar contra algo más bajo que esto
const LIMITE = 150;

export class Jugador {
  constructor(escena) {
    this.pos = new THREE.Vector3(SPAWN.x, 0, SPAWN.z);
    this.enAgua = false;
    this.factorVel = 1; // por personaje (data/personajes.js: velocidad)
    this.escala = 1; // Jeipi es más alto (data/personajes.js: alto)
    this.agachado = false;
    this.quiereAgacharse = false;
    this.mirarA = null; // ángulo fijo (Shift Lock / primera persona): mira hacia donde mira la cámara
    this.autoSalto = false; // en el celu, como en Roblox
    this.trabado = 0; // alto del obstáculo contra el que chocó este cuadro
    this.vel = new THREE.Vector3();
    this.enSuelo = true;
    this.suelo = 0;
    this.angulo = Math.PI; // mirando a la mansión
    this.modelo = null;

    this.contenedor = new THREE.Group();
    escena.add(this.contenedor);

    this.sombra = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 2.6),
      new THREE.MeshBasicMaterial({ map: texturaSombra(), transparent: true, depthWrite: false }),
    );
    this.sombra.rotation.x = -Math.PI / 2;
    escena.add(this.sombra);
  }

  // Alto actual del cuerpo (para chocar con techos y dinteles).
  get alto() { return ALTO * this.escala * (this.agachado ? AGACHADO : 1); }

  setEscala(e) {
    this.escala = e;
    this.agachado = false;
    this.quiereAgacharse = false;
    this.contenedor.scale.y = 1;
    if (this.modelo) this.modelo.grupo.scale.setScalar(e);
  }

  // Pararse solo si hay lugar arriba (si no, sigue agachado hasta salir del dintel).
  actualizarAgachado(colisiones) {
    if (this.quiereAgacharse === this.agachado) return;
    if (!this.quiereAgacharse) {
      const p = this.pos;
      const r = RADIO * 0.9;
      const parado = ALTO * this.escala;
      const bajo = parado * AGACHADO;
      const choca = colisiones.some((b) => p.x + r > b.min.x && p.x - r < b.max.x && p.z + r > b.min.z && p.z - r < b.max.z
        && b.min.y >= p.y + bajo - 0.05 && b.min.y < p.y + parado);
      if (choca) return;
    }
    this.agachado = this.quiereAgacharse;
    this.contenedor.scale.y = this.agachado ? AGACHADO : 1;
  }

  setModelo(modelo) {
    if (this.modelo) {
      this.contenedor.remove(this.modelo.grupo);
      this.modelo.liberar();
    }
    this.modelo = modelo;
    modelo.grupo.scale.setScalar(this.escala);
    this.contenedor.add(modelo.grupo);
  }

  // dir: vector en el plano XZ con largo 0..1. saltar: tecla de salto apretada.
  // agua: cajas (Box3) donde se nada. Devuelve true si saltó.
  actualizar(dt, dir, saltar, colisiones, agua = []) {
    const p = this.pos;
    this.enAgua = agua.some((b) => p.x > b.min.x && p.x < b.max.x && p.z > b.min.z && p.z < b.max.z && p.y + 1.5 < b.max.y && p.y > b.min.y - 1);
    this.actualizarAgachado(colisiones);
    const vel = VEL_CAMINAR * this.factorVel * (this.enAgua ? 0.6 : 1) * (this.agachado ? 0.55 : 1);
    this.vel.x = dir.x * vel;
    this.vel.z = dir.z * vel;
    let salto = false;
    if (this.autoSalto && this.enSuelo && this.trabado > 0 && (dir.x || dir.z)) saltar = true;
    if (saltar && this.enSuelo) {
      this.vel.y = VEL_SALTO;
      this.enSuelo = false;
      salto = true;
    } else if (saltar && this.enAgua) {
      this.vel.y = Math.max(this.vel.y, 6); // nadar hacia arriba
    }

    this.moverHorizontal(dt, colisiones);
    this.moverVertical(dt, colisiones);

    const velPlano = Math.hypot(this.vel.x, this.vel.z);
    if (this.mirarA !== null || velPlano > 0.5) {
      const objetivo = this.mirarA !== null ? this.mirarA : Math.atan2(this.vel.x, this.vel.z);
      let d = objetivo - this.angulo;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.angulo += d * Math.min(1, dt * 12);
    }

    this.contenedor.position.copy(this.pos);
    this.contenedor.rotation.y = this.angulo;
    this.sombra.position.set(this.pos.x, this.suelo + 0.06, this.pos.z);
    if (this.modelo) this.modelo.animar(dt, velPlano, this.enSuelo || this.enAgua);
    return salto;
  }

  moverHorizontal(dt, colisiones) {
    const p = this.pos;
    p.x = THREE.MathUtils.clamp(p.x + this.vel.x * dt, -LIMITE, LIMITE);
    p.z = THREE.MathUtils.clamp(p.z + this.vel.z * dt, -LIMITE, LIMITE);
    this.trabado = 0;
    for (const b of colisiones) {
      if (b.max.y <= p.y + PASO || b.min.y >= p.y + this.alto) continue;
      const ox1 = p.x + RADIO - b.min.x;
      const ox2 = b.max.x - (p.x - RADIO);
      if (ox1 <= 0 || ox2 <= 0) continue;
      const oz1 = p.z + RADIO - b.min.z;
      const oz2 = b.max.z - (p.z - RADIO);
      if (oz1 <= 0 || oz2 <= 0) continue;
      const ox = Math.min(ox1, ox2);
      const oz = Math.min(oz1, oz2);
      if (b.max.y - p.y <= ALTO_AUTOSALTO && b.min.y <= p.y + PASO) this.trabado = b.max.y - p.y;
      if (ox < oz) p.x += ox1 < ox2 ? -ox1 : ox2;
      else p.z += oz1 < oz2 ? -oz1 : oz2;
    }
  }

  moverVertical(dt, colisiones) {
    const p = this.pos;
    const yAntes = p.y;
    this.vel.y -= (this.enAgua ? GRAVEDAD * 0.3 : GRAVEDAD) * dt;
    if (this.enAgua) this.vel.y = Math.max(this.vel.y, -6);
    this.vel.y = Math.max(this.vel.y, -CAIDA_MAX);
    p.y += this.vel.y * dt;

    let suelo = 0;
    const r = RADIO * 0.8;
    for (const b of colisiones) {
      if (p.x + r <= b.min.x || p.x - r >= b.max.x || p.z + r <= b.min.z || p.z - r >= b.max.z) continue;
      if (b.max.y <= yAntes + PASO + 0.001) {
        if (b.max.y > suelo) suelo = b.max.y;
      } else if (this.vel.y > 0 && b.min.y >= yAntes + this.alto - 0.01 && p.y + this.alto > b.min.y) {
        p.y = b.min.y - this.alto; // cabezazo contra un techo
        this.vel.y = 0;
      }
    }
    this.suelo = suelo;
    if (p.y <= suelo) {
      p.y = suelo;
      this.vel.y = 0;
      this.enSuelo = true;
    } else {
      this.enSuelo = false;
    }
  }
}
