"""Nico Baraja (el que habilita la zona nueva): la cara y los tatuajes escaneados de su foto
(assets/especiales/nicobaraja.jpeg), todo acá, sin servicios externos.

- Cara: de las cejas al mentón, a 256.
- Tatuajes: solo la tinta (lo que es más oscuro que su piel), en PNG con transparencia, para
  pintarla arriba de la piel del juego (como Francis Jeremy): el pecho y la panza enteros, la
  manga del brazo derecho (enderezada, como si colgara) y el del cuello. Las cadenas de oro no
  (son amarillas): van en 3D.
- Short: la tela de jean de la foto.

    python3 herramientas/nicobaraja.py [carpeta de salida, por defecto prueba/assets]
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

FOTO = 'assets/especiales/nicobaraja.jpeg'
SAL = sys.argv[1] if len(sys.argv) > 1 else 'prueba/assets'
im = Image.open(FOTO).convert('RGB')
PIEL = 178  # luminancia de su piel sin tinta (el hombro y el costado izquierdo de la foto)


def alfa_tinta(c, fuerza=125, umbral=10, borde=0.06, cadenas=None):
    a = np.asarray(c, np.float32)
    L = a @ np.array([0.299, 0.587, 0.114], np.float32)
    h, w = L.shape
    # La piel de cada zona: lo más claro de alrededor, suavizado (la foto tiene luz de costado;
    # así la tinta sale pareja de los dos lados y una sombra del cuerpo no cuenta como tinta).
    t = max(3, round(max(h, w) / 10)) | 1
    claro = Image.fromarray(L.clip(0, 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(t))
    ref = np.asarray(claro.filter(ImageFilter.GaussianBlur(t)), np.float32)
    alfa = np.clip((ref - L - umbral) / fuerza, 0, 1)
    # Fuera lo dorado (cadenas) y lo rosado (pezones): no es tinta.
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    # El oro de las cadenas (con su sombra): mucho más amarillo que la piel, y solo donde cuelgan.
    fuera = (g - b > 38) & (r - b > 58)
    if cadenas is not None:
        yy0, xx0 = np.mgrid[0:h, 0:w]
        x0, y0, x1, y1 = cadenas
        fuera &= (xx0 >= x0 * w) & (xx0 <= x1 * w) & (yy0 >= y0 * h) & (yy0 <= y1 * h)
    else:
        fuera[:] = False
    alfa[(r - g > 38) & (r > 150) & ~fuera] = 0  # pezones: piel
    # Abajo de las cadenas también hay tatuaje: se rellena con la tinta de alrededor.
    peso = (~fuera).astype(np.float32)
    suave = lambda x: np.asarray(Image.fromarray((x * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6)), np.float32) / 255
    relleno = suave(alfa * peso) / np.maximum(suave(peso), 1e-3)
    alfa = np.where(fuera, relleno, alfa)
    yy, xx = np.mgrid[0:h, 0:w]
    m = np.clip(np.minimum(np.minimum(xx, w - 1 - xx) / (w * borde), np.minimum(yy, h - 1 - yy) / (h * borde)), 0, 1)
    alfa *= m
    rgba = np.zeros((h, w, 4), np.uint8)
    # El gris azulado de la tinta, más oscuro donde más carga tiene (como en la foto).
    tono = np.clip(L * 0.5, 30, 95)[..., None]
    rgba[..., :3] = np.concatenate([tono * 0.9, tono * 0.95, tono * 1.08], -1).clip(0, 255).astype(np.uint8)
    rgba[..., 3] = (np.clip(alfa, 0, 1) * 215).astype(np.uint8)
    return Image.fromarray(rgba).filter(ImageFilter.GaussianBlur(0.5))


def tinta(caja, salida, alto=512, **kw):
    c = im.crop(caja)
    c = c.resize((round(alto * c.width / c.height), alto), Image.LANCZOS)
    alfa_tinta(c, **kw).save(f'{SAL}/ropa/{salida}')


def tira(arriba, abajo, medio_ancho, salida, alto=256, **kw):
    """Una tira a lo largo del hueso (de `arriba` a `abajo`), enderezada: así el tatuaje del brazo
    levantado de la foto queda como si colgara, sin el fondo de los costados."""
    A, B = np.array(arriba, float), np.array(abajo, float)
    d = (B - A) / np.linalg.norm(B - A)
    n = np.array([-d[1], d[0]]) * medio_ancho
    esquinas = [*(A - n), *(B - n), *(B + n), *(A + n)]  # arriba-izq, abajo-izq, abajo-der, arriba-der
    largo = np.linalg.norm(B - A)
    ancho = round(alto * 2 * medio_ancho / largo)
    c = im.transform((ancho, alto), Image.QUAD, esquinas, Image.BICUBIC)
    alfa_tinta(c, borde=0.12, **kw).save(f'{SAL}/ropa/{salida}')


# Cara (de las cejas al mentón; el pelo platinado va dibujado en el juego).
im.crop((340, 168, 430, 258)).resize((256, 256), Image.LANCZOS).filter(ImageFilter.UnsharpMask(2, 60, 2)).save(f'{SAL}/caras/nicobaraja.jpeg', quality=92)
# Pecho y panza (de hombro a hombro, de la clavícula al cinturón).
tinta((326, 284, 462, 480), 'nicobaraja_torso.png', alto=512, cadenas=(0.12, 0, 0.72, 0.3))
# La manga del brazo derecho (en la foto, levantado): el brazo (hombro a codo) y el antebrazo
# (codo a muñeca), cada uno enderezado.
tira((322, 296), (249, 261), 24, 'nicobaraja_brazo.png')
tira((252, 250), (313, 166), 15, 'nicobaraja_antebrazo.png')
# El del cuello (abajo de la nuez, entre las cadenas).
tinta((372, 256, 412, 272), 'nicobaraja_cuello.png', alto=64, borde=0.15)
# El jean del short (una parte sin bolsillos ni roturas, para repetir).
im.crop((392, 520, 488, 616)).resize((128, 128), Image.LANCZOS).save(f'{SAL}/ropa/nicobaraja_jean.jpg', quality=88)
print('listo: cara, tatuajes y jean de Nico Baraja')
