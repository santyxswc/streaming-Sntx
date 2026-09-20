# Firebase Admin (`FIREBASE_SERVICE_ACCOUNT`)

El **cliente** usa las variables `NEXT_PUBLIC_FIREBASE_*`. El **servidor** (API de chat, etc.) debe verificar los ID tokens con **Firebase Admin SDK**, que requiere una **cuenta de servicio** (no la API key pública).

## Pasos

1. [Firebase Console](https://console.firebase.google.com) → tu proyecto (el **mismo** que en `NEXT_PUBLIC_FIREBASE_PROJECT_ID`).
2. **Project settings** (engranaje) → pestaña **Service accounts**.
3. **Generate new private key** → se descarga un archivo `.json` (ej. `mi-proyecto-firebase-adminsdk.json`).

## Opción recomendada: Base64 (evita errores de comillas en `.env`)

En **PowerShell** (en la carpeta donde está el JSON):

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes(".\tu-archivo.json")) | Set-Clipboard
```

Pega el resultado en `.env.local`:

```env
FIREBASE_SERVICE_ACCOUNT_BASE64=eyJ0eXBlIjoic2VydmljZV9hY2NvdW50Ii...
```

(sin saltos de línea; una sola línea)

También puedes usar:

```env
FIREBASE_SERVICE_ACCOUNT=base64:PASTE_AQUI_EL_MISMO_BASE64
```

## Opción B: JSON en una línea entre comillas simples

**No** hagas esto con comillas dobles envolviendo el JSON: `FIREBASE_SERVICE_ACCOUNT={"type":"..."` — el primer `"` interno **corta** el valor en muchos parsers y obtienes `Unterminated string in JSON`.

**Sí** hazlo así:

```env
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"tu-proyecto",...}'
```

Todo el JSON va **entre comillas simples** `'...'`.

## Vercel

- Pega el JSON en una sola línea en el valor de la variable, **o** usa **Base64** como arriba (más fiable).

## Errores habituales

| Síntoma | Causa probable |
|--------|------------------|
| `Unterminated string in JSON at position 2` | Comillas dobles en `.env` rompen el valor. Usa **Base64** o comillas **simples** externas. |
| "Servidor sin credenciales Firebase" | No hay `FIREBASE_SERVICE_ACCOUNT` ni `FIREBASE_SERVICE_ACCOUNT_BASE64`. |
| Token inválido con credenciales OK | Service account de **otro** proyecto distinto al de `NEXT_PUBLIC_*`. |

## Reinicio

Tras cambiar `.env.local`, reinicia `npm run dev`.
