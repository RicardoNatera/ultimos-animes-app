/**
 * Ejecuta `worker` sobre todos los items con un máximo de `limit` a la vez.
 */
export async function runPool<T>(
  items: T[],
  limit: number,
  worker: (x: T) => Promise<void>
) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        await worker(items[next++]);
      }
    })
  );
}