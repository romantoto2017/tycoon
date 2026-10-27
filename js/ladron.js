import * as THREE from 'three';
import { crearPersonaje } from './personaje.js';
import { cargarCabeza, crearEtiqueta, canvasCartel, texturaDeCanvas } from './texturas.js';
import { CALLE_Z, COBRAR, TERRENO as T } from './constantes.js';
import { PERROS } from '../data/objetos.js';
import { caja, mat, formato } from './util.js';
import { sfx } from './sfx.js';

// La Schwepa: cada tanto (5% por minuto jugado) llega por la calle en su Zanella Zapucai,
// entra por el portón, estaciona cerca del cobrador, se baja, camina hasta el botón de cobrar
// y se lleva todo: lo que está esperando ahí y la plata que tenés. Con el AK-47 se la echa: cuando se le
// acaba la vida sale rajando en la moto, devuelve lo robado y no vuelve por 15 minutos. Mientras está en el terreno el cobrador
// automático no anda (si no, nunca habría nada para robar).
const SCHWEPA = {
  id: 'schwepa', nombre: 'Schwepa', foto: 'schwepa.png', recorte: [0.52, 0.44, 0.46],
  piel: '#f2dccd', pelo: '#15110e', peinado: 'liso', remera: '#263238', pantalon: '#1b1b1b',
};
const CADA = 60;          // segundos de juego entre tiradas
const PROBABILIDAD = 0.05;
const ROBO = 1; // se lleva todo: lo del cobrador y la plata que tenés
const VEL_CALLE = 26;
const VEL_TERRENO = 13;
const VEL_PIE = 9;
// Recorrido de la moto (x, z): por la calle desde el oeste, portón, borde del jardín y al cobrador.
const RUTA = [[-120, CALLE_Z - 2], [0, CALLE_Z - 2], [0, 53.5], [-48, 53.5], [-49, 36]];
const SALIDA = [[-49, 36], [-48, 53.5], [0, 53.5], [0, CALLE_Z - 2], [130, CALLE_Z - 2]];
const VIDA = 100;
const BLOQUEO = 15 * 60; // segundos de juego sin que vuelva después de echarla
const A_PIE = [[-50.5, 34], [COBRAR.x + 1.6, COBRAR.z + 1.6]];

// Zanella Zapucai: moto chica tipo cub, roja con escudo delantero y parrilla atrás. Mira hacia +z.
function crearMoto() {
  const g = new THREE.Group();
  const rojo = '#c62828';
  const negro = '#1c1d1f';
  const gris = '#9aa0a6';
  const ruedas = [];
  for (const z of [1.9, -1.9]) {
    const rueda = new THREE.Group();
    const goma = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.36, 18), mat(negro));
    goma.rotation.z = Math.PI / 2;
    const llanta = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 12), mat(gris));
    llanta.rotation.z = Math.PI / 2;
    const rayo = caja(0.42, 0.9, 0.12, '#d0d4d8', 0, 0, 0);
    rueda.add(goma, llanta, rayo);
    rueda.position.set(0, 0.85, z);
    g.add(rueda);
    ruedas.push(rueda);
  }
  g.add(caja(0.7, 0.55, 2.6, rojo, 0, 1.45, -0.1));            // chasis bajo (tipo cub)
  g.add(caja(0.65, 0.7, 0.9, '#5f6368', 0, 0.95, 0.1));        // motor
  const escudo = caja(1.05, 1.5, 0.25, rojo, 0, 2.05, 1.25);   // escudo delantero
  escudo.rotation.x = -0.25;
  g.add(escudo);
  const horquilla = caja(0.22, 2.4, 0.22, gris, 0, 2.1, 1.75);
  horquilla.rotation.x = -0.28;
  g.add(horquilla);
  g.add(caja(1.7, 0.14, 0.14, negro, 0, 3.3, 1.45));           // manubrio
  g.add(caja(0.5, 0.45, 0.4, rojo, 0, 3.15, 1.6));             // farol con carcasa
  const farol = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 12), new THREE.MeshBasicMaterial({ color: '#fff6d0' }));
  farol.rotation.x = Math.PI / 2;
  farol.position.set(0, 3.15, 1.82);
  g.add(farol);
  g.add(caja(0.5, 0.15, 0.9, rojo, 0, 1.8, 2.05));             // guardabarros delantero
  g.add(caja(0.8, 0.3, 1.8, negro, 0, 2.3, -0.55));            // asiento
  g.add(caja(0.75, 0.15, 1.3, gris, 0, 2.25, -1.85));          // parrilla
  g.add(caja(0.6, 0.18, 1.2, rojo, 0, 1.85, -1.95));           // guardabarros trasero
  g.add(caja(0.3, 0.14, 0.08, '#ff1744', 0, 2.05, -2.6));      // luz de atrás
  const escape = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 1.8, 8), mat('#b0b4b8'));
  escape.rotation.x = Math.PI / 2;
  escape.position.set(0.45, 0.75, -1.1);
  g.add(escape);
  // "ZANELLA" a los dos lados del chasis.
  const texto = texturaDeCanvas(canvasCartel('ZANELLA', 2.2, 0.45, '#ffffff', rojo));
  for (const lado of [-1, 1]) {
    const cartel = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.45), new THREE.MeshBasicMaterial({ map: texto }));
    cartel.position.set(lado * 0.36, 1.45, -0.1);
    cartel.rotation.y = lado * Math.PI / 2;
    g.add(cartel);
  }
  return { grupo: g, ruedas };
}

export class Ladron {
  constructor(escena, tycoon, ui) {
    this.escena = escena;
    this.tycoon = tycoon;
    this.ui = ui;
    this.reloj = 0;
    this.estado = 'fuera';
    this.moto = null;
    this.bot = null;
  }

  // Se puede llamar a mano (por ejemplo desde la consola con ?debug) para que aparezca ya.
  async aparecer() {
    if (this.estado !== 'fuera') return;
    this.estado = 'cargando';
    if (!this.bot) {
      this.bot = crearPersonaje(SCHWEPA, await cargarCabeza(SCHWEPA));
      this.etiqueta = crearEtiqueta([{ texto: 'Schwepa', tam: 64, color: '#ff5252' }], 4);
      this.etiqueta.sprite.position.y = 6.3;
      this.bot.grupo.add(this.etiqueta.sprite);
      this.moto = crearMoto();
    }
    this.moto.grupo.add(this.bot.grupo);
    this.bot.grupo.position.set(0, 0.5, -0.45);
    this.bot.grupo.rotation.set(0, 0, 0);
    this.escena.add(this.moto.grupo);
    this.camino = RUTA.map(([x, z]) => new THREE.Vector3(x, 0, z));
    this.moto.grupo.position.copy(this.camino[0]);
    this.tramo = 1;
    this.avisado = false;
    this.vida = VIDA;
    this.robado = 0;
    this.huyendo = false;
    this.mostrarVida();
    this.estado = 'llegando';
    sfx.moto();
  }

  // Avanza `obj` por this.camino; devuelve true al llegar al final.
  avanzar(obj, dt, velocidad) {
    let resto = velocidad * dt;
    while (resto > 0 && this.tramo < this.camino.length) {
      const destino = this.camino[this.tramo];
      const dx = destino.x - obj.position.x;
      const dz = destino.z - obj.position.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.001) {
        let ang = Math.atan2(dx, dz) - obj.rotation.y;
        ang = Math.atan2(Math.sin(ang), Math.cos(ang));
        obj.rotation.y += ang * Math.min(1, dt * 8);
      }
      if (d <= resto) {
        obj.position.x = destino.x;
        obj.position.z = destino.z;
        resto -= d;
        this.tramo++;
      } else {
        obj.position.x += (dx / d) * resto;
        obj.position.z += (dz / d) * resto;
        resto = 0;
      }
    }
    return this.tramo >= this.camino.length;
  }

  enTerreno(p) {
    return p.z < 56;
  }

  actualizar(dt, jugando) {
    if (this.estado === 'fuera') {
      const e = this.tycoon.estado;
      if (!jugando || !e.compras.includes('piso_pb') || (e.schwepaVuelve || 0) > e.tiempoJugado) return;
      this.reloj += dt;
      if (this.reloj >= CADA) {
        this.reloj = 0;
        // Si no estás en casa, los perros la paran en la puerta (ver Perros, abajo).
        if (Math.random() < PROBABILIDAD && !this.perros?.llegaSchwepa()) this.aparecer();
      }
      return;
    }
    if (this.estado === 'cargando') return;
    const moto = this.moto.grupo;
    const bot = this.bot.grupo;
    const enMoto = this.estado === 'llegando' || this.estado === 'yendo';
    const rapido = this.huyendo ? 1.7 : 1;
    const vel = (enMoto ? (this.enTerreno(moto.position) ? VEL_TERRENO : VEL_CALLE) : VEL_PIE) * rapido;
    this.moto.ruedas.forEach((r) => { if (enMoto) r.rotation.x += (vel / 0.85) * dt; });
    this.tycoon.pausaCobro = this.estado !== 'yendo' && this.enTerreno(moto.position);

    if (this.estado === 'llegando') {
      this.bot.animar(dt, 0, true, false, true);
      if (!this.avisado && this.enTerreno(moto.position)) {
        this.avisado = true;
        this.ui.aviso('¡Llegó la Schwepa en su Zanella Zapucai! Cobrá antes de que te robe');
        sfx.moto();
      }
      if (this.avanzar(moto, dt, vel)) this.bajarse();
    } else if (this.estado === 'caminando' || this.estado === 'volviendo') {
      this.bot.animar(dt, vel, true);
      if (this.avanzar(bot, dt, vel)) {
        if (this.estado === 'caminando') this.robar();
        else this.subirse();
      }
    } else if (this.estado === 'robando') {
      this.bot.animar(dt, 0, true, true);
      this.espera -= dt;
      if (this.espera <= 0) {
        this.estado = 'volviendo';
        this.camino = [bot.position.clone(), ...A_PIE.slice(0, -1).reverse().map(([x, z]) => new THREE.Vector3(x, 0, z)), moto.position.clone()];
        this.tramo = 1;
      }
    } else if (this.estado === 'yendo') {
      this.bot.animar(dt, 0, true, false, true);
      if (this.avanzar(moto, dt, vel)) this.irse();
    }
  }

  bajarse() {
    const moto = this.moto.grupo;
    const bot = this.bot.grupo;
    moto.remove(bot);
    const costado = new THREE.Vector3(-1.4, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), moto.rotation.y);
    bot.position.set(moto.position.x + costado.x, 0, moto.position.z + costado.z);
    bot.rotation.y = moto.rotation.y;
    this.escena.add(bot);
    this.camino = [bot.position.clone(), ...A_PIE.map(([x, z]) => new THREE.Vector3(x, 0, z))];
    this.tramo = 1;
    this.estado = 'caminando';
  }

  mostrarVida() {
    const n = Math.max(0, Math.ceil(this.vida / 25));
    this.etiqueta.actualizar([
      { texto: 'Schwepa', tam: 60, color: '#ff5252' },
      { texto: `${'|'.repeat(n * 3)}${'.'.repeat((4 - n) * 3)} ${Math.max(0, this.vida)}%`, tam: 44, color: n > 1 ? '#8dff6a' : '#ffb74d' },
    ]);
  }

  // Centro del cuerpo (para apuntarle), o null si no está.
  posicion(salida) {
    if (this.estado === 'fuera' || this.estado === 'cargando') return null;
    const enMoto = this.bot.grupo.parent === this.moto.grupo;
    const obj = enMoto ? this.moto.grupo : this.bot.grupo;
    salida.copy(obj.position);
    salida.y += enMoto ? 3.6 : 3;
    return salida;
  }

  // Un tiro del AK-47. Devuelve true si le pegó.
  herir(danio) {
    if (this.huyendo || !this.posicion(new THREE.Vector3())) return false;
    this.vida -= danio;
    this.mostrarVida();
    if (this.vida <= 0) this.huir();
    return true;
  }

  huir() {
    this.huyendo = true;
    const e = this.tycoon.estado;
    e.schwepaVuelve = e.tiempoJugado + BLOQUEO;
    if (this.robado > 0) {
      e.plata += this.robado;
      this.ui.toast(`¡Recuperaste ${formato(this.robado)}!`, 'plata');
      this.robado = 0;
    }
    this.ui.aviso(null);
    this.ui.toast('¡La Schwepa salió rajando! No vuelve por 15 minutos', 'ok');
    sfx.moto();
    const bot = this.bot.grupo;
    if (this.estado === 'llegando') {
      // Pega la vuelta por donde vino.
      this.camino = [this.moto.grupo.position.clone(), ...RUTA.slice(0, this.tramo).reverse().map(([x, z]) => new THREE.Vector3(x, 0, z))];
      this.tramo = 1;
      this.estado = 'yendo';
    } else if (this.estado === 'caminando' || this.estado === 'robando') {
      this.camino = [bot.position.clone(), this.moto.grupo.position.clone()];
      this.tramo = 1;
      this.estado = 'volviendo';
    }
  }

  robar() {
    const e = this.tycoon.estado;
    const robo = Math.floor((e.banco + e.plata) * ROBO);
    if (robo >= 1) {
      const delBanco = Math.min(e.banco, robo);
      e.banco -= delBanco;
      e.plata = Math.max(0, e.plata - (robo - delBanco));
      this.robado = robo;
      this.ui.toast(`¡La Schwepa te robó TODO: ${formato(robo)}!`, 'error');
      sfx.robo();
    } else {
      this.ui.toast('La Schwepa no encontró nada para robar', 'info');
    }
    this.espera = 1.2;
    this.estado = 'robando';
  }

  subirse() {
    const bot = this.bot.grupo;
    this.escena.remove(bot);
    this.moto.grupo.add(bot);
    bot.position.set(0, 0.5, -0.45);
    bot.rotation.set(0, 0, 0);
    this.camino = SALIDA.map(([x, z]) => new THREE.Vector3(x, 0, z));
    this.tramo = 1;
    this.estado = 'yendo';
    sfx.moto();
  }

  irse() {
    this.ui.aviso(null);
    this.escena.remove(this.moto.grupo);
    this.tycoon.pausaCobro = false;
    this.estado = 'fuera';
  }
}

// ======================= Los perros =======================
// Olga (labradora negra de 5-6 meses, como las fotos: orejas caídas, ojos marrones y su osito de
// peluche), Olivia (labradora rubia, muy gorda) y Pancho (salchicha mini negro y marrón). Se compran
// desde el 75% y se sientan afuera, a la derecha de la entrada, mirando a la calle; se les pueden
// hacer mimos. Cuando no estás en casa y llega la Schwepa, la echan (de a uno, una vez cada uno:
// Olga, Olivia, Pancho). Después, cada vez que vuelve y no estás, mata a uno (en el mismo orden) sin
// que nadie se entere: lo ves al volver, tirado donde estaba, y al día de juego ya no está. Mientras
// quede un perro vivo, la Schwepa no puede robar cuando no estás.
const DEF_PERROS = {
  olga: { pelo: '#17171a', panza: '#17171a', ojos: '#6b3d1c', largo: 1.9, alto: 0.95, ancho: 0.85, cabeza: 0.95, hocico: 0.42, orejas: 0.55, cola: 0.85, gordura: 0, ladrido: 1.25, osito: true },
  olivia: { pelo: '#e7cf9f', panza: '#f1dfba', ojos: '#3b2414', largo: 2.3, alto: 1.15, ancho: 1.5, cabeza: 1.0, hocico: 0.55, orejas: 0.55, cola: 1.1, gordura: 1, ladrido: 0.8, lengua: true },
  pancho: { pelo: '#141210', panza: '#b5651d', ojos: '#2b1a10', largo: 2.1, alto: 0.4, ancho: 0.6, cabeza: 0.6, hocico: 0.42, orejas: 0.6, cola: 0.85, gordura: 0, ladrido: 1.5, fuego: '#b5651d' },
};
const UN_DIA = 1440; // segundos de juego (un día y su noche, ver cielo.js)

// Perro de bloques, sentado, mirando a +z. Devuelve el grupo y lo que se mueve.
function crearPerro(d) {
  const g = new THREE.Group();
  const pelo = mat(d.pelo);
  const panza = mat(d.panza);
  const fuego = d.fuego ? mat(d.fuego) : null; // las marcas marrones del salchicha
  const caja3 = (w, h, l, m, x, y, z) => { const c = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), m); c.position.set(x, y, z); return c; };
  const { largo: L, alto: A, ancho: W } = d;
  // Cuerpo inclinado (sentado): de la cadera (atrás, abajo) a los hombros (adelante, arriba).
  const inclinacion = d.alto < 0.6 ? 0.45 : d.gordura ? 0.6 : 0.75; // el salchicha y la gorda, más echados
  const cadera = new THREE.Group();
  cadera.position.set(0, W * 0.45, -L * 0.25);
  cadera.rotation.x = -inclinacion;
  const alto = W * (0.75 + 0.15 * d.gordura);
  cadera.add(caja3(W, alto, L * 0.8, pelo, 0, 0, L * 0.4));
  if (d.gordura) cadera.add(caja3(W * 0.92, alto * 0.35, L * 0.55, panza, 0, -alto * 0.55, L * 0.42)); // la panza que cuelga
  g.add(cadera);
  const hombro = new THREE.Vector3(0, Math.sin(inclinacion) * L * 0.72, Math.cos(inclinacion) * L * 0.72).add(cadera.position);
  // Patas: las de adelante derechas hasta el piso; las de atrás dobladas a los costados.
  for (const s of [-1, 1]) {
    const hp = hombro.y;
    g.add(caja3(W * 0.26, hp, W * 0.26, pelo, s * W * 0.28, hp / 2, hombro.z + 0.05));
    g.add(caja3(W * 0.3, 0.12, W * 0.42, fuego || pelo, s * W * 0.28, 0.06, hombro.z + 0.15)); // pata (marrón en Pancho)
    g.add(caja3(W * 0.3, W * 0.55, L * 0.42, pelo, s * W * 0.42, W * 0.28, -L * 0.18));
    g.add(caja3(W * 0.28, 0.12, W * 0.55, fuego || pelo, s * W * 0.42, 0.06, L * 0.05));
  }
  if (fuego) g.add(caja3(W * 0.6, W * 0.5, 0.06, fuego, 0, hombro.y - W * 0.15, hombro.z + W * 0.42)); // pecho marrón
  // Cabeza (con cuello), hocico, nariz, ojos y orejas caídas.
  const cabeza = new THREE.Group();
  cabeza.position.set(0, hombro.y + d.cabeza * 0.55, hombro.z + 0.1);
  g.add(caja3(W * 0.55, d.cabeza * 0.8, W * 0.55, pelo, 0, hombro.y + d.cabeza * 0.1, hombro.z));
  const C = d.cabeza;
  cabeza.add(caja3(C, C * 0.9, C, pelo, 0, 0, 0));
  cabeza.add(caja3(C * 0.62, C * 0.45, d.hocico, fuego || pelo, 0, -C * 0.2, C / 2 + d.hocico / 2));
  cabeza.add(caja3(C * 0.3, C * 0.2, 0.1, mat('#0b0b0c'), 0, -C * 0.05, C / 2 + d.hocico + 0.03));
  if (d.lengua) cabeza.add(caja3(C * 0.22, 0.05, C * 0.3, mat('#e2687a'), 0, -C * 0.46, C / 2 + d.hocico * 0.75));
  const ojos = new THREE.Group();
  const cruces = new THREE.Group(); // los ojos de muerto (X)
  for (const s of [-1, 1]) {
    ojos.add(caja3(C * 0.17, C * 0.17, 0.05, mat(d.ojos), s * C * 0.24, C * 0.12, C / 2 + 0.02));
    ojos.add(caja3(C * 0.06, C * 0.06, 0.02, mat('#ffffff'), s * C * 0.24 + C * 0.04, C * 0.16, C / 2 + 0.05));
    if (fuego) ojos.add(caja3(C * 0.14, C * 0.08, 0.04, fuego, s * C * 0.24, C * 0.3, C / 2 + 0.02)); // las cejitas marrones
    for (const r of [0.8, -0.8]) {
      const x = caja3(C * 0.24, C * 0.05, 0.05, mat('#0b0b0c'), s * C * 0.24, C * 0.12, C / 2 + 0.03);
      x.rotation.z = r;
      cruces.add(x);
    }
    const oreja = caja3(C * 0.14, d.orejas * C * 1.3, C * 0.5, pelo, s * (C / 2 + 0.06), -C * 0.12, -C * 0.02);
    oreja.rotation.z = s * 0.15;
    cabeza.add(oreja);
  }
  cruces.visible = false;
  cabeza.add(ojos, cruces);
  g.add(cabeza);
  // Cola (se mueve): sale de la cadera, apoyada atrás.
  const cola = new THREE.Group();
  cola.position.set(0, W * 0.3, -L * 0.5);
  cola.add(caja3(W * 0.16, W * 0.16, d.cola, pelo, 0, 0, -d.cola / 2));
  cola.rotation.x = 0.5;
  g.add(cola);
  // El osito de peluche de Olga (como en la foto).
  if (d.osito) {
    const oso = new THREE.Group();
    const marron = mat('#b97a3c');
    oso.add(caja3(0.42, 0.34, 0.5, marron, 0, 0.17, 0));
    oso.add(caja3(0.36, 0.34, 0.34, marron, 0, 0.3, 0.38));
    oso.add(caja3(0.18, 0.12, 0.08, mat('#e8cfa6'), 0, 0.26, 0.56));
    for (const s of [-1, 1]) oso.add(caja3(0.12, 0.12, 0.08, mat('#e8cfa6'), s * 0.15, 0.5, 0.36));
    oso.position.set(W * 0.9, 0, hombro.z + 0.4);
    oso.rotation.y = -0.6;
    g.add(oso);
    g.userData.oso = oso;
  }
  return { grupo: g, cabeza, cola, ojos, cruces, oso: g.userData.oso || null };
}

export class Perros {
  constructor(escena, tycoon, ui, guardar) {
    this.escena = escena;
    this.tycoon = tycoon;
    this.ui = ui;
    this.guardar = guardar;
    this.jugador = null; // main.js
    this.modelos = {}; // id -> { ...crearPerro, mimos, etiqueta }
    this.reloj = 0;
  }

  datos(id) {
    const e = this.tycoon.estado;
    e.perros ??= {};
    e.perros[id] ??= {};
    return e.perros[id];
  }

  tiene(id) {
    return this.tycoon.estado.compras.includes(`perro_${id}`);
  }

  // Comprado y todavía no enterrado (vivo o tirado).
  visible(id) {
    const d = this.datos(id);
    return this.tiene(id) && !(d.muerto != null && this.tycoon.estado.tiempoJugado - d.muerto > UN_DIA);
  }

  vivo(id) {
    return this.tiene(id) && this.datos(id).muerto == null;
  }

  enCasa(p) {
    return p.x > T.x0 - 15 && p.x < T.x1 + 15 && p.z > T.z0 - 15 && p.z < T.z1 + 15;
  }

  // Llega la Schwepa (ladron.js, antes de aparecer). Si no estás en casa y hay perros, no entra:
  // devuelve true. Primero cada perro la echa una vez (avisando); después mata a uno sin avisar.
  llegaSchwepa() {
    if (!this.jugador || this.enCasa(this.jugador.pos)) return false;
    const vivos = PERROS.filter((p) => this.vivo(p.id));
    const defensor = vivos.find((p) => !this.datos(p.id).defendio);
    if (defensor) {
      this.datos(defensor.id).defendio = true;
      this.ui.toast(`La Schwepa te vino a robar..... ¡${defensor.nombre} defendió tu plata de la Schwepa!`, 'plata', 6000);
      sfx.ladrido(DEF_PERROS[defensor.id].ladrido);
      this.guardar?.();
      return true;
    }
    if (vivos.length) {
      this.datos(vivos[0].id).muerto = this.tycoon.estado.tiempoJugado;
      this.guardar?.();
      return true;
    }
    return false;
  }

  cercano(jugador) {
    let mejor = null;
    let dm = 3.6;
    for (const p of PERROS) {
      if (!this.vivo(p.id) || !this.modelos[p.id]) continue;
      const d = Math.hypot(jugador.pos.x - p.x, jugador.pos.z - p.z);
      if (d < dm && jugador.pos.y < 3) { dm = d; mejor = p; }
    }
    return mejor;
  }

  accion(jugador) {
    const p = this.cercano(jugador);
    return p ? `Hacerle mimos a ${p.nombre} (E)` : '';
  }

  hacer(jugador) {
    const p = this.cercano(jugador);
    if (!p) return;
    const m = this.modelos[p.id];
    m.mimos = 3;
    m.etiqueta.sprite.visible = true;
    sfx.ladrido(DEF_PERROS[p.id].ladrido);
  }

  actualizar(dt, jugador) {
    this.jugador = jugador;
    this.reloj += dt;
    for (const p of PERROS) {
      const ver = this.visible(p.id);
      let m = this.modelos[p.id];
      if (!ver) {
        if (m) { this.escena.remove(m.grupo); if (m.oso) this.escena.remove(m.oso); delete this.modelos[p.id]; }
        continue;
      }
      if (!m) {
        m = this.modelos[p.id] = crearPerro(DEF_PERROS[p.id]);
        m.grupo.position.set(p.x, 0.02, p.z);
        m.mimos = 0;
        m.etiqueta = crearEtiqueta([{ texto: '❤ ❤ ❤', tam: 70, color: '#ff4d6d' }], 3);
        m.etiqueta.sprite.position.y = 3.2;
        m.etiqueta.sprite.visible = false;
        m.grupo.add(m.etiqueta.sprite);
        this.escena.add(m.grupo);
      }
      if (!this.vivo(p.id)) {
        // Tirado de costado, con los ojos en X.
        m.grupo.rotation.set(0, 0, Math.PI / 2);
        m.grupo.position.y = DEF_PERROS[p.id].ancho * 0.5;
        if (m.oso && m.oso.parent === m.grupo) {
          // El osito queda en el piso, al lado.
          m.grupo.remove(m.oso);
          m.oso.position.set(p.x + 1.4, 0, p.z + 0.8);
          this.escena.add(m.oso);
        }
        m.ojos.visible = false;
        m.cruces.visible = true;
        m.etiqueta.sprite.visible = false;
        continue;
      }
      // Vivo: mueve la cola (más rápido con mimos) y te mira si estás cerca.
      const cerca = Math.hypot(jugador.pos.x - p.x, jugador.pos.z - p.z) < 14;
      m.cola.rotation.y = Math.sin(this.reloj * (m.mimos > 0 ? 18 : cerca ? 9 : 4)) * (m.mimos > 0 ? 0.7 : 0.35);
      const objetivo = cerca ? Math.atan2(jugador.pos.x - p.x, jugador.pos.z - p.z) : 0;
      let d = objetivo - m.cabeza.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      m.cabeza.rotation.y = THREE.MathUtils.clamp(m.cabeza.rotation.y + d * Math.min(1, dt * 5), -1, 1);
      m.cabeza.rotation.z = m.mimos > 0 ? Math.sin(this.reloj * 6) * 0.2 : 0; // ladea la cabeza
      if (m.mimos > 0) {
        m.mimos -= dt;
        m.etiqueta.sprite.position.y = 3.2 + (3 - m.mimos) * 0.4;
        if (m.mimos <= 0) m.etiqueta.sprite.visible = false;
      }
    }
  }
}
