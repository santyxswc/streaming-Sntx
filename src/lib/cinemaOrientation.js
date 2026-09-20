/**
 * Pantalla completa + bloqueo de orientación para modo cine en móvil.
 * - "Modo cine" = apaisado (landscape): lo habitual para vídeo ancho.
 * - Para forzar retrato (vertical), cambia 'landscape' por 'portrait' en lockOrientation.
 *
 * Limitaciones: iOS Safari suele ignorar orientation.lock(); Android/Chrome funciona mejor.
 * La API requiere gesto del usuario y contexto seguro (HTTPS).
 */

function isCoarsePointerMobile() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 767px)').matches;
}

async function requestFullscreenEl(el) {
  if (!el) return;
  try {
    if (el.requestFullscreen) await el.requestFullscreen();
    else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    else if (el.webkitRequestFullScreen) await el.webkitRequestFullScreen();
  } catch {
    /* política del navegador o ya en fullscreen */
  }
}

async function exitFullscreenDoc() {
  try {
    if (document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen();
    } else if (document.webkitFullscreenElement && document.webkitExitFullscreen) {
      await document.webkitExitFullscreen();
    }
  } catch {
    /* */
  }
}

/**
 * Bloquea orientación. landscape = apaisado (recomendado para cine).
 */
async function lockOrientation(mode = 'landscape') {
  try {
    const o = screen.orientation;
    if (o && typeof o.lock === 'function') {
      await o.lock(mode);
    }
  } catch {
    /* iOS, permisos, o lock sin fullscreen previo */
  }
}

function unlockOrientation() {
  try {
    const o = screen.orientation;
    if (o && typeof o.unlock === 'function') {
      o.unlock();
    }
  } catch {
    /* */
  }
}

/**
 * Entrar: fullscreen sobre el documento y orientación apaisada (móvil).
 */
export async function enterCinemaPresentation() {
  if (!isCoarsePointerMobile()) return;
  await requestFullscreenEl(document.documentElement);
  await lockOrientation('landscape');
}

/**
 * Salir: quitar bloqueo y fullscreen.
 */
export async function exitCinemaPresentation() {
  unlockOrientation();
  await exitFullscreenDoc();
}

export { isCoarsePointerMobile };
