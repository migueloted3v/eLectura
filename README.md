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
- Arriba, junto al título, muestra en qué página vas y cuántas tiene el libro. En EPUB la numeración es fija aunque cambies el tamaño de letra; en PDF son las páginas reales.
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

**Sagas (carpetas)**
- Agrupa los libros de una saga en una carpeta. En la biblioteca se ve como una pila con la portada del primer libro que tenga imagen (o la que elijas) y cuántos llevas leídos.
- Dentro de la carpeta, los libros van numerados en orden de lectura; mantén presionada la manija ≡ y arrastra para cambiar el orden.
- Detecta sagas en los datos del EPUB (Calibre `calibre:series` y EPUB 3 `belongs-to-collection`) y sugiere las carpetas ya ordenadas por tomo; tú confirmas o ignoras.
- Botón **Nueva saga** en la biblioteca: nombre y libros en el orden en que los marques.
- Menú ⋯ del libro → Mover a una saga; menú de la carpeta → Renombrar, Elegir portada, Deshacer saga (los libros vuelven sueltos).
- Al terminar un libro de una saga, ofrece abrir el siguiente (o buscarlo en Mi nube si no está en el aparato).
- Las sagas se sincronizan entre aparatos.

**Ver por autor**
- Selector Sagas | Autores en la biblioteca (recuerda el último usado).
- Autores en orden alfabético por apellido, cada uno como pila con sus libros y cuántos llevas leídos; incluye los libros que están dentro de sagas.
- Junta variantes del mismo nombre ("Gibson, William" = "William Gibson").
- Cada libro, en la biblioteca o dentro de cualquier carpeta (autor o saga), tiene ⋯ para cambiarlo de autor, corregir su título, moverlo a otra saga, crear una saga nueva o sacarlo de la saga.
- Si el título trae el autor ("William Gibson - Neuromancer"), la app propone separarlos con un toque.

**Portadas desde internet**
- Menú ⋯ de un libro → Buscar portada: hasta 6 opciones de Open Library y Google Books; tocas la correcta y se guarda en el aparato (se ve sin internet).
- Puedes ajustar título y autor de la búsqueda; si el título trae el autor ("Autor - Título"), se separan solos.
- Botón "Buscar portadas que faltan (N)" en la biblioteca: va libro por libro, con opción de saltar.
- Las portadas descargadas se pueden quitar desde la misma hoja.

**Biblioteca familiar en Google Drive**
- Las correcciones (título, autor, portada y saga con su número de tomo, en formato Calibre) se escriben dentro de cada EPUB y se guardan en tu carpeta de Drive automáticamente.
- Los libros que agregas de otras fuentes (archivo, iCloud, Gutenberg, Open Library, conversiones) se suben a esa carpeta.
- Cada EPUB lleva una identidad de eLectura, así sagas, citas y avance se conservan aunque el archivo cambie.
- Comparte la carpeta con tu familia (Lector o Editor): al bajar los libros desde Mi nube, su app los recibe corregidos y arma las sagas sola. Si los compartes como Editor, sus correcciones también se guardan en la carpeta.
- Entre tus propios aparatos, título, autor y portada corregidos también se sincronizan.
- Drive conserva versiones anteriores de cada archivo por si una corrección sale mal.

**Medidor de lectura**
- Cuenta solo la lectura activa: el tiempo corre con el libro en pantalla y se pausa si pasan 2 minutos sin cambiar de página o tocar la pantalla.
- Meta diaria por perfil (5, 10, 15, 20 o 30 min) con anillo de avance y aviso al cumplirla. En la biblioteca, el chip "Hoy X de Y min" abre Mi lectura.
- Racha de días con meta cumplida, con 1 día de descanso permitido por semana (lunes a domingo).
- Vistas de semana, mes y año: minutos, páginas, metas cumplidas, libros terminados y mejor racha.
- Proyección de libros al año según tu ritmo de los últimos 28 días.
- Cada día guarda la meta vigente: cambiar la meta no altera días pasados ni la racha.

**Sincronizar entre aparatos**
- Con la misma cuenta de Google, suma los minutos leídos en cel y tablet, y mantiene igual la página donde vas, citas, vocabulario, meta y ajustes.
- Usa la carpeta oculta de la app en tu Google Drive (permiso `drive.appdata`; para escribir en tu carpeta de libros usa el permiso `drive`): no ve ni toca tus otros archivos. Los libros no se suben.
- Cada aparato escribe su propia parte, así que leer en dos aparatos sin internet no duplica ni pierde minutos. Los ajustes, citas y páginas se mezclan por fecha de cambio.
- Se activa por perfil en Ajustes; los perfiles que no la activan nunca se conectan a Google.
- Sincroniza al abrir, cada 5 minutos, al volver a la app y al salir de un libro. Google pide permiso cada hora; la app lo renueva sola al abrir.

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
| `reading.js` | Cálculos del medidor de lectura (racha, series, proyección) |
| `sync.js` | Mezcla de datos entre aparatos para la sincronización |
| `config.js` | Configuración editable (Client ID de Google, carpeta de Drive) |
| `sw.js` | Uso sin internet y actualizaciones |
| `manifest.webmanifest`, `icons/` | Instalación en la pantalla de inicio |

## Limitaciones conocidas

- Los .doc antiguos (Word 97-2003) no se convierten; hay que guardarlos como .docx.
- Libros con DRM (Kindle, préstamos de Open Library) no se pueden abrir.
- En PDF no hay consulta de palabras ni citas (convierte el PDF a EPUB para usarlas) ni cambio real de tamaño de letra (solo zoom).
- Algunos sitios no permiten descargar desde otra página; en ese caso la app abre el sitio para bajar el archivo manualmente.
- La sincronización funciona entre aparatos de la misma cuenta de Google; no permite ver el avance de otras personas.
