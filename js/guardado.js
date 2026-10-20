const CLAVE = 'vecibanda-house-v1';

export function estadoInicial() {
  return { plata: 0, banco: 0, compras: [], personaje: null };
}

export function cargar() {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE));
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
