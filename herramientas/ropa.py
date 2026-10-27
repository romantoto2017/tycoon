"""Prendas de las tiendas de ropa de la ciudad: recorta las fotos de assets/ropa/ y arma las
texturas que usa el personaje (js/vestir.js) y las fotos recortadas del catálogo.
Todo se hace acá (rembg local + PIL), sin mandar las fotos a ningún servicio.

    python3 herramientas/ropa.py
    python3 herramientas/ropa.py lb_    (solo las prendas cuyo id empieza así; el resto queda como está)
    (después, herramientas/rellenar_ropa.py arregla el conjunto Corteiz celeste y el jogging Jordan)

Salida:
  assets/ropa/prendas/<id>_frente.jpg   frente del torso (remeras, buzos, camperas) o de la gorra
  assets/ropa/prendas/<id>_manga.jpg    manga (si tiene rayas o dos colores)
  assets/ropa/prendas/<id>_tela.jpg     tela lisa (o con estampado: camuflado)
  assets/ropa/prendas/<id>_piernas.jpg  pantalón: las dos piernas lado a lado
  assets/ropa/tienda/<id>.webp          foto recortada (fondo transparente) para el catálogo
  data/ropa_colores.js                  colores sacados de las fotos
"""
import json
import math
import os
import numpy as np
from PIL import Image, ImageFilter
from rembg import remove, new_session

SRC = 'assets/ropa'
OUT = 'assets/ropa/prendas'
CAT = 'assets/ropa/tienda'
os.makedirs(OUT, exist_ok=True)
os.makedirs(CAT, exist_ok=True)
sesion = new_session('u2net')
rng = np.random.default_rng(7)

# Cajas en fracciones de la foto: (x0, y0, x1, y1).
# torso: el cuerpo de la prenda, entre las sisas (o los brazos), del cuello al ruedo.
# tela: un pedazo liso para sacar el color (o el estampado, si 'estampado').
# manga: (hombro, puño, ancho) de una manga larga: se endereza y se pone en los brazos.
PRENDAS = [
    # ---- remeras ----
    dict(id='babymilo', foto='babymilo.jpeg', slot='torso', torso=(0.29, 0.17, 0.71, 0.83), tela=(0.33, 0.66, 0.67, 0.8)),
    dict(id='bapeblue', foto='bapeblue.webp', slot='torso', torso=(0.24, 0.19, 0.75, 0.8), tela=(0.3, 0.6, 0.7, 0.75)),
    dict(id='bapeclassic', foto='bapeclassic.jpeg', slot='torso', torso=(0.25, 0.15, 0.75, 0.86), tela=(0.3, 0.7, 0.7, 0.82)),
    dict(id='bapetee', foto='bapetee.jpeg', slot='torso', torso=(0.24, 0.2, 0.75, 0.8), tela=(0.3, 0.58, 0.7, 0.75)),
    dict(id='corteiz', foto='corteiz.jpeg', slot='torso', torso=(0.2, 0.19, 0.8, 0.79), tela=(0.3, 0.55, 0.7, 0.75)),
    dict(id='corteiz2', foto='corteiz2.webp', slot='torso', torso=(0.27, 0.06, 0.73, 0.88), tela=(0.33, 0.68, 0.67, 0.84)),
    dict(id='supreme', foto='supreme.jpeg', slot='torso', torso=(0.2, 0.03, 0.8, 1.0), tela=(0.3, 0.5, 0.7, 0.8)),
    dict(id='supremeworldfamous', foto='supremeworldfamous.jpeg', slot='torso', torso=(0.22, 0.04, 0.8, 0.98), tela=(0.25, 0.74, 0.45, 0.94), estampado=True),
    # ---- buzos y camperas ----
    dict(id='buzosafa', foto='buzosafa.jpeg', slot='torso', torso=(0.27, 0.3, 0.72, 0.84), tela=(0.3, 0.62, 0.45, 0.78), manga='lisa'),
    dict(id='buzocorteiz', foto='corteiztracksuit.jpeg', slot='torso', torso=(0.2, 0.17, 0.52, 0.63), tela=(0.22, 0.45, 0.3, 0.6), recorte=(0.12, 0.05, 0.6, 0.66), manga='lisa'),
    dict(id='buzocorteizceleste', foto='corteiztracksuit2.jpeg', slot='torso', torso=(0.17, 0.24, 0.49, 0.76), tela=(0.2, 0.58, 0.28, 0.7), recorte=(0.08, 0.06, 0.53, 0.8), manga='lisa'),
    dict(id='camperacerro', foto='camperacerro.jpeg', slot='torso', torso=(0.14, 0.05, 0.86, 0.95), tela=(0.35, 0.55, 0.45, 0.7), recorte=(0.0, 0.0, 1.0, 1.0), manga=((0.37, 0.38), (0.37, 0.95), 0.1)),
    dict(id='camperamilan', foto='camperamilan.jpeg', slot='torso', torso=(0.31, 0.2, 0.69, 0.97), tela=(0.4, 0.6, 0.48, 0.8), manga=((0.24, 0.18), (0.17, 0.93), 0.1)),
    dict(id='camperapenarol', foto='camperapeñarol.jpeg', slot='torso', torso=(0.32, 0.13, 0.71, 0.83), tela=(0.33, 0.55, 0.45, 0.75), manga='lisa'),
    dict(id='rompevientosnacional', foto='rompevientosnacional.webp', slot='torso', torso=(0.25, 0.17, 0.76, 0.88), tela=(0.4, 0.6, 0.48, 0.8), recorte=(0.0, 0.1, 1.0, 1.0), manga=((0.105, 0.2), (0.105, 0.93), 0.07)),
    # ---- pantalones: una caja por pierna (izquierda y derecha de la foto) ----
    dict(id='jeanscammo', foto='jeanscammo.jpeg', slot='piernas', piernas=[(0.2, 0.08, 0.5, 0.97), (0.5, 0.08, 0.8, 0.97)], tela=(0.3, 0.4, 0.45, 0.7), estampado=True),
    dict(id='joggingjordan', foto='joggingjordan.webp', slot='piernas', piernas=[(0.24, 0.07, 0.5, 0.86), (0.5, 0.07, 0.78, 0.86)], tela=(0.3, 0.4, 0.42, 0.6), recorte=(0.15, 0.06, 0.85, 0.86)),
    dict(id='pantcorteiz', foto='corteiztracksuit.jpeg', slot='piernas', arreglo='sacar_manga_buzo', piernas=[(0.54, 0.34, 0.7, 0.93), (0.7, 0.34, 0.87, 0.93)], tela=(0.58, 0.6, 0.66, 0.8), recorte=(0.52, 0.32, 0.9, 0.95)),
    dict(id='pantcorteizceleste', foto='corteiztracksuit2.jpeg', slot='piernas', piernas=[(0.5, 0.09, 0.67, 0.91), (0.65, 0.09, 0.82, 0.91)], tela=(0.53, 0.5, 0.6, 0.7), recorte=(0.47, 0.07, 0.86, 0.93)),
    # ---- zapatillas: solo la foto del catálogo (en el pie son modelos 3D: js/zapatillas.js) ----
    dict(id='jordan1', foto='jordan1.jpeg', slot='pies'),
    dict(id='jordanbalvin', foto='jordanxjbalvin1.jpeg', slot='pies'),
    dict(id='nikeshox', foto='nikeshox.jpeg', slot='pies'),
    dict(id='nikeshoxr4', foto='nikeshoxr4.jpeg', slot='pies'),
    dict(id='niketn', foto='niketn.jpeg', slot='pies'),
    dict(id='f50', foto='f50.webp', slot='pies'),
    # ---- Lucca Bossio (fotos de luccabossio.com, en assets/ropa/luccabossio/) ----
    dict(id='lb_knox', foto='luccabossio/lb_knox.jpg', slot='torso', torso=(0.3, 0.2, 0.71, 0.85), tela=(0.36, 0.5, 0.5, 0.66), estampado=True, manga=((0.27, 0.36), (0.13, 0.9), 0.1)),
    dict(id='lb_nudos', foto='luccabossio/lb_nudos.jpg', slot='torso', torso=(0.3, 0.22, 0.7, 0.88), tela=(0.44, 0.8, 0.56, 0.86), manga=((0.28, 0.34), (0.2, 0.86), 0.1)),
    dict(id='lb_pasamontanas', foto='luccabossio/lb_pasamontanas.jpg', slot='torso', torso=(0.3, 0.3, 0.7, 0.9), tela=(0.36, 0.63, 0.46, 0.73), manga=((0.26, 0.38), (0.13, 0.92), 0.1)),
    dict(id='lb_bigrama', foto='luccabossio/lb_bigrama.jpg', slot='torso', torso=(0.27, 0.1, 0.73, 0.8), tela=(0.3, 0.6, 0.45, 0.75)),
    dict(id='lb_tranca', foto='luccabossio/lb_tranca.jpg', slot='torso', torso=(0.27, 0.08, 0.73, 0.83), tela=(0.3, 0.6, 0.45, 0.75)),
    dict(id='lb_escrituras', foto='luccabossio/lb_escrituras.jpg', slot='torso', torso=(0.23, 0.12, 0.77, 0.85), tela=(0.72, 0.76, 0.76, 0.82)),
    dict(id='lb_monograma', foto='luccabossio/lb_monograma.jpg', slot='torso', torso=(0.28, 0.12, 0.72, 0.9), tela=(0.3, 0.72, 0.45, 0.85)),
    dict(id='lb_oriental', foto='luccabossio/lb_oriental.jpg', slot='torso', torso=(0.23, 0.1, 0.77, 0.9), tela=(0.26, 0.72, 0.4, 0.85)),
    dict(id='lb_puntocom', foto='luccabossio/lb_puntocom.jpg', slot='torso', torso=(0.13, 0.37, 0.5, 0.91), tela=(0.2, 0.72, 0.3, 0.85)),
    dict(id='lb_trigrama', foto='luccabossio/lb_trigrama.jpg', slot='torso', torso=(0.23, 0.12, 0.77, 0.88), tela=(0.3, 0.4, 0.45, 0.55)),
    dict(id='lb_voynich', foto='luccabossio/lb_voynich.jpg', slot='torso', torso=(0.1, 0.42, 0.48, 0.92), tela=(0.12, 0.76, 0.2, 0.86), manga='lisa'),
    dict(id='lb_jean', foto='luccabossio/lb_jean.jpg', slot='piernas', piernas=[(0.18, 0.03, 0.5, 0.98), (0.5, 0.03, 0.78, 0.98)], tela=(0.25, 0.5, 0.35, 0.7), estampado=True),
    dict(id='lb_jogbigrama', foto='luccabossio/lb_jogbigrama.jpg', slot='piernas', piernas=[(0.15, 0.05, 0.5, 0.95), (0.5, 0.05, 0.85, 0.95)], tela=(0.2, 0.5, 0.3, 0.7)),
    dict(id='lb_acanto', foto='luccabossio/lb_acanto.jpg', slot='piernas', piernas=[(0.15, 0.05, 0.5, 0.95), (0.5, 0.05, 0.85, 0.95)], tela=(0.2, 0.5, 0.3, 0.7)),
    # ---- gorra ----
    dict(id='tiffosigorra', foto='tiffosigorra.webp', slot='cabeza', torso=(0.26, 0.32, 0.62, 0.6), tela=(0.4, 0.62, 0.5, 0.7)),
]


def abrir(nombre):
    im = Image.open(os.path.join(SRC, nombre)).convert('RGB')
    if max(im.size) > 1000:
        im.thumbnail((1000, 1000), Image.LANCZOS)
    return im


def sacar_manga_buzo(im):
    """En la foto del conjunto Corteiz negro, la manga del buzo tapa el costado izquierdo del
    jogging. Se borra: primero se rellena toda la manga (lo que cae adentro del pantalón) con
    el negro de alrededor (inpainting de OpenCV, acá en la compu) y después lo que queda afuera
    del borde del pantalón pasa a ser fondo."""
    import cv2
    a = np.asarray(im).copy()
    h, w = a.shape[:2]
    borde = lambda y: 0.60 + (0.545 - 0.60) * (min(max(y, 0.345), 0.66) - 0.345) / (0.66 - 0.345)
    # Color del jogging (un pedazo limpio de la pierna derecha) con un poco de grano.
    tela = np.median(a[int(0.45 * h):int(0.6 * h), int(0.72 * w):int(0.8 * w)].reshape(-1, 3), axis=0)
    rng2 = np.random.default_rng(3)
    junta = np.zeros((h, w), np.uint8)
    for fila in range(int(0.33 * h), int(0.672 * h) + 1):
        y = fila / h
        # La manga llega hasta x = 0.62 y el puño baja hasta y = 0.665.
        x1 = int(0.625 * w)
        a[fila, int(0.5 * w):x1] = np.clip(tela + rng2.normal(0, 2.5, (x1 - int(0.5 * w), 1)), 0, 255)
        junta[fila, x1 - 3:x1 + 3] = 255
    junta[int(0.665 * h):int(0.68 * h), int(0.53 * w):int(0.63 * w)] = 255
    a = cv2.inpaint(a, junta, 4, cv2.INPAINT_TELEA)
    for fila in range(int(0.29 * h), int(0.672 * h) + 1):
        a[fila, int(0.5 * w):int(borde(fila / h) * w)] = 255
    return Image.fromarray(a)


def px(im, caja):
    w, h = im.size
    x0, y0, x1, y1 = caja
    return (round(x0 * w), round(y0 * h), round(x1 * w), round(y1 * h))


def mascara_fondo(im):
    """Máscara de la prenda: rembg y, si se quedó con el fondo (fotos de producto con fondo
    casi blanco), relleno desde los bordes con el color del fondo."""
    a = np.asarray(remove(im, session=sesion, only_mask=True)).astype(np.float32) / 255
    if a.mean() < 0.8:
        return a
    arr = np.asarray(im).astype(np.int16)
    borde = np.concatenate([arr[0], arr[-1], arr[:, 0], arr[:, -1]])
    fondo = np.median(borde, axis=0)
    cerca = np.abs(arr - fondo).max(axis=2) < 10
    # Inundación desde los bordes por los píxeles parecidos al fondo.
    from scipy.ndimage import label
    etiquetas, _ = label(cerca)
    bordes = set(np.unique(np.concatenate([etiquetas[0], etiquetas[-1], etiquetas[:, 0], etiquetas[:, -1]]))) - {0}
    es_fondo = np.isin(etiquetas, list(bordes))
    return (~es_fondo).astype(np.float32)


def color_de(im, caja):
    zona = np.asarray(im.crop(px(im, caja))).reshape(-1, 3)
    return tuple(int(v) for v in np.median(zona, axis=0))


def tela_lisa(color, n=128):
    base = np.full((n, n, 3), color, dtype=np.float32) + rng.normal(0, 2.5, (n, n, 1))
    return Image.fromarray(base.clip(0, 255).astype(np.uint8))


def hexa(c):
    return '#%02x%02x%02x' % c


def rellenar(recorte, mascara, tela, borde=3):
    """Lo que no es prenda (fondo, cuello abierto) se pinta con la tela. La máscara se achica
    unos píxeles para que no quede la línea clara del borde de la foto."""
    fondo = tela.resize(recorte.size)
    m = Image.fromarray((mascara * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(borde * 2 + 1)).filter(ImageFilter.GaussianBlur(1))
    fondo.paste(recorte, (0, 0), m)
    return fondo


def achicar(im, lado):
    im = im.copy()
    im.thumbnail((lado, lado), Image.LANCZOS)
    return im


import re
import sys
solo = sys.argv[1] if len(sys.argv) > 1 else ''
colores = {}
if solo:
    # Se conservan los colores de las prendas que no se vuelven a procesar.
    viejo = open('data/ropa_colores.js').read()
    colores = json.loads(re.search(r'= (\{.*\});', viejo, re.S).group(1))
for p in PRENDAS:
    if not p['id'].startswith(solo):
        continue
    im = abrir(p['foto'])
    if p.get('arreglo'):
        im = globals()[p['arreglo']](im)
    mask = mascara_fondo(im)
    info = {}
    # Foto del catálogo: recortada al contenido, fondo transparente.
    rc = px(im, p.get('recorte', (0, 0, 1, 1)))
    alfa = Image.fromarray((mask * 255).astype(np.uint8)).crop(rc)
    cat = im.crop(rc).convert('RGBA')
    cat.putalpha(alfa)
    bbox = alfa.point(lambda v: 255 if v > 40 else 0).getbbox()
    if bbox:
        cat = cat.crop(bbox)
    achicar(cat, 320).save(f"{CAT}/{p['id']}.webp", quality=85, method=6)

    if p['slot'] in ('torso', 'cabeza'):
        color = color_de(im, p['tela'])
        tela = achicar(im.crop(px(im, p['tela'])), 128).resize((128, 128)) if p.get('estampado') else tela_lisa(color)
        tela.save(f"{OUT}/{p['id']}_tela.jpg", quality=88)
        caja = px(im, p['torso'])
        frente = rellenar(im.crop(caja), mask[caja[1]:caja[3], caja[0]:caja[2]], tela)
        achicar(frente, 512).save(f"{OUT}/{p['id']}_frente.jpg", quality=88)
        info.update(tela=hexa(color), aspecto=round((caja[2] - caja[0]) / (caja[3] - caja[1]), 3))
        if p.get('manga') == 'lisa':
            # Manga lisa de la misma tela, con pliegues suaves y el puño elastizado abajo.
            W, L = 96, 384
            r = np.asarray(tela_lisa(color, 96).resize((W, L))).astype(np.float32)
            v = np.linspace(0, 1, L)[:, None, None]
            u = np.linspace(-1, 1, W)[None, :, None]
            r *= 1 - 0.18 * u ** 2 - 0.05 * np.sin(v * 23 + u * 2) ** 2
            puno = L * 86 // 100
            r[puno:] *= 0.86
            r[puno:, ::6] *= 0.8
            r[puno - 3:puno] *= 0.7
            Image.fromarray(r.clip(0, 255).astype(np.uint8)).save(f"{OUT}/{p['id']}_manga.jpg", quality=88)
            info['manga'] = True
        elif p.get('manga'):
            # La manga se endereza (del hombro al puño, para abajo) y va entera sobre el brazo.
            (ax, ay), (bx, by), ancho = p['manga']
            w, h = im.size
            ax, ay, bx, by, ancho = ax * w, ay * h, bx * w, by * h, ancho * w
            largo = math.hypot(bx - ax, by - ay)
            dx, dy = (bx - ax) / largo, (by - ay) / largo
            W, L = 96, 384
            su, sv = ancho / W, largo / L
            # Píxel de salida (u, v) -> foto: hombro + v * dir + (u - W/2) * perpendicular.
            coef = (-dy * su, dx * sv, ax + dy * su * W / 2, dx * su, dy * sv, ay - dx * su * W / 2)
            tira = im.transform((W, L), Image.AFFINE, coef, resample=Image.BICUBIC)
            m = Image.fromarray((mask * 255).astype(np.uint8)).transform((W, L), Image.AFFINE, coef, resample=Image.BILINEAR)
            rellenar(tira, np.asarray(m).astype(np.float32) / 255, tela, borde=1).save(f"{OUT}/{p['id']}_manga.jpg", quality=88)
            info['manga'] = True
    elif p['slot'] == 'piernas':
        color = color_de(im, p['tela'])
        tela = achicar(im.crop(px(im, p['tela'])), 128).resize((128, 128)) if p.get('estampado') else tela_lisa(color)
        tela.save(f"{OUT}/{p['id']}_tela.jpg", quality=88)
        hoja = Image.new('RGB', (320, 512))
        for i, c in enumerate(p['piernas']):
            caja = px(im, c)
            pierna = rellenar(im.crop(caja), mask[caja[1]:caja[3], caja[0]:caja[2]], tela)
            hoja.paste(pierna.resize((160, 512), Image.LANCZOS), (i * 160, 0))
        hoja.save(f"{OUT}/{p['id']}_piernas.jpg", quality=88)
        info.update(tela=hexa(color))
    colores[p['id']] = info
    print(p['id'], info)

with open('data/ropa_colores.js', 'w') as f:
    f.write('// Generado por herramientas/ropa.py: colores sacados de las fotos de las prendas.\n')
    f.write('export const COLORES_ROPA = ' + json.dumps(colores, indent=2, ensure_ascii=False) + ';\n')
print('listo:', len(PRENDAS), 'prendas')
