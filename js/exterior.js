// Piezas del terreno alrededor de la mansión (coordenadas del mundo, piso en y = 0).
import { TERRENO as T, MANSION as M, PISCINA as P, CANCHA as C, GARAGE as G } from './constantes.js';

// Cascadas de la entrada: el agua sale de un canal de piedra que se apoya en dos pilares,
// cae separada del muro (se ve el muro atrás) y llega a una pileta con espuma.
export function cascadas(k, g) {
  const piedra = k.tex('piedra', '#7a7d80', 3);
  const oscuro = k.tex('panel', '#3a3f44', 3);
  const borde = k.tex('concreto', '#a7aaad', 3);
  const lomo = 17.4;
  for (const s of [-1, 1]) {
    const x0 = s > 0 ? 9 : -21;
    const x1 = s > 0 ? 21 : -9;
    const xc = (x0 + x1) / 2;
    // Muro de fondo y pilares.
    g.add(k.cajaDe(x0, 0, 4, x1, lomo, 4.8, piedra));
    g.add(k.cajaDe(x0 - 1.2, 0, 4, x0, lomo + 2, 8.6, oscuro));
    g.add(k.cajaDe(x1, 0, 4, x1 + 1.2, lomo + 2, 8.6, oscuro));
    // Canal que lleva el agua arriba (con el agua visible) y su labio.
    g.add(k.cajaDe(x0, lomo, 4, x1, lomo + 0.6, 8.6, oscuro));
    g.add(k.cajaDe(x0, lomo + 0.6, 4, x1, lomo + 2, 4.5, oscuro));
    g.add(k.noSolido(k.cajaDe(x0, lomo + 0.6, 4.5, x1, lomo + 1.5, 8.2, k.agua)));
    g.add(k.noSolido(k.cajaDe(x0, lomo - 0.25, 8.2, x1, lomo + 1.55, 8.6, oscuro)));
    // Lámina de agua que cae desde el labio.
    const agua = k.cascada(x1 - x0, lomo - 1.1);
    agua.position.set(xc, 0.9 + (lomo - 1.1) / 2, 8.75);
    g.add(agua);
    // Pileta, espuma y luces al pie.
    g.add(k.cajaDe(x0 - 1.2, 0, 10.6, x1 + 1.2, 1.1, 11.2, borde));
    g.add(k.cajaDe(x0 - 1.2, 0, 8.6, x0 - 0.6, 1.1, 10.6, borde));
    g.add(k.cajaDe(x1 + 0.6, 0, 8.6, x1 + 1.2, 1.1, 10.6, borde));
    g.add(k.noSolido(k.cajaDe(x0, 0.1, 4.8, x1, 0.9, 10.6, k.agua)));
    g.add(k.noSolido(k.cajaDe(x0 + 0.1, 0.85, 8.3, x1 - 0.1, 1.1, 9.6, '#e1f5fe')));
    for (let x = x0 + 1.5; x < x1; x += 3) g.add(k.noSolido(k.cajaDe(x - 0.3, 0.9, 5, x + 0.3, 1, 5.4, k.brillo('#bfe9ff'))));
  }
  // Cartel de "Se busca" pegado en el pilar de la cascada derecha, mirando al camino.
  const seBusca = k.imagen('assets/especiales/se_busca.jpg', 1.5, 2);
  seBusca.position.set(7.77, 3.3, 6.6);
  seBusca.rotation.set(0, -Math.PI / 2, 0.05);
  g.add(seBusca);
}

// Baseplate verde con cordón y el contorno de la mansión marcado en el piso.
export function terreno(k, g) {
  const ancho = T.x1 - T.x0;
  const largo = T.z1 - T.z0;
  const cx = (T.x0 + T.x1) / 2;
  const cz = (T.z0 + T.z1) / 2;
  g.add(k.baseplate(ancho, largo, cx, cz));
  const borde = (x0, z0, x1, z1, alto, color) => g.add(k.noSolido(k.cajaDe(x0, 0, z0, x1, alto, z1, color)));
  const cordon = k.tex('concreto', '#e4e2de', 3);
  borde(T.x0 - 0.25, T.z0 - 0.25, T.x1 + 0.25, T.z0 + 0.25, 0.3, cordon);
  borde(T.x0 - 0.25, T.z1 - 0.25, T.x1 + 0.25, T.z1 + 0.25, 0.3, cordon);
  borde(T.x0 - 0.25, T.z0, T.x0 + 0.25, T.z1, 0.3, cordon);
  borde(T.x1 - 0.25, T.z0, T.x1 + 0.25, T.z1, 0.3, cordon);
  const l = 0.18;
  borde(M.x0, M.z0 - l, M.x1, M.z0 + l, 0.08, '#ffffff');
  borde(M.x0, M.z1 - l, M.x1, M.z1 + l, 0.08, '#ffffff');
  borde(M.x0 - l, M.z0, M.x0 + l, M.z1, 0.08, '#ffffff');
  borde(M.x1 - l, M.z0, M.x1 + l, M.z1, 0.08, '#ffffff');
}

export function camino(k, g) {
  const losetas = k.tex('baldosa', '#dcd7cf', 2.5);
  g.add(k.noSolido(k.cajaDe(-2.5, 0, 3, 2.5, 0.08, T.z1, losetas)));
  g.add(k.noSolido(k.cajaDe(-2.5, 0, P.z1 + 7, 2.5, 0.08, M.z0, losetas)));
  // Cercos bajos de arbustos recortados a los costados del camino, con algunas flores.
  [-1, 1].forEach((s) => {
    g.add(k.noSolido(k.cajaDe(s * 3 - 0.45, 0, 13, s * 3 + 0.45, 0.8, 52, '#3c7a3a')));
    for (let z = 14.5; z < 52; z += 2.5) {
      g.add(k.noSolido(k.cajaDe(s * 3 - 0.2, 0.8, z - 0.2, s * 3 + 0.2, 1.1, z + 0.2, ['#ffffff', '#f48fb1', '#ffe082'][(z | 0) % 3])));
    }
  });
}

export function cerca(k, g) {
  const blanco = '#2b2f33';
  const tramo = (eje, fijo, a0, a1) => {
    for (const y of [0.7, 1.5]) {
      if (eje === 'x') g.add(k.cajaDe(a0, y, fijo - 0.12, a1, y + 0.22, fijo + 0.12, blanco));
      else g.add(k.cajaDe(fijo - 0.12, y, a0, fijo + 0.12, y + 0.22, a1, blanco));
    }
    for (let s = a0; s <= a1 + 0.01; s += 3) {
      if (eje === 'x') g.add(k.noSolido(k.cajaDe(s - 0.18, 0, fijo - 0.18, s + 0.18, 2.1, fijo + 0.18, blanco)));
      else g.add(k.noSolido(k.cajaDe(fijo - 0.18, 0, s - 0.18, fijo + 0.18, 2.1, s + 0.18, blanco)));
    }
  };
  tramo('x', T.z0, T.x0, T.x1);
  tramo('z', T.x0, T.z0, T.z1);
  tramo('z', T.x1, T.z0, T.z1);
  tramo('x', T.z1, T.x0, -4.5);
  const cg = (G.x0 + G.x1) / 2;
  tramo('x', T.z1, 4.5, cg - 7.5);
  tramo('x', T.z1, cg + 7.5, T.x1);
  // Portón de entrada con arco.
  [-5.5, 4.5].forEach((x) => {
    g.add(k.cajaDe(x, 0, T.z1 - 0.5, x + 1, 6, T.z1 + 0.5, k.tex('piedra', '#9a9590', 2)));
    g.add(k.noSolido(k.cajaDe(x - 0.1, 6, T.z1 - 0.6, x + 1.1, 6.6, T.z1 + 0.6, '#ffc928')));
  });
  g.add(k.noSolido(k.cajaDe(-5.5, 6.6, T.z1 - 0.3, 5.5, 7.6, T.z1 + 0.3, '#c62828')));
  const arco = k.cartel('VECIBANDA', 10, 1, '#ffd23f', '#c62828');
  arco.position.set(0, 7.1, T.z1 + 0.32);
  g.add(arco);
}

function arbol(k, g, x, z, s = 1) {
  g.add(k.cajaDe(x - 0.6 * s, 0, z - 0.6 * s, x + 0.6 * s, 4 * s, z + 0.6 * s, '#7a5230'));
  g.add(k.noSolido(k.cajaDe(x - 2.6 * s, 4 * s, z - 2.6 * s, x + 2.6 * s, 7.6 * s, z + 2.6 * s, '#2e7d32')));
  g.add(k.noSolido(k.cajaDe(x - 1.7 * s, 7.6 * s, z - 1.7 * s, x + 1.7 * s, 9.6 * s, z + 1.7 * s, '#43a047')));
}

// Palmera: tronco de bloques levemente curvo y hojas caídas en abanico.
function palmera(k, g, x, z, s = 1) {
  let px = x;
  let py = 0;
  for (let i = 0; i < 6; i++) {
    const h = 1.6 * s;
    g.add(k.cajaDe(px - 0.45 * s, py, z - 0.45 * s, px + 0.45 * s, py + h, z + 0.45 * s, i % 2 ? '#8d6e4f' : '#7a5c40'));
    py += h;
    px += 0.2 * s;
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const hoja = k.noSolido(k.caja(0.7 * s, 0.15 * s, 5 * s, i % 2 ? '#3f8f3a' : '#57b04a', px + Math.sin(a) * 2.2 * s, py, z + Math.cos(a) * 2.2 * s));
    hoja.rotation.set(0.4, a, 0, 'YXZ');
    g.add(hoja);
  }
}

export function jardin(k, g) {
  [[-24, 9], [24, 9], [45.5, 27], [-46, 8], [18, -38], [-18, -38]].forEach(([x, z], i) => palmera(k, g, x, z, 0.95 + (i % 2) * 0.15));
  [[-44, 48], [-24, 50], [40, 48], [68, 40], [66, -20], [36, -40], [-70, -52], [-30, -80], [0, -78], [12, -80], [-36, -66], [-20, -40]]
    .forEach(([x, z], i) => arbol(k, g, x, z, 0.85 + (i % 3) * 0.15));
  // Canteros contra el frente de la casa.
  [[-42, -24], [24, 42]].forEach(([x0, x1]) => {
    g.add(k.cajaDe(x0, 0, 3.4, x1, 0.6, 5.2, k.tex('concreto', '#b9b6b0', 3)));
    for (let x = x0 + 0.8; x < x1; x += 1.6) {
      g.add(k.noSolido(k.cajaDe(x - 0.4, 0.6, 3.9, x + 0.4, 1.3, 4.7, ['#e91e63', '#ffeb3b', '#ffffff', '#ff5722'][(x | 0) & 3])));
    }
  });
}

export function farolas(k, g) {
  // Farol moderno: poste fino negro con una barra de luz arriba.
  const farola = (x, z) => {
    g.add(k.cajaDe(x - 0.12, 0, z - 0.12, x + 0.12, 5.6, z + 0.12, '#24282c'));
    g.add(k.noSolido(k.cajaDe(x - 0.2, 5.6, z - 0.7, x + 0.2, 5.9, z + 0.7, '#24282c')));
    g.add(k.noSolido(k.cajaDe(x - 0.14, 5.52, z - 0.6, x + 0.14, 5.6, z + 0.6, k.brillo('#ffe3a8'))));
  };
  [14, 22, 30, 38, 46].forEach((z) => { farola(-3.9, z); farola(3.9, z); });
  [24, 34, 44].forEach((z) => farola(G.x1 - 3.5, z));
}

export function fuente(k, g) {
  const cx = 30;
  const cz = 36;
  const piedra = k.tex('concreto', '#e0ddd8', 3);
  g.add(k.cajaDe(cx - 4, 0, cz - 4, cx + 4, 1, cz - 3.4, piedra));
  g.add(k.cajaDe(cx - 4, 0, cz + 3.4, cx + 4, 1, cz + 4, piedra));
  g.add(k.cajaDe(cx - 4, 0, cz - 3.4, cx - 3.4, 1, cz + 3.4, piedra));
  g.add(k.cajaDe(cx + 3.4, 0, cz - 3.4, cx + 4, 1, cz + 3.4, piedra));
  g.add(k.noSolido(k.cajaDe(cx - 3.4, 0, cz - 3.4, cx + 3.4, 0.8, cz + 3.4, k.agua)));
  g.add(k.cilindro(0.6, 0.8, 3, piedra, cx, 1.5, cz, 10));
  g.add(k.cilindro(2, 1.2, 0.6, piedra, cx, 3.3, cz, 12));
  g.add(k.noSolido(k.cilindro(1.8, 1.8, 0.1, '#4fc3f7', cx, 3.62, cz, 12)));
  g.add(k.cilindro(0.3, 0.4, 1.2, piedra, cx, 4.2, cz, 8));
  g.add(k.noSolido(k.esfera(0.6, '#4fc3f7', cx, 5.2, cz)));
}

export function piscina(k, g) {
  const a = P.alto;
  const borde = k.tex('baldosa', '#f1ede6', 2);
  g.add(k.cajaDe(P.x0 - 3, 0, P.z1, P.x1 + 3, a, P.z1 + 3, borde));
  g.add(k.cajaDe(P.x0 - 3, 0, P.z0 - 3, P.x1 + 3, a, P.z0, borde));
  g.add(k.cajaDe(P.x0 - 3, 0, P.z0, P.x0, a, P.z1, borde));
  g.add(k.cajaDe(P.x1, 0, P.z0, P.x1 + 3, a, P.z1, borde));
  g.add(k.noSolido(k.cajaDe(P.x0, 0, P.z0, P.x1, 0.1, P.z1, k.tex('baldosa', '#5ec8f2', 1.5))));
  g.add(k.noSolido(k.cajaDe(P.x0, 0.1, P.z0 + 0.05, P.x1, a - 0.25, P.z1 - 0.05, k.agua)));
  // Escalones para subir al borde (del lado de la casa).
  for (let i = 1; i <= 5; i++) {
    const z1 = P.z1 + 7 - 0.8 * (i - 1);
    g.add(k.cajaDe(-3, 0, z1 - 0.8, 3, (a / 5) * i, z1, i % 2 ? '#e0e0e0' : '#d5d5d5'));
  }
  // Escalerita para salir del agua.
  [-1, 1].forEach((s) => g.add(k.noSolido(k.cajaDe(8 + s * 0.6 - 0.08, 0, P.z1 - 0.4, 8 + s * 0.6 + 0.08, a + 1.2, P.z1 - 0.25, '#b0bec5'))));
  for (let y = 0.5; y < a; y += 0.6) g.add(k.noSolido(k.cajaDe(7.4, y, P.z1 - 0.4, 8.6, y + 0.08, P.z1 - 0.25, '#b0bec5')));
}

export function reposeras(k, g) {
  const a = P.alto;
  [[P.x0 - 2.6, P.x0 - 0.4], [P.x1 + 0.4, P.x1 + 2.6]].forEach(([x0, x1], lado) => {
    [P.z0 + 4, P.z0 + 11].forEach((z, i) => {
      g.add(k.cajaDe(x0, a, z, x1, a + 0.6, z + 4, '#ffffff'));
      g.add(k.cajaDe(x0, a + 0.6, z + 3.2, x1, a + 1.8, z + 4, '#ffffff'));
      g.add(k.noSolido(k.cajaDe(x0 + 0.2, a + 0.6, z + 0.6, x1 - 0.2, a + 0.7, z + 3, ['#ff7043', '#29b6f6', '#ffee58', '#ab47bc'][lado * 2 + i])));
    });
    const xc = (x0 + x1) / 2;
    g.add(k.cajaDe(xc - 0.12, a, P.z0 + 7.4, xc + 0.12, a + 5, P.z0 + 7.6, '#9e9e9e'));
    g.add(k.cono(2.6, 1.2, lado ? '#ffeb3b' : '#e53935', xc, a + 5.4, P.z0 + 7.5, 8));
  });
}

export function trampolin(k, g) {
  const a = P.alto;
  g.add(k.cajaDe(-1.4, a, P.z0 - 2.8, 1.4, a + 0.8, P.z0 - 0.6, '#90a4ae'));
  g.add(k.cajaDe(-0.9, a + 0.8, P.z0 - 2.4, 0.9, a + 1, P.z0 + 4, '#1e88e5'));
}

export function parrilla(k, grupo) {
  // Diseñada alrededor de (-28, -46); se corre al lugar actual.
  const g = k.grupo();
  g.position.set(-6, 0, -10);
  grupo.add(g);
  g.add(k.noSolido(k.cajaDe(-34, 0, -52, -22, 0.1, -40, '#bcaaa4')));
  g.add(k.cajaDe(-33.5, 0, -51.5, -29.5, 2.2, -49.5, '#b5532f'));
  g.add(k.noSolido(k.cajaDe(-33.3, 2.2, -51.3, -29.7, 2.3, -49.7, '#424242')));
  g.add(k.noSolido(k.cajaDe(-33, 1.4, -49.48, -30, 2, -49.44, k.brillo('#ff6d00'))));
  g.add(k.cajaDe(-32.2, 2.2, -51.5, -30.8, 7, -50.5, '#a1452a'));
  [[-32.6, -50.4], [-31.4, -50.2], [-30.4, -50.5]].forEach(([x, z], i) => {
    g.add(k.noSolido(k.cajaDe(x - 0.3, 2.3, z - 0.2, x + 0.3, 2.55, z + 0.2, i === 1 ? '#8d3b2f' : '#6d2c22')));
  });
  g.add(k.cajaDe(-30, 1.8, -46.5, -24, 2.1, -43.5, '#8d6e63'));
  [[-29.6, -46.2], [-24.4, -46.2], [-29.6, -43.8], [-24.4, -43.8]].forEach(([x, z]) => g.add(k.noSolido(k.cajaDe(x - 0.15, 0, z - 0.15, x + 0.15, 1.8, z + 0.15, '#5d4037'))));
  g.add(k.cajaDe(-30, 0, -48, -24, 1.1, -47.2, '#6d4c41'));
  g.add(k.cajaDe(-30, 0, -42.8, -24, 1.1, -42, '#6d4c41'));
  const c = k.cartel('PARRILLA VECIBANDA', 6, 1.1, '#ffd23f', '#3e2723');
  c.position.set(-31.5, 7.8, -50.9);
  g.add(c);
}

export function cancha(k, g) {
  g.add(k.noSolido(k.cajaDe(C.x0, 0, C.z0, C.x1, 0.06, C.z1, k.tex('pasto', '#4fa64a', 8))));
  const linea = (x0, z0, x1, z1) => g.add(k.noSolido(k.cajaDe(x0, 0.07, z0, x1, 0.09, z1, '#ffffff')));
  linea(C.x0, C.z0, C.x1, C.z0 + 0.3);
  linea(C.x0, C.z1 - 0.3, C.x1, C.z1);
  linea(C.x0, C.z0, C.x0 + 0.3, C.z1);
  linea(C.x1 - 0.3, C.z0, C.x1, C.z1);
  const cz = (C.z0 + C.z1) / 2;
  const cx = (C.x0 + C.x1) / 2;
  linea(C.x0, cz - 0.15, C.x1, cz + 0.15);
  g.add(k.noSolido(k.cilindro(4, 4, 0.02, '#ffffff', cx, 0.08, cz, 24)));
  g.add(k.noSolido(k.cilindro(3.7, 3.7, 0.03, '#388e3c', cx, 0.09, cz, 24)));
  // Escudo de La Dosis pintado en el círculo central (se lee desde las gradas).
  const escudo = k.imagen('assets/especiales/ladosis_escudo.png', 7, 7);
  escudo.rotation.order = 'YXZ';
  escudo.rotation.set(-Math.PI / 2, -Math.PI / 2, 0);
  escudo.position.set(cx, 0.12, cz);
  g.add(escudo);
  [C.z0, C.z1].forEach((z, i) => {
    const s = i === 0 ? -1 : 1;
    const zf = z + s * 0.2;
    g.add(k.cajaDe(cx - 3.4, 0, zf - 0.2, cx - 3, 3.2, zf + 0.2, '#ffffff'));
    g.add(k.cajaDe(cx + 3, 0, zf - 0.2, cx + 3.4, 3.2, zf + 0.2, '#ffffff'));
    g.add(k.cajaDe(cx - 3.4, 3.2, zf - 0.2, cx + 3.4, 3.6, zf + 0.2, '#ffffff'));
    g.add(k.cajaDe(cx - 3.2, 0, zf + s * 1.6 - 0.05, cx + 3.2, 3.2, zf + s * 1.6 + 0.05, k.red));
  });
}

// Garage grande para el auto y la bóveda: piso de resina, luces en el techo y un taller.
export function garage(k, g) {
  const c = k.tex('estuco', '#f6f4ef', 3);
  const A = G.alto;
  const cx = (G.x0 + G.x1) / 2;
  const P = 7; // medio ancho del portón
  g.add(k.noSolido(k.cajaDe(G.x0, 0, G.z0, G.x1, 0.1, G.z1, k.tex('concreto', '#9aa1a7', 5))));
  g.add(k.noSolido(k.cajaDe(cx - P, 0, G.z1, cx + P, 0.08, T.z1, k.tex('concreto', '#d9d6d0', 4))));
  g.add(k.cajaDe(G.x0, 0, G.z0, G.x1, A, G.z0 + 0.5, c));
  g.add(k.cajaDe(G.x0, 0, G.z0 + 0.5, G.x0 + 0.5, A, G.z1, c));
  g.add(k.cajaDe(G.x1 - 0.5, 0, G.z0 + 0.5, G.x1, A, G.z1, c));
  g.add(k.cajaDe(G.x0 + 0.5, 0, G.z1 - 0.5, cx - P, A, G.z1, c));
  g.add(k.cajaDe(cx + P, 0, G.z1 - 0.5, G.x1 - 0.5, A, G.z1, c));
  g.add(k.cajaDe(cx - P, 7.4, G.z1 - 0.5, cx + P, A, G.z1, c));
  // Portón levantado y techo.
  g.add(k.noSolido(k.cajaDe(cx - P + 0.2, 6.8, G.z1 - 0.45, cx + P - 0.2, 7.4, G.z1 - 0.05, k.tex('panel', '#5b636a', 2))));
  g.add(k.cajaDe(G.x0 - 0.5, A, G.z0 - 0.5, G.x1 + 0.5, A + 0.6, G.z1 + 1.5, '#2b2f33'));
  // Tiras de luz y franjas de estacionamiento.
  for (let z = G.z0 + 4; z < G.z1 - 2; z += 6) g.add(k.noSolido(k.cajaDe(G.x0 + 3, A - 0.15, z, G.x1 - 3, A - 0.05, z + 0.4, k.brillo('#f4f8ff'))));
  [cx - 6, cx + 6].forEach((x) => g.add(k.noSolido(k.cajaDe(x - 0.15, 0.1, 2, x + 0.15, 0.13, G.z1 - 2, '#f2c230'))));
  // Taller en la pared del fondo: mesa, herramientas, estantes y cubiertas apiladas.
  const fondo = G.z0 + 0.5;
  g.add(k.cajaDe(cx - 2, 0, fondo, cx + 6, 2.4, fondo + 1.6, '#4a5056'));
  g.add(k.noSolido(k.cajaDe(cx - 2.1, 2.4, fondo, cx + 6.1, 2.6, fondo + 1.7, '#8d6e4f')));
  g.add(k.noSolido(k.cajaDe(cx - 2, 3.4, fondo, cx + 6, 6.4, fondo + 0.08, '#c62828')));
  [[-1, '#ffc928'], [0.6, '#9e9e9e'], [2.2, '#1e88e5'], [3.8, '#9e9e9e'], [5, '#43a047']].forEach(([dx, col]) =>
    g.add(k.noSolido(k.cajaDe(cx + dx, 4, fondo + 0.08, cx + dx + 0.3, 5.8, fondo + 0.2, col))));
  for (let i = 0; i < 4; i++) {
    const t = k.cilindro(1.1, 1.1, 0.75, '#1f2326', cx + 10, 0.4 + i * 0.78, fondo + 2, 16);
    g.add(t);
  }
  // La Dosis: banderines sobre el taller y el escudo grande en la pared.
  k.banderines(g, G.x0 + 1, fondo + 0.4, G.x1 - 1, fondo + 0.4, A - 0.4, 17, 1.3);
  const escudo = k.imagen('assets/especiales/ladosis_escudo.png', 4.6, 4.6);
  escudo.position.set(G.x0 + 0.52, 4.8, G.z0 + 9);
  escudo.rotation.y = Math.PI / 2;
  g.add(escudo);
  const cartel = k.cartel('GARAGE', 6, 1.2, '#ffffff', '#455a64');
  cartel.position.set(cx, 8.2, G.z1 + 0.02);
  g.add(cartel);
}


// Gradas de cemento con asientos de colores, techo y un marcador.
export function gradas(k, g) {
  const cemento = k.tex('concreto', '#cfccc6', 3);
  const z0 = C.z0 + 4;
  const z1 = C.z1 - 4;
  const colores = ['#e53935', '#1e88e5', '#fdd835', '#43a047'];
  for (let i = 0; i < 4; i++) {
    const x1 = C.x0 - 1 - i * 1.6;
    const x0 = x1 - 1.6;
    g.add(k.cajaDe(x0, 0, z0, x1, 0.7 * (i + 1), z1, cemento));
    for (let z = z0 + 0.4; z < z1 - 0.8; z += 1.2) {
      g.add(k.noSolido(k.cajaDe(x1 - 0.9, 0.7 * (i + 1), z, x1 - 0.2, 0.7 * (i + 1) + 0.35, z + 0.9, colores[i])));
    }
  }
  const atras = C.x0 - 1 - 4 * 1.6;
  g.add(k.cajaDe(atras - 0.4, 0, z0, atras, 7.5, z1, cemento));
  for (let z = z0; z <= z1; z += (z1 - z0) / 3) g.add(k.cajaDe(atras - 0.4, 0, z - 0.2, atras, 7.5, z + 0.2, '#24282c'));
  g.add(k.noSolido(k.cajaDe(atras - 0.6, 7.5, z0 - 0.5, C.x0 - 0.4, 7.9, z1 + 0.5, '#24282c')));
  // Marcador detrás del arco del fondo.
  const cx = (C.x0 + C.x1) / 2;
  [-4, 4].forEach((dx) => g.add(k.cajaDe(cx + dx - 0.2, 0, C.z0 - 2.6, cx + dx + 0.2, 6, C.z0 - 2.2, '#24282c')));
  g.add(k.cajaDe(cx - 5.5, 5.5, C.z0 - 2.7, cx + 5.5, 9.5, C.z0 - 2.3, '#111214'));
  const marcador = k.cartel('LA DOSIS 3 - 0 COCA', 10.5, 3.4, '#ffd23f', '#111214');
  marcador.position.set(cx, 7.5, C.z0 - 2.28);
  g.add(marcador);
  [-7.6, 7.6].forEach((dx) => {
    const e = k.imagen('assets/especiales/ladosis_escudo.png', 3.4, 3.4);
    e.position.set(cx + dx, 7.5, C.z0 - 2.28);
    g.add(e);
  });
  // La Dosis en las gradas: escudos en la pared del fondo y banderines en el techo.
  [z0 + 7, z1 - 7].forEach((z) => {
    const e = k.imagen('assets/especiales/ladosis_escudo.png', 4.4, 4.4);
    e.position.set(atras + 0.02, 5.1, z);
    e.rotation.y = Math.PI / 2;
    g.add(e);
  });
  k.banderines(g, C.x0 - 0.5, z0, C.x0 - 0.5, z1, 7.45, 17, 1.25);
}
