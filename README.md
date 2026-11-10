# Sitio inmobiliario con Mapaprop Express API

Un sitio web completo —inicio, buscador, fichas, emprendimientos, contacto y captación de
propietarios— que lee tu cartera directamente de tu cuenta de Mapaprop. Es HTML y JavaScript, sin
framework y sin paso de compilación: lo abrís, lo editás y se ve el cambio.

No mantenés dos inventarios. Cargás la propiedad una vez en Mapaprop y el sitio la toma de ahí: las
fotos, el precio, los metros, las características y el estado. Si la vendés, el sitio lo refleja.

---

## Verlo andando en un minuto, sin cuenta y sin token

```bash
git clone https://github.com/Mapaprop/mapaprop-express-starter
cd mapaprop-express-starter
npm run dev:mock                  # http://localhost:3000
```

No hace falta nada más: no hay dependencias que instalar, no hay backend que levantar y no hace
falta un token. El sitio corre contra las **fixtures** de `fixtures/`, que son respuestas reales de
la API anonimizadas. Es la forma de mirarlo, de trabajar sobre el diseño y de mandar un cambio sin
ser cliente de Mapaprop.

Los formularios en modo mock **no envían nada a ningún lado**. El detalle de qué emula y qué no está
en [`fixtures/README.md`](fixtures/README.md).

---

## Qué necesitás antes de empezar

1. **Una cuenta de Mapaprop con plan Pro+, Business o Business Manager.** Son los planes que
   incluyen la API.
2. **El API Token activado.** Entrá a **Configuración → Token de API**, activalo y copialo con el
   botón de copiar. Es una sola vez.
3. **Un lugar donde publicarlo.** Mirá la sección de abajo: hay varias opciones y conviene elegir
   con la información completa.

No necesitás activar el scope `cors`: el sitio le habla a la API desde el servidor, no desde el
navegador.

---

## Dónde publicarlo

El sitio son archivos estáticos **más una función de servidor** —la que guarda el token y nunca se lo
muestra al navegador—. Así que no alcanza un hosting de archivos sueltos: hace falta un lugar que
ejecute esa función.

### Vercel — el camino más corto

Funciona tal cual, sin tocar nada.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FMapaprop%2Fmapaprop-express-starter&env=MAPAPROP_API_TOKEN&envDescription=El%20API%20Token%20de%20tu%20cuenta%20de%20Mapaprop%20(Configuraci%C3%B3n%20%3E%20Token%20de%20API))

Vercel te pide el token durante el proceso y lo guarda como variable de entorno. Desde la terminal:

```bash
git clone https://github.com/Mapaprop/mapaprop-express-starter.git
cd mapaprop-express-starter
npx vercel
npx vercel env add MAPAPROP_API_TOKEN      # pegá el token cuando lo pida
npx vercel --prod
```

Si ya está publicado y querés cargar o cambiar el token: **Vercel → tu proyecto → Settings →
Environment Variables**, nombre `MAPAPROP_API_TOKEN`, valor el token. Después, un redeploy para que
lo tome.

> ⚠️ **El plan gratuito de Vercel (Hobby) es sólo para uso personal no comercial.** Vercel define
> como uso comercial, entre otros casos, *"publicitar la venta de un producto o servicio"* — y el
> sitio de una inmobiliaria entra ahí, así que corresponde el plan **Pro**. Lo dice en sus
> [pautas de uso](https://vercel.com/docs/limits/fair-use-guidelines), y la consecuencia que declara
> para quien lo incumple es pausar el deploy. Lo aclaramos acá para que no te enteres con el sitio
> caído.

### Tu propio servidor

También funciona tal cual. Es un servidor Node sin dependencias: lo levantás detrás de nginx o
Apache como cualquier otra aplicación.

```bash
MAPAPROP_API_TOKEN=tu-token PORT=3000 node dev-local.mjs
```

### Otras plataformas

**Netlify**, **Cloudflare Pages**, **AWS** y las demás también sirven, pero cada una tiene su propia
forma de declarar una función, así que hay que adaptar el envoltorio de `api/mp/[...path].js` a la
firma que pide la plataforma. La lógica no cambia: son unas veinte líneas alrededor.

Y antes de elegir, **revisá los términos del plan**: cada plataforma define distinto qué considera
uso comercial.

---

## Probarlo en tu máquina

```bash
npm run dev:mock                  # con fixtures: sin token y sin backend
cp .env.example .env.local        # y pegá tu token adentro
npm run dev                       # contra la API de verdad, http://localhost:3000
npm test                          # la suite, sin dependencias
```

> No alcanza con abrir `public/index.html` haciendo doble clic: el sitio necesita la función que
> agrega el token, y esa la levanta `npm run dev` (o `npm run dev:mock`).

---

## 🔴 Por qué el token no está en el JavaScript

Es la decisión de arquitectura más importante del proyecto y vale entenderla antes de cambiarla.

Tu cuenta tiene **un solo API Token**, y ese token lleva **todos los permisos que te da tu plan**. Si
tenés contratado el adicional **Property API**, el mismo token también puede **crear propiedades y
publicarlas en los portales**. Y **no vence nunca**.

Si lo pusiéramos en el JavaScript del sitio, cualquier visitante podría leerlo desde las
herramientas de desarrollo del navegador y quedarse con una credencial permanente de tu cuenta.

Por eso el token vive en una variable de entorno del servidor, y el navegador le habla a
`api/mp/[...path].js`, una función que corre del lado del servidor y es la única que lo conoce. Esa
función además:

- **sólo deja pasar las acciones que el sitio usa** (hay una lista explícita adentro). Esto no es
  prolijidad: sin esa lista, una ruta armada a mano podría llegar a otra API con tu token;
- **completa la IP, el navegador y el referer** de cada consulta, tres datos que el endpoint de
  consultas necesita y que el navegador no puede saber de sí mismo;
- **cachea los catálogos** para no gastar llamadas de más.

Si vas a sumar un endpoint nuevo, agregá su fila en la lista `ROUTES` de esa función.

---

## 🔴 Las consultas vuelven a tu CRM (y por qué importa)

El formulario de cada **ficha de propiedad** postea a `POST express-v1/messages`. Eso significa que
la consulta **entra a tu Inbox de Mapaprop como un lead**, igual que si hubiera llegado por tu sitio:
la asignás a un asesor, le hacés seguimiento, queda en tus reportes y dispara tus automatizaciones.

Si cambiás ese formulario por uno que te mande un email y nada más, el círculo se corta: seguís
cargando las propiedades en Mapaprop, pero atendés a los clientes afuera y la consulta no existe
para tu CRM. Es la mitad del sistema que ya estás pagando.

### La limitación honesta: la consulta genérica no tiene endpoint

`POST messages` **exige** el identificador de una propiedad publicada, así que una consulta que no
es sobre ninguna propiedad **no puede entrar al CRM por la API**. Por eso la página de contacto de
este sitio:

- muestra tus sucursales con teléfono, email y WhatsApp,
- empuja al visitante hacia las fichas, donde la consulta sí entra al CRM,
- y su formulario abre el programa de correo del visitante con el mensaje armado.

Lo que **sí** entra al CRM sin una propiedad de por medio es el formulario de **"Quiero vender o
alquilar"** (`seller-submissions`): crea un contacto en tu CRM y te manda un email con los adjuntos.

---

## Personalizarlo

### Los colores y el logo salen de tu cuenta

El sitio pide `GET express-v1/design` y toma de ahí **los colores, la tipografía, el logo, el
favicon, las imágenes del carrusel, los bloques de llamado a la acción, el responsable del pie y
tus redes sociales** — lo que ya configuraste en **Sitio Web → Diseño**. No hay que copiar nada.

**Si tu cuenta no tiene un sitio web activo de Mapaprop**, ese endpoint responde con un error y el
sitio usa lo que haya en `public/js/config.js`. Editá ese archivo con tu nombre, tus colores y tu
logo. Todo lo demás —propiedades, catálogos, sucursales, consultas— funciona igual, porque el
inventario no depende de tener un sitio.

| Qué querés cambiar | Dónde |
| --- | --- |
| Nombre, colores, logo y textos de respaldo | `public/js/config.js` |
| Estilos (tipografías, espaciados, tarjetas) | `public/css/style.css` |
| Los links del menú y el pie | `public/js/layout.js` |
| Cómo se ve una tarjeta de propiedad | la función `card()` en `public/js/ui.js` |
| Qué muestra la ficha | `public/js/ficha.js` |
| Los filtros del buscador | `public/propiedades.html` y `public/js/listado.js` |

### Agregar una página

Copiá cualquier `.html` de `public/`, cambiale el contenido y agregá el link en `LINKS`, dentro de
`public/js/layout.js`.

---

## Los idiomas

Los textos del kit están en `public/js/i18n.js`, en **español, inglés y portugués**. No hay paso de
compilación: es un objeto y una función `t()`.

### El selector del header

El kit trae un selector **ES · EN · PT** arriba a la derecha. Lo que ofrece sale de `config.js`:

```js
languages: ['es', 'en', 'pt'],   // dejá uno solo (o ninguno) y el selector desaparece
```

La elección del visitante queda en su navegador (`localStorage`) y el link `?lang=en` abre la página
directo en ese idioma — sirve para compartir y es lo que hace que el selector funcione igual en una
ventana privada. Un código que no esté en `languages` se ignora, así que un link ajeno no puede
poner tu sitio en un idioma que no ofrecés.

⚠️ **Decidilo mirando tu catálogo.** El selector traduce lo que escribe el kit: menú, botones,
etiquetas, filtros. Lo que manda la API —el tipo, la operación, las características, las zonas y la
descripción— **viene en el idioma en que vos cargaste la cuenta y no se traduce**. Una página en
inglés sobre un catálogo cargado en castellano muestra `VENTA · DEPARTAMENTO`: es correcto y se ve
mezclado. A una inmobiliaria que le vende a extranjeros le conviene igual; a una que no, dejale un
solo idioma.

### Sin selector

Con un solo idioma configurado, sale del contexto en este orden:

1. `lang` en `public/js/config.js`, si lo pusiste.
2. El atributo `lang` del `<html>` de cada página.
3. Español.

```html
<html lang="en">     <!-- esta página sale en inglés -->
```

En los dos casos el kit deja el `<html lang>` sincronizado con el idioma que realmente escribió: si
quedara en `es`, le mentiría al lector de pantalla, al traductor del navegador y al buscador.

Una clave que falte en inglés o portugués **cae a español**. Es una degradación que se ve y no
rompe nada, así que podés sumar un idioma de a poco.

🔴 **Lo que el kit NO traduce, a propósito**: el tipo de propiedad, la operación, las características
y los nombres de zona **vienen de la API ya en el idioma de tu cuenta**. Traducirlos acá sería
sobrescribir tu propio vocabulario.

Y la moneda **nunca** sale del idioma: sale de cada propiedad (`currency`). Lo único que sigue al
idioma es cómo se agrupan los miles, y lo podés forzar con `numberLocale` en `config.js` —un sitio
en español de España agrupa distinto que uno de Argentina—.

Si traducís a un idioma nuevo: agregá su mapa en `i18n.js` con **las mismas claves** y corré
`npm test`. La suite falla si a un idioma le falta una clave, si una traducción perdió una variable
`{...}`, o si el texto de una página dejó de coincidir con el diccionario.

---

## Cómo está armado

```
.
├── api/mp/[...path].js    la función que agrega el token y filtra las acciones permitidas
├── dev-local.mjs          servidor Node que despacha a esa misma función
├── fixtures/              respuestas reales anonimizadas + el servidor del modo mock
├── public/
│   ├── index.html         inicio: carrusel, buscador, emprendimientos, destacadas, zonas, sucursales
│   ├── propiedades.html   listado con filtros y paginado
│   ├── propiedad.html     ficha: galería, planos, videos, mapa y el formulario de consulta
│   ├── emprendimientos.html
│   ├── contacto.html
│   ├── vender.html        captación de propietarios, con adjuntos
│   ├── css/style.css
│   ├── img/               fotos e ilustraciones de ejemplo (sin texto: una imagen no se traduce)
│   └── js/
│       ├── config.js      tus datos de respaldo (lo primero que vas a editar)
│       ├── i18n.js        los textos en es / en / pt, y el selector de idioma
│       ├── api.js         el cliente que le habla a la función
│       ├── ui.js          helpers de render: precios, fotos, características, paginado
│       ├── brand.js       aplica el diseño de tu cuenta
│       ├── layout.js      menú y pie compartidos
│       └── …              un archivo por página
├── tests/                 77 tests, sin dependencias
├── LICENSE
├── SECURITY.md
├── vercel.json
└── package.json
```

---

## Cosas que conviene saber

| | |
| --- | --- |
| **20 propiedades por pedido** | Es el tope de la API. El listado pagina solo; no lo subas a 21, devuelve un error de validación. |
| **El 0 significa "no lo cargué"** | En varios campos opcionales (toilettes, pisos, expensas, impuestos) la API devuelve `0` cuando la inmobiliaria no informó el dato. El sitio los oculta en vez de mostrar "0 baños". |
| **Un precio en 0 o en 1 es "Consultar precio"** | No es un error de carga: es la forma de pedir que te contacten. El sitio lo muestra así. |
| **Los borradores no se publican** | La API devuelve sólo propiedades publicadas. |
| **Las vendidas y alquiladas sí vienen** | Con su estado, y el sitio las muestra con su etiqueta. Si no las querés mostrar, filtralas en `listado.js`. |
| **El token no vence** | Pero si lo regenerás, el anterior deja de funcionar al instante: actualizá la variable de entorno y volvé a desplegar. |
| **Si das de baja el plan** | El token se desactiva y el sitio deja de traer propiedades. |
| **Adjuntos de "Vender"** | 2 MB por archivo, 10 envíos por hora. Lo impone la API. |
| **"Vender" necesita un sitio atado al token** | Si te da un aviso, atalo en **Configuración → Token de API**, tarjeta **Función Sitio Web**. |

---

## Documentación

- [Primeros pasos con la API](https://help.mapaprop.com/es/api/getting-started)
- [Express API: las 21 acciones](https://help.mapaprop.com/es/api/express-api)
- [Constantes (tipos, operaciones, estados)](https://help.mapaprop.com/es/api/getting-started/constants)

¿Dudas o algo que no funciona? Escribinos a [info@mapaprop.com](mailto:info@mapaprop.com).

---

## Licencia

MIT. Usalo, cambialo y publicalo como quieras.
