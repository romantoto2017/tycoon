import * as THREE from 'three';

const TECLAS = {
  adelante: ['KeyW', 'ArrowUp'],
  atras: ['KeyS', 'ArrowDown'],
  izquierda: ['KeyA', 'ArrowLeft'],
  derecha: ['KeyD', 'ArrowRight'],
  saltar: ['Space'],
};
const RADIO_STICK = 60;
// Distancias de cámara como en Roblox: arranca a 12,5 y con zoom va de primera persona a lejos.
export const ZOOM = { inicial: 12.5, min: 0.5, max: 40, primeraPersona: 1.2 };

// Controles al estilo Roblox.
// PC: WASD/flechas, espacio, arrastrar con el mouse (botón derecho o izquierdo) para girar la
// cámara, rueda o I/O para el zoom, coma/punto para girar de a poco, Shift para el Shift Lock
// (en el auto, Shift es derrapar)
// y C para agacharse (solo los personajes que pueden).
// Celu: joystick que aparece donde apoyás el pulgar izquierdo, arrastrar el resto de la
// pantalla para girar, pellizcar para el zoom y el botón de salto (mantenerlo salta seguido).
export class Controles {
  constructor(canvas) {
    this.canvas = canvas;
    this._activo = false;
    // Celu/tablet: los controles táctiles aparecen desde el arranque (no recién al primer toque).
    this.esTactil = matchMedia('(pointer: coarse)').matches;
    this.sensibilidad = 1;
    this.teclas = new Set();
    this.yaw = 0;
    this.pitch = 0.35;
    this.dist = ZOOM.inicial;
    this.shiftLock = false;
    this.agacharse = false; // solo cuenta si el personaje puede (Jeipi)
    this.armado = false; // con el AK en la mano: clic izquierdo dispara (la cámara, con el derecho)
    this.disparando = false;
    this.apunte = { x: 0, y: 0 }; // dónde está el mouse (en el celu se apunta al centro)
    this.joy = { x: 0, y: 0 };
    this.saltoTactil = false;
    this.punteros = new Map(); // pointerId -> { tipo: 'camara'|'stick', x, y, x0, y0 }
    this.alTocar = null; // toque corto (o clic sin arrastrar) en la pantalla: (x, y)
    this.pellizco = 0; // distancia entre dos dedos de cámara

    this.tactil = document.getElementById('tactil');
    this.base = document.getElementById('stick-base');
    this.knob = document.getElementById('stick-knob');
    this.mira = document.getElementById('mira');

    window.addEventListener('keydown', (e) => {
      if (Object.values(TECLAS).some((t) => t.includes(e.code))) e.preventDefault();
      if (!e.repeat && this.activo) this.atajo(e.code);
      this.teclas.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.teclas.delete(e.code));
    window.addEventListener('blur', () => this.teclas.clear());

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', (e) => this.alApretar(e));
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse') { this.apunte.x = e.clientX; this.apunte.y = e.clientY; }
    });
    canvas.addEventListener('pointermove', (e) => this.alMover(e));
    canvas.addEventListener('pointerup', (e) => this.alSoltar(e));
    canvas.addEventListener('pointercancel', (e) => this.alSoltar(e));
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (this.activo) this.zoom(Math.sign(e.deltaY) * Math.max(1, this.dist * 0.12));
    }, { passive: false });
    // Shift Lock: el mouse queda trabado y mueve la cámara.
    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement !== canvas) return;
      this.girar(e.movementX, e.movementY, 0.0035);
    });
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement !== canvas && this.shiftLock) this.ponerShiftLock(false);
    });

    const btnSaltar = document.getElementById('btn-saltar');
    btnSaltar.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.saltoTactil = true;
      btnSaltar.classList.add('apretado');
    });
    const soltarSalto = () => {
      this.saltoTactil = false;
      btnSaltar.classList.remove('apretado');
    };
    btnSaltar.addEventListener('pointerup', soltarSalto);
    btnSaltar.addEventListener('pointercancel', soltarSalto);
    btnSaltar.addEventListener('pointerleave', soltarSalto);

    const btnDisparar = document.getElementById('btn-disparar');
    btnDisparar.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.disparando = true;
      btnDisparar.classList.add('apretado');
    });
    const soltarDisparo = () => {
      this.disparando = false;
      btnDisparar.classList.remove('apretado');
    };
    btnDisparar.addEventListener('pointerup', soltarDisparo);
    btnDisparar.addEventListener('pointercancel', soltarDisparo);
    btnDisparar.addEventListener('pointerleave', soltarDisparo);
  }

  // Al desactivar (menús abiertos) se sueltan las teclas y se ocultan los controles táctiles.
  get activo() { return this._activo; }
  set activo(v) {
    this._activo = v;
    if (!v) {
      this.teclas.clear();
      this.saltoTactil = false;
      this.derrapeTactil = false;
      this.disparando = false;
      for (const id of [...this.punteros.keys()]) this.alSoltar({ pointerId: id });
      if (this.shiftLock) this.ponerShiftLock(false);
    }
    this.tactil.classList.toggle('oculto', !(v && this.esTactil));
  }

  get primeraPersona() { return this.dist <= ZOOM.primeraPersona; }

  atajo(code) {
    // Manejando, Shift es derrapar (mientras se mantiene), no el Shift Lock.
    if (code === 'ShiftLeft' || code === 'ShiftRight') { if (!this.manejando) this.ponerShiftLock(!this.shiftLock); }
    else if (code === 'KeyC') this.agacharse = !this.agacharse;
    else if (code === 'KeyI') this.zoom(-Math.max(1, this.dist * 0.2));
    else if (code === 'KeyO') this.zoom(Math.max(1, this.dist * 0.2));
    else if (code === 'Comma') this.yaw += Math.PI / 4;
    else if (code === 'Period') this.yaw -= Math.PI / 4;
  }

  ponerShiftLock(v) {
    this.shiftLock = v && !this.esTactil;
    if (this.shiftLock && document.pointerLockElement !== this.canvas) this.canvas.requestPointerLock?.();
    if (!this.shiftLock && document.pointerLockElement === this.canvas) document.exitPointerLock?.();
  }

  zoom(delta) {
    let d = this.dist + delta;
    // Como en Roblox: cerca de la cabeza salta directo a primera persona.
    if (d < ZOOM.primeraPersona + 0.4) d = delta < 0 ? ZOOM.min : ZOOM.primeraPersona + 0.8;
    this.dist = THREE.MathUtils.clamp(d, ZOOM.min, ZOOM.max);
  }

  girar(dx, dy, k) {
    this.yaw -= dx * k * this.sensibilidad;
    const min = this.primeraPersona ? -1.4 : -0.9;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dy * k * this.sensibilidad, min, 1.4);
  }

  // Zona del joystick: mitad izquierda, parte de abajo (como el thumbstick dinámico de Roblox).
  enZonaStick(x, y) {
    return x < window.innerWidth * 0.4 && y > window.innerHeight * 0.35;
  }

  alApretar(e) {
    if (e.pointerType === 'touch' && !this.esTactil) {
      this.esTactil = true;
      this.activo = this._activo;
    }
    if (!this.activo) return;
    e.target.setPointerCapture?.(e.pointerId);
    if (e.pointerType === 'mouse' && e.button === 0 && this.armado) {
      this.punteros.set(e.pointerId, { tipo: 'disparo' });
      this.apunte.x = e.clientX;
      this.apunte.y = e.clientY;
      this.disparando = true;
      return;
    }
    const hayStick = [...this.punteros.values()].some((p) => p.tipo === 'stick');
    if (e.pointerType === 'touch' && !hayStick && this.enZonaStick(e.clientX, e.clientY)) {
      this.punteros.set(e.pointerId, { tipo: 'stick', x0: e.clientX, y0: e.clientY });
      this.base.style.left = `${e.clientX}px`;
      this.base.style.top = `${e.clientY}px`;
      this.base.classList.add('activo');
    } else {
      this.punteros.set(e.pointerId, { tipo: 'camara', x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now(), boton: e.button });
      this.pellizco = 0;
    }
  }

  dedosCamara() {
    return [...this.punteros.values()].filter((p) => p.tipo === 'camara');
  }

  alMover(e) {
    const p = this.punteros.get(e.pointerId);
    if (!p || p.tipo === 'disparo') return;
    if (p.tipo === 'camara') {
      const dedos = this.dedosCamara();
      if (dedos.length >= 2) {
        // Pellizco: zoom.
        p.x = e.clientX;
        p.y = e.clientY;
        const d = Math.hypot(dedos[0].x - dedos[1].x, dedos[0].y - dedos[1].y);
        if (this.pellizco) this.zoom((this.pellizco - d) * 0.06);
        this.pellizco = d;
        return;
      }
      if (document.pointerLockElement !== this.canvas) {
        this.girar(e.clientX - p.x, e.clientY - p.y, e.pointerType === 'touch' ? 0.009 : 0.006);
      }
      p.x = e.clientX;
      p.y = e.clientY;
    } else {
      let dx = e.clientX - p.x0;
      let dy = e.clientY - p.y0;
      const largo = Math.hypot(dx, dy);
      if (largo > RADIO_STICK) { dx *= RADIO_STICK / largo; dy *= RADIO_STICK / largo; }
      this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      // Zona muerta chica y respuesta completa antes del borde.
      const f = largo < 6 ? 0 : 1 / (RADIO_STICK * 0.85);
      this.joy.x = THREE.MathUtils.clamp(dx * f, -1, 1);
      this.joy.y = THREE.MathUtils.clamp(-dy * f, -1, 1);
    }
  }

  alSoltar(e) {
    const p = this.punteros.get(e.pointerId);
    if (!p) return;
    this.punteros.delete(e.pointerId);
    if (p.tipo === 'disparo') this.disparando = false;
    if (p.tipo === 'stick') {
      this.joy.x = this.joy.y = 0;
      this.knob.style.transform = '';
      this.base.style.left = this.base.style.top = '';
      this.base.classList.remove('activo');
    } else {
      this.pellizco = 0;
      const corto = performance.now() - p.t0 < 350 && Math.hypot(p.x - p.x0, p.y - p.y0) < 12;
      if (corto && p.boton === 0 && e.clientX !== undefined && this.dedosCamara().length === 0) {
        const trabado = document.pointerLockElement === this.canvas;
        this.alTocar?.(trabado ? window.innerWidth / 2 : p.x0, trabado ? window.innerHeight / 2 : p.y0);
      }
    }
  }

  tecla(nombre) {
    return TECLAS[nombre].some((c) => this.teclas.has(c));
  }

  get saltar() {
    return this.activo && (this.tecla('saltar') || this.saltoTactil);
  }

  // Derrapar (en el auto): Shift o el botón de derrapar, mientras se mantienen.
  get derrapar() {
    return this.activo && (this.teclas.has('ShiftLeft') || this.teclas.has('ShiftRight') || this.derrapeTactil);
  }

  // Ejes crudos (para manejar): x = doblar (+ derecha), y = acelerar (+ adelante).
  ejes(salida) {
    salida.x = 0;
    salida.y = 0;
    if (!this.activo) return salida;
    salida.x = THREE.MathUtils.clamp(this.joy.x + (this.tecla('derecha') ? 1 : 0) - (this.tecla('izquierda') ? 1 : 0), -1, 1);
    salida.y = THREE.MathUtils.clamp(this.joy.y + (this.tecla('adelante') ? 1 : 0) - (this.tecla('atras') ? 1 : 0), -1, 1);
    return salida;
  }

  // Dirección de movimiento en el mundo (XZ), relativa a hacia dónde mira la cámara.
  direccion(salida) {
    salida.set(0, 0, 0);
    if (!this.activo) return salida;
    let x = this.joy.x + (this.tecla('derecha') ? 1 : 0) - (this.tecla('izquierda') ? 1 : 0);
    let y = this.joy.y + (this.tecla('adelante') ? 1 : 0) - (this.tecla('atras') ? 1 : 0);
    const largo = Math.hypot(x, y);
    if (largo > 1) { x /= largo; y /= largo; }
    const s = Math.sin(this.yaw);
    const c = Math.cos(this.yaw);
    // adelante = (-sin, -cos), derecha = (cos, -sin)
    salida.x = -s * y + c * x;
    salida.z = -c * y - s * x;
    return salida;
  }
}
