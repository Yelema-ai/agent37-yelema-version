// Which theme each expert of the gallery is filed under. The back office's catalogue wins when it
// files every expert; otherwise the app's stopgap list does, and an expert it does not name keeps
// the back office's category, if any. Pure: no imports, tested with `node --test`.

export interface ThemeDef {
  key: string;
  label: string;
  experts: string[];
}

export interface ThemedExpert {
  key: string;
  name: string;
  category: { key: string; label: string } | null;
}

export interface Themes {
  /** In display order, only those with at least one expert. */
  themes: { key: string; label: string; count: number }[];
  /** Expert key -> theme key. */
  themeOf: Map<string, string>;
}

// "Djénéba" -> "djeneba".
const plain = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

export function expertThemes(categories: { key: string; label: string }[], experts: ThemedExpert[], fallback: ThemeDef[]): Themes {
  const themeOf = new Map<string, string>();
  let order: { key: string; label: string }[];

  if (experts.length > 0 && experts.every((e) => e.category)) {
    order = [...categories];
    for (const e of experts) {
      themeOf.set(e.key, e.category!.key);
      if (!order.some((c) => c.key === e.category!.key)) order.push(e.category!);
    }
  } else {
    order = fallback.map(({ key, label }) => ({ key, label }));
    for (const e of experts) {
      const names = [plain(e.key), plain(e.name)];
      const theme = fallback.find((t) => t.experts.some((x) => names.includes(plain(x))));
      if (theme) themeOf.set(e.key, theme.key);
      else if (e.category) {
        themeOf.set(e.key, e.category.key);
        if (!order.some((c) => c.key === e.category!.key)) order.push(e.category);
      }
    }
  }

  const count = (key: string) => [...themeOf.values()].filter((k) => k === key).length;
  return { themes: order.map((t) => ({ ...t, count: count(t.key) })).filter((t) => t.count > 0), themeOf };
}
