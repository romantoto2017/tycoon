"""Francis Jeremy (el que surfea en la playa): los tatuajes sacados de su foto
(assets/caras/francisjeremycuerpo.jpeg) como tinta sola (lo que es más oscuro que la piel de
alrededor), en PNG con transparencia, para pintarlos arriba de la piel del juego: el texto gótico y
el felino del abdomen. Todo acá, sin servicios externos.

    python3 herramientas/francis.py
"""
import numpy as np
from PIL import Image, ImageFilter

FOTO = 'assets/caras/francisjeremycuerpo.jpeg'
ROPA = 'assets/ropa'


def tinta(caja, salida, alto=256, fuerza=26, umbral=6, radio=9, rotar=0, borde=0.12):
    im = Image.open(FOTO).convert('RGB').crop(caja)
    if rotar:
        im = im.rotate(rotar, Image.BICUBIC, expand=False, fillcolor=(190, 140, 110))
    im = im.resize((round(alto * im.width / im.height), alto), Image.LANCZOS)
    gris = im.convert('L')
    L = np.asarray(gris, np.float32)
    fondo = np.asarray(gris.filter(ImageFilter.GaussianBlur(radio)), np.float32)
    a = np.clip((fondo - L - umbral) / fuerza, 0, 1)
    # Se apaga cerca de los bordes (ahí empieza el fondo de la foto o el contorno del brazo).
    h, w = a.shape
    yy, xx = np.mgrid[0:h, 0:w]
    m = np.clip(np.minimum(np.minimum(xx, w - 1 - xx) / (w * borde), np.minimum(yy, h - 1 - yy) / (h * borde)), 0, 1)
    a = np.where(a * m < 0.15, 0, a * m)
    rgba = np.zeros(a.shape + (4,), np.uint8)
    rgba[..., :3] = (22, 26, 34)
    rgba[..., 3] = (a * 240).astype(np.uint8)
    Image.fromarray(rgba).filter(ImageFilter.GaussianBlur(0.6)).save(f'{ROPA}/{salida}')


# Sin el cable de los auriculares (cruza a la derecha); radio grande así el felino (todo negro)
# sale relleno y no solo el contorno.
tinta((114, 163, 166, 199), 'francis_tatu_panza.png', alto=200, radio=20, fuerza=30, borde=0.1)
# Los antebrazos en la foto son muy chiquitos (sale el borde del brazo): se dibujan en el juego
# (playa.js), imitando las mangas de la foto.
print('listo: tatuajes de Francis Jeremy')
