// Geometry Dash en las máquinas del arcade de la mansión: el cubo avanza solo y salta (espacio,
// flecha arriba, clic o tocar; mantener apretado salta apenas toca el piso). Pinchos que matan,
// bloques que se pisan (de costado matan) y el nivel que se repite en cada intento. Se guarda el
// mejor porcentaje (estado.geometry). Un canvas 2D aparte, encima del juego.
const VEL = 10.4; // bloques por segundo (como el modo normal)
const G = 88; // gravedad (bloques/s²)
const SALTO = 21; // velocidad del salto: unos 2,5 bloques de alto y 5 de largo
const LARGO_NIVEL = 230;

// El nivel: [tipo, x, y] (y = 0 el piso; 'p' pincho, 'b' bloque, 'm' pincho chico).
function nivel() {
  const o = [];
  let x = 14;
  const pinchos = (n) => { for (let i = 0; i < n; i++) o.push(['p', x + i, 0]); x += n; };
  const bloque = (y, n = 1) => { for (let i = 0; i < n; i++) o.push(['b', x + i, y]); x += n; };
  const espacio = (n) => { x += n; };
  const patrones = [
    () => { pinchos(1); espacio(7); },
    () => { pinchos(2); espacio(8); },
    () => { pinchos(3); espacio(9); },
    () => { bloque(0, 2); espacio(1); bloque(0, 2); espacio(7); },
    () => { bloque(0); bloque(1, 3); o.push(['p', x, 0], ['p', x + 1, 0]); espacio(3); bloque(0); espacio(7); },
    () => { pinchos(1); espacio(4); pinchos(2); espacio(8); },
    () => { bloque(0, 3); o.push(['m', x - 2, 1]); espacio(8); },
    () => { bloque(0); espacio(2); bloque(1); espacio(2); bloque(2, 2); for (let i = 0; i < 6; i++) o.push(['p', x - 8 + i, 0]); espacio(8); },
  ];
  let k = 0;
  while (x < LARGO_NIVEL - 20) patrones[(k++ * 5 + Math.floor(k / 3)) % patrones.length]();
  return o;
}

export class GeometryDash {
  constructor({ estado, guardar, sfx }) {
    this.estado = estado;
    this.guardar = guardar;
    this.sfx = sfx;
    this.abierto = false;
    this.objetos = nivel();
  }

  armar() {
    const r = document.createElement('div');
    r.className = 'gd-pantalla oculto';
    r.innerHTML = '<canvas class="gd-lienzo" width="960" height="540" aria-label="Geometry Dash: tocá o apretá espacio para saltar"></canvas><button type="button" class="gd-salir">Salir ✕</button>';
    document.body.appendChild(r);
    this.raiz = r;
    this.lienzo = r.querySelector('canvas');
    this.g = this.lienzo.getContext('2d');
    const apretar = (v) => (e) => { if (this.abierto) { e.preventDefault(); this.apretado = v; if (v) this.saltar(); } };
    this.lienzo.addEventListener('pointerdown', apretar(true));
    window.addEventListener('pointerup', () => { this.apretado = false; });
    window.addEventListener('keydown', (e) => {
      if (!this.abierto) return;
      e.stopImmediatePropagation();
      if (e.code === 'Escape') { this.cerrar(); return; }
      if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) { e.preventDefault(); this.apretado = true; this.saltar(); }
    }, true);
    window.addEventListener('keyup', (e) => { if (this.abierto && ['Space', 'ArrowUp', 'KeyW'].includes(e.code)) this.apretado = false; }, true);
    r.querySelector('.gd-salir').addEventListener('click', () => this.cerrar());
  }

  abrir(alCerrar) {
    if (!this.raiz) this.armar();
    this.alCerrar = alCerrar;
    this.abierto = true;
    this.raiz.classList.remove('oculto');
    this.intento = 0;
    this.reiniciar();
    this.antes = performance.now();
    const cuadro = (t) => {
      if (!this.abierto) return;
      const dt = Math.min(0.033, (t - this.antes) / 1000);
      this.antes = t;
      this.paso(dt);
      this.dibujar();
      requestAnimationFrame(cuadro);
    };
    requestAnimationFrame(cuadro);
  }

  cerrar() {
    this.abierto = false;
    this.raiz.classList.add('oculto');
    this.alCerrar?.();
  }

  reiniciar() {
    this.intento++;
    this.x = 0;
    this.y = 0;
    this.vy = 0;
    this.giro = 0;
    this.enPiso = true;
    this.muerto = 0;
    this.gano = 0;
    this.particulas = [];
  }

  saltar() {
    if (this.enPiso && !this.muerto && !this.gano) { this.vy = SALTO; this.enPiso = false; }
  }

  paso(dt) {
    if (this.gano) { this.gano += dt; return; }
    if (this.muerto) {
      this.muerto += dt;
      for (const p of this.particulas) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= 30 * dt; }
      if (this.muerto > 1) this.reiniciar();
      return;
    }
    const xAntes = this.x;
    this.x += VEL * dt;
    this.vy -= G * dt;
    const yAntes = this.y;
    this.y += this.vy * dt;
    // Piso y bloques: se apoya si venía de arriba; si choca de costado, se muere.
    let piso = 0;
    for (const [t, ox, oy] of this.objetos) {
      if (t !== 'b' || ox > this.x + 2 || ox + 1 < this.x - 1) continue;
      const solapa = this.x + 0.9 > ox && this.x + 0.1 < ox + 1;
      if (!solapa) continue;
      if (yAntes >= oy + 1 - 0.05 && this.y <= oy + 1) piso = Math.max(piso, oy + 1);
      else if (this.y < oy + 1 - 0.1 && this.y + 0.9 > oy) {
        if (xAntes + 0.9 <= ox + 0.05) return this.morir();
      }
    }
    if (this.y <= piso && this.vy <= 0) {
      this.y = piso;
      this.vy = 0;
      if (!this.enPiso) this.giro = Math.round(this.giro / (Math.PI / 2)) * (Math.PI / 2);
      this.enPiso = true;
      if (this.apretado) this.saltar();
    } else {
      this.enPiso = false;
      this.giro += dt * 7.5;
    }
    // Pinchos (con la caja de golpe chiquita, como en el juego).
    for (const [t, ox, oy] of this.objetos) {
      if (t === 'b' || ox > this.x + 2 || ox + 1 < this.x - 1) continue;
      const alto = t === 'm' ? 0.4 : 0.8;
      if (this.x + 0.8 > ox + 0.3 && this.x + 0.2 < ox + 0.7 && this.y < oy + alto * 0.7 && this.y + 0.8 > oy) return this.morir();
    }
    if (this.x >= LARGO_NIVEL) {
      this.gano = 0.001;
      this.sfx?.final?.();
      this.registrar(100);
    }
  }

  morir() {
    this.muerto = 0.001;
    this.sfx?.error?.();
    this.registrar(Math.floor((this.x / LARGO_NIVEL) * 100));
    this.particulas = Array.from({ length: 16 }, (_, i) => ({ x: this.x + 0.5, y: this.y + 0.5, vx: Math.cos(i) * (3 + (i % 4)), vy: Math.sin(i * 1.7) * 6 + 4 }));
  }

  registrar(pct) {
    const g = (this.estado.geometry ??= { mejor: 0, intentos: 0 });
    g.intentos++;
    if (pct > g.mejor) g.mejor = pct;
    this.guardar?.();
  }

  dibujar() {
    const g = this.g;
    const W = 960;
    const H = 540;
    const B = 48; // píxeles por bloque
    const suelo = H - 120;
    const camX = this.x - 5;
    const hue = (this.x * 2) % 360;
    const fondo = g.createLinearGradient(0, 0, 0, H);
    fondo.addColorStop(0, `hsl(${hue + 220}, 70%, 32%)`);
    fondo.addColorStop(1, `hsl(${hue + 250}, 75%, 18%)`);
    g.fillStyle = fondo;
    g.fillRect(0, 0, W, H);
    // Cuadrados del fondo (parallax).
    g.fillStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i < 12; i++) {
      const x = ((i * 170 - camX * B * 0.2) % (W + 200) + W + 200) % (W + 200) - 100;
      g.fillRect(x, 60 + (i * 53) % 260, 90, 90);
    }
    // Piso.
    g.fillStyle = `hsl(${hue + 230}, 70%, 22%)`;
    g.fillRect(0, suelo, W, H - suelo);
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.fillRect(0, suelo, W, 3);
    const px = (x) => (x - camX) * B;
    const py = (y) => suelo - y * B;
    for (const [t, ox, oy] of this.objetos) {
      const x = px(ox);
      if (x < -B || x > W + B) continue;
      if (t === 'b') {
        g.fillStyle = '#10121a';
        g.fillRect(x, py(oy + 1), B, B);
        g.strokeStyle = 'rgba(255,255,255,0.9)';
        g.lineWidth = 2;
        g.strokeRect(x + 1, py(oy + 1) + 1, B - 2, B - 2);
      } else {
        const alto = t === 'm' ? 0.45 : 1;
        g.beginPath();
        g.moveTo(x + 2, py(oy));
        g.lineTo(x + B / 2, py(oy + alto));
        g.lineTo(x + B - 2, py(oy));
        g.closePath();
        g.fillStyle = '#0b0b10';
        g.fill();
        g.strokeStyle = '#ffffff';
        g.lineWidth = 2;
        g.stroke();
      }
    }
    // Meta.
    const meta = px(LARGO_NIVEL);
    if (meta < W) { g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(meta, 0, 8, suelo); }
    // El cubo (amarillo con la carita, como el de siempre).
    if (!this.muerto) {
      g.save();
      g.translate(px(this.x) + B / 2, py(this.y) - B / 2);
      g.rotate(this.giro);
      g.fillStyle = '#ffd400';
      g.fillRect(-B / 2, -B / 2, B, B);
      g.strokeStyle = '#000';
      g.lineWidth = 3;
      g.strokeRect(-B / 2 + 1.5, -B / 2 + 1.5, B - 3, B - 3);
      g.fillStyle = '#00e5ff';
      g.fillRect(-B / 2 + 8, -B / 2 + 8, B - 16, B - 16);
      g.fillStyle = '#000';
      g.fillRect(-12, -10, 7, 7);
      g.fillRect(5, -10, 7, 7);
      g.fillRect(-12, 6, 24, 5);
      g.restore();
    } else {
      g.fillStyle = '#ffd400';
      for (const p of this.particulas) g.fillRect(px(p.x) - 5, py(p.y) - 5, 10, 10);
    }
    // Barra de progreso, intento y mejor.
    const pct = Math.min(100, Math.floor((this.x / LARGO_NIVEL) * 100));
    g.fillStyle = 'rgba(0,0,0,0.4)';
    g.fillRect(W / 2 - 200, 18, 400, 14);
    g.fillStyle = '#7dff6a';
    g.fillRect(W / 2 - 200, 18, 4 * pct, 14);
    g.fillStyle = '#fff';
    g.font = '700 20px Fredoka, Arial, sans-serif';
    g.textAlign = 'center';
    g.fillText(`${pct}%`, W / 2, 56);
    g.textAlign = 'left';
    g.fillText(`Intento ${this.intento}`, 20, 34);
    g.fillText(`Mejor: ${this.estado.geometry?.mejor || 0}%`, 20, 60);
    if (this.gano) {
      g.fillStyle = 'rgba(0,0,0,0.55)';
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#ffd23f';
      g.textAlign = 'center';
      g.font = '700 54px Fredoka, Arial, sans-serif';
      g.fillText('¡NIVEL COMPLETADO!', W / 2, H / 2 - 10);
      g.fillStyle = '#fff';
      g.font = '700 26px Fredoka, Arial, sans-serif';
      g.fillText(`En ${this.intento} intento${this.intento === 1 ? '' : 's'}`, W / 2, H / 2 + 36);
    } else if (this.intento === 1 && this.x < 3) {
      g.fillStyle = '#fff';
      g.textAlign = 'center';
      g.font = '700 26px Fredoka, Arial, sans-serif';
      g.fillText('Tocá o apretá espacio para saltar', W / 2, H / 2 - 60);
    }
  }
}
