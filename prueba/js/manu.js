import * as THREE from 'three';
import { crearPersonaje } from './personaje.js';
import { cargarCabeza, crearEtiqueta } from './texturas.js';
import { crearAK } from './arma.js';
import { CALLE_Z, COBRAR, TERRENO as T, AUTOS_DESDE } from './constantes.js';
import { Paseante } from './dufre.js';
import { SCHWEPA } from './ladron.js';
import { caja, formato } from './util.js';
import { sfx } from './sfx.js';

// ---------- Manu Mendez ----------
// Morocho, pelo corto con rulos, alto y medio gordito (menos que Bauti), con la remera gris de
// rayas (herramientas/manu.py). Solo, pasea como Dufre (vereda de la mansión o plaza de la
// ciudad, Paseante en dufre.js), pero no siempre: 30% de las veces que se tira. Si te ve, te
// dice alguna de las suyas.
export const MANU = {
  id: 'manu', nombre: 'Manu Mendez', foto: 'manu.jpeg', recorte: [0.5, 0.5, 1], piel: '#8a5e48', pelo: '#15100c', peinado: 'rulos', gordura: 0.5,
  remera: '#aaacb0', pantalon: '#3a3d42',
  remeraFotos: { frente: 'ropa/manu_frente.jpg', espalda: 'ropa/manu_espalda.jpg', manga: 'ropa/manu_manga.jpg', tela: 'ropa/manu_tela.jpg' },
};
const ALTO = 1.12;
const FRASES = ['¿Me estás mirando de pesado mano?', 'Vamo a robar al shopin gil', 'Te voy a llenar de plomo pero pa buena'];
const ESTA = 0.3; // probabilidad de que ande por ahí (se vuelve a tirar cada TIRADA)
const TIRADA = 240;

export class Manu extends Paseante {
  constructor(escena, ui) {
    super(escena, ui, MANU);
    this.presente = Math.random() < ESTA;
    this.tirada = TIRADA;
    this.frase = Math.floor(Math.random() * FRASES.length);
  }

  async crear() {
    await super.crear();
    this.modelo.grupo.scale.setScalar(ALTO);
  }

  alHablar() {
    this.hablar(FRASES[this.frase++ % FRASES.length]);
  }

  // oculto: anda con la Schwepa (Banda, abajo), así que solo no está.
  actualizar(dt, jugador, jugando, oculto = false) {
    if ((this.tirada -= dt) <= 0) {
      this.tirada = TIRADA;
      // Aparece o se va solo si no lo estás viendo.
      if (!this.modelo || !this.modelo.grupo.visible || this.distancia(jugador.pos) > 150) this.presente = Math.random() < ESTA;
    }
    const ver = this.presente && !oculto;
    if (this.modelo) this.modelo.grupo.visible = ver;
    if (!ver) return false;
    return super.actualizar(dt, jugador, jugando);
  }
}

// ---------- Manu y la Schwepa, juntos y con un AK-47 cada uno ----------
// - A la mansión (0,5% por minuto, solo si estás en la casa): entran caminando por el portón
//   hasta el cobrador y se llevan todo (lo del cobrador y la plata que tenés). No se los puede
//   parar: el cartel queda hasta que se van.
// - Asaltando un local de la ciudad (5% por minuto mientras andás por la ciudad): la ropa de
//   Lucca Bossio, la verdulería o un auto del concesionario. Un rato apuntando y gritando, y
//   después se van con lo robado (del concesionario, en uno de los autos).
const CADA = 60;
const PROB_CASA = 0.005;
const PROB_LOCAL = 0.05;
const VEL = 8;
const ASALTO = 120; // segundos que dura el asalto a un local
const IDA = [[-150, CALLE_Z - 2], [0, CALLE_Z - 2], [0, 53.5], [-48, 53.5], [-50.5, 34], [COBRAR.x + 1.6, COBRAR.z + 1.6]];
const SALIDA = [[-50.5, 34], [-48, 53.5], [0, 53.5], [0, CALLE_Z - 2], [160, CALLE_Z - 2]];
const GRITOS = {
  ropa: ['¡Todo el buzo en la bolsa, Shaggy!', '¡Quieto o te lleno de plomo!', '¡Dame las Knox gil!'],
  verdu: ['¡Las papas en la bolsa, rápido!', '¡Quieto ahí verdulero!', '¡Dame toda la lechuga!'],
  autos: ['¡Las llaves del auto, gil!', '¡Nadie se mueve!', '¡Esa nave es nuestra!'],
};

function conAK(m) {
  const ak = crearAK();
  ak.position.set(0, -1.9, 0);
  ak.rotation.x = Math.PI / 2;
  m.manoD.add(ak);
  m.apuntar = true;
  return ak;
}

// Lo que se llevan: una pila de ropa o un cajón de verdura (colgado de la mano izquierda).
function botin(tipo) {
  const g = new THREE.Group();
  if (tipo === 'ropa') {
    ['#1d1d22', '#2f5aa8', '#e8e8e8', '#7a1f2b', '#3d3d44'].forEach((c, i) => g.add(caja(1.3, 0.22, 1.0, c, (i % 2) * 0.1, i * 0.22, 0)));
  } else {
    g.add(caja(1.4, 0.6, 1.0, '#a8743f', 0, 0, 0));
    [['#c62828', -0.4], ['#2e7d32', 0], ['#f9a825', 0.4]].forEach(([c, x]) => g.add(caja(0.35, 0.35, 0.35, c, x, 0.42, 0)));
  }
  g.position.set(0, -2.2, 0.5);
  return g;
}

export class Banda {
  constructor({ escena, tycoon, ui, ciudad, lucca, concesionario }) {
    this.escena = escena;
    this.tycoon = tycoon;
    this.ui = ui;
    this.ciudad = ciudad;
    this.lucca = lucca;
    this.concesionario = concesionario;
    this.reloj = 0;
    this.golpe = null; // lo que están haciendo ahora
    this.manu = null;
    this.schwepa = null;
    this.cargando = null;
  }

  get activa() { return !!this.golpe; }
  get enCasa() { return this.golpe?.tipo === 'casa'; }

  cargar() {
    this.cargando ??= (async () => {
      const crear = async (p, nombre, escala) => {
        const m = crearPersonaje(p, await cargarCabeza(p));
        const et = crearEtiqueta([{ texto: nombre, tam: 60, color: '#ff5252' }], 5);
        et.sprite.position.y = 6.6;
        m.grupo.add(et.sprite);
        const globo = crearEtiqueta([{ texto: ' ', tam: 52, color: '#ffffff' }], 7);
        globo.sprite.position.y = 8.2;
        globo.sprite.visible = false;
        m.grupo.add(globo.sprite);
        m.grupo.scale.setScalar(escala);
        m.grupo.visible = false;
        conAK(m);
        this.escena.add(m.grupo);
        return { m, globo, t: 0 };
      };
      this.manu = await crear(MANU, 'Manu Mendez', ALTO);
      this.schwepa = await crear(SCHWEPA, 'Schwepa', 1);
    })();
    return this.cargando;
  }

  ver(v) {
    this.manu.m.grupo.visible = v;
    this.schwepa.m.grupo.visible = v;
  }

  gritar(quien, texto) {
    quien.globo.actualizar([{ texto, tam: 52, color: '#ffffff' }]);
    quien.globo.sprite.visible = true;
    quien.t = 3.5;
  }

  // La Schwepa va al lado de Manu (un poco atrás, a su izquierda), mirando para el mismo lado.
  ubicar(x, y, z, ang) {
    const gm = this.manu.m.grupo;
    const gs = this.schwepa.m.grupo;
    gm.position.set(x, y, z);
    gm.rotation.y = ang;
    gs.position.set(x + Math.cos(ang) * 1.9 - Math.sin(ang) * 1.2, y, z - Math.sin(ang) * 1.9 - Math.cos(ang) * 1.2);
    gs.rotation.y = ang;
  }

  // Camina por golpe.camino; true al llegar al final.
  caminar(dt) {
    const g = this.golpe;
    let resto = VEL * dt;
    while (resto > 0 && g.i < g.camino.length) {
      const [px, pz] = g.camino[g.i];
      const dx = px - g.x;
      const dz = pz - g.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.01) g.ang += Math.atan2(Math.sin(Math.atan2(dx, dz) - g.ang), Math.cos(Math.atan2(dx, dz) - g.ang)) * Math.min(1, dt * 8);
      if (d <= resto) { g.x = px; g.z = pz; g.i++; resto -= d; } else { g.x += (dx / d) * resto; g.z += (dz / d) * resto; resto = 0; }
    }
    this.ubicar(g.x, g.y, g.z, g.ang);
    this.manu.m.animar(dt, VEL, true);
    this.schwepa.m.animar(dt, VEL, true);
    return g.i >= g.camino.length;
  }

  apuntar(v) {
    this.manu.m.apuntar = v;
    this.schwepa.m.apuntar = v;
  }

  // ---------- A la mansión ----------
  async empezarCasa() {
    if (this.golpe) return;
    this.golpe = { tipo: 'casa', fase: 'cargando' };
    await this.cargar();
    const [x, z] = IDA[0];
    Object.assign(this.golpe, { fase: 'yendo', camino: IDA, i: 1, x, z, y: 0, ang: Math.PI / 2 });
    this.apuntar(true);
    this.ver(true);
    this.ui.aviso('¡Manu Mendez y la Schwepa vienen con un AK-47 a robarte la casa! No hay nada que hacer...');
    sfx.robo();
  }

  robarCasa() {
    const e = this.tycoon.estado;
    const robo = Math.floor((e.banco || 0) + e.plata);
    e.banco = 0;
    e.plata = 0;
    this.gritar(this.manu, 'Esto es un robo gil');
    this.ui.aviso(robo >= 1 ? `¡Manu Mendez y la Schwepa te robaron TODO: $${formato(robo)}!` : 'Manu Mendez y la Schwepa no encontraron nada para robar');
    sfx.robo();
    this.tycoon.guardar?.();
  }

  // ---------- Un local de la ciudad ----------
  // Dónde pararse y a quién apuntarle en cada local que se puede asaltar (en el mundo).
  locales() {
    const c = this.ciudad;
    if (!c.lista) return [];
    const o = c.grupo.position;
    const y = c.manzanaDe(0, 0).y;
    const lista = [];
    const L = this.lucca.L;
    if (L && this.lucca.cajero) {
      const k = this.lucca.cajero;
      lista.push({ tipo: 'ropa', x: o.x + k.x, z: o.z + (L.zf + k.z) / 2 - 1, mira: [o.x + k.x, o.z + k.z], y: L.P, fuera: [o.x + L.xm, o.z + L.zf - 14] });
    }
    const v = c.verdu;
    if (v) lista.push({ tipo: 'verdu', x: o.x + v.x, z: o.z + v.z + 3, mira: [o.x + v.xVerdulero, o.z + v.zVerdulero], y, fuera: [o.x + v.x, o.z + v.z + 16] });
    const co = this.concesionario;
    if (co && this.tycoon.progreso >= AUTOS_DESDE) {
      const e = co.exhibidos.find((x) => x.cargado && !x.gira && x.soporte.visible);
      if (e) lista.push({ tipo: 'autos', x: e.x - 3, z: e.z - 7, mira: [e.x, e.z], y: 0.3, exhibido: e });
    }
    return lista;
  }

  async empezarLocal(jugador) {
    if (this.golpe) return false;
    const lista = this.locales();
    if (!lista.length) return false;
    // El que te queda más cerca (si no, nunca los verías).
    const l = lista.reduce((a, b) => (Math.hypot(a.x - jugador.pos.x, a.z - jugador.pos.z) <= Math.hypot(b.x - jugador.pos.x, b.z - jugador.pos.z) ? a : b));
    this.golpe = { tipo: 'local', fase: 'cargando', l };
    await this.cargar();
    const ang = Math.atan2(l.mira[0] - l.x, l.mira[1] - l.z);
    Object.assign(this.golpe, { fase: 'asaltando', t: ASALTO, x: l.x, z: l.z, y: l.y, ang, grito: 1.5, tiro: 2 });
    this.ubicar(l.x, l.y, l.z, ang);
    this.apuntar(true);
    this.ver(true);
    return true;
  }

  huirLocal() {
    const g = this.golpe;
    const l = g.l;
    if (l.tipo === 'autos') {
      // Se van en el auto: una copia del exhibido sale por la avenida y el de la vidriera falta un rato.
      const e = l.exhibido;
      const auto = e.soporte.clone();
      auto.position.set(e.x, 0.3, CALLE_Z + 8);
      this.escena.add(auto);
      e.soporte.visible = false;
      this.ver(false);
      Object.assign(g, { fase: 'auto', auto, vel: 0, t: 0 });
      sfx.moto();
      return;
    }
    const b = botin(l.tipo);
    this.schwepa.m.partes.brazoI.add(b);
    this.schwepa.m.apuntar = false;
    const [fx, fz] = l.fuera;
    Object.assign(g, { fase: 'yendose', camino: [[fx, fz], [fx + 90, fz]], i: 0, botin: b });
  }

  terminar() {
    const g = this.golpe;
    if (g?.botin) g.botin.parent?.remove(g.botin);
    if (g?.auto) {
      this.escena.remove(g.auto);
      const e = g.l.exhibido;
      setTimeout(() => { e.soporte.visible = true; }, 120000); // al rato reponen el auto
    }
    if (g?.tipo === 'casa') {
      this.tycoon.pausaCobro = false;
      this.ui.aviso(null);
    }
    this.ver(false);
    this.golpe = null;
  }

  // Centro del cuerpo de la Schwepa (para apuntarle), o null si no está.
  posicionSchwepa(salida) {
    if (!this.golpe || !this.schwepa?.m.grupo.visible) return null;
    salida.copy(this.schwepa.m.grupo.position);
    salida.y += 3;
    return salida;
  }

  actualizar(dt, jugador, jugando, ladron) {
    // Las tiradas: una por minuto de juego.
    this.reloj += dt;
    if (jugando && !this.golpe && this.reloj >= CADA) {
      this.reloj = 0;
      const p = jugador.pos;
      const enLaCasa = p.x > T.x0 && p.x < T.x1 && p.z > T.z0 && p.z < T.z1;
      if (enLaCasa && this.tycoon.estado.compras.includes('piso_pb') && ladron.estado === 'fuera') {
        if (Math.random() < PROB_CASA) this.empezarCasa();
      } else if (this.ciudad.adentro(p) && Math.random() < PROB_LOCAL) this.empezarLocal(jugador);
    }
    const g = this.golpe;
    if (!g || g.fase === 'cargando') return;
    for (const q of [this.manu, this.schwepa]) if (q.t > 0 && (q.t -= dt) <= 0) q.globo.sprite.visible = false;
    const cerca = Math.hypot(jugador.pos.x - (g.x ?? 0), jugador.pos.z - (g.z ?? 0)) < 70;
    if (g.tipo === 'casa') {
      this.tycoon.pausaCobro = true; // si no, el cobrador automático se lo lleva antes
      if (g.fase === 'yendo') {
        if (this.caminar(dt)) { this.robarCasa(); g.fase = 'robando'; g.t = 3; }
      } else if (g.fase === 'robando') {
        this.manu.m.animar(dt, 0, true);
        this.schwepa.m.animar(dt, 0, true);
        if ((g.t -= dt) <= 0) Object.assign(g, { fase: 'yendose', camino: SALIDA, i: 0 });
      } else if (g.fase === 'yendose' && this.caminar(dt)) this.terminar();
      return;
    }
    if (g.fase === 'asaltando') {
      this.manu.m.animar(dt, 0, true);
      this.schwepa.m.animar(dt, 0, true);
      if ((g.grito -= dt) <= 0) {
        g.grito = 4 + Math.random() * 4;
        const quien = Math.random() < 0.6 ? this.manu : this.schwepa;
        const lista = GRITOS[g.l.tipo];
        this.gritar(quien, lista[Math.floor(Math.random() * lista.length)]);
      }
      // Algún tiro al aire de vez en cuando (se escucha si estás cerca).
      if ((g.tiro -= dt) <= 0) {
        g.tiro = 3 + Math.random() * 5;
        const ak = (Math.random() < 0.5 ? this.manu : this.schwepa).m.manoD.children.find((c) => c.userData.fogonazo);
        if (ak) { ak.userData.fogonazo.visible = true; g.fogonazo = ak.userData.fogonazo; g.fogonazoT = 0.06; }
        if (cerca) sfx.disparo();
      }
      if (g.fogonazo && (g.fogonazoT -= dt) <= 0) { g.fogonazo.visible = false; g.fogonazo = null; }
      if ((g.t -= dt) <= 0) this.huirLocal();
    } else if (g.fase === 'yendose') {
      if (this.caminar(dt)) this.terminar();
    } else if (g.fase === 'auto') {
      // Arranca, sale a la avenida y se va a toda velocidad.
      g.t += dt;
      g.vel = Math.min(45, g.vel + dt * 14);
      const a = g.auto;
      if (a.position.z > CALLE_Z + 1) {
        a.rotation.y = Math.PI;
        a.position.z -= g.vel * dt * 0.5;
      } else {
        a.rotation.y = Math.PI / 2;
        a.position.x += g.vel * dt;
      }
      if (g.t > 14) this.terminar();
    }
  }
}
