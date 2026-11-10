import { resolveAssetUrl } from './asset-url';

export type FantasyThemeId = 'ange' | 'demon';

export function activeFantasyTheme(): FantasyThemeId | null {
  const t = document.documentElement.getAttribute('data-theme');
  return t === 'ange' || t === 'demon' ? t : null;
}

export function isFantasyTheme(): boolean {
  return activeFantasyTheme() !== null;
}

export function fantasyAssetUrl(relativePath: string): string {
  return resolveAssetUrl(relativePath);
}

export function fantasyThemeIcon(theme: FantasyThemeId, file: string): string {
  return resolveAssetUrl(`assets/themes/${theme}/${file}`);
}

/** Icônes calendrier / famille (accueil, date-picker). */
export function fantasyCalendrierSrc(): string | null {
  const t = activeFantasyTheme();
  if (!t) return null;
  return fantasyThemeIcon(t, 'icone-calendrier.png');
}

export function fantasyFamilleSrc(): string | null {
  const t = activeFantasyTheme();
  if (!t) return null;
  return fantasyThemeIcon(t, 'icone-famille.png');
}

const METEO_ICON_KEYS = [
  'soleil',
  'nuageux',
  'tres-couvert',
  'pluie',
  'neige',
  'orage',
  'vent',
  'nuit'
] as const;

export type MeteoIconKey = (typeof METEO_ICON_KEYS)[number];

export function fantasyWeatherIconSrc(iconKey: string | null | undefined): string | null {
  const t = activeFantasyTheme();
  if (!t || !iconKey) return null;
  const key = METEO_ICON_KEYS.includes(iconKey as MeteoIconKey) ? iconKey : 'nuageux';
  return resolveAssetUrl(`assets/themes/${t}/meteo/${key}.png`);
}
