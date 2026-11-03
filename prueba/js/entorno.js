// La copia de prueba (la carpeta prueba/, publicada en .../prueba/) es el mismo juego, pero con sus
// propias partidas guardadas y su propio lugar en Firebase: lo que se prueba ahí no toca el juego
// de verdad (las páginas de GitHub comparten el almacenamiento del navegador).
export const PRUEBA = !!globalThis.location?.pathname.includes('/prueba/'); // sin location: node (herramientas)
export const clave = (k) => (PRUEBA ? `prueba-${k}` : k);
export const RAIZ_RED = PRUEBA ? 'prueba' : '';
// Link de la prueba con "&completa" (…/prueba/#llave=…&completa): la partida de la prueba queda con
// la mansión al 100% y plata para probar lo nuevo (guardada; se lee antes de que se borre el link).
export const PEDIR_COMPLETA = PRUEBA && new URLSearchParams(globalThis.location?.hash.slice(1)).has('completa');

// La prueba se abre solo con el link del dueño (…/prueba/#llave=…): acá está la huella (SHA-256) de la
// llave, no la llave. La primera vez queda recordada en ese navegador. Sin llave: "no encontrada".
const HUELLA = 'b56a649d3ac9f765f3cb7ee885dc4d3a3cc83449d406886e8fb92741f6bc0a8e';
export async function llaveOk() {
  if (!PRUEBA) return true;
  const deLink = new URLSearchParams(location.hash.slice(1)).get('llave');
  let llave = deLink;
  try { llave ||= localStorage.getItem('prueba-llave'); } catch { /* sin almacenamiento */ }
  if (!llave || !crypto.subtle) return false;
  const h = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(llave)))].map((b) => b.toString(16).padStart(2, '0')).join('');
  if (h !== HUELLA) return false;
  try { localStorage.setItem('prueba-llave', llave); } catch { /* sin almacenamiento */ }
  if (deLink) history.replaceState(null, '', location.pathname + location.search); // que no quede a la vista
  return true;
}
