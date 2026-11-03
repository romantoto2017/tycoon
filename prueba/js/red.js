// Multijugador: la base de datos compartida (Firebase Realtime Database, gratis). Lo que se guarda:
//   lotes/{k}        uid del dueño del terreno k (0 a 8)
//   jugadores/{uid}  { nombre, personaje, slot, progreso, compras, ropa, enLinea, visto }
//   pos/{uid}        { x, y, z, a, v, m, t } en coordenadas compartidas (m: 0 a pie, 1 auto, 2 pony)
//   chat/{id}        { uid, nombre, texto, t } (se leen los últimos 40)
// Sin config (js/red-config.js) el juego anda solo, como siempre. Con ?redlocal se usa una red de
// mentira entre pestañas del mismo navegador (para probar sin Firebase).
import { clave, RAIZ_RED } from './entorno.js';

const VERSION = '10.12.2';
export const LOTES_TOTAL = 9;
// Tepho y le shpet entraron primero desde el navegador y ahora juegan desde la app (para el juego
// es otro usuario). Cuando entran desde una sesión sin terreno, se llevan el terreno de su otra
// sesión (con el mismo nombre), esté conectada o no. Se quedan con lo guardado en esa sesión nueva
// (decisión del dueño); la vieja queda en movidos/: si está abierta se recarga y ya no entra.
// shortcut: solo para estos nombres (sin login, cualquiera podría escribir el nombre de otro).
const LIBERAR = ['tepho', 'leshpet'];
const normal = (n) => String(n || '').toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');
function viejos(jugadores, lotes, uid, nombre) {
  const n = normal(nombre);
  const conLote = Array.from({ length: LOTES_TOTAL }, (_, k) => lotes && lotes[k]);
  if (!LIBERAR.includes(n) || conLote.includes(uid)) return [];
  return Object.entries(jugadores || {}).filter(([u, i]) => u !== uid && normal(i?.nombre) === n).map(([u]) => u);
}
// Quién está en cada terreno (para el aviso de "ocupados").
const ocupantes = (lotes, jugadores) => Array.from({ length: LOTES_TOTAL }, (_, k) => (lotes && lotes[k] ? (jugadores?.[lotes[k]]?.nombre || '?') : 'libre'));
const sinUids = (lotes, fuera) => Array.from({ length: LOTES_TOTAL }, (_, k) => ((lotes && lotes[k]) && !fuera.includes(lotes[k]) ? lotes[k] : null));

// Busca el terreno del uid o le asigna el primero libre. Devuelve el número o -1 (todos ocupados).
function elegirLote(lotes, uid) {
  const l = Array.from({ length: LOTES_TOTAL }, (_, k) => (lotes && lotes[k]) || null);
  const ya = l.indexOf(uid);
  if (ya >= 0) return { l, k: ya };
  const libre = l.indexOf(null);
  if (libre >= 0) l[libre] = uid;
  return { l, k: libre };
}

class RedFirebase {
  constructor(db, base) {
    this.db = db;
    this.base = base;
  }

  async tomarLote(uid) {
    const { ref, runTransaction } = this.db;
    let k = -1;
    await runTransaction(ref(this.base, 'lotes'), (lotes) => {
      const r = elegirLote(lotes, uid);
      k = r.k;
      return r.k >= 0 ? r.l : undefined; // undefined: no cambia nada
    });
    return k;
  }

  async liberarViejos(uid, nombre) {
    const { ref, get, update, runTransaction } = this.db;
    const [js, lotes] = await Promise.all(['jugadores', 'lotes'].map((k) => get(ref(this.base, k))));
    const fuera = viejos(js.val(), lotes.val(), uid, nombre);
    const cambios = { expulsados: null }; // lo dejó una versión que los echaba para siempre
    for (const u of fuera) Object.assign(cambios, { [`jugadores/${u}`]: null, [`pos/${u}`]: null, [`movidos/${u}`]: true });
    await update(ref(this.base), cambios);
    if (fuera.length) await runTransaction(ref(this.base, 'lotes'), (l) => (l ? sinUids(l, fuera) : l));
  }

  async ocupantes() {
    const { ref, get } = this.db;
    const [lotes, js] = await Promise.all(['lotes', 'jugadores'].map((k) => get(ref(this.base, k))));
    return ocupantes(lotes.val(), js.val());
  }

  alMovido(uid, cb) { this.db.onValue(this.db.ref(this.base, `movidos/${uid}`), (s) => { if (s.val() === true) cb(); }); }
  async movido(uid) { return (await this.db.get(this.db.ref(this.base, `movidos/${uid}`))).val() === true; }

  enLinea(uid, nombre) {
    const { ref, onDisconnect, update, remove } = this.db;
    const yo = ref(this.base, `jugadores/${uid}`);
    onDisconnect(yo).update({ enLinea: false, visto: Date.now() });
    onDisconnect(ref(this.base, `pos/${uid}`)).remove();
    update(yo, { enLinea: true, visto: Date.now(), nombre });
    this.salir = () => { update(yo, { enLinea: false, visto: Date.now() }); remove(ref(this.base, `pos/${uid}`)); };
  }

  info(uid, datos) { this.db.update(this.db.ref(this.base, `jugadores/${uid}`), datos); }
  pos(uid, datos) { this.db.set(this.db.ref(this.base, `pos/${uid}`), datos); }

  alJugadores(cb) { this.db.onValue(this.db.ref(this.base, 'jugadores'), (s) => cb(s.val() || {})); }

  chat(datos) { this.db.push(this.db.ref(this.base, 'chat'), datos); }

  // Los últimos mensajes y los que van llegando.
  alChat(cb) {
    const { ref, query, limitToLast, onChildAdded } = this.db;
    onChildAdded(query(ref(this.base, 'chat'), limitToLast(40)), (s) => cb(s.val()));
  }

  alPosiciones(cb) {
    const { ref, onChildAdded, onChildChanged, onChildRemoved } = this.db;
    const r = ref(this.base, 'pos');
    onChildAdded(r, (s) => cb(s.key, s.val()));
    onChildChanged(r, (s) => cb(s.key, s.val()));
    onChildRemoved(r, (s) => cb(s.key, null));
  }
}

// Red de mentira para probar: el "servidor" es el localStorage (compartido entre pestañas) y los
// cambios se avisan por BroadcastChannel.
class RedLocal {
  constructor() {
    this.canal = new BroadcastChannel(clave('vecibanda-red'));
    this.oyentes = { jugadores: [], pos: [], chat: [] };
    this.canal.onmessage = (e) => this.recibir(e.data);
  }

  leer(k) { try { return JSON.parse(localStorage.getItem(clave(`red:${k}`))) || {}; } catch { return {}; } }
  escribir(k, v) { localStorage.setItem(clave(`red:${k}`), JSON.stringify(v)); }

  recibir(m) {
    if (m.tipo === 'jugadores') this.oyentes.jugadores.forEach((cb) => cb(this.leer('jugadores')));
    if (m.tipo === 'pos') this.oyentes.pos.forEach((cb) => cb(m.uid, m.datos));
    if (m.tipo === 'chat') this.oyentes.chat.forEach((cb) => cb(m.datos));
  }

  async liberarViejos(uid, nombre) {
    const j = this.leer('jugadores');
    const fuera = viejos(j, this.leer('lotes'), uid, nombre);
    if (!fuera.length) return;
    const movidos = this.leer('movidos');
    for (const u of fuera) { delete j[u]; movidos[u] = true; }
    this.escribir('movidos', movidos);
    this.escribir('jugadores', j);
    this.escribir('lotes', sinUids(this.leer('lotes'), fuera));
    this.canal.postMessage({ tipo: 'jugadores' });
  }

  async ocupantes() { return ocupantes(this.leer('lotes'), this.leer('jugadores')); }
  alMovido(uid, cb) { this.oyentes.jugadores.push(() => { if (this.leer('movidos')[uid] === true) cb(); }); }
  async movido(uid) { return this.leer('movidos')[uid] === true; }

  async tomarLote(uid) {
    const r = elegirLote(this.leer('lotes'), uid);
    if (r.k >= 0) this.escribir('lotes', r.l);
    return r.k;
  }

  enLinea(uid, nombre) {
    this.info(uid, { enLinea: true, visto: Date.now(), nombre });
    window.addEventListener('pagehide', () => { this.info(uid, { enLinea: false }); this.pos(uid, null); });
  }

  info(uid, datos) {
    const j = this.leer('jugadores');
    j[uid] = { ...(j[uid] || {}), ...datos };
    this.escribir('jugadores', j);
    this.canal.postMessage({ tipo: 'jugadores' });
    this.recibir({ tipo: 'jugadores' });
  }

  pos(uid, datos) { this.canal.postMessage({ tipo: 'pos', uid, datos }); }
  chat(datos) {
    const lista = [...(this.leer('chat').lista || []), datos].slice(-40);
    this.escribir('chat', { lista });
    this.canal.postMessage({ tipo: 'chat', datos });
    this.recibir({ tipo: 'chat', datos });
  }
  alChat(cb) { this.oyentes.chat.push(cb); for (const d of this.leer('chat').lista || []) cb(d); }
  alJugadores(cb) { this.oyentes.jugadores.push(cb); cb(this.leer('jugadores')); }
  alPosiciones(cb) { this.oyentes.pos.push(cb); }
}

// Devuelve la red (o null si no hay config). Si Firebase no responde, también null.
export async function conectarRed(config) {
  if (location.search.includes('redlocal') && ['localhost', '127.0.0.1'].includes(location.hostname)) return new RedLocal();
  if (!config) return null;
  const [{ initializeApp }, db] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${VERSION}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${VERSION}/firebase-database.js`),
  ]);
  const app = initializeApp(config);
  // La copia de prueba usa su propia rama de la base (prueba/...): no toca a los 9 de verdad.
  const ref = (base, p) => db.ref(base, RAIZ_RED ? (p ? `${RAIZ_RED}/${p}` : RAIZ_RED) : p);
  return new RedFirebase({ ...db, ref }, db.getDatabase(app));
}
