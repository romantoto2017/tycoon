// Chat del multijugador: el botón (entre la configuración y las misiones) abre el panel con los
// últimos mensajes y para escribir. Sin censura: todos ven lo que escribís tal cual. Con el
// panel cerrado, lo que dicen los demás sale abajo (toast) y en un globo arriba de su cabeza.
// También avisa cuando alguien se une. T o Enter abren el chat; Esc lo cierra.
export class Chat {
  constructor({ mj, controles, ui, modo }) {
    this.mj = mj;
    this.controles = controles;
    this.ui = ui;
    this.modo = modo; // () => 'juego' | ...
    this.abierto = false;
    const $ = (id) => document.getElementById(id);
    this.boton = $('btn-chat');
    this.panel = $('chat');
    this.lista = $('chat-lista');
    this.input = $('chat-texto');
    this.punto = $('chat-punto');
    this.boton.classList.remove('oculto');
    document.body.classList.add('con-chat');
    this.boton.addEventListener('click', () => (this.abierto ? this.cerrar() : this.abrir()));
    $('chat-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const texto = this.input.value.trim();
      if (texto) mj.enviarChat(texto);
      this.input.value = '';
      this.input.focus();
    });
    // Escribiendo, las teclas no mueven al personaje.
    this.input.addEventListener('focus', () => { this.controles.activo = false; });
    this.input.addEventListener('blur', () => { if (this.modo() === 'juego' && !this.otraPantalla()) this.controles.activo = true; });
    this.input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') this.cerrar();
    });
    window.addEventListener('keydown', (e) => {
      if (this.modo() !== 'juego' || e.target === this.input) return;
      if ((e.code === 'KeyT' || e.code === 'Enter' || e.code === 'NumpadEnter') && this.controles.activo && !this.abierto) {
        e.preventDefault();
        this.abrir();
      }
    });
    mj.alChat((d) => this.agregar(d));
    // Los que están conectados jugando ahora, arriba de los mensajes.
    mj.alConectados = (nombres) => { $('chat-conectados').textContent = `Conectados (${nombres.length}): ${nombres.join(', ')}`; };
    if (mj.jugadores) mj.recibirJugadores(mj.jugadores);
    mj.alUnirse = (nombre) => this.agregar({ sistema: true, texto: `${nombre} se unió`, t: Date.now() });
  }

  otraPantalla() {
    return [...document.querySelectorAll('.pantalla')].some((p) => !p.classList.contains('oculto'));
  }

  abrir() {
    this.abierto = true;
    this.panel.classList.remove('oculto');
    this.boton.setAttribute('aria-pressed', 'true');
    this.punto.classList.add('oculto');
    this.lista.scrollTop = this.lista.scrollHeight;
    this.input.focus({ preventScroll: true });
  }

  cerrar() {
    this.abierto = false;
    this.panel.classList.add('oculto');
    this.boton.setAttribute('aria-pressed', 'false');
    this.input.blur();
  }

  agregar(d) {
    const li = document.createElement('li');
    if (d.sistema) {
      li.className = 'sistema';
      li.textContent = d.texto;
    } else {
      if (d.mio) li.className = 'mio';
      const b = document.createElement('b');
      b.textContent = `${d.nombre || '?'}: `;
      li.append(b, document.createTextNode(d.texto));
    }
    this.lista.appendChild(li);
    while (this.lista.children.length > 60) this.lista.firstChild.remove();
    this.lista.scrollTop = this.lista.scrollHeight;
    // Con el chat cerrado: aviso abajo y el puntito en el botón (los mensajes viejos no avisan).
    const nuevo = Date.now() - (d.t || 0) < 15000;
    if (!this.abierto && nuevo && !d.mio) {
      this.ui.toast(d.sistema ? d.texto : `${d.nombre}: ${d.texto}`, 'info', 4000);
      if (!d.sistema) this.punto.classList.remove('oculto');
    }
  }
}
