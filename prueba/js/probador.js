import * as THREE from 'three';

// Vista 3D del ropero: el personaje girando despacito en un canvas aparte. El renderer se crea
// al abrir y se libera al cerrar (así no queda un segundo contexto de WebGL ocupando memoria).
export class Probador {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = null;
    this.modelo = null;
    this.angulo = 0.5;
  }

  abrir() {
    if (this.renderer) return;
    // Canvas nuevo cada vez: el anterior queda con el contexto liberado.
    const nuevo = this.canvas.cloneNode();
    this.canvas.replaceWith(nuevo);
    this.canvas = nuevo;
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.escena = new THREE.Scene();
    this.escena.add(new THREE.HemisphereLight('#ffffff', '#6b6b78', 1.7));
    const sol = new THREE.DirectionalLight('#ffffff', 1.3);
    sol.position.set(4, 9, 7);
    this.escena.add(sol);
    const piso = new THREE.Mesh(new THREE.CircleGeometry(3.2, 32), new THREE.MeshBasicMaterial({ color: '#2c2c34' }));
    piso.rotation.x = -Math.PI / 2;
    this.escena.add(piso);
    this.camara = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    this.camara.position.set(0, 4.2, 15.5);
    this.camara.lookAt(0, 2.9, 0);
    this.reloj = new THREE.Clock();
    // Arrastrando se gira a mano.
    let x0 = null;
    this.canvas.onpointerdown = (e) => { x0 = e.clientX; this.canvas.setPointerCapture(e.pointerId); };
    this.canvas.onpointermove = (e) => { if (x0 !== null) { this.angulo += (e.clientX - x0) * 0.012; x0 = e.clientX; this.tocado = 2; } };
    this.canvas.onpointerup = () => { x0 = null; };
    const bucle = () => {
      if (!this.renderer) return;
      this.cuadro = requestAnimationFrame(bucle);
      const dt = Math.min(this.reloj.getDelta(), 0.05);
      const w = this.canvas.clientWidth;
      const h = this.canvas.clientHeight;
      if (w && h && (this.canvas.width !== Math.round(w * this.renderer.getPixelRatio()) || this.ancho !== w || this.alto !== h)) {
        this.ancho = w;
        this.alto = h;
        this.renderer.setSize(w, h, false);
        this.camara.aspect = w / h;
        this.camara.updateProjectionMatrix();
      }
      if ((this.tocado -= dt) <= 0) this.angulo += dt * 0.5;
      if (this.modelo) {
        this.modelo.grupo.rotation.y = this.angulo;
        this.modelo.animar(dt, 0, true);
      }
      this.renderer.render(this.escena, this.camara);
    };
    this.tocado = 0;
    bucle();
  }

  mostrar(modelo) {
    if (this.modelo) {
      this.escena.remove(this.modelo.grupo);
      this.modelo.liberar?.();
    }
    this.modelo = modelo;
    if (modelo) this.escena.add(modelo.grupo);
  }

  cerrar() {
    if (!this.renderer) return;
    cancelAnimationFrame(this.cuadro);
    this.mostrar(null);
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer = null;
  }
}
