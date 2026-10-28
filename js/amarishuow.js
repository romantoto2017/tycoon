import * as THREE from 'three';
import { crearPersonaje } from './personaje.js';
import { cargarCabeza, crearEtiqueta } from './texturas.js';
import { Paseante } from './dufre.js';
import { brazoA, ofrecerMano, empezarChoque, moverChoque } from './gimnasio.js';
import { sfx } from './sfx.js';

// El Amarishuow: un cuerpo normal todo amarillo (cabeza incluida, sin cara, sin ropa, sin
// nada). A veces pasea como Dufre (vereda de la mansión o plaza de la ciudad, Paseante) y a
// veces está parado en el Power Camp mirando el celu: si te acercás ahí, guarda el celu y te
// ofrece la mano para chocarla (como Kelvin y Ottati).
const AMARILLO = '#ffd21f';
export const AMARISHUOW = {
  id: 'amarishuow', nombre: 'Amarishuow', sinFoto: true, piel: AMARILLO, pelo: AMARILLO, peinado: 'rapado',
  remera: AMARILLO, pantalon: AMARILLO,
};
const LUGARES = ['casa', 'ciudad', 'gym'];
const GYM_LUGAR = { x: -468, z: 46, mira: Math.PI * 0.75 }; // en el gym, cerca de la entrada
const CAMBIO = 240;
const LO_VE = 11;
const ALCANCE = 5.4;

export class Amarishuow extends Paseante {
  constructor(escena, ui) {
    super(escena, ui, AMARISHUOW);
    this.oferta = 0;
    this.choque = null;
    this.cambio = CAMBIO;
    this.lugarAhora = LUGARES[Math.floor(Math.random() * LUGARES.length)];
    if (this.lugarAhora !== 'gym') this.ir(this.lugarAhora);
  }

  async crear() {
    this.cargando = true;
    const p = this.personaje;
    const cab = await cargarCabeza(p);
    // Todo amarillo: sin cara, sin pelo, sin nada.
    for (const c of [cab.frente, cab.der, cab.izq, cab.atras, cab.arriba, cab.abajo]) {
      const g = c.getContext('2d');
      g.fillStyle = AMARILLO;
      g.fillRect(0, 0, c.width, c.height);
    }
    const m = crearPersonaje(p, cab);
    const nombre = crearEtiqueta([{ texto: p.nombre, tam: 60, color: '#ffe066' }], 4);
    nombre.sprite.position.y = 6.6;
    m.grupo.add(nombre.sprite);
    this.etiqueta = crearEtiqueta([{ texto: ' ', tam: 52, color: '#ffffff' }], 7);
    this.etiqueta.sprite.position.y = 8.1;
    this.etiqueta.sprite.visible = false;
    m.grupo.add(this.etiqueta.sprite);
    // El celu (solo en el gym): negro con la pantalla prendida, en la mano derecha.
    const pantalla = new THREE.MeshBasicMaterial({ color: '#9fd3ff' });
    const negro = new THREE.MeshLambertMaterial({ color: '#16171a' });
    this.celu = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.95, 0.08), [negro, negro, negro, negro, negro, pantalla]);
    this.celu.visible = false;
    m.partes.cuerpo.add(this.celu);
    this.escena.add(m.grupo);
    this.modelo = m;
    this.ubicar();
  }

  ubicar() {
    if (this.lugarAhora === 'gym') this.modelo?.grupo.position.set(GYM_LUGAR.x, 0.25, GYM_LUGAR.z);
    else super.ubicar();
  }

  // Parado mirando el celu: la mano derecha lo levanta a la cara y la cabeza gacha.
  mirarCelu(si) {
    const { cuerpo, cabeza, brazoD, fondoTorso } = this.modelo.partes;
    this.celu.visible = si;
    if (si) {
      const zc = fondoTorso / 2 + 0.68;
      brazoA(brazoD, new THREE.Vector3(0.36, 1.86, zc + 0.45), new THREE.Vector3(0.7, -1, -0.3));
      this.celu.position.set(0.3, 2.22, zc + 0.5);
      this.celu.rotation.x = 0.3;
      cabeza.rotation.x = 0.4;
    } else {
      brazoD.rotation.set(0, 0, 0);
      brazoD.codo.rotation.set(0, 0, 0);
      cabeza.rotation.x = 0;
    }
    cuerpo.updateMatrixWorld(true);
  }

  accion(jugador) {
    return this.modelo && this.lugarAhora === 'gym' && this.oferta > 0 && !this.choque && this.distancia(jugador.pos) < ALCANCE ? 'Chocar la mano con el Amarishuow (E)' : '';
  }

  hacer(jugador) {
    if (!this.accion(jugador)) return;
    this.choque = empezarChoque(jugador, this.modelo.grupo.position);
    this.oferta = 0;
  }

  distancia(pos) {
    if (this.lugarAhora === 'gym') return Math.hypot(pos.x - GYM_LUGAR.x, pos.z - GYM_LUGAR.z);
    return super.distancia(pos);
  }

  actualizar(dt, jugador, jugando) {
    if (!this.modelo) {
      if (!this.cargando) this.crear();
      return;
    }
    const d = this.distancia(jugador.pos);
    // Cada tanto se muda (a pasear o al gym), si no lo estás viendo.
    if ((this.cambio -= dt) <= 0) {
      this.cambio = CAMBIO;
      if (d > 150 && !this.choque) {
        const otro = LUGARES[Math.floor(Math.random() * LUGARES.length)];
        this.lugarAhora = otro;
        this.oferta = 0;
        if (otro !== 'gym') this.ir(otro);
        else this.ubicar();
        this.mirarCelu(false);
      }
    }
    if (this.lugarAhora !== 'gym') {
      if (this.celu.visible) this.mirarCelu(false);
      super.actualizar(dt, jugador, jugando);
      return;
    }
    // En el gym.
    const g = this.modelo.grupo;
    const cerca = jugando && d < LO_VE && Math.abs(jugador.pos.y - g.position.y) < 4;
    let mira = GYM_LUGAR.mira;
    if (cerca) {
      mira = Math.atan2(jugador.pos.x - g.position.x, jugador.pos.z - g.position.z);
      if (!this.dijo) {
        this.dijo = true;
        this.oferta = 14;
      }
    } else if (d > LO_VE + 8) this.dijo = false;
    let a = mira - g.rotation.y;
    a = Math.atan2(Math.sin(a), Math.cos(a));
    g.rotation.y += a * Math.min(1, dt * 6);
    this.modelo.animar(dt, 0, true);
    if (!cerca) this.oferta = 0;
    if (this.oferta > 0) this.oferta -= dt;
    // Con el celu mientras nadie le da bola; si estás cerca lo guarda y te ofrece la mano.
    const conCelu = !cerca && !this.choque;
    if (conCelu !== this.celu.visible) this.mirarCelu(conCelu);
    else if (conCelu) this.mirarCelu(true); // animar() le baja el brazo en cada cuadro
    if (this.oferta > 0 && !this.choque) ofrecerMano(this.modelo);
    else if (this.mano && !this.choque) {
      this.modelo.partes.brazoI.rotation.set(0, 0, 0);
      this.modelo.partes.brazoI.codo.rotation.set(0, 0, 0);
    }
    this.mano = this.oferta > 0 && !this.choque;
    if (this.choque) {
      const c = this.choque;
      c.t += dt;
      if (c.t >= 0.35 && !c.sono) { c.sono = true; sfx.choque(); }
      if (moverChoque(c, [this.modelo, jugador.modelo])) this.choque = null;
    }
  }
}
