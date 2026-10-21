import * as THREE from 'three';
import { crearPersonaje } from './personaje.js';
import { cargarCabeza, crearEtiqueta, canvasCartel, texturaDeCanvas } from './texturas.js';
import { CALLE_Z, COBRAR } from './constantes.js';
import { caja, mat, formato } from './util.js';
import { sfx } from './sfx.js';

// La Schwepa: cada tanto (5% por minuto jugado) llega por la calle en su Zanella Zapucai,
// entra por el portón, estaciona cerca del cobrador, se baja, camina hasta el botón de cobrar
// y se lleva el 30% de lo que está esperando ahí. Mientras está en el terreno el cobrador
// automático no anda (si no, nunca habría nada para robar).
const SCHWEPA = {
  id: 'schwepa', nombre: 'Schwepa', foto: 'schwepa.png', recorte: [0.52, 0.44, 0.46],
  piel: '#f2dccd', pelo: '#15110e', peinado: 'liso', remera: '#263238', pantalon: '#1b1b1b',
};
const CADA = 60;          // segundos de juego entre tiradas
const PROBABILIDAD = 0.05;
const ROBO = 0.3;
const VEL_CALLE = 26;
const VEL_TERRENO = 13;
const VEL_PIE = 9;
// Recorrido de la moto (x, z): por la calle desde el oeste, portón, borde del jardín y al cobrador.
const RUTA = [[-120, CALLE_Z - 2], [0, CALLE_Z - 2], [0, 53.5], [-48, 53.5], [-49, 36]];
const SALIDA = [[-49, 36], [-48, 53.5], [0, 53.5], [0, CALLE_Z - 2], [130, CALLE_Z - 2]];
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
      const etiqueta = crearEtiqueta([{ texto: 'Schwepa', tam: 64, color: '#ff5252' }], 4);
      etiqueta.sprite.position.y = 6.3;
      this.bot.grupo.add(etiqueta.sprite);
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
      if (!jugando || !this.tycoon.estado.compras.includes('piso_pb')) return;
      this.reloj += dt;
      if (this.reloj >= CADA) {
        this.reloj = 0;
        if (Math.random() < PROBABILIDAD) this.aparecer();
      }
      return;
    }
    if (this.estado === 'cargando') return;
    const moto = this.moto.grupo;
    const bot = this.bot.grupo;
    const enMoto = this.estado === 'llegando' || this.estado === 'yendo';
    const vel = enMoto ? (this.enTerreno(moto.position) ? VEL_TERRENO : VEL_CALLE) : VEL_PIE;
    this.moto.ruedas.forEach((r) => { if (enMoto) r.rotation.x += (vel / 0.85) * dt; });
    this.tycoon.pausaCobro = this.estado !== 'yendo' && this.enTerreno(moto.position);

    if (this.estado === 'llegando') {
      this.bot.animar(dt, 0, true, false, true);
      if (!this.avisado && this.enTerreno(moto.position)) {
        this.avisado = true;
        this.ui.toast('¡Llegó la Schwepa en su Zanella Zapucai! Cobrá antes de que te robe', 'error');
        sfx.moto();
      }
      if (this.avanzar(moto, dt, vel)) this.bajarse();
    } else if (this.estado === 'caminando' || this.estado === 'volviendo') {
      this.bot.animar(dt, VEL_PIE, true);
      if (this.avanzar(bot, dt, VEL_PIE)) {
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

  robar() {
    const banco = this.tycoon.estado.banco;
    const robo = Math.floor(banco * ROBO);
    if (robo >= 1) {
      this.tycoon.estado.banco -= robo;
      this.ui.toast(`¡La Schwepa te robó ${formato(robo)} del cobrador!`, 'error');
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
    this.escena.remove(this.moto.grupo);
    this.tycoon.pausaCobro = false;
    this.estado = 'fuera';
  }
}
