# Seguridad

## Reportar un problema

Si encontrás una vulnerabilidad en este kit, escribinos a **info@mapaprop.com** con el asunto
`[security] mapaprop-express-starter`. Contanos qué encontraste y cómo reproducirlo.

**No abras un issue público** para algo explotable: el repo es público y el issue también.

Te respondemos y te avisamos cuando esté arreglado.

## Lo que este kit protege, y cómo

El punto sensible es uno: **el API Token de Mapaprop**.

Una cuenta de Mapaprop tiene **un solo token**, y ese token lleva todos los scopes que su plan le
da. En una cuenta con el adicional de Property API, el mismo token puede **crear propiedades y
publicarlas en portales** — y no vence. Por eso:

- El token vive **sólo en el servidor**, en una variable de entorno. Nunca llega al navegador.
- Todas las llamadas del sitio pasan por `api/mp/[...path].js`, que es el único que lo conoce.
- Ese archivo tiene una **allowlist** de acciones. No es prolijidad: sin ella, una ruta armada a
  mano podría llegar a otro web service con el mismo token. Si habilitás una acción nueva, agregá
  su fila.
- Los dos POST tienen un freno de velocidad por IP. Es un lomo de burro, no una defensa: el
  antispam de verdad corre del lado de Mapaprop.

## Si publicás este sitio

- No pongas el token en ningún archivo que subas a git. `.env.local` está en el `.gitignore`.
- Si alguna vez quedó expuesto, **regeneralo** desde Configuración > Token de API en Mapaprop. El
  anterior deja de servir en el momento.
- El modo `npm run dev:mock` no usa token: sirve para colaborar sin tener uno.
