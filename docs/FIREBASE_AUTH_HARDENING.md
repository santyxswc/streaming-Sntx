# Endurecimiento de Firebase Auth

El acceso (login y registro) se hace desde el cliente contra Firebase Auth, tanto en la web
como en la app de escritorio. `/api/auth/limit` solo es un límite de mejor esfuerzo para el
formulario: quien hable directamente con Firebase no pasa por él. La protección real se
configura en la consola de Firebase. Ver hallazgo SEC-09 en [security-audit.md](security-audit.md).

No hay que tocar código ni desplegar nada: son ajustes del proyecto Firebase.

## 1. Política de contraseñas

**Authentication → Settings → Password policy**

| Ajuste | Valor |
|---|---|
| Longitud mínima | 8 |
| Requerir mayúscula | Sí |
| Requerir número | Sí |
| Modo de cumplimiento | **Require** (rechaza contraseñas que no cumplan) |

Son las mismas reglas que valida el formulario, pero el formulario solo se ejecuta en el
navegador: sin esto, cualquiera que llame a Firebase directamente puede registrar una
cuenta con contraseña `1234`. Las cuentas existentes no se ven afectadas hasta que cambien
su contraseña. La app ya muestra un mensaje claro para el error
`auth/password-does-not-meet-requirements`.

## 2. Protección contra enumeración de correos

**Authentication → Settings → User actions → Email enumeration protection → Enable**

Sin ella, las respuestas de Firebase distinguen «el correo no existe» de «contraseña
incorrecta», y un atacante puede averiguar qué correos tienen cuenta. Con ella activa,
ambos casos devuelven `auth/invalid-credential`, que web y escritorio ya tratan con el
mensaje «Correo o contraseña incorrectos».

## 3. Dominios autorizados

**Authentication → Settings → Authorized domains**

Deja solo los que uses de verdad: `localhost` y `streaming-sntx.vercel.app`. Elimina
cualquier otro que no reconozcas.

## 4. Restringir la clave de API por servicio (opcional)

**Google Cloud Console → APIs & Services → Credentials → Browser key**

En *API restrictions* elige «Restrict key» y deja solo **Identity Toolkit API**,
**Token Service API** y **Cloud Firestore API**. No restrinjas por *HTTP referrer*: la app
de escritorio usa la misma clave y se ejecuta desde un origen `tauri://`, así que dejaría
de funcionar.

## Por qué no App Check

App Check en modo obligatorio bloquearía a la app de escritorio, que usa Firebase Auth y
Firestore directamente y no puede obtener tokens de reCAPTCHA desde `tauri://localhost`.
Se puede reconsiderar si el escritorio incorpora un proveedor de App Check propio.

## Cómo comprobarlo

1. Registro con contraseña `abc` desde la web: debe rechazarse con el mensaje de requisitos.
2. Login con un correo inexistente y con un correo real con contraseña errónea: ambos deben
   mostrar exactamente el mismo mensaje.
3. Repite el paso 1 desde la app de escritorio.
