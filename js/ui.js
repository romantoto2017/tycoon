import { formato } from './util.js';
import { canvasMoneda, obtenerCara } from './texturas.js';

const $ = (id) => document.getElementById(id);

export function prepararHUD() {
  $('icono-moneda').src = canvasMoneda(96).toDataURL();
}

let plataMostrada = '';
let ppsMostrado = '';
let progresoMostrado = '';

// Cuando la plata baja de golpe (una compra), el contador baja animado (unos 200 ms); cuando
// sube (lo que vas ganando), va al toque.
let plataAnimada = 0;
export function actualizarHUD(plata, pps, progreso) {
  plataAnimada = plata >= plataAnimada || plataAnimada - plata < 1 ? plata : plataAnimada + (plata - plataAnimada) * 0.22;
  const p = formato(plataAnimada);
  if (p !== plataMostrada) { $('plata').textContent = p; plataMostrada = p; }
  const s = `+${pps < 100 ? (Math.round(pps * 10) / 10) : formato(pps)}/s`;
  if (s !== ppsMostrado) { $('pps').textContent = s; ppsMostrado = s; }
  const m = `Mansión ${Math.floor(progreso * 100)}%`;
  if (m !== progresoMostrado) { $('progreso').textContent = m; progresoMostrado = m; }
}

export function toast(texto, tipo = 'ok', ms = 2300) {
  const cont = $('toasts');
  while (cont.children.length >= 3) cont.firstChild.remove();
  const el = document.createElement('div');
  el.className = `toast ${tipo}`;
  el.textContent = texto;
  el.style.animationDuration = `${ms - 100}ms`; // la animación (entra, queda y se va) dura lo mismo
  cont.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

// Cartel fijo arriba (no se va solo): para avisos que duran mientras pasa algo.
// aviso(texto, tipo) lo muestra o lo cambia; aviso(null) lo saca.
export function aviso(texto, tipo = 'error') {
  const el = $('aviso');
  el.classList.toggle('oculto', !texto);
  if (!texto) return;
  el.textContent = texto;
  el.className = `aviso ${tipo}`;
}

export function mostrar(id, visible) {
  $(id).classList.toggle('oculto', !visible);
}

export function visible(id) {
  return !$(id).classList.contains('oculto');
}

// Arma la grilla de personajes. alElegir(personaje) se llama al tocar una carta.
export async function armarSeleccion(personajes, elegidoId, alElegir) {
  const grilla = $('grilla-personajes');
  const caras = await Promise.all(personajes.map(obtenerCara));
  grilla.innerHTML = '';
  personajes.forEach((p, i) => {
    const carta = document.createElement('button');
    carta.className = 'carta' + (p.id === elegidoId ? ' elegida' : '');
    carta.style.background = p.remera;
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    c.getContext('2d').drawImage(caras[i], 0, 0, 128, 128);
    const nombre = document.createElement('span');
    nombre.textContent = p.nombre;
    carta.append(c, nombre);
    carta.addEventListener('click', () => alElegir(p));
    grilla.appendChild(carta);
  });
}

export function pedirConfirmacion() {
  return new Promise((resolve) => {
    mostrar('confirmar', true);
    const cerrar = (valor) => {
      mostrar('confirmar', false);
      $('btn-confirmar').onclick = $('btn-cancelar').onclick = null;
      resolve(valor);
    };
    $('btn-confirmar').onclick = () => cerrar(true);
    $('btn-cancelar').onclick = () => cerrar(false);
  });
}

export function duracion(seg) {
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

let alCelebrar = null;
export function onCelebrar(fn) { alCelebrar = fn; }

export function celebrar(segundos) {
  $('final-tiempo').textContent = `Tiempo de juego: ${duracion(segundos)}`;
  mostrar('final', true);
  alCelebrar?.();
}

// Conecta los sliders de configuración. alCambiar(ajustes) se llama en cada cambio.
export function prepararConfig(ajustes, alCambiar) {
  const sliders = { general: 'aj-general', musica: 'aj-musica', efectos: 'aj-efectos', sensibilidad: 'aj-sensibilidad' };
  for (const [clave, id] of Object.entries(sliders)) {
    const el = $(id);
    el.value = Math.round(ajustes[clave] * 100);
    el.addEventListener('input', () => {
      ajustes[clave] = Number(el.value) / 100;
      alCambiar(ajustes);
    });
  }
  // Música on/off: el parlante con ondas o tachado.
  const btnMusica = $('btn-musica');
  const verMusica = () => {
    btnMusica.classList.toggle('apagada', !ajustes.musicaOn);
    btnMusica.setAttribute('aria-pressed', String(ajustes.musicaOn));
    btnMusica.setAttribute('aria-label', ajustes.musicaOn ? 'Música encendida' : 'Música apagada');
  };
  verMusica();
  btnMusica.addEventListener('click', () => {
    ajustes.musicaOn = !ajustes.musicaOn;
    verMusica();
    alCambiar(ajustes);
  });
  // Calidad de imagen: 50% a 100% de la resolución de la pantalla.
  const calidad = $('aj-calidad');
  const texto = $('aj-calidad-valor');
  const verValor = () => { texto.textContent = `${calidad.value}%${calidad.value === '100' ? ' (máxima)' : ''}`; };
  calidad.value = Math.round(ajustes.calidad * 100);
  verValor();
  calidad.addEventListener('input', verValor);
  calidad.addEventListener('change', () => {
    ajustes.calidad = Number(calidad.value) / 100;
    alCambiar(ajustes);
  });
}

// ---------- Menú del restaurante ----------
// Íconos de cada plato (SVG dibujado acá: plato blanco y la comida encima).
const ICONOS_PLATO = {
  mila_pure: '<ellipse cx="25" cy="32" rx="13" ry="9" fill="#c88a3a"/><ellipse cx="25" cy="31" rx="10" ry="6" fill="#d9a35a"/><circle cx="42" cy="34" r="8" fill="#f3e3a0"/>',
  mila_fritas: '<ellipse cx="24" cy="32" rx="13" ry="9" fill="#c88a3a"/><g stroke="#f2c84b" stroke-width="3.5" stroke-linecap="round"><path d="M38 26l8 14M42 25l2 16M46 27l-4 13"/></g>',
  fideos: '<circle cx="32" cy="32" r="15" fill="#ecd28c"/><path d="M21 30q5-5 10 0t10 0M21 36q5-5 10 0t10 0" stroke="#d9b86a" stroke-width="2" fill="none"/><circle cx="32" cy="31" r="7" fill="#c0392b"/>',
  guiso: '<circle cx="32" cy="32" r="16" fill="#7a4a2a"/><rect x="24" y="25" width="5" height="5" fill="#e67e22"/><rect x="35" y="30" width="5" height="5" fill="#e67e22"/><rect x="28" y="36" width="5" height="5" fill="#d9b37a"/><rect x="37" y="22" width="4" height="4" fill="#d9b37a"/>',
  pollo_arroz: '<ellipse cx="25" cy="32" rx="12" ry="8" fill="#e2b07a"/><circle cx="42" cy="33" r="9" fill="#fbfaf5" stroke="#e6e1d3"/>',
  strogonoff: '<ellipse cx="26" cy="32" rx="12" ry="10" fill="#d8b48a"/><rect x="20" y="28" width="5" height="4" fill="#7a4a2a"/><rect x="27" y="33" width="5" height="4" fill="#7a4a2a"/><circle cx="43" cy="33" r="8" fill="#fbfaf5" stroke="#e6e1d3"/>',
};

export function abrirMenuResto(platos, alElegir, alCerrar) {
  const lista = $('platos');
  lista.innerHTML = '';
  const cerrar = () => {
    mostrar('menu-resto', false);
    window.removeEventListener('keydown', teclas);
    alCerrar();
  };
  const teclas = (e) => { if (e.code === 'Escape') cerrar(); };
  for (const p of platos) {
    const b = document.createElement('button');
    b.className = 'plato';
    b.innerHTML = `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="29" fill="#ffffff" stroke="#d6d9de" stroke-width="2"/><circle cx="32" cy="32" r="22" fill="#f4f6f8"/>${ICONOS_PLATO[p.id] || ''}</svg><span>${p.nombre}</span>`;
    b.addEventListener('click', () => { cerrar(); alElegir(p.id); });
    lista.appendChild(b);
  }
  $('btn-cerrar-resto').onclick = cerrar;
  window.addEventListener('keydown', teclas);
  mostrar('menu-resto', true);
  lista.firstChild?.focus();
}

// ---------- Panel del gym (mientras entrenás) ----------
let repApretado = false;
export const repGymApretado = () => repApretado;
function marcarPeso(kg) {
  for (const b of $('pg-pesos').children) b.setAttribute('aria-pressed', String(Number(b.dataset.kg) === kg));
}
// pesos: [{ kg, texto, pesado }]. alPeso(kg) al tocar un peso; alSalir() al salir.
export function abrirPanelGym({ nombre, pesos, peso, alPeso, alSalir, alPulsar }) {
  $('pg-nombre').textContent = nombre;
  const lista = $('pg-pesos');
  lista.innerHTML = '';
  for (const p of pesos) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `pg-peso${p.pesado ? ' pesado' : ''}`;
    b.dataset.kg = p.kg;
    b.innerHTML = `<span>${p.texto}</span><small>${p.nota}</small>`;
    b.addEventListener('click', () => { alPeso(p.kg); marcarPeso(p.kg); b.blur(); });
    lista.appendChild(b);
  }
  marcarPeso(peso);
  const rep = $('pg-rep');
  rep.onpointerdown = (e) => { e.preventDefault(); repApretado = true; rep.classList.add('apretado'); alPulsar(); };
  rep.onpointerup = rep.onpointerleave = rep.onpointercancel = () => { repApretado = false; rep.classList.remove('apretado'); };
  $('pg-salir').onclick = () => alSalir();
  mostrar('panel-gym', true);
}
export function actualizarPanelGym({ reps, serie, energia, peso, bauti }) {
  $('pg-reps').textContent = reps;
  $('pg-serie').textContent = serie;
  const en = $('pg-energia');
  en.style.width = `${Math.round(energia * 100)}%`;
  en.parentElement.dataset.nivel = energia < 0.25 ? 'baja' : energia < 0.6 ? 'media' : 'alta';
  marcarPeso(peso);
  const el = $('pg-bauti');
  el.classList.toggle('oculto', !bauti);
  if (!bauti) return;
  el.dataset.fase = bauti.fase;
  $('pg-barra').style.width = `${Math.round(bauti.fraccion * 100)}%`;
  $('pg-bauti-texto').textContent = bauti.texto;
}
// Minijuego de la última rep: null lo oculta; si no, { prog, tiempo, dificil } (0 a 1).
export function luchaGym(l) {
  const el = $('pg-lucha');
  el.classList.toggle('oculto', !l);
  $('pg-rep').textContent = l ? '¡EMPUJÁ!' : 'Repetición';
  $('pg-rep').classList.toggle('lucha', !!l);
  if (!l) return;
  $('pg-lucha-prog').style.width = `${Math.round(l.prog * 100)}%`;
  $('pg-lucha-tiempo').style.width = `${Math.round(Math.max(0, l.tiempo) * 100)}%`;
  $('pg-lucha-texto').textContent = l.dificil ? '¡Al fallo! Apretá MUY rápido' : '¡Apretá rápido para subirla!';
}
export function cerrarPanelGym() {
  repApretado = false;
  mostrar('panel-gym', false);
}

// ---------- Karaoke ----------
// actual: [{ texto, avance (0 a 1) }] palabra por palabra; siguiente: la línea que viene.
let karaokePalabras = null;
export function letraKaraoke(actual, siguiente) {
  const p = $('karaoke-actual');
  const clave = actual.map((x) => x.texto).join(' ');
  if (karaokePalabras !== clave) {
    karaokePalabras = clave;
    p.replaceChildren(...actual.flatMap((x, i) => {
      const span = document.createElement('span');
      span.textContent = x.texto;
      return i ? [' ', span] : [span];
    }));
  }
  const sig = $('karaoke-siguiente');
  if (sig.textContent !== siguiente) sig.textContent = siguiente;
  p.querySelectorAll('span').forEach((span, i) => span.style.setProperty('--avance', `${Math.round(actual[i].avance * 100)}%`));
  mostrar('karaoke', true);
}
export function ocultarKaraoke() {
  mostrar('karaoke', false);
  karaokePalabras = null;
}

// ---------- Autódromo ----------
// datos: { autos: [{ id, nombre, tuyo, vmax, cero100, agarre, mejor, tieneMejor, medallas: [{ nombre, color, tiempo, ganada }] }], largo }
export function abrirAutodromo(datos, alElegir, alCerrar) {
  $('autodromo-info').textContent = `Trazado de ${datos.largo.replace('.', ',')} km · Vueltas cronometradas · Elegí tu auto`;
  const ul = $('autodromo-autos');
  ul.replaceChildren();
  const barra = (v) => `<span class="ad-barra"><i style="width:${Math.round(Math.max(0.04, Math.min(1, v)) * 100)}%"></i></span>`;
  for (const a of datos.autos) {
    const li = document.createElement('li');
    li.className = `ad-auto${a.tuyo ? '' : ' bloqueado'}`;
    li.innerHTML = `
      <h3></h3>
      <div class="ad-barras">
        <span>Velocidad</span>${barra(a.vmax / 350)}<span>${a.vmax} km/h</span>
        <span>Aceleración</span>${barra((16 - a.cero100) / 13.5)}<span>0-100 ${String(a.cero100).replace('.', ',')} s</span>
        <span>Agarre</span>${barra((a.agarre - 0.6) / 0.7)}<span>${String(a.agarre).replace('.', ',')} g</span>
      </div>
      <div class="ad-medallas">${a.medallas.map((m) => `<span class="ad-medalla${m.ganada ? ' ganada' : ''}" style="--color:${m.color}">${m.nombre}<b>${m.tiempo}</b></span>`).join('')}</div>
      <p class="ad-mejor">Tu récord: <b>${a.tieneMejor ? a.mejor : 'sin tiempo'}</b></p>`;
    li.querySelector('h3').textContent = a.nombre;
    const btn = document.createElement('button');
    btn.className = `btn ${a.tuyo ? 'rojo' : 'gris'}`;
    btn.textContent = a.tuyo ? 'Correr' : 'No lo tenés';
    btn.disabled = !a.tuyo;
    btn.onclick = () => { mostrar('autodromo', false); alElegir(a.id); };
    li.append(btn);
    ul.append(li);
  }
  $('btn-cerrar-autodromo').onclick = () => { mostrar('autodromo', false); alCerrar?.(); };
  mostrar('autodromo', true);
  ul.querySelector('.btn:not([disabled])')?.focus();
}

export function hudCarrera(d) {
  $('carrera-auto').textContent = d.auto;
  $('carrera-vuelta').textContent = d.vuelta;
  $('carrera-tiempo').textContent = d.tiempo;
  $('carrera-ultima').textContent = d.ultima;
  $('carrera-mejor').textContent = d.mejor;
  const o = $('carrera-objetivo');
  o.textContent = d.objetivo;
  o.style.color = d.colorObjetivo;
  $('carrera-vel').textContent = d.velocidad;
  const fuera = $('carrera-fuera');
  fuera.textContent = d.fuera === 'anulada' ? '¡Fuera de los límites! Vuelta anulada' : '¡Por el pasto!';
  fuera.classList.toggle('oculto', !d.fuera);
  mostrar('carrera', true);
}

// luz: 0 rojo, 1 amarillo, 2 verde, -1 apagado (se oculta).
export function semaforoCarrera(luz) {
  const s = $('semaforo');
  s.classList.toggle('oculto', luz < 0);
  s.querySelectorAll('i').forEach((el, i) => { el.className = i === luz ? ['rojo', 'amarillo', 'verde'][i] : ''; });
}

export function ocultarCarrera() {
  mostrar('carrera', false);
  mostrar('semaforo', false);
}

// ---------- Misiones ----------
// lista: [{ titulo, texto, detalle, avance, hecha, tuya, cara (dataURL), nombre }]
export function abrirMisiones(lista, alCerrar) {
  const ul = $('lista-misiones');
  ul.innerHTML = '';
  for (const m of lista) {
    const li = document.createElement('li');
    if (m.bloqueada) {
      // Bloqueada: gris, con el "?" de piedra y sin pistas.
      li.className = 'mision bloqueada';
      li.innerHTML = `
      <div class="mision-piedra" aria-hidden="true"><span>?</span></div>
      <div class="mision-info">
        <h3>???</h3>
        <p>Seguí construyendo la mansión para desbloquearla.</p>
      </div>
      <div class="mision-check" aria-label="Bloqueada"></div>`;
      ul.appendChild(li);
      continue;
    }
    li.className = `mision${m.hecha ? ' hecha' : ''}`;
    li.innerHTML = `
      <div class="mision-cara"><img alt="" src="${m.cara || ''}"><span>${m.nombre}</span></div>
      <div class="mision-info">
        <h3>${m.titulo} <span class="mision-premio${m.hecha ? ' cobrado' : ''}">${m.hecha ? 'Cobraste' : 'Premio'} $${formato(m.premioPlata || 0)}</span></h3>
        <p>${m.texto}</p>
        <div class="mision-barra" role="progressbar" aria-valuenow="${Math.round(m.avance * 100)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${Math.round(m.avance * 100)}%"></i></div>
        ${m.detalle || (!m.hecha && !m.tuya) ? `<small>${m.detalle}${!m.hecha && !m.tuya ? `${m.detalle ? ' · ' : ''}Solo con ${m.nombre}` : ''}</small>` : ''}
      </div>
      <div class="mision-check" aria-label="${m.hecha ? 'Cumplida' : 'Sin cumplir'}">${m.hecha ? '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>' : ''}</div>`;
    ul.appendChild(li);
  }
  const cerrar = () => {
    mostrar('misiones', false);
    window.removeEventListener('keydown', teclas);
    alCerrar();
  };
  const teclas = (e) => { if (e.code === 'Escape' || e.code === 'KeyM') { e.stopPropagation(); cerrar(); } };
  $('btn-cerrar-misiones').onclick = cerrar;
  $('misiones').onclick = (e) => { if (e.target.id === 'misiones') cerrar(); };
  window.addEventListener('keydown', teclas);
  mostrar('misiones', true);
  $('btn-cerrar-misiones').focus();
}
export function puntoMisiones(v) { $('misiones-punto').classList.toggle('oculto', !v); }
export function botonMisiones(v) { $('btn-misiones').classList.toggle('oculto', !v); }

// ---------- Diálogo de historia ----------
// Escribe cada línea de a poco; Continuar / E / Espacio / clic completa la línea o pasa a la
// siguiente. Al terminar llama a alTerminar().
let observadorDialogo = null;
// opciones: (opcional) textos para elegir al terminar la última línea; alElegir(i) recibe la
// elegida (con el mouse, tocando o con las teclas 1, 2, 3...). Sin opciones, alTerminar al final.
export function dialogo({ nombre, cara, remera, lineas, alTerminar, opciones = null, alElegir = null }) {
  $('dialogo-nombre').textContent = nombre;
  $('dialogo-cara').src = cara;
  $('dialogo-cuerpo').style.background = remera;
  const texto = $('dialogo-texto');
  const boton = $('dialogo-seguir');
  const lista = $('dialogo-opciones');
  lista.innerHTML = '';
  lista.hidden = true;
  boton.hidden = false;
  let i = 0;
  let letras = 0;
  let timer = null;
  const ultima = () => i === lineas.length - 1;
  const cerrar = () => {
    clearInterval(timer);
    window.removeEventListener('keydown', teclas, true);
    lista.hidden = true;
    boton.hidden = false;
    mostrar('dialogo', false);
  };
  const mostrarOpciones = () => {
    if (!lista.hidden) return;
    boton.hidden = true;
    lista.hidden = false;
    opciones.forEach((t, n) => {
      const b = document.createElement('button');
      b.className = 'dialogo-opcion';
      b.type = 'button';
      b.innerHTML = `<span class="dialogo-num">${n + 1}</span>${t}`;
      b.addEventListener('click', (e) => { e.stopPropagation(); cerrar(); alElegir(n); });
      lista.appendChild(b);
    });
    lista.firstChild?.focus({ preventScroll: true });
  };
  const escribir = () => {
    const linea = lineas[i];
    letras = 0;
    boton.textContent = ultima() ? 'Vamos ▸' : 'Continuar ▸';
    clearInterval(timer);
    timer = setInterval(() => {
      letras++;
      texto.textContent = linea.slice(0, letras);
      if (letras >= linea.length) {
        clearInterval(timer);
        if (ultima() && opciones) mostrarOpciones();
      }
    }, 24);
  };
  const seguir = () => {
    if (letras < lineas[i].length) {
      clearInterval(timer);
      letras = lineas[i].length;
      texto.textContent = lineas[i];
      if (ultima() && opciones) mostrarOpciones();
      return;
    }
    if (ultima() && opciones) { mostrarOpciones(); return; }
    i++;
    if (i < lineas.length) { escribir(); return; }
    cerrar();
    alTerminar?.();
  };
  const teclas = (e) => {
    if (!lista.hidden) {
      const n = Number(e.key) - 1;
      if (n >= 0 && n < opciones.length) { e.preventDefault(); e.stopPropagation(); lista.children[n].click(); }
      else if (['KeyE', 'Space'].includes(e.code)) { e.preventDefault(); e.stopPropagation(); }
      return; // Enter elige la que tiene el foco (el botón)
    }
    if (['KeyE', 'Space', 'Enter'].includes(e.code)) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) seguir(); }
  };
  $('dialogo').onclick = () => { if (lista.hidden) seguir(); };
  // La foto del personaje va siempre arriba de la caja (si el texto ocupa más líneas, sube).
  const caja = document.querySelector('.dialogo-caja');
  const personaje = document.querySelector('.dialogo-personaje');
  observadorDialogo ??= new ResizeObserver(() => { personaje.style.bottom = `${caja.offsetHeight}px`; });
  observadorDialogo.observe(caja);
  window.addEventListener('keydown', teclas, true);
  mostrar('dialogo', true);
  escribir();
}

// ---------- Tienda de ropa: catálogo ----------
// prendas: [{ id, nombre, foto, precio, tuya }]. alComprar(id) devuelve true si se compró.
export function abrirCatalogo({ titulo, sub, prendas, plata, alComprar, alCerrar, tema = '' }) {
  $('catalogo').classList.toggle('tema-lucca', tema === 'lucca'); // Lucca Bossio: blanco y negro, minimalista
  $('catalogo-titulo').textContent = titulo;
  $('catalogo-sub').textContent = sub;
  const lista = $('catalogo-lista');
  const dibujar = () => {
    lista.innerHTML = '';
    for (const p of prendas) {
      const b = document.createElement('button');
      b.className = 'prenda';
      const caro = !p.tuya && plata() < p.precio;
      b.innerHTML = `<span class="foto"><img alt="" src="${p.foto}"></span><b>${p.nombre}</b>${p.tuya ? '<span class="estado">Ya la tenés</span>' : `<span class="precio${caro ? ' caro' : ''}">$${formato(p.precio)}</span>`}`;
      b.setAttribute('aria-label', p.tuya ? `${p.nombre}: ya la tenés` : `Comprar ${p.nombre} por $${formato(p.precio)}`);
      b.addEventListener('click', () => {
        if (p.tuya) return;
        if (alComprar(p.id)) { p.tuya = true; dibujar(); }
      });
      lista.appendChild(b);
    }
  };
  const cerrar = () => {
    mostrar('catalogo', false);
    window.removeEventListener('keydown', teclas);
    alCerrar();
  };
  const teclas = (e) => { if (e.code === 'Escape') cerrar(); };
  $('btn-cerrar-catalogo').onclick = cerrar;
  $('catalogo').onclick = (e) => { if (e.target.id === 'catalogo') cerrar(); };
  window.addEventListener('keydown', teclas);
  dibujar();
  mostrar('catalogo', true);
  return { cerrar, dibujar };
}

// ---------- Ropero ----------
// slots: [{ id, nombre }]; tuyas: prendas compradas; puesto: { slot: id }. Tocar una prenda
// se la prueba (alProbar con la ropa nueva); "Ponérmelo" guarda (alListo) y "Cancelar" no.
export function abrirRopero({ titulo, slots, tuyas, puesto, aviso, alProbar, alListo, alCerrar }) {
  $('ropero-titulo').textContent = titulo;
  const ropa = { ...puesto };
  const lista = $('ropero-lista');
  const dibujar = () => {
    lista.innerHTML = '';
    if (aviso) {
      lista.innerHTML = `<p class="ropero-vacio">${aviso}</p>`;
      return;
    }
    if (!tuyas.length) {
      lista.innerHTML = '<p class="ropero-vacio">Todavía no tenés ropa.</p>';
      return;
    }
    for (const s of slots) {
      const deSlot = tuyas.filter((p) => p.slot === s.id);
      if (!deSlot.length) continue;
      const h = document.createElement('h3');
      h.textContent = s.nombre;
      lista.appendChild(h);
      const grilla = document.createElement('div');
      grilla.className = 'ropero-grilla';
      const opcion = (p) => {
        const b = document.createElement('button');
        b.className = `prenda${p ? '' : ' nada'}`;
        b.setAttribute('aria-pressed', String((ropa[s.id] || null) === (p ? p.id : null)));
        b.innerHTML = p ? `<span class="foto"><img alt="" src="${p.foto}"></span><b>${p.nombre}</b>` : '<span class="foto">Lo de siempre</span><b>Sin nada de acá</b>';
        b.addEventListener('click', () => {
          if (p) ropa[s.id] = p.id;
          else delete ropa[s.id];
          dibujar();
          alProbar({ ...ropa });
        });
        grilla.appendChild(b);
      };
      opcion(null);
      deSlot.forEach(opcion);
      lista.appendChild(grilla);
    }
  };
  const cerrar = () => {
    mostrar('ropero', false);
    window.removeEventListener('keydown', teclas);
    alCerrar();
  };
  const teclas = (e) => { if (e.code === 'Escape') cerrar(); };
  $('btn-ropero-cancelar').onclick = cerrar;
  $('btn-ropero-listo').onclick = () => { alListo({ ...ropa }); cerrar(); };
  $('btn-ropero-listo').disabled = !!aviso;
  window.addEventListener('keydown', teclas);
  dibujar();
  mostrar('ropero', true);
}

// ======================= Taller =======================
// Menú a la izquierda (pestañas con íconos y el contenido) y, a la derecha, el auto de verdad en la
// escena (se gira arrastrando) con la tarjeta de stats abajo. d: lo que arma Taller.entrar (auto.js).
const STATS = [
  { id: 'velocidad', nombre: 'Velocidad máx.', color: '#ff7a00', barra: (v) => v / 420, texto: (v) => `${v} km/h` },
  { id: 'aceleracion', nombre: 'Aceleración', color: '#ffd23f', barra: (v) => (16 - v) / 14.2, texto: (v) => `0-100 ${v.toFixed(1).replace('.', ',')} s` },
  { id: 'manejo', nombre: 'Manejo', color: '#3ccf4e', barra: (v) => v / 1.65, texto: (v) => `${v.toFixed(2).replace('.', ',')} g` },
  { id: 'frenado', nombre: 'Frenado', color: '#2f8cff', barra: (v) => v / 1.75, texto: (v) => `${v.toFixed(2).replace('.', ',')} g` },
];
const PARTES_PINTURA = { pintura: { parte: 'carroceria', nombre: 'Pintura', icono: '🎨' }, llantas: { parte: 'llantas', nombre: 'Llantas', icono: '⚪' } };
let monedaTaller = null;

const hexAHsv = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: ((h * 60) + 360) % 360, s: max ? d / max : 0, v: max };
};
const hsvAHex = ({ h, s, v }) => {
  const f = (n) => {
    const k = (n + h / 60) % 6;
    return Math.round((v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255);
  };
  return `#${[f(5), f(3), f(1)].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
};

export function abrirTaller(d) {
  monedaTaller ??= canvasMoneda(48).toDataURL();
  $('taller-auto').textContent = d.nombre;
  const pestanas = [...d.categorias.map((c) => ({ id: c.id, nombre: c.nombre, icono: c.icono })), ...Object.entries(PARTES_PINTURA).map(([id, p]) => ({ id, nombre: p.nombre, icono: p.icono }))];
  let actual = pestanas[0].id;
  let previa = null; // mejoras que se están mirando (para la franja de la tarjeta de stats)
  const plataTxt = (n) => `<img src="${monedaTaller}" alt="">${formato(n)}`;

  // ---- Tarjeta de stats ----
  const dibujarStats = () => {
    const ahora = d.stats(d.niveles());
    const nuevo = previa ? d.stats(previa) : null;
    $('taller-stats').innerHTML = STATS.map((st) => {
      const a = Math.max(0.03, Math.min(1, st.barra(ahora[st.id])));
      const b = nuevo ? Math.max(a, Math.min(1, st.barra(nuevo[st.id]))) : a;
      // Mejora en %: para la aceleración, cuánto baja el 0 a 100.
      const pct = nuevo ? Math.round((st.id === 'aceleracion' ? ahora[st.id] / nuevo[st.id] - 1 : nuevo[st.id] / ahora[st.id] - 1) * 100) : 0;
      return `<div class="ts-fila"><span class="ts-nombre">${st.nombre}</span>
        <span class="ts-barra" style="--c:${st.color}"><i style="width:${a * 100}%"></i><b style="left:${a * 100}%;width:${(b - a) * 100}%"></b></span>
        <span class="ts-valor">${st.texto(nuevo && pct ? nuevo[st.id] : ahora[st.id])}</span><span class="ts-mas">${pct > 0 ? `+${pct}%` : ''}</span></div>`;
    }).join('');
  };

  // ---- Pestañas ----
  const nav = $('taller-pestanas');
  nav.replaceChildren(...pestanas.map((p) => {
    const b = document.createElement('button');
    b.className = 'tp';
    b.setAttribute('role', 'tab');
    b.dataset.id = p.id;
    b.innerHTML = `<span class="tp-icono" aria-hidden="true">${p.icono}</span><span>${p.nombre}</span>`;
    b.onclick = () => elegir(p.id);
    return b;
  }));
  $('taller-partes').replaceChildren(...Object.entries(PARTES_PINTURA).map(([id, p]) => {
    const b = document.createElement('button');
    b.className = 'tparte';
    b.dataset.id = id;
    b.title = `Pintar ${p.nombre.toLowerCase()}`;
    b.innerHTML = `<span aria-hidden="true">${p.icono}</span> ${p.nombre}`;
    b.onclick = () => elegir(id);
    return b;
  }));

  // ---- Mejoras: una tarjeta por nivel ----
  const mejoras = (cat) => {
    const niveles = d.niveles();
    const tengo = niveles[cat.id] || 0;
    const grilla = document.createElement('div');
    grilla.className = 'taller-niveles';
    cat.niveles.forEach((n, i) => {
      const nivel = i + 1;
      const comprado = nivel <= tengo;
      const siguiente = nivel === tengo + 1;
      const falta = n.precio - d.plata();
      const caro = siguiente && falta > 0;
      const t = document.createElement('div');
      t.className = `tn${comprado ? ' comprado' : siguiente ? ' siguiente' : ' bloqueado'}${caro ? ' caro' : ''}`;
      t.tabIndex = 0;
      t.innerHTML = `<span class="tn-icono" aria-hidden="true">${comprado ? '✔' : siguiente ? n.icono : '🔒'}</span>
        <b class="tn-nombre"></b><span class="tn-efecto">+${Math.round(n.efecto * 100)}% ${STATS.find((s) => s.id === cat.stat).nombre.toLowerCase()}</span>
        <span class="tn-precio">${comprado ? 'Instalado' : plataTxt(n.precio)}</span>`;
      t.querySelector('.tn-nombre').textContent = n.nombre;
      const btn = document.createElement('button');
      btn.className = `btn ${comprado ? 'gris' : siguiente && !caro ? 'verde' : 'gris'}`;
      btn.textContent = comprado ? '✔ Comprado' : siguiente ? 'Comprar' : `Nivel ${nivel}`;
      btn.disabled = !siguiente || caro;
      if (caro) t.dataset.tip = `Te faltan ${formato(falta)}`;
      btn.onclick = () => {
        if (!d.alComprar(cat.id, nivel)) return;
        previa = null;
        mostrarContenido(false);
        const nueva = $('taller-contenido').querySelectorAll('.tn')[i];
        nueva?.classList.add('destello');
      };
      t.append(btn);
      // Mirando una tarjeta: la franja de la mejora en la tarjeta de stats.
      const mirar = () => { previa = comprado ? null : { ...niveles, [cat.id]: nivel }; dibujarStats(); };
      const dejar = () => { previa = null; dibujarStats(); };
      t.addEventListener('pointerenter', mirar);
      t.addEventListener('focusin', mirar);
      t.addEventListener('pointerleave', dejar);
      t.addEventListener('focusout', dejar);
      grilla.append(t);
    });
    return grilla;
  };

  // ---- Pintura: los 8 colores, la rueda con el cuadrado y el código ----
  const pintura = (id) => {
    const { parte } = PARTES_PINTURA[id];
    const guardado = d.color(parte);
    let color = guardado;
    let hsv = hexAHsv(color);
    const caja = document.createElement('div');
    caja.className = 'taller-pintura';
    caja.innerHTML = `<div class="tc-colores" role="radiogroup" aria-label="Colores"></div>
      <div class="tc-selector"><canvas width="220" height="220" aria-label="Rueda de color"></canvas>
      <label class="tc-hex">Código <input type="text" maxlength="7" spellcheck="false" autocomplete="off"></label>
      <span class="tc-muestra"></span></div>
      <div class="tc-acciones"></div>`;
    const lienzo = caja.querySelector('canvas');
    const g = lienzo.getContext('2d');
    const hex = caja.querySelector('input');
    const muestra = caja.querySelector('.tc-muestra');
    const R = 110;
    const r = 88;
    const lado = r * Math.SQRT2 * 0.92;
    const q0 = R - lado / 2;
    const dibujar = () => {
      g.clearRect(0, 0, 220, 220);
      for (let a = 0; a < 360; a += 2) {
        g.beginPath();
        g.strokeStyle = `hsl(${a},100%,50%)`;
        g.lineWidth = R - r;
        g.arc(R, R, (R + r) / 2, ((a - 1) * Math.PI) / 180, ((a + 2) * Math.PI) / 180);
        g.stroke();
      }
      const base = g.createLinearGradient(q0, 0, q0 + lado, 0);
      base.addColorStop(0, '#fff');
      base.addColorStop(1, `hsl(${hsv.h},100%,50%)`);
      g.fillStyle = base;
      g.fillRect(q0, q0, lado, lado);
      const negro = g.createLinearGradient(0, q0, 0, q0 + lado);
      negro.addColorStop(0, 'rgba(0,0,0,0)');
      negro.addColorStop(1, '#000');
      g.fillStyle = negro;
      g.fillRect(q0, q0, lado, lado);
      // Marcas: en la rueda (tono) y en el cuadrado (saturación y brillo).
      const ah = (hsv.h * Math.PI) / 180;
      g.lineWidth = 3;
      g.strokeStyle = '#fff';
      g.beginPath(); g.arc(R + Math.cos(ah) * (R + r) / 2, R + Math.sin(ah) * (R + r) / 2, 8, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(q0 + hsv.s * lado, q0 + (1 - hsv.v) * lado, 7, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = '#000';
      g.lineWidth = 1;
      g.beginPath(); g.arc(q0 + hsv.s * lado, q0 + (1 - hsv.v) * lado, 8.5, 0, Math.PI * 2); g.stroke();
    };
    const acciones = caja.querySelector('.tc-acciones');
    const poner = (nuevo, desde) => {
      color = nuevo.toLowerCase();
      if (desde !== 'rueda') hsv = hexAHsv(color);
      if (desde !== 'hex') hex.value = color.toUpperCase();
      muestra.style.background = color;
      caja.querySelectorAll('.tc-color').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.color === color)));
      dibujar();
      d.alPrevisualizarColor(parte, color); // en vivo sobre el auto
      ponerAcciones();
    };
    const ponerAcciones = () => {
      const cambio = color !== guardado;
      const falta = d.precioPintura - d.plata();
      acciones.innerHTML = '';
      const pintar = document.createElement('button');
      pintar.className = `btn ${cambio && falta <= 0 ? 'verde' : 'gris'}`;
      pintar.innerHTML = `Pintar · ${plataTxt(d.precioPintura)}`;
      pintar.disabled = !cambio || falta > 0;
      const envoltura = document.createElement('span');
      envoltura.className = `tc-pintar${falta > 0 ? ' caro' : ''}`;
      if (falta > 0) envoltura.dataset.tip = `Te faltan ${formato(falta)}`;
      envoltura.append(pintar);
      pintar.onclick = () => {
        if (!d.alPintar(parte, color)) return;
        mostrarContenido(false);
        $('taller-contenido').querySelector('.taller-pintura')?.classList.add('destello');
      };
      const deshacer = document.createElement('button');
      deshacer.className = 'btn gris';
      deshacer.textContent = 'Deshacer';
      deshacer.disabled = !cambio;
      deshacer.onclick = () => poner(guardado);
      acciones.append(envoltura, deshacer);
    };
    const colores = caja.querySelector('.tc-colores');
    for (const c of d.colores) {
      const b = document.createElement('button');
      b.className = 'tc-color';
      b.dataset.color = c.toLowerCase();
      b.style.background = c;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-label', c);
      b.onclick = () => poner(c);
      colores.append(b);
    }
    hex.addEventListener('input', () => {
      const v = hex.value.trim().replace(/^([^#])/, '#$1');
      if (/^#[0-9a-f]{6}$/i.test(v)) poner(v, 'hex');
    });
    const tocar = (e) => {
      const rect = lienzo.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 220;
      const y = ((e.clientY - rect.top) / rect.height) * 220;
      const dist = Math.hypot(x - R, y - R);
      if (e.type === 'pointerdown') lienzo.zona = dist > r - 4 && dist < R + 4 ? 'rueda' : x > q0 - 6 && x < q0 + lado + 6 && y > q0 - 6 && y < q0 + lado + 6 ? 'cuadrado' : null;
      if (lienzo.zona === 'rueda') hsv.h = ((Math.atan2(y - R, x - R) * 180) / Math.PI + 360) % 360;
      else if (lienzo.zona === 'cuadrado') {
        hsv.s = Math.max(0, Math.min(1, (x - q0) / lado));
        hsv.v = Math.max(0, Math.min(1, 1 - (y - q0) / lado));
      } else return;
      poner(hsvAHex(hsv), 'rueda');
    };
    lienzo.addEventListener('pointerdown', (e) => { lienzo.setPointerCapture(e.pointerId); tocar(e); });
    lienzo.addEventListener('pointermove', (e) => { if (lienzo.zona && e.buttons) tocar(e); });
    lienzo.addEventListener('pointerup', () => { lienzo.zona = null; });
    poner(color, 'inicio');
    return caja;
  };

  const mostrarContenido = (animar = true) => {
    const cont = $('taller-contenido');
    const cat = d.categorias.find((c) => c.id === actual);
    const titulo = document.createElement('h3');
    titulo.textContent = cat ? cat.nombre : `${PARTES_PINTURA[actual].nombre} · ${formato(d.precioPintura)} cada vez`;
    cont.replaceChildren(titulo, cat ? mejoras(cat) : pintura(actual));
    if (animar) { cont.classList.remove('entra'); void cont.offsetWidth; cont.classList.add('entra'); }
    nav.querySelectorAll('.tp').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.id === actual)));
    $('taller-partes').querySelectorAll('.tparte').forEach((b) => b.classList.toggle('activa', b.dataset.id === actual));
    dibujarStats();
  };
  const elegir = (id) => {
    if (id === actual) return;
    // Al cambiar de pestaña, el color que no se confirmó vuelve al guardado.
    if (PARTES_PINTURA[actual]) d.alPrevisualizarColor(PARTES_PINTURA[actual].parte, d.colorGuardado(PARTES_PINTURA[actual].parte));
    actual = id;
    previa = null;
    mostrarContenido();
  };

  // ---- Girar el auto arrastrando ----
  const girar = $('taller-girar');
  let ultimoX = null;
  girar.onpointerdown = (e) => { ultimoX = e.clientX; girar.setPointerCapture(e.pointerId); };
  girar.onpointermove = (e) => { if (ultimoX == null) return; d.alGirar((e.clientX - ultimoX) * 0.012); ultimoX = e.clientX; };
  girar.onpointerup = () => { ultimoX = null; };
  girar.onpointercancel = () => { ultimoX = null; };

  const cerrar = () => { mostrar('taller', false); document.body.classList.remove('en-taller'); document.removeEventListener('keydown', teclas); d.alCerrar(); };
  const teclas = (e) => { if (e.key === 'Escape') cerrar(); };
  document.addEventListener('keydown', teclas);
  $('btn-cerrar-taller').onclick = cerrar;
  document.body.classList.add('en-taller'); // la plata se corre a la derecha (no la tapa el menú)
  mostrar('taller', true);
  mostrarContenido(false);
  nav.querySelector('.tp')?.focus();
}

// ======================= Mapa =======================
// Minimapa en la esquina (centrado en vos, con el norte arriba) y el mapa entero a pantalla
// completa (se arrastra y se hace zoom con la rueda, pellizcando o con + y −). Abajo de todo va el plano dibujado (calles, autopista, la pista, la ciudad) y
// arriba las fotos desde arriba de cada zona, que saca main.js (capturarMapa) con todo lo que hay.
// mapa: { zonas: [{ x0, z0, x1, z1, canvas }], plano: { ... }, etiquetas: [{ x, z, texto, nivel }] }
const MAPA = { zonas: [], plano: null, etiquetas: [], pos: { x: 0, z: 0 }, angulo: 0 };
const PASTO = '#5e8e3f'; // el mismo verde que el pasto en las fotos

function dibujarMapa(g, w, h, vista, chico = false) {
  const { cx, cz, s } = vista;
  const X = (x) => (x - cx) * s + w / 2;
  const Z = (z) => (z - cz) * s + h / 2;
  const rect = (x0, z0, x1, z1, color) => {
    const a = X(x0);
    const b = Z(z0);
    const c = X(x1) - a;
    const d = Z(z1) - b;
    if (a > w || b > h || a + c < 0 || b + d < 0) return;
    g.fillStyle = color;
    g.fillRect(a, b, Math.max(c, 1), Math.max(d, 1));
  };
  g.fillStyle = PASTO;
  g.fillRect(0, 0, w, h);
  const p = MAPA.plano;
  if (p) {
    // Calle del barrio, autopista (con la línea del medio) y la pista del autódromo.
    rect(p.calle.x0, p.calle.z0, p.calle.x1, p.calle.z1, '#55575c');
    rect(p.autopista.x0, p.autopista.z0, p.autopista.x1, p.autopista.z1, '#4a4c52');
    rect(p.autopista.x0, (p.autopista.z0 + p.autopista.z1) / 2 - 0.4, p.autopista.x1, (p.autopista.z0 + p.autopista.z1) / 2 + 0.4, '#ffd23f');
    if (p.pista) {
      g.strokeStyle = '#3b3d42';
      g.lineWidth = Math.max(2, p.pista.ancho * s);
      g.lineJoin = 'round';
      g.beginPath();
      p.pista.puntos.forEach((q, i) => (i ? g.lineTo(X(q.x), Z(q.z)) : g.moveTo(X(q.x), Z(q.z))));
      g.closePath();
      g.stroke();
    }
    // La ciudad (si todavía no hay foto): manzanas por tipo y las calles.
    const colores = { plaza: '#5cab4c', parque: '#4f9a3f', futbol: '#3f8f3a', basquet: '#c0783a', nafta: '#e0e0e0', super: '#e8d9b0', banco: '#cfd8dc', hotel: '#9fa8b5', verdu: '#c5e1a5', kicks: '#f5f5f5', drip: '#3a3a3e', futbolera: '#90caf9', casino: '#a3402c', lucca: '#16171c' };
    for (const m of p.ciudad.manzanas) rect(m.x0, m.z0, m.x1, m.z1, colores[m.tipo] || ['#8a8f99', '#a3a7ae', '#b8bcc2', '#d8c9b4'][Math.min(3, Math.floor(m.anillo))]);
    for (const c of p.ciudad.calles) rect(c.x0, c.z0, c.x1, c.z1, c.avenida ? '#4a4c52' : '#5d6066');
    for (const e of p.edificios) rect(e.x0, e.z0, e.x1, e.z1, e.color);
  }
  // Las fotos desde arriba de cada zona.
  g.imageSmoothingEnabled = true;
  for (const z of MAPA.zonas) {
    const a = X(z.x0);
    const b = Z(z.z0);
    const c = (z.x1 - z.x0) * s;
    const d = (z.z1 - z.z0) * s;
    if (a > w || b > h || a + c < 0 || b + d < 0) continue;
    g.drawImage(z.canvas, a, b, c, d);
  }
  // Nombres: los importantes siempre; los demás, cuando hay zoom para leerlos.
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  for (const e of MAPA.etiquetas) {
    if (s < e.desde || (chico && e.nivel > 0)) continue; // en el minimapa, solo los grandes
    const x = X(e.x);
    const y = Z(e.z);
    if (x < -60 || x > w + 60 || y < -20 || y > h + 20) continue;
    const tam = chico ? 11 : e.nivel === 0 ? 17 : e.nivel === 1 ? 14 : 12;
    g.font = `800 ${tam}px Fredoka, Arial, sans-serif`;
    g.lineWidth = 4;
    g.strokeStyle = 'rgba(0,0,0,0.75)';
    g.strokeText(e.texto, x, y);
    g.fillStyle = e.nivel === 0 ? '#ffd23f' : '#ffffff';
    g.fillText(e.texto, x, y);
  }
  // Vos: la flecha (para donde mirás o manejás), con un anillo para encontrarla fácil.
  const px = X(MAPA.pos.x);
  const pz = Z(MAPA.pos.z);
  g.save();
  g.translate(px, pz);
  g.fillStyle = 'rgba(47, 140, 255, 0.25)';
  g.beginPath(); g.arc(0, 0, chico ? 11 : 16, 0, Math.PI * 2); g.fill();
  g.rotate(Math.PI - MAPA.angulo); // ángulo 0 = mirando a +z (para abajo en el mapa)
  const t = chico ? 8 : 11;
  g.fillStyle = '#2f8cff';
  g.strokeStyle = '#ffffff';
  g.lineWidth = 2.5;
  g.beginPath(); g.moveTo(0, -t * 1.2); g.lineTo(t * 0.85, t); g.lineTo(0, t * 0.45); g.lineTo(-t * 0.85, t); g.closePath();
  g.fill(); g.stroke();
  g.restore();
}

let mapaGrande = null; // { vista, ... } con el mapa abierto
let ultimoMini = 0;

export function prepararMapa({ plano, etiquetas, zonasDe, alAbrir, alCerrar }) {
  MAPA.plano = plano;
  MAPA.etiquetas = etiquetas;
  MAPA.zonasDe = zonasDe;
  MAPA.alAbrir = alAbrir;
  MAPA.alCerrar = alCerrar;
  $('minimapa').onclick = () => abrirMapa();
  $('btn-cerrar-mapa').onclick = () => cerrarMapa();
}

// Cada cuadro: dónde estás y para dónde mirás (el minimapa se dibuja 10 veces por segundo).
export function mapaCuadro(pos, angulo, visible) {
  MAPA.pos.x = pos.x;
  MAPA.pos.z = pos.z;
  MAPA.angulo = angulo;
  $('minimapa').classList.toggle('oculto', !visible || !!mapaGrande);
  const ahora = performance.now();
  if (mapaGrande) {
    if (ahora - ultimoMini > 200) { ultimoMini = ahora; redibujarGrande(); }
    return;
  }
  if (!visible || ahora - ultimoMini < 100) return;
  ultimoMini = ahora;
  MAPA.zonas = MAPA.zonasDe();
  const c = $('minimapa-lienzo');
  const r = c.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.round(r.width * dpr);
  const h = Math.round(r.height * dpr);
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  dibujarMapa(c.getContext('2d'), w, h, { cx: pos.x, cz: pos.z, s: 0.55 * dpr }, true);
}

function redibujarGrande() {
  const c = $('mapa-lienzo');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.round(c.clientWidth * dpr);
  const h = Math.round(c.clientHeight * dpr);
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  const v = mapaGrande.vista;
  dibujarMapa(c.getContext('2d'), w, h, { cx: v.cx, cz: v.cz, s: v.s * dpr });
}

export function abrirMapa() {
  if (mapaGrande) return;
  MAPA.alAbrir?.();
  MAPA.zonas = MAPA.zonasDe();
  mapaGrande = { vista: { cx: MAPA.pos.x, cz: MAPA.pos.z, s: 0.8 } };
  mostrar('mapa', true);
  $('minimapa').classList.add('oculto');
  const c = $('mapa-lienzo');
  const v = mapaGrande.vista;
  const limitar = () => { v.s = Math.min(6, Math.max(0.02, v.s)); };
  const zoom = (f, sx = c.clientWidth / 2, sy = c.clientHeight / 2) => {
    // Zoom alrededor del punto (sx, sy) de la pantalla: ese lugar queda donde está.
    const wx = v.cx + (sx - c.clientWidth / 2) / v.s;
    const wz = v.cz + (sy - c.clientHeight / 2) / v.s;
    v.s *= f;
    limitar();
    v.cx = wx - (sx - c.clientWidth / 2) / v.s;
    v.cz = wz - (sy - c.clientHeight / 2) / v.s;
    redibujarGrande();
  };
  $('mapa-mas').onclick = () => zoom(1.5);
  $('mapa-menos').onclick = () => zoom(1 / 1.5);
  // Arrastrar para moverse; con dos dedos, pellizcar para el zoom.
  const punteros = new Map();
  let distancia = 0;
  c.onpointerdown = (e) => { c.setPointerCapture(e.pointerId); punteros.set(e.pointerId, { x: e.clientX, y: e.clientY }); };
  c.onpointermove = (e) => {
    const antes = punteros.get(e.pointerId);
    if (!antes) return;
    if (punteros.size === 1) {
      v.cx -= (e.clientX - antes.x) / v.s;
      v.cz -= (e.clientY - antes.y) / v.s;
      punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
      redibujarGrande();
      return;
    }
    punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const [a, b] = [...punteros.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (distancia) zoom(d / distancia, (a.x + b.x) / 2, (a.y + b.y) / 2);
    distancia = d;
  };
  const soltar = (e) => { punteros.delete(e.pointerId); distancia = 0; };
  c.onpointerup = soltar;
  c.onpointercancel = soltar;
  c.onwheel = (e) => { e.preventDefault(); zoom(e.deltaY < 0 ? 1.2 : 1 / 1.2, e.offsetX, e.offsetY); };
  mapaGrande.teclas = (e) => {
    if (e.code === 'Escape' || e.code === 'KeyN') { e.preventDefault(); cerrarMapa(); }
    else if (e.key === '+') zoom(1.5);
    else if (e.key === '-') zoom(1 / 1.5);
  };
  window.addEventListener('keydown', mapaGrande.teclas);
  redibujarGrande();
  $('btn-cerrar-mapa').focus();
}

export function cerrarMapa() {
  if (!mapaGrande) return;
  window.removeEventListener('keydown', mapaGrande.teclas);
  mapaGrande = null;
  mostrar('mapa', false);
  MAPA.alCerrar?.();
}

export const mapaAbierto = () => !!mapaGrande;
