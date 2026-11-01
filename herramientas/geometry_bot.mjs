// Prueba del Geometry Dash del arcade: un bot que salta cuando hay algo adelante tiene que poder pasar el nivel.
// Uso: node herramientas/geometry_bot.mjs
import { GeometryDash } from '../js/geometry.js';
const estado = {};
const gd = new GeometryDash({ estado, guardar: () => {}, sfx: null });
let mejor = null;
for (let adelanto = 0.6; adelanto <= 2.6; adelanto += 0.1) {
  gd.intento = 0; gd.reiniciar();
  let t = 0;
  while (t < 60 && !gd.gano && !gd.muerto) {
    const cerca = gd.objetos.some(([tp, ox, oy]) => ox > gd.x + 0.5 && ox < gd.x + 0.5 + adelanto && (tp !== 'b' ? oy <= gd.y + 0.1 : oy >= gd.y - 0.1 && oy < gd.y + 1));
    gd.apretado = cerca;
    if (cerca) gd.saltar();
    gd.paso(1 / 60);
    t += 1 / 60;
  }
  const pct = gd.gano ? 100 : Math.floor(gd.x / 230 * 100);
  if (!mejor || pct > mejor[1]) mejor = [adelanto.toFixed(1), pct];
}
if (!mejor || mejor[1] < 100) throw new Error('El nivel no se puede pasar: el bot llegó al ' + mejor?.[1] + '%');
console.log('ok: el bot pasa el nivel (adelanto', mejor[0] + ')');
