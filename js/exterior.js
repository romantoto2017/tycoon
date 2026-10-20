// Piezas del terreno alrededor de la mansión (coordenadas del mundo, piso en y = 0).
import { TERRENO as T, MANSION as M, PISCINA as P, CANCHA as C, GARAGE as G } from './constantes.js';

// Baseplate verde con cordón y el contorno de la mansión marcado en el piso.
export function terreno(k, g) {
  const ancho = T.x1 - T.x0;
  const largo = T.z1 - T.z0;
  const cx = (T.x0 + T.x1) / 2;
  const cz = (T.z0 + T.z1) / 2;
  g.add(k.baseplate(ancho, largo, cx, cz));
  const borde = (x0, z0, x1, z1, alto, color) => g.add(k.noSolido(k.cajaDe(x0, 0, z0, x1, alto, z1, color)));
  borde(T.x0 - 0.25, T.z0 - 0.25, T.x1 + 0.25, T.z0 + 0.25, 0.3, '#e8e8e8');
  borde(T.x0 - 0.25, T.z1 - 0.25, T.x1 + 0.25, T.z1 + 0.25, 0.3, '#e8e8e8');
  borde(T.x0 - 0.25, T.z0, T.x0 + 0.25, T.z1, 0.3, '#e8e8e8');
  borde(T.x1 - 0.25, T.z0, T.x1 + 0.25, T.z1, 0.3, '#e8e8e8');
  const l = 0.18;
  borde(M.x0, M.z0 - l, M.x1, M.z0 + l, 0.08, '#ffffff');
  borde(M.x0, M.z1 - l, M.x1, M.z1 + l, 0.08, '#ffffff');
  borde(M.x0 - l, M.z0, M.x0 + l, M.z1, 0.08, '#ffffff');
  borde(M.x1 - l, M.z0, M.x1 + l, M.z1, 0.08, '#ffffff');
}

export function camino(k, g) {
  g.add(k.noSolido(k.cajaDe(-2.5, 0, 2, 2.5, 0.08, T.z1, '#d6d6d6')));
  for (let z = 4; z < T.z1; z += 2.5) g.add(k.noSolido(k.cajaDe(-2.5, 0.08, z, 2.5, 0.1, z + 0.15, '#b0b0b0')));
  g.add(k.noSolido(k.cajaDe(0, 0, -31, 5, 0.08, -28, '#d6d6d6')));
  [-1, 1].forEach((s) => {
    for (let z = 6; z < 44; z += 3) {
      g.add(k.noSolido(k.cajaDe(s * 3 - 0.4, 0, z, s * 3 + 0.4, 0.6, z + 0.8, ['#ef5350', '#ffee58', '#ab47bc'][(z / 3) % 3 | 0])));
    }
  });
}

export function cerca(k, g) {
  const blanco = '#fafafa';
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
  tramo('x', T.z1, 4.5, 35.5);
  tramo('x', T.z1, 44.5, T.x1);
  // Portón de entrada con arco.
  [-5.5, 4.5].forEach((x) => {
    g.add(k.cajaDe(x, 0, T.z1 - 0.5, x + 1, 6, T.z1 + 0.5, '#e0d4bd'));
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

export function jardin(k, g) {
  [[-28, 6], [-30, 40], [-17, 42], [27, 40], [55, 38], [54, -4], [26, -7], [-54, -58], [-22, -60], [22, -60], [-28, -32], [24, -31]]
    .forEach(([x, z], i) => arbol(k, g, x, z, 0.85 + (i % 3) * 0.15));
  // Canteros contra el frente de la casa.
  [[-20, -6], [6, 20]].forEach(([x0, x1]) => {
    g.add(k.cajaDe(x0, 0, 0.6, x1, 0.6, 2.4, '#6d4c41'));
    for (let x = x0 + 0.8; x < x1; x += 1.6) {
      g.add(k.noSolido(k.cajaDe(x - 0.4, 0.6, 1.1, x + 0.4, 1.3, 1.9, ['#e91e63', '#ffeb3b', '#ffffff', '#ff5722'][(x | 0) & 3])));
    }
  });
}

export function farolas(k, g) {
  const farola = (x, z) => {
    g.add(k.cajaDe(x - 0.18, 0, z - 0.18, x + 0.18, 6, z + 0.18, '#37474f'));
    g.add(k.noSolido(k.cajaDe(x - 0.5, 6, z - 0.5, x + 0.5, 7, z + 0.5, k.brillo('#fff59d'))));
    g.add(k.noSolido(k.cajaDe(x - 0.65, 7, z - 0.65, x + 0.65, 7.3, z + 0.65, '#263238')));
  };
  [8, 18, 28, 38].forEach((z) => { farola(-3.9, z); farola(3.9, z); });
  [24, 34, 44].forEach((z) => farola(45.5, z));
}

export function fuente(k, g) {
  const cx = 21;
  const cz = 30;
  const piedra = '#cfd8dc';
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
  const borde = '#eceff1';
  g.add(k.cajaDe(P.x0 - 3, 0, P.z1, P.x1 + 3, a, P.z1 + 3, borde));
  g.add(k.cajaDe(P.x0 - 3, 0, P.z0 - 3, P.x1 + 3, a, P.z0, borde));
  g.add(k.cajaDe(P.x0 - 3, 0, P.z0, P.x0, a, P.z1, borde));
  g.add(k.cajaDe(P.x1, 0, P.z0, P.x1 + 3, a, P.z1, borde));
  g.add(k.noSolido(k.cajaDe(P.x0, 0, P.z0, P.x1, 0.1, P.z1, '#29b6f6')));
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
    [-52, -45].forEach((z, i) => {
      g.add(k.cajaDe(x0, a, z, x1, a + 0.6, z + 4, '#ffffff'));
      g.add(k.cajaDe(x0, a + 0.6, z + 3.2, x1, a + 1.8, z + 4, '#ffffff'));
      g.add(k.noSolido(k.cajaDe(x0 + 0.2, a + 0.6, z + 0.6, x1 - 0.2, a + 0.7, z + 3, ['#ff7043', '#29b6f6', '#ffee58', '#ab47bc'][lado * 2 + i])));
    });
    const xc = (x0 + x1) / 2;
    g.add(k.cajaDe(xc - 0.12, a, -48.6, xc + 0.12, a + 5, -48.4, '#9e9e9e'));
    g.add(k.cono(2.6, 1.2, lado ? '#ffeb3b' : '#e53935', xc, a + 5.4, -48.5, 8));
  });
}

export function trampolin(k, g) {
  const a = P.alto;
  g.add(k.cajaDe(-1.4, a, P.z0 - 2.8, 1.4, a + 0.8, P.z0 - 0.6, '#90a4ae'));
  g.add(k.cajaDe(-0.9, a + 0.8, P.z0 - 2.4, 0.9, a + 1, P.z0 + 4, '#1e88e5'));
}

export function parrilla(k, g) {
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
  g.add(k.noSolido(k.cajaDe(C.x0, 0, C.z0, C.x1, 0.06, C.z1, '#2e7d32')));
  for (let z = C.z0; z < C.z1; z += 8) g.add(k.noSolido(k.cajaDe(C.x0, 0.06, z, C.x1, 0.07, Math.min(z + 4, C.z1), '#388e3c')));
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
  [C.z0, C.z1].forEach((z, i) => {
    const s = i === 0 ? -1 : 1;
    const zf = z + s * 0.2;
    g.add(k.cajaDe(cx - 3.4, 0, zf - 0.2, cx - 3, 3.2, zf + 0.2, '#ffffff'));
    g.add(k.cajaDe(cx + 3, 0, zf - 0.2, cx + 3.4, 3.2, zf + 0.2, '#ffffff'));
    g.add(k.cajaDe(cx - 3.4, 3.2, zf - 0.2, cx + 3.4, 3.6, zf + 0.2, '#ffffff'));
    g.add(k.cajaDe(cx - 3.2, 0, zf + s * 1.6 - 0.05, cx + 3.2, 3.2, zf + s * 1.6 + 0.05, k.red));
  });
}

export function garage(k, g) {
  const c = '#e0d4bd';
  g.add(k.noSolido(k.cajaDe(G.x0, 0, G.z0, G.x1, 0.1, G.z1, '#9e9e9e')));
  g.add(k.noSolido(k.cajaDe(36, 0, G.z1, 44, 0.08, T.z1, '#9e9e9e')));
  g.add(k.cajaDe(G.x0, 0, G.z0, G.x1, 7, G.z0 + 0.5, c));
  g.add(k.cajaDe(G.x0, 0, G.z0 + 0.5, G.x0 + 0.5, 7, G.z1, c));
  g.add(k.cajaDe(G.x1 - 0.5, 0, G.z0 + 0.5, G.x1, 7, G.z1, c));
  g.add(k.cajaDe(G.x0 + 0.5, 0, G.z1 - 0.5, 34, 7, G.z1, c));
  g.add(k.cajaDe(46, 0, G.z1 - 0.5, G.x1 - 0.5, 7, G.z1, c));
  g.add(k.cajaDe(34, 5.6, G.z1 - 0.5, 46, 7, G.z1, c));
  g.add(k.noSolido(k.cajaDe(34.2, 5, G.z1 - 0.45, 45.8, 5.6, G.z1 - 0.05, '#90a4ae')));
  g.add(k.cajaDe(G.x0 - 0.5, 7, G.z0 - 0.5, G.x1 + 0.5, 7.6, G.z1 + 0.5, '#b0453a'));
  const c2 = k.cartel('GARAGE', 5, 1, '#ffffff', '#455a64');
  c2.position.set(40, 6.3, G.z1 + 0.02);
  g.add(c2);
}

export function auto(k, g) {
  const x = 40;
  const z = 9;
  g.add(k.cajaDe(x - 2.5, 0.6, z - 4, x + 2.5, 2.2, z + 4, '#e53935'));
  g.add(k.cajaDe(x - 2, 2.2, z - 2.6, x + 2, 3.8, z + 1.8, '#e53935'));
  g.add(k.noSolido(k.cajaDe(x - 1.8, 2.3, z + 1.8, x + 1.8, 3.6, z + 1.9, k.vidrio)));
  g.add(k.noSolido(k.cajaDe(x - 1.8, 2.3, z - 2.7, x + 1.8, 3.6, z - 2.6, k.vidrio)));
  g.add(k.noSolido(k.cajaDe(x - 2.05, 2.4, z - 2.3, x + 2.05, 3.5, z + 1.5, k.vidrio)));
  [[-2.5, -2.5], [2.5, -2.5], [-2.5, 2.5], [2.5, 2.5]].forEach(([dx, dz]) => {
    const r = k.cilindro(0.75, 0.75, 0.6, '#212121', x + dx, 0.75, z + dz, 12);
    r.rotation.z = Math.PI / 2;
    g.add(r);
  });
  g.add(k.noSolido(k.cajaDe(x - 2.2, 1.4, z + 4, x - 1.2, 1.9, z + 4.1, k.brillo('#fff9c4'))));
  g.add(k.noSolido(k.cajaDe(x + 1.2, 1.4, z + 4, x + 2.2, 1.9, z + 4.1, k.brillo('#fff9c4'))));
  g.add(k.noSolido(k.cajaDe(x - 0.8, 1.2, z + 4, x + 0.8, 1.6, z + 4.12, '#fafafa')));
}
