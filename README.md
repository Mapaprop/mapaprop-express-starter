# Sitio inmobiliario con Mapaprop Express API

Un sitio web completo —inicio, buscador, fichas, emprendimientos, contacto y captación de
propietarios— que lee tu cartera directamente de tu cuenta de Mapaprop y se publica en Vercel en
unos minutos. Es HTML y JavaScript, sin framework y sin paso de compilación: lo abrís, lo editás y
se ve el cambio.

No mantenés dos inventarios. Cargás la propiedad una vez en Mapaprop y el sitio la toma de ahí: las
fotos, el precio, los metros, las características y el estado. Si la vendés, el sitio lo refleja.

---

## Qué necesitás antes de empezar

1. **Una cuenta de Mapaprop con plan Pro+, Business o Business Manager.** Son los planes que
   incluyen la API.
2. **El API Token activado.** Entrá a **Configuración → Token de API**, activalo y copialo con el
   botón de copiar. Es una sola vez.
3. **Una cuenta de Vercel** (el plan gratuito alcanza) y una de GitHub.

No necesitás activar el scope `cors`: el sitio le habla a la API desde el servidor, no desde el
navegador.

---

## Publicarlo en Vercel

### Opción A — con el botón

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FTU-USUARIO%2Fmapaprop-express-starter&env=MAPAPROP_API_TOKEN&envDescription=El%20API%20Token%20de%20tu%20cuenta%20de%20Mapaprop%20(Configuraci%C3%B3n%20%3E%20Token%20de%20API))

Vercel te pide el token durante el proceso y lo guarda como variable de entorno.

### Opción B — desde la terminal

```bash
git clone https://github.com/TU-USUARIO/mapaprop-express-starter.git
cd mapaprop-express-starter
npx vercel
npx vercel env add MAPAPROP_API_TOKEN      # pegá el token cuando lo pida
npx vercel --prod
```

### Si ya lo tenés publicado y querés cargar el token

**Vercel → tu proyecto → Settings → Environment Variables**, nombre `MAPAPROP_API_TOKEN`, valor el
token. Después hacé un redeploy para que lo tome.

---

## Probarlo en tu máquina

```bash
cp .env.example .env.local        # y pegá tu token adentro
npx vercel dev                    # queda en http://localhost:3000
```

> No alcanza con abrir `public/index.html` haciendo doble clic: el sitio necesita la función que
> agrega el token, y esa la levanta `vercel dev`.

---

## 🔴 Por qué el token no está en el JavaScript

Es la decisión de arquitectura más importante del proyecto y vale entenderla antes de cambiarla.

Tu cuenta tiene **un solo API Token**, y ese token lleva **todos los permisos que te da tu plan**. Si
tenés contratado el adicional **Property API**, el mismo token también puede **crear propiedades y
publicarlas en los portales**. Y **no vence nunca**.

Si lo pusiéramos en el JavaScript del sitio, cualquier visitante podría leerlo desde las
herramientas de desarrollo del navegador y quedarse con una credencial permanente de tu cuenta.

Por eso el token vive en una variable de entorno de Vercel, y el navegador le habla a
`api/mp/[...path].js`, una función que corre en el servidor y es la única que lo conoce. Esa función
además:

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

## Cómo está armado

```
.
├── api/mp/[...path].js    la función que agrega el token y filtra las acciones permitidas
├── public/
│   ├── index.html         inicio: carrusel, buscador, emprendimientos, destacadas, zonas, sucursales
│   ├── propiedades.html   listado con filtros y paginado
│   ├── propiedad.html     ficha: galería, planos, videos, mapa y el formulario de consulta
│   ├── emprendimientos.html
│   ├── contacto.html
│   ├── vender.html        captación de propietarios, con adjuntos
│   ├── css/style.css
│   └── js/
│       ├── config.js      tus datos de respaldo (lo primero que vas a editar)
│       ├── api.js         el cliente que le habla a la función
│       ├── ui.js          helpers de render: precios, fotos, características, paginado
│       ├── brand.js       aplica el diseño de tu cuenta
│       ├── layout.js      menú y pie compartidos
│       └── …              un archivo por página
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
| **El token no vence** | Pero si lo regenerás, el anterior deja de funcionar al instante: actualizá la variable en Vercel y hacé un redeploy. |
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
