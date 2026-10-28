// Safari del iPhone tiene un tope para la memoria de todos los canvas juntos: pasado el tope, los
// canvas nuevos quedan vacíos (texturas negras, fotos que no aparecen). Los que se dibujan una sola
// vez se achican a 1x1 apenas la textura se sube a la placa de video (ahí ya no hacen falta).
// Solo para canvas que no se usan en otro lado ni se vuelven a dibujar.
export function liberarAlSubir(tex) {
  tex.onUpdate = () => {
    tex.onUpdate = null;
    const c = tex.image;
    if (c && c.getContext) { c.width = 1; c.height = 1; }
  };
  return tex;
}
