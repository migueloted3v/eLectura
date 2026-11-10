# eLectura

Lector de libros EPUB y PDF para el celular, pensado para leer muchas horas sin cansar la vista. Regula la luz de la pantalla sin dejarla oscura, cambia de modo según la hora y permite consultar el significado o la traducción de cualquier palabra, ideal para leer en inglés.

Es una app web instalable (PWA): funciona en iPhone y Android, se instala en la pantalla de inicio y lee sin internet.

## Qué hace

**Comodidad visual**
- Cuatro modos: Automático, Día (papel), Tarde (sepia) y Noche (fondo oscuro cálido).
- En Automático cambia sola según el horario que definas; los demás se aplican al instante y se quedan fijos.
- Atenuación con piso mínimo: nunca baja de 45 % de brillo percibido, así el texto siempre se lee.
- Calidez ajustable, de neutra a ámbar.
- Tipografía (Literata, Atkinson de alta legibilidad o Georgia), tamaño de letra, interlineado y márgenes.
- Pasar página por páginas (tocar los bordes o deslizar) o en scroll continuo.
- Mantiene la pantalla encendida mientras lees y ofrece un recordatorio de descanso cada 20 minutos.

**Biblioteca por perfil**
- Cada persona tiene su perfil con sus libros, progreso, modo de lectura y vocabulario.
- Los libros se guardan en el dispositivo y se leen sin conexión.
- Los libros terminados pueden liberarse automáticamente: se quita el archivo y se conservan el progreso y el vocabulario.

**Buscar y bajar libros**
- Búsqueda dentro de la app en Project Gutenberg y Open Library (libros de dominio público).
- Standard Ebooks como enlace directo.
- Fuentes propias: agrega cualquier sitio como enlace o como catálogo OPDS.
- Mi nube: abre libros desde iCloud Drive (selector de Archivos del iPhone) o explora tu carpeta de Google Drive y bájalos al celular.
- Si vuelves a abrir un libro que ya habías leído, retomas en la página donde ibas.

**Consulta de palabras (libros EPUB)**
- Mantén presionada una palabra y elige Significado o Traducción.
- Significados en inglés con Free Dictionary API; traducciones con MyMemory.
- Guarda palabras en Mi vocabulario junto con la frase donde aparecieron.
- Solo las consultas usan internet; la lectura no.

**Citas y marcadores (libros EPUB)**
- Selecciona cualquier texto y elige Sombrear o Subrayar en 5 colores (amarillo, verde, azul, rosa, naranja). La cita se guarda al elegir el color.
- Agrega una nota personal opcional a cada cita.
- Toca un pasaje marcado para cambiar su color o estilo, editar la nota o borrarlo.
- Mis citas (Ajustes) reúne todas, agrupadas por libro y filtrables por color; al tocar una, el libro abre en esa página.
- Dentro del libro, el ícono de marcador muestra las citas de ese libro.
- Las citas se conservan aunque quites el libro del cel; se borran solo si eliminas el libro por completo.

**Convertir Word o PDF a EPUB**
- Al abrir un Word (.docx) o un PDF, la app ofrece convertirlo a EPUB; también desde el menú ⋯ de cualquier PDF de la biblioteca.
- Word: conserva capítulos (según los títulos del documento), negritas, listas, tablas e imágenes.
- PDF (en prueba): reconstruye párrafos y capítulos, quita números de página y encabezados repetidos. Pierde columnas, tablas y diseño. Los PDF escaneados no se pueden convertir.
- Al terminar pregunta si borrar el PDF original; si no decides, se conservan los dos.
- Descargar EPUB: en iPhone abre el menú para guardarlo en Archivos (iCloud) o Google Drive.
- Todo ocurre en el dispositivo, sin internet (el convertidor de Word se descarga la primera vez y queda guardado).

**Respaldo**
- Exporta e importa un archivo JSON con perfiles, progreso, ajustes, fuentes y vocabulario (no incluye los libros).

## Tecnología

- HTML estático con React 18 y JSX compilado en el navegador (Babel), sin paso de build.
- epub.js para EPUB y pdf.js para PDF; mammoth.js y JSZip para convertir Word y PDF a EPUB.
- IndexedDB para libros y datos; service worker para uso sin internet.
- Google Identity Services y Drive API (solo lectura) para Google Drive.
- Se publica en GitHub Pages.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | Estructura, estilos y carga de librerías |
| `app.js` | Toda la interfaz |
| `services.js` | Almacenamiento, lectura de archivos, búsquedas, diccionario y Google Drive |
| `converter.js` | Conversión de Word y PDF a EPUB |
| `config.js` | Configuración editable (Client ID de Google, carpeta de Drive) |
| `sw.js` | Uso sin internet y actualizaciones |
| `manifest.webmanifest`, `icons/` | Instalación en la pantalla de inicio |

## Limitaciones conocidas

- Los .doc antiguos (Word 97-2003) no se convierten; hay que guardarlos como .docx.
- Libros con DRM (Kindle, préstamos de Open Library) no se pueden abrir.
- En PDF no hay consulta de palabras ni citas (convierte el PDF a EPUB para usarlas) ni cambio real de tamaño de letra (solo zoom).
- Algunos sitios no permiten descargar desde otra página; en ese caso la app abre el sitio para bajar el archivo manualmente.
- Los datos viven en cada dispositivo; no hay sincronización automática entre celulares.
