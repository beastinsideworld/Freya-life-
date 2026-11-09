/** Chemins statiques compatibles GitHub Pages (base-href /Freya-life/). */
export function resolveAssetUrl(path: string): string {
  const clean = path.replace(/^\//, '');
  const baseHref = document.querySelector('base')?.getAttribute('href') ?? '/';
  if (baseHref === '/' || baseHref === '') {
    return `/${clean}`;
  }
  const root = baseHref.endsWith('/') ? baseHref : `${baseHref}/`;
  return `${root}${clean}`;
}
