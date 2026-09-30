# Imágenes de las herramientas de análisis que usa el CI (no se construye: solo se lee).
# Vive en un Dockerfile para que Dependabot (ecosistema docker) mantenga al día las
# versiones y los digests. El workflow extrae de aquí la referencia de cada imagen.
FROM hadolint/hadolint:v2.15.1@sha256:32dac94127fd60b7b7e3fbfc65e1383b9b5e25c9bfd7b8536de7a539fe68a12d AS hadolint
FROM aquasec/trivy:0.74.0@sha256:62b1e65e8869bc4b4c6aa4fa2b21595256c7c2f6018a9d9ad61caf87187c1969 AS trivy
FROM ghcr.io/zaproxy/zaproxy:stable@sha256:781a2bdaea47324e7bab583e2263f21d257b0aee61ed51521a5be45f5f5081ef AS zap
