export type ThemeId =
  | 'freya'
  | 'feu'
  | 'eau'
  | 'glace'
  | 'electricite'
  | 'pierre'
  | 'vent' // alias historique → pierre
  | 'ange'
  | 'demon'
  | 'rouge'
  | 'or'
  | 'violet'
  | 'bleu'
  | 'vert'
  | 'rose'
  | 'noir'
  | 'ete'
  | 'automne'
  | 'hiver';

export interface ThemeOption {
  id: ThemeId;
  label: string;
  swatch: string;
}

export interface ThemeCategory {
  id: string;
  label: string;
  description: string;
  themes: ThemeOption[];
}

export const THEME_CATEGORIES: ThemeCategory[] = [
  {
    id: 'celeste',
    label: 'Céleste',
    description: 'Ange et Démon.',
    themes: [
      { id: 'ange', label: 'Ange', swatch: '#D8B981' },
      { id: 'demon', label: 'Démon', swatch: '#D61C2A' }
    ]
  },
  {
    id: 'saisons',
    label: 'Saisons',
    description: 'Été, automne et hiver.',
    themes: [
      { id: 'ete', label: 'Été', swatch: '#f0a830' },
      { id: 'automne', label: 'Automne', swatch: '#e07030' },
      { id: 'hiver', label: 'Hiver', swatch: '#8aabd0' }
    ]
  }
];

const ALL_THEME_IDS = new Set(THEME_CATEGORIES.flatMap((cat) => cat.themes.map((t) => t.id)));

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && ALL_THEME_IDS.has(value as ThemeId);
}

export function normalizeThemeId(themeId: ThemeId): ThemeId {
  return themeId === 'vent' ? 'pierre' : themeId;
}

export function themeLabel(id: ThemeId): string {
  return findTheme(normalizeThemeId(id))?.label ?? 'Ange';
}

export function findTheme(id: ThemeId): (ThemeOption & { categoryLabel: string }) | null {
  const normalized = normalizeThemeId(id);
  for (const category of THEME_CATEGORIES) {
    const found = category.themes.find((theme) => theme.id === normalized);
    if (found) {
      return { ...found, categoryLabel: category.label };
    }
  }
  return null;
}

/** Applique le thème courant sur <html>. */
export function applyTheme(themeId: ThemeId): void {
  const root = document.documentElement;
  const id = normalizeThemeId(themeId);
  root.dataset['theme'] = id;
  root.setAttribute('data-theme', id);
}
