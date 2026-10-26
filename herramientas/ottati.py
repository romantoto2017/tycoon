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
# Como las otras remeras (512x380), pero sin puntas vacías: fila por fila, el ancho de la remera
# (sin las mangas, que van en los brazos) se estira de borde a borde, así no queda fondo en las
# esquinas de los hombros.
for lado_remera, nombre in (('frente', 'frente'), ('atras', 'espalda')):
    foto = np.asarray(Image.open(f'assets/especiales/remeraottati{lado_remera}.jpeg').convert('RGB'), np.float32)
    filas = []
    for y in range(74, 236):
        tela_fila = np.where(foto[y].min(axis=1) < 236)[0]
        izq = max(tela_fila.min() + 3, 142)
        der = min(tela_fila.max() - 3, 306)
        xs = np.linspace(izq, der, 512)
        filas.append(np.stack([np.interp(xs, np.arange(foto.shape[1]), foto[y, :, c]) for c in range(3)], axis=1))
    pecho = Image.fromarray(np.stack(filas).clip(0, 255).astype(np.uint8))
    pecho.resize((512, 380), Image.LANCZOS).save(f'assets/ropa/ottati_{nombre}.jpg', quality=90)
# Manga: el pedazo de la manga derecha de la foto (con el logo y las rayitas del puño).
foto = Image.open('assets/especiales/remeraottatifrente.jpeg').convert('RGB')
foto.crop((98, 112, 142, 200)).resize((128, 256), Image.LANCZOS).save('assets/ropa/ottati_manga.jpg', quality=90)
print('listo: assets/caras/ottati.jpeg, assets/ropa/ottati_frente.jpg, ottati_espalda.jpg, ottati_manga.jpg y ottati_tela.jpg')
