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
    id: 'classique',
    label: 'Apparence',
    description: 'Thèmes dark / rouge validés.',
    themes: [
      { id: 'noir', label: 'Noir Velours', swatch: '#81233a' },
      { id: 'rouge', label: 'Rouge Glossy', swatch: '#e33055' },
      { id: 'freya', label: 'Freya (Glossy)', swatch: '#e43b5c' }
    ]
  },
  {
    id: 'elements',
    label: 'Éléments',
    description: 'Univers graphiques distincts — sans rouge résiduel.',
    themes: [
      { id: 'feu', label: 'Feu', swatch: '#E87518' },
      { id: 'eau', label: 'Eau', swatch: '#17AFC7' },
      { id: 'glace', label: 'Glace', swatch: '#89DDF4' },
      { id: 'electricite', label: 'Électricité', swatch: '#C2F52C' },
      { id: 'pierre', label: 'Pierre', swatch: '#B8AC96' }
    ]
  },
  {
    id: 'celeste',
    label: 'Céleste',
    description: 'Univers ange (clair) et démon (obsidienne).',
    themes: [
      { id: 'ange', label: 'Ange', swatch: '#D8B981' },
      { id: 'demon', label: 'Démon', swatch: '#D61C2A' }
    ]
  },
  {
    id: 'couleurs',
    label: 'Couleurs',
    description: 'Autres teintes.',
    themes: [
      { id: 'or', label: 'Or', swatch: '#e0b820' },
      { id: 'violet', label: 'Violet', swatch: '#a84de0' },
      { id: 'bleu', label: 'Bleu', swatch: '#2f95d4' },
      { id: 'vert', label: 'Vert', swatch: '#3fbf62' },
      { id: 'rose', label: 'Rose', swatch: '#e04d96' }
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
ALL_THEME_IDS.add('vent');

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && ALL_THEME_IDS.has(value as ThemeId);
}

export function normalizeThemeId(themeId: ThemeId): ThemeId {
  return themeId === 'vent' ? 'pierre' : themeId;
}

export function themeLabel(id: ThemeId): string {
  return findTheme(normalizeThemeId(id))?.label ?? 'Freya';
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
