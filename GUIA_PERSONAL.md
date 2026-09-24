# Guía personal: eLectura

Cómo publicarlo, instalarlo, configurar Google Drive, probarlo y actualizarlo.

---

## 1. Qué archivos subes

```
index.html
app.js
services.js
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
6. Copia el **Client ID** (termina en `.apps.googleusercontent.com`).
7. En GitHub, abre `config.js` → ícono de lápiz → pégalo en `GOOGLE_CLIENT_ID: "..."` → commit.
8. En tu Google Drive crea una carpeta llamada **Libros** y sube ahí tus EPUB y PDF.

Al conectar por primera vez, Google mostrará un aviso de "app no verificada". Es normal porque es tu app en modo prueba: **Avanzado → Ir a eLectura**. El permiso es de **solo lectura**: la app nunca modifica tus archivos. La sesión dura alrededor de una hora; después pide conectar de nuevo.

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
- **Error de origen al conectar Google**: revisa que el origen autorizado sea exactamente `https://TU-USUARIO.github.io`.
