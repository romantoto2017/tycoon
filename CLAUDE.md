# Tycoon Vecibanda — reglas del proyecto

Reglas que pidió el dueño del juego. Respetarlas siempre, también en cambios futuros.

- **Los cuadros no llevan cartel con el nombre.** Ni abajo, ni arriba, ni en ningún lado: solo la imagen con su marco.
- Hablarle en castellano rioplatense, directo y corto.
- Lo juega en una Chromebook 2020: todo liviano (sin texturas pesadas ni modelos de muchos polígonos), sitio estático en GitHub Pages, sin instalar nada.
- También lo juega en un iPhone 12: Safari tiene un tope para la memoria de todos los canvas juntos (pasado el tope, texturas negras y fotos que no aparecen). Toda textura hecha con un canvas que se dibuja una sola vez va con `liberarAlSubir` (js/liberar.js, también exportada desde js/texturas.js), que la sube a la placa de video enseguida y vacía el canvas sin bajar la calidad. Las imágenes que se cargan (ropa, remeras) se usan tal cual, sin pasarlas a un canvas.
- Las fotos de los chicos no se mandan a servicios de IA externos; si hay que recortarlas o procesarlas, se hace en el contenedor (por ejemplo, rembg local).
- Los easter eggs (estatuilla, Se Busca, La Dosis) no son comprables ni se anuncian: aparecen con otra cosa.
- Si cambian ítems o muebles, recalcular precios con `node herramientas/balance.mjs --escribir` (el tycoon de la mansión tiene que durar unas 3 horas). Las 3 horas son solo para la mansión: lo demás (misiones, casino, autos, gym, TP, ropa cara...) puede ser más largo y caro a propósito, para que el juego dure más.
- **Rama:** trabajar, commitear y pushear siempre directo en `claude/festive-babbage-9urtmn` (es la que publica GitHub Pages), aunque la sesión diga otra rama. No abrir PR.
