import { formato } from './util.js';
import { canvasMoneda, obtenerCara } from './texturas.js';

const $ = (id) => document.getElementById(id);

export function prepararHUD() {
  $('icono-moneda').src = canvasMoneda(96).toDataURL();
}

let plataMostrada = '';
let ppsMostrado = '';
let progresoMostrado = '';

export function actualizarHUD(plata, pps, progreso) {
  const p = formato(plata);
  if (p !== plataMostrada) { $('plata').textContent = p; plataMostrada = p; }
  const s = `+${pps < 100 ? (Math.round(pps * 10) / 10) : formato(pps)}/s`;
  if (s !== ppsMostrado) { $('pps').textContent = s; ppsMostrado = s; }
  const m = `Mansión ${Math.floor(progreso * 100)}%`;
  if (m !== progresoMostrado) { $('progreso').textContent = m; progresoMostrado = m; }
}

export function toast(texto, tipo = 'ok') {
  const cont = $('toasts');
  while (cont.children.length >= 3) cont.firstChild.remove();
  const el = document.createElement('div');
  el.className = `toast ${tipo}`;
  el.textContent = texto;
  cont.appendChild(el);
  setTimeout(() => el.remove(), 2300);
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
export function abrirPanelGym({ nombre, pesos, peso, alPeso, alSalir }) {
  $('pg-nombre').textContent = nombre;
  const lista = $('pg-pesos');
  lista.innerHTML = '';
  for (const p of pesos) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `pg-peso${p.pesado ? ' pesado' : ''}`;
    b.dataset.kg = p.kg;
    b.innerHTML = `<span>${p.texto}</span>${p.pesado ? '<small>muy pesado</small>' : ''}`;
    b.addEventListener('click', () => { alPeso(p.kg); marcarPeso(p.kg); b.blur(); });
    lista.appendChild(b);
  }
  marcarPeso(peso);
  const rep = $('pg-rep');
  rep.onpointerdown = (e) => { e.preventDefault(); repApretado = true; rep.classList.add('apretado'); };
  rep.onpointerup = rep.onpointerleave = rep.onpointercancel = () => { repApretado = false; rep.classList.remove('apretado'); };
  $('pg-salir').onclick = () => alSalir();
  mostrar('panel-gym', true);
}
export function actualizarPanelGym({ reps, peso, bauti }) {
  $('pg-reps').textContent = reps;
  marcarPeso(peso);
  const el = $('pg-bauti');
  el.classList.toggle('oculto', !bauti);
  if (!bauti) return;
  el.dataset.fase = bauti.fase;
  $('pg-barra').style.width = `${Math.round(bauti.fraccion * 100)}%`;
  $('pg-bauti-texto').textContent = bauti.texto;
}
export function cerrarPanelGym() {
  repApretado = false;
  mostrar('panel-gym', false);
}
