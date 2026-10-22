import * as THREE from 'three';
import { Jugador } from './jugador.js';
import { crearPersonaje } from './personaje.js';
import { cargarCabeza, crearEtiqueta } from './texturas.js';
import { CALLE_Z, MANSION as M, NUCLEO, PASILLO, nivel } from './constantes.js';

// La Mazza: está enamorada de Juanma. Cada minuto de juego hay un 3% de que caiga a la casa.
// Si estás jugando con Juanma, te persigue (y le salen corazones al verte); si no, entra a
// preguntar por él y te sigue preguntando. No se la puede echar: se va sola a los 5 minutos.
const MAZZA = {
  id: 'mazza', nombre: 'Mazza', foto: 'maza.jpeg', recorte: [0.47, 0.46, 0.78],
  piel: '#f2d2c0', pelo: '#3b2a20', peinado: 'liso', peloLargo: true, cuerpo: 'gordo',
  remera: '#e91e63', pantalon: '#263238',
};
const CADA = 60;
const PROBABILIDAD = 0.03;
const ESTADIA = 5 * 60;
const VEL_PERSIGUE = 0.8; // proporción de la velocidad del jugador: Juanma se le puede escapar
const VEL_CAMINA = 0.55;
const FRASES = ['¿Dónde está Juanma?', '¿Viste a Juanma?', '¿Juanma está en casa?', 'Decile a Juanma que vine <3', '¿Juanma no está?'];
const FRASES_JUANMA = ['¡JUANMAAA!', 'Juanma, esperame', 'Te amo Juanma <3', '¡No te escapes!'];

// ---------- Navegación por la mansión ----------
// Puntos de paso en el plano (x, z) con el piso al que pertenecen. Las escaleras alternan:
// desde un piso par se sube por la A (adelante a la izquierda) y llega atrás; desde uno impar,
// por la B (atrás a la derecha) y llega adelante.
const pt = (x, z, piso) => ({ x, z, piso });
// Pie y llegada justo en el borde de las escaleras: se entra derecho y no se recalcula
// el camino mientras está subiendo o bajando.
const pie = (n) => (n % 2 === 0 ? pt(-2, -10.5, n) : pt(2.8, -29.5, n));
const llegada = (n) => (n % 2 === 1 ? pt(-2, -29.5, n) : pt(2.8, -10.5, n));
// Escaleras y huecos en el medio del hall: hay que rodearlos por los costados (x = ±6).
const BLOQUE = { x0: -4.6, x1: 4.6, z0: -29, z1: -11 };

function pisoDe(p) {
  return THREE.MathUtils.clamp(Math.round((p.y - 0.4) / 10), 0, 4);
}

function region(p, piso) {
  const adentro = p.x > M.x0 && p.x < M.x1 && p.z > M.z0 && p.z < M.z1;
  if (piso === 0 && !adentro) return 'afuera';
  if (piso === 4) return 'techo';
  if (Math.abs(p.x) < NUCLEO) return 'hall';
  if (p.z > PASILLO.z0 && p.z < PASILLO.z1) return 'pasillo';
  return 'cuarto';
}

const Z_PASILLO = (PASILLO.z0 + PASILLO.z1) / 2;

// Puerta de una habitación: [punto adentro frente a la puerta, punto del pasillo].
function puertaDe(p, piso) {
  const s = p.x < 0 ? -1 : 1;
  const cx = Math.abs(p.x) < 26 ? s * 17 : s * 35;
  const zPuerta = p.z > Z_PASILLO ? PASILLO.z1 + 1.2 : PASILLO.z0 - 1.2;
  return [pt(cx, zPuerta, piso), pt(cx, Z_PASILLO, piso)];
}

// Afuera: puntos para llegar al jardín de adelante. Desde el garage sale por el portón;
// desde atrás o los costados rodea la mansión (por el oeste, o entre la mansión y el garage).
function alFrente(p) {
  if (p.x > 46.5 && p.x < 71 && p.z > -12.5 && p.z < 20.5) return [pt(58.75, 16, 0), pt(58.75, 23, 0)];
  if (p.z < 0.5) {
    const x = p.x > 0 ? 45.6 : -48;
    return [pt(x, p.z, 0), pt(x, 14, 0)];
  }
  return [];
}

function zonaAfuera(p) {
  if (p.x > 46.5 && p.x < 71 && p.z > -12.5 && p.z < 20.5) return 'garage';
  return p.z < 0.5 ? 'atras' : 'frente';
}

function cruzaMansion(a, b) {
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const x = a.x + (b.x - a.x) * t;
    const z = a.z + (b.z - a.z) * t;
    if (x > M.x0 - 1 && x < M.x1 + 1 && z > M.z0 - 1 && z < M.z1) return true;
  }
  return false;
}

function sinRepetidos(camino) {
  return camino.filter((p, i) => i === 0 || p.x !== camino[i - 1].x || p.z !== camino[i - 1].z || p.piso !== camino[i - 1].piso);
}

// Puntos desde p hasta un punto del hall (o de la terraza) de su piso.
function haciaHall(p) {
  const piso = pisoDe(p);
  const r = region(p, piso);
  const s = p.x < 0 ? -1 : 1;
  if (r === 'hall') return [pt(p.x, p.z, piso)];
  // Terraza: la escalera llega adentro de un pabellón de vidrio que abre hacia adelante.
  if (r === 'techo') {
    const adentro = Math.abs(p.x) < 6 && p.z > -29 && p.z < -8;
    // Afuera del pabellón, por el borde de adelante (esquiva la piscina, el jacuzzi y el helipuerto).
    return adentro ? [pt(p.x, p.z, piso)] : [pt(p.x, -2.9, piso), pt(2, -2.9, piso), pt(2, -9.5, piso)];
  }
  if (r === 'pasillo') return [pt(p.x, Z_PASILLO, piso), pt(s * 6, Z_PASILLO, piso)];
  if (r === 'cuarto') return [...puertaDe(p, piso), pt(s * 6, Z_PASILLO, piso)];
  const camino = alFrente(p);
  const ultimo = camino[camino.length - 1] || pt(p.x, p.z, 0);
  if (!(Math.abs(ultimo.x) < 7 && ultimo.z < 16)) camino.push(pt(0, 14, 0));
  camino.push(pt(0, 4, 0), pt(0, -2, 0));
  return camino;
}

function cruzaBloque(a, b) {
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const x = a.x + (b.x - a.x) * t;
    const z = a.z + (b.z - a.z) * t;
    if (x > BLOQUE.x0 && x < BLOQUE.x1 && z > BLOQUE.z0 && z < BLOQUE.z1) return true;
  }
  return false;
}

// Dentro del hall de un piso: directo, o rodeando las escaleras por adelante o por atrás.
function porElHall(a, b) {
  if (a.piso === 4 || !cruzaBloque(a, b)) return [b];
  const sa = a.x < 0 || (a.x === 0 && b.x < 0) ? -1 : 1;
  const sb = b.x < 0 ? -1 : 1;
  const adelante = Math.abs(a.z + 7) + Math.abs(b.z + 7);
  const atras = Math.abs(a.z + 31.5) + Math.abs(b.z + 31.5);
  const zc = adelante <= atras ? -7 : -31.5;
  return [pt(sa * 6, a.z, a.piso), pt(sa * 6, zc, a.piso), pt(sb * 6, zc, a.piso), pt(sb * 6, b.z, a.piso), b];
}

export function ruta(desde, hasta) {
  const pa = pisoDe(desde);
  const pb = pisoDe(hasta);
  const ra = region(desde, pa);
  const rb = region(hasta, pb);
  // Los dos afuera: por el jardín, sin entrar a la casa.
  if (ra === 'afuera' && rb === 'afuera') {
    const za = zonaAfuera(desde);
    const zb = zonaAfuera(hasta);
    if (za === zb && !cruzaMansion(desde, hasta)) return [];
    // Por el fondo y los costados: bordea la mansión sin pasar por adelante.
    if (za === 'atras' && zb === 'atras') {
      const xa = desde.x > 0 ? 45.6 : -48;
      const xb = hasta.x > 0 ? 45.6 : -48;
      return sinRepetidos([pt(xa, desde.z, 0), pt(xa, -37, 0), pt(xb, -37, 0), pt(xb, hasta.z, 0)])
        .filter((q) => q.z < -34.5 || Math.abs(q.x) > 44.5);
    }
    return sinRepetidos([...alFrente(desde), ...alFrente(hasta).reverse()]);
  }
  // Los dos en la terraza, afuera del pabellón: por el borde de adelante.
  const enPabellon = (p) => Math.abs(p.x) < 6 && p.z > -29 && p.z < -8;
  if (ra === 'techo' && rb === 'techo' && !enPabellon(desde) && !enPabellon(hasta)) {
    return [pt(desde.x, -2.9, 4), pt(hasta.x, -2.9, 4)];
  }
  // Mismo piso y mismo lado del pasillo: por el pasillo, sin pasar por el hall.
  const lado = (p) => (p.x < 0 ? -1 : 1);
  const alPasillo = (r) => r === 'pasillo' || r === 'cuarto';
  if (pa === pb && alPasillo(ra) && alPasillo(rb) && lado(desde) === lado(hasta)) {
    const a = ra === 'cuarto' ? puertaDe(desde, pa) : [pt(desde.x, Z_PASILLO, pa)];
    const b = rb === 'cuarto' ? puertaDe(hasta, pb).reverse() : [];
    if (ra === 'cuarto' && rb === 'cuarto' && a[0].x === b[1].x && a[0].z === b[1].z) return [];
    return [...a, ...b];
  }
  const ida = haciaHall(desde);
  const vuelta = haciaHall(hasta).reverse();
  const puntos = [...ida];
  let actual = ida[ida.length - 1];
  let n = actual.piso;
  const fin = vuelta[0];
  while (n < fin.piso) {
    puntos.push(...porElHall(actual, pie(n)), llegada(n + 1));
    actual = llegada(n + 1);
    n++;
  }
  while (n > fin.piso) {
    puntos.push(...porElHall(actual, llegada(n)), pie(n - 1));
    actual = pie(n - 1);
    n--;
  }
  puntos.push(...porElHall(actual, fin), ...vuelta.slice(1));
  return sinRepetidos(puntos);
}

// Saca los primeros puntos si ya se pasaron (el siguiente queda más cerca desde donde está
// que desde ese punto): si no, al recalcular volvería para atrás.
function recortar(camino, pos) {
  const piso = pisoDe(pos);
  while (camino.length >= 2 && camino[0].piso === piso && camino[1].piso === piso) {
    const [a, b] = camino;
    if (Math.hypot(b.x - pos.x, b.z - pos.z) > Math.hypot(b.x - a.x, b.z - a.z)) break;
    camino.shift();
  }
  return camino;
}

// ---------- Corazones tipo Minecraft ----------
function texturaCorazon() {
  const forma = [
    '.oo.oo.',
    'orroowo',
    'orrrrro',
    '.orrro.',
    '..oro..',
    '...o...',
  ];
  const tam = 8;
  const c = document.createElement('canvas');
  c.width = forma[0].length * tam;
  c.height = forma.length * tam;
  const g = c.getContext('2d');
  const colores = { o: '#5c0a14', r: '#e8202e', w: '#ffffff' };
  forma.forEach((fila, y) => [...fila].forEach((ch, x) => {
    if (ch === '.') return;
    g.fillStyle = colores[ch];
    g.fillRect(x * tam, y * tam, tam, tam);
  }));
  // brillo arriba a la derecha (ya marcado con 'w')
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

class Corazones {
  constructor(escena) {
    const mat = new THREE.SpriteMaterial({ map: texturaCorazon(), transparent: true, depthWrite: false });
    this.lista = Array.from({ length: 14 }, () => {
      const s = new THREE.Sprite(mat.clone());
      s.visible = false;
      s.userData.vida = 0;
      escena.add(s);
      return s;
    });
    this.restante = 0;
    this.espera = 0;
    this.proximo = 0;
  }

  // Tira corazones durante `seg` segundos.
  emitir(seg = 3) { this.restante = seg; }

  actualizar(dt, cabeza) {
    if (this.restante > 0) {
      this.restante -= dt;
      this.espera -= dt;
      if (this.espera <= 0) {
        this.espera = 0.22;
        const s = this.lista[this.proximo++ % this.lista.length];
        s.position.set(cabeza.x + (Math.random() - 0.5) * 1.6, cabeza.y + Math.random() * 0.4, cabeza.z + (Math.random() - 0.5) * 1.6);
        s.userData.vida = 1.5;
        s.visible = true;
      }
    }
    for (const s of this.lista) {
      if (!s.visible) continue;
      s.userData.vida -= dt;
      if (s.userData.vida <= 0) { s.visible = false; continue; }
      s.position.y += dt * 1.3;
      const t = s.userData.vida;
      s.material.opacity = Math.min(1, t / 0.5);
      const e = 0.7 * Math.min(1, (1.5 - t) * 5 + 0.3);
      s.scale.set(e, e * 6 / 7, 1);
    }
  }

  ocultar() {
    this.restante = 0;
    for (const s of this.lista) s.visible = false;
  }
}

// ---------- La Mazza ----------
export class Mazza {
  constructor(escena, tycoon, ui) {
    this.escena = escena;
    this.tycoon = tycoon;
    this.ui = ui;
    this.reloj = 0;
    this.estado = 'fuera'; // fuera | cargando | llegando | visitando | yendo
    this.corazones = new Corazones(escena);
    this.cuerpo = null;
    this.dir = new THREE.Vector3();
    this.cabeza = new THREE.Vector3();
  }

  async aparecer() {
    if (this.estado !== 'fuera') return;
    this.estado = 'cargando';
    if (!this.cuerpo) {
      this.cuerpo = new Jugador(this.escena);
      this.cuerpo.setModelo(crearPersonaje(MAZZA, await cargarCabeza(MAZZA)));
      this.cuerpo.autoSalto = true;
      this.etiqueta = crearEtiqueta([{ texto: 'Mazza', tam: 64, color: '#ff80ab' }], 4.4);
      this.etiqueta.sprite.position.y = 7;
      this.cuerpo.contenedor.add(this.etiqueta.sprite);
    }
    this.escena.add(this.cuerpo.contenedor);
    this.escena.add(this.cuerpo.sombra);
    this.cuerpo.pos.set(-95, 0, CALLE_Z - 2);
    this.cuerpo.vel.set(0, 0, 0);
    this.camino = [pt(0, CALLE_Z - 2, 0), pt(0, 53, 0)];
    this.tiempo = 0;
    this.recalculo = 0;
    this.frase = 0;
    this.cambioFrase = 0;
    this.decir('');
    this.ultimoVisto = -99;
    this.pausa = 0;
    this.estado = 'llegando';
  }

  decir(texto) {
    if (texto === this.dicho) return;
    this.dicho = texto;
    const lineas = [{ texto: 'Mazza', tam: 60, color: '#ff80ab' }];
    if (texto) lineas.push({ texto, tam: 40 });
    this.etiqueta.actualizar(lineas);
  }

  // Sigue el camino hacia los puntos de paso. Devuelve true si ya llegó al último.
  seguir(dt, factor) {
    const c = this.cuerpo;
    while (this.camino.length) {
      const p = this.camino[0];
      const d = Math.hypot(p.x - c.pos.x, p.z - c.pos.z);
      if (d < 0.9 && Math.abs(c.pos.y - nivel(p.piso)) < 3) {
        this.camino.shift();
        this.trabado = 0;
        continue;
      }
      break;
    }
    if (!this.camino.length) {
      c.actualizar(dt, this.dir.set(0, 0, 0), false, this.tycoon.colisiones, this.tycoon.agua);
      return true;
    }
    const p = this.camino[0];
    this.dir.set(p.x - c.pos.x, 0, p.z - c.pos.z).normalize();
    c.factorVel = factor;
    const antes = c.pos.clone();
    c.actualizar(dt, this.dir, false, this.tycoon.colisiones, this.tycoon.agua);
    // Si no avanza (se trabó con algo), salta ese punto de paso.
    const esperado = 16 * factor * dt;
    this.trabado = antes.distanceTo(c.pos) < esperado * 0.2 ? (this.trabado || 0) + dt : 0;
    if (this.trabado > 2.5) {
      this.camino.shift();
      this.trabado = 0;
    }
    return false;
  }

  enTerreno() {
    return this.cuerpo.pos.z < 56;
  }

  actualizar(dt, jugador, jugando, conJuanma) {
    if (this.estado === 'fuera') {
      if (!jugando || !this.tycoon.estado.compras.includes('piso_pb')) return;
      this.reloj += dt;
      if (this.reloj >= CADA) {
        this.reloj = 0;
        if (Math.random() < PROBABILIDAD) this.aparecer();
      }
      return;
    }
    if (this.estado === 'cargando') return;
    const c = this.cuerpo;
    this.cabeza.set(c.pos.x, c.pos.y + 6.2, c.pos.z);
    this.corazones.actualizar(dt, this.cabeza);
    if (!jugando) return;

    if (this.estado === 'llegando') {
      if (this.seguir(dt, VEL_CAMINA)) {
        this.estado = 'visitando';
        this.ui.toast(conJuanma ? '¡Llegó la Mazza! Viene por vos, Juanma' : 'Llegó la Mazza... está buscando a Juanma', 'info');
      }
      return;
    }

    if (this.estado === 'visitando') {
      this.tiempo += dt;
      if (this.tiempo >= ESTADIA) {
        this.estado = 'yendo';
        this.decir(conJuanma ? 'Chau Juanma <3' : 'Bueno, me voy...');
        const salida = ruta(c.pos, new THREE.Vector3(0, 0, 53));
        this.camino = [...salida, pt(0, CALLE_Z - 2, 0), pt(110, CALLE_Z - 2, 0)];
        this.ui.toast('La Mazza se fue (por ahora)', 'info');
        return;
      }
      const lejos = Math.hypot(jugador.pos.x - c.pos.x, jugador.pos.z - c.pos.z);
      const mismoPiso = Math.abs(jugador.pos.y - c.pos.y) < 3;
      // Al ver a Juanma: corazones durante 3 segundos (y de nuevo cada tanto mientras lo persigue).
      if (conJuanma && lejos < 35 && this.tiempo - this.ultimoVisto > 9) {
        this.ultimoVisto = this.tiempo;
        this.corazones.emitir(3);
      }
      this.cambioFrase -= dt;
      if (this.cambioFrase <= 0) {
        this.cambioFrase = 3.5;
        const lista = conJuanma ? FRASES_JUANMA : FRASES;
        this.frase = (this.frase + 1) % lista.length;
      }
      const cerca = lejos < (conJuanma ? 2.2 : 4.5) && mismoPiso;
      this.decir(lejos < 30 ? (conJuanma ? FRASES_JUANMA : FRASES)[this.frase] : '');
      if (conJuanma && cerca && this.pausa <= 0) {
        this.ui.toast('¡La Mazza alcanzó a Juanma!', 'error');
        this.corazones.emitir(3);
        this.ultimoVisto = this.tiempo;
        this.pausa = 3; // se queda abrazándolo un toque: tiempo para escaparse
      }
      if (this.pausa > 0 || cerca) {
        this.pausa -= dt;
        c.mirarA = Math.atan2(jugador.pos.x - c.pos.x, jugador.pos.z - c.pos.z);
        c.actualizar(dt, this.dir.set(0, 0, 0), false, this.tycoon.colisiones, this.tycoon.agua);
        return;
      }
      c.mirarA = null;
      this.recalculo -= dt;
      const enEscalera = c.pos.x > BLOQUE.x0 && c.pos.x < BLOQUE.x1 && c.pos.z > BLOQUE.z0 && c.pos.z < BLOQUE.z1 && this.camino.length;
      if (!enEscalera && (this.recalculo <= 0 || !this.camino.length)) {
        this.recalculo = 1;
        this.camino = recortar(ruta(c.pos, jugador.pos), c.pos);
        this.camino.push(pt(jugador.pos.x, jugador.pos.z, pisoDe(jugador.pos)));
      }
      this.seguir(dt, conJuanma ? VEL_PERSIGUE : VEL_CAMINA);
      return;
    }

    if (this.estado === 'yendo') {
      c.mirarA = null;
      if (this.seguir(dt, VEL_CAMINA * 1.2) || c.pos.x > 100) this.irse();
    }
  }

  irse() {
    this.escena.remove(this.cuerpo.contenedor);
    this.escena.remove(this.cuerpo.sombra);
    this.corazones.ocultar();
    this.estado = 'fuera';
  }
}
