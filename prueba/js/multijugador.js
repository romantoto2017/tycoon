import * as THREE from 'three';
import { crearPersonaje } from './personaje.js';
import { cargarCabeza, crearEtiqueta } from './texturas.js';
import { vestido } from './vestir.js';
import { PERSONAJES } from '../data/personajes.js';
import { ITEMS } from './progresion.js';
import { Lote } from './lote.js';
import { Auto, AutoComprado, AUTOS_POR_ID } from './auto.js';
import { Helicoptero } from './helicoptero.js';
import { CAMIONETA } from './tanzania.js';
import { crearPony } from './pony.js';
import { DX, SLOT, LOTES, loteLocal, MANSION, CANCHA, BARRIO, ALTO_PISO, SPAWN } from './constantes.js';
import { sfx } from './sfx.js';

// Multijugador (con la red de red.js): los otros jugadores (su personaje con su ropa, el
// nombre de usuario y abajo el del personaje), sus mansiones solo por fuera en sus terrenos
// (con el patio, la cancha y el garage, pero sin entrar a la casa), el podio en el cielo con
// los 3 de la mansión más avanzada y la puerta láser (si la compraron, el que la toca se muere
// y aparece en la última cama en la que durmió, o en su mansión).
const ENVIO_POS = 0.25; // segundos entre posiciones (solo si te moviste)
const ENVIO_INFO = 3;
const SIN_NOTICIAS = 20; // segundos sin posición: se lo deja de mostrar
const PIEZAS_POR_CUADRO = 6; // las mansiones de los demás se arman de a poco (no traba)
const PODIO = { y: 175, z: -190, escala: 3.2 };
const MODOS = { pie: 0, auto: 1, pony: 2, heli: 3 };
// El modelo del auto que maneja el otro (c: id del auto; sin id, el Auto Deportivo).
const defAuto = (c) => (c === 'camioneta' ? CAMIONETA : AUTOS_POR_ID[c]) || null;

// Lo que se ve por fuera de una mansión (sin muebles, cuadros ni paredes de adentro).
const AFUERA = ITEMS.filter((it) => it.tipo === 'construccion' && it.construir && !it.mueble
  && !/^(paredes_int|cuadro|obra|lujo_piano|lujo_nico_carton|tp_ciudad|perro_|parrilla)/.test(it.id)); // la parrilla va al lado de lo de Lourdes: cada uno ve solo la suya

const nombrePj = (id) => PERSONAJES.find((p) => p.id === id)?.nombre || '';
const adentroDeCasa = (x, z, centro) => x > centro + MANSION.x0 - 0.5 && x < centro + MANSION.x1 + 0.5 && z > MANSION.z0 - 0.5 && z < MANSION.z1 + 0.5;

// Un muñeco de otro jugador (o del podio).
async function armarMuneco(info) {
  const p = PERSONAJES.find((x) => x.id === info.personaje) || PERSONAJES[0];
  const m = crearPersonaje(p, await cargarCabeza(p), await vestido(info.ropa || null));
  m.grupo.scale.setScalar(p.alto || 1);
  return m;
}

// ---------- Otro jugador ----------
class Otro {
  constructor(mj, uid) {
    this.mj = mj;
    this.uid = uid;
    this.info = {};
    this.pos = null; // la última recibida (en coordenadas locales)
    this.actual = null;
    this.modelo = null;
    this.clave = '';
    this.grupo = new THREE.Group();
    this.grupo.visible = false;
    mj.escena.add(this.grupo);
    this.etiqueta = crearEtiqueta([{ texto: ' ', tam: 60 }], 6);
    this.etiqueta.sprite.position.y = 7.4;
    this.grupo.add(this.etiqueta.sprite);
    this.auto = null;
    this.pony = null;
    // Globo con lo último que dijo en el chat.
    this.globo = crearEtiqueta([{ texto: ' ', tam: 52 }], 9);
    this.globo.sprite.position.y = 9.4;
    this.globo.sprite.visible = false;
    this.grupo.add(this.globo.sprite);
    this.tGlobo = 0;
  }

  hablar(texto) {
    this.globo.actualizar([{ texto: texto.length > 42 ? `${texto.slice(0, 40)}…` : texto, tam: 52, color: '#ffffff' }]);
    this.globo.sprite.visible = true;
    this.tGlobo = 6;
  }

  async ponerInfo(info) {
    this.info = info;
    const clave = `${info.personaje}|${JSON.stringify(info.ropa || null)}|${info.nombre}`;
    if (clave === this.clave) return;
    this.clave = clave;
    this.etiqueta.actualizar([{ texto: info.nombre || 'Alguien', tam: 60, color: '#ffffff' }, { texto: nombrePj(info.personaje), tam: 44, color: '#ffd23f' }]);
    const m = await armarMuneco(info);
    if (this.clave !== clave) return; // cambió mientras cargaba
    if (this.modelo) { this.grupo.remove(this.modelo.grupo); this.modelo.liberar(); }
    this.modelo = m;
    this.grupo.add(m.grupo);
  }

  ponerPos(p) {
    if (!p) { this.pos = null; return; }
    this.pos = { x: p.x + DX, y: p.y, z: p.z, a: p.a || 0, v: p.v || 0, m: p.m || 0, c: p.c || '', t: performance.now() };
    if (!this.actual) this.actual = { ...this.pos };
  }

  actualizar(dt) {
    if (this.tGlobo > 0 && (this.tGlobo -= dt) <= 0) this.globo.sprite.visible = false;
    const p = this.pos;
    const vivo = p && this.info.enLinea !== false && performance.now() - p.t < SIN_NOTICIAS * 1000;
    // Adentro de su propia mansión no se ve (los demás no entran a las casas ajenas).
    const casa = this.info.slot != null ? loteLocal(this.info.slot) : null;
    const tapado = vivo && casa !== null && this.info.slot !== SLOT && adentroDeCasa(p.x, p.z, casa) && p.y < ALTO_PISO * 5;
    const ver = vivo && !tapado && this.modelo;
    this.grupo.visible = !!ver;
    if (this.auto) this.auto.grupo.visible = !!ver && p.m === MODOS.auto;
    if (this.heli) this.heli.grupo.visible = !!ver && p.m === MODOS.heli;
    if (this.pony) this.pony.grupo.visible = !!ver && p.m === MODOS.pony;
    if (!ver) return;
    const a = this.actual;
    const k = Math.min(1, dt * 8);
    a.x += (p.x - a.x) * k;
    a.y += (p.y - a.y) * k;
    a.z += (p.z - a.z) * k;
    let d = p.a - a.a;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    a.a += d * k;
    const g = this.grupo;
    g.position.set(a.x, a.y, a.z);
    g.rotation.y = a.a;
    const m = this.modelo;
    if (p.m === MODOS.heli) {
      // En el helicóptero: el helicóptero con las aspas girando, y él adentro (no se ve).
      if (!this.heli) this.heli = new Helicoptero(this.mj.escena, a.x, a.y, a.z, a.a);
      this.heli.pos.set(a.x, a.y, a.z);
      this.heli.angulo = a.a;
      this.heli.rotor.rotation.y += 20 * dt;
      this.heli.rotorCola.rotation.x += 30 * dt;
      this.heli.colocar();
      m.grupo.visible = false;
      this.etiqueta.sprite.position.y = 9;
      return;
    }
    if (p.m === MODOS.auto) {
      // El mismo auto que maneja (el del concesionario, la camioneta o el Deportivo).
      if (this.auto && this.autoDe !== p.c) { this.mj.escena.remove(this.auto.grupo); this.auto = null; }
      if (!this.auto) {
        const def = defAuto(p.c);
        this.auto = def ? new AutoComprado(this.mj.escena, def, a.x, a.z, a.a) : new Auto(this.mj.escena, a.x, a.z, a.a);
        this.autoDe = p.c;
      }
      this.auto.pos.set(a.x, a.y, a.z);
      this.auto.angulo = a.a;
      this.auto.colocar();
      m.grupo.visible = false;
      this.etiqueta.sprite.position.y = 6;
      return;
    }
    m.grupo.visible = true;
    this.etiqueta.sprite.position.y = 7.4 + (p.m === MODOS.pony ? 1.2 : 0);
    if (p.m === MODOS.pony) {
      if (!this.pony) { this.pony = crearPony(); this.mj.escena.add(this.pony.grupo); }
      this.pony.grupo.position.set(a.x, a.y, a.z);
      this.pony.grupo.rotation.y = a.a;
      m.animar(dt, p.v, true, false, true);
      m.grupo.position.y = 1.15;
      m.partes.piernaI.muslo.rotation.z = -0.32;
      m.partes.piernaD.muslo.rotation.z = 0.32;
    } else {
      m.grupo.position.y = 0;
      m.partes.piernaI.muslo.rotation.z = 0;
      m.partes.piernaD.muslo.rotation.z = 0;
      m.animar(dt, p.v, p.y < 0.6 || Math.abs(p.y - a.y) < 0.4);
    }
  }

  sacar() {
    this.mj.escena.remove(this.grupo);
    if (this.auto) this.mj.escena.remove(this.auto.grupo);
    if (this.pony) this.mj.escena.remove(this.pony.grupo);
    if (this.heli) this.mj.escena.remove(this.heli.grupo);
  }
}

// ---------- La mansión de otro (solo por fuera) ----------
class CasaAjena {
  constructor(mj, uid) {
    this.mj = mj;
    this.uid = uid;
    this.clave = '';
    this.grupo = null;
    this.lote = null;
    this.cajas = [];
    this.laser = null;
    this.pelota = null;
    this.cola = [];
  }

  armar(info) {
    const clave = `${info.slot}|${info.compras || ''}`;
    if (clave === this.clave) return;
    this.clave = clave;
    this.desarmar();
    const compras = new Set((info.compras || '').split(',').filter(Boolean));
    const x0 = loteLocal(info.slot);
    this.x0 = x0;
    this.grupo = new THREE.Group();
    this.grupo.position.x = x0;
    this.mj.escena.add(this.grupo);
    this.lote = new Lote(this.mj.escena);
    this.cola = AFUERA.filter((it) => compras.has(it.id));
    this.compras = compras;
    // Cartel con el dueño, arriba de la entrada.
    this.cartel = crearEtiqueta([{ texto: `Mansión de ${info.nombre || '?'}`, tam: 64, color: '#ffd23f' }], 26);
    this.cartel.sprite.position.set(x0, 22 + ALTO_PISO * Math.min(4, ['piso_1', 'piso_2', 'piso_3', 'techo'].filter((id) => compras.has(id)).length), 12);
    this.mj.escena.add(this.cartel.sprite);
    // No se puede entrar a la casa: un bloque invisible del tamaño de la mansión.
    if (compras.has('piso_pb')) {
      const pisos = 1 + ['piso_1', 'piso_2', 'piso_3', 'techo'].filter((id) => compras.has(id)).length;
      this.agregarCaja(new THREE.Box3(new THREE.Vector3(x0 + MANSION.x0 - 0.3, 0, MANSION.z0 - 0.3), new THREE.Vector3(x0 + MANSION.x1 + 0.3, pisos * ALTO_PISO + 1, MANSION.z1 + 0.3)));
    }
    if (compras.has('puerta_laser')) this.laser = new THREE.Box3(new THREE.Vector3(x0 - 5.6, 0, MANSION.z1 - 0.2), new THREE.Vector3(x0 + 5.6, 7.6, MANSION.z1 + 2.6));
    if (compras.has('cancha')) this.crearPelota();
  }

  agregarCaja(b) {
    this.cajas.push(b);
    this.mj.colisiones.push(b);
  }

  // Arma unas piezas por cuadro.
  avanzar() {
    if (!this.cola.length || !this.grupo) return;
    this.grupo.updateMatrixWorld(true);
    const kit = this.mj.kit;
    const antes = [kit.alCama, kit.alRopero, kit.alArcade];
    kit.alCama = kit.alRopero = kit.alArcade = null; // las camas y roperos ajenos no son tuyos
    for (let i = 0; i < PIEZAS_POR_CUADRO && this.cola.length; i++) {
      const it = this.cola.shift();
      const g = new THREE.Group();
      try { it.construir(kit, g); } catch (e) { console.warn('casa ajena', it.id, e); continue; }
      this.grupo.add(g);
      g.updateMatrixWorld(true);
      g.traverse((o) => {
        if (!o.isMesh || o.userData.noSolido) return;
        const b = new THREE.Box3().setFromObject(o);
        if (it.muebles) b.camara = false;
        this.agregarCaja(b);
      });
      this.lote.absorber(g);
    }
    [kit.alCama, kit.alRopero, kit.alArcade] = antes;
  }

  crearPelota() {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.9, 14, 10), new THREE.MeshLambertMaterial({ color: '#fafafa' }));
    const cx = this.x0 + (CANCHA.x0 + CANCHA.x1) / 2;
    const cz = (CANCHA.z0 + CANCHA.z1) / 2;
    m.position.set(cx, 0.9, cz);
    this.mj.escena.add(m);
    this.pelota = { m, vel: new THREE.Vector3(), cx, cz };
  }

  // La pelota de su cancha (como la tuya: tycoon.js), para jugar en el patio ajeno.
  actualizarPelota(dt, jugador) {
    const p = this.pelota;
    if (!p) return;
    const b = p.m.position;
    if (Math.abs(jugador.pos.x - b.x) > 80) return;
    const dx = b.x - jugador.pos.x;
    const dz = b.z - jugador.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 1.8 && jugador.pos.y < b.y + 1) {
      const fuerza = 10 + Math.hypot(jugador.vel.x, jugador.vel.z) * 0.6;
      p.vel.set((dx / (d || 1)) * fuerza, 5, (dz / (d || 1)) * fuerza);
    }
    p.vel.y -= 30 * dt;
    b.addScaledVector(p.vel, dt);
    if (b.y < 0.9) {
      b.y = 0.9;
      p.vel.y = Math.abs(p.vel.y) > 2 ? -p.vel.y * 0.5 : 0;
      p.vel.x *= 1 - dt * 1.2;
      p.vel.z *= 1 - dt * 1.2;
    }
    const x0 = this.x0 + CANCHA.x0;
    const x1 = this.x0 + CANCHA.x1;
    if (b.x < x0 + 0.9 || b.x > x1 - 0.9) { b.x = THREE.MathUtils.clamp(b.x, x0 + 0.9, x1 - 0.9); p.vel.x *= -0.7; }
    if (b.z < CANCHA.z0 + 0.9 || b.z > CANCHA.z1 - 0.9) {
      if (Math.abs(b.x - p.cx) < 3 && b.y < 3.2) {
        sfx.gol();
        this.mj.ui.toast('¡¡GOOOOL!!', 'plata');
        b.set(p.cx, 4, p.cz);
        p.vel.set(0, 0, 0);
      } else {
        b.z = THREE.MathUtils.clamp(b.z, CANCHA.z0 + 0.9, CANCHA.z1 - 0.9);
        p.vel.z *= -0.7;
      }
    }
    p.m.rotation.x += p.vel.z * dt;
    p.m.rotation.z -= p.vel.x * dt;
  }

  desarmar() {
    const e = this.mj.escena;
    if (this.grupo) e.remove(this.grupo);
    if (this.lote) for (const x of this.lote.grupos.values()) if (x.malla) { e.remove(x.malla); x.malla.dispose(); }
    if (this.cartel) e.remove(this.cartel.sprite);
    if (this.pelota) e.remove(this.pelota.m);
    const c = this.mj.colisiones;
    for (const b of this.cajas) { const i = c.indexOf(b); if (i >= 0) c.splice(i, 1); }
    this.cajas = [];
    this.grupo = this.lote = this.cartel = this.pelota = this.laser = null;
    this.cola = [];
  }
}

// ---------- Podio en el cielo ----------
class Podio {
  constructor(mj) {
    this.mj = mj;
    this.grupo = new THREE.Group();
    mj.escena.add(this.grupo);
    const sinNiebla = (c) => new THREE.MeshLambertMaterial({ color: c, fog: false, emissive: c, emissiveIntensity: 0.25 });
    // Escalones: 2° a la izquierda, 1° en el medio (más alto), 3° a la derecha.
    this.lugares = [[0, 9, '#ffcf3f', '1'], [-12, 6, '#d6dde5', '2'], [12, 4, '#d9894a', '3']].map(([x, alto, color, n]) => {
      const bloque = new THREE.Mesh(new THREE.BoxGeometry(11, alto, 9), sinNiebla(color));
      bloque.position.set(x, alto / 2, 0);
      this.grupo.add(bloque);
      const numero = crearEtiqueta([{ texto: n, tam: 120, color: '#ffffff' }], 7);
      numero.sprite.position.set(x, alto / 2, 4.8);
      numero.sprite.material.fog = false;
      this.grupo.add(numero.sprite);
      const etq = crearEtiqueta([{ texto: ' ', tam: 60 }], 22);
      etq.sprite.position.set(x, alto + 20, 0);
      etq.sprite.material.fog = false;
      this.grupo.add(etq.sprite);
      return { x, alto, etq, uid: null, clave: '', modelo: null };
    });
    const titulo = crearEtiqueta([{ texto: 'TOP MANSIONES', tam: 90, color: '#ffd23f' }], 44);
    titulo.sprite.position.set(0, 42, 0);
    titulo.sprite.material.fog = false;
    this.grupo.add(titulo.sprite);
    this.grupo.traverse((o) => { o.renderOrder = 2; });
    this.grupo.scale.setScalar(PODIO.escala);
  }

  async poner(top) {
    for (let i = 0; i < 3; i++) {
      const l = this.lugares[i];
      const j = top[i];
      const texto = j ? [{ texto: j.nombre || '?', tam: 64, color: '#ffffff' }, { texto: `${nombrePj(j.personaje)} · ${Math.round((j.progreso || 0) * 100)}%`, tam: 48, color: '#8dff6a' }] : [{ texto: ' ', tam: 60 }];
      const clave = j ? `${j.uid}|${j.personaje}|${JSON.stringify(j.ropa || null)}` : '';
      l.etq.actualizar(texto);
      if (clave === l.clave) continue;
      l.clave = clave;
      if (l.modelo) { this.grupo.remove(l.modelo.grupo); l.modelo.liberar(); l.modelo = null; }
      if (!j) continue;
      const m = await armarMuneco(j);
      if (l.clave !== clave) continue;
      m.grupo.scale.multiplyScalar(2.6);
      m.grupo.position.set(l.x, l.alto, 0);
      m.grupo.traverse((o) => { if (o.material) for (const mm of [].concat(o.material)) mm.fog = false; });
      this.grupo.add(m.grupo);
      l.modelo = m;
    }
  }

  // Siempre en el cielo de atrás de las mansiones, a la altura de donde estás (dentro del barrio).
  actualizar(camara, t) {
    const x = THREE.MathUtils.clamp(camara.position.x, BARRIO.x0 + 80, BARRIO.x1 - 80);
    this.grupo.position.set(x, PODIO.y + Math.sin(t * 0.5) * 1.2, PODIO.z);
    this.grupo.visible = Math.abs(camara.position.x - x) < 600;
    for (const l of this.lugares) if (l.modelo) { l.modelo.grupo.rotation.y = Math.sin(t * 0.4 + l.x) * 0.25; }
  }
}

export class Multijugador {
  constructor({ escena, colisiones, estado, jugador, tycoon, ui, red, uid, nombre, camara }) {
    this.escena = escena;
    this.colisiones = colisiones;
    this.estado = estado;
    this.jugador = jugador;
    this.tycoon = tycoon;
    this.kit = tycoon.kit;
    this.ui = ui;
    this.red = red;
    this.uid = uid;
    this.nombre = nombre;
    this.camara = camara;
    this.otros = new Map();
    this.casas = new Map();
    this.jugadores = {};
    this.podio = new Podio(this);
    this.relojPos = 0;
    this.relojInfo = ENVIO_INFO;
    this.ultimaInfo = '';
    this.ultimaPos = '';
    this.muriendo = 0;
    this.alMorir = null; // main.js
    this.t = 0;
    red.enLinea(uid, nombre);
    // Si entraste con esta cuenta desde otro lado (la app), esta sesión se recarga y ya no entra.
    red.alMovido(uid, () => location.reload());
    red.alJugadores((js) => this.recibirJugadores(js));
    // Te pegó Bauti trabado: volás al cielo (main.js: alGolpe).
    this.golpeVisto = Date.now();
    red.alGolpe(uid, (g) => { if (g.t > this.golpeVisto) { this.golpeVisto = g.t; this.alGolpe?.(g); } });
    red.alPosiciones((id, p) => {
      if (id === uid) return;
      this.otro(id).ponerPos(p);
    });
  }

  // ---------- Golpe de Bauti trabado ----------
  // El otro jugador (a pie) más cerca, a menos de 4.
  cercano(pos) {
    let mejor = null;
    let dm = 4;
    for (const o of this.otros.values()) {
      const a = o.actual;
      if (!o.grupo.visible || !a || a.m) continue;
      const d = Math.hypot(a.x - pos.x, a.z - pos.z);
      if (d < dm && Math.abs(a.y - pos.y) < 3) { dm = d; mejor = o; }
    }
    return mejor;
  }

  // Te escapaste del COMCAR: los otros jugadores presos (conectados) se van con vos.
  fugar() {
    for (const [id, i] of Object.entries(this.jugadores)) if (id !== this.uid && i.preso && i.enLinea) this.red.golpe(id, { tipo: 'fuga', de: this.uid, nombre: this.nombre, t: Date.now() });
  }

  pegar(o) { this.red.golpe(o.uid, { de: this.uid, nombre: this.nombre, t: Date.now() }); }

  // ---------- Chat (sin censura: lo que escribís es lo que ven todos) ----------
  enviarChat(texto) {
    this.red.chat({ uid: this.uid, nombre: this.nombre, texto: texto.slice(0, 200), t: Date.now() });
  }

  // cb({ uid, nombre, texto, t, mio }) por cada mensaje (los últimos y los que llegan).
  alChat(cb) {
    this.red.alChat((d) => {
      if (!d || !d.texto) return;
      if (d.uid !== this.uid && this.otros.has(d.uid) && Date.now() - (d.t || 0) < 15000) this.otros.get(d.uid).hablar(d.texto);
      cb({ ...d, mio: d.uid === this.uid });
    });
  }

  otro(id) {
    if (!this.otros.has(id)) this.otros.set(id, new Otro(this, id));
    return this.otros.get(id);
  }

  recibirJugadores(js) {
    this.jugadores = js;
    // "Fulanito se unió": cuando alguien pasa a estar conectado (no por los que ya estaban al entrar vos).
    const primera = !this.enLineaAntes;
    this.enLineaAntes ??= {};
    for (const [id, info] of Object.entries(js)) {
      if (id === this.uid) continue;
      const ahora = info.enLinea === true;
      if (!primera && ahora && !this.enLineaAntes[id] && info.nombre) this.alUnirse?.(info.nombre);
      this.enLineaAntes[id] = ahora;
    }
    this.alConectados?.(Object.entries(js).filter(([id, i]) => id === this.uid || i.enLinea === true).map(([id, i]) => (id === this.uid ? this.nombre : i.nombre) || '?'));
    for (const [id, info] of Object.entries(js)) {
      if (id === this.uid || info.slot == null) continue;
      this.otro(id).ponerInfo(info);
      if (!this.casas.has(id)) this.casas.set(id, new CasaAjena(this, id));
      if (info.slot !== SLOT) this.casas.get(id).armar(info);
    }
    this.actualizarPodio();
  }

  // Los 3 de la mansión más avanzada (vos incluido, con lo de ahora).
  actualizarPodio() {
    const yo = { uid: this.uid, ...this.miInfo() };
    const todos = [yo, ...Object.entries(this.jugadores).filter(([id]) => id !== this.uid).map(([id, j]) => ({ uid: id, ...j }))];
    const top = todos.filter((j) => j.personaje).sort((a, b) => (b.progreso || 0) - (a.progreso || 0)).slice(0, 3);
    const clave = top.map((j) => `${j.uid}:${Math.round((j.progreso || 0) * 100)}:${j.personaje}`).join('|');
    if (clave === this.clavePodio) return;
    this.clavePodio = clave;
    this.podio.poner(top);
  }

  miInfo() {
    const e = this.estado;
    return {
      nombre: this.nombre,
      personaje: e.personaje || null,
      slot: SLOT,
      progreso: Math.round((this.tycoon.progreso || 0) * 1000) / 1000,
      compras: e.compras.join(','),
      ropa: (e.personaje && e.vestuario?.[e.personaje]) || null,
      preso: !!e.carcel,
    };
  }

  // Tocaste una puerta láser ajena: te morís y aparecés en tu última cama (o en tu mansión).
  revisarLaser() {
    const p = this.jugador.pos;
    for (const [id, c] of this.casas) {
      if (!c.laser || !c.laser.containsPoint(new THREE.Vector3(p.x, p.y + 1, p.z))) continue;
      this.muriendo = 1.6;
      sfx.robo();
      const dueno = this.jugadores[id]?.nombre || 'alguien';
      this.ui.aviso(`¡Te mató la puerta láser de ${dueno}!`, 'error');
      this.alMorir?.('muere');
      return;
    }
  }

  reaparecer() {
    const cama = this.estado.ultimaCama;
    const j = this.jugador;
    if (cama) j.pos.set(cama.x + 2.6, cama.y + 0.1, cama.z);
    else j.pos.set(SPAWN.x, 0.2, SPAWN.z);
    j.vel.set(0, 0, 0);
    this.ui.aviso(null);
    this.ui.toast(cama ? 'Apareciste en la última cama en la que dormiste' : 'Apareciste en tu mansión', 'info');
    this.alMorir?.('aparece');
  }

  // modo: 'pie' | 'auto' | 'pony' | 'heli'; vehiculo: el auto o el helicóptero que manejás (o null).
  actualizar(dt, { modo = 'pie', vehiculo = null } = {}) {
    this.t += dt;
    // Mandar dónde estás (en coordenadas compartidas) y, más de vez en cuando, tu info.
    this.relojPos -= dt;
    if (this.relojPos <= 0) {
      this.relojPos = ENVIO_POS;
      const j = this.jugador;
      const x = vehiculo ? vehiculo.pos.x : j.pos.x;
      const z = vehiculo ? vehiculo.pos.z : j.pos.z;
      const a = vehiculo ? vehiculo.angulo : j.angulo;
      const v = vehiculo ? (typeof vehiculo.vel === 'number' ? Math.abs(vehiculo.vel) : Math.hypot(vehiculo.vel.x, vehiculo.vel.z)) : Math.hypot(j.vel.x, j.vel.z);
      const y = vehiculo ? vehiculo.pos.y || 0 : j.pos.y;
      const pos = { x: Math.round((x - DX) * 10) / 10, y: Math.round(y * 10) / 10, z: Math.round(z * 10) / 10, a: Math.round(a * 100) / 100, v: Math.round(v), m: MODOS[modo] || 0, c: modo === 'auto' ? vehiculo?.def?.id || '' : '' };
      const clave = JSON.stringify(pos);
      if (clave !== this.ultimaPos || this.t - (this.tPos || 0) > 5) {
        this.ultimaPos = clave;
        this.tPos = this.t;
        this.red.pos(this.uid, { ...pos, t: Date.now() });
      }
    }
    this.relojInfo -= dt;
    if (this.relojInfo <= 0) {
      this.relojInfo = ENVIO_INFO;
      const info = this.miInfo();
      const clave = JSON.stringify(info);
      if (clave !== this.ultimaInfo) {
        this.ultimaInfo = clave;
        this.red.info(this.uid, { ...info, enLinea: true, visto: Date.now() });
      }
      this.actualizarPodio();
    }
    for (const o of this.otros.values()) o.actualizar(dt);
    for (const c of this.casas.values()) { c.avanzar(); c.actualizarPelota(dt, this.jugador); }
    this.podio.actualizar(this.camara, this.t);
    // Puerta láser.
    if (this.muriendo > 0) {
      this.muriendo -= dt;
      if (this.muriendo <= 0) this.reaparecer();
    } else if (modo === 'pie' || modo === 'pony') this.revisarLaser();
  }
}

export { LOTES };
