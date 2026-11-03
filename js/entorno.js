// La copia de prueba (la carpeta prueba/, publicada en .../prueba/) es el mismo juego, pero con sus
// propias partidas guardadas y su propio lugar en Firebase: lo que se prueba ahí no toca el juego
// de verdad (las páginas de GitHub comparten el almacenamiento del navegador).
export const PRUEBA = !!globalThis.location?.pathname.includes('/prueba/'); // sin location: node (herramientas)
export const clave = (k) => (PRUEBA ? `prueba-${k}` : k);
export const RAIZ_RED = PRUEBA ? 'prueba' : '';
