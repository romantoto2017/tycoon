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
}
