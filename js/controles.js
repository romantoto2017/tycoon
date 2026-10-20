import * as THREE from 'three';

const TECLAS = {
  adelante: ['KeyW', 'ArrowUp'],
  atras: ['KeyS', 'ArrowDown'],
  izquierda: ['KeyA', 'ArrowLeft'],
  derecha: ['KeyD', 'ArrowRight'],
  saltar: ['Space'],
};
const RADIO_STICK = 55;

// Teclado + mouse (arrastrar para girar la cámara) + táctil (joystick y botón de salto).
export class Controles {
  constructor(canvas) {
    this._activo = false;
    this.esTactil = false;
    this.sensibilidad = 1;
    this.teclas = new Set();
    this.yaw = 0;
    this.pitch = 0.42;
    this.dist = 18;
    this.joy = { x: 0, y: 0 };
    this.saltoTactil = false;
    this.punteros = new Map(); // pointerId -> { tipo: 'camara'|'stick', x, y }

    this.tactil = document.getElementById('tactil');
    this.base = document.getElementById('stick-base');
    this.knob = document.getElementById('stick-knob');

    window.addEventListener('keydown', (e) => {
      if (Object.values(TECLAS).some((t) => t.includes(e.code))) e.preventDefault();
      this.teclas.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.teclas.delete(e.code));
    window.addEventListener('blur', () => this.teclas.clear());

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', (e) => this.alApretar(e));
    canvas.addEventListener('pointermove', (e) => this.alMover(e));
    canvas.addEventListener('pointerup', (e) => this.alSoltar(e));
    canvas.addEventListener('pointercancel', (e) => this.alSoltar(e));
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.dist = THREE.MathUtils.clamp(this.dist + Math.sign(e.deltaY) * 1.5, 8, 34);
    }, { passive: false });

    const btnSaltar = document.getElementById('btn-saltar');
    btnSaltar.addEventListener('pointerdown', (e) => { e.preventDefault(); this.saltoTactil = true; });
    const soltarSalto = () => { this.saltoTactil = false; };
    btnSaltar.addEventListener('pointerup', soltarSalto);
    btnSaltar.addEventListener('pointercancel', soltarSalto);
    btnSaltar.addEventListener('pointerleave', soltarSalto);
  }

  // Al desactivar (menús abiertos) se sueltan las teclas y se ocultan los controles táctiles.
  get activo() { return this._activo; }
  set activo(v) {
    this._activo = v;
    if (!v) {
      this.teclas.clear();
      this.saltoTactil = false;
      for (const id of [...this.punteros.keys()]) this.alSoltar({ pointerId: id });
    }
    this.tactil.classList.toggle('oculto', !(v && this.esTactil));
  }

  alApretar(e) {
    if (e.pointerType === 'touch' && !this.esTactil) {
      this.esTactil = true;
      this.activo = this._activo;
    }
    if (!this.activo) return;
    e.target.setPointerCapture(e.pointerId);
    if (e.pointerType === 'touch' && e.clientX < window.innerWidth * 0.45 && ![...this.punteros.values()].some((p) => p.tipo === 'stick')) {
      this.punteros.set(e.pointerId, { tipo: 'stick', x: e.clientX, y: e.clientY });
      this.base.style.left = `${e.clientX - 65}px`;
      this.base.style.top = `${e.clientY - 65}px`;
      this.base.style.bottom = 'auto';
    } else {
      this.punteros.set(e.pointerId, { tipo: 'camara', x: e.clientX, y: e.clientY });
    }
  }

  alMover(e) {
    const p = this.punteros.get(e.pointerId);
    if (!p) return;
    if (p.tipo === 'camara') {
      const k = (e.pointerType === 'touch' ? 0.008 : 0.006) * this.sensibilidad;
      this.yaw -= (e.clientX - p.x) * k;
      this.pitch = THREE.MathUtils.clamp(this.pitch + (e.clientY - p.y) * k, 0.05, 1.35);
      p.x = e.clientX;
      p.y = e.clientY;
    } else {
      let dx = e.clientX - p.x;
      let dy = e.clientY - p.y;
      const largo = Math.hypot(dx, dy);
      if (largo > RADIO_STICK) { dx *= RADIO_STICK / largo; dy *= RADIO_STICK / largo; }
      this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.joy.x = dx / RADIO_STICK;
      this.joy.y = -dy / RADIO_STICK;
    }
  }

  alSoltar(e) {
    const p = this.punteros.get(e.pointerId);
    if (!p) return;
    this.punteros.delete(e.pointerId);
    if (p.tipo === 'stick') {
      this.joy.x = this.joy.y = 0;
      this.knob.style.transform = '';
      this.base.style.left = this.base.style.top = this.base.style.bottom = '';
    }
  }

  tecla(nombre) {
    return TECLAS[nombre].some((c) => this.teclas.has(c));
  }

  get saltar() {
    return this.activo && (this.tecla('saltar') || this.saltoTactil);
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
