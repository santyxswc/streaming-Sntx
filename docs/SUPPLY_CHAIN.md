# Cadena de suministro: imagen, SBOM, procedencia y firma

La imagen Docker se publica en GitHub Container Registry desde el CI, nunca a mano:

```
ghcr.io/santyxswc/streaming-sntx
```

| Etiqueta | Cuándo se publica |
|---|---|
| `edge`, `sha-<corto>` | Cada vez que el CI de `main` termina en verde (imagen de desarrollo) |
| `X.Y.Z`, `latest` | Al fusionar el PR de release (versión semántica) |

Se construye sin claves públicas de Firebase (modo demo), igual que en el CI. Quien quiera su propio
despliegue construye con sus `--build-arg NEXT_PUBLIC_*` (ver [DOCKER.md](DOCKER.md)).

## Qué acompaña a cada imagen

- **Firma cosign sin claves.** La firma usa la identidad OIDC del workflow `publish.yml` y queda en el
  registro de transparencia Rekor. No hay clave privada que custodiar ni rotar.
- **Procedencia SLSA** (`mode=max`): qué commit, qué Dockerfile y qué imágenes base produjeron el artefacto.
- **SBOM SPDX** generado por BuildKit y **SBOM CycloneDX** generado por syft (adjunto como atestación firmada
  y como archivo de la release, junto con el SBOM de las dependencias npm de producción).

Antes de terminar, el propio workflow verifica la firma y la atestación contra la identidad de este
repositorio: si no cuadran, la publicación falla.

## Verificar una imagen

```bash
IMG=ghcr.io/santyxswc/streaming-sntx:latest
ID='^https://github\.com/santyxswc/streaming-Sntx/\.github/workflows/.+@.+$'
ISS=https://token.actions.githubusercontent.com

# La firma: solo pasa si la firmó un workflow de este repositorio
cosign verify "$IMG" --certificate-identity-regexp "$ID" --certificate-oidc-issuer "$ISS"

# El SBOM CycloneDX firmado
cosign verify-attestation "$IMG" --type cyclonedx \
  --certificate-identity-regexp "$ID" --certificate-oidc-issuer "$ISS"

# SBOM SPDX y procedencia que guarda la propia imagen
docker buildx imagetools inspect "$IMG" --format '{{ json .SBOM.SPDX }}'
docker buildx imagetools inspect "$IMG" --format '{{ json .Provenance.SLSA }}'

# Analizar el SBOM en busca de vulnerabilidades conocidas
trivy sbom sbom-imagen.cdx.json   # archivo descargado de la release
```

Una imagen que no pase `cosign verify` no salió de este repositorio: no la uses.

## Versiones y CHANGELOG

[release-please](https://github.com/googleapis/release-please) lee los commits convencionales de `main`
(`feat` sube la versión menor, `fix` el parche, `!` o `BREAKING CHANGE` la mayor) y mantiene un PR de
release con la versión nueva y el `CHANGELOG.md`. Al fusionarlo se crea la etiqueta `vX.Y.Z`, la release
de GitHub y la imagen versionada. Los commits `docs`, `ci` y `chore` no aparecen en el changelog.

`release.yml` solo se ejecuta cuando el CI de `main` terminó en verde: únicamente se versiona y publica
lo que ya pasó las pruebas.

## Configuración única en GitHub (la hace el mantenedor)

1. **Settings → Actions → General → Workflow permissions → «Allow GitHub Actions to create and approve
   pull requests».** Sin esto release-please no puede abrir el PR de release.
2. Tras la primera publicación, **Packages → streaming-sntx → Package settings → Change visibility → Public**
   (los paquetes nuevos nacen privados). La etiqueta OCI `source` de la imagen ya lo enlaza con el repositorio.

## Dependencias

- Dependabot mantiene al día npm, cargo, acciones y las imágenes base, con SHA o digest fijados.
- `dependency-review.yml` revisa en cada PR las dependencias nuevas y falla con una vulnerabilidad alta o crítica.
- GitHub construye el grafo de dependencias a partir de `package-lock.json` y `Cargo.lock`, sin configuración.
