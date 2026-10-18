// Which theme each expert of the gallery is filed under: the back office's category, in the order
// its catalogue gives. An expert without one is under no theme. Pure: no imports, tested with
// `node --test`.

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

export function expertThemes(categories: { key: string; label: string }[], experts: ThemedExpert[]): Themes {
  const themeOf = new Map<string, string>();
  const order = [...categories];
  for (const e of experts) {
    if (!e.category) continue;
    themeOf.set(e.key, e.category.key);
    if (!order.some((c) => c.key === e.category!.key)) order.push(e.category);
  }
  const count = (key: string) => [...themeOf.values()].filter((k) => k === key).length;
  return { themes: order.map((t) => ({ ...t, count: count(t.key) })).filter((t) => t.count > 0), themeOf };
}
