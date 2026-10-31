import * as THREE from 'three';
import { CALLE_Z } from './constantes.js';
import { mat } from './util.js';
import { sfx } from './sfx.js';

// El pony: un pony islandés (alazán, petiso y peludo, con la crin y la cola rubias). Se
// desbloquea comprando la paja en la verdulería (PRECIO_PAJA) y poniéndola afuera de la
// mansión, al lado de la cerca: el pony viene caminando por la calle, se pone a comer y ahí
// se lo puede atar al palenque. Lo usan todos de vista, pero subirse, solo Bauti: es un medio
// de transporte (más rápido que caminar). Al bajarte queda donde lo dejaste; cerca del
// palenque se ata solo, y al volver a entrar al juego está atado ahí.
export const PRECIO_PAJA = 4e7;
const PAJA = { x: 22, z: 58.4 }; // afuera de la cerca de adelante, a la derecha del portón
const POSTE = { x: 27.5, z: 58.4 };
const LLEGA_DESDE = { x: -170, z: CALLE_Z - 2 };
const VEL_CAMINA = 6;
const VEL_MONTADO = 30;
const ALTO_MONTURA = 1.15; // cuánto sube el jinete (la cadera queda arriba del lomo)
const CERCA = 4.6;
export const SOLO_BAUTI = 'Solo para los subiditos al pony';

// Pony de bloques mirando a +z. Patas con pivote en la cadera (para el trote).
function crearPony() {
  const g = new THREE.Group();
  const pelo = mat('#8b4a22');
  const oscuro = mat('#6a3416');
  const crin = mat('#ead9ab');
  const casco = mat('#2a221d');
  const hocico = mat('#5a2f17');
  const b = (w, h, l, m, x, y, z, padre = g) => { const c = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), m); c.position.set(x, y, z); padre.add(c); return c; };
  // Cuerpo petiso y panzón, con el pelo de invierno (un poco más ancho abajo).
  b(1.7, 1.45, 3.5, pelo, 0, 2.35, 0);
  b(1.82, 0.5, 2.9, pelo, 0, 1.75, 0);
  b(1.6, 0.6, 0.9, pelo, 0, 2.55, -1.6); // anca
  // Patas cortas y gruesas, con cascos oscuros.
  const patas = [];
  for (const [x, z] of [[-0.55, 1.25], [0.55, 1.25], [-0.55, -1.25], [0.55, -1.25]]) {
    const p = new THREE.Group();
    p.position.set(x, 1.7, z);
    b(0.55, 1.45, 0.55, pelo, 0, -0.65, 0, p);
    b(0.5, 0.3, 0.5, oscuro, 0, -1.25, 0, p);
    b(0.58, 0.22, 0.62, casco, 0, -1.58, 0.03, p);
    g.add(p);
    patas.push(p);
  }
  // Cuello y cabeza (pivote en la cruz, para bajarla a comer).
  const cuello = new THREE.Group();
  cuello.position.set(0, 2.75, 1.45);
  g.add(cuello);
  const c1 = b(0.95, 1.6, 0.95, pelo, 0, 0.65, 0.3, cuello);
  c1.rotation.x = 0.45;
  const cabeza = new THREE.Group();
  cabeza.position.set(0, 1.35, 0.75);
  cuello.add(cabeza);
  b(0.8, 0.8, 1.05, pelo, 0, 0, 0.25, cabeza);
  b(0.68, 0.6, 0.6, hocico, 0, -0.12, 0.98, cabeza);
  b(0.12, 0.1, 0.05, mat('#120b07'), -0.18, -0.08, 1.29, cabeza);
  b(0.12, 0.1, 0.05, mat('#120b07'), 0.18, -0.08, 1.29, cabeza);
  for (const s of [-1, 1]) {
    b(0.08, 0.16, 0.16, mat('#140d09'), s * 0.41, 0.12, 0.45, cabeza); // ojos
    const oreja = b(0.18, 0.38, 0.14, pelo, s * 0.25, 0.55, -0.1, cabeza);
    oreja.rotation.z = -s * 0.2;
  }
  // Crin rubia larga cayendo a un costado del cuello, y el flequillo sobre la frente.
  const cr = b(0.3, 1.75, 0.55, crin, 0.42, 0.75, 0.05, cuello);
  cr.rotation.x = 0.45;
  b(0.5, 0.42, 0.3, crin, 0.08, 0.32, 0.6, cabeza);
  b(0.62, 0.18, 0.95, crin, 0, 0.45, 0, cabeza);
  // Cola rubia, larga y tupida.
  const cola = new THREE.Group();
  cola.position.set(0, 2.7, -1.8);
  g.add(cola);
  b(0.42, 1.9, 0.42, crin, 0, -0.85, -0.18, cola).rotation.x = -0.2;
  // Montura y riendas (al atarlo ya tiene dueño).
  const montura = new THREE.Group();
  g.add(montura);
  b(1.8, 0.16, 1.4, mat('#3b2412'), 0, 3.1, 0.2, montura);
  b(1.0, 0.3, 0.3, mat('#3b2412'), 0, 3.25, 0.8, montura);
  b(0.06, 0.6, 0.12, mat('#c9a14a'), -0.95, 2.75, 0.2, montura);
  b(0.06, 0.6, 0.12, mat('#c9a14a'), 0.95, 2.75, 0.2, montura);
  montura.visible = false;
  return { grupo: g, patas, cuello, cabeza, cola, montura, fase: 0 };
}

// Fardo de paja (para la verdulería y para ponerlo afuera de la cerca).
export function crearPaja() {
  const g = new THREE.Group();
  const paja = mat('#d9b44a');
  const clara = mat('#ead07a');
  const fardo = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 1.3), paja);
  fardo.position.y = 0.55;
  g.add(fardo);
  for (const x of [-0.55, 0.55]) {
    const hilo = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.14, 1.34), mat('#7a5a2a'));
    hilo.position.set(x, 0.55, 0);
    g.add(hilo);
  }
  for (let i = 0; i < 6; i++) {
    const brizna = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.08), clara);
    brizna.position.set(-0.9 + i * 0.36, 1.12, -0.4 + (i % 3) * 0.35);
    brizna.rotation.y = i * 0.9;
    g.add(brizna);
  }
  return g;
}

function crearPoste() {
  const g = new THREE.Group();
  const madera = mat('#6b4a2e');
  const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3, 0.35), madera);
  p1.position.y = 1.5;
  const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 2.2), madera);
  p2.position.set(0, 2.6, 0);
  g.add(p1, p2);
  return g;
}

export class Pony {
  constructor({ escena, estado, ui, guardar }) {
    this.escena = escena;
    this.estado = estado;
    this.ui = ui;
    this.guardar = guardar;
    this.p = crearPony();
    this.p.grupo.visible = false;
    escena.add(this.p.grupo);
    this.paja = crearPaja();
    this.paja.position.set(PAJA.x, 0, PAJA.z);
    this.paja.visible = false;
    escena.add(this.paja);
    this.poste = crearPoste();
    this.poste.position.set(POSTE.x, 0, POSTE.z);
    this.poste.visible = false;
    escena.add(this.poste);
    // La soga del palenque a la cabeza.
    this.soga = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1), mat('#c8b07a'));
    this.soga.visible = false;
    escena.add(this.soga);
    this.montado = false;
    this.x = POSTE.x - 3.2;
    this.z = POSTE.z;
    this.ang = Math.PI / 2; // atado: mirando al palenque
    // Viniendo a comer (después de poner la paja).
    this.viniendo = false;
    if (estado.pony === 'paja') this.empezarAVenir();
  }

  get tiene() { return this.estado.pony === 'atado'; }

  empezarAVenir() {
    this.viniendo = true;
    this.x = LLEGA_DESDE.x;
    this.z = LLEGA_DESDE.z;
    this.camino = [[PAJA.x - 6, CALLE_Z - 2], [PAJA.x - 3, PAJA.z]];
  }

  cerca(jugador, x, z, r = CERCA) {
    return jugador.pos.y < 3 && Math.hypot(jugador.pos.x - x, jugador.pos.z - z) < r;
  }

  // Texto del botón de acción, o ''. esBauti: si el personaje es Bauti.
  accion(jugador) {
    const e = this.estado;
    if (this.montado) return 'Bajarse del pony (E)';
    if (e.paja === 'comprada' && !e.pony && this.cerca(jugador, PAJA.x, PAJA.z, 5.5)) return 'Poner la paja (E)';
    if (e.pony === 'paja' && !this.viniendo && this.cerca(jugador, this.x, this.z)) return 'Atar al pony (E)';
    if (this.tiene && this.cerca(jugador, this.x, this.z)) return 'Subirse al pony (E)';
    return '';
  }

  // Devuelve true si hizo algo.
  hacer(jugador, esBauti) {
    const e = this.estado;
    if (this.montado) { this.bajar(jugador); return true; }
    if (e.paja === 'comprada' && !e.pony && this.cerca(jugador, PAJA.x, PAJA.z, 5.5)) {
      e.pony = 'paja';
      e.paja = 'puesta';
      this.guardar();
      sfx.comprar();
      this.ui.toast('Pusiste la paja... a ver si viene alguien a comer', 'info', 4000);
      this.empezarAVenir();
      return true;
    }
    if (e.pony === 'paja' && !this.viniendo && this.cerca(jugador, this.x, this.z)) {
      e.pony = 'atado';
      this.guardar();
      sfx.brillo();
      this.ui.toast('¡Ataste al pony! Ahora es tuyo', 'plata', 4000);
      return true;
    }
    if (this.tiene && this.cerca(jugador, this.x, this.z)) {
      if (!esBauti) {
        this.ui.aviso(SOLO_BAUTI, 'amor');
        clearTimeout(this.tAviso);
        this.tAviso = setTimeout(() => this.ui.aviso(null), 3000);
        sfx.error();
        return true;
      }
      this.subir(jugador);
      return true;
    }
    return false;
  }

  subir(jugador) {
    this.montado = true;
    jugador.pos.set(this.x, jugador.pos.y, this.z);
    jugador.angulo = this.ang;
    this.p.montura.visible = true;
    jugador.montura = {
      vel: VEL_MONTADO,
      alto: ALTO_MONTURA,
      mover: (dt, pos, angulo, vel) => {
        this.x = pos.x;
        this.z = pos.z;
        this.ang = angulo;
        this.p.grupo.position.set(pos.x, pos.y, pos.z);
        this.p.grupo.rotation.y = angulo;
        this.trotar(dt, vel);
      },
    };
    sfx.salto();
  }

  bajar(jugador) {
    this.montado = false;
    jugador.montura = null;
    const pi = jugador.modelo?.partes;
    if (pi) { pi.piernaI.muslo.rotation.z = 0; pi.piernaD.muslo.rotation.z = 0; }
    // Te bajás por el costado.
    jugador.pos.x += Math.cos(this.ang) * 2.2;
    jugador.pos.z -= Math.sin(this.ang) * 2.2;
    // Cerca del palenque, queda atado ahí de nuevo.
    if (Math.hypot(this.x - POSTE.x, this.z - POSTE.z) < 10) { this.x = POSTE.x - 3.2; this.z = POSTE.z; this.ang = Math.PI / 2; }
  }

  // Trote: patas en diagonal, la cabeza que cabecea y la cola que se mueve.
  trotar(dt, vel) {
    const p = this.p;
    p.fase += dt * Math.min(vel, 40) * 0.55;
    const a = Math.min(1, vel / 8) * 0.6;
    p.patas.forEach((pa, i) => { pa.rotation.x = Math.sin(p.fase + (i === 0 || i === 3 ? 0 : Math.PI)) * a; });
    p.cuello.rotation.x = Math.sin(p.fase * 2) * 0.05 * (a > 0.1 ? 1 : 0);
    p.cola.rotation.x = 0.2 + Math.sin(p.fase) * 0.15 * (a > 0.1 ? 1 : 0);
  }

  actualizar(dt, jugador) {
    const e = this.estado;
    const hay = e.pony === 'paja' || e.pony === 'atado';
    this.paja.visible = e.pony === 'paja';
    this.poste.visible = hay;
    const g = this.p.grupo;
    g.visible = hay && (this.montado || Math.hypot(jugador.pos.x - this.x, jugador.pos.z - this.z) < 600);
    if (!g.visible) return;
    this.p.montura.visible = e.pony === 'atado';
    if (this.montado) { this.soga.visible = false; return; }
    let vel = 0;
    if (this.viniendo) {
      const [px, pz] = this.camino[0];
      const dx = px - this.x;
      const dz = pz - this.z;
      const d = Math.hypot(dx, dz);
      if (d < VEL_CAMINA * dt) { this.x = px; this.z = pz; this.camino.shift(); } else { this.x += (dx / d) * VEL_CAMINA * dt; this.z += (dz / d) * VEL_CAMINA * dt; vel = VEL_CAMINA; }
      if (d > 0.05) this.ang = Math.atan2(dx, dz);
      if (!this.camino.length) {
        this.viniendo = false;
        this.ang = Math.PI / 2; // de frente a la paja
        if (Math.hypot(jugador.pos.x - this.x, jugador.pos.z - this.z) < 80) this.ui.toast('¡Vino un pony a comer la paja! Atalo antes de que se vaya', 'plata', 4500);
      }
    }
    g.position.set(this.x, 0, this.z);
    g.rotation.y = this.ang;
    this.trotar(dt, vel);
    // Comiendo la paja: cabeza abajo, masticando.
    const comiendo = e.pony === 'paja' && !this.viniendo;
    const t = performance.now() / 1000;
    this.p.cuello.rotation.x = comiendo ? 0.95 + Math.sin(t * 5) * 0.06 : vel ? this.p.cuello.rotation.x : Math.sin(t * 0.8) * 0.04;
    if (!vel) this.p.cola.rotation.z = Math.sin(t * 1.3) * 0.25;
    // Atado: la soga del palenque al bozal.
    const atado = e.pony === 'atado' && Math.hypot(this.x - (POSTE.x - 3.2), this.z - POSTE.z) < 0.5;
    this.soga.visible = atado;
    if (atado) {
      const cab = this.p.cabeza.getWorldPosition(new THREE.Vector3());
      const nudo = new THREE.Vector3(POSTE.x, 2.6, POSTE.z);
      this.soga.position.copy(cab).lerp(nudo, 0.5);
      this.soga.scale.z = cab.distanceTo(nudo);
      this.soga.lookAt(nudo);
    }
  }
}
