import * as THREE from 'three';
import { DROPPERS } from '../data/objetos.js';
import { ITEMS, ITEMS_POR_ID } from './progresion.js';
import { caja, mat, formato } from './util.js';
import { crearEtiqueta, canvasMoneda, texturaDeCanvas, texturaCinta } from './texturas.js';
import { sfx } from './sfx.js';

// Fábrica: cinta a lo largo de Z, del lado izquierdo del terreno.
const CINTA = { x: -26, z0: -24, z1: 10, alto: 1.2, ancho: 2.4, vel: 5 };
const SLOTS_DROPPER = [-21, -15.5, -10, -4.5, 1, 6.5];
const COLECTOR_Z = 11.8;
const COBRAR = { x: -21.5, z: COLECTOR_Z };
const TAM_MONEDA = 0.6;
const MAX_MONEDAS = 300;
const ALTURA_CAIDA = 14;

const GEO_BOTON = new THREE.CylinderGeometry(1.4, 1.4, 0.3, 20);
const GEO_ARO = new THREE.CylinderGeometry(1.75, 1.75, 0.16, 20);
const MAT_VERDE = new THREE.MeshLambertMaterial({ color: '#2fd14a', emissive: '#0b4a14' });
const MAT_ROJO = new THREE.MeshLambertMaterial({ color: '#e53935', emissive: '#3a0a0a' });
const MAT_DORADO = new THREE.MeshLambertMaterial({ color: '#ffc928', emissive: '#4a3500' });

export class Tycoon {
  constructor({ escena, colisiones, estado, ui, guardar }) {
    this.escena = escena;
    this.colisiones = colisiones;
    this.estado = estado;
    this.ui = ui;
    this.guardar = guardar;

    this.multValor = 1;
    this.multVel = 1;
    this.droppers = [];     // { i, z, t }
    this.botones = [];
    this.animaciones = [];
    this.monedas = [];
    this.fabrica = null;
    this.tiempo = 0;

    const texMoneda = texturaDeCanvas(canvasMoneda(64, true));
    this.mallaMonedas = new THREE.InstancedMesh(
      new THREE.BoxGeometry(TAM_MONEDA, TAM_MONEDA, TAM_MONEDA),
      new THREE.MeshLambertMaterial({ map: texMoneda, emissive: '#3a2a00' }),
      MAX_MONEDAS,
    );
    this.mallaMonedas.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mallaMonedas.count = 0;
    this.mallaMonedas.frustumCulled = false;
    escena.add(this.mallaMonedas);
    this.dummy = new THREE.Object3D();
  }

  // Al cargar una partida: arma todo lo comprado sin animación.
  reconstruir() {
    for (const id of this.estado.compras) {
      const item = ITEMS_POR_ID[id];
      if (item) this.aplicar(item, false);
    }
    this.refrescarBotones();
  }

  get ingresoPorSegundo() {
    return this.droppers.reduce((a, d) => a + this.valorMoneda(d) / this.intervalo(d), 0);
  }

  valorMoneda(d) { return DROPPERS[d.i].valor * this.multValor; }
  intervalo(d) { return DROPPERS[d.i].cada / this.multVel; }

  // ---------- Compras ----------

  aplicar(item, animar) {
    if (item.tipo === 'dropper') {
      if (!this.fabrica) this.construirFabrica(animar);
      this.agregarDropper(item.dropper, animar);
    } else if (item.tipo === 'mejora') {
      if (item.valor) this.multValor *= item.valor;
      if (item.velocidad) this.multVel *= item.velocidad;
    }
    if (item.construir) this.agregarPieza(item.construir({ caja, mat }), animar);
  }

  intentarComprar(boton) {
    const { item } = boton;
    if (this.estado.plata < item.precio) return false;
    this.estado.plata -= item.precio;
    this.estado.compras.push(item.id);
    this.escena.remove(boton.grupo);
    this.botones.splice(this.botones.indexOf(boton), 1);
    this.aplicar(item, true);
    this.refrescarBotones();
    sfx.comprar();
    this.ui.toast(`¡${item.nombre}!`, 'ok');
    this.guardar();
    return true;
  }

  refrescarBotones() {
    const comprados = new Set(this.estado.compras);
    const conBoton = new Set(this.botones.map((b) => b.item.id));
    for (const item of ITEMS) {
      if (comprados.has(item.id) || conBoton.has(item.id)) continue;
      if (!item.requiere.every((r) => comprados.has(r))) continue;
      this.crearBoton(item);
    }
  }

  crearBoton(item) {
    const [x, y, z] = item.boton;
    const grupo = new THREE.Group();
    grupo.position.set(x, y, z);
    const aro = new THREE.Mesh(GEO_ARO, mat('#2a2a2a'));
    aro.position.y = 0.08;
    const disco = new THREE.Mesh(GEO_BOTON, MAT_ROJO);
    disco.position.y = 0.2;
    const precio = item.precio === 0 ? 'GRATIS' : formato(item.precio);
    const etiqueta = crearEtiqueta([
      { texto: item.nombre, tam: 56 },
      { texto: precio, tam: 60, color: '#8dff6a', moneda: item.precio > 0 },
    ], 6);
    etiqueta.sprite.position.y = 3.6;
    grupo.add(aro, disco, etiqueta.sprite);
    this.escena.add(grupo);
    this.botones.push({ item, grupo, disco, etiqueta, x, y, z, pisado: false, alcanza: null, fase: Math.random() * 6 });
    grupo.scale.setScalar(0.01);
    this.animaciones.push({ obj: grupo, y0: y, t: 0, dur: 0.4, caida: 0 });
  }

  // ---------- Piezas y animación ----------

  // Centra el grupo en su base (para que crezca desde el piso), registra
  // colisiones y lo agrega a la escena, cayendo desde arriba si animar = true.
  agregarPieza(grupo, animar, sinColision = false) {
    const caja3 = new THREE.Box3();
    const tmp = new THREE.Box3();
    grupo.updateMatrixWorld(true);
    grupo.traverse((o) => { if (o.isMesh) caja3.union(tmp.setFromObject(o)); });
    const centro = new THREE.Vector3((caja3.min.x + caja3.max.x) / 2, caja3.min.y, (caja3.min.z + caja3.max.z) / 2);
    grupo.children.forEach((c) => c.position.sub(centro));
    grupo.position.add(centro);
    grupo.updateMatrixWorld(true);

    if (!sinColision) {
      grupo.traverse((o) => {
        if (o.isMesh && !o.userData.noSolido) this.colisiones.push(new THREE.Box3().setFromObject(o));
      });
    }
    this.escena.add(grupo);
    if (animar) {
      const y0 = grupo.position.y;
      grupo.position.y += ALTURA_CAIDA;
      grupo.scale.setScalar(0.3);
      this.animaciones.push({ obj: grupo, y0, t: 0, dur: 0.7, caida: ALTURA_CAIDA });
    }
    return grupo;
  }

  actualizarAnimaciones(dt) {
    for (let i = this.animaciones.length - 1; i >= 0; i--) {
      const a = this.animaciones[i];
      a.t += dt;
      const k = Math.min(a.t / a.dur, 1);
      const caer = 1 - Math.pow(1 - k, 3);
      a.obj.position.y = a.y0 + (1 - caer) * a.caida;
      a.obj.scale.setScalar(easeOutBack(k));
      if (k >= 1) {
        a.obj.scale.setScalar(1);
        this.animaciones.splice(i, 1);
      }
    }
  }

  // ---------- Fábrica: cinta, colector, botón Cobrar ----------

  construirFabrica(animar) {
    const largo = CINTA.z1 - CINTA.z0;
    const cz = (CINTA.z0 + CINTA.z1) / 2;
    const cinta = new THREE.Group();
    this.texCinta = texturaCinta();
    this.texCinta.repeat.set(1, largo / 2);
    const banda = new THREE.Mesh(
      new THREE.BoxGeometry(CINTA.ancho, 0.25, largo),
      [mat('#333'), mat('#333'), new THREE.MeshLambertMaterial({ map: this.texCinta }), mat('#333'), mat('#333'), mat('#333')],
    );
    banda.position.set(CINTA.x, CINTA.alto - 0.125, cz);
    cinta.add(banda);
    cinta.add(caja(0.3, CINTA.alto + 0.2, largo, '#8a8f98', CINTA.x - CINTA.ancho / 2 - 0.15, (CINTA.alto + 0.2) / 2, cz));
    cinta.add(caja(0.3, CINTA.alto + 0.2, largo, '#8a8f98', CINTA.x + CINTA.ancho / 2 + 0.15, (CINTA.alto + 0.2) / 2, cz));
    cinta.add(caja(CINTA.ancho, CINTA.alto - 0.25, largo, '#5a5f66', CINTA.x, (CINTA.alto - 0.25) / 2, cz));
    this.agregarPieza(cinta, animar);

    const colector = new THREE.Group();
    const cx = CINTA.x;
    colector.add(caja(4, 3.2, 3.6, '#7b1fa2', cx, 1.6, COLECTOR_Z));
    const boca = caja(CINTA.ancho + 0.2, 1.2, 0.1, '#111', cx, CINTA.alto + 0.5, COLECTOR_Z - 1.81);
    boca.userData.noSolido = true;
    colector.add(boca);
    const tapa = caja(4.3, 0.3, 3.9, '#ffc928', cx, 3.35, COLECTOR_Z);
    colector.add(tapa);
    this.etiquetaColector = crearEtiqueta([{ texto: 'COLECTOR', tam: 44 }, { texto: '0', tam: 70, color: '#ffd23f', moneda: true }], 6);
    this.etiquetaColector.sprite.position.set(cx, 6.2, COLECTOR_Z);
    colector.add(this.etiquetaColector.sprite);
    this.agregarPieza(colector, animar);
    this.bancoMostrado = -1;

    const cobrar = new THREE.Group();
    const aro = new THREE.Mesh(GEO_ARO, mat('#2a2a2a'));
    aro.position.set(COBRAR.x, 0.08, COBRAR.z);
    const disco = new THREE.Mesh(GEO_BOTON, MAT_DORADO);
    disco.position.set(COBRAR.x, 0.2, COBRAR.z);
    const et = crearEtiqueta([{ texto: 'COBRAR', tam: 64, color: '#ffd23f' }], 5);
    et.sprite.position.set(COBRAR.x, 3, COBRAR.z);
    cobrar.add(aro, disco, et.sprite);
    this.agregarPieza(cobrar, animar, true);
    this.cobrar = { pisado: false, espera: 0 };

    this.fabrica = { cinta, colector };
  }

  agregarDropper(i, animar) {
    const d = DROPPERS[i];
    const z = SLOTS_DROPPER[i];
    const x = CINTA.x;
    const g = new THREE.Group();
    g.add(caja(0.5, 8, 0.5, '#555', x - 1.65, 4, z));
    g.add(caja(0.5, 8, 0.5, '#555', x + 1.65, 4, z));
    g.add(caja(3.8, 0.5, 0.6, '#555', x, 8, z));
    g.add(caja(2.8, 2, 2.8, d.color, x, 6.8, z));
    const embudo = new THREE.Mesh(new THREE.ConeGeometry(1.3, 1.2, 4), mat(d.color));
    embudo.rotation.set(Math.PI, Math.PI / 4, 0);
    embudo.position.set(x, 5.2, z);
    embudo.userData.noSolido = true;
    g.add(embudo);
    const pico = caja(0.7, 0.5, 0.7, '#333', x, 4.5, z);
    pico.userData.noSolido = true;
    g.add(pico);
    const et = crearEtiqueta([{ texto: d.nombre, tam: 54 }], 6);
    et.sprite.position.set(x, 10, z);
    g.add(et.sprite);
    this.agregarPieza(g, animar);
    // Si se animó, que espere a "aterrizar" antes de tirar monedas.
    this.droppers.push({ i, z, t: animar ? -0.7 : 0 });
  }

  // ---------- Bucle ----------

  actualizar(dt, jugador) {
    this.tiempo += dt;
    this.actualizarAnimaciones(dt);
    this.actualizarBotones(dt, jugador);
    if (!this.fabrica) return;

    this.texCinta.offset.y += (CINTA.vel * dt) / 2;
    this.texCinta.offset.y %= 1;

    for (const d of this.droppers) {
      d.t += dt;
      const intervalo = this.intervalo(d);
      while (d.t >= intervalo) {
        d.t -= intervalo;
        this.soltarMoneda(d);
      }
    }
    this.actualizarMonedas(dt);
    this.actualizarCobrar(dt, jugador);

    const banco = Math.floor(this.estado.banco);
    if (banco !== this.bancoMostrado && this.tiempo - (this.ultimoCartel || 0) > 0.15) {
      this.bancoMostrado = banco;
      this.ultimoCartel = this.tiempo;
      this.etiquetaColector.actualizar([{ texto: 'COLECTOR', tam: 44 }, { texto: formato(banco), tam: 70, color: '#ffd23f', moneda: true }]);
    }
  }

  soltarMoneda(d) {
    const valor = this.valorMoneda(d);
    if (this.monedas.length >= MAX_MONEDAS) {
      this.estado.banco += valor; // demasiadas en pantalla: va directo al colector
      return;
    }
    this.monedas.push({
      x: CINTA.x + (Math.random() - 0.5) * 0.5,
      y: 4.2,
      z: d.z + (Math.random() - 0.5) * 0.3,
      vy: 0,
      giro: Math.random() * Math.PI,
      valor,
    });
  }

  actualizarMonedas(dt) {
    const piso = CINTA.alto + TAM_MONEDA / 2;
    const fin = CINTA.z1 + 0.3;
    const m = this.monedas;
    for (let i = m.length - 1; i >= 0; i--) {
      const c = m[i];
      if (c.y > piso) {
        c.vy -= 35 * dt;
        c.y = Math.max(piso, c.y + c.vy * dt);
      } else {
        c.z += CINTA.vel * dt;
      }
      if (c.z >= fin) {
        this.estado.banco += c.valor;
        m[i] = m[m.length - 1];
        m.pop();
      }
    }
    const o = this.dummy;
    for (let i = 0; i < m.length; i++) {
      o.position.set(m[i].x, m[i].y, m[i].z);
      o.rotation.y = m[i].giro;
      o.updateMatrix();
      this.mallaMonedas.setMatrixAt(i, o.matrix);
    }
    this.mallaMonedas.count = m.length;
    this.mallaMonedas.instanceMatrix.needsUpdate = true;
  }

  actualizarCobrar(dt, jugador) {
    const dx = jugador.pos.x - COBRAR.x;
    const dz = jugador.pos.z - COBRAR.z;
    const encima = dx * dx + dz * dz < 1.7 * 1.7 && jugador.pos.y < 1;
    const c = this.cobrar;
    c.espera -= dt;
    if (encima && this.estado.banco >= 1 && (!c.pisado || c.espera <= 0)) {
      const monto = Math.floor(this.estado.banco);
      this.estado.plata += monto;
      this.estado.banco -= monto;
      c.espera = 0.6;
      sfx.cobrar();
      this.ui.toast(`+${formato(monto)}`, 'plata');
    }
    c.pisado = encima;
  }

  actualizarBotones(dt, jugador) {
    for (let i = this.botones.length - 1; i >= 0; i--) {
      const b = this.botones[i];
      b.fase += dt * 2.5;
      b.etiqueta.sprite.position.y = 3.6 + Math.sin(b.fase) * 0.15;

      const alcanza = this.estado.plata >= b.item.precio;
      if (alcanza !== b.alcanza) {
        b.alcanza = alcanza;
        b.disco.material = alcanza ? MAT_VERDE : MAT_ROJO;
      }

      const dx = jugador.pos.x - b.x;
      const dz = jugador.pos.z - b.z;
      const encima = dx * dx + dz * dz < 1.7 * 1.7 && Math.abs(jugador.pos.y - b.y) < 1;
      if (encima) {
        if (!this.intentarComprar(b) && !b.pisado) {
          sfx.error();
          this.ui.toast(`Te faltan ${formato(b.item.precio - this.estado.plata)}`, 'error');
        }
      }
      b.pisado = encima;
    }
  }
}

function easeOutBack(k) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
}
