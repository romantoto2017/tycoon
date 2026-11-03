import * as THREE from 'three';
import { Paseante } from './dufre.js';
import { liberarAlSubir } from './texturas.js';

// Hilario José: solo en la ciudad (da vueltas a la plaza, como Dufre: Paseante), con el traje de
// PedidosYa (campera y pantalón rojos con vivos blancos, el casco rojo y la mochila de reparto:
// herramientas/hilario.py), arriba de su hoverboard rojo con luces azules y un matcha de
// Starbucks en la mano. Si te ve, te dice alguna de las suyas.
export const HILARIO = {
  id: 'hilario', nombre: 'Hilario José', foto: 'hilario.jpeg', recorte: [0.5, 0.5, 1], piel: '#d9ac8f', pelo: '#171110', peinado: 'ondulado',
  remera: '#de1628', pantalon: '#de1628', mangasLargas: true,
  remeraFotos: { frente: 'ropa/hilario_frente.jpg', espalda: 'ropa/hilario_espalda.jpg', manga: 'ropa/hilario_manga.jpg', tela: 'ropa/hilario_tela.jpg' },
};
const FRASES = ['Puta, tomo matcha', 'Y soy de nicho', 'De hecho, yo uso SoundCloud'];
const ALTO_HOVER = 0.55; // cuánto queda parado arriba del hoverboard
const ROJO = '#de1628';
const lambert = (c) => new THREE.MeshLambertMaterial({ color: c });
const caja = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); return b; };

// Hoverboard (las dos ruedas a los costados de los pies), apoyado en y = 0, mirando a +z.
function hoverboard() {
  const g = new THREE.Group();
  const rojo = lambert(ROJO);
  const negro = lambert('#141416');
  const led = new THREE.MeshBasicMaterial({ color: '#3f86ff' });
  g.add(caja(1.5, 0.22, 0.62, rojo, 0, 0.42, 0)); // el cuerpo del medio
  for (const s of [-1, 1]) {
    const rueda = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.32, 16), negro);
    rueda.rotation.z = Math.PI / 2;
    rueda.position.set(s * 1.02, 0.42, 0);
    g.add(rueda);
    g.add(caja(0.42, 0.5, 1.0, rojo, s * 1.02, 0.66, 0)); // guardabarros
    g.add(caja(0.62, 0.05, 0.5, negro, s * 0.42, 0.55, 0)); // apoyapié
    g.add(caja(0.3, 0.08, 0.06, led, s * 1.02, 0.6, 0.51)); // luz azul de adelante
  }
  // Brillo azul en el piso.
  const brillo = new THREE.Mesh(new THREE.CircleGeometry(1.4, 20), new THREE.MeshBasicMaterial({ color: '#3f86ff', transparent: true, opacity: 0.25, depthWrite: false }));
  brillo.rotation.x = -Math.PI / 2;
  brillo.position.y = 0.03;
  g.add(brillo);
  return g;
}

// Vaso de matcha de Starbucks: plástico transparente, el verde adentro, tapa y sorbete verde.
function matcha() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.6, 12), new THREE.MeshLambertMaterial({ color: '#e8f2e4', transparent: true, opacity: 0.45 })));
  const verde = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.48, 12), lambert('#9cc46a'));
  verde.position.y = -0.05;
  g.add(verde);
  const tapa = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.21, 0.06, 12), lambert('#f2f2f0'));
  tapa.position.y = 0.32;
  g.add(tapa);
  const sorbete = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 6), lambert('#1e7d46'));
  sorbete.position.set(0.05, 0.55, 0);
  g.add(sorbete);
  // El logo verde de la sirena (redondo), adelante.
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = '#00704a';
  x.beginPath(); x.arc(32, 32, 30, 0, Math.PI * 2); x.fill();
  x.strokeStyle = '#ffffff';
  x.lineWidth = 3;
  x.beginPath(); x.arc(32, 32, 20, 0, Math.PI * 2); x.stroke();
  x.fillStyle = '#ffffff';
  x.beginPath(); x.arc(32, 28, 7, 0, Math.PI * 2); x.fill();
  x.fillRect(24, 34, 16, 8);
  const t = liberarAlSubir(new THREE.CanvasTexture(c));
  t.colorSpace = THREE.SRGBColorSpace;
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), new THREE.MeshBasicMaterial({ map: t, transparent: true }));
  logo.position.set(0, 0, 0.2);
  g.add(logo);
  return g;
}

export class Hilario extends Paseante {
  constructor(escena, ui) {
    super(escena, ui, HILARIO, { vel: 9, sinPasos: true, lugar: 'ciudad' });
    this.frase = Math.floor(Math.random() * FRASES.length);
  }

  async crear() {
    await super.crear();
    const m = this.modelo;
    const { cabeza, cuerpo, piernaI, piernaD, fondoTorso } = m.partes;
    // Casco rojo de bici, con las rejillas negras.
    const casco = caja(1.46, 0.5, 1.5, lambert(ROJO), 0, 0.82, -0.02);
    for (const x of [-0.35, 0, 0.35]) casco.add(caja(0.12, 0.06, 1.2, lambert('#1b1b1d'), x, 0.25, 0));
    cabeza.add(casco);
    // Los vivos blancos a los costados del pantalón.
    const blanco = lambert('#f6f6f4');
    for (const [p, s] of [[piernaI, -1], [piernaD, 1]]) {
      const ancho = new THREE.Box3().setFromObject(p.muslo.children[0]).getSize(new THREE.Vector3()).x / 2;
      p.muslo.add(caja(0.05, 1, 0.12, blanco, s * (ancho + 0.02), -0.5, 0));
      p.rodilla.add(caja(0.05, 1, 0.12, blanco, s * (ancho + 0.02), -0.5, 0));
    }
    // La mochila de reparto en la espalda (el logo atrás).
    const tex = new THREE.TextureLoader().load('assets/especiales/hilario_mochila.jpg');
    tex.colorSpace = THREE.SRGBColorSpace;
    const rojo = lambert('#d01426');
    const mochila = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2, 1.25), [rojo, rojo, rojo, rojo, rojo, new THREE.MeshLambertMaterial({ map: tex })]);
    mochila.position.set(0, 1.55, -(fondoTorso / 2 + 0.65));
    cuerpo.add(mochila);
    // El matcha en la mano derecha y el hoverboard abajo.
    this.vaso = matcha();
    this.vaso.position.set(0, -1.95, 0.25);
    m.manoD.add(this.vaso);
    this.hover = hoverboard();
    this.hover.position.y = -ALTO_HOVER;
    m.grupo.add(this.hover);
    this.ubicar();
  }

  ubicar() {
    super.ubicar();
    if (this.modelo) this.modelo.grupo.position.y += ALTO_HOVER;
  }

  alHablar() {
    this.hablar(FRASES[this.frase++ % FRASES.length]);
  }

  actualizar(dt, jugador, jugando) {
    const cerca = super.actualizar(dt, jugador, jugando);
    if (!this.modelo) return cerca;
    // El brazo con el matcha doblado al frente (el vaso derecho).
    const b = this.modelo.partes.brazoD;
    b.rotation.set(-0.55, 0, 0);
    b.codo.rotation.x = -1.0;
    this.vaso.rotation.x = 1.55;
    return cerca;
  }
}
