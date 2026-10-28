import * as THREE from 'three';
import { DROPPERS } from '../data/objetos.js';
import { ITEMS, ITEMS_POR_ID, MIGRAR } from './progresion.js';
import { CINTA, SLOTS_DROPPER, COLECTOR_Z, COBRAR, CANCHA, ASCENSOR, GARAGE, RESTO_ABRE, nivel } from './constantes.js';
import * as Re from './resto.js';
import * as Gy from './gym.js';
import { caja, mat, matTex, formato, GEO_CAJA } from './util.js';
import { Lote } from './lote.js';
import { Fuegos } from './fuegos.js';
import { Auto } from './auto.js';
import { Helicoptero } from './helicoptero.js';
import { crearAK } from './arma.js';
import { crearModelo, medidaModelo } from './modelos.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  crearEtiqueta, canvasMoneda, texturaDeCanvas, texturaCinta, canvasCartel,
  texturaCascada, obtenerCara, cargarImagen, liberarAlSubir,
} from './texturas.js';
import { sfx } from './sfx.js';

const TAM_MONEDA = 0.6;
const MAX_MONEDAS = 500;
const ALTURA_CAIDA = 14;

const GEO_BOTON = new THREE.CylinderGeometry(1.4, 1.4, 0.3, 20);
const GEO_ARO = new THREE.CylinderGeometry(1.75, 1.75, 0.16, 20);
const GEO_PLANO = new THREE.PlaneGeometry(1, 1);
const GEO_HAZ = new THREE.CylinderGeometry(0.5, 0.5, 40, 8, 1, true);
const MAT_VERDE = new THREE.MeshLambertMaterial({ color: '#2fd14a', emissive: '#0b4a14' });
const MAT_ROJO = new THREE.MeshLambertMaterial({ color: '#e53935', emissive: '#3a0a0a' });
const MAT_DORADO = new THREE.MeshLambertMaterial({ color: '#ffc928', emissive: '#4a3500' });
const MAT_ASCENSOR = new THREE.MeshLambertMaterial({ color: '#7c4dff', emissive: '#2a1060' });
const PISOS_ASCENSOR = ['piso_pb', 'piso_1', 'piso_2', 'piso_3', 'techo'];
const MAT_HAZ = new THREE.MeshBasicMaterial({ color: '#7dff6a', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });

function crearKit() {
  const brillos = new Map();
  const imagenes = new Map();
  const materialesLisos = new Map();
  const material = (c) => (c instanceof THREE.Material ? c : mat(c));
  const malla = (geo, c, x, y, z) => {
    const m = new THREE.Mesh(geo, material(c));
    m.position.set(x, y, z);
    return m;
  };
  // Geometrías compartidas (altura 1, se escalan): así el lote las puede agrupar.
  const geos = new Map();
  const geo = (clave, crear) => {
    if (!geos.has(clave)) {
      const g = crear();
      g.userData.loteable = true;
      geos.set(clave, g);
    }
    return geos.get(clave);
  };
  const kit = {
    THREE,
    caja,
    cajaDe: (x0, y0, z0, x1, y1, z1, c) => caja(x1 - x0, y1 - y0, z1 - z0, c, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2),
    noSolido: (m) => { m.userData.noSolido = true; return m; },
    cilindro(rArriba, rAbajo, h, c, x, y, z, seg = 12) {
      const m = malla(geo(`c${rArriba}|${rAbajo}|${seg}`, () => new THREE.CylinderGeometry(rArriba, rAbajo, 1, seg)), c, x, y, z);
      m.scale.y = h;
      return m;
    },
    cono(r, h, c, x, y, z, seg = 8) {
      const m = malla(geo(`k${r}|${seg}`, () => new THREE.ConeGeometry(r, 1, seg)), c, x, y, z);
      m.scale.y = h;
      return m;
    },
    esfera: (r, c, x, y, z) => malla(geo(`e${r}`, () => new THREE.SphereGeometry(r, 14, 10)), c, x, y, z),
    grupo: () => new THREE.Group(),
    etiqueta: (lineas, ancho) => crearEtiqueta(lineas, ancho).sprite,
    // Pizarrón de tiza con un título y renglones (menú del restaurante).
    pizarra(titulo, lineas, ancho, alto) {
      const h = 512;
      const w = Math.round((h * ancho) / alto);
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const g = c.getContext('2d');
      g.fillStyle = '#6b4a35';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#23302a';
      g.fillRect(18, 18, w - 36, h - 36);
      g.fillStyle = 'rgba(255,255,255,0.04)';
      for (let i = 0; i < 40; i++) g.fillRect(Math.random() * w, Math.random() * h, 60, 3);
      g.textAlign = 'center';
      g.fillStyle = '#ffe9a8';
      g.font = `700 ${h * 0.12}px Fredoka, sans-serif`;
      g.fillText(titulo, w / 2, h * 0.17);
      g.strokeStyle = 'rgba(255,233,168,0.6)';
      g.lineWidth = 3;
      g.beginPath(); g.moveTo(w * 0.2, h * 0.22); g.lineTo(w * 0.8, h * 0.22); g.stroke();
      g.font = `600 ${h * 0.068}px Fredoka, sans-serif`;
      g.textAlign = 'left';
      lineas.forEach((l, i) => {
        g.fillStyle = i % 2 ? '#f4f1ea' : '#cfe8d6';
        g.fillText(`• ${l}`, w * 0.1, h * (0.33 + i * 0.1));
      });
      g.textAlign = 'center';
      g.fillStyle = '#ff9e80';
      g.font = `700 ${h * 0.06}px Fredoka, sans-serif`;
      g.fillText('Con su vaso de agua · Sin cargo', w / 2, h * 0.93);
      const tex = texturaDeCanvas(c);
      tex.anisotropy = 4;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto), new THREE.MeshBasicMaterial({ map: tex }));
      return kit.noSolido(m);
    },
    // Cartel con su chapa: el plano con el dibujo y atrás una placa con canto, así no
    // parece una calcomanía pegada.
    cartel(texto, ancho, alto, color, fondo) {
      const tex = liberarAlSubir(texturaDeCanvas(canvasCartel(texto, ancho, alto, color, fondo)));
      tex.anisotropy = 4;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto), new THREE.MeshBasicMaterial({ map: tex }));
      const placa = new THREE.Mesh(GEO_CAJA, mat('#1d1f22'));
      placa.scale.set(ancho + 0.12, alto + 0.12, 0.12);
      placa.position.z = -0.065;
      placa.userData.noSolido = true;
      m.add(placa);
      return kit.noSolido(m);
    },

    tex: (tipo, color, tamano) => matTex(tipo, color, tamano),
    // Mueble 3D (ver modelos.js): origen en el centro de la base, frente hacia +z.
    modelo: (nombre, opts = {}) => crearModelo(nombre, { vidrio: kit.vidrio, luz: kit.brillo('#fff3d6'), ...opts, material: mat }),
    medida: medidaModelo,
    ak47: crearAK,
    // Césped del terreno con franjas de cortadora.
    baseplate(ancho, largo, x, z) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(ancho, largo), matTex('pasto', '#86c95f', 8));
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0.02, z);
      return kit.noSolido(m);
    },
    // Retrato con la cara de un personaje (se completa cuando carga la foto).
    retrato(p, ancho, alto) {
      const mat = new THREE.MeshBasicMaterial({ color: '#222222' });
      obtenerCara(p).then((c) => {
        mat.map = texturaDeCanvas(c);
        mat.color.set('#ffffff');
        mat.needsUpdate = true;
      });
      return kit.noSolido(new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto), mat));
    },
    // Pintura con marco (dorado salvo que se pida otro); toma la proporción de la imagen
    // cuando termina de cargar. Un .mp4 se ve como cuadro animado (en loop, sin sonido).
    pintura(archivo, alto, { carpeta = 'pinturas', marco = '#a8842c' } = {}) {
      const g = new THREE.Group();
      const borde = new THREE.Mesh(GEO_CAJA, mat(marco));
      const lienzoMat = new THREE.MeshBasicMaterial({ color: '#d9d4c7' });
      const lienzo = new THREE.Mesh(GEO_PLANO, lienzoMat);
      lienzo.position.z = 0.07;
      const ajustar = (proporcion) => {
        const ancho = alto * proporcion;
        lienzo.scale.set(ancho, alto, 1);
        borde.scale.set(ancho + 0.36, alto + 0.36, 0.12);
      };
      ajustar(0.8);
      const ponerTextura = (tex, proporcion) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        lienzoMat.map = tex;
        lienzoMat.color.set('#ffffff');
        lienzoMat.needsUpdate = true;
        ajustar(proporcion);
      };
      const ruta = `assets/${carpeta}/${archivo}`;
      if (archivo.endsWith('.mp4')) {
        const video = document.createElement('video');
        Object.assign(video, { muted: true, loop: true, playsInline: true, autoplay: true });
        // WebM primero (anda en todos los Chrome); el .mp4 queda de respaldo.
        for (const src of [ruta.replace(/\.mp4$/, '.webm'), ruta]) {
          const fuente = document.createElement('source');
          fuente.src = src;
          video.appendChild(fuente);
        }
        video.addEventListener('loadedmetadata', () => ponerTextura(new THREE.VideoTexture(video), video.videoWidth / video.videoHeight));
        video.play().catch(() => window.addEventListener('pointerdown', () => video.play(), { once: true }));
      } else {
        cargarImagen(ruta).then((img) => {
          if (!img) return;
          const tex = new THREE.Texture(img);
          tex.needsUpdate = true;
          ponerTextura(tex, img.naturalWidth / img.naturalHeight);
        });
      }
      borde.userData.noSolido = true;
      lienzo.userData.noSolido = true;
      g.userData.dinamico = true;
      g.add(borde, lienzo);
      return g;
    },
    // Junta muchas geometrías en una (se dibujan de una vez: menos trabajo para la compu).
    unir: (geos) => mergeGeometries(geos.map((x) => (x.index ? x.toNonIndexed() : x)).map((x) => { for (const n of Object.keys(x.attributes)) if (!['position', 'normal', 'uv'].includes(n)) x.deleteAttribute(n); return x; })),
    // Material liso con luz (cacheado por color).
    material(c) {
      if (!materialesLisos.has(c)) materialesLisos.set(c, new THREE.MeshLambertMaterial({ color: c }));
      return materialesLisos.get(c);
    },
    // Lámina de 1 x 1 con un dibujo hecho en un canvas: dibujar(ctx, ancho, alto).
    imagenCanvas(dibujar, w, h) {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      dibujar(c.getContext('2d'), w, h);
      const tex = liberarAlSubir(new THREE.CanvasTexture(c));
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      return kit.noSolido(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshLambertMaterial({ map: tex })));
    },
    // Lámina con una imagen (PNG con transparencia recortada). Misma imagen y medida
    // comparten geometría y material, así muchas (banderines) se dibujan juntas.
    imagen(ruta, ancho, alto, { dosLados = false } = {}) {
      const clave = `${ruta}|${dosLados}`;
      if (!imagenes.has(clave)) {
        const tex = new THREE.TextureLoader().load(ruta);
        tex.colorSpace = THREE.SRGBColorSpace;
        imagenes.set(clave, new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5, side: dosLados ? THREE.DoubleSide : THREE.FrontSide }));
      }
      const m = new THREE.Mesh(geo(`p${ancho}|${alto}`, () => new THREE.PlaneGeometry(ancho, alto)), imagenes.get(clave));
      return kit.noSolido(m);
    },
    // Guirnalda de banderines de La Dosis colgando de una soga entre (x0,z0) y (x1,z1).
    banderines(g, x0, z0, x1, z1, y, n, tam = 1) {
      const largo = Math.hypot(x1 - x0, z1 - z0);
      const soga = kit.noSolido(caja(largo, 0.06, 0.06, '#1b1d1f', (x0 + x1) / 2, y, (z0 + z1) / 2));
      soga.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
      g.add(soga);
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        const b = kit.imagen('assets/especiales/ladosis_banderin.png', 0.75 * tam, 1.1 * tam, { dosLados: true });
        b.position.set(x0 + (x1 - x0) * t, y - 0.55 * tam, z0 + (z1 - z0) * t);
        b.rotation.y = soga.rotation.y;
        g.add(b);
      }
    },
    // Lámina de agua cayendo (la textura se mueve sola en actualizar()).
    cascada(ancho, alto) {
      const tex = texturaCascada();
      tex.repeat.set(ancho / 4, alto / 8);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9, depthWrite: false }));
      m.userData.cascada = tex;
      return kit.noSolido(m);
    },
    brillo(c) {
      if (!brillos.has(c)) brillos.set(c, new THREE.MeshBasicMaterial({ color: c }));
      return brillos.get(c);
    },
    vidrio: new THREE.MeshLambertMaterial({ color: '#bfe7ff', transparent: true, opacity: 0.35, depthWrite: false }),
    agua: new THREE.MeshLambertMaterial({ color: '#29b6f6', emissive: '#08324a', transparent: true, opacity: 0.6, depthWrite: false }),
    red: new THREE.MeshLambertMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, depthWrite: false }),
  };
  return kit;
}

export class Tycoon {
  constructor({ escena, colisiones, estado, ui, guardar }) {
    this.escena = escena;
    this.colisiones = colisiones;
    this.estado = estado;
    this.ui = ui;
    this.guardar = guardar;
    this.kit = crearKit();
    this.camas = []; // posiciones de las camas compradas (para dormir de noche)
    this.kit.alCama = (p) => this.camas.push(p);
    this.roperos = []; // posiciones de los roperos comprados (para cambiarse la ropa)
    this.kit.alRopero = (p) => this.roperos.push(p);
    this.lote = new Lote(escena);
    this.fuegos = new Fuegos(escena);

    this.multValor = 1;
    this.multVel = 1;
    this.droppers = [];
    this.botones = [];
    this.animaciones = [];
    this.giratorios = [];
    this.agua = [];
    this.cascadas = [];
    this.pads = [];
    this.padBloqueado = null;
    this.ascensor = false;
    this.autoCobro = false;
    this.esperaAuto = 0;
    this.monedas = [];
    this.fabrica = null;
    this.pelota = null;
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

  // Al cargar: arma todo lo comprado sin animación. Si la mansión cambió de diseño y algo
  // ya no tiene dónde ir (le faltan requisitos), se saca y se devuelve la plata.
  reconstruir() {
    const hechos = new Set();
    const validos = [];
    let reintegro = 0;
    // Habitaciones que antes se compraban enteras: pasan a tener todos sus muebles.
    for (const id of this.estado.compras.flatMap((c) => MIGRAR[c] || [c])) {
      const item = ITEMS_POR_ID[id];
      if (!item || hechos.has(id)) continue;
      if (item.requiere.every((r) => hechos.has(r))) {
        this.aplicar(item, false);
        hechos.add(id);
        validos.push(id);
      } else {
        reintegro += item.precio;
      }
    }
    this.estado.compras = validos;
    if (reintegro > 0) {
      this.estado.plata += reintegro;
      this.reintegro = reintegro;
    }
    this.refrescarBotones(false);
    this.abrirResto(false);
    this.construirGym();
  }

  // El gym Power Camp está desde el principio (no se compra): edificio y equipamiento.
  construirGym() {
    if (this.gymHecho) return;
    this.gymHecho = true;
    for (const [construir, muebles] of [[Gy.edificio, false], [Gy.mostrador, true], [Gy.mancuernas, true], [Gy.maquinas, true]]) {
      const g = new THREE.Group();
      construir(this.kit, g);
      this.agregarPieza(g, false, { muebles });
    }
  }

  // El restaurante de Lourdes no se compra: aparece entero (con Lourdes) cuando la mansión
  // llega al RESTO_ABRE. Sale del progreso, así que no se guarda nada.
  abrirResto(animar) {
    if (this.restoAbierto || this.progreso < RESTO_ABRE) return;
    this.restoAbierto = true;
    for (const [construir, muebles] of [[Re.edificio, false], [Re.mesas, true], [Re.microondas, true], [Re.rinconLourdes, true], [Re.decoracion, true]]) {
      const g = new THREE.Group();
      construir(this.kit, g);
      this.agregarPieza(g, animar, { muebles });
    }
    if (animar) this.ui.toast('¡Abrió Lo de Lourdes! Salí por el portón y seguí la calle para el lado del garage, unos 150 metros', 'info');
  }

  get ingresoPorSegundo() {
    return this.droppers.reduce((a, d) => a + this.valorMoneda(d) / this.intervalo(d), 0);
  }

  get progreso() {
    const comprados = new Set(this.estado.compras);
    return ITEMS.filter((i) => comprados.has(i.id)).length / ITEMS.length;
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
    if (item.construir) {
      const g = new THREE.Group();
      item.construir(this.kit, g);
      this.agregarPieza(g, animar, { muebles: item.muebles });
    }
    if (item.id === 'cancha') this.crearPelota();
    if (item.id === 'auto_cobro') this.autoCobro = true;
    if (item.id === 'ak47') this.tieneArma = true;
    if (item.id === 'auto' && !this.auto) {
      this.auto = new Auto(this.escena, (GARAGE.x0 + GARAGE.x1) / 2, (GARAGE.z0 + GARAGE.z1) / 2 - 1, 0);
      this.auto.aplicarTaller(this.estado.taller?.deportivo);
      this.colisiones.push(this.auto.caja);
    }
    // El helicóptero del helipuerto se puede manejar (main.js): parado en el centro del helipuerto.
    if (item.id === 'lujo_helicoptero' && !this.heli) {
      this.heli = new Helicoptero(this.escena, 32, nivel(4) + 0.15, -20, 0);
      this.colisiones.push(this.heli.caja);
    }
    if (item.id === 'ascensor') this.ascensor = true;
    if ((this.ascensor && PISOS_ASCENSOR.includes(item.id)) || item.id === 'ascensor') this.actualizarAscensor();
    // Fuegos artificiales al terminar la mansión: 20 segundos, solo al comprarlo (no al cargar).
    if (item.final && animar) this.fuegos.lanzar(20);
  }

  intentarComprar(boton) {
    const { item } = boton;
    if (this.estado.plata < item.precio) return false;
    this.estado.plata -= item.precio;
    this.estado.compras.push(item.id);
    this.quitarBoton(boton);
    this.aplicar(item, true);
    this.refrescarBotones(true);
    this.abrirResto(true);
    if (item.final) {
      sfx.final();
      this.ui.celebrar(this.estado.tiempoJugado || 0);
    } else {
      sfx.comprar();
      this.alComprar?.(item);
      this.ui.toast(`¡${item.nombre}!`, 'ok');
      if (item.descripcion) this.ui.toast(item.descripcion, 'plata');
    }
    this.guardar();
    return true;
  }

  refrescarBotones(avisar) {
    const comprados = new Set(this.estado.compras);
    const conBoton = new Set(this.botones.map((b) => b.item.id));
    for (const item of ITEMS) {
      if (comprados.has(item.id) || conBoton.has(item.id)) continue;
      if (!item.requiere.every((r) => comprados.has(r))) continue;
      if (item.desde && this.progreso < item.desde) continue; // aparece recién a ese progreso
      this.crearBoton(item);
      if (avisar && item.tipo === 'construccion' && !item.especial && !item.mueble) this.ui.toast(`Nuevo botón: ${item.nombre}`, 'info');
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
    const haz = new THREE.Mesh(GEO_HAZ, MAT_HAZ);
    haz.position.y = 20;
    haz.visible = false;
    const precio = item.precio === 0 ? 'GRATIS' : formato(item.precio);
    const etiqueta = crearEtiqueta([
      { texto: item.nombre, tam: 56, color: item.final ? '#ffd23f' : '#ffffff' },
      { texto: precio, tam: 60, color: '#8dff6a', moneda: item.precio > 0 },
    ], 6);
    etiqueta.sprite.position.y = 3.6;
    grupo.add(aro, disco, haz, etiqueta.sprite);
    this.escena.add(grupo);
    this.botones.push({ item, grupo, disco, haz, etiqueta, x, y, z, pisado: false, armado: false, alcanza: null, fase: Math.random() * 6 });
    grupo.scale.setScalar(0.01);
    this.animaciones.push({ obj: grupo, y0: y, t: 0, dur: 0.4, caida: 0 });
  }

  quitarBoton(boton) {
    this.escena.remove(boton.grupo);
    boton.etiqueta.sprite.material.map.dispose();
    boton.etiqueta.sprite.material.dispose();
    this.botones.splice(this.botones.indexOf(boton), 1);
  }

  // ---------- Piezas y animación ----------

  // Centra el grupo en su base (para que crezca desde el piso), registra colisiones
  // y lo agrega a la escena. Cuando termina de aparecer, sus bloques pasan al lote.
  agregarPieza(grupo, animar, { sinColision = false, muebles = false } = {}) {
    const caja3 = new THREE.Box3();
    const tmp = new THREE.Box3();
    grupo.updateMatrixWorld(true);
    grupo.traverse((o) => { if (o.isMesh) caja3.union(tmp.setFromObject(o)); });
    if (caja3.isEmpty()) caja3.set(new THREE.Vector3(), new THREE.Vector3());
    const centro = new THREE.Vector3((caja3.min.x + caja3.max.x) / 2, caja3.min.y, (caja3.min.z + caja3.max.z) / 2);
    grupo.children.forEach((c) => c.position.sub(centro));
    grupo.position.add(centro);
    grupo.updateMatrixWorld(true);

    grupo.traverse((o) => {
      if (o.userData.girar) this.giratorios.push(o);
      if (o.userData.cascada) this.cascadas.push(o.userData.cascada);
      if (!o.isMesh) return;
      if (o.material === this.kit.agua && o.geometry.type === 'BoxGeometry') this.agua.push(new THREE.Box3().setFromObject(o));
      if (sinColision || o.userData.noSolido) return;
      const b = new THREE.Box3().setFromObject(o);
      if (muebles) b.camara = false;
      this.colisiones.push(b);
    });
    this.escena.add(grupo);
    if (animar) {
      const y0 = grupo.position.y;
      grupo.position.y += ALTURA_CAIDA;
      grupo.scale.setScalar(0.3);
      this.animaciones.push({ obj: grupo, y0, t: 0, dur: 0.7, caida: ALTURA_CAIDA, alTerminar: () => this.lote.absorber(grupo) });
    } else {
      this.lote.absorber(grupo);
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
        a.obj.position.y = a.y0;
        this.animaciones.splice(i, 1);
        a.alTerminar?.();
      }
    }
  }

  // ---------- Fábrica ----------

  construirFabrica(animar) {
    const largo = CINTA.z1 - CINTA.z0;
    const cz = (CINTA.z0 + CINTA.z1) / 2;
    const cinta = new THREE.Group();
    this.texCinta = texturaCinta();
    this.texCinta.repeat.set(1, largo / 2);
    const gris = mat('#333');
    const banda = new THREE.Mesh(
      new THREE.BoxGeometry(CINTA.ancho, 0.25, largo),
      [gris, gris, new THREE.MeshLambertMaterial({ map: this.texCinta }), gris, gris, gris],
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
    colector.add(caja(4.3, 0.3, 3.9, '#ffc928', cx, 3.35, COLECTOR_Z));
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
    this.agregarPieza(cobrar, animar, { sinColision: true });
    this.cobrar = { pisado: false, espera: 0 };
    this.fabrica = true;
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
    this.droppers.push({ i, z, t: animar ? -0.7 : 0 });
  }

  // ---------- Pelota de la cancha ----------

  crearPelota() {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.9, 14, 10), mat('#fafafa'));
    const cx = (CANCHA.x0 + CANCHA.x1) / 2;
    const cz = (CANCHA.z0 + CANCHA.z1) / 2;
    m.position.set(cx, 0.9, cz);
    this.escena.add(m);
    this.pelota = { m, vel: new THREE.Vector3(), cx, cz };
  }

  actualizarPelota(dt, jugador) {
    const p = this.pelota;
    const b = p.m.position;
    const dx = b.x - jugador.pos.x;
    const dz = b.z - jugador.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 1.8 && jugador.pos.y < b.y + 1) {
      const fuerza = 10 + Math.hypot(jugador.vel.x, jugador.vel.z) * 0.6;
      p.vel.set((dx / (d || 1)) * fuerza, 5, (dz / (d || 1)) * fuerza);
    }
    p.vel.y -= 30 * dt;
    b.addScaledVector(p.vel, dt);
    if (b.y < 0.9) {
      b.y = 0.9;
      p.vel.y = Math.abs(p.vel.y) > 2 ? -p.vel.y * 0.5 : 0;
      p.vel.x *= 1 - dt * 1.2;
      p.vel.z *= 1 - dt * 1.2;
    }
    const C = CANCHA;
    if (b.x < C.x0 + 0.9 || b.x > C.x1 - 0.9) {
      b.x = THREE.MathUtils.clamp(b.x, C.x0 + 0.9, C.x1 - 0.9);
      p.vel.x *= -0.7;
    }
    if (b.z < C.z0 + 0.9 || b.z > C.z1 - 0.9) {
      if (Math.abs(b.x - p.cx) < 3 && b.y < 3.2) {
        sfx.gol();
        this.ui.toast('¡¡GOOOOL!!', 'plata');
        b.set(p.cx, 4, p.cz);
        p.vel.set(0, 0, 0);
      } else {
        b.z = THREE.MathUtils.clamp(b.z, C.z0 + 0.9, C.z1 - 0.9);
        p.vel.z *= -0.7;
      }
    }
    p.m.rotation.x += p.vel.z * dt;
    p.m.rotation.z -= p.vel.x * dt;
  }

  // ---------- Bucle ----------

  actualizar(dt, jugador) {
    this.tiempo += dt;
    this.actualizarAnimaciones(dt);
    // Manejando no se compra ni se cobra al pasar por encima de los botones.
    if (!jugador.conduciendo) this.actualizarBotones(dt, jugador);
    for (const o of this.giratorios) o.rotation.y += o.userData.girar * dt;
    for (const t of this.cascadas) t.offset.y = (t.offset.y + dt * 0.9) % 1;
    if (!jugador.conduciendo) this.actualizarPads(jugador);
    this.fuegos.actualizar(dt);
    if (this.pelota) this.actualizarPelota(dt, jugador);
    if (!this.fabrica) return;

    this.texCinta.offset.y = (this.texCinta.offset.y + (CINTA.vel * dt) / 2) % 1;

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
    if (banco !== this.bancoMostrado && this.tiempo - (this.ultimoCartel || 0) > 0.2) {
      this.bancoMostrado = banco;
      this.ultimoCartel = this.tiempo;
      this.etiquetaColector.actualizar([{ texto: 'COLECTOR', tam: 44 }, { texto: formato(banco), tam: 70, color: '#ffd23f', moneda: true }]);
    }
  }

  soltarMoneda(d) {
    const valor = this.valorMoneda(d);
    if (this.monedas.length >= MAX_MONEDAS) {
      this.estado.banco += valor;
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

  // ---------- Ascensor ----------

  // Una plataforma por cada piso construido; al pisarla te lleva al piso de arriba
  // (desde el último, vuelve a planta baja).
  actualizarAscensor() {
    const comprados = new Set(this.estado.compras);
    PISOS_ASCENSOR.forEach((id, n) => {
      if (!comprados.has(id) || this.pads.some((p) => p.n === n)) return;
      const grupo = new THREE.Group();
      const y = nivel(n);
      grupo.position.set(ASCENSOR.x, y, ASCENSOR.z);
      const aro = new THREE.Mesh(GEO_ARO, mat('#2a2a2a'));
      aro.position.y = 0.08;
      const disco = new THREE.Mesh(GEO_BOTON, MAT_ASCENSOR);
      disco.position.y = 0.2;
      const et = crearEtiqueta([{ texto: 'ASCENSOR', tam: 56, color: '#e1bee7' }, { texto: 'sube un piso', tam: 34 }], 5);
      et.sprite.position.y = 3.2;
      grupo.add(aro, disco, et.sprite);
      this.escena.add(grupo);
      this.pads.push({ n, y, grupo });
    });
    this.pads.sort((a, b) => a.n - b.n);
  }

  actualizarPads(jugador) {
    if (!this.pads.length) return;
    const sobre = (pad) => {
      const dx = jugador.pos.x - ASCENSOR.x;
      const dz = jugador.pos.z - ASCENSOR.z;
      return dx * dx + dz * dz < 1.6 * 1.6 && Math.abs(jugador.pos.y - pad.y) < 1;
    };
    if (this.padBloqueado && !sobre(this.padBloqueado)) this.padBloqueado = null;
    if (this.padBloqueado || this.pads.length < 2) return;
    const actual = this.pads.find(sobre);
    if (!actual) return;
    const destino = this.pads[(this.pads.indexOf(actual) + 1) % this.pads.length];
    jugador.pos.set(ASCENSOR.x, destino.y, ASCENSOR.z);
    jugador.vel.set(0, 0, 0);
    this.padBloqueado = destino;
    sfx.comprar();
    this.ui.toast(destino.n === 0 ? 'Planta Baja' : destino.n === 4 ? 'Terraza' : `Piso ${destino.n}`, 'info');
  }

  actualizarCobrar(dt, jugador) {
    // pausaCobro: la Schwepa está en el terreno (ver ladron.js).
    if (this.autoCobro && !this.pausaCobro) {
      this.esperaAuto -= dt;
      if (this.esperaAuto <= 0 && this.estado.banco >= 1) {
        this.esperaAuto = 1;
        const monto = Math.floor(this.estado.banco);
        this.estado.plata += monto;
        this.estado.banco -= monto;
      }
    }
    const dx = jugador.pos.x - COBRAR.x;
    const dz = jugador.pos.z - COBRAR.z;
    const encima = !jugador.conduciendo && dx * dx + dz * dz < 1.7 * 1.7 && jugador.pos.y < 1;
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
        b.haz.visible = alcanza;
      }

      const dx = jugador.pos.x - b.x;
      const dz = jugador.pos.z - b.z;
      const encima = dx * dx + dz * dz < 1.7 * 1.7 && Math.abs(jugador.pos.y - b.y) < 1;
      // Un botón que aparece debajo del jugador no compra hasta que se baje y lo vuelva a pisar.
      if (!encima) b.armado = true;
      if (encima && b.armado) {
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
