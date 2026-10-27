// Reduced copies of the drive's pictures for previews: the full file can weigh 8 MB, a preview a few
// dozen KB. Pure: widths, which files qualify, and the bounded cache the thumb route keeps them in.

export const THUMB_WIDTHS = [480, 960, 1600] as const;
export type ThumbWidth = (typeof THUMB_WIDTHS)[number];

const THUMBABLE = /\.(png|jpe?g|webp|gif|bmp|avif|tiff?)$/i;

export function isThumbable(path: string): boolean {
  return THUMBABLE.test(path);
}

/** The smallest allowed width at least `raw` wide; a free width would let anyone fill the cache. */
export function thumbWidth(raw: string | null): ThumbWidth {
  const n = Number(raw);
  return THUMB_WIDTHS.find((w) => Number.isFinite(n) && w >= n) ?? THUMB_WIDTHS[THUMB_WIDTHS.length - 1];
}

/** Kept by total size and age; the same key asked twice at once is made once. */
export function boundedCache<T extends { byteLength: number }>(maxBytes: number, ttlMs: number, now: () => number = Date.now) {
  const store = new Map<string, { at: number; value: T }>();
  const flying = new Map<string, Promise<T>>();
  let bytes = 0;
  const drop = (key: string) => {
    const hit = store.get(key);
    if (hit) bytes -= hit.value.byteLength;
    store.delete(key);
  };
  return {
    get size() {
      return bytes;
    },
    async get(key: string, make: () => Promise<T>): Promise<T> {
      const hit = store.get(key);
      if (hit && now() - hit.at < ttlMs) {
        store.delete(key);
        store.set(key, hit);
        return hit.value;
      }
      drop(key);
      let pending = flying.get(key);
      if (!pending) {
        pending = make()
          .then((value) => {
            if (value.byteLength <= maxBytes) {
              store.set(key, { at: now(), value });
              bytes += value.byteLength;
              for (const k of store.keys()) {
                if (bytes <= maxBytes) break;
                drop(k);
              }
            }
            return value;
          })
          .finally(() => flying.delete(key));
        flying.set(key, pending);
      }
      return pending;
    },
  };
}
