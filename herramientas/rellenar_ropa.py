"""Arregla prendas de la tienda que salían mal de herramientas/ropa.py (correrlo después de ese).
Todo acá en el contenedor: los rellenos son con IA (LaMa, un modelo de relleno de imágenes que
corre local con onnxruntime; no se manda nada a ningún servicio).

- Conjunto Corteiz celeste (la foto es el buzo y el jogging juntos, uno encima del otro):
  · Buzo: el frente es solo el cuerpo (de la capucha al puño elastizado y de manga a manga, con
    el logo en el medio), como los otros buzos; antes entraba el buzo entero con las mangas y
    el fondo. El puño de la manga que tapaba la esquina se rellena con IA.
  · Jogging: cada pierna se endereza fila por fila (del borde de afuera a la entrepierna, y
    arriba hasta el medio), así ocupa toda la textura y no queda fondo ni pedazos del buzo.
- Jogging Jordan: la foto es con modelo; quedaban la mano y el brazo al costado, piel arriba
  y las zapatillas abajo. Se rellenan con IA con la tela del jogging.
- Fotos del catálogo (assets/ropa/tienda/): lo que no es pantalón pasa a ser transparente.

    pip install onnxruntime opencv-python-headless
    curl -L -o lama.onnx https://huggingface.co/Carve/LaMa-ONNX/resolve/main/lama_fp32.onnx
    python3 herramientas/ropa.py && python3 herramientas/rellenar_ropa.py lama.onnx
"""
import sys
import numpy as np
import onnxruntime as ort
from PIL import Image, ImageDraw, ImageFilter

sesion = ort.InferenceSession(sys.argv[1] if len(sys.argv) > 1 else 'lama.onnx')


def lama(im, zonas):
    """Rellena con LaMa los rectángulos de zonas [(x0, y0, x1, y1), ...] (en píxeles de im)."""
    w, h = im.size
    mascara = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(mascara)
    for z in zonas:
        d.rectangle(z, fill=255)
    mascara = mascara.filter(ImageFilter.MaxFilter(5))
    entrada = np.asarray(im.convert('RGB').resize((512, 512), Image.LANCZOS), np.float32).transpose(2, 0, 1)[None] / 255
    m = (np.asarray(mascara.resize((512, 512), Image.NEAREST), np.float32) > 127).astype(np.float32)[None, None]
    salida = sesion.run(None, {'image': entrada, 'mask': m})[0][0].transpose(1, 2, 0)
    if salida.max() <= 1.5:
        salida = salida * 255
    relleno = Image.fromarray(salida.clip(0, 255).astype(np.uint8)).resize((w, h), Image.LANCZOS)
    # Solo se cambia lo de adentro de la máscara (con el borde suavizado).
    suave = mascara.filter(ImageFilter.GaussianBlur(2))
    return Image.composite(relleno, im.convert('RGB'), suave)


P = 'assets/ropa/prendas'

# ---------- Conjunto Corteiz celeste ----------
foto = Image.open('assets/ropa/corteiztracksuit2.jpeg').convert('RGB')
fw, fh = foto.size
cuerpo = foto.crop((round(0.28 * fw), round(0.335 * fh), round(0.49 * fw), round(0.77 * fh)))
cw, ch = cuerpo.size
cuerpo = lama(cuerpo, [(0, round(0.76 * ch), round(0.17 * cw), round(0.94 * ch))])  # el puño de la manga
cuerpo.resize((round(512 * cw / ch), 512), Image.LANCZOS).save(f'{P}/buzocorteizceleste_frente.jpg', quality=88)
ASPECTO_BUZO = round(cw / ch, 3)

a = np.asarray(foto).astype(np.float32)
ai = a.astype(int)
# Tela: el celeste (y el blanco del logo); el fondo es la alfombra gris.
tela = ((ai[..., 2] > 185) & (ai[..., 2] - ai[..., 0] > 45)) | (ai.min(axis=2) > 200)
Y, L, R, iL, iR = [], [], [], [], []
for y in range(int(0.12 * fh), int(0.95 * fh)):
    fila = tela[y]
    tramos = []
    x = int(0.497 * fw)  # a la izquierda está el buzo
    while x < fw:
        if fila[x]:
            x0 = x
            while x < fw and fila[x]:
                x += 1
            tramos.append([x0, x])
        x += 1
    juntos = []
    for t in tramos:  # las costuras cortan la tela en pedacitos: se juntan
        if juntos and t[0] - juntos[-1][1] < 0.03 * fw:
            juntos[-1][1] = t[1]
        else:
            juntos.append(t)
    juntos = [t for t in juntos if t[1] - t[0] > 0.04 * fw]
    if not juntos or juntos[-1][1] - juntos[0][0] < 0.15 * fw:
        continue
    Y.append(y)
    L.append(juntos[0][0])
    R.append(juntos[-1][1])
    iL.append(juntos[0][1] if len(juntos) > 1 else np.nan)
    iR.append(juntos[-1][0] if len(juntos) > 1 else np.nan)
L, R, iL, iR = (np.array(v, float) for v in (L, R, iL, iR))
# Arriba de la entrepierna las piernas se separan por una línea del medio de la cintura a la
# entrepierna; abajo, por el hueco entre las dos.
k = len(iL) - 1
while k > 0 and not np.isnan(iL[k - 1]):
    k -= 1
medio0 = (L[0] + R[0]) / 2
medio1 = (iL[k] + iR[k]) / 2
for j in range(k):
    iL[j] = iR[j] = medio0 + (medio1 - medio0) * j / max(1, k)


def suave(v, n=15):
    return np.convolve(np.pad(v, (n, n), mode='edge'), np.ones(2 * n + 1) / (2 * n + 1), mode='same')[n:-n]


L, R, iL, iR = (suave(v) for v in (L, R, iL, iR))
hoja = Image.new('RGB', (320, 512))
for i, (A, B) in enumerate([(L, iL), (iR, R)]):
    filas = [np.stack([np.interp(np.linspace(A[j] + 2, B[j] - 2, 160), np.arange(fw), a[y, :, c]) for c in range(3)], axis=1) for j, y in enumerate(Y)]
    hoja.paste(Image.fromarray(np.stack(filas).clip(0, 255).astype(np.uint8)).resize((160, 512), Image.LANCZOS), (i * 160, 0))
hoja.save(f'{P}/pantcorteizceleste_piernas.jpg', quality=90)
# La proporción del frente nuevo del buzo (la usa personaje.js).
colores = open('data/ropa_colores.js').read()
i = colores.index('"buzocorteizceleste"')
j = colores.index('"aspecto"', i)
f = colores.index(',', j)
open('data/ropa_colores.js', 'w').write(colores[:j] + f'"aspecto": {ASPECTO_BUZO}' + colores[f:])
print('listo: conjunto Corteiz celeste')

# ---------- Jogging Jordan ----------
jordan = Image.open(f'{P}/joggingjordan_piernas.jpg')
lama(jordan, [(0, 0, 319, 16), (260, 0, 319, 180), (0, 0, 22, 210), (0, 468, 319, 511)]).save(f'{P}/joggingjordan_piernas.jpg', quality=90)
print('listo: jogging Jordan')

# Catálogo del jogging Jordan: fuera la piel de la modelo (manos y panza) y las zapatillas.
cat = Image.open('assets/ropa/tienda/joggingjordan.webp').convert('RGBA')
a = np.asarray(cat).astype(np.int16)
piel = (a[..., 0] - a[..., 2] > 18) & (a[..., 0] > 60)
piel = np.asarray(Image.fromarray((piel * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))) > 0
alfa = a[..., 3].copy()
alfa[piel] = 0
alfa[:9] = 0
alfa[round(cat.height * 0.955):] = 0
cat.putalpha(Image.fromarray(alfa.astype(np.uint8)))
cat.crop(cat.getbbox()).save('assets/ropa/tienda/joggingjordan.webp', quality=85, method=6)
print('listo: catálogo del jogging Jordan')

# Catálogo del jogging Corteiz celeste: fuera la tira del buzo que asoma a la izquierda.
cat = Image.open('assets/ropa/tienda/pantcorteizceleste.webp').convert('RGBA')
alfa = np.asarray(cat.getchannel('A')).copy()
alfa[:round(cat.height * 0.86), :round(cat.width * 0.11)] = 0
alfa[:, :round(cat.width * 0.085)] = 0
cat.putalpha(Image.fromarray(alfa))
cat.crop(cat.getbbox()).save('assets/ropa/tienda/pantcorteizceleste.webp', quality=85, method=6)
print('listo: catálogo del jogging Corteiz celeste')
