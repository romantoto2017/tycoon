"""La Gioconda con la cara de Bauti (bautizoom). Se hace acá, con OpenCV (sin mandar la foto
a ningún servicio de IA externo): la cara se acomoda con ojos y boca sobre los de la Gioconda
y se mezcla con "seamless clone", que le copia la luz y los tonos de la pintura.

    pip install opencv-python-headless
    python3 herramientas/gioconda_bauti.py
"""
import cv2
import numpy as np

mona = cv2.imread('assets/pinturas/mona_lisa.jpg')
cara = cv2.imread('assets/cuadros/bautizoom.jpeg')
# Ojo izquierdo, ojo derecho y centro de la boca, en cada imagen.
en_cara = np.float32([[333, 493], [1227, 493], [773, 1467]])
en_mona = np.float32([[201.7, 171.7], [251.7, 171.7], [226, 231]])
m = cv2.getAffineTransform(en_cara, en_mona)
encima = cv2.warpAffine(cara, m, (mona.shape[1], mona.shape[0]), flags=cv2.INTER_AREA, borderMode=cv2.BORDER_REFLECT)
# Lo que se reemplaza: el óvalo de la cara (sin el pelo ni el cuello).
mascara = np.zeros(mona.shape[:2], np.uint8)
cv2.ellipse(mascara, (226, 199), (40, 53), 0, 0, 360, 255, -1)
mezcla = cv2.seamlessClone(encima, mona, mascara, (226, 199), cv2.NORMAL_CLONE)
# Un toque del tono amarillento del barniz viejo, para que parezca parte de la pintura.
barniz = cv2.addWeighted(mezcla, 0.88, mona, 0.12, 0)
cv2.imwrite('assets/pinturas/mona_lisa_bauti.jpg', barniz, [cv2.IMWRITE_JPEG_QUALITY, 92])
print('listo: assets/pinturas/mona_lisa_bauti.jpg')
