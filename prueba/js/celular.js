import { CACHIMBA as CA, CIUDAD as C, PLAYA, CALLE_Z, COSTA } from './constantes.js';
import { MANSIONES, PUERTA_Z } from './costa.js';
import * as THREE from 'three';
import { formato } from './util.js';
import { crearPersonaje } from './personaje.js';
import { cargarCabeza, crearEtiqueta } from './texturas.js';
import { dibujarCara } from './ciudad.js';
import { sfx } from './sfx.js';

// El celular (te lo da el primer dueño de una mansión de la costa que te compra tanzania; costa.js):
// tipo GTA, con dos apps.
// - TanzaCoin: a cuánto se paga el gramo de tanzania ahora, como si fuera bitcoin (sube y baja solo;
//   con el gráfico de los últimos minutos). Lo que te pagan por Tranzapp va con esa cotización.
// - Tranzapp (el WhatsApp trucho): gente de todo el juego te escribe pidiendo gramos, con la
//   dirección. Aceptás y en el mapa aparece un punto azul exacto; llegás con la camioneta de
//   reparto (tanzania.js) con los gramos encima (las bolsitas del depósito: 1 bolsita = 1 g) y se
//   entrega sola al frenar ahí; a pie, con la E. En el lugar hay una columna de luz azul y el cliente. Todo queda en estado.tranzapp.
const CADA = [30, 75]; // segundos entre un mensaje y otro (al azar en ese rango)
const MAX_PEDIDOS = 4;
const RADIO = 10; // a cuánto del punto se entrega

// La cotización (veces lo que vale una bolsita) en el segundo t de juego: ondas lentas y rápidas
// mezcladas (no se guarda: sale siempre igual para el mismo momento). Entre 0,55 y 1,75.
export function cotizacion(t) {
  return 1.15 + 0.32 * Math.sin(t / 173) + 0.18 * Math.sin(t / 41 + 1.3) + 0.08 * Math.sin(t / 9.7 + 0.4);
}

// Quiénes te escriben y dónde hay que entregar (calles por donde pasa la camioneta).
function destinos(ciudad, estado) {
  const mz = (i, j, dx = 0, dz = -4) => { const m = ciudad.manzanaDe(i, j); return { x: C.x + (m.x0 + m.x1) / 2 + dx, z: C.z + m.z0 + dz }; };
  const lista = [
    { quien: 'Hilario José', foto: '🛵', lugar: 'la plaza de la Ciudad Vecibanda, frente al banco', ...mz(3, 3) },
    { quien: 'Lagatta', foto: '🍸', lugar: 'la puerta del Lagatta Bar', ...mz(4, 5) },
    { quien: 'Kevin', foto: '⛽', lugar: 'la estación de servicio de la ciudad', ...mz(6, 1) },
    { quien: 'Facu de KICKS', foto: '👟', lugar: 'la puerta de KICKS, en la ciudad', ...mz(3, 4) },
    { quien: 'Francis Jeremy', foto: '🏄', lugar: 'la calle de la playa, frente al muelle', x: PLAYA.muelle.x, z: CALLE_Z + 4 },
    { quien: 'Dufre', foto: '🚶', lugar: 'la vereda frente a tu mansión', x: 40, z: CALLE_Z - 3 },
    { quien: 'Nico Baraja', foto: '🏎️', lugar: 'el final de la calle del barrio, donde está el Koenigsegg', x: COSTA.nico.x + 20, z: CALLE_Z },
    ...MANSIONES.map((m) => ({ quien: m.nombre, foto: '🏖️', lugar: `el portón de la mansión de ${m.nombre.split(' ').slice(-1)[0]}, en la costa`, x: m.x + 23, z: PUERTA_Z - 12 })),
  ];
  if (estado.cachimba?.visitada) {
    lista.push(
      { quien: 'Erik', foto: '🧢', lugar: 'La Cachimba del Piojo, al lado del tacho con fuego', x: CA.entrada - 4, z: CA.z0 + 52 },
      { quien: 'El Rengo Brian', foto: '🐕', lugar: 'La Cachimba del Piojo, la esquina del auto quemado', x: CA.entrada, z: CA.z0 + 102 },
      { quien: 'El Humano', foto: '🥫', lugar: 'la entrada de La Cachimba del Piojo', x: CA.entrada + 3, z: CA.z1 - 8 },
    );
  }
  // Gente común: una casa de cada manzana de la ciudad y las casillas de la Cachimba (el nombre se
  // elige al azar cuando escribe: quien null).
  const CALLES = ['Las Heras', 'Belgrano', 'Mitre', 'Sarmiento', 'Rivadavia', 'San Martín', 'Moreno', 'Alsina', 'Lavalle'];
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) lista.push({ quien: null, lugar: `la casa de ${CALLES[i]} ${(j + 1) * 100 + ((i * 37 + j * 11) % 90)}, en la ciudad`, ...mz(i, j, ((i + j) % 3 - 1) * 12) });
  }
  if (estado.cachimba?.visitada) {
    const CHAPAS = ['azul', 'oxidada', 'verde', 'naranja', 'gris', 'roja'];
    for (let k = 0; k < 12; k++) {
      const z = CA.z0 + 12 + k * 14;
      lista.push({ quien: null, lugar: `la casilla de chapa ${CHAPAS[k % CHAPAS.length]} de La Cachimba (pasillo ${k + 1})`, x: CA.entrada + (k % 2 ? 4 : -4), z, cachimba: true });
    }
  }
  return lista;
}
// Los que escriben sin ser nadie conocido (gente de la ciudad o de la Cachimba).
const GENTE = ['El Tano', 'La Yesi', 'Brayan', 'El Facha', 'Maxi', 'Cele', 'El Gordo Rubén', 'La Tota', 'Thiago', 'Dylan', 'El Pela', 'Romina', 'El Chino', 'Nahuel', 'La Colo', 'Iván', 'El Ruso', 'Franco', 'Agus', 'Lauti', 'Mica', 'El Tucu', 'Jona', 'La Pato'];
const VILLA = ['El Rata', 'Maicol', 'La Negra Sandra', 'Jhonatan', 'El Tuerto', 'Yanina', 'El Chapa', 'Brisa', 'El Moncho', 'Cristian "Pitufo"'];
const CARAS = ['🧔', '👩', '🧑', '👱', '🧢', '👦', '👧', '🧓'];
const PIDE_CASA = [
  (n) => `Llevame ${n} g a`,
  (n) => `Traeme ${n} g de la violeta a`,
  (n) => `Necesito ${n} g. Dejalo en`,
  (n) => `¿Me alcanzás ${n} g? Estoy en`,
];
const PIDE = [
  (n) => `Eu, ¿tenés ${n} g de la violeta? Te espero en`,
  (n) => `Necesito ${n} g de tanzania urgente, hermano. Estoy en`,
  (n) => `¿Me alcanzás ${n} g? Pago bien. Pasá por`,
  (n) => `Che, ${n} g para esta noche, ¿se puede? Te mando la ubicación:`,
];

export class Celular {
  constructor({ escena, estado, ui, guardar, tanzania, ciudad, controles, modo }) {
    Object.assign(this, { escena, estado, ui, guardar, tanzania, ciudad, controles, modo });
    const $ = (id) => document.getElementById(id);
    this.boton = $('btn-celular');
    this.panel = $('celular');
    this.pantalla = $('celular-pantalla');
    this.boton.addEventListener('click', () => (this.abierto ? this.cerrar() : this.abrir()));
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyP' && !e.repeat && this.estado.celular && this.modo() === 'juego') (this.abierto ? this.cerrar() : this.abrir());
      if (e.code === 'Escape' && this.abierto) this.cerrar();
    });
    this.panel.addEventListener('click', (e) => {
      const b = e.target.closest('[data-ir]');
      if (b) { this.app = b.dataset.ir; this.dibujar(); }
      const a = e.target.closest('[data-aceptar]');
      if (a) this.aceptar(a.dataset.aceptar);
    });
    this.app = 'inicio';
    this.historia = []; // la cotización de los últimos minutos (para el gráfico)
    this.relojHistoria = 0;
    this.alCambiarMarcas = null; // main.js: los puntos azules del mapa
  }

  get datos() { return (this.estado.tranzapp ??= { pedidos: [], chats: [], prox: 20, id: 0 }); }
  get t() { return this.estado.tiempoJugado || 0; }
  get gramo() { return this.tanzania.bolsa * cotizacion(this.t); }

  // ---------- Panel ----------
  abrir() {
    if (!this.estado.celular) return;
    this.abierto = true;
    this.app = this.datos.pedidos.some((p) => !p.visto) ? 'tranzapp' : this.app;
    this.panel.classList.remove('oculto');
    this.controles.activo = false;
    sfx.ficha();
    this.dibujar();
  }

  cerrar() {
    this.abierto = false;
    this.panel.classList.add('oculto');
    this.controles.activo = this.modo() === 'juego';
  }

  dibujar() {
    const d = this.datos;
    const sinLeer = d.pedidos.filter((p) => !p.visto).length;
    const hora = new Date().toTimeString().slice(0, 5);
    const barra = `<div class="cel-barra"><span>${hora}</span><span>📶 🔋</span></div>`;
    if (this.app === 'inicio') {
      this.pantalla.innerHTML = `${barra}<div class="cel-apps">
        <button class="cel-app" data-ir="coin"><span class="cel-icono" style="background:#7b4fc9">₮</span>TanzaCoin</button>
        <button class="cel-app" data-ir="tranzapp"><span class="cel-icono" style="background:#25d366">💬${sinLeer ? `<b class="cel-badge">${sinLeer}</b>` : ''}</span>Tranzapp</button>
      </div><div class="cel-pie">Llevás encima: ${this.tanzania.datos.encima || 0} g</div>`;
    } else if (this.app === 'coin') {
      const c = cotizacion(this.t);
      const antes = cotizacion(this.t - 60);
      const sube = c >= antes;
      this.pantalla.innerHTML = `${barra}<div class="cel-titulo"><button class="cel-volver" data-ir="inicio">‹</button>TanzaCoin</div>
        <div class="cel-precio">${formato(this.gramo)} <small>/ g</small></div>
        <div class="cel-var ${sube ? 'sube' : 'baja'}">${sube ? '▲' : '▼'} ${Math.abs(((c - antes) / antes) * 100).toFixed(1)}% en el último minuto</div>
        <canvas id="cel-grafico" width="520" height="240"></canvas>
        <div class="cel-pie">Lo que te pagan por Tranzapp va con este precio.</div>`;
      this.grafico();
    } else {
      const lista = d.pedidos.map((p) => `<div class="cel-chat ${p.aceptado ? 'aceptado' : ''}">
        <div class="cel-de"><span class="cel-avatar">${p.foto}</span><b>${p.quien}</b></div>
        <div class="cel-msj">${p.texto} <b>${p.lugar}</b>${p.post || ''}.</div>
        <div class="cel-msj cel-paga">Te pago ${formato(p.paga)} por los ${p.gramos} g.</div>
        ${p.aceptado ? '<div class="cel-ok">✔ Aceptado: punto azul en el mapa. Llevalo con la camioneta.</div>' : `<button class="cel-aceptar" data-aceptar="${p.id}">Aceptar pedido</button>`}
      </div>`).join('') || '<div class="cel-vacio">Nadie te escribió todavía…</div>';
      const hechos = d.chats.slice(-4).reverse().map((h) => `<div class="cel-hecho">✔ ${h}</div>`).join('');
      this.pantalla.innerHTML = `${barra}<div class="cel-titulo verde"><button class="cel-volver" data-ir="inicio">‹</button>Tranzapp</div><div class="cel-lista">${lista}${hechos}</div>`;
      for (const p of d.pedidos) p.visto = true;
      this.punto();
    }
  }

  grafico() {
    const c = document.getElementById('cel-grafico');
    if (!c) return;
    const g = c.getContext('2d');
    const pts = Array.from({ length: 90 }, (_, i) => cotizacion(this.t - (89 - i) * 4));
    const [lo, hi] = [Math.min(...pts), Math.max(...pts)];
    g.fillStyle = '#12101a';
    g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = 'rgba(255,255,255,0.08)';
    for (let y = 40; y < c.height; y += 50) { g.beginPath(); g.moveTo(0, y); g.lineTo(c.width, y); g.stroke(); }
    const sube = pts[89] >= pts[74];
    g.strokeStyle = sube ? '#3ddc84' : '#ff5252';
    g.lineWidth = 4;
    g.beginPath();
    pts.forEach((v, i) => { const x = (i / 89) * c.width; const y = c.height - 16 - ((v - lo) / (hi - lo || 1)) * (c.height - 32); i ? g.lineTo(x, y) : g.moveTo(x, y); });
    g.stroke();
  }

  // El puntito verde en el botón cuando hay mensajes sin leer.
  punto() {
    this.boton.classList.toggle('con-mensaje', this.datos.pedidos.some((p) => !p.visto));
  }

  aceptar(id) {
    const p = this.datos.pedidos.find((x) => String(x.id) === id);
    if (!p) return;
    p.aceptado = true;
    this.guardar();
    sfx.comprar();
    this.marcas();
    this.dibujar();
  }

  // ---------- La entrega ----------
  // El pedido aceptado más cerca (a menos de r).
  pedidoCerca(jugador, r) {
    return this.datos.pedidos.find((p) => p.aceptado && Math.hypot(jugador.pos.x - p.x, jugador.pos.z - p.z) < r) || null;
  }

  // A pie, con la E (main.js).
  accion(jugador) {
    const p = !jugador.conduciendo && this.pedidoCerca(jugador, 7);
    return p ? `Entregar ${p.gramos} g a ${p.quien} (E)` : '';
  }

  hacer(jugador) { const p = this.pedidoCerca(jugador, 7); if (p) this.entregar(p, true); }

  entregar(p, aPie = false) {
    const d = this.datos;
    const t = this.tanzania.datos;
    if ((t.encima || 0) < p.gramos) {
      if (aPie || !p.avisado) this.ui.toast(`${p.quien}: "¿Y? Me faltan ${p.gramos - (t.encima || 0)} g. Andá al depósito del galpón a buscar bolsitas"`, 'error', 4500);
      p.avisado = true;
      return;
    }
    t.encima -= p.gramos;
    t.vendido = (t.vendido || 0) + p.gramos;
    t.entregas = (t.entregas || 0) + 1;
    this.estado.plata += p.paga;
    d.pedidos.splice(d.pedidos.indexOf(p), 1);
    d.chats.push(`${p.quien}: ${p.gramos} g entregados (+${formato(p.paga)})`);
    this.guardar();
    sfx.cobrar();
    this.ui.toast(`¡Entregaste ${p.gramos} g a ${p.quien}! +${formato(p.paga)}`, 'plata', 4000);
    this.marcas();
  }

  // En cada punto de entrega: una columna de luz azul (se ve de lejos) y la persona esperando, con
  // su nombre arriba. Se arman al aceptar y se sacan al entregar.
  verPuntos(dt, jugador) {
    this.puntos ??= new Map();
    const activos = new Set(this.datos.pedidos.filter((p) => p.aceptado).map((p) => p.id));
    for (const [id, g] of this.puntos) if (!activos.has(id)) { this.escena.remove(g); this.puntos.delete(id); }
    for (const p of this.datos.pedidos) {
      if (!p.aceptado || this.puntos.has(p.id)) continue;
      const g = new THREE.Group();
      g.position.set(p.x, 0, p.z);
      const haz = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 60, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#3d8bff', transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide }));
      haz.position.y = 30;
      const aro = new THREE.Mesh(new THREE.RingGeometry(3, 3.6, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#3d8bff', transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
      aro.position.y = 0.2;
      const et = crearEtiqueta([{ texto: p.quien, tam: 56, color: '#8ab4ff' }, { texto: `espera ${p.gramos} g`, tam: 40 }], 5);
      et.sprite.position.y = 7.4;
      g.add(haz, aro, et.sprite);
      this.escena.add(g);
      this.puntos.set(p.id, g);
      // La persona que espera (cara dibujada, ropa al azar).
      const per = { id: `cliente${p.id % 6}`, nombre: ' ', sinFoto: true, sinCara: true, piel: ['#f1c27d', '#c68642', '#8d5524', '#e0ac69'][p.id % 4], pelo: '#2b1d14', remera: ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#212121'][p.id % 5], pantalon: '#37474f' };
      cargarCabeza(per).then((cab) => {
        if (!cab.dibujada) { dibujarCara(cab.frente, per.piel, per.pelo); cab.dibujada = true; }
        const m = crearPersonaje(per, cab);
        g.add(m.grupo);
        g.userData.m = m;
      });
    }
    // La gente mira hacia vos; la altura del piso (en el cerro de la costa, la del camino).
    for (const g of this.puntos.values()) {
      const m = g.userData.m;
      if (m) { m.grupo.rotation.y = Math.atan2(jugador.pos.x - g.position.x, jugador.pos.z - g.position.z); m.animar(dt, 0, true); }
    }
  }

  marcas() { this.alCambiarMarcas?.(this.datos.pedidos.filter((p) => p.aceptado).map((p) => ({ x: p.x, z: p.z }))); }

  // ---------- Cada cuadro ----------
  // enVan: estás manejando la camioneta de reparto.
  actualizar(dt, jugador, enVan, velocidad) {
    const tiene = !!this.estado.celular;
    this.boton.classList.toggle('oculto', !tiene || this.modo() !== 'juego');
    if (!tiene) return;
    if (!this.marcado) { this.marcado = true; this.marcas(); this.punto(); }
    const d = this.datos;
    // Mensajes nuevos.
    d.prox -= dt;
    if (d.prox <= 0 && d.pedidos.length < MAX_PEDIDOS && this.tanzania.tiene('tz_galpon')) {
      d.prox = CADA[0] + Math.random() * (CADA[1] - CADA[0]);
      const posibles = destinos(this.ciudad, this.estado).filter((x) => !d.pedidos.some((p) => p.quien === x.quien));
      const q = posibles[Math.floor(Math.random() * posibles.length)];
      if (q) {
        const gramos = [5, 8, 10, 15, 20, 25, 30, 40][Math.floor(Math.random() * 8)];
        const paga = Math.round(gramos * this.gramo * (1.5 + Math.random() * 0.6));
        const az = (l) => l[Math.floor(Math.random() * l.length)];
        const comun = !q.quien;
        const quien = comun ? az(q.cachimba ? VILLA : GENTE) : q.quien;
        d.pedidos.push({ id: ++d.id, ...q, quien, foto: q.foto || az(CARAS), gramos, paga, texto: az(comun ? PIDE_CASA : PIDE)(gramos), post: comun ? ', te espero ahí' : '', visto: false });
        this.guardar();
        sfx.pip();
        this.ui.toast(`📱 Tranzapp · ${quien}: quiere ${gramos} g de tanzania`, 'info', 4500);
        this.punto();
        if (this.abierto) this.dibujar();
      }
    }
    this.verPuntos(dt, jugador);
    // Con la camioneta: se entrega sola al frenar en el punto (con los gramos encima).
    if (enVan && Math.abs(velocidad) < 4) {
      const p = this.pedidoCerca(jugador, RADIO);
      if (p) this.entregar(p);
    } else for (const p of d.pedidos) p.avisado = false;
    // Con TanzaCoin abierto, el gráfico se mueve.
    if (this.abierto && this.app === 'coin' && (this.relojHistoria += dt) > 1) { this.relojHistoria = 0; this.dibujar(); }
  }
}
