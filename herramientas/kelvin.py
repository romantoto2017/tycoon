"""Kelvin (el que atiende Power Camp) para el juego. Se procesa acá, sin servicios externos.

- Cara: un cuadro del video (assets/especiales/kelvincara.mp4, 13,5 s, de frente y con los
  lentes) recortado en cuadrado y agrandado.
- Buzo: negro con el logo POWER chiquito en el pecho (lado izquierdo de él, como en el video),
  y la tela para la espalda y las mangas.

    python3 herramientas/kelvin.py      (necesita ffmpeg)
"""
import subprocess
import tempfile
import numpy as np
from PIL import Image, ImageFilter

VIDEO = 'assets/especiales/kelvincara.mp4'
LOGO = 'assets/especiales/gymlogo.png'

with tempfile.TemporaryDirectory() as tmp:
    cuadro = f'{tmp}/cuadro.png'
    subprocess.run(['ffmpeg', '-v', 'error', '-ss', '13.42', '-i', VIDEO, '-frames:v', '1', cuadro, '-y'], check=True)
    im = Image.open(cuadro).convert('RGB')
x0, y0, lado = 188, 278, 60  # la cara en el cuadro de 384x832
cara = im.crop((x0, y0, x0 + lado, y0 + lado)).resize((256, 256), Image.LANCZOS)
cara = cara.filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))
cara.save('assets/caras/kelvin.jpeg', quality=92)

rng = np.random.default_rng(3)
def tela(w, h):
    base = np.full((h, w, 3), 22, dtype=np.float32)
    base += rng.normal(0, 3.5, (h, w, 1))
    return Image.fromarray(base.clip(0, 255).astype(np.uint8))

tela(256, 256).save('assets/ropa/kelvin_tela.jpg', quality=90)
frente = tela(512, 380)
logo = Image.open(LOGO).convert('L')
logo = logo.crop(logo.point(lambda v: 255 if v > 60 else 0).getbbox())  # chevron + POWER + FITNESS/CLUB
logo = logo.resize((int(logo.width * 108 / logo.height), 108), Image.LANCZOS)
blanco = Image.new('RGB', logo.size, (236, 236, 236))
frente.paste(blanco, (330, 70), logo)
frente.save('assets/ropa/kelvin_frente.jpg', quality=90)
print('listo: assets/caras/kelvin.jpeg, assets/ropa/kelvin_frente.jpg, assets/ropa/kelvin_tela.jpg')
