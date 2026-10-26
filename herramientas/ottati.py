"""Ottati para el juego. Se procesa acá, sin servicios externos.

- Cara: un cuadro del video (assets/caras/ottati1.mp4, 4 s: de frente y con la boca cerrada),
  solo la cara, agrandada para que ocupe todo el frente de la cabeza.
- Remera de Nacional: frente y espalda de las fotos ocupando todo el torso, la manga sacada
  de la foto y la tela blanca para los costados.

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
# Solo la cara, de la frente (justo abajo de la barra de la app) al mentón y de oreja a oreja.
cara = im.crop((205, 528, 256, 570)).resize((256, 256), Image.LANCZOS)
cara = cara.filter(ImageFilter.UnsharpMask(radius=2, percent=70, threshold=2))
cara.save('assets/caras/ottati.jpeg', quality=92)

rng = np.random.default_rng(6)
def tela(w, h):
    base = np.full((h, w, 3), 246, dtype=np.float32) + rng.normal(0, 2.5, (h, w, 1))
    return Image.fromarray(base.clip(0, 255).astype(np.uint8))

tela(256, 256).save('assets/ropa/ottati_tela.jpg', quality=90)
# Como las otras remeras (512x380): del cuello hasta abajo del logo, de lado a lado del pecho.
# Lo que asoma de las mangas (el logo de Turil y las rayitas) se tapa con tela blanca.
for lado_remera, nombre in (('frente', 'frente'), ('atras', 'espalda')):
    foto = Image.open(f'assets/especiales/remeraottati{lado_remera}.jpeg').convert('RGB')
    pecho = foto.crop((108, 62, 341, 235))
    d = ImageDraw.Draw(pecho)
    for x0, x1 in ((0, 34), (198, 233)):
        d.rectangle((x0, 45, x1, 173), fill=pecho.getpixel((116, 150)))
    pecho.resize((512, 380), Image.LANCZOS).save(f'assets/ropa/ottati_{nombre}.jpg', quality=90)
# Manga: el pedazo de la manga derecha de la foto (con el logo y las rayitas del puño).
foto = Image.open('assets/especiales/remeraottatifrente.jpeg').convert('RGB')
foto.crop((98, 112, 142, 200)).resize((128, 256), Image.LANCZOS).save('assets/ropa/ottati_manga.jpg', quality=90)
print('listo: assets/caras/ottati.jpeg, assets/ropa/ottati_frente.jpg, ottati_espalda.jpg, ottati_manga.jpg y ottati_tela.jpg')
