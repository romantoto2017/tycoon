// Arranque: antes de cargar el juego se pide el nombre de usuario (una vez; queda guardado) y,
// si hay multijugador (js/red-config.js), se conecta y se toma uno de los 9 terrenos. Recién
// ahí se carga main.js: las constantes (constantes.js) ya saben qué terreno es el tuyo.
import { FIREBASE } from './red-config.js';
import { conectarRed } from './red.js';

const CLAVE_UID = 'vecibanda-uid';
const CLAVE_NOMBRE = 'vecibanda-usuario';
const CLAVE_SLOT = 'vecibanda-slot';
const leer = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sin guardar */ } };
const esperar = (ms) => new Promise((r) => setTimeout(() => r(null), ms));

function pedirNombre() {
  return new Promise((resolver) => {
    const pantalla = document.getElementById('usuario');
    const input = document.getElementById('usuario-nombre');
    const boton = document.getElementById('usuario-listo');
    const aviso = document.getElementById('usuario-aviso');
    pantalla.classList.remove('oculto');
    input.focus();
    const listo = () => {
      const nombre = input.value.trim().replace(/\s+/g, ' ');
      if (nombre.length < 2 || nombre.length > 20) {
        aviso.textContent = 'Entre 2 y 20 letras';
        input.focus();
        return;
      }
      pantalla.classList.add('oculto');
      resolver(nombre);
    };
    boton.addEventListener('click', listo);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') listo(); });
  });
}

(async () => {
  const msg = document.getElementById('msg-carga');
  const param = new URLSearchParams(location.search);
  // ?uid=... solo para probar varias pestañas en la misma compu.
  let uid = param.get('uid') || leer(CLAVE_UID);
  if (!uid) {
    uid = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
    guardar(CLAVE_UID, uid);
  }
  // La vista ?completo (la mansión terminada, para mostrar) no juega en red ni pide nombre.
  const vista = param.has('completo') && !param.has('redlocal');
  let nombre = param.get('nombre') || leer(CLAVE_NOMBRE) || (vista ? 'Visitante' : null);
  if (!nombre) {
    nombre = await pedirNombre();
    guardar(CLAVE_NOMBRE, nombre);
  }
  let red = null;
  let slot = Number(leer(`${CLAVE_SLOT}-${uid}`)) || 0;
  let aviso = '';
  try {
    if (msg) msg.textContent = 'Conectando...';
    red = vista ? null : await Promise.race([conectarRed(FIREBASE), esperar(10000)]);
    if (red) {
      const k = await Promise.race([red.tomarLote(uid), esperar(10000)]);
      if (k === null) { red = null; aviso = 'No se pudo conectar: jugás solo'; }
      else if (k < 0) { red = null; aviso = 'Los 9 terrenos están ocupados: jugás solo'; }
      else slot = k;
    } else if (FIREBASE && !vista) aviso = 'No se pudo conectar: jugás solo';
  } catch (e) {
    console.warn('multijugador', e);
    red = null;
    aviso = 'No se pudo conectar: jugás solo';
  }
  guardar(`${CLAVE_SLOT}-${uid}`, String(slot));
  if (msg) msg.textContent = 'Cargando...';
  globalThis.VECI = { uid, nombre, slot: red ? slot : 0, red, aviso };
  await import('./main.js');
})();
