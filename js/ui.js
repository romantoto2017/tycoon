import { formato } from './util.js';
import { canvasMoneda, obtenerCara } from './texturas.js';

const $ = (id) => document.getElementById(id);

export function prepararHUD() {
  $('icono-moneda').src = canvasMoneda(96).toDataURL();
}

let plataMostrada = '';
let ppsMostrado = '';
let progresoMostrado = '';

export function actualizarHUD(plata, pps, progreso) {
  const p = formato(plata);
  if (p !== plataMostrada) { $('plata').textContent = p; plataMostrada = p; }
  const s = `+${pps < 100 ? (Math.round(pps * 10) / 10) : formato(pps)}/s`;
  if (s !== ppsMostrado) { $('pps').textContent = s; ppsMostrado = s; }
  const m = `Mansión ${Math.floor(progreso * 100)}%`;
  if (m !== progresoMostrado) { $('progreso').textContent = m; progresoMostrado = m; }
}

export function toast(texto, tipo = 'ok') {
  const cont = $('toasts');
  while (cont.children.length >= 3) cont.firstChild.remove();
  const el = document.createElement('div');
  el.className = `toast ${tipo}`;
  el.textContent = texto;
  cont.appendChild(el);
  setTimeout(() => el.remove(), 2300);
}

// Cartel fijo arriba (no se va solo): para avisos que duran mientras pasa algo.
// aviso(texto, tipo) lo muestra o lo cambia; aviso(null) lo saca.
export function aviso(texto, tipo = 'error') {
  const el = $('aviso');
  el.classList.toggle('oculto', !texto);
  if (!texto) return;
  el.textContent = texto;
  el.className = `aviso ${tipo}`;
}

export function mostrar(id, visible) {
  $(id).classList.toggle('oculto', !visible);
}

export function visible(id) {
  return !$(id).classList.contains('oculto');
}

// Arma la grilla de personajes. alElegir(personaje) se llama al tocar una carta.
export async function armarSeleccion(personajes, elegidoId, alElegir) {
  const grilla = $('grilla-personajes');
  const caras = await Promise.all(personajes.map(obtenerCara));
  grilla.innerHTML = '';
  personajes.forEach((p, i) => {
    const carta = document.createElement('button');
    carta.className = 'carta' + (p.id === elegidoId ? ' elegida' : '');
    carta.style.background = p.remera;
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    c.getContext('2d').drawImage(caras[i], 0, 0, 128, 128);
    const nombre = document.createElement('span');
    nombre.textContent = p.nombre;
    carta.append(c, nombre);
    carta.addEventListener('click', () => alElegir(p));
    grilla.appendChild(carta);
  });
}

export function pedirConfirmacion() {
  return new Promise((resolve) => {
    mostrar('confirmar', true);
    const cerrar = (valor) => {
      mostrar('confirmar', false);
      $('btn-confirmar').onclick = $('btn-cancelar').onclick = null;
      resolve(valor);
    };
    $('btn-confirmar').onclick = () => cerrar(true);
    $('btn-cancelar').onclick = () => cerrar(false);
  });
}

export function duracion(seg) {
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

let alCelebrar = null;
export function onCelebrar(fn) { alCelebrar = fn; }

export function celebrar(segundos) {
  $('final-tiempo').textContent = `Tiempo de juego: ${duracion(segundos)}`;
  mostrar('final', true);
  alCelebrar?.();
}

// Conecta los sliders de configuración. alCambiar(ajustes) se llama en cada cambio.
export function prepararConfig(ajustes, alCambiar) {
  const sliders = { general: 'aj-general', musica: 'aj-musica', efectos: 'aj-efectos', sensibilidad: 'aj-sensibilidad' };
  for (const [clave, id] of Object.entries(sliders)) {
    const el = $(id);
    el.value = Math.round(ajustes[clave] * 100);
    el.addEventListener('input', () => {
      ajustes[clave] = Number(el.value) / 100;
      alCambiar(ajustes);
    });
  }
  // Música on/off: el parlante con ondas o tachado.
  const btnMusica = $('btn-musica');
  const verMusica = () => {
    btnMusica.classList.toggle('apagada', !ajustes.musicaOn);
    btnMusica.setAttribute('aria-pressed', String(ajustes.musicaOn));
    btnMusica.setAttribute('aria-label', ajustes.musicaOn ? 'Música encendida' : 'Música apagada');
  };
  verMusica();
  btnMusica.addEventListener('click', () => {
    ajustes.musicaOn = !ajustes.musicaOn;
    verMusica();
    alCambiar(ajustes);
  });
  // Calidad de imagen: 50% a 100% de la resolución de la pantalla.
  const calidad = $('aj-calidad');
  const texto = $('aj-calidad-valor');
  const verValor = () => { texto.textContent = `${calidad.value}%${calidad.value === '100' ? ' (máxima)' : ''}`; };
  calidad.value = Math.round(ajustes.calidad * 100);
  verValor();
  calidad.addEventListener('input', verValor);
  calidad.addEventListener('change', () => {
    ajustes.calidad = Number(calidad.value) / 100;
    alCambiar(ajustes);
  });
}

// ---------- Menú del restaurante ----------
// Íconos de cada plato (SVG dibujado acá: plato blanco y la comida encima).
const ICONOS_PLATO = {
  mila_pure: '<ellipse cx="25" cy="32" rx="13" ry="9" fill="#c88a3a"/><ellipse cx="25" cy="31" rx="10" ry="6" fill="#d9a35a"/><circle cx="42" cy="34" r="8" fill="#f3e3a0"/>',
  mila_fritas: '<ellipse cx="24" cy="32" rx="13" ry="9" fill="#c88a3a"/><g stroke="#f2c84b" stroke-width="3.5" stroke-linecap="round"><path d="M38 26l8 14M42 25l2 16M46 27l-4 13"/></g>',
  fideos: '<circle cx="32" cy="32" r="15" fill="#ecd28c"/><path d="M21 30q5-5 10 0t10 0M21 36q5-5 10 0t10 0" stroke="#d9b86a" stroke-width="2" fill="none"/><circle cx="32" cy="31" r="7" fill="#c0392b"/>',
  guiso: '<circle cx="32" cy="32" r="16" fill="#7a4a2a"/><rect x="24" y="25" width="5" height="5" fill="#e67e22"/><rect x="35" y="30" width="5" height="5" fill="#e67e22"/><rect x="28" y="36" width="5" height="5" fill="#d9b37a"/><rect x="37" y="22" width="4" height="4" fill="#d9b37a"/>',
  pollo_arroz: '<ellipse cx="25" cy="32" rx="12" ry="8" fill="#e2b07a"/><circle cx="42" cy="33" r="9" fill="#fbfaf5" stroke="#e6e1d3"/>',
  strogonoff: '<ellipse cx="26" cy="32" rx="12" ry="10" fill="#d8b48a"/><rect x="20" y="28" width="5" height="4" fill="#7a4a2a"/><rect x="27" y="33" width="5" height="4" fill="#7a4a2a"/><circle cx="43" cy="33" r="8" fill="#fbfaf5" stroke="#e6e1d3"/>',
};

export function abrirMenuResto(platos, alElegir, alCerrar) {
  const lista = $('platos');
  lista.innerHTML = '';
  const cerrar = () => {
    mostrar('menu-resto', false);
    window.removeEventListener('keydown', teclas);
    alCerrar();
  };
  const teclas = (e) => { if (e.code === 'Escape') cerrar(); };
  for (const p of platos) {
    const b = document.createElement('button');
    b.className = 'plato';
    b.innerHTML = `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="29" fill="#ffffff" stroke="#d6d9de" stroke-width="2"/><circle cx="32" cy="32" r="22" fill="#f4f6f8"/>${ICONOS_PLATO[p.id] || ''}</svg><span>${p.nombre}</span>`;
    b.addEventListener('click', () => { cerrar(); alElegir(p.id); });
    lista.appendChild(b);
  }
  $('btn-cerrar-resto').onclick = cerrar;
  window.addEventListener('keydown', teclas);
  mostrar('menu-resto', true);
  lista.firstChild?.focus();
}

// ---------- Panel del gym (mientras entrenás) ----------
let repApretado = false;
export const repGymApretado = () => repApretado;
function marcarPeso(kg) {
  for (const b of $('pg-pesos').children) b.setAttribute('aria-pressed', String(Number(b.dataset.kg) === kg));
}
// pesos: [{ kg, texto, pesado }]. alPeso(kg) al tocar un peso; alSalir() al salir.
export function abrirPanelGym({ nombre, pesos, peso, alPeso, alSalir, alPulsar }) {
  $('pg-nombre').textContent = nombre;
  const lista = $('pg-pesos');
  lista.innerHTML = '';
  for (const p of pesos) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `pg-peso${p.pesado ? ' pesado' : ''}`;
    b.dataset.kg = p.kg;
    b.innerHTML = `<span>${p.texto}</span><small>${p.nota}</small>`;
    b.addEventListener('click', () => { alPeso(p.kg); marcarPeso(p.kg); b.blur(); });
    lista.appendChild(b);
  }
  marcarPeso(peso);
  const rep = $('pg-rep');
  rep.onpointerdown = (e) => { e.preventDefault(); repApretado = true; rep.classList.add('apretado'); alPulsar(); };
  rep.onpointerup = rep.onpointerleave = rep.onpointercancel = () => { repApretado = false; rep.classList.remove('apretado'); };
  $('pg-salir').onclick = () => alSalir();
  mostrar('panel-gym', true);
}
export function actualizarPanelGym({ reps, serie, energia, peso, bauti }) {
  $('pg-reps').textContent = reps;
  $('pg-serie').textContent = serie;
  const en = $('pg-energia');
  en.style.width = `${Math.round(energia * 100)}%`;
  en.parentElement.dataset.nivel = energia < 0.25 ? 'baja' : energia < 0.6 ? 'media' : 'alta';
  marcarPeso(peso);
  const el = $('pg-bauti');
  el.classList.toggle('oculto', !bauti);
  if (!bauti) return;
  el.dataset.fase = bauti.fase;
  $('pg-barra').style.width = `${Math.round(bauti.fraccion * 100)}%`;
  $('pg-bauti-texto').textContent = bauti.texto;
}
// Minijuego de la última rep: null lo oculta; si no, { prog, tiempo, dificil } (0 a 1).
export function luchaGym(l) {
  const el = $('pg-lucha');
  el.classList.toggle('oculto', !l);
  $('pg-rep').textContent = l ? '¡EMPUJÁ!' : 'Repetición';
  $('pg-rep').classList.toggle('lucha', !!l);
  if (!l) return;
  $('pg-lucha-prog').style.width = `${Math.round(l.prog * 100)}%`;
  $('pg-lucha-tiempo').style.width = `${Math.round(Math.max(0, l.tiempo) * 100)}%`;
  $('pg-lucha-texto').textContent = l.dificil ? '¡Al fallo! Apretá MUY rápido' : '¡Apretá rápido para subirla!';
}
export function cerrarPanelGym() {
  repApretado = false;
  mostrar('panel-gym', false);
}

// ---------- Misiones ----------
// lista: [{ titulo, texto, detalle, avance, hecha, tuya, cara (dataURL), nombre }]
export function abrirMisiones(lista, alCerrar) {
  const ul = $('lista-misiones');
  ul.innerHTML = '';
  for (const m of lista) {
    const li = document.createElement('li');
    if (m.bloqueada) {
      // Bloqueada: gris, con el "?" de piedra y sin pistas.
      li.className = 'mision bloqueada';
      li.innerHTML = `
      <div class="mision-piedra" aria-hidden="true"><span>?</span></div>
      <div class="mision-info">
        <h3>???</h3>
        <p>Seguí construyendo la mansión para desbloquearla.</p>
      </div>
      <div class="mision-check" aria-label="Bloqueada"></div>`;
      ul.appendChild(li);
      continue;
    }
    li.className = `mision${m.hecha ? ' hecha' : ''}`;
    li.innerHTML = `
      <div class="mision-cara"><img alt="" src="${m.cara || ''}"><span>${m.nombre}</span></div>
      <div class="mision-info">
        <h3>${m.titulo} <span class="mision-premio${m.hecha ? ' cobrado' : ''}">${m.hecha ? 'Cobraste' : 'Premio'} $${formato(m.premioPlata || 0)}</span></h3>
        <p>${m.texto}</p>
        <div class="mision-barra" role="progressbar" aria-valuenow="${Math.round(m.avance * 100)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${Math.round(m.avance * 100)}%"></i></div>
        ${m.detalle || (!m.hecha && !m.tuya) ? `<small>${m.detalle}${!m.hecha && !m.tuya ? `${m.detalle ? ' · ' : ''}Solo con ${m.nombre}` : ''}</small>` : ''}
      </div>
      <div class="mision-check" aria-label="${m.hecha ? 'Cumplida' : 'Sin cumplir'}">${m.hecha ? '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>' : ''}</div>`;
    ul.appendChild(li);
  }
  const cerrar = () => {
    mostrar('misiones', false);
    window.removeEventListener('keydown', teclas);
    alCerrar();
  };
  const teclas = (e) => { if (e.code === 'Escape' || e.code === 'KeyM') { e.stopPropagation(); cerrar(); } };
  $('btn-cerrar-misiones').onclick = cerrar;
  $('misiones').onclick = (e) => { if (e.target.id === 'misiones') cerrar(); };
  window.addEventListener('keydown', teclas);
  mostrar('misiones', true);
  $('btn-cerrar-misiones').focus();
}
export function puntoMisiones(v) { $('misiones-punto').classList.toggle('oculto', !v); }
export function botonMisiones(v) { $('btn-misiones').classList.toggle('oculto', !v); }

// ---------- Diálogo de historia ----------
// Escribe cada línea de a poco; Continuar / E / Espacio / clic completa la línea o pasa a la
// siguiente. Al terminar llama a alTerminar().
export function dialogo({ nombre, cara, remera, lineas, alTerminar }) {
  $('dialogo-nombre').textContent = nombre;
  $('dialogo-cara').src = cara;
  $('dialogo-cuerpo').style.background = remera;
  const texto = $('dialogo-texto');
  const boton = $('dialogo-seguir');
  let i = 0;
  let letras = 0;
  let timer = null;
  const escribir = () => {
    const linea = lineas[i];
    letras = 0;
    boton.textContent = i === lineas.length - 1 ? 'Vamos ▸' : 'Continuar ▸';
    clearInterval(timer);
    timer = setInterval(() => {
      letras++;
      texto.textContent = linea.slice(0, letras);
      if (letras >= linea.length) clearInterval(timer);
    }, 24);
  };
  const seguir = () => {
    if (letras < lineas[i].length) { clearInterval(timer); letras = lineas[i].length; texto.textContent = lineas[i]; return; }
    i++;
    if (i < lineas.length) { escribir(); return; }
    clearInterval(timer);
    window.removeEventListener('keydown', teclas, true);
    mostrar('dialogo', false);
    alTerminar();
  };
  const teclas = (e) => {
    if (['KeyE', 'Space', 'Enter'].includes(e.code)) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) seguir(); }
  };
  $('dialogo').onclick = seguir;
  window.addEventListener('keydown', teclas, true);
  mostrar('dialogo', true);
  escribir();
}

// ---------- Tienda de ropa: catálogo ----------
// prendas: [{ id, nombre, foto, precio, tuya }]. alComprar(id) devuelve true si se compró.
export function abrirCatalogo({ titulo, sub, prendas, plata, alComprar, alCerrar }) {
  $('catalogo-titulo').textContent = titulo;
  $('catalogo-sub').textContent = sub;
  const lista = $('catalogo-lista');
  const dibujar = () => {
    lista.innerHTML = '';
    for (const p of prendas) {
      const b = document.createElement('button');
      b.className = 'prenda';
      const caro = !p.tuya && plata() < p.precio;
      b.innerHTML = `<span class="foto"><img alt="" src="${p.foto}"></span><b>${p.nombre}</b>${p.tuya ? '<span class="estado">Ya la tenés</span>' : `<span class="precio${caro ? ' caro' : ''}">$${formato(p.precio)}</span>`}`;
      b.setAttribute('aria-label', p.tuya ? `${p.nombre}: ya la tenés` : `Comprar ${p.nombre} por $${formato(p.precio)}`);
      b.addEventListener('click', () => {
        if (p.tuya) return;
        if (alComprar(p.id)) { p.tuya = true; dibujar(); }
      });
      lista.appendChild(b);
    }
  };
  const cerrar = () => {
    mostrar('catalogo', false);
    window.removeEventListener('keydown', teclas);
    alCerrar();
  };
  const teclas = (e) => { if (e.code === 'Escape') cerrar(); };
  $('btn-cerrar-catalogo').onclick = cerrar;
  $('catalogo').onclick = (e) => { if (e.target.id === 'catalogo') cerrar(); };
  window.addEventListener('keydown', teclas);
  dibujar();
  mostrar('catalogo', true);
  return { cerrar, dibujar };
}

// ---------- Ropero ----------
// slots: [{ id, nombre }]; tuyas: prendas compradas; puesto: { slot: id }. Tocar una prenda
// se la prueba (alProbar con la ropa nueva); "Ponérmelo" guarda (alListo) y "Cancelar" no.
export function abrirRopero({ titulo, slots, tuyas, puesto, aviso, alProbar, alListo, alCerrar }) {
  $('ropero-titulo').textContent = titulo;
  const ropa = { ...puesto };
  const lista = $('ropero-lista');
  const dibujar = () => {
    lista.innerHTML = '';
    if (aviso) {
      lista.innerHTML = `<p class="ropero-vacio">${aviso}</p>`;
      return;
    }
    if (!tuyas.length) {
      lista.innerHTML = '<p class="ropero-vacio">Todavía no tenés ropa.</p>';
      return;
    }
    for (const s of slots) {
      const deSlot = tuyas.filter((p) => p.slot === s.id);
      if (!deSlot.length) continue;
      const h = document.createElement('h3');
      h.textContent = s.nombre;
      lista.appendChild(h);
      const grilla = document.createElement('div');
      grilla.className = 'ropero-grilla';
      const opcion = (p) => {
        const b = document.createElement('button');
        b.className = `prenda${p ? '' : ' nada'}`;
        b.setAttribute('aria-pressed', String((ropa[s.id] || null) === (p ? p.id : null)));
        b.innerHTML = p ? `<span class="foto"><img alt="" src="${p.foto}"></span><b>${p.nombre}</b>` : '<span class="foto">Lo de siempre</span><b>Sin nada de acá</b>';
        b.addEventListener('click', () => {
          if (p) ropa[s.id] = p.id;
          else delete ropa[s.id];
          dibujar();
          alProbar({ ...ropa });
        });
        grilla.appendChild(b);
      };
      opcion(null);
      deSlot.forEach(opcion);
      lista.appendChild(grilla);
    }
  };
  const cerrar = () => {
    mostrar('ropero', false);
    window.removeEventListener('keydown', teclas);
    alCerrar();
  };
  const teclas = (e) => { if (e.code === 'Escape') cerrar(); };
  $('btn-ropero-cancelar').onclick = cerrar;
  $('btn-ropero-listo').onclick = () => { alListo({ ...ropa }); cerrar(); };
  $('btn-ropero-listo').disabled = !!aviso;
  window.addEventListener('keydown', teclas);
  dibujar();
  mostrar('ropero', true);
}
