# Razer Back to School

Sitio de la campaña Razer con el minijuego Neon Invaders, una sección de patrocinadores y un formulario de registro que guarda los datos en Google Sheets y muestra un cupón al confirmar el envío.

## Abrir el sitio localmente

Ejecuta este comando desde la raíz del repositorio con Python 3.

```powershell
python -m http.server 8000 --bind 127.0.0.1 --directory dist
```

Abre [la vista local](http://127.0.0.1:8000/). La carpeta `dist` está lista para servirse directamente.

## Archivos principales

| Archivo o carpeta | Contenido |
| --- | --- |
| [`dist/index.html`](dist/index.html) | Entrada del sitio. |
| [`dist/assets/`](dist/assets/) | JavaScript y estilos compilados, imágenes y logos de la campaña. |
| [`dist/neon-invaders.html`](dist/neon-invaders.html) | Juego integrado en la página. |
| [`apps-script/Code.gs`](apps-script/Code.gs) | Aplicación web que recibe el formulario y agrega los registros a Google Sheets. |

## Registro en Google Sheets

El formulario envía nombre, celular, correo y producto de interés a una aplicación web de Google Apps Script. Los envíos desde la vista local también llegan al destino configurado, así que usa datos ficticios e identificables si necesitas hacer una prueba.

Para cambiar la hoja, revisa `SPREADSHEET_ID` y `SHEET_ID` en [`Code.gs`](apps-script/Code.gs). Implementa el script con una cuenta que pueda editar la hoja. Si la implementación genera otra URL `/exec`, actualízala en [el JavaScript del sitio](dist/assets/index-iEA-EcY5.js) y verifica que un envío de prueba agregue una fila.

## Publicar en Netlify

Para un despliegue manual, arrastra la carpeta `dist` a la zona de despliegue del proyecto en Netlify. Si conectas este repositorio a Netlify, configura `dist` como directorio de publicación y deja vacío el comando de compilación.
