"""Ottati para el juego. Se procesa acá, sin servicios externos.

- Cara: un cuadro del video (assets/caras/ottati1.mp4, 4 s: de frente y con la boca cerrada)
  recortado en cuadrado y agrandado. En el video la barra de la app le corta la frente, así que
  arriba se pinta el pelo rapado (oscuro, con la entrada un poco más baja en las sienes).
- Remera de Nacional: frente y espalda recortados de las fotos, solo el cuerpo (sin las mangas,
  que en el muñeco son los brazos), con tela blanca a los costados para llegar al ancho del
  torso sin estirar el dibujo; y la tela blanca para las mangas.

    python3 herramientas/ottati.py      (necesita ffmpeg)
"""
import subprocess
import tempfile
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

VIDEO = 'assets/caras/ottati1.mp4'

with tempfile.TemporaryDirectory() as tmp:
    cuadro = f'{tmp}/cuadro.png'
    subprocess.run(['ffmpeg', '-v', 'error', '-i', VIDEO, '-ss', '4.0', '-frames:v', '1', cuadro, '-y'], check=True)
    im = Image.open(cuadro).convert('RGB')
x0, y0, lado = 200, 512, 60  # la cara en el cuadro de 384x832 (la frente arranca en y = 528)
cara = im.crop((x0, y0, x0 + lado, y0 + lado)).resize((256, 256), Image.LANCZOS)
cara = cara.filter(ImageFilter.UnsharpMask(radius=2, percent=70, threshold=2))
# Pelo rapado arriba: tapa la barra de la app y baja un poco en las sienes.
pelo = Image.new('RGB', (256, 256), (28, 22, 18))
mascara = Image.new('L', (256, 256), 0)
d = ImageDraw.Draw(mascara)
d.polygon([(0, 0), (256, 0), (256, 70), (225, 62), (190, 50), (128, 46), (66, 50), (31, 62), (0, 70)], fill=255)
mascara = mascara.filter(ImageFilter.GaussianBlur(5))
ruido = np.random.default_rng(4).normal(0, 9, (256, 256, 1))
pelo = Image.fromarray((np.asarray(pelo, np.float32) + ruido).clip(0, 255).astype(np.uint8))
cara.paste(pelo, (0, 0), mascara)
cara.save('assets/caras/ottati.jpeg', quality=92)

rng = np.random.default_rng(6)
def tela(w, h):
    base = np.full((h, w, 3), 246, dtype=np.float32) + rng.normal(0, 2.5, (h, w, 1))
    return Image.fromarray(base.clip(0, 255).astype(np.uint8))

tela(256, 256).save('assets/ropa/ottati_tela.jpg', quality=90)
# Del cuello hasta la cintura; el torso del muñeco es más ancho que alto (512x440).
for lado_remera, nombre in (('frente', 'frente'), ('atras', 'espalda')):
    foto = Image.open(f'assets/especiales/remeraottati{lado_remera}.jpeg').convert('RGB')
    cuerpo = foto.crop((136, 56, 312, 283))
    cuerpo = cuerpo.resize((round(cuerpo.width * 440 / cuerpo.height), 440), Image.LANCZOS)
    lienzo = tela(512, 440)
    lienzo.paste(cuerpo, ((512 - cuerpo.width) // 2, 0))
    lienzo.save(f'assets/ropa/ottati_{nombre}.jpg', quality=90)
print('listo: assets/caras/ottati.jpeg, assets/ropa/ottati_frente.jpg, ottati_espalda.jpg y ottati_tela.jpg')
