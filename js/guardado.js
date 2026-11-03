import { PRUEBA, clave } from './entorno.js';

const CLAVE = clave('vecibanda-house-v1');

export function estadoInicial() {
  return { plata: 0, banco: 0, compras: [], personaje: null, tiempoJugado: 0 };
}

export function cargar() {
  try {
    // La copia de prueba arranca, la primera vez, con una copia de tu partida de verdad.
    const datos = JSON.parse(localStorage.getItem(CLAVE) || (PRUEBA ? localStorage.getItem('vecibanda-house-v1') : null));
    if (!datos || !Array.isArray(datos.compras)) return estadoInicial();
    return { ...estadoInicial(), ...datos };
  } catch {
    return estadoInicial();
  }
}

export function guardar(estado) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(estado));
  } catch {
    // Sin localStorage (modo incógnito, bloqueado): se juega igual, sin guardar.
  }
}

export function borrar() {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    // nada
  }
}

// ---------- Ajustes (separados de la partida: reiniciar no los borra) ----------

const CLAVE_AJUSTES = clave('vecibanda-house-ajustes');

export function cargarAjustes() {
  const base = { general: 0.8, musica: 0.5, efectos: 0.8, musicaOn: true, sensibilidad: 1, calidad: 1 };
  try {
    const datos = { ...base, ...JSON.parse(localStorage.getItem(CLAVE_AJUSTES)) };
    // Versiones viejas guardaban 'auto' / 'alta' / 'rapida': ahora es un número (1 = máxima).
    if (typeof datos.calidad !== 'number') datos.calidad = 1;
    return datos;
  } catch {
    return base;
  }
}

export function guardarAjustes(ajustes) {
  try {
    localStorage.setItem(CLAVE_AJUSTES, JSON.stringify(ajustes));
  } catch {
    // nada
  }
}
