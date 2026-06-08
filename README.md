# AutoForms

AutoForms es un asistente para rellenar y enviar un **Microsoft Forms** de forma rápida usando Playwright.

Está pensado para casos donde tienes permiso para usar automatización, por ejemplo, un formulario de cupos de la universidad donde el reglamento permite automatizar el proceso.

El programa puede:

- Abrir un enlace de Microsoft Forms.
- Esperar hasta que el formulario acepte respuestas.
- Rellenar los campos que configures.
- Enviar automáticamente si usas el comando de envío.
- Ejecutarse con ventana visible para revisar lo que hace, o en modo invisible si ya lo probaste.

No está hecho para saltarse restricciones, CAPTCHAs, inicios de sesión, permisos o reglas del formulario.

## 1. Requisitos

Necesitas tener instalado:

- **Node.js 18 o superior**
- **npm**
- Internet
- El enlace del Microsoft Forms

Para revisar si tienes Node instalado, abre una terminal y ejecuta:

```powershell
node --version
```

Si aparece algo como `v18`, `v20`, `v22` o superior, estás bien.

Si no aparece nada o da error, instala Node.js desde:

```text
https://nodejs.org/
```

## 2. Abrir la terminal correcta

Abre una terminal en la carpeta del proyecto.

Si usas VS Code:

1. Abre este repositorio.
2. Ve a `Terminal > New Terminal`.
3. Revisa que la terminal diga algo parecido a:

```powershell
C:\Users\sebas\Documents\GitHub\AutoForms>
```

Todos los comandos de esta guía se ejecutan desde esa carpeta.

## 3. Instalar el proyecto

Ejecuta:

```powershell
npm install
```

Luego instala el navegador que usa Playwright:

```powershell
npx playwright install chromium
```

Esto se hace una sola vez por computadora.

## 4. Configurar tus datos

El archivo que debes editar es:

```text
config/microsoft-forms.local.json
```

Ese archivo contiene:

- El enlace del formulario.
- Los campos que se van a rellenar.
- Tus respuestas.

Ejemplo simple:

```json
{
  "forms": [
    {
      "key": "piscina",
      "url": "https://forms.cloud.microsoft/r/3CZBvVq9uL",
      "answers": [
        {
          "title": "Nombre completo",
          "type": "text",
          "value": "TU_NOMBRE_COMPLETO"
        }
      ]
    }
  ]
}
```

## 5. Qué significa cada parte

### `key`

Es el nombre interno del formulario.

Para este proyecto usamos:

```json
"key": "piscina"
```

No necesitas cambiarlo si solo vas a usar este formulario.

### `url`

Es el enlace del Microsoft Forms.

Sirven enlaces como estos:

```text
https://forms.cloud.microsoft/r/XXXXXXXXXX
https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=XXXXXXXXXX
https://forms.office.com/r/XXXXXXXXXX
https://forms.microsoft.com/r/XXXXXXXXXX
```

### `answers`

Es la lista de preguntas que AutoForms debe rellenar.

Cada pregunta tiene:

```json
{
  "title": "Texto de la pregunta",
  "type": "tipo_de_pregunta",
  "value": "respuesta"
}
```

## 6. Cómo copiar bien una pregunta

En `title`, escribe el texto visible de la pregunta.

No tienes que poner el número de pregunta ni el asterisco rojo.

Por ejemplo, si Microsoft Forms muestra:

```text
2. Nombre completo *
```

En el JSON puedes poner:

```json
"title": "Nombre completo"
```

Si la pregunta es muy larga, puedes poner solo una parte suficientemente única:

```json
"title": "El presente formulario consta de diez ítems en total"
```

AutoForms busca una pregunta que contenga ese texto.

## 7. Tipos de preguntas

### Texto corto

Para campos donde escribes texto:

```json
{
  "title": "Nombre completo",
  "type": "text",
  "value": "Sebastián Calvo"
}
```

### Párrafo

Para campos largos:

```json
{
  "title": "Observaciones",
  "type": "paragraph",
  "value": "Sin observaciones"
}
```

### Opción única

Para opciones tipo círculo donde solo puedes escoger una:

```json
{
  "title": "Seleccione la opción que le identifica",
  "type": "radio",
  "value": "Persona Estudiante"
}
```

El `value` debe ser igual al texto de la opción.

### Casillas

Para opciones donde puedes marcar varias:

```json
{
  "title": "Días disponibles",
  "type": "checkbox",
  "value": ["Lunes", "Miércoles"]
}
```

### Desplegable

Para listas desplegables:

```json
{
  "title": "Sede",
  "type": "dropdown",
  "value": "Cartago"
}
```

### Escala

Para escalas numéricas:

```json
{
  "title": "Prioridad",
  "type": "scale",
  "value": "5"
}
```

## 8. Reglas importantes del JSON

El archivo debe ser JSON válido.

Reglas sencillas:

- Usa comillas dobles `"`.
- Cada campo lleva dos puntos `:`.
- Las respuestas van separadas por comas.
- No pongas coma después del último elemento de una lista.
- No borres las llaves `{}` ni los corchetes `[]`.

Correcto:

```json
{
  "title": "Nombre completo",
  "type": "text",
  "value": "Sebastián"
}
```

Incorrecto:

```json
{
  title: Nombre completo,
  type: text,
  value: Sebastian,
}
```

Para revisar si el JSON está bien:

```powershell
node -e "JSON.parse(require('fs').readFileSync('config/microsoft-forms.local.json','utf8')); console.log('JSON OK')"
```

## 9. Probar sin enviar

Antes de usar envío automático, prueba que todo se rellena bien.

Ejecuta:

```powershell
npm run ready
```

Esto hace lo siguiente:

1. Abre Chromium.
2. Abre el formulario.
3. Rellena los campos.
4. No envía.
5. Espera a que revises.

Cuando termines de revisar la ventana, vuelve a la terminal y presiona Enter para cerrar Chromium.

## 10. Enviar si el formulario ya está abierto

Si el formulario ya acepta respuestas y quieres rellenar y enviar:

```powershell
npm run ready-submit
```

Úsalo solo después de confirmar con `npm run ready` que todo se rellena correctamente.

## 11. Esperar a que el formulario abra

Si el formulario todavía no acepta respuestas, usa:

```powershell
npm run wait
```

Esto:

1. Abre el enlace.
2. Revisa si ya aparecen las preguntas.
3. Si no aparecen, espera.
4. Refresca.
5. Repite hasta que el formulario abra.
6. Cuando abre, rellena los campos.
7. No envía automáticamente.

Este modo es bueno para probar el día antes o unos minutos antes.

Si Microsoft Forms muestra primero una pantalla con un botón como `Start survey`, `Start now`, `Begin`, `Comenzar`, `Empezar` o `Iniciar`, AutoForms intenta presionarlo automáticamente antes de buscar las preguntas.

## 12. Esperar y enviar automáticamente

Si ya probaste que todo funciona:

```powershell
npm run wait-submit
```

Esto:

1. Abre el formulario.
2. Refresca hasta que acepte respuestas.
3. Rellena todo.
4. Presiona `Enviar`.

## 13. Modo rápido para el día real

El modo normal revisa cada 1 segundo.

Para revisar más rápido, cada 250 ms:

```powershell
npm run wait-submit:fast
```

Este es el comando recomendado para el momento real si ya hiciste pruebas antes.

Si quieres esperar rápido pero enviar manualmente:

```powershell
npm run wait:fast
```

## 14. Modo invisible

Si no quieres que se vea la ventana del navegador:

```powershell
npm run wait-submit:headless
```

No lo uses en la primera prueba. Primero verifica con ventana visible.

## 15. Usarlo desde iPhone

El iPhone no puede ejecutar Playwright y Chromium como una computadora normal. La forma recomendada es usar el iPhone como **control remoto** y dejar que GitHub Actions ejecute AutoForms en la nube.

Esto permite entrar a GitHub desde Safari o desde la app de GitHub en el iPhone y presionar un botón para correr el bot.

### Qué necesitas

- Tener este repositorio subido a GitHub.
- Tener GitHub Actions habilitado.
- Guardar tu configuración como un secret de GitHub.
- Usar el workflow llamado `Run AutoForms`.

### Paso 1: Subir el repositorio a GitHub

Si todavía no lo subiste, crea un repositorio en GitHub y sube este proyecto.

No subas tus datos personales directamente al repositorio.

El archivo:

```text
config/microsoft-forms.local.json
```

está ignorado por Git para proteger tus datos.

### Paso 2: Crear el secret con tu configuración

En GitHub, abre tu repositorio y ve a:

```text
Settings > Secrets and variables > Actions > New repository secret
```

Crea un secret con este nombre exacto:

```text
MICROSOFT_FORMS_CONFIG_JSON
```

En el valor del secret, pega todo el contenido de:

```text
config/microsoft-forms.local.json
```

Debe verse como un JSON completo, por ejemplo:

```json
{
  "forms": [
    {
      "key": "piscina",
      "url": "https://forms.cloud.microsoft/r/3CZBvVq9uL",
      "answers": []
    }
  ]
}
```

Guarda el secret.

### Paso 3: Ejecutarlo desde el iPhone

Desde el iPhone:

1. Abre GitHub en Safari o en la app de GitHub.
2. Entra a tu repositorio.
3. Ve a `Actions`.
4. Selecciona `Run AutoForms`.
5. Presiona `Run workflow`.
6. Revisa estos valores:

```text
form_key: piscina
poll_ms: 250
timeout_ms: 600000
```

7. Presiona el botón verde para iniciar.

GitHub Actions ejecutará:

```powershell
node src/microsoft-form-runner.js config/microsoft-forms.local.json piscina --wait --submit --headless --poll-ms 250 --timeout-ms 600000
```

### Qué significan esos valores

| Valor | Significado |
| --- | --- |
| `form_key` | El formulario que quieres correr. Normalmente es `piscina`. |
| `poll_ms` | Cada cuánto revisa si el formulario abrió. `250` significa cada 250 ms. |
| `timeout_ms` | Cuánto tiempo espera antes de rendirse. `600000` son 10 minutos. |

### Cuándo iniciarlo

GitHub Actions puede tardar algunos segundos en arrancar.

Para un formulario que abre a las 9:30 a. m., lo recomendable es iniciar el workflow unos minutos antes, por ejemplo:

```text
9:27 a. m. o 9:28 a. m.
```

El workflow se queda esperando hasta que el formulario acepte respuestas.

### Ver si funcionó

En la pantalla del workflow puedes abrir los logs.

Si todo salió bien, verás mensajes similares a:

```text
JSON OK
Formulario disponible después de 3 intento(s).
Formulario enviado.
```

### Limitaciones del modo iPhone/GitHub

Este modo corre en la nube, sin ventana visible.

Funciona mejor si el formulario:

- No requiere iniciar sesión.
- No tiene CAPTCHA.
- No requiere interacción manual.
- Usa preguntas y opciones configuradas correctamente.

Si el formulario requiere iniciar sesión institucional, GitHub Actions no podrá iniciar sesión por ti. En ese caso es mejor usar la computadora con:

```powershell
npm run wait-submit:fast
```

## 16. Orden recomendado para usarlo

### La primera vez

1. Instala dependencias:

```powershell
npm install
npx playwright install chromium
```

2. Edita tus datos en:

```text
config/microsoft-forms.local.json
```

3. Valida el proyecto:

```powershell
npm run check
```

4. Prueba sin enviar:

```powershell
npm run ready
```

### El día del formulario

1. Abre VS Code.
2. Abre la terminal en el proyecto.
3. Unos minutos antes de la hora, ejecuta:

```powershell
npm run wait-submit:fast
```

### Desde iPhone

1. Entra a GitHub.
2. Ve a `Actions`.
3. Abre `Run AutoForms`.
4. Presiona `Run workflow`.
5. Usa `poll_ms` en `250`.
6. Usa `timeout_ms` en `600000`.

## 17. Si el formulario pide iniciar sesión

Algunos Microsoft Forms piden cuenta institucional.

Si pasa eso:

1. Ejecuta `npm run wait` o `npm run wait-submit:fast`.
2. Cuando se abra Chromium, inicia sesión manualmente.
3. Deja la ventana abierta.
4. El script seguirá esperando/refrescando en esa misma sesión.

No intentes saltarte el inicio de sesión.

## 18. Si algo falla

### Dice `No encontré la pregunta`

El texto de `title` no coincide.

Solución:

- Abre el formulario.
- Copia una parte única del texto de la pregunta.
- Pégala en `title`.

### No selecciona una opción

El texto de `value` no coincide con la opción visible.

Solución:

- Copia el texto exacto de la opción.
- Pégalo en `value`.

### El formulario no abre todavía

Usa:

```powershell
npm run wait
```

o:

```powershell
npm run wait-submit:fast
```

### `npm install` falla

Revisa que tengas internet y Node instalado.

También puedes revisar:

```powershell
node --version
npm --version
```

### Chromium no abre

Ejecuta otra vez:

```powershell
npx playwright install chromium
```

### En GitHub Actions dice `Missing secret`

No creaste el secret o el nombre está mal escrito.

El nombre debe ser exactamente:

```text
MICROSOFT_FORMS_CONFIG_JSON
```

### En GitHub Actions dice `JSON OK`, pero luego falla

El JSON está bien escrito, pero puede haber un problema con:

- El texto de una pregunta.
- El texto de una opción.
- El formulario todavía no está disponible.
- El formulario pide iniciar sesión.

## 19. Comandos disponibles

| Comando | Qué hace |
| --- | --- |
| `npm run check` | Revisa que el código tenga sintaxis válida. |
| `npm run ready` | Rellena el formulario si ya está abierto, sin enviar. |
| `npm run ready-submit` | Rellena y envía si ya está abierto. |
| `npm run wait` | Espera a que abra, rellena y deja envío manual. |
| `npm run wait:fast` | Igual que `wait`, pero revisa cada 250 ms. |
| `npm run wait-submit` | Espera a que abra, rellena y envía. |
| `npm run wait-submit:fast` | Igual que `wait-submit`, pero revisa cada 250 ms. |
| `npm run wait-submit:headless` | Espera, rellena y envía sin mostrar navegador. |

## 20. Comando avanzado

También puedes llamar el script directamente:

```powershell
node src/microsoft-form-runner.js config/microsoft-forms.local.json piscina --wait --submit --poll-ms 250
```

Opciones:

| Opción | Qué hace |
| --- | --- |
| `--wait` | Espera/refresca hasta que el formulario acepte respuestas. |
| `--submit` | Presiona `Enviar` después de rellenar. |
| `--poll-ms 250` | Cambia cada cuánto revisa si ya abrió. |
| `--timeout-ms 600000` | Tiempo máximo de espera en milisegundos. |
| `--headless` | Ejecuta sin ventana visible. |

## 21. Seguridad y buen uso

Usa AutoForms solo si:

- Tienes permiso para responder el formulario.
- El reglamento permite automatizaciones.
- No estás intentando saltarte restricciones técnicas.
- Tus datos en `microsoft-forms.local.json` son correctos.

Antes de usar envío automático, haz siempre una prueba con:

```powershell
npm run ready
```
