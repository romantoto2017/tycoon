import * as THREE from 'three';
import { CALLE_Z, COSTA as CO, COMCAR as CC, BARRIO } from './constantes.js';
import { PUNTOS, alturaCosta } from './costa.js';
import { crearPersonaje } from './personaje.js';
import { cargarCabeza, crearEtiqueta, liberarAlSubir } from './texturas.js';
import { dibujarCara } from './ciudad.js';
import { sfx } from './sfx.js';

// La policía: un patrullero (blanco con la franja azul, la baliza que titila) que recorre la ruta
// del barrio a la costa, sube el cerro hasta el galpón de tanzania, baja y sigue hasta el COMCAR.
// En el mapa se ve dónde está (punto rojo). Si te ve, te puede parar: si estás en el galpón lo
// allana, si manejás te registra el auto, cerca de la mansión la revisa. Si no tenés nada, "circulá";
// si tenés tanzania (bolsitas encima, o en el depósito si allanan el galpón), te la sacan y vas en
// cana al C.O.M.C.A.R. (comcar.js).
const VEL = 26;
const VE = 30; // a cuánto te ve
const ESPERA = 150; // segundos entre un control y otro

// El recorrido (ida y vuelta por la misma ruta): de las afueras (el COMCAR) por la calle hasta la
// costa, sube el camino del cerro hasta el galpón y vuelve.
function recorrido() {
  const z = CALLE_Z + 3;
  const ida = [[CC.entrada, z], [BARRIO.x0 + 40, z], [BARRIO.x1 - 10, z], ...PUNTOS.map(([x, pz]) => [x, pz]), [CO.galpon.x - CO.galpon.ancho / 2 - 30, CO.galpon.z]];
  return [...ida, ...ida.slice(1, -1).reverse()].map(([x, pz]) => ({ x, z: pz }));
}

function patrullero() {
  const g = new THREE.Group();
  const lambert = (c) => new THREE.MeshLambertMaterial({ color: c });
  const caja = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b; };
  const blanco = lambert('#f4f4f2');
  caja(4.4, 1.6, 10, blanco, 0, 1.5, 0); // carrocería
  caja(4.0, 1.4, 5, blanco, 0, 2.9, -0.6); // cabina
  caja(4.05, 1.0, 4.6, lambert('#1b2a3a'), 0, 3.0, -0.6); // vidrios
  caja(4.5, 0.5, 9.6, lambert('#1d4fa0'), 0, 1.6, 0); // la franja azul
  caja(4.42, 0.9, 2.2, lambert('#141414'), 0, 1.7, 3.95); // capot negro
  // El cartel POLICÍA a los costados.
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = '#ffffff';
  x.font = '900 46px Arial, sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText('POLICÍA', 128, 34);
  const t = liberarAlSubir(new THREE.CanvasTexture(c));
  t.colorSpace = THREE.SRGBColorSpace;
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), new THREE.MeshBasicMaterial({ map: t, transparent: true }));
    m.position.set(s * 2.27, 1.6, 0);
    m.rotation.y = s * Math.PI / 2;
    g.add(m);
  }
  for (const [rx, rz] of [[-2.1, 3], [2.1, 3], [-2.1, -3.2], [2.1, -3.2]]) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.6, 12).rotateZ(Math.PI / 2), lambert('#111111'));
    r.position.set(rx, 0.8, rz);
    g.add(r);
  }
  // La baliza: roja y azul, titilando.
  const roja = new THREE.MeshBasicMaterial({ color: '#ff2020' });
  const azul = new THREE.MeshBasicMaterial({ color: '#2050ff' });
  g.userData.luces = [caja(1.6, 0.45, 0.8, roja, -0.9, 3.85, -0.6), caja(1.6, 0.45, 0.8, azul, 0.9, 3.85, -0.6)];
  g.userData.mats = [roja, azul];
  return g;
}

export class Policia {
  constructor({ escena, estado, ui, guardar, jugador, tanzania, comcar, pausar }) {
    Object.assign(this, { escena, estado, ui, guardar, jugador, tanzania, comcar, pausar });
    this.ruta = recorrido();
    this.i = 1;
    this.auto = patrullero();
    this.pos = new THREE.Vector3(this.ruta[0].x, 0, this.ruta[0].z);
    this.auto.position.copy(this.pos);
    escena.add(this.auto);
    this.parado = 0; // segundos que le quedan parado (en un control)
    this.reloj = 0;
    this.alMarcar = null; // main.js: el punto rojo del mapa
    this.armarCanas();
  }

  get datos() { return (this.estado.policia ??= { proximo: 0 }); }

  // Los dos policías (se bajan cuando te paran).
  async armarCanas() {
    const P = { id: 'policia', nombre: ' ', sinFoto: true, sinCara: true, piel: '#e0ac69', pelo: '#2b2b2b', peinado: 'rapado', remera: '#1d2d55', pantalon: '#1b2233', mangasLargas: true };
    const cab = await cargarCabeza(P);
    if (!cab.dibujada) { dibujarCara(cab.frente, P.piel, P.pelo); cab.dibujada = true; }
    this.cara = cab.frente.toDataURL(); // antes de que se vacíe al subirse
    this.canas = [0, 1].map((k) => {
      const m = crearPersonaje(P, cab);
      const gorra = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, 1.5), new THREE.MeshLambertMaterial({ color: '#10182c' }));
      gorra.position.set(0, 0.8, 0.08);
      m.partes.cabeza.add(gorra);
      m.grupo.visible = false;
      this.escena.add(m.grupo);
      return m;
    });
    const et = crearEtiqueta([{ texto: 'Policía', tam: 50, color: '#9ec5ff' }], 3.5);
    et.sprite.position.y = 6.4;
    this.canas[0].grupo.add(et.sprite);
  }

  actualizar(dt, jugador, conduciendo, jugando) {
    this.reloj += dt;
    const [roja, azul] = this.auto.userData.mats;
    const on = Math.floor(this.reloj * 4) % 2;
    roja.color.set(on ? '#ff2020' : '#401010');
    azul.color.set(on ? '#101840' : '#2050ff');
    if (this.parado > 0) {
      this.parado -= dt;
      if (this.parado <= 0 && this.canas) for (const m of this.canas) m.grupo.visible = false;
    } else {
      // Avanza por la ruta; en el cerro, a la altura del camino.
      const q = this.ruta[this.i];
      const dx = q.x - this.pos.x;
      const dz = q.z - this.pos.z;
      const l = Math.hypot(dx, dz);
      if (l < VEL * dt + 0.1) this.i = (this.i + 1) % this.ruta.length;
      else {
        this.pos.x += (dx / l) * VEL * dt;
        this.pos.z += (dz / l) * VEL * dt;
        this.auto.rotation.y = Math.atan2(dx, dz);
      }
      this.pos.y = alturaCosta(this.pos.x, this.pos.z);
      this.auto.position.copy(this.pos);
    }
    // El punto rojo del mapa (2 veces por segundo).
    if (this.reloj - (this.ultimaMarca || -9) > 0.5) { this.ultimaMarca = this.reloj; this.alMarcar?.([{ x: this.pos.x, z: this.pos.z, color: '#ff3030' }]); }
    // ¿Te vio?
    if (!jugando || this.comcar.preso || this.parado > 0 || this.controlando) return;
    const d = Math.hypot(jugador.pos.x - this.pos.x, jugador.pos.z - this.pos.z);
    if (d > VE || Math.abs(jugador.pos.y - this.pos.y) > 8 || (this.estado.tiempoJugado || 0) < this.datos.proximo) return;
    this.datos.proximo = (this.estado.tiempoJugado || 0) + ESPERA;
    const sospecha = (this.tanzania.datos.encima || 0) > 0 || this.tanzania.dentro(jugador.pos);
    if (Math.random() < (sospecha ? 0.75 : 0.3)) this.controlar(jugador, conduciendo);
  }

  // El control: qué revisan según dónde estés, y si encuentran tanzania, en cana.
  async controlar(jugador, conduciendo) {
    this.controlando = true;
    this.parado = 12;
    sfx.susto();
    if (this.canas) {
      this.canas.forEach((m, k) => {
        const a = this.auto.rotation.y + (k ? -1 : 1) * 0.6;
        m.grupo.position.set(this.pos.x + Math.sin(a) * 6, this.pos.y, this.pos.z + Math.cos(a) * 6);
        m.grupo.rotation.y = Math.atan2(jugador.pos.x - m.grupo.position.x, jugador.pos.z - m.grupo.position.z);
        m.grupo.visible = true;
      });
    }
    const t = this.tanzania.datos;
    const enGalpon = this.tanzania.dentro(jugador.pos) || Math.hypot(jugador.pos.x - CO.galpon.x, jugador.pos.z - CO.galpon.z) < 70;
    const enMansion = Math.abs(jugador.pos.x) < 90 && jugador.pos.z < CALLE_Z;
    const que = enGalpon ? 'allanamiento' : conduciendo ? 'auto' : enMansion ? 'mansion' : 'cacheo';
    const intro = {
      allanamiento: ['¡Policía! ¡Quieto ahí! Tenemos una orden de allanamiento para este galpón.', 'Vamos a revisar todo, de punta a punta.'],
      auto: ['Buenas. Control policial: bájese del vehículo, por favor.', 'Documentos y abra el baúl, que vamos a revisar.'],
      mansion: ['Buenas tardes. Nos llegó una denuncia de este domicilio.', 'Vamos a revisar la casa, si no le molesta. Y si le molesta, también.'],
      cacheo: ['¡Alto! Control de rutina. Las manos donde las vea.', 'Vamos a cachearlo.'],
    }[que];
    const tiene = (t.encima || 0) > 0 || (que === 'allanamiento' && (t.deposito || 0) >= this.tanzania.bolsa);
    await this.decir([...intro]);
    if (!tiene) {
      await this.decir(['…Está todo en orden. Circule.']);
      this.controlando = false;
      return;
    }
    const encontrado = que === 'allanamiento' ? 'el galpón lleno de tanzania' : `${t.encima} bolsitas de tanzania`;
    await this.decir([`¿Y esto qué es? ¡Encontramos ${encontrado}!`, 'Queda detenido por tenencia y comercialización. Tiene derecho a permanecer callado.']);
    t.encima = 0;
    if (que === 'allanamiento') t.deposito = 0;
    this.controlando = false;
    this.comcar.encarcelar(`La policía te encontró ${encontrado}.`);
  }

  decir(lineas) {
    this.pausar(true);
    return new Promise((res) => this.ui.dialogo({ nombre: 'Policía', cara: this.cara || '', remera: '#1d2d55', lineas, alTerminar: () => { this.pausar(false); res(); } }));
  }
}
