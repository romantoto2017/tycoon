import * as THREE from 'three';
import { crearPersonaje } from './personaje.js';
import { cargarCabeza, cargarImagen, crearEtiqueta, liberarAlSubir } from './texturas.js';
import { vestido } from './vestir.js';
import { cargarAuto } from './auto.js';
import { COSTA as CO, CALLE_Z } from './constantes.js';
import { caja, formato } from './util.js';
import { sfx } from './sfx.js';

// Nico Baraja: aparece con la mansión al 99%, al final de la calle (antes de la barrera de la
// costa), apoyado en su Koenigsegg Agera. Por 200B te habilita el negocio: se saca la barrera y
// queda abierta la costa (estado.costa, guardado). Cuerpo escaneado de su foto
// (herramientas/nicobaraja.py): sin remera, con el tatuaje del pecho y la panza y la manga del
// brazo derecho tal cual, las cadenas de oro, el short de jean con el cinto trenzado y las Jordan.
export const NICO = {
  id: 'nicobaraja', nombre: 'Nico Baraja', foto: 'nicobaraja.jpeg', recorte: [0.5, 0.5, 1], piel: '#d8a684', pelo: '#e6e2d8', peinado: 'liso',
  remera: '#d8a684', pantalon: '#5d86b6',
};
const AGERA = { id: 'koenigsegg_agera', archivo: 'koenigsegg_agera.glb', largo: 4.29 };
const CERCA = 5;
const ORO = new THREE.MeshPhongMaterial({ color: '#e0b443', specular: '#fff3c0', shininess: 90 });

function lienzo(w, h, dibujar) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  dibujar(c.getContext('2d'), w, h);
  const t = liberarAlSubir(new THREE.CanvasTexture(c));
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// La piel con la tinta escaneada arriba (una textura por parte del cuerpo).
const conTinta = (piel, img, w = 256, h = 256) => lienzo(w, h, (g) => {
  g.fillStyle = piel;
  g.fillRect(0, 0, w, h);
  if (img) g.drawImage(img, 0, 0, w, h);
});

export async function crearNico() {
  const [cab, ropa, torso, brazo, antebrazo, cuello] = await Promise.all([
    cargarCabeza(NICO), vestido({ pies: 'jordanbalvin' }),
    ...['torso.png', 'brazo.png', 'antebrazo.png', 'cuello.png'].map((f) => cargarImagen(`assets/ropa/nicobaraja_${f}`)),
  ]);
  let lisa = null; // la piel (la misma en todo el cuerpo)
  const p = {
    ...NICO,
    detallar: ({ cuerpo, brazoI, brazoD, torso: malla, anchoTorso: A, fondoTorso: D, matPiel, extras }) => {
      const piel = matPiel.color.getStyle();
      const basico = (map) => { const m = new THREE.MeshBasicMaterial({ map }); extras.push(m, map); return m; };
      lisa = new THREE.MeshBasicMaterial({ color: matPiel.color });
      extras.push(lisa);
      brazoD.traverse((o) => { if (o.isMesh) o.material = lisa; }); // sin remera: todo piel
      // El pecho y la panza (con el del cuello arriba, entre las clavículas).
      const frente = lienzo(256, 320, (g, w, h) => {
        g.fillStyle = piel;
        g.fillRect(0, 0, w, h);
        if (torso) g.drawImage(torso, 0, h * 0.04, w, h * 0.96);
        if (cuello) g.drawImage(cuello, w * 0.36, 0, w * 0.28, h * 0.06);
      });
      malla.material = [lisa, lisa, lisa, lisa, basico(frente), lisa];
      // La manga del brazo derecho (en el muñeco, el de la izquierda: mira hacia adelante):
      // el brazo hasta el codo y el antebrazo, alrededor (adelante, atrás y los costados).
      const vuelta = (mesh, img) => {
        const m = basico(conTinta(piel, img, 128, 256));
        mesh.material = [m, m, lisa, lisa, m, m];
      };
      const [arriba, medio] = brazoI.children.filter((o) => o.isMesh);
      vuelta(arriba, brazo);
      medio.material = lisa;
      vuelta(brazoI.codo.children.find((o) => o.isMesh), antebrazo);
      // Las tres cadenas de oro, de más corta a más larga, colgando sobre el pecho.
      const arriba0 = malla.position.y + 1;
      [0.32, 0.42, 0.55].forEach((r, i) => {
        const c = new THREE.Mesh(new THREE.TorusGeometry(r, 0.035 + i * 0.008, 6, 24, Math.PI), ORO);
        c.rotation.set(-0.15, 0, Math.PI);
        c.position.set(0, arriba0 - 0.02, D / 2 + 0.05);
        cuerpo.add(c);
        extras.push(c.geometry);
      });
      // El cinto trenzado arriba del short.
      cuerpo.add(caja(A + 0.06, 0.2, D + 0.06, '#c8b27a', 0, malla.position.y - 1 + 0.08, 0));
    },
  };
  const m = crearPersonaje(p, cab, ropa);
  // El short de jean (hasta la rodilla) y las piernas de piel abajo.
  const jean = new THREE.TextureLoader().load('assets/ropa/nicobaraja_jean.jpg');
  jean.colorSpace = THREE.SRGBColorSpace;
  const matJean = new THREE.MeshLambertMaterial({ map: jean });
  for (const pi of [m.partes.piernaI, m.partes.piernaD]) {
    pi.muslo.children.find((o) => o.isMesh).material = matJean;
    pi.rodilla.children.find((o) => o.isMesh).material = lisa;
  }
  return { m, cab };
}

export class NicoBaraja {
  // progreso(): la mansión (0 a 1); pausar(b): frena el juego (diálogo); alAbrir(): se habilitó la costa.
  constructor({ escena, estado, ui, guardar, progreso, pausar }) {
    Object.assign(this, { escena, estado, ui, guardar, progreso, pausar });
    this.grupo = new THREE.Group();
    escena.add(this.grupo);
    this.nico = null;
    this.barrera = null;
    this.cargando = false;
    this.alAbrir = null;
  }

  get abierto() { return !!this.estado.costa; }
  aparece() { return this.abierto || this.progreso() >= CO.desde; }

  // La barrera (hasta que le pagás) y Nico con el auto (desde el 99%): se arman al acercarte.
  async armar() {
    this.cargando = true;
    if (!this.abierto) {
      const b = new THREE.Group();
      for (const z of [CALLE_Z - 4.5, CALLE_Z, CALLE_Z + 4.5]) b.add(caja(1.4, 1.6, 4, '#c9c6bd', CO.barrera, 0.8, z)); // new jersey
      for (let i = 0; i < 6; i++) b.add(caja(0.3, 0.6, 2, i % 2 ? '#d9282f' : '#f4f1ea', CO.barrera, 2.0, CALLE_Z - 5 + i * 2));
      const cartel = crearEtiqueta([{ texto: 'CERRADO', tam: 60, color: '#ff5252' }, { texto: 'paso privado', tam: 36 }], 5);
      cartel.sprite.position.set(CO.barrera, 4.4, CALLE_Z);
      b.add(cartel.sprite);
      this.barrera = b;
      this.grupo.add(b);
    }
    const [{ m, cab }, auto] = await Promise.all([crearNico(), cargarAuto(AGERA)]);
    this.cara = cab.frente.toDataURL();
    // El Koenigsegg estacionado al costado de la calle, y Nico apoyado del lado de la calle.
    auto.position.set(CO.nico.x - 1, 0, CO.nico.z - 5.6);
    auto.rotation.y = Math.PI / 2;
    m.grupo.position.set(CO.nico.x, 0, CO.nico.z);
    m.grupo.rotation.set(-0.12, Math.PI * 0.06, 0); // la cola contra la puerta del auto, tirado para atrás
    const nombre = crearEtiqueta([{ texto: NICO.nombre, tam: 60, color: '#ffd23f' }], 4);
    nombre.sprite.position.y = 6.6;
    m.grupo.add(nombre.sprite);
    this.nico = m;
    this.auto = auto;
    this.grupo.add(m.grupo, auto);
  }

  distancia(p) { return Math.hypot(p.x - CO.nico.x, p.z - CO.nico.z); }

  actualizar(dt, jugador) {
    const lejos = jugador.pos.x < CO.x0 - 700;
    this.grupo.visible = !lejos;
    if (lejos) return;
    if (!this.cargando && (this.aparece() || !this.abierto)) this.armar();
    if (!this.nico) return;
    const ve = this.aparece();
    this.nico.grupo.visible = ve;
    this.auto.visible = ve;
    if (ve && this.distancia(jugador.pos) < 60) this.nico.animar(dt, 0, true);
  }

  accion(jugador) {
    return this.nico?.grupo.visible && this.distancia(jugador.pos) < CERCA && jugador.pos.y < 3 ? 'Hablar con Nico Baraja (E)' : '';
  }

  async hacer() {
    const decir = (lineas, opciones) => new Promise((res) => {
      this.ui.dialogo({ nombre: NICO.nombre, cara: this.cara, remera: '#d8a684', lineas, opciones, alElegir: res, alTerminar: () => res(-1) });
    });
    this.pausar(true);
    if (this.abierto) {
      await decir(['¿Qué hacés acá todavía, ñeri? Seguí la ruta, subí al acantilado, que el galpón te está esperando.']);
      this.pausar(false);
      return;
    }
    const r = await decir(['¡Qué anda, ñeri! Ando precisando a alguien pa\' un negocio nuevo… y vos tenés la mansa facha de ñeri. Si me tirás 200B, te habilito el negocio.'], ['Pagar 200B', 'Después']);
    if (r !== 0) {
      this.pausar(false);
      return;
    }
    if (this.estado.plata < CO.precio) {
      sfx.error();
      await decir([`Ta, ñeri, no te da el bolsillo. Juntá los ${formato(CO.precio)} y volvé, que yo de acá no me muevo.`]);
      this.pausar(false);
      return;
    }
    this.estado.plata -= CO.precio;
    this.estado.costa = true;
    this.guardar();
    sfx.brillo();
    if (this.barrera) {
      this.grupo.remove(this.barrera);
      this.barrera = null;
    }
    this.alAbrir?.();
    await decir(['¡Esa, ñeri! Trato cerrado. Ya te saqué la barrera: seguí la ruta y donde se abre el camino, agarrá la subida. Arriba del acantilado hay una parcela… ahí arrancás.']);
    this.pausar(false);
    this.ui.toast('¡Se abrió el paso a la costa!', 'plata', 5000);
  }
}
