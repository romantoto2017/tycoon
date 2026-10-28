// Safari del iPhone tiene un tope para la memoria de todos los canvas juntos: pasado el tope, los
// canvas nuevos quedan vacíos (texturas negras, fotos que no aparecen). Los que se dibujan una sola
// vez se achican a 1x1 apenas la textura se sube a la placa de video (ahí ya no hacen falta).
// Solo para canvas que no se usan en otro lado ni se vuelven a dibujar.
//
// Y no se espera a que aparezcan en pantalla: main.js los va subiendo de a unos pocos por cuadro
// (subirPendientes), así lo que está lejos o atrás tampoco ocupa memoria de canvas.
const pendientes = [];

export function liberarAlSubir(tex) {
  tex.onUpdate = () => {
    tex.onUpdate = null;
    const c = tex.image;
    if (c && c.getContext) { c.width = 1; c.height = 1; }
  };
  if (!tex.liberable) {
    tex.liberable = true;
    tex.addEventListener?.('dispose', () => { tex.onUpdate = null; }); // ya no hace falta subirla
  }
  pendientes.push(tex);
  return tex;
}

// subir(tex): renderer.initTexture. Las que ya se subieron solas (onUpdate en null) se saltean.
export function subirPendientes(subir, max = 10) {
  let n = 0;
  while (n < max && pendientes.length) {
    const t = pendientes.shift();
    if (t.onUpdate && t.image?.width > 1) { subir(t); n++; }
  }
}
