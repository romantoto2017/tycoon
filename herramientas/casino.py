"""Astrojorge, el dealer del casino. Todo acá, sin servicios externos.

- Cara: recortada de assets/caras/astrojorge.jpeg (de la frente a la pera). El pelo y la barba se
  pasan a blanco y se le marcan bien las dos entradas (la "piscina" de la coronilla se dibuja en
  el juego, en la textura de arriba de la cabeza: `calva` en texturas.js).
- Ropa de dealer: camisa blanca, chaleco negro, moño rojo y la plaquita dorada con el nombre.

    python3 herramientas/casino.py
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

CARAS = 'assets/caras'
ROPA = 'assets/ropa'
S = 256

# ---------- Cara ----------
# Recorte de la cara (un poco más alto que ancho: se estira a la cabeza cuadrada del juego).
im = Image.open(f'{CARAS}/astrojorge.jpeg').convert('RGB').crop((42, 8, 88, 74)).resize((S, S), Image.LANCZOS)
a = np.asarray(im, np.float32)
yy, xx = np.mgrid[0:S, 0:S] / S
r, g, b = a[..., 0], a[..., 1], a[..., 2]


def suave(v, a0, a1):
    return np.clip((v - a0) / (a1 - a0), 0, 1)


# Lo que es piel (rosado/anaranjado) contra pelo y barba (grises y marrones oscuros).
es_piel = suave(r - b, 28, 55) * suave(r, 110, 150) * suave(L := a.mean(axis=2), 100, 130)
piel = a[int(S * 0.3):int(S * 0.4), int(S * 0.35):int(S * 0.65)].reshape(-1, 3).mean(axis=0)
# Pelo: arriba y a los costados (patillas). Barba: bigote, mentón y mandíbula.
zona_pelo = np.maximum(suave(0.31 - yy, 0, 0.06), suave(np.abs(xx - 0.5) - 0.37, 0, 0.04) * suave(0.62 - yy, 0, 0.08))
zona_barba = suave(yy - 0.6, 0, 0.05) * suave(0.42 - np.abs(xx - 0.5), 0, 0.05)
m = np.clip(np.maximum(zona_pelo, zona_barba) * (1 - es_piel), 0, 1)
m = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2)), np.float32)[..., None] / 255
# Blanco canoso, con el dibujo de los mechones (las variaciones de luz de la foto).
canoso = np.clip(212 + (L - L.mean())[..., None] * 0.35, 165, 245) * np.array([1.0, 0.99, 0.95])
a = a * (1 - m) + canoso * m
# Entradas: la frente sube hasta casi arriba en las dos sienes y en el medio queda un mechón en
# punta. Abajo de esa línea, la frente se completa estirando para arriba la fila de piel de la
# frente (así el color sigue igual); arriba, pelo blanco.
fila = int(S * 0.3)
linea = 0.05 + 0.13 * np.exp(-((xx - 0.5) / 0.09) ** 2) + 0.5 * suave(np.abs(xx - 0.5) - 0.34, 0, 0.1)
frente = np.repeat(a[fila:fila + 1], S, axis=0) * (1 + (0.3 - yy[..., None]) * 0.15)
e = (suave(yy - linea, 0, 0.03) * suave(0.3 - yy, -0.01, 0.02) * suave(0.4 - np.abs(xx - 0.5), 0, 0.04))[..., None]
a = a * (1 - e) + frente * e
arriba = suave(linea - yy, -0.005, 0.02)[..., None] * suave(0.42 - np.abs(xx - 0.5), 0, 0.03)[..., None]
a = a * (1 - arriba) + canoso * arriba
cara = Image.fromarray(a.clip(0, 255).astype(np.uint8)).filter(ImageFilter.UnsharpMask(radius=2, percent=70, threshold=2))
cara.save(f'{CARAS}/astrojorge_cara.jpeg', quality=92)

# ---------- Ropa de dealer ----------
W, H = 512, 380
f = Image.new('RGB', (W, H), (246, 246, 242))
d = ImageDraw.Draw(f)
# Chaleco negro con escote en V (deja ver la camisa) y botones dorados.
d.polygon([(0, 0), (190, 0), (256, 210), (256, H), (0, H)], fill=(22, 22, 26))
d.polygon([(W, 0), (322, 0), (256, 210), (256, H), (W, H)], fill=(22, 22, 26))
d.line([(256, 210), (256, H)], fill=(60, 60, 66), width=3)
for y in (240, 290, 340):
    d.ellipse((248, y - 7, 264, y + 7), fill=(212, 175, 55))
# Moño rojo arriba de todo y la camisa con su tapeta.
d.polygon([(222, 6), (256, 24), (222, 42)], fill=(190, 20, 30))
d.polygon([(290, 6), (256, 24), (290, 42)], fill=(190, 20, 30))
d.ellipse((246, 14, 266, 34), fill=(150, 10, 20))
d.line([(256, 44), (256, 200)], fill=(215, 215, 210), width=4)
# Plaquita con el nombre.
d.rounded_rectangle((330, 120, 470, 158), 6, fill=(212, 175, 55))
try:
    fuente = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
except OSError:
    fuente = ImageFont.load_default()
d.text((400, 139), 'ASTROJORGE', fill=(30, 24, 10), font=fuente, anchor='mm')
ruido = np.random.default_rng(5).normal(0, 2.5, (H, W, 1))
f = Image.fromarray((np.asarray(f, np.float32) + ruido).clip(0, 255).astype(np.uint8))
f.save(f'{ROPA}/astrojorge_frente.jpg', quality=90)
# Tela: la camisa blanca (costados y mangas largas); la espalda, el raso negro del chaleco.
tela = Image.new('RGB', (256, 256), (244, 244, 240))
dt = ImageDraw.Draw(tela)
for x in range(0, 256, 16):
    dt.line([(x, 0), (x, 256)], fill=(232, 232, 228), width=1)
tela.save(f'{ROPA}/astrojorge_tela.jpg', quality=90)
espalda = Image.new('RGB', (W, H), (26, 26, 30))
de = ImageDraw.Draw(espalda)
de.rectangle((200, 0, 312, 40), fill=(244, 244, 240))  # el cuello de la camisa
de.line([(256, 60), (256, H)], fill=(44, 44, 50), width=4)
espalda.save(f'{ROPA}/astrojorge_espalda.jpg', quality=90)
print('listo: cara y ropa de Astrojorge')
