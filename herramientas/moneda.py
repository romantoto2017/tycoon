"""Moneda del juego con la cara del Negro Bebé: aro dorado y la cara en el centro.
Se hace acá (sin servicios externos). El juego usa assets/moneda.png si existe.

    python3 herramientas/moneda.py
"""
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

S = 256
foto = Image.open('assets/especiales/moneda.jpeg').convert('RGB')
cx, cy, lado = 205, 196, 330  # la cara en la foto de 432 x 362
cara = foto.crop((cx - lado // 2, cy - lado // 2, cx + lado // 2, cy + lado // 2)).resize((S, S), Image.LANCZOS)
cara = ImageEnhance.Contrast(ImageEnhance.Color(cara).enhance(1.15)).enhance(1.1)

moneda = Image.new('RGBA', (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(moneda)
r = int(S * 0.47)
c = S // 2
# Aro dorado con degradé (claro arriba a la izquierda, oscuro abajo a la derecha).
for i in range(r, 0, -1):
    t = i / r
    col = (int(255 - 40 * t), int(214 - 70 * t), int(70 - 60 * t), 255)
    d.ellipse((c - i, c - i, c + i, c + i), fill=col)
d.ellipse((c - r, c - r, c + r, c + r), outline=(156, 98, 0, 255), width=10)
# La cara adentro, con un filito dorado oscuro.
ri = int(r * 0.8)
mascara = Image.new('L', (S, S), 0)
ImageDraw.Draw(mascara).ellipse((c - ri, c - ri, c + ri, c + ri), fill=255)
mascara = mascara.filter(ImageFilter.GaussianBlur(1))
moneda.paste(cara, (0, 0), mascara)
d.ellipse((c - ri - 3, c - ri - 3, c + ri + 3, c + ri + 3), outline=(176, 116, 0, 255), width=6)
moneda.save('assets/moneda.png', optimize=True)
print('listo: assets/moneda.png')
