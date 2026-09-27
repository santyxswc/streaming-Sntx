import 'server-only';

/**
 * Limita cuántas tareas asíncronas corren a la vez. Se comparte entre
 * llamadas para acotar la presión total sobre una API externa (p. ej. TMDB).
 * @param {number} maxConcurrent
 * @returns {<T>(task: () => Promise<T>) => Promise<T>}
 */
export function createLimiter(maxConcurrent) {
  let active = 0;
  const queue = [];

  const next = () => {
    if (active >= maxConcurrent || queue.length === 0) return;
    active++;
    const { task, resolve, reject } = queue.shift();
    Promise.resolve()
      .then(task)
      .then(resolve, reject)
      .finally(() => {
        active--;
        next();
      });
  };

  return (task) =>
    new Promise((resolve, reject) => {
      queue.push({ task, resolve, reject });
      next();
    });
}
