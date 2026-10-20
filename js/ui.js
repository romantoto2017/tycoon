import { formato } from './util.js';
import { canvasMoneda, obtenerCara } from './texturas.js';

const $ = (id) => document.getElementById(id);

export function prepararHUD() {
  $('icono-moneda').src = canvasMoneda(96).toDataURL();
}

let plataMostrada = '';
let ppsMostrado = '';

export function actualizarHUD(plata, pps) {
  const p = formato(plata);
  if (p !== plataMostrada) { $('plata').textContent = p; plataMostrada = p; }
  const s = `+${pps < 100 ? (Math.round(pps * 10) / 10) : formato(pps)}/s`;
  if (s !== ppsMostrado) { $('pps').textContent = s; ppsMostrado = s; }
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

// Arma la grilla de personajes. alElegir(personaje) se llama al tocar una carta.
export async function armarSeleccion(personajes, elegidoId, alElegir) {
  const grilla = $('grilla-personajes');
  grilla.innerHTML = '';
  const caras = await Promise.all(personajes.map(obtenerCara));
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
