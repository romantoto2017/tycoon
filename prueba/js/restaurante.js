import * as THREE from 'three';
import { crearPersonaje } from './personaje.js';
import { cargarCabeza, crearEtiqueta } from './texturas.js';
import { RESTO as R, RESTO_MICROONDAS, RESTO_LOURDES } from './constantes.js';
import { PISO_RESTO as F, PLATOS, asientos } from './resto.js';
import { caja, mat } from './util.js';
import { sfx, setRadio } from './sfx.js';

// Lourdes atiende el restaurante: está sentada en su mesita con la radio. Le pedís comida
// (una vez por visita), la calienta en un microondas y te la lleva a la mesa con un vaso de
// agua: si estás sentado, a tu lugar; si no, a una silla cualquiera y te tenés que sentar
// ahí para comer. No se paga. Mientras estás adentro suena su radio.
export const LOURDES = {
  id: 'lourdes', nombre: 'Lourdes', foto: 'lourdes_juego.jpeg', // ya recortada con los ojos en los lentes (herramientas/lourdes_cara.py)
  piel: '#5a3726', pelo: '#16110e', peinado: 'liso', cuerpo: 'gordo',
  remera: '#f4f4f2', pantalon: '#ecebe7', lentes: '#3b2a20', colita: true, cuello: '#1d1d22', aros: true,
};
const VEL = 7;
// Recorridos de Lourdes (pasillos libres entre las mesas).
const PASILLO_X = R.x0 + 28.5; // entre la última columna de mesas y su rincón
const FONDO_Z = R.z0 + 5.5; // delante de los microondas
const FRENTE_Z = R.z0 + 23.1; // delante de la fila de mesas de adelante
const MICRO = { x: RESTO_MICROONDAS[3], z: R.z0 + 3.6 };
const PARADA = { x: RESTO_LOURDES.silla[0], z: RESTO_LOURDES.silla[1] - 2.9 }; // al lado de su silla
const MICRO_PUERTA = { x: MICRO.x, y: F + 3.05, z: R.z0 + R.pared + 1.7 };
const AL_COSTADO = 3.1; // sirve parada en la punta de la mesa, sin meterse en el mantel
const EN_MANOS = { y: 4.33, z: 1.8 }; // el plato apoyado en las manos (pose "llevar")
const ASIENTOS = asientos();

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
  return { grupo: g, comida, vaso };
}

export class Restaurante {
  constructor(escena, tycoon, ui) {
    this.escena = escena;
    this.tycoon = tycoon;
    this.ui = ui;
    this.estado = 'nada';
    this.pedido = false; // ya pidió en esta visita
    this.servido = null; // { grupo, comida, vaso, asiento, comido }
    this.asiento = null; // dónde está sentado el jugador
    this.adentro = false;
    this.luz = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.55, 0.05), new THREE.MeshBasicMaterial({ color: '#ffd27a' }));
    this.luz.position.set(MICRO_PUERTA.x, MICRO_PUERTA.y, MICRO_PUERTA.z);
    this.luz.visible = false;
    escena.add(this.luz);
    // Flecha que marca la silla donde quedó la comida (si no estabas sentado).
    this.flecha = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.9, 4), mat('#ffd23f'));
    this.flecha.rotation.x = Math.PI;
    this.flecha.visible = false;
    escena.add(this.flecha);
  }

  hayLourdes() {
    return this.tycoon.restoAbierto;
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

  // Silla libre más cercana (a menos de 2,4), o null.
  sillaCerca(jugador) {
    let mejor = null;
    let dMejor = 2.4;
    for (const a of ASIENTOS) {
      const d = Math.hypot(jugador.pos.x - a.x, jugador.pos.z - a.z);
      if (d < dMejor && Math.abs(jugador.pos.y - F) < 2) { mejor = a; dMejor = d; }
    }
    return mejor;
  }

  // ---------- El jugador sentado ----------

  sentarJugador(jugador, a) {
    this.asiento = a;
    jugador.vel.set(0, 0, 0);
    jugador.agachado = false;
    this.sostener(0, jugador);
  }

  // Lo deja quieto en la silla, mirando a la mesa (main.js lo llama en vez de mover al jugador).
  sostener(dt, jugador) {
    const a = this.asiento;
    const p = jugador.pos;
    p.set(a.x + Math.sin(a.angulo) * 0.15, F - 0.45, a.z + Math.cos(a.angulo) * 0.15);
    jugador.angulo = a.angulo;
    jugador.enSuelo = true;
    jugador.suelo = F;
    jugador.contenedor.position.copy(p);
    jugador.contenedor.rotation.y = a.angulo;
    jugador.sombra.position.set(p.x, F + 0.06, p.z);
    jugador.modelo?.animar(dt, 0, true, false, true);
  }

  levantar(jugador) {
    const a = this.asiento;
    if (!a) return;
    this.asiento = null;
    // Queda parado detrás de la silla.
    jugador.pos.set(a.x - Math.sin(a.angulo) * 1.3, F, a.z - Math.cos(a.angulo) * 1.3);
  }

  // Texto del botón de acción, o '' si no hay nada que hacer acá.
  accion(jugador) {
    if (!this.modelo || !this.adentro) return '';
    if (this.asiento) {
      if (this.servido && !this.servido.comido && this.servido.asiento === this.asiento) return 'Comer (E)';
      return 'Levantarse (E)';
    }
    if (!this.pedido && this.cercaDeLourdes(jugador)) return 'Pedir comida (E)';
    if (this.sillaCerca(jugador)) return 'Sentarse (E)';
    return '';
  }

  // Lo que pasa al apretar la acción. Devuelve 'menu' si hay que mostrar el menú.
  hacer(jugador) {
    const t = this.accion(jugador);
    if (t.startsWith('Comer')) {
      this.servido.comido = true;
      this.servido.comida.visible = false;
      this.servido.vaso.children[1].visible = false;
      sfx.comer();
      this.ui.toast('¡Riquísimo! Gracias, Lourdes', 'ok');
    } else if (t.startsWith('Levantarse')) {
      this.levantar(jugador);
    } else if (t.startsWith('Sentarse')) {
      this.sentarJugador(jugador, this.sillaCerca(jugador));
    }
    return t.startsWith('Pedir') ? 'menu' : '';
  }

  pedir(idPlato) {
    if (this.pedido || this.estado !== 'sentada') return;
    this.pedido = true;
    this.platoPedido = idPlato;
    const nombre = PLATOS.find((p) => p.id === idPlato)?.nombre || 'la comida';
    this.ui.toast(`Lourdes: "¡Ya te caliento ${nombre.toLowerCase()}! Sentate que te lo llevo"`, 'info');
    this.modelo.grupo.position.y = F;
    this.camino = [v(PARADA.x, PARADA.z), v(PASILLO_X, FRENTE_Z - 1), v(PASILLO_X, FONDO_Z), v(MICRO.x, FONDO_Z), v(MICRO.x, MICRO.z)];
    this.estado = 'yendo_micro';
  }

  // Elige adónde lleva el plato: a tu silla si estás sentado; si no, a una cualquiera.
  caminoMesa() {
    const a = this.asiento || ASIENTOS[Math.floor(Math.random() * ASIENTOS.length)];
    this.destino = a;
    this.paradaMesa = v(a.mesa[0] + Math.sign(a.dx) * AL_COSTADO, a.plato[1]);
    return [v(MICRO.x, FONDO_Z), v(this.paradaMesa.x, FONDO_Z), this.paradaMesa.clone()];
  }

  caminoVuelta() {
    return [v(this.paradaMesa.x, FRENTE_Z), v(PASILLO_X, FRENTE_Z), v(PARADA.x, PARADA.z)];
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

  // Deja el plato en la mesa, delante de la silla, con el vaso del lado de adentro.
  servir() {
    const a = this.destino;
    const p = this.platoEnMano;
    this.modelo.grupo.remove(p.grupo);
    p.grupo.position.set(a.plato[0], F + 2.32, a.plato[1]);
    p.grupo.rotation.y = 0;
    p.vaso.position.set(-Math.sign(a.dx) * 0.8, 0, -a.lado * 0.2);
    this.escena.add(p.grupo);
    this.servido = { ...p, asiento: a, comido: false };
    this.platoEnMano = null;
    this.modelo.llevar = false;
    if (this.asiento === a) this.ui.toast('Lourdes: "¡Buen provecho!"', 'ok');
    else this.ui.toast('Lourdes: "Te lo dejé en esa mesa, sentate ahí para comer"', 'info');
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
    // Flecha arriba de la comida mientras no estés sentado ahí.
    const s = this.servido;
    this.flecha.visible = !!s && !s.comido && this.asiento !== s.asiento;
    if (this.flecha.visible) {
      this.reloj = (this.reloj || 0) + dt;
      this.flecha.position.set(s.asiento.x, F + 4.2 + Math.sin(this.reloj * 4) * 0.25, s.asiento.z);
      this.flecha.rotation.y += dt * 2;
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
        // Lo lleva apoyado en las manos, con el vaso arriba del plato del lado de ella.
        this.platoEnMano = plato(this.platoPedido);
        this.platoEnMano.grupo.position.set(0, EN_MANOS.y, EN_MANOS.z);
        this.platoEnMano.vaso.position.set(0, 0.06, -0.42);
        g.add(this.platoEnMano.grupo);
        this.modelo.llevar = true;
        this.camino = this.caminoMesa();
        this.estado = 'llevando';
      }
    } else if (this.estado === 'llevando') {
      if (this.caminar(dt)) {
        this.mirar(this.destino.mesa[0], this.paradaMesa.z, 1);
        this.servir();
        this.camino = this.caminoVuelta();
        this.estado = 'volviendo';
      }
    } else if (this.estado === 'volviendo') {
      if (this.caminar(dt)) this.sentarse();
    }
  }
}
