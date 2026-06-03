# AutoForms

AutoForms rellena un Google Form usando su link publico de respuesta, por ejemplo:

```text
https://docs.google.com/forms/d/e/1FAIpQL.../viewform
```

El proyecto usa Playwright para abrir Chromium, encontrar las preguntas por titulo, escribir o seleccionar respuestas y, si tu lo confirmas con `--submit`, enviar el formulario.

Usalo solo con formularios propios o con permiso explicito para enviar respuestas.

## Que hace

- Abre un link publico de Google Forms.
- Rellena preguntas configuradas en un archivo JSON.
- Permite probar primero sin enviar.
- Envia solo cuando agregas `--submit`.
- Guarda un historial local para no enviar dos veces la misma configuracion si `once` esta en `true`.

## Requisitos

Necesitas tener instalado:

- Node.js 18 o superior.
- npm.
- Acceso a internet para instalar dependencias y abrir el Form.

Para revisar tu version de Node:

```powershell
node --version
```

Si no tienes Node instalado, descargalo desde:

```text
https://nodejs.org/
```

## Instalacion

Desde la raiz del repositorio:

```powershell
npm install
```

Luego instala el navegador Chromium que usa Playwright:

```powershell
npx playwright install chromium
```

Esto solo se hace una vez por maquina.

## Crear tu configuracion local

No edites directamente el archivo de ejemplo si vas a poner datos reales. Copialo:

```powershell
Copy-Item config\public-forms.example.json config\public-forms.local.json
```

El archivo `config/public-forms.local.json` esta ignorado por Git, asi que puedes poner ahi tus respuestas sin subirlas al repo.

## Configurar un formulario

Abre `config/public-forms.local.json`.

La estructura es:

```json
{
  "forms": [
    {
      "key": "mi_formulario",
      "url": "https://docs.google.com/forms/d/e/1FAIpQL.../viewform?usp=preview",
      "once": true,
      "answers": [
        {
          "title": "Nombre completo",
          "type": "text",
          "value": "Ada Lovelace"
        }
      ]
    }
  ]
}
```

Campos principales:

| Campo | Uso |
| --- | --- |
| `key` | Nombre interno para ejecutar ese Form desde la terminal. |
| `url` | Link publico de respuesta, el que termina en `/viewform`. |
| `once` | Si es `true`, no vuelve a enviar la misma configuracion despues de un envio exitoso. |
| `answers` | Lista de preguntas que quieres rellenar. |

Cada respuesta usa:

| Campo | Uso |
| --- | --- |
| `title` | Titulo visible de la pregunta en Google Forms. |
| `type` | Tipo de pregunta: `text`, `paragraph`, `radio`, `scale`, `checkbox` o `dropdown`. |
| `value` | Respuesta que se escribira o seleccionara. |

El `title` debe coincidir con el texto de la pregunta. No necesita incluir el asterisco de requerido.

## Tipos de pregunta soportados

Por ahora el runner cubre los tipos mas comunes. Preguntas como subir archivos, tablas/cuadriculas, fecha u hora no estan implementadas todavia.

### Texto corto

```json
{
  "title": "Nombre completo",
  "type": "text",
  "value": "Ada Lovelace"
}
```

### Parrafo

```json
{
  "title": "Comentarios",
  "type": "paragraph",
  "value": "Respuesta de prueba"
}
```

### Opcion multiple

```json
{
  "title": "Categoria",
  "type": "radio",
  "value": "General"
}
```

El `value` debe coincidir con una opcion del Form.

### Escala lineal

Para preguntas como `Minimo 1 2 3 4 5 Maximo`:

```json
{
  "title": "Creo que me gustaria utilizar este sistema frecuentemente.",
  "type": "scale",
  "value": "5"
}
```

El `value` debe ser el numero que quieres seleccionar.

### Casillas

Puedes usar una lista:

```json
{
  "title": "Servicios",
  "type": "checkbox",
  "value": ["Diseno", "Soporte"]
}
```

O texto separado por comas:

```json
{
  "title": "Servicios",
  "type": "checkbox",
  "value": "Diseno, Soporte"
}
```

### Lista desplegable

```json
{
  "title": "Pais",
  "type": "dropdown",
  "value": "Costa Rica"
}
```

## Probar sin enviar

Primero ejecuta sin `--submit`:

```powershell
npm run dry-run
```

Esto abre Chromium visible, entra al Form y rellena los campos. No presiona el boton de enviar.

La terminal queda esperando. Cuando termines de revisar la ventana, presiona Enter en la terminal para cerrar Chromium.

Usa esta prueba para revisar:

- Que el link abre correctamente.
- Que los titulos de preguntas coinciden.
- Que las opciones existen.
- Que no falta una pregunta requerida.

## Enviar el formulario

Cuando ya verificaste que se rellena bien, ejecuta:

```powershell
npm run submit
```

Con `--submit`, el script presiona el boton `Enviar` o `Submit`.

Despues de un envio exitoso, guarda un registro en:

```text
data/public-form-submissions.json
```

Ese archivo evita reenviar la misma configuracion cuando `once` esta en `true`.

## Ejecutar en modo invisible

Si ya probaste y quieres que no se abra la ventana del navegador:

```powershell
npm run submit:headless
```

Para la primera prueba recomiendo no usar `--headless`, porque es mejor ver que se rellena bien.

## Evitar envios duplicados

Si `once` esta en `true`, AutoForms calcula una huella usando:

- `key`
- `url`
- `answers`

Si esa misma huella ya fue enviada, no la vuelve a enviar.

Si cambias una respuesta, la huella cambia y se considera una configuracion nueva.

## Repetir una prueba enviada

Si necesitas repetir manualmente una prueba, tienes dos opciones:

1. Cambiar `once` a `false`.
2. Borrar `data/public-form-submissions.json`.

Ten cuidado con esto porque puede duplicar respuestas reales.

## Varios formularios

Puedes agregar varios objetos dentro de `forms`:

```json
{
  "forms": [
    {
      "key": "encuesta_clientes",
      "url": "https://docs.google.com/forms/d/e/FORM_1/viewform",
      "once": true,
      "answers": []
    },
    {
      "key": "registro_evento",
      "url": "https://docs.google.com/forms/d/e/FORM_2/viewform",
      "once": true,
      "answers": []
    }
  ]
}
```

Luego eliges cual correr con `--form`:

```powershell
npm run public-form -- --config config/public-forms.local.json --form registro_evento
```

Si PowerShell o npm se comen las banderas, tambien puedes ejecutar Node directamente:

```powershell
node src/public-form-runner.js config/public-forms.local.json registro_evento
node src/public-form-runner.js config/public-forms.local.json registro_evento --submit
```

## Errores comunes

### No encontre la pregunta

El `title` no coincide con el titulo visible del Form. Copia el texto exacto de la pregunta.

### No encuentra una opcion

En `radio`, `checkbox` o `dropdown`, el `value` debe coincidir con una opcion visible del Form.

### El formulario pide iniciar sesion

Algunos Forms requieren cuenta de Google, restringen dominios o limitan a una respuesta por usuario. En ese caso tendrias que iniciar sesion manualmente en el navegador o pedir acceso al formulario.

### El Form tiene CAPTCHA o protecciones extra

No automatices protecciones anti-abuso. Usa este proyecto solo donde tengas permiso.

## Scripts disponibles

Validar sintaxis:

```powershell
npm run check
```

Rellenar o enviar un Form:

```powershell
npm run dry-run
npm run submit
```
