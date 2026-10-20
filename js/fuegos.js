import * as THREE from 'three';

const MAX = 900;
const POR_EXPLOSION = 90;
const COLORES = ['#ff1744', '#ffea00', '#00e5ff', '#76ff03', '#ff4081', '#ffffff', '#ff9100'].map((c) => new THREE.Color(c));

// Fuegos artificiales con un solo THREE.Points (barato).
export class Fuegos {
  constructor(escena) {
    this.pos = new Float32Array(MAX * 3);
    this.col = new Float32Array(MAX * 3);
    this.vel = new Float32Array(MAX * 3);
    this.vida = new Float32Array(MAX);
    this.base = [];
    this.siguiente = 0;
    this.activo = false;
    this.espera = 0;
    for (let i = 0; i < MAX; i++) this.pos[i * 3 + 1] = -999;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    this.puntos = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.9, vertexColors: true, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, fog: false,
    }));
    this.puntos.frustumCulled = false;
    escena.add(this.puntos);
  }

  explotar(x, y, z) {
    const color = COLORES[Math.floor(Math.random() * COLORES.length)];
    for (let n = 0; n < POR_EXPLOSION; n++) {
      const i = this.siguiente;
      this.siguiente = (this.siguiente + 1) % MAX;
      const u = Math.random() * 2 - 1;
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      const v = 14 + Math.random() * 4;
      this.pos.set([x, y, z], i * 3);
      this.vel.set([r * Math.cos(a) * v, u * v, r * Math.sin(a) * v], i * 3);
      this.base[i] = color;
      this.vida[i] = 1.6 + Math.random() * 0.6;
    }
  }

  actualizar(dt) {
    if (this.activo) {
      this.espera -= dt;
      if (this.espera <= 0) {
        this.espera = 0.5 + Math.random() * 0.8;
        this.explotar((Math.random() - 0.5) * 50, 48 + Math.random() * 18, -10 + (Math.random() - 0.5) * 30);
      }
    }
    let vivos = false;
    for (let i = 0; i < MAX; i++) {
      if (this.vida[i] <= 0) continue;
      vivos = true;
      this.vida[i] -= dt;
      const j = i * 3;
      if (this.vida[i] <= 0) { this.pos[j + 1] = -999; continue; }
      this.vel[j + 1] -= 12 * dt;
      this.vel[j] *= 0.98;
      this.vel[j + 2] *= 0.98;
      this.pos[j] += this.vel[j] * dt;
      this.pos[j + 1] += this.vel[j + 1] * dt;
      this.pos[j + 2] += this.vel[j + 2] * dt;
      const k = Math.min(1, this.vida[i]);
      const c = this.base[i];
      this.col[j] = c.r * k;
      this.col[j + 1] = c.g * k;
      this.col[j + 2] = c.b * k;
    }
    if (vivos || this.activo) {
      this.puntos.geometry.attributes.position.needsUpdate = true;
      this.puntos.geometry.attributes.color.needsUpdate = true;
    }
  }
}
