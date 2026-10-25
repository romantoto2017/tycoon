import * as THREE from 'three';
import { geoLechuga, matLechuga, geoTierra } from './lechuga.js';
import { TERRENO, MANSION as M } from './constantes.js';

// Lechugas (easter egg): se compran en la verdulería de la Ciudad Vecibanda y se llevan como
// el AK (slot 2). Con una en la mano, tocando el piso del terreno se deja ahí, una por una;
// tocando una que ya está, se levanta. A la Mazza le dan pánico (mazza.js), como a los
// creepers los gatos. Se guardan en estado.lechugas (las que tenés) y estado.lechugasPuestas.
export const PRECIO_LECHUGA = 500_000;
const MAX = 400;
const ALCANCE = 45; // hasta dónde se puede poner una desde donde estás
const PASO_VALLA = 1.5; // distancia entre lechugas vecinas

export class Lechugas {
  constructor(escena, estado, guardar) {
    this.estado = estado;
    this.guardar = guardar;
    estado.lechugas ??= 0;
    estado.lechugasPuestas ??= [];
    const geo = geoLechuga();
    const mat = matLechuga();
    this.campo = new THREE.InstancedMesh(geo, mat, MAX);
    this.campo.count = 0;
    escena.add(this.campo);
    this.tierra = new THREE.InstancedMesh(geoTierra(), new THREE.MeshLambertMaterial({ color: '#6b4a2e' }), MAX);
    this.tierra.count = 0;
    escena.add(this.tierra);
    this.mano = new THREE.Mesh(geo, mat);
    this.mano.position.set(0, -1.95, 0.35);
    this.mano.scale.setScalar(0.85);
    this.mano.rotation.x = Math.PI / 2;
    this.enMano = false;
    this.rayo = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();
    this.plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.punto = new THREE.Vector3();
    this.tmp = new THREE.Vector3();
    this.dibujar();
  }

  get puestas() { return this.estado.lechugasPuestas; }
  get cantidad() { return this.estado.lechugas; }

  dibujar() {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Vector3();
    const p = new THREE.Vector3();
    const giro = new THREE.Euler();
    this.puestas.forEach(([x, z, r], i) => {
      // Cada una un poco distinta (tamaño y una leve inclinación), sacado del giro guardado.
      const k = (r * 7.31) % 1;
      e.setScalar(0.9 + k * 0.22);
      m.compose(p.set(x, 0.05, z), q.setFromEuler(giro.set((k - 0.5) * 0.2, r, ((r * 3.7) % 1 - 0.5) * 0.2)), e);
      this.campo.setMatrixAt(i, m);
      m.compose(p.set(x, 0, z), q.setFromEuler(giro.set(0, r, 0)), e.setScalar(1));
      this.tierra.setMatrixAt(i, m);
    });
    for (const im of [this.campo, this.tierra]) {
      im.count = this.puestas.length;
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
    }
  }

  // Dónde cae un toque en la pantalla: el piso (y = 0), si no hay una pared antes.
  alPiso(x, y, camara, choques) {
    this.ndc.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
    this.rayo.setFromCamera(this.ndc, camara);
    const r = this.rayo.ray;
    if (!r.intersectPlane(this.plano, this.punto)) return null;
    const dist = this.punto.distanceTo(r.origin);
    for (const b of choques) {
      if (b.max.y < 0.3 || b.containsPoint(r.origin)) continue;
      if (r.intersectBox(b, this.tmp) && this.tmp.distanceTo(r.origin) < dist - 0.3) return null;
    }
    return this.punto;
  }

  // Se puede dejar ahí: en el terreno, afuera de la casa y de cualquier cosa sólida o con agua.
  libre(p, choques, agua) {
    if (p.x < TERRENO.x0 + 0.8 || p.x > TERRENO.x1 - 0.8 || p.z < TERRENO.z0 + 0.8 || p.z > TERRENO.z1 - 0.8) return false;
    if (p.x > M.x0 - 0.6 && p.x < M.x1 + 0.6 && p.z > M.z0 - 0.6 && p.z < M.z1 + 0.6) return false;
    this.tmp.set(p.x, 0.4, p.z);
    for (const b of choques) if (b.min.y < 1.2 && b.max.y > 0.3 && b.distanceToPoint(this.tmp) < 0.5) return false;
    for (const b of agua) if (b.distanceToPoint(this.tmp) < 0.5) return false;
    return !this.puestas.some(([x, z]) => Math.hypot(x - p.x, z - p.z) < PASO_VALLA - 0.05);
  }

  // Toque con la lechuga en la mano: levanta la que tocaste o deja una nueva.
  tocar(x, y, camara, jugador, choques, agua) {
    const p = this.alPiso(x, y, camara, choques);
    if (!p || Math.hypot(p.x - jugador.pos.x, p.z - jugador.pos.z) > ALCANCE) return '';
    const i = this.puestas.findIndex(([lx, lz]) => Math.hypot(lx - p.x, lz - p.z) < 0.8);
    if (i >= 0) {
      this.puestas.splice(i, 1);
      this.estado.lechugas++;
      this.dibujar();
      this.guardar();
      return 'levantada';
    }
    // Al lado de otra, se acomoda en fila (a 1,5 justo), así la valla queda pareja.
    const vecina = this.masCerca(p.x, p.z);
    if (vecina && vecina.d < 2.6 && vecina.d > 0.01) {
      const k = PASO_VALLA / vecina.d;
      p.set(vecina.x + (p.x - vecina.x) * k, 0, vecina.z + (p.z - vecina.z) * k);
    }
    if (this.estado.lechugas <= 0 || this.puestas.length >= MAX || !this.libre(p, choques, agua)) return '';
    this.puestas.push([Math.round(p.x * 100) / 100, Math.round(p.z * 100) / 100, Math.round(Math.random() * 628) / 100]);
    this.estado.lechugas--;
    this.dibujar();
    this.guardar();
    return 'puesta';
  }

  // La más cercana a (x, z) y a qué distancia (para la Mazza).
  masCerca(x, z) {
    let mejor = null;
    let d = Infinity;
    for (const l of this.puestas) {
      const dl = Math.hypot(l[0] - x, l[1] - z);
      if (dl < d) { d = dl; mejor = l; }
    }
    return mejor ? { x: mejor[0], z: mejor[1], d } : null;
  }
}
