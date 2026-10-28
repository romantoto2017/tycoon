"""Manu Mendez para el juego. Se procesa acá, sin servicios externos.

- Cara: recortada de assets/caras/manu.png (de la frente a la pera), agrandada a 256.
- Remera gris con las rayas del pecho (roja, blanca y una franja azul marino ancha) y las
  mangas azul marino, como en la foto.

    python3 herramientas/manu.py
"""
import numpy as np
from PIL import Image, ImageFilter

im = Image.open('assets/caras/manu.png').convert('RGB')
cara = im.crop((40, 6, 77, 51)).resize((256, 256), Image.LANCZOS)
cara = cara.filter(ImageFilter.UnsharpMask(radius=2, percent=80, threshold=2))
# La foto está lavada por la luz de la ventana: se le baja la exposición (gamma), sin cambiarle el color.
a = np.asarray(cara, np.float32) / 255
cara = Image.fromarray((a ** 1.35 * 255).clip(0, 255).astype(np.uint8))
cara.save('assets/caras/manu.jpeg', quality=92)


rng = np.random.default_rng(9)
GRIS = (170, 172, 176)
ROJO = (196, 46, 70)
BLANCO = (236, 236, 238)
MARINO = (36, 42, 62)

def ruido(a):
    return Image.fromarray((a + rng.normal(0, 3, a.shape[:2] + (1,))).clip(0, 255).astype(np.uint8))

def remera(w, h):
    a = np.zeros((h, w, 3), np.float32) + GRIS
    # Rayas del pecho (de arriba a abajo), en proporción a la foto.
    for y0, y1, c in ((0.1, 0.15, ROJO), (0.15, 0.2, BLANCO), (0.24, 0.45, MARINO), (0.2, 0.24, GRIS)):
        a[int(h * y0):int(h * y1)] = c
    return a

ruido(remera(512, 380)).save('assets/ropa/manu_frente.jpg', quality=90)
ruido(remera(512, 380)).save('assets/ropa/manu_espalda.jpg', quality=90)
ruido(np.zeros((256, 128, 3), np.float32) + MARINO).save('assets/ropa/manu_manga.jpg', quality=90)
ruido(np.zeros((256, 256, 3), np.float32) + GRIS).save('assets/ropa/manu_tela.jpg', quality=90)
print('listo: cara y remera de Manu')
