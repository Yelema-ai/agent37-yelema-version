// One page of a list, its page clamped into range (a list that shrinks never leaves an empty page).
// No imports, for `node --test`.

export interface Page<T> {
  items: T[];
  page: number;
  pages: number;
  from: number;
  to: number;
}

export function paginate<T>(list: T[], page: number, size: number): Page<T> {
  const per = Math.max(1, Math.floor(size));
  const pages = Math.max(1, Math.ceil(list.length / per));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  const start = (current - 1) * per;
  const items = list.slice(start, start + per);
  return { items, page: current, pages, from: items.length ? start + 1 : 0, to: start + items.length };
}
