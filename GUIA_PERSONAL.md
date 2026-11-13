# Guía personal: eLectura

Cómo publicarlo, instalarlo, configurar Google Drive, probarlo y actualizarlo.

---

## 1. Qué archivos subes

```
index.html
app.js
services.js
converter.js
reading.js
sync.js
config.js
sw.js
manifest.webmanifest
icons/  (4 imágenes)
README.md
```

`GUIA_PERSONAL.md` es para ti; puedes subirlo o no.

## 2. Publicar en GitHub Pages

1. En GitHub, crea un repositorio nuevo, por ejemplo `electura` (público).
2. Botón **Add file → Upload files**. Arrastra todos los archivos y la carpeta `icons` completa.
3. Mensaje del commit: `v1.0.0 primera versión`. **Commit changes**.
4. **Settings → Pages → Build and deployment**: Source = *Deploy from a branch*, Branch = `main`, carpeta `/ (root)`. **Save**.
5. Espera 1 o 2 minutos. Tu app queda en `https://TU-USUARIO.github.io/electura/`.

## 3. Instalar en el celular

**iPhone (importante hacerlo así):**
1. Abre la dirección en **Safari**.
2. Botón Compartir → **Agregar a pantalla de inicio**.
3. Abre la app siempre desde ese ícono. Así iOS trata a los libros como datos de una app instalada y no los borra por inactividad.

**Android:** abre en Chrome → menú ⋮ → **Instalar app**.

Cada persona de la familia instala en su propio celular y crea su perfil. En una tablet compartida, cada quien crea su perfil en la misma app.

## 4. Primer uso

1. Escribe tu nombre para crear tu perfil.
2. **Buscar libros → Project Gutenberg**, busca `austen`, idioma Inglés, **Guardar**.
3. Abre el libro, toca **Aa** y prueba los modos, la atenuación y la calidez.
4. Mantén presionada una palabra en inglés → **Significado** o **Traducción**.

## 5. Configurar Google Drive (una sola vez)

iCloud funciona sin configurar nada. Google Drive necesita un permiso de Google:

1. Entra a <https://console.cloud.google.com> con tu cuenta de Google.
2. Crea un proyecto nuevo: `eLectura`.
3. Busca **Google Drive API** en la biblioteca de APIs y actívala.
4. Configura la **pantalla de consentimiento de OAuth** (en la consola nueva aparece como *Google Auth Platform*):
   - Tipo de usuario: **Externo**.
   - Nombre de la app: `eLectura`, y tu correo de soporte.
   - En **Usuarios de prueba** (Audience / Test users) agrega los correos Gmail de cada persona de la familia que usará Drive.
   - Déjala en modo **Prueba (Testing)**. No hace falta publicarla ni verificarla para uso familiar.
5. En **Credenciales / Clients**, crea un **ID de cliente de OAuth** tipo **Aplicación web**:
   - **Orígenes de JavaScript autorizados**: `https://TU-USUARIO.github.io` (sin la carpeta y sin `/` al final).
   - **URIs de redireccionamiento autorizados**: la dirección completa de la app **con** `/` al final, respetando mayúsculas, por ejemplo `https://TU-USUARIO.github.io/eLectura/`. La app te muestra la dirección exacta debajo del botón **Conectar Google Drive**; cópiala de ahí.
6. Copia el **Client ID** (termina en `.apps.googleusercontent.com`).
7. En GitHub, abre `config.js` → ícono de lápiz → pégalo en `GOOGLE_CLIENT_ID: "..."` → commit.
8. En tu Google Drive crea una carpeta llamada **Libros** y sube ahí tus EPUB y PDF.

Al tocar **Conectar Google Drive**, la app se va a la página de Google y regresa sola a tu carpeta. Al conectar por primera vez, Google mostrará un aviso de "app no verificada". Es normal porque es tu app en modo prueba: **Avanzado → Ir a eLectura**. El permiso es de **solo lectura**: la app nunca modifica tus archivos. La sesión dura alrededor de una hora; después pide conectar de nuevo.

> **Ojo con las comillas:** en `config.js` cada valor de texto va entre comillas dobles, por ejemplo `DRIVE_FOLDER: "eBooks",`. Sin comillas el archivo no se puede leer.

## 5b. Sincronizar tu cel y tu tablet

1. En **cada aparato**, crea tu perfil con **el mismo nombre** (por ejemplo, Miguel).
2. Ajustes → **Sincronizar entre aparatos** → **Activar**. Google pedirá permiso (incluye "ver y administrar sus propios datos de configuración en tu Google Drive": es la carpeta oculta de la app).
3. Listo: al abrir la app, cada 5 minutos y al salir de un libro, se suman los minutos y se igualan página, citas, vocabulario, meta y ajustes.
4. Opcional, en Google Cloud → *Google Auth Platform* → *Acceso a datos*: agrega el permiso `.../auth/drive.appdata` junto a `drive.readonly`. En modo prueba funciona aunque no lo agregues.

Tus hijas no necesitan activarlo: si no lo activan, su app nunca se conecta a Google.

## 6. Pruebas de la v1

Hazlas en al menos un iPhone y un Android.

| # | Prueba | Qué debe pasar |
|---|---|---|
| 1 | Instalar desde pantalla de inicio | Abre sin barra del navegador y respeta el notch |
| 2 | Crear dos perfiles | Cada uno ve su propia biblioteca |
| 3 | Guardar un libro de Gutenberg | Aparece con portada en la biblioteca |
| 4 | Buscar en Open Library (`sherlock holmes`) | Los de dominio público se guardan; los de préstamo dicen "Solo préstamo en el sitio" |
| 5 | Abrir un EPUB desde iCloud | Se guarda y abre |
| 6 | Bajar un libro desde Google Drive | Pasa a "En tu cel" |
| 7 | Modos Día, Tarde, Noche y Auto | Cambian al instante; Auto respeta el horario |
| 8 | Atenuación al máximo en Noche, cuarto oscuro | Se lee cómodo; no se va a negro |
| 9 | Páginas y Scroll | Ambos avanzan; deslizar cambia de página |
| 10 | Cerrar la app y reabrir el libro | Retoma en la misma página |
| 11 | Modo avión y abrir un libro guardado | Se lee sin internet |
| 12 | Modo avión y consultar una palabra | Muestra el aviso de sin conexión |
| 13 | Consultar y guardar 3 palabras | Aparecen en Ajustes → Mi vocabulario con su frase |
| 14 | PDF de más de 20 MB | Abre y el scroll es fluido |
| 15 | Quitar un libro del cel y volver a abrirlo desde la nube | Retoma donde ibas |
| 16 | Respaldar y restaurar | El JSON restaura progreso y vocabulario |
| 17 | Agregar una fuente como Enlace | Aparece como pestaña y abre el sitio |
| 18 | Abrir un Word (.docx) con títulos e imágenes | Ofrece convertir; el EPUB respeta capítulos e imágenes |
| 19 | Abrir un PDF de novela → Convertir → Sí, borrar | Queda solo el EPUB, con párrafos bien armados |
| 20 | Menú ⋯ de un PDF → Convertir → Conservar ambos | Quedan el PDF y el EPUB |
| 21 | PDF escaneado → Convertir | Avisa que no se puede y ofrece abrirlo como PDF |
| 22 | Descargar EPUB en iPhone | Abre el menú para Guardar en Archivos |
| 23 | Consultar una palabra en un EPUB convertido | Funciona igual que en cualquier EPUB |
| 24 | Seleccionar una frase → elegir un color | Queda sombreada y aparece "Cita guardada" |
| 25 | Cambiar a Subrayar y a otro color | La marca cambia al instante |
| 26 | + Nota → escribir → Guardar | La nota aparece en Mis citas |
| 27 | Cerrar la app, reabrir el libro | Las marcas siguen pintadas |
| 28 | Ajustes → Mis citas → tocar una cita | Abre el libro en esa página |
| 29 | Tocar un pasaje marcado → Borrar | La marca desaparece y sale de Mis citas |
| 30 | Marcar en modo Noche | El color se ve sin tapar el texto |
| 31 | Avanzar varias páginas, cerrar la app desde el selector de apps y reabrir | Abre en la misma página y el encabezado dice la misma "Pág. X de Y" |
| 32 | Leer 10 min pasando páginas | Aparece "¡Meta de hoy cumplida!" y el chip de la biblioteca cambia |
| 33 | Dejar el libro abierto 5 min sin tocar | Solo suman ~2 min |
| 34 | Mi lectura → Semana, Mes, Año | Barras, minutos, páginas y proyección correctos |
| 35 | Un día sin leer en la semana | La racha se conserva (usa el descanso) |
| 36 | Dos días sin leer en la misma semana | La racha se reinicia |
| 37 | Cada hija con su perfil en su cel, meta de 10 min | Cada una ve su propio avance |
| 38 | Cel y tablet con el mismo perfil → Activar en ambos | En Ajustes aparecen los dos aparatos con sus minutos de hoy |
| 39 | Leer 5 min en el cel y 5 en la tablet | Los dos muestran "Meta de hoy cumplida" (10 min) |
| 40 | Avanzar en la tablet, luego abrir el mismo libro en el cel | El cel abre donde te quedaste en la tablet |
| 41 | Marcar una cita en el cel → Sincronizar ahora en la tablet | La cita aparece en Mis citas de la tablet |
| 42 | Cambiar la meta en la tablet | El cel toma la nueva meta |
| 43 | Leer sin internet en ambos y luego conectar | Se suman los minutos de los dos, sin duplicar |
| 44 | En el iPhone: Buscar libros | "Mi nube" se ve primero, sin deslizar |
| 45 | Tener 2 o más libros de una misma saga | Aparece "Encontré N sagas" → Revisar → Crear carpeta |
| 46 | Abrir la carpeta y arrastrar un libro con ≡ | Cambia el orden y se conserva al cerrar la app |
| 47 | Menú ⋯ de un libro → Mover a una saga → nueva | Se crea la carpeta con ese libro |
| 48 | Terminar un libro de la saga | Ofrece "Empezar el libro N" |
| 49 | Carpeta → ⋯ → Elegir portada | La pila muestra esa portada |
| 50 | Carpeta → ⋯ → Deshacer saga | Los libros vuelven sueltos, sin borrarse |

Anota lo que falle con el número de prueba y el modelo de celular.

## 7. Cómo actualizar la app

1. Edita o reemplaza los archivos en GitHub (lápiz o **Upload files**).
2. **Siempre** abre `sw.js` y sube la versión: `electura-v1.0.0` → `electura-v1.0.1`. Si no la cambias, algunos celulares siguen mostrando la versión vieja.
3. Si quieres, sube también `APP_VERSION` al inicio de `app.js` (se ve al final de Ajustes).
4. Commit con un mensaje claro, por ejemplo `v1.0.1 corrige scroll en PDF`.
5. En el celular, cierra la app por completo y ábrela; se actualiza sola.

Tus libros, perfiles y vocabulario **no se borran** al actualizar.

## 8. Respaldo

Ajustes → Almacenamiento → **Respaldar progreso** genera un `.json`. Guárdalo en iCloud o Drive. Si cambias de celular, instala la app, **Restaurar respaldo** y vuelve a bajar tus libros desde la nube: retomas cada uno donde ibas.

## 9. Si algo falla

- **La pantalla se queda en "Cargando…"**: revisa conexión la primera vez (las librerías se descargan una vez y luego quedan guardadas).
- **"Este sitio no permite descargar desde la app"**: descarga el archivo en el navegador y usa **Abrir archivo**.
- **Google Drive dice que no encuentra la carpeta**: el nombre debe ser exactamente `Libros` (o cámbialo en `config.js` → `DRIVE_FOLDER`).
- **Google dice `redirect_uri_mismatch`**: la dirección de regreso registrada no coincide. Copia la que muestra la app bajo el botón Conectar y pégala tal cual en *URIs de redireccionamiento autorizados* (con `/` al final y las mismas mayúsculas). Los cambios en Google tardan unos minutos.
- **Google dice `access_denied` o "Acceso bloqueado"**: agrega ese Gmail en *Usuarios de prueba*.
- **La app se ve distinta a lo esperado o le faltan botones** (por ejemplo, la barra de citas sin diseño): el cel quedó con una mezcla de versiones. Desde la 1.2.1 la app lo detecta y se recarga sola; si no, ve a Ajustes → **Buscar actualización** (al final).
- **La app no abre sin internet**: ábrela una vez con buena señal después de cada actualización; así guarda todo en el cel. Desde la versión 1.0.2 abre al instante aunque no haya señal.
