# Endereza la foto de la STM de la Schwepa, le saca el dedo, tapa los datos personales
# (nombre, CI y número de tarjeta) y redondea las esquinas. Todo local, sin servicios de IA.
# Uso: python3 herramientas/stm_schwepa.py <foto.jpeg> <enderezada.png> <salida.png>
import sys
import numpy as np
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
W, H = 856, 540
esquinas = [(237, 381), (1197, 531), (1144, 1225), (175, 990)]  # sup-izq, sup-der, inf-der, inf-izq
destino = [(0, 0), (W, 0), (W, H), (0, H)]
A, b = [], []
for (x, y), (u, v) in zip(esquinas, destino):
    A.append([u, v, 1, 0, 0, 0, -u * x, -v * x]); b.append(x)
    A.append([0, 0, 0, u, v, 1, -u * y, -v * y]); b.append(y)
coef = np.linalg.solve(np.array(A, float), np.array(b, float))
im = Image.open(src).convert('RGB')
out = im.transform((W, H), Image.PERSPECTIVE, tuple(coef), Image.BICUBIC)
out.save(dst)

# ---------- Limpieza: sacar el dedo, tapar datos personales y redondear esquinas ----------
from PIL import ImageDraw, ImageFont, ImageFilter
import glob, random
a = np.asarray(out).astype(int)
fondo = tuple(int(v) for v in np.median(a[60:110, 700:840].reshape(-1, 3), axis=0))
banda = tuple(int(v) for v in np.median(a[470:530, 450:560].reshape(-1, 3), axis=0))
print('fondo', fondo, 'banda', banda)
d = ImageDraw.Draw(out)
# Dedo: todo lo claro dentro de la banda negra, a la izquierda del logo de STM.
y0 = 428
lum = a[..., :3].mean(axis=2)
rnd = random.Random(4)
px = out.load()
for y in range(y0, H):
    for x in range(0, 300):
        if lum[y, x] > 60 or (a[y, x, 0] - a[y, x, 2] > 18):
            n = rnd.randint(-5, 5)
            px[x, y] = tuple(max(0, c + n) for c in banda)
# Borde del dedo al lado del logo (el logo es blanco: solo se pinta lo rosado).
for y in range(y0, H):
    for x in range(300, 350):
        if a[y, x, 0] - a[y, x, 2] > 14 and a[y, x, 0] > 70:
            px[x, y] = tuple(max(0, c + rnd.randint(-5, 5)) for c in banda)
# borde de la banda prolijo
d.rectangle([0, y0 - 3, 300, y0 + 2], fill=banda)
# Nombre, CI y número de la tarjeta (datos reales): se tapan y va "LA SCHWEPA".
# Se rellena con el mismo degradé que tiene la tarjeta alrededor (columna por columna).
def tapar(x0, y0b, x1, y1b):
    for x in range(x0, min(x1, W - 1) + 1):
        arriba = np.array(px[x, min(H - 1, y1b + 3)][:3], float)  # (arriba está la pestaña verde)
        abajo = np.array(px[x, min(H - 1, y1b + 3)][:3], float)
        for y in range(y0b, y1b + 1):
            t = (y - y0b) / max(1, y1b - y0b)
            px[x, y] = tuple(int(v) for v in arriba * (1 - t) + abajo * t)
tapar(282, 121, 705, 258)
tapar(812, 250, W - 1, 410)
fuente = next(iter(glob.glob('/usr/share/fonts/**/DejaVuSans.ttf', recursive=True)))
f = ImageFont.truetype(fuente, 42)
for i, t in enumerate(['LA SCHWEPA', 'DE SAYAGO', 'CI 0.000.000-0']):
    d.text((292, 124 + i * 44), t, font=f, fill=(48, 48, 50))
# Esquinas redondeadas.
m = Image.new('L', (W * 4, H * 4), 0)
ImageDraw.Draw(m).rounded_rectangle([0, 0, W * 4 - 1, H * 4 - 1], radius=150, fill=255)
out = out.convert('RGBA')
out.putalpha(m.resize((W, H), Image.LANCZOS))
out.save(sys.argv[3], optimize=True)
