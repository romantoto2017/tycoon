import * as THREE from 'three';
import { crearPersonaje } from './personaje.js';
import { cargarCabeza, crearEtiqueta } from './texturas.js';
import { RESTO as R, RESTO_MESAS, RESTO_LOURDES } from './constantes.js';
import { PISO_RESTO as F, PLATOS } from './resto.js';
import { caja, mat } from './util.js';
import { sfx, setRadio } from './sfx.js';

// Lourdes atiende el restaurante: está sentada en su mesita con la radio. Si le pedís
// comida (una vez por visita) calienta el plato en un microondas y te lo lleva a la mesa
// más cercana con un vaso de agua. No se paga. Mientras estás adentro suena su radio.
export const LOURDES = {
  id: 'lourdes', nombre: 'Lourdes', foto: 'lourdes2.jpeg', recorte: [0.37, 0.125, 0.16],
  piel: '#5a3726', pelo: '#16110e', peinado: 'liso', cuerpo: 'gordo',
  remera: '#f4f4f2', pantalon: '#ecebe7', lentes: '#3b2a20', colita: true, cuello: '#1d1d22', aros: true,
};
const VEL = 7;
const PASILLO_X = -44.6;
const FONDO_Z = -81.3;
const FRENTE_Z = -66.3;
const MICRO = { x: -50, z: -82.6 };
const PARADA = { x: -41.4, z: -66.6 }; // al lado de su silla
const MICRO_PUERTA = { x: -50, y: F + 3.05, z: -83.7 };

const v = (x, z) => new THREE.Vector3(x, F, z);

// ---------- Platos (formas simples, como todo el juego) ----------
function plato(id) {
  const g = new THREE.Group();
  const comida = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.5, 0.08, 20), mat('#ffffff')).translateY(0.04));
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.02, 20), mat('#eceff1')).translateY(0.08));
  const pon = (m, x, y, z) => { m.position.set(x, y, z); comida.add(m); return m; };
  const bola = (r, c, x, y, z, sy = 0.55) => { const m = pon(new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), mat(c)), x, y, z); m.scale.y = sy; return m; };
  const milanesa = () => { const m = pon(caja(0.55, 0.07, 0.42, '#c88a3a', -0.12, 0.13, 0), 0, 0, 0); m.position.set(-0.12, 0.13, 0); m.rotation.y = 0.3; };
  switch (id) {
    case 'mila_pure':
      milanesa();
      bola(0.22, '#f3e3a0', 0.22, 0.12, 0.08);
      break;
    case 'mila_fritas':
      milanesa();
      for (let i = 0; i < 7; i++) {
        const p = pon(caja(0.05, 0.05, 0.32, '#f2c84b', 0.18 + (i % 3) * 0.07, 0.13 + Math.floor(i / 3) * 0.04, 0.05), 0, 0, 0);
        p.position.set(0.15 + (i % 3) * 0.08, 0.13 + Math.floor(i / 3) * 0.04, 0.02 + (i % 2) * 0.05);
        p.rotation.y = i * 0.6;
      }
      break;
    case 'fideos':
      bola(0.36, '#ecd28c', 0, 0.1, 0, 0.45);
      bola(0.2, '#c0392b', 0, 0.2, 0, 0.4);
      bola(0.05, '#2e7d32', 0.05, 0.27, 0.03, 1);
      break;
    case 'guiso':
      bola(0.42, '#7a4a2a', 0, 0.09, 0, 0.3);
      for (let i = 0; i < 6; i++) pon(caja(0.08, 0.08, 0.08, i % 2 ? '#e67e22' : '#d9b37a', Math.cos(i) * 0.2, 0.17, Math.sin(i * 1.7) * 0.2), Math.cos(i) * 0.2, 0.17, Math.sin(i * 1.7) * 0.2);
      break;
    case 'pollo_arroz':
      bola(0.25, '#e2b07a', -0.15, 0.12, 0, 0.45).scale.x = 1.3;
      bola(0.24, '#fbfaf5', 0.22, 0.11, 0.05);
      break;
    default: // strogonoff
      bola(0.3, '#d8b48a', -0.1, 0.11, 0, 0.4);
      for (let i = 0; i < 5; i++) pon(caja(0.09, 0.06, 0.07, '#7a4a2a', -0.2 + i * 0.07, 0.17, Math.sin(i) * 0.12), -0.2 + i * 0.07, 0.17, Math.sin(i) * 0.12);
      bola(0.2, '#fbfaf5', 0.28, 0.11, 0.08);
  }
  g.add(comida);
  // Vaso de agua al lado.
  const vaso = new THREE.Group();
  vaso.add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.48, 12), new THREE.MeshLambertMaterial({ color: '#dff3ff', transparent: true, opacity: 0.45, depthWrite: false })).translateY(0.24));
  vaso.add(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.36, 12), new THREE.MeshLambertMaterial({ color: '#7cc8f2', transparent: true, opacity: 0.6, depthWrite: false })).translateY(0.19));
  vaso.position.set(0.8, 0, -0.15);
  g.add(vaso);
  g.scale.setScalar(1.25);
  return { grupo: g, comida };
}

export class Restaurante {
  constructor(escena, tycoon, ui) {
    this.escena = escena;
    this.tycoon = tycoon;
    this.ui = ui;
    this.estado = 'nada';
    this.pedido = false; // ya pidió en esta visita
    this.servido = null; // { grupo, comida, pos, comido }
    this.adentro = false;
    this.luz = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.55, 0.05), new THREE.MeshBasicMaterial({ color: '#ffd27a' }));
    this.luz.position.set(MICRO_PUERTA.x, MICRO_PUERTA.y, MICRO_PUERTA.z);
    this.luz.visible = false;
    escena.add(this.luz);
  }

  hayLourdes() {
    return this.tycoon.estado.compras.includes('resto_lourdes');
  }

  dentro(p, margen = 0) {
    return p.x > R.x0 - margen && p.x < R.x1 + margen && p.z > R.z0 - margen && p.z < R.z1 + margen && p.y < R.alto;
  }

  async crear() {
    this.estado = 'cargando';
    this.modelo = crearPersonaje(LOURDES, await cargarCabeza(LOURDES));
    this.modelo.brazosSentado = -0.45;
    const et = crearEtiqueta([{ texto: 'Lourdes', tam: 60, color: '#ffe14d' }], 4);
    et.sprite.position.y = 6.6;
    this.modelo.grupo.add(et.sprite);
    this.escena.add(this.modelo.grupo);
    this.sentarse();
  }

  sentarse() {
    const g = this.modelo.grupo;
    const [sx, sz] = RESTO_LOURDES.silla;
    g.position.set(sx - 0.25, F - 0.2, sz);
    g.rotation.set(0, -Math.PI / 2, 0);
    this.estado = 'sentada';
  }

  cercaDeLourdes(jugador) {
    if (this.estado !== 'sentada') return false;
    const p = this.modelo.grupo.position;
    return Math.hypot(jugador.pos.x - p.x, jugador.pos.z - p.z) < 4.5 && Math.abs(jugador.pos.y - F) < 2;
  }

  // Texto del botón de acción, o '' si no hay nada que hacer acá.
  accion(jugador) {
    if (!this.modelo || !this.adentro) return '';
    if (this.servido && !this.servido.comido && jugador.pos.distanceTo(this.servido.pos) < 4) return 'Comer (E)';
    if (!this.pedido && this.cercaDeLourdes(jugador)) return 'Pedir comida (E)';
    return '';
  }

  // Lo que pasa al apretar la acción. Devuelve 'menu' si hay que mostrar el menú.
  hacer(jugador) {
    const t = this.accion(jugador);
    if (t.startsWith('Comer')) {
      this.servido.comido = true;
      this.servido.comida.visible = false;
      sfx.comer();
      this.ui.toast('¡Riquísimo! Gracias, Lourdes', 'ok');
      return '';
    }
    return t.startsWith('Pedir') ? 'menu' : '';
  }

  pedir(idPlato, jugador) {
    if (this.pedido || this.estado !== 'sentada') return;
    this.pedido = true;
    this.platoPedido = idPlato;
    // La mesa más cercana al jugador.
    let mejor = RESTO_MESAS[0];
    for (const m of RESTO_MESAS) if (Math.hypot(m[0] - jugador.pos.x, m[1] - jugador.pos.z) < Math.hypot(mejor[0] - jugador.pos.x, mejor[1] - jugador.pos.z)) mejor = m;
    this.mesa = mejor;
    const nombre = PLATOS.find((p) => p.id === idPlato)?.nombre || 'la comida';
    this.ui.toast(`Lourdes: "¡Ya te caliento ${nombre.toLowerCase()}!"`, 'info');
    this.modelo.grupo.position.y = F;
    this.camino = [v(PARADA.x, PARADA.z), v(PASILLO_X, FRENTE_Z - 1), v(PASILLO_X, FONDO_Z), v(MICRO.x, FONDO_Z), v(MICRO.x, MICRO.z)];
    this.estado = 'yendo_micro';
  }

  caminoMesa() {
    const [tx, tz] = this.mesa;
    const atras = tz < -73.5;
    this.dejar = v(tx - 0.35, atras ? tz - 0.75 : tz + 0.75);
    this.dejar.y = F + 2.32;
    return atras
      ? [v(MICRO.x, FONDO_Z), v(tx, FONDO_Z), v(tx, tz - 3)]
      : [v(MICRO.x, FONDO_Z), v(PASILLO_X, FONDO_Z), v(PASILLO_X, FRENTE_Z), v(tx, FRENTE_Z), v(tx, tz + 3)];
  }

  caminoVuelta() {
    const [tx, tz] = this.mesa;
    const atras = tz < -73.5;
    return atras
      ? [v(tx, FONDO_Z), v(PASILLO_X, FONDO_Z), v(PASILLO_X, FRENTE_Z - 1), v(PARADA.x, PARADA.z)]
      : [v(tx, FRENTE_Z), v(PASILLO_X, FRENTE_Z), v(PARADA.x, PARADA.z)];
  }

  // Camina por this.camino; devuelve true al llegar.
  caminar(dt) {
    const g = this.modelo.grupo;
    let resto = VEL * dt;
    while (resto > 0 && this.camino.length) {
      const d = this.camino[0];
      const dx = d.x - g.position.x;
      const dz = d.z - g.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.01) {
        let a = Math.atan2(dx, dz) - g.rotation.y;
        a = Math.atan2(Math.sin(a), Math.cos(a));
        g.rotation.y += a * Math.min(1, dt * 10);
      }
      if (dist <= resto) {
        g.position.x = d.x;
        g.position.z = d.z;
        resto -= dist;
        this.camino.shift();
      } else {
        g.position.x += (dx / dist) * resto;
        g.position.z += (dz / dist) * resto;
        resto = 0;
      }
    }
    this.modelo.animar(dt, VEL, true);
    return !this.camino.length;
  }

  mirar(x, z, dt) {
    const g = this.modelo.grupo;
    let a = Math.atan2(x - g.position.x, z - g.position.z) - g.rotation.y;
    a = Math.atan2(Math.sin(a), Math.cos(a));
    g.rotation.y += a * Math.min(1, dt * 8);
  }

  actualizar(dt, jugador, jugando) {
    this.adentro = jugando && this.dentro(jugador.pos);
    setRadio(this.adentro && this.hayLourdes());
    if (!this.hayLourdes()) return;
    if (this.estado === 'nada') { this.crear(); return; }
    if (this.estado === 'cargando') return;
    // Al irse del restaurante, la próxima visita se puede pedir de nuevo.
    if (jugando && !this.dentro(jugador.pos, 3) && this.pedido && this.estado === 'sentada') {
      this.pedido = false;
      if (this.servido) this.escena.remove(this.servido.grupo);
      this.servido = null;
    }
    const g = this.modelo.grupo;
    if (this.estado === 'sentada') {
      this.modelo.animar(dt, 0, true, false, true);
      this.reloj = (this.reloj || 0) + dt;
      g.rotation.z = Math.sin(this.reloj * 3.2) * 0.035; // se mueve con la cumbia
      if (this.adentro && Math.hypot(jugador.pos.x - g.position.x, jugador.pos.z - g.position.z) < 9) this.mirar(jugador.pos.x, jugador.pos.z, dt * 0.3);
      else this.mirar(g.position.x - 5, g.position.z, dt);
    } else if (this.estado === 'yendo_micro') {
      g.rotation.z = 0;
      if (this.caminar(dt)) {
        this.estado = 'calentando';
        this.espera = 3.6;
        this.luz.visible = true;
        sfx.microondas();
      }
    } else if (this.estado === 'calentando') {
      this.modelo.animar(dt, 0, true);
      this.mirar(MICRO.x, MICRO.z - 3, dt);
      this.espera -= dt;
      if (this.espera <= 0) {
        this.luz.visible = false;
        sfx.pip();
        this.platoEnMano = plato(this.platoPedido);
        this.platoEnMano.grupo.position.set(0, 3.1, 1.2);
        g.add(this.platoEnMano.grupo);
        this.modelo.apuntar = true; // brazos al frente, como llevando la bandeja
        this.camino = this.caminoMesa();
        this.estado = 'llevando';
      }
    } else if (this.estado === 'llevando') {
      if (this.caminar(dt)) {
        g.remove(this.platoEnMano.grupo);
        this.platoEnMano.grupo.position.copy(this.dejar);
        this.platoEnMano.grupo.rotation.y = 0;
        this.escena.add(this.platoEnMano.grupo);
        this.servido = { ...this.platoEnMano, pos: this.dejar.clone(), comido: false };
        this.platoEnMano = null;
        this.modelo.apuntar = false;
        this.ui.toast('Lourdes: "¡Buen provecho!"', 'ok');
        this.camino = this.caminoVuelta();
        this.estado = 'volviendo';
      }
    } else if (this.estado === 'volviendo') {
      if (this.caminar(dt)) this.sentarse();
    }
  }
}
