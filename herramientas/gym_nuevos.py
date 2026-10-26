"""El Shileno y El profe que no es profe (los dos del gym) y el cuadro nuevo del gym. Todo acá,
sin servicios externos.

- Caras: recortadas de las fotos (assets/caras/elshileno1.jpeg y profequenoesprofe2.jpeg), de la
  frente al mentón y de oreja a oreja. Al Shileno se le tapa el dedo que tiene en la sien con el
  pelo del otro lado.
- Tatuajes del profe: sacados de sus fotos como tinta sola (lo que es más oscuro que la piel de
  alrededor), en PNG con transparencia, así se pintan arriba de la piel del juego: el texto del
  pecho, las tres estrellas y la manga del antebrazo izquierdo. El tribal del hombro derecho se
  dibuja en el juego (gimnasio.js), copiando el de las fotos: recortado quedaba manchado.
- Camiseta del Shileno: negra con rayas azules, como la de la foto.
- El cuadro del gym, achicado (el original queda en assets/cuadros/originales/).

    python3 herramientas/gym_nuevos.py
"""
import os
import shutil
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

CARAS = 'assets/caras'
ROPA = 'assets/ropa'


# ---------- Caras ----------
def cara(foto, caja, salida, arreglo=None):
    im = Image.open(f'{CARAS}/{foto}').convert('RGB').crop(caja).resize((256, 256), Image.LANCZOS)
    if arreglo:
        im = arreglo(im)
    im = im.filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))
    im.save(f'{CARAS}/{salida}', quality=92)


def sin_dedo(im):
    # El dedo está arriba a la derecha (la sien izquierda): se tapa con la esquina de arriba a
    # la izquierda espejada (pelo y frente), fundida de a poco.
    a = np.asarray(im, np.float32)
    espejo = a[:, ::-1]
    alto, ancho = a.shape[:2]
    yy, xx = np.mgrid[0:alto, 0:ancho]
    d = np.hypot((xx - 250) / 62.0, (yy - 38) / 30.0)
    m = np.clip((1.3 - d) / 0.5, 0, 1)[..., None]
    return Image.fromarray((a * (1 - m) + espejo * m).clip(0, 255).astype(np.uint8))


cara('elshileno1.jpeg', (188, 98, 392, 302), 'shileno.jpeg', sin_dedo)
cara('profequenoesprofe2.jpeg', (457, 79, 614, 236), 'profe.jpeg')


# ---------- Tatuajes del profe ----------
def tinta(foto, caja, salida, alto=256, fuerza=22, umbral=4, radio=10, mascara=None, rotar=0):
    im = Image.open(f'{CARAS}/{foto}').convert('RGB').crop(caja)
    if rotar:
        im = im.rotate(rotar, Image.BICUBIC, expand=False, fillcolor=(200, 160, 140))
    im = im.resize((round(alto * im.width / im.height), alto), Image.LANCZOS)
    gris = im.convert('L')
    L = np.asarray(gris, np.float32)
    fondo = np.asarray(gris.filter(ImageFilter.GaussianBlur(radio)), np.float32)
    a = np.clip((fondo - L - umbral) / fuerza, 0, 1)
    if mascara is not None:
        a *= mascara(a.shape)
    a = np.where(a < 0.12, 0, a)
    rgba = np.zeros(a.shape + (4,), np.uint8)
    rgba[..., :3] = (24, 30, 40)
    rgba[..., 3] = (a * 235).astype(np.uint8)
    Image.fromarray(rgba).filter(ImageFilter.GaussianBlur(0.5)).save(f'{ROPA}/{salida}')


def bordes(margen):
    # Se apaga cerca de los bordes (ahí están el contorno del brazo y el fondo).
    def m(forma):
        alto, ancho = forma
        yy, xx = np.mgrid[0:alto, 0:ancho]
        dx = np.minimum(xx, ancho - 1 - xx) / (ancho * margen)
        dy = np.minimum(yy, alto - 1 - yy) / (alto * margen * 0.4)
        return np.clip(np.minimum(dx, dy), 0, 1)
    return m


tinta('profequenoesprofe1.jpeg', (374, 230, 509, 312), 'profe_tatu_pecho.png', alto=160,
      mascara=lambda f: np.clip((0.9 - np.mgrid[0:f[0], 0:f[1]][1] / f[1]) / 0.06, 0, 1))  # sin la axila
tinta('profequenoesprofe1.jpeg', (345, 427, 440, 522), 'profe_tatu_estrellas.png', alto=160)
tinta('profequenoesprofe1.jpeg', (198, 410, 252, 588), 'profe_tatu_antebrazo.png', fuerza=14, radio=16, mascara=bordes(0.14))


# ---------- Camiseta del Shileno ----------
def camiseta():
    W, H = 512, 380
    im = Image.new('RGB', (W, H), (16, 17, 22))
    d = ImageDraw.Draw(im)
    for x in range(18, W, 64):
        d.rectangle((x, 0, x + 22, H), fill=(28, 74, 168))
        d.rectangle((x + 30, 0, x + 34, H), fill=(40, 52, 96))
    # Cuello blanco en V y el escudito.
    d.polygon([(196, 0), (316, 0), (256, 70)], fill=(236, 236, 236))
    d.polygon([(214, 0), (298, 0), (256, 50)], fill=(16, 17, 22))
    d.ellipse((140, 92, 176, 132), fill=(232, 232, 232))
    d.ellipse((146, 98, 170, 126), fill=(28, 74, 168))
    ruido = np.random.default_rng(3).normal(0, 3, (H, W, 1))
    a = (np.asarray(im, np.float32) + ruido).clip(0, 255).astype(np.uint8)
    Image.fromarray(a).save(f'{ROPA}/shileno_frente.jpg', quality=90)
    tela = Image.fromarray(a[:, 256 - 128:256 + 128][100:356]).resize((256, 256))
    tela.save(f'{ROPA}/shileno_tela.jpg', quality=90)


camiseta()


# ---------- Cuadro del gym ----------
ORIGINAL = 'assets/cuadros/originales/cuadrogym.jpeg'
if not os.path.exists(ORIGINAL):
    shutil.copy('assets/cuadros/cuadrogym.jpeg', ORIGINAL)
c = Image.open(ORIGINAL).convert('RGB')
c.thumbnail((720, 720), Image.LANCZOS)
c.save('assets/cuadros/cuadrogym.jpeg', quality=84)
print('listo: caras (shileno, profe), tatuajes del profe, camiseta del Shileno y el cuadro del gym')
